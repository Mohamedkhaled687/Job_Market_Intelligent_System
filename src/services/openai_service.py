import json
import os
from typing import Optional

from openai import AsyncOpenAI

from src.utils.config import get_settings

SKILL_EXTRACTION_PROMPT = """You are an expert technical recruiter. Given the following job description,
extract a JSON object with these fields:

{
  "skills": ["skill1", "skill2"],
  "seniority": "junior|mid|senior|lead",
  "certifications": ["cert1"],
  "salary_estimate_usd": null,
  "category": "backend|frontend|fullstack|data|devops|mobile|design|management|qa|other"
}

Rules:
- Normalize skill names (e.g., "React.js" -> "React", "Golang" -> "Go")
- If the posting says "0-2 years experience", infer "junior"
- If "2-5 years", infer "mid"
- If "5+ years", infer "senior"
- If "lead" or "manager" or "head" in title, infer "lead"
- Return ONLY valid JSON, no markdown fences

Job Description:
\"\"\"
{description}
\"\"\"
"""


async def extract_job_insights(description: str, title: str = "") -> Optional[dict]:
    settings = get_settings()
    if not settings.openai_api_key or settings.openai_api_key == "sk-your-key-here":
        return _fallback_extraction(description, title)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    prompt = SKILL_EXTRACTION_PROMPT.replace("{description}", f"{title}\n{description}")

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(content)
    except Exception:
        return _fallback_extraction(description, title)


def _fallback_extraction(description: str, title: str = "") -> dict:
    """Rule-based fallback when OpenAI is unavailable."""
    text = f"{title} {description}".lower()

    skill_keywords = {
        "python": "Python", "java": "Java", "javascript": "JavaScript",
        "typescript": "TypeScript", "react": "React", "angular": "Angular",
        "vue": "Vue.js", "node.js": "Node.js", "nodejs": "Node.js",
        "django": "Django", "flask": "Flask", "fastapi": "FastAPI",
        "spring": "Spring", "docker": "Docker", "kubernetes": "Kubernetes",
        "aws": "AWS", "azure": "Azure", "gcp": "Google Cloud",
        "sql": "SQL", "mongodb": "MongoDB", "postgresql": "PostgreSQL",
        "redis": "Redis", "git": "Git", "linux": "Linux",
        "machine learning": "Machine Learning", "deep learning": "Deep Learning",
        "tensorflow": "TensorFlow", "pytorch": "PyTorch",
        "html": "HTML", "css": "CSS", "sass": "SASS",
        "graphql": "GraphQL", "rest api": "REST APIs",
        "c++": "C++", "c#": "C#", "go ": "Go", "golang": "Go",
        "rust": "Rust", "php": "PHP", "ruby": "Ruby",
        "swift": "Swift", "kotlin": "Kotlin", "flutter": "Flutter",
        "react native": "React Native", "figma": "Figma",
        "tableau": "Tableau", "power bi": "Power BI",
        "pandas": "Pandas", "numpy": "NumPy", "scikit": "scikit-learn",
        "laravel": "Laravel", "nextjs": "Next.js", "next.js": "Next.js",
        "tailwind": "Tailwind CSS", "bootstrap": "Bootstrap",
        "jenkins": "Jenkins", "terraform": "Terraform",
        "kafka": "Kafka", "rabbitmq": "RabbitMQ",
        "elasticsearch": "Elasticsearch", "nginx": "Nginx",
        "agile": "Agile", "scrum": "Scrum", "jira": "Jira",
    }
    found_skills = []
    for keyword, canonical in skill_keywords.items():
        if keyword in text and canonical not in found_skills:
            found_skills.append(canonical)

    seniority = "mid"
    if any(w in text for w in ["lead", "head of", "principal", "staff", "manager"]):
        seniority = "lead"
    elif any(w in text for w in ["senior", "sr.", "sr ", "5+ years", "6+ years", "7+ years"]):
        seniority = "senior"
    elif any(w in text for w in ["junior", "jr.", "jr ", "entry", "intern", "0-1 year", "0-2 year", "fresh"]):
        seniority = "junior"

    category = "other"
    category_map = {
        "backend": ["backend", "back-end", "server-side", "api developer"],
        "frontend": ["frontend", "front-end", "ui developer", "ui engineer"],
        "fullstack": ["fullstack", "full-stack", "full stack"],
        "data": ["data engineer", "data scientist", "data analyst", "machine learning", "ml engineer", "ai engineer"],
        "devops": ["devops", "sre", "site reliability", "infrastructure", "platform engineer"],
        "mobile": ["mobile", "android", "ios", "flutter", "react native"],
        "design": ["ui/ux", "ux designer", "ui designer", "product designer"],
        "management": ["project manager", "product manager", "engineering manager", "tech lead", "team lead"],
        "qa": ["qa", "quality assurance", "test engineer", "sdet"],
    }
    for cat, keywords_list in category_map.items():
        if any(k in text for k in keywords_list):
            category = cat
            break

    return {
        "skills": found_skills,
        "seniority": seniority,
        "certifications": [],
        "salary_estimate_usd": None,
        "category": category,
    }
