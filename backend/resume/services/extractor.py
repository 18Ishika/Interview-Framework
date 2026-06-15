import json
import os
import re

def load_skills_list():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skills_path = os.path.join(base_dir, "skills_list.json")
    with open(skills_path, "r") as f:
        data = json.load(f)
    return [skill.lower() for skill in data["skills"]]

def extract_section(text, section_name):
    lines = text.split("\n")
    header_pattern = re.compile(r"^[A-Z][a-zA-Z\s&/]{2,28}$")
    header_indices = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        if header_pattern.match(stripped) and not re.search(r"\d", stripped):
            header_indices.append(i)

    target_idx = None
    for i in header_indices:
        if lines[i].strip().lower() == section_name.lower():
            target_idx = i
            break

    if target_idx is None:
        return ""

    next_idx = None
    for i in header_indices:
        if i > target_idx:
            next_idx = i
            break

    if next_idx:
        return "\n".join(lines[target_idx:next_idx])
    else:
        return "\n".join(lines[target_idx:])


def extract_skills(text):
    skills_list = load_skills_list()
    section = extract_section(text, "Skills") or text

    found_skills = set()

    for line in section.split("\n"):
        if ":" in line:
            line = line.split(":", 1)[1]

        parts = re.split(r"[,|•/]", line)
        for part in parts:
            part = part.strip().lower()
            if not part:
                continue

            if part in skills_list:
                found_skills.add(part.title())
                continue

            for skill in skills_list:
                if len(skill) <= 2:
                    if re.search(rf"\b{re.escape(skill)}\b", part, re.IGNORECASE):
                        found_skills.add(skill.title())
                else:
                    if skill in part:
                        found_skills.add(skill.title())

    return list(found_skills)


def extract_projects(text):
    section = extract_section(text, "Projects")
    if not section:
        return []

    projects = []
    lines = section.split("\n")
    current_project = None

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.lower() == "projects":
            continue

        # bullet point — add to current project description
        if line.startswith(("•", "-", "*", "–")) and current_project is not None:
            bullet = line.lstrip("•-*– ").strip()
            current_project["description"].append(bullet)
            continue

        # format 1: "Project Name | tech stack  date"
        if "|" in line:
            if current_project:
                projects.append(current_project)
            title = line.split("|")[0].strip()
            if title and len(title) < 60:
                current_project = {"title": title, "description": []}
            continue

        # format 2: line with a date range at end
        if re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})", line):
            title = re.sub(
                r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{4}.*",
                "", line, flags=re.IGNORECASE
            ).strip()
            title = re.sub(r"\d{4}.*", "", title).strip()
            if title and len(title) < 60 and not any(
                kw in title.lower() for kw in [
                    "intern", "university", "school", "ltd", "capital",
                    "college", "institute", "hackathon", "certification"
                ]
            ):
                if current_project:
                    projects.append(current_project)
                current_project = {"title": title, "description": []}
            continue

        # format 3: short standalone title line
        if (
            len(line) < 50
            and line[0].isupper()
            and not re.search(r"[•:\-–]", line)
            and not re.search(r"\d", line)
        ):
            if current_project:
                projects.append(current_project)
            current_project = {"title": line, "description": []}

    if current_project:
        projects.append(current_project)

    return projects[:10]


def extract_education(text):
    section = extract_section(text, "Education")
    if not section:
        return []

    education = []
    lines = [l.strip() for l in section.split("\n") if l.strip()]

    for line in lines:
        if not line or line.lower() == "education":
            continue
        if line.startswith("•"):
            continue
        if re.match(r"^(CGPA|GPA|Percentage|Grade|Marks|Score|Result|Division)", line, re.IGNORECASE):
            continue
        if len(line) < 5:
            continue

        has_year = bool(re.search(r"\d{4}", line))
        has_edu_keyword = bool(re.search(
            r"university|college|school|institute|academy|polytechnic|"
            r"b\.tech|m\.tech|bsc|msc|b\.e|m\.e|bachelor|master|phd|"
            r"diploma|12th|10th|intermediate|higher secondary|secondary",
            line, re.IGNORECASE
        ))

        if has_year or has_edu_keyword:
            education.append(line)

    return education[:5] 