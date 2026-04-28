import logging
import httpx
import asyncio
from google import genai
from google.genai import types as genai_types

from src.utils.config import get_settings
from src.rag_services.search_courses import search_database 

logger = logging.getLogger(__name__)

OLLAMA_TIMEOUT = 120

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
- Context Resources: You will be provided with a list of highly relevant freeCodeCamp YouTube courses based on the user's request. **You MUST prioritize including these specific courses and their exact URLs in the Resources sections.**
- Use REAL, well-known URLs. Do NOT invent or hallucinate URLs.
- Keep the plan concise but actionable — no filler paragraphs.
- Tailor the plan to the seniority implied by the input (entry-level vs senior).
- Respond ONLY in Markdown. No JSON, no code fences around the whole response.
"""

async def generate_study_plan(user_message: str) -> str:
    settings = get_settings()

    if not settings.google_api_key:
        logger.error("GOOGLE_API_KEY is not set. Study plan generation requires Gemini.")
        return (
            "**Sorry, I couldn't generate a study plan right now.** "
            "Gemini API key is missing or not configured."
        )

    # --- RAG RETRIEVAL STEP ---
    matches = await asyncio.to_thread(search_database, user_message, 4)

    relevant_context = ""
    if matches:
        relevant_context = "\n\n### Context Resources (Highly Recommended freeCodeCamp Courses):\n"
        for m in matches:
            relevant_context += f"- **{m['title']}**: {m['description']}... (URL: {m['url']})\n"

    prompt = STUDY_PLAN_SYSTEM_PROMPT + relevant_context + "\n\nUser input:\n" + user_message

    # --- RAG GENERATION STEP (Gemini only) ---
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
        logger.info("Study plan generated via Gemini (RAG Augmented)")
        return response.text.strip()
    except Exception as exc:
        logger.error("Gemini failed for study plan: %s", exc)
        return (
            "**Sorry, I couldn't generate a study plan right now.** "
            "The AI service is temporarily unavailable. Please try again later."
        )
