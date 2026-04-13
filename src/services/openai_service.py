import json
from typing import Optional

from google import genai
from google.genai import types as genai_types

from src.utils.config import get_settings

SKILL_EXTRACTION_PROMPT = """You are an expert technical recruiter and compensation analyst. Given the following job description,
extract a JSON object with these fields:

{
  "skills": ["skill1", "skill2"],
  "seniority": "junior|mid|senior|lead",
  "certifications": ["cert1"],
  "salary_estimate_usd": <number>,
  "category": "backend|frontend|fullstack|data|devops|mobile|design|management|qa|other"
}

Rules:
- Normalize skill names (e.g., "React.js" -> "React", "Golang" -> "Go")
- If the posting says "0-2 years experience", infer "junior"
- If "2-5 years", infer "mid"
- If "5+ years", infer "senior"
- If "lead" or "manager" or "head" in title, infer "lead"

Salary rules (IMPORTANT — salary_estimate_usd must NEVER be null or 0):
- If the posting states an explicit salary, convert it to annual USD equivalent.
- If no salary is stated, estimate a realistic annual USD salary using these market baselines:
  - Egypt: junior ~$6000, mid ~$12000, senior ~$22000, lead ~$30000
  - Dubai/UAE/Saudi/GCC: junior ~$25000, mid ~$45000, senior ~$70000, lead ~$95000
  - Remote/international: junior ~$30000, mid ~$55000, senior ~$85000, lead ~$110000
- Adjust the estimate up or down based on the specific role category (e.g., data/AI roles pay ~20% more, QA ~10% less) and required skill set.
- The value must be a positive integer representing annual USD.

- Return ONLY valid JSON, no markdown fences

Job Description:
\"\"\"
{description}
\"\"\"
"""


_MARKET_RATES_USD: dict[str, dict[str, int]] = {
    "egypt":  {"junior": 6_000, "mid": 12_000, "senior": 22_000, "lead": 30_000},
    "gcc":    {"junior": 25_000, "mid": 45_000, "senior": 70_000, "lead": 95_000},
    "remote": {"junior": 30_000, "mid": 55_000, "senior": 85_000, "lead": 110_000},
}

_CATEGORY_MULTIPLIER: dict[str, float] = {
    "data": 1.20, "devops": 1.15, "fullstack": 1.10, "backend": 1.05,
    "frontend": 1.00, "mobile": 1.05, "management": 1.15,
    "design": 0.90, "qa": 0.90, "other": 1.00,
}

_GCC_KEYWORDS = ["dubai", "uae", "abu dhabi", "saudi", "riyadh", "jeddah",
                 "qatar", "doha", "kuwait", "bahrain", "oman", "muscat"]


def estimate_salary(seniority: str, category: str, location_text: str) -> int:
    """Produce a market-rate annual USD estimate from seniority + location."""
    loc = location_text.lower()
    if any(k in loc for k in _GCC_KEYWORDS):
        region = "gcc"
    elif any(k in loc for k in ["egypt", "cairo", "giza", "alexandria"]):
        region = "egypt"
    elif "remote" in loc:
        region = "remote"
    else:
        region = "egypt"

    base = _MARKET_RATES_USD[region].get(seniority, _MARKET_RATES_USD[region]["mid"])
    multiplier = _CATEGORY_MULTIPLIER.get(category, 1.0)
    return round(base * multiplier)


async def extract_job_insights(description: str, title: str = "") -> Optional[dict]:
    settings = get_settings()
    if not settings.google_api_key:
        return _fallback_extraction(description, title)

    client = genai.Client(api_key=settings.google_api_key)
    prompt = SKILL_EXTRACTION_PROMPT.replace("{description}", f"{title}\n{description}")

    try:
        async with client.aio as aclient:
            response = await aclient.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=500,
                ),
            )
        content = response.text.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(content)
    except Exception:
        return _fallback_extraction(description, title)


def _fallback_extraction(description: str, title: str = "") -> dict:
    """Rule-based fallback when the API is unavailable."""
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

    salary = estimate_salary(seniority, category, text)

    return {
        "skills": found_skills,
        "seniority": seniority,
        "certifications": [],
        "salary_estimate_usd": salary,
        "category": category,
    }
