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


@router.get("/salary-intelligence")
async def salary_intelligence(
    category: Optional[str] = None,
    seniority: Optional[str] = None,
    location: Optional[str] = None,
):
    return await analytics_controller.get_salary_intelligence(
        category=category, seniority=seniority, location=location,
    )


@router.get("/skill-clustering")
async def skill_clustering(
    min_skill_frequency: int = Query(5, ge=1),
    category: Optional[str] = None,
    seniority: Optional[str] = None,
):
    return await analytics_controller.get_skill_clustering(
        min_skill_frequency=min_skill_frequency,
        category=category,
        seniority=seniority,
    )


@router.get("/company-hiring-patterns")
async def company_hiring_patterns():
    return await analytics_controller.get_company_hiring_patterns()


@router.get("/company-skill-matrix")
async def company_skill_matrix():
    return await analytics_controller.get_company_skill_matrix()


@router.get("/category-hiring-trends")
async def category_hiring_trends():
    return await analytics_controller.get_category_hiring_trends()

