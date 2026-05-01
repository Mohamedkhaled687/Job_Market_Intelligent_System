from typing import Optional

from fastapi import APIRouter, Query

from src.controllers import analytics_controller
from src.services.clustering_service import (
    SkillClusteringService,
    CompanyHiringAnalysisService,
)

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


# New clustering & big data endpoints
@router.get("/skill-clustering")
async def skill_clustering(
    min_skill_frequency: int = Query(5, ge=1),
    category: Optional[str] = None,
    seniority: Optional[str] = None,
):
    """Cluster jobs by skill co-occurrence patterns"""
    return await SkillClusteringService.cluster_jobs_by_skills(
        min_skill_frequency=min_skill_frequency,
        category=category,
        seniority=seniority,
    )


@router.get("/company-hiring-patterns")
async def company_hiring_patterns():
    """Analyze company hiring patterns and preferences"""
    return await CompanyHiringAnalysisService.get_company_hiring_patterns()


@router.get("/company-skill-matrix")
async def company_skill_matrix():
    """Get company vs skills heatmap matrix"""
    return await CompanyHiringAnalysisService.get_skill_demand_by_company()


@router.get("/category-hiring-trends")
async def category_hiring_trends():
    """Get hiring trends by job category"""
    return await CompanyHiringAnalysisService.get_hiring_trends_by_category()
