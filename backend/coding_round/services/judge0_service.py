import json
import logging
import re
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

LANGUAGE_ID_MAP = {
    "python": 71,       # Python (3.8.1)
    "cpp": 54,          # C++ (GCC 9.2.0)
    "java": 62,         # Java (OpenJDK 13.0.1)
}

STATUS_ID_TO_SUBMISSION_STATUS = {
    3: "accepted",
    4: "wrong_answer",
    5: "time_limit_exceeded",
    6: "compilation_error",
    7: "runtime_error",
    8: "runtime_error",
    9: "runtime_error",
    10: "runtime_error",
    11: "runtime_error",
    12: "runtime_error",
    13: "runtime_error",
    14: "runtime_error",
}


def are_outputs_equal(actual: str, expected: str) -> bool:
    """
    Intelligently compares actual and expected outputs, treating whitespace variations
    such as [4, 2, 0, 3, 2, 5] and [4,2,0,3,2,5] as identical.
    """
    if actual is None or expected is None:
        return actual == expected

    act_str = actual.strip()
    exp_str = expected.strip()

    # Exact string match
    if act_str == exp_str:
        return True

    # 1. JSON parsing comparison (for arrays, objects, primitives)
    try:
        act_json = json.loads(act_str)
        exp_json = json.loads(exp_str)
        if act_json == exp_json:
            return True
    except Exception:
        pass

    # 2. Whitespace-insensitive array / punctuation comparison
    norm_act = re.sub(r'\s*([,\[\]\{\}:])\s*', r'\1', act_str)
    norm_exp = re.sub(r'\s*([,\[\]\{\}:])\s*', r'\1', exp_str)
    if norm_act.lower() == norm_exp.lower():
        return True

    # 3. Normalized single-space comparison
    single_act = re.sub(r'\s+', ' ', act_str)
    single_exp = re.sub(r'\s+', ' ', exp_str)
    if single_act.lower() == single_exp.lower():
        return True

    return False


class Judge0Service:
    @staticmethod
    def get_judge0_url():
        return getattr(settings, "JUDGE0_URL", "http://192.168.1.17:2358").rstrip("/")

    @classmethod
    def execute_code(
        cls,
        source_code: str,
        language: str,
        stdin: str = "",
        expected_output: str = None,
        cpu_time_limit: float = 2.0,
        memory_limit: int = 262144,
    ) -> dict:
        """
        Submits code to Judge0 for synchronous execution and evaluation.
        """
        language_id = LANGUAGE_ID_MAP.get(language.lower())
        if not language_id:
            return {
                "success": False,
                "error": f"Unsupported language '{language}'. Supported: {list(LANGUAGE_ID_MAP.keys())}",
                "status": "compilation_error",
                "stdout": "",
                "stderr": f"Unsupported language '{language}'",
                "execution_time_ms": 0,
                "memory_used_kb": 0,
                "passed": False,
            }

        # Compatibility for Python typing in Python 3.8/3.7 on Judge0
        if language.lower() == "python":
            typing_header = "from __future__ import annotations\nfrom typing import List, Dict, Tuple, Set, Optional, Any\n"
            if not source_code.startswith("from __future__ import annotations"):
                source_code = typing_header + source_code

        url = f"{cls.get_judge0_url()}/submissions?base64_encoded=false&wait=true"

        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "cpu_time_limit": cpu_time_limit,
            "memory_limit": memory_limit,
        }

        try:
            response = requests.post(url, json=payload, timeout=15)
            response.raise_for_status()
            data = response.json()

            judge_status = data.get("status", {})
            status_id = judge_status.get("id", 11)
            status_desc = judge_status.get("description", "Unknown")

            sub_status = STATUS_ID_TO_SUBMISSION_STATUS.get(status_id, "runtime_error")

            stdout = (data.get("stdout") or "").rstrip()
            stderr = (data.get("stderr") or "").rstrip()
            compile_output = (data.get("compile_output") or "").rstrip()
            time_sec = float(data.get("time") or 0.0)
            execution_time_ms = int(time_sec * 1000)
            memory_used_kb = int(data.get("memory") or 0)

            # Evaluate pass/fail with whitespace-agnostic comparison
            passed = False
            if status_id == 3:  # Execution completed successfully (return code 0)
                if expected_output is not None:
                    if are_outputs_equal(stdout, expected_output):
                        passed = True
                        sub_status = "accepted"
                    else:
                        passed = False
                        sub_status = "wrong_answer"
                else:
                    passed = True
                    sub_status = "accepted"
            else:
                passed = False

            return {
                "success": True,
                "status": sub_status,
                "status_description": status_desc,
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": compile_output,
                "execution_time_ms": execution_time_ms,
                "memory_used_kb": memory_used_kb,
                "passed": passed,
                "raw_response": data,
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Judge0 request failed: {e}")
            return {
                "success": False,
                "error": f"Judge0 execution error: {str(e)}",
                "status": "runtime_error",
                "status_description": "Judge0 Service Unavailable",
                "stdout": "",
                "stderr": f"Error connecting to Judge0 at {cls.get_judge0_url()}: {str(e)}",
                "execution_time_ms": 0,
                "memory_used_kb": 0,
                "passed": False,
            }
