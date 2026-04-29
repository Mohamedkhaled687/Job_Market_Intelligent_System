import logging
import httpx

from google import genai
from google.genai import types as genai_types

from src.utils.config import get_settings

logger = logging.getLogger(__name__)

OLLAMA_TIMEOUT = 120

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
- Use REAL, well-known URLs (official documentation, freeCodeCamp, MDN, Coursera, \
Udemy, YouTube channels like Traversy Media, Fireship, Tech With Tim, etc.).
- Do NOT invent or hallucinate URLs. If unsure of a URL, recommend searching for \
the resource by name instead of providing a fake link.
- Keep the plan concise but actionable — no filler paragraphs.
- Tailor the plan to the seniority implied by the input (entry-level vs senior).
- Respond ONLY in Markdown. No JSON, no code fences around the whole response.
"""


async def generate_study_plan(user_message: str) -> str:
    settings = get_settings()
    prompt = STUDY_PLAN_SYSTEM_PROMPT + "\n\nUser input:\n" + user_message

    if settings.google_api_key:
        try:
            client = genai.Client(api_key=settings.google_api_key)
            async with client.aio as aclient:
                response = await aclient.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[
                        genai_types.Content(
                            role="user",
                            parts=[genai_types.Part(text=prompt)],
                        ),
                    ],
                    config=genai_types.GenerateContentConfig(
                        temperature=0.4,
                        max_output_tokens=4096,
                    ),
                )
            logger.info("Study plan generated via Gemini")
            return response.text.strip()
        except Exception as exc:
            logger.warning("Gemini failed for study plan, falling back to Ollama: %s", exc)

    try:
        ollama_url = settings.ollama_api_url
        ollama_model = settings.ollama_model
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                ollama_url,
                json={
                    "model": ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.4,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data.get("response", "").strip()
            if text:
                logger.info("Study plan generated via Ollama")
                return text
    except Exception as exc:
        logger.warning("Ollama failed for study plan: %s", repr(exc))

    return (
        "**Sorry, I couldn't generate a study plan right now.** "
        "Gemini key may be missing/expired and Ollama is unavailable."
    )
