from fastapi import APIRouter
from pydantic import BaseModel

from src.controllers import studyplan_controller

router = APIRouter(prefix="/api/studyplan", tags=["Study Plan"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    role: str
    content: str


@router.post("/chat", response_model=ChatResponse)
async def study_plan_chat(request: ChatRequest):
    return await studyplan_controller.chat(request.message)
