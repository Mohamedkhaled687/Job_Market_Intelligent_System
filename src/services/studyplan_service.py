import logging

import httpx
from google import genai
from google.genai import types as genai_types

from src.utils.config import get_settings

logger = logging.getLogger(__name__)

OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "mistral"
OLLAMA_TIMEOUT = 90

STUDY_PLAN_SYSTEM_PROMPT = """\
You are an expert career coach and technical mentor. The user will provide either:
- A job description (pasted from a job board), OR
- A comma-separated list of skills they want to learn.

Your task is to generate a **structured, actionable study plan** in Markdown.

Follow this format strictly:

Start with an encouraging message to the user for learning the skills they provided and how it will help them in their career.

## Phase 1: Foundations (Weeks 1–3)
For each foundational skill or prerequisite:
- **Skill Name**
    - What to learn and why it matters
    - Resources:
        - [Official Docs / Tutorial](real URL)
        - [Free Course or Video](real URL)
    - Mini-project idea to practice

## Phase 2: Intermediate (Weeks 4–7)
For each core skill at working proficiency:
- **Skill Name**
    - What to build / practice
    - Resources:
        - [Course / Tutorial](real URL)
        - [GitHub repo or guide](real URL)
    - Project idea

## Phase 3: Advanced & Portfolio (Weeks 8–10)
- Capstone project idea combining multiple skills
- System design or architecture topics to study
- Resources for deeper mastery

## Recommended Timeline
- Summary table: skill → phase → estimated hours

Rules:
- Use REAL, well-known URLs (official documentation, freeCodeCamp, MDN, Coursera, Udemy, YouTube channels like Traversy Media, Fireship, Tech With Tim, etc.).
- Do NOT invent or hallucinate URLs. If unsure of a URL, recommend searching for the resource by name instead of providing a fake link.
- Keep the plan concise but actionable — no filler paragraphs.
- Tailor the plan to the seniority implied by the input (entry-level vs senior).
- Respond ONLY in Markdown. No JSON, no code fences around the whole response.
"""


async def generate_study_plan(user_message: str) -> dict:
        settings = get_settings()
        prompt = STUDY_PLAN_SYSTEM_PROMPT + "\n\nUser input:\n" + user_message

        ollama_plan = await _generate_with_ollama(prompt)
        if ollama_plan:
                logger.info("Study plan generated via Ollama")
                return {"content": ollama_plan, "source": "ollama"}

        if settings.google_api_key:
                gemini_plan = await _generate_with_gemini(prompt, settings.google_api_key)
                if gemini_plan:
                        logger.info("Study plan generated via Gemini")
                        return {"content": gemini_plan, "source": "gemini"}

        logger.info("Study plan generated via fallback template")
        return {"content": _fallback_study_plan(user_message), "source": "fallback"}


async def _generate_with_ollama(prompt: str) -> str | None:
        try:
                async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                        response = await client.post(
                                OLLAMA_API_URL,
                                json={
                                        "model": OLLAMA_MODEL,
                                        "prompt": prompt,
                                        "stream": False,
                                        "temperature": 0.4,
                                        "num_predict": 2048,
                                },
                        )
                        response.raise_for_status()
                        content = response.json().get("response", "").strip()
                        return content or None
        except Exception as exc:
                logger.debug("Ollama study-plan generation failed: %s", exc)
                return None


async def _generate_with_gemini(prompt: str, api_key: str) -> str | None:
        try:
                client = genai.Client(api_key=api_key)
                async with client.aio as aclient:
                        response = await aclient.models.generate_content(
                                model="gemini-2.5-flash",
                                contents=[genai_types.Content(role="user", parts=[genai_types.Part(text=prompt)])],
                                config=genai_types.GenerateContentConfig(
                                        temperature=0.4,
                                        max_output_tokens=4096,
                                ),
                        )
                return response.text.strip()
        except Exception as exc:
                logger.debug("Gemini study-plan generation failed: %s", exc)
                return None


def _extract_focus_skills(user_message: str) -> list[str]:
        text = user_message.lower()
        keyword_map = [
                ("python", "Python"),
                ("java", "Java"),
                ("javascript", "JavaScript"),
                ("typescript", "TypeScript"),
                ("react", "React"),
                ("node", "Node.js"),
                ("django", "Django"),
                ("flask", "Flask"),
                ("fastapi", "FastAPI"),
                ("spring", "Spring Boot"),
                ("sql", "SQL"),
                ("docker", "Docker"),
                ("kubernetes", "Kubernetes"),
                ("aws", "AWS"),
                ("azure", "Azure"),
                ("git", "Git"),
                ("machine learning", "Machine Learning"),
                ("ml", "Machine Learning"),
                ("data", "Data Analysis"),
                ("devops", "DevOps"),
                ("qa", "QA Testing"),
                ("mobile", "Mobile Development"),
        ]

        skills: list[str] = []
        for needle, label in keyword_map:
                if needle in text and label not in skills:
                        skills.append(label)

        if not skills:
                skills = ["Programming Fundamentals", "Problem Solving", "Project Building"]

        return skills[:6]


def _fallback_study_plan(user_message: str) -> str:
        skills = _extract_focus_skills(user_message)
        primary = skills[0]
        secondary = skills[1] if len(skills) > 1 else skills[0]
        tertiary = skills[2] if len(skills) > 2 else skills[0]

        return f"""Start with {primary} and build toward a portfolio-ready project that combines {secondary} and {tertiary}.

## Phase 1: Foundations (Weeks 1–3)
- **{primary}**
    - Learn the core syntax, main concepts, and how the ecosystem works.
    - Resources:
        - [Official documentation](https://www.google.com/search?q={primary.replace(' ', '+')}+official+documentation)
        - [freeCodeCamp](https://www.freecodecamp.org/)
    - Mini-project idea: Build a small practice app that uses {primary.lower()}.

- **Git and workflow**
    - Learn branching, commits, pull requests, and basic debugging habits.
    - Resources:
        - [Git book](https://git-scm.com/book/en/v2)
        - [GitHub Skills](https://skills.github.com/)
    - Mini-project idea: Put your practice app in a GitHub repository and add a README.

## Phase 2: Intermediate (Weeks 4–7)
- **{secondary}**
    - Practice building realistic features and connecting it with {primary.lower()}.
    - Resources:
        - [MDN Web Docs](https://developer.mozilla.org/) 
        - [Traversy Media](https://www.youtube.com/@TraversyMedia)
    - Project idea: Add authentication, CRUD, or data fetching to your practice app.

- **Testing and deployment**
    - Learn how to test your code and deploy it to a public environment.
    - Resources:
        - [freeCodeCamp](https://www.freecodecamp.org/)
        - [Fireship](https://www.youtube.com/@Fireship)
    - Project idea: Add tests and deploy your app with a public URL.

## Phase 3: Advanced & Portfolio (Weeks 8–10)
- **Capstone project**: Build a portfolio project that combines {primary}, {secondary}, and {tertiary} in one end-to-end application.
- **System design topics**: APIs, scalability, caching, authentication, and observability.
- **Resources for deeper mastery**:
    - [MDN Web Docs](https://developer.mozilla.org/)
    - [Fireship](https://www.youtube.com/@Fireship)
    - [Tech With Tim](https://www.youtube.com/@TechWithTim)

## Recommended Timeline
| Skill | Phase | Estimated Hours |
| --- | --- | ---: |
| {primary} | Foundations | 12 |
| {secondary} | Intermediate | 16 |
| {tertiary} | Intermediate | 16 |
| Capstone project | Advanced | 20 |
"""
