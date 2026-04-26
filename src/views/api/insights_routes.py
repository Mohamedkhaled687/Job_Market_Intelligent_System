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


# Advanced Analytics Endpoints (Pandas & NumPy based)

@router.get("/market-overview")
async def market_overview():
    """Get comprehensive market overview with statistics."""
    return await analytics_controller.get_market_overview()


@router.get("/salary-analysis")
async def salary_analysis(
    category: Optional[str] = Query(None),
    seniority: Optional[str] = Query(None),
):
    """Get detailed salary analysis with statistical metrics."""
    return await analytics_controller.get_advanced_salary_analysis(
        category=category,
        seniority=seniority,
    )


@router.get("/skill-metrics")
async def skill_metrics(top_n: int = Query(25, ge=5, le=100)):
    """Get detailed skill demand and salary correlation analysis."""
    return await analytics_controller.get_skill_demand_metrics(top_n=top_n)


@router.get("/trends")
async def posting_trends(days: int = Query(90, ge=7, le=365)):
    """Get job posting trends analysis."""
    return await analytics_controller.get_posting_trends_analysis(days=days)


@router.get("/companies")
async def company_analytics(top_n: int = Query(20, ge=5, le=100)):
    """Get company hiring patterns and compensation analysis."""
    return await analytics_controller.get_company_analytics(top_n=top_n)


@router.get("/comprehensive")
async def comprehensive_dashboard():
    """Get full analytics dashboard combining all insights."""
    return await analytics_controller.get_full_analytics_dashboard()


@router.get("/salary-intelligence")
async def salary_intelligence(
    category: Optional[str] = None,
    seniority: Optional[str] = None,
    location: Optional[str] = None,
):
    return await analytics_controller.get_salary_intelligence(
        category=category, seniority=seniority, location=location,
    )
