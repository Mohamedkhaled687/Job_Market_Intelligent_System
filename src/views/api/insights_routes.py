from typing import Optional

from fastapi import APIRouter, Query

from src.controllers import analytics_controller

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("/dashboard")
async def dashboard(
    category: Optional[str] = None,
    seniority: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    return await analytics_controller.get_dashboard(
        category=category,
        seniority=seniority,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/skill-graph")
async def skill_graph(min_weight: int = Query(3, ge=1)):
    return await analytics_controller.get_skill_graph(min_weight=min_weight)
