from fastapi import HTTPException

from src.services.studyplan_service import StudyPlanService


# async def chat(user_message: str) -> dict:
#     if not user_message or not user_message.strip():
#         raise HTTPException(status_code=400, detail="Message cannot be empty.")
#     content = await generate_study_plan(user_message.strip())
#     return {"role": "assistant", "content": content}



async def get_study_plan(request, db):
    service = StudyPlanService(db)
    result = await service.generate_study_plan(request.query)
    return result