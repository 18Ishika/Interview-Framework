import os
import sys
import django

# Setup Django environment if run directly
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from coding_round.models import Question, CodeTemplate, TestCase, DifficultyChoices, LanguageChoices


def seed_questions():
    print("🌱 Seeding coding round questions...")

    questions_data = [
        # --- 1. EASY: Two Sum ---
        {
            "title": "Two Sum",
            "difficulty": DifficultyChoices.EASY,
            "description": (
                "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n"
                "You may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\n"
                "You can return the answer in any order.\n\n"
                "### Example 1:\n"
                "```\n"
                "Input: nums = [2,7,11,15], target = 9\n"
                "Output: [0, 1]\n"
                "Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n"
                "```\n\n"
                "### Example 2:\n"
                "```\n"
                "Input: nums = [3,2,4], target = 6\n"
                "Output: [1, 2]\n"
                "```\n\n"
                "### Example 3:\n"
                "```\n"
                "Input: nums = [3,3], target = 6\n"
                "Output: [0, 1]\n"
                "```\n\n"
                "### Constraints:\n"
                "- `2 <= nums.length <= 10^4`\n"
                "- `-10^9 <= nums[i] <= 10^9`\n"
                "- `-10^9 <= target <= 10^9`\n"
                "- Only one valid answer exists."
            ),
            "time_limit_ms": 2000,
            "memory_limit_kb": 262144,
            "version": 1,
            "is_active": True,
            "templates": [
                {
                    "language": LanguageChoices.PYTHON,
                    "boilerplate_code": (
                        "class Solution:\n"
                        "    def twoSum(self, nums: list[int], target: int) -> list[int]:\n"
                        "        # Write your code here\n"
                        "        pass\n"
                    ),
                    "driver_code": (
                        "import json\n"
                        "import sys\n\n"
                        "if __name__ == '__main__':\n"
                        "    input_data = sys.stdin.read().strip()\n"
                        "    data = json.loads(input_data)\n"
                        "    sol = Solution()\n"
                        "    result = sol.twoSum(data['nums'], data['target'])\n"
                        "    print(json.dumps(sorted(result)))\n"
                    ),
                },
                {
                    "language": LanguageChoices.JAVASCRIPT,
                    "boilerplate_code": (
                        "/**\n"
                        " * @param {number[]} nums\n"
                        " * @param {number} target\n"
                        " * @return {number[]}\n"
                        " */\n"
                        "function twoSum(nums, target) {\n"
                        "    // Write your code here\n"
                        "}\n"
                    ),
                    "driver_code": (
                        "const fs = require('fs');\n"
                        "const input = fs.readFileSync(0, 'utf-8').trim();\n"
                        "const data = JSON.parse(input);\n"
                        "const result = twoSum(data.nums, data.target);\n"
                        "console.log(JSON.stringify(result.sort((a, b) => a - b)));\n"
                    ),
                },
                {
                    "language": LanguageChoices.CPP,
                    "boilerplate_code": (
                        "#include <vector>\n"
                        "using namespace std;\n\n"
                        "class Solution {\n"
                        "public:\n"
                        "    vector<int> twoSum(vector<int>& nums, int target) {\n"
                        "        // Write your code here\n"
                        "    }\n"
                        "};\n"
                    ),
                    "driver_code": (
                        "// Driver code for Two Sum C++\n"
                    ),
                },
                {
                    "language": LanguageChoices.JAVA,
                    "boilerplate_code": (
                        "class Solution {\n"
                        "    public int[] twoSum(int[] nums, int target) {\n"
                        "        // Write your code here\n"
                        "        return new int[]{};\n"
                        "    }\n"
                        "}\n"
                    ),
                    "driver_code": (
                        "// Driver code for Two Sum Java\n"
                    ),
                },
            ],
            "test_cases": [
                {
                    "input_data": '{"nums": [2, 7, 11, 15], "target": 9}',
                    "expected_output": "[0, 1]",
                    "is_hidden": False,
                    "score_weight": 25.0,
                },
                {
                    "input_data": '{"nums": [3, 2, 4], "target": 6}',
                    "expected_output": "[1, 2]",
                    "is_hidden": False,
                    "score_weight": 25.0,
                },
                {
                    "input_data": '{"nums": [3, 3], "target": 6}',
                    "expected_output": "[0, 1]",
                    "is_hidden": True,
                    "score_weight": 25.0,
                },
                {
                    "input_data": '{"nums": [-1, -2, -3, -4, -5], "target": -8}',
                    "expected_output": "[2, 4]",
                    "is_hidden": True,
                    "score_weight": 25.0,
                },
            ],
        },

        # --- 2. MEDIUM: Product of Array Except Self ---
        {
            "title": "Product of Array Except Self",
            "difficulty": DifficultyChoices.MEDIUM,
            "description": (
                "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\n"
                "The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\n"
                "You must write an algorithm that runs in **O(n)** time and without using the division operation.\n\n"
                "### Example 1:\n"
                "```\n"
                "Input: nums = [1, 2, 3, 4]\n"
                "Output: [24, 12, 8, 6]\n"
                "```\n\n"
                "### Example 2:\n"
                "```\n"
                "Input: nums = [-1, 1, 0, -3, 3]\n"
                "Output: [0, 0, 9, 0, 0]\n"
                "```\n\n"
                "### Constraints:\n"
                "- `2 <= nums.length <= 10^5`\n"
                "- `-30 <= nums[i] <= 30`\n"
                "- The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer."
            ),
            "time_limit_ms": 2000,
            "memory_limit_kb": 262144,
            "version": 1,
            "is_active": True,
            "templates": [
                {
                    "language": LanguageChoices.PYTHON,
                    "boilerplate_code": (
                        "class Solution:\n"
                        "    def productExceptSelf(self, nums: list[int]) -> list[int]:\n"
                        "        # Write your code here without using division\n"
                        "        pass\n"
                    ),
                    "driver_code": (
                        "import json\n"
                        "import sys\n\n"
                        "if __name__ == '__main__':\n"
                        "    input_data = sys.stdin.read().strip()\n"
                        "    data = json.loads(input_data)\n"
                        "    sol = Solution()\n"
                        "    result = sol.productExceptSelf(data['nums'])\n"
                        "    print(json.dumps(result))\n"
                    ),
                },
                {
                    "language": LanguageChoices.JAVASCRIPT,
                    "boilerplate_code": (
                        "/**\n"
                        " * @param {number[]} nums\n"
                        " * @return {number[]}\n"
                        " */\n"
                        "function productExceptSelf(nums) {\n"
                        "    // Write your code here without division\n"
                        "}\n"
                    ),
                    "driver_code": (
                        "const fs = require('fs');\n"
                        "const input = fs.readFileSync(0, 'utf-8').trim();\n"
                        "const data = JSON.parse(input);\n"
                        "const result = productExceptSelf(data.nums);\n"
                        "console.log(JSON.stringify(result));\n"
                    ),
                },
                {
                    "language": LanguageChoices.CPP,
                    "boilerplate_code": (
                        "#include <vector>\n"
                        "using namespace std;\n\n"
                        "class Solution {\n"
                        "public:\n"
                        "    vector<int> productExceptSelf(vector<int>& nums) {\n"
                        "        // Write your code here\n"
                        "    }\n"
                        "};\n"
                    ),
                    "driver_code": (
                        "// Driver code for Product Except Self C++\n"
                    ),
                },
                {
                    "language": LanguageChoices.JAVA,
                    "boilerplate_code": (
                        "class Solution {\n"
                        "    public int[] productExceptSelf(int[] nums) {\n"
                        "        // Write your code here\n"
                        "        return new int[]{};\n"
                        "    }\n"
                        "}\n"
                    ),
                    "driver_code": (
                        "// Driver code for Product Except Self Java\n"
                    ),
                },
            ],
            "test_cases": [
                {
                    "input_data": '{"nums": [1, 2, 3, 4]}',
                    "expected_output": "[24, 12, 8, 6]",
                    "is_hidden": False,
                    "score_weight": 25.0,
                },
                {
                    "input_data": '{"nums": [-1, 1, 0, -3, 3]}',
                    "expected_output": "[0, 0, 9, 0, 0]",
                    "is_hidden": False,
                    "score_weight": 25.0,
                },
                {
                    "input_data": '{"nums": [0, 0]}',
                    "expected_output": "[0, 0]",
                    "is_hidden": True,
                    "score_weight": 25.0,
                },
                {
                    "input_data": '{"nums": [2, 3, 5, 0]}',
                    "expected_output": "[0, 0, 0, 30]",
                    "is_hidden": True,
                    "score_weight": 25.0,
                },
            ],
        },

        # --- 3. HARD: Trapping Rain Water ---
        {
            "title": "Trapping Rain Water",
            "difficulty": DifficultyChoices.HARD,
            "description": (
                "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.\n\n"
                "### Example 1:\n"
                "```\n"
                "Input: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\n"
                "Output: 6\n"
                "Explanation: The above elevation map (black section) is represented by array [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]. In this case, 6 units of rain water (blue section) are being trapped.\n"
                "```\n\n"
                "### Example 2:\n"
                "```\n"
                "Input: height = [4, 2, 0, 3, 2, 5]\n"
                "Output: 9\n"
                "```\n\n"
                "### Constraints:\n"
                "- `n == height.length`\n"
                "- `1 <= n <= 2 * 10^4`\n"
                "- `0 <= height[i] <= 10^5`"
            ),
            "time_limit_ms": 2000,
            "memory_limit_kb": 262144,
            "version": 1,
            "is_active": True,
            "templates": [
                {
                    "language": LanguageChoices.PYTHON,
                    "boilerplate_code": (
                        "class Solution:\n"
                        "    def trap(self, height: list[int]) -> int:\n"
                        "        # Write your code here\n"
                        "        pass\n"
                    ),
                    "driver_code": (
                        "import json\n"
                        "import sys\n\n"
                        "if __name__ == '__main__':\n"
                        "    input_data = sys.stdin.read().strip()\n"
                        "    data = json.loads(input_data)\n"
                        "    sol = Solution()\n"
                        "    result = sol.trap(data['height'])\n"
                        "    print(result)\n"
                    ),
                },
                {
                    "language": LanguageChoices.JAVASCRIPT,
                    "boilerplate_code": (
                        "/**\n"
                        " * @param {number[]} height\n"
                        " * @return {number}\n"
                        " */\n"
                        "function trap(height) {\n"
                        "    // Write your code here\n"
                        "}\n"
                    ),
                    "driver_code": (
                        "const fs = require('fs');\n"
                        "const input = fs.readFileSync(0, 'utf-8').trim();\n"
                        "const data = JSON.parse(input);\n"
                        "const result = trap(data.height);\n"
                        "console.log(result);\n"
                    ),
                },
                {
                    "language": LanguageChoices.CPP,
                    "boilerplate_code": (
                        "#include <vector>\n"
                        "using namespace std;\n\n"
                        "class Solution {\n"
                        "public:\n"
                        "    int trap(vector<int>& height) {\n"
                        "        // Write your code here\n"
                        "    }\n"
                        "};\n"
                    ),
                    "driver_code": (
                        "// Driver code for Trapping Rain Water C++\n"
                    ),
                },
                {
                    "language": LanguageChoices.JAVA,
                    "boilerplate_code": (
                        "class Solution {\n"
                        "    public int trap(int[] height) {\n"
                        "        // Write your code here\n"
                        "        return 0;\n"
                        "    }\n"
                        "}\n"
                    ),
                    "driver_code": (
                        "// Driver code for Trapping Rain Water Java\n"
                    ),
                },
            ],
            "test_cases": [
                {
                    "input_data": '{"height": [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]}',
                    "expected_output": "6",
                    "is_hidden": False,
                    "score_weight": 20.0,
                },
                {
                    "input_data": '{"height": [4, 2, 0, 3, 2, 5]}',
                    "expected_output": "9",
                    "is_hidden": False,
                    "score_weight": 20.0,
                },
                {
                    "input_data": '{"height": [3, 0, 2, 0, 4]}',
                    "expected_output": "7",
                    "is_hidden": True,
                    "score_weight": 20.0,
                },
                {
                    "input_data": '{"height": [1, 2, 3, 4, 5]}',
                    "expected_output": "0",
                    "is_hidden": True,
                    "score_weight": 20.0,
                },
                {
                    "input_data": '{"height": [5, 4, 1, 2]}',
                    "expected_output": "1",
                    "is_hidden": True,
                    "score_weight": 20.0,
                },
            ],
        },
    ]

    for item in questions_data:
        templates = item.pop("templates")
        test_cases = item.pop("test_cases")

        question, created = Question.objects.update_or_create(
            title=item["title"],
            defaults=item,
        )
        status_str = "Created" if created else "Updated"
        print(f"  ✓ {status_str} question: [{question.get_difficulty_display()}] {question.title}")

        # Code Templates
        for tpl in templates:
            template_obj, t_created = CodeTemplate.objects.update_or_create(
                question=question,
                language=tpl["language"],
                defaults={
                    "boilerplate_code": tpl["boilerplate_code"],
                    "driver_code": tpl["driver_code"],
                },
            )
            t_str = "Created" if t_created else "Updated"
            print(f"    - {t_str} template: {template_obj.get_language_display()}")

        # Clean existing test cases and re-create to keep exact set
        TestCase.objects.filter(question=question).delete()
        for tc in test_cases:
            TestCase.objects.create(
                question=question,
                input_data=tc["input_data"],
                expected_output=tc["expected_output"],
                is_hidden=tc["is_hidden"],
                score_weight=tc["score_weight"],
            )
        print(f"    - Added {len(test_cases)} test cases.")

    print("\n✅ Successfully seeded coding round questions (Easy, Medium, Hard)!\n")


if __name__ == "__main__":
    seed_questions()
