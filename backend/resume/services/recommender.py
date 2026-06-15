JOB_SKILL_MAP = {
    "Frontend Developer": {
        "skills": ["javascript", "typescript", "react", "angular", "vue", "html", "css", "tailwind", "bootstrap", "next.js"],
        "min_match": 3
    },
    "Backend Developer": {
        "skills": ["python", "java", "node.js", "express", "django", "flask", "fastapi", "sql", "postgresql", "mysql", "mongodb", "rest", "docker"],
        "min_match": 3
    },
    "Full Stack Developer": {
        "skills": ["javascript", "react", "node.js", "html", "css", "sql", "rest", "git", "docker"],
        "min_match": 4
    },
    "Data Scientist": {
        "skills": ["python", "r", "sql", "pandas", "numpy", "matplotlib", "seaborn", "scikit-learn", "tensorflow", "pytorch", "machine learning", "deep learning"],
        "min_match": 3
    },
    "Machine Learning Engineer": {
        "skills": ["python", "tensorflow", "pytorch", "keras", "scikit-learn", "numpy", "pandas", "deep learning", "machine learning", "docker", "git"],
        "min_match": 3
    },
    "DevOps Engineer": {
        "skills": ["docker", "kubernetes", "aws", "azure", "gcp", "linux", "git", "github", "rest"],
        "min_match": 3
    },
    "Android Developer": {
        "skills": ["android", "java", "kotlin", "flutter", "react native", "firebase"],
        "min_match": 2
    },
    "Data Analyst": {
        "skills": ["python", "sql", "excel", "pandas", "numpy", "matplotlib", "seaborn", "power bi", "tableau", "mysql", "postgresql"],
        "min_match": 3
    },
    "Cybersecurity Analyst": {
        "skills": ["linux", "python", "jwt", "oauth", "rest", "docker", "aws", "azure"],
        "min_match": 2
    },
    "AI/NLP Engineer": {
        "skills": ["python", "nlp", "bert", "spacy", "nltk", "tensorflow", "pytorch", "deep learning", "machine learning", "opencv", "computer vision"],
        "min_match": 3
    }
}

def recommend_jobs(skills):
    # normalize input skills to lowercase
    user_skills = [s.lower() for s in skills]
    
    recommendations = []

    for job, config in JOB_SKILL_MAP.items():
        required_skills = config["skills"]
        min_match = config["min_match"]

        matched = [s for s in required_skills if s in user_skills]
        match_count = len(matched)

        if match_count >= min_match:
            match_percent = round((match_count / len(required_skills)) * 100)
            recommendations.append({
                "job": job,
                "matched_skills": matched,
                "match_percent": match_percent
            })

    # sort by match percentage
    recommendations.sort(key=lambda x: x["match_percent"], reverse=True)

    return recommendations