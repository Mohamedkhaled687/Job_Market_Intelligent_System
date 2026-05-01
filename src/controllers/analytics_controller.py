from collections import Counter
from typing import Optional
import numpy as np

from src.models.database import get_db
from src.services.analytics_service import AnalyticsService


async def get_dashboard(
    category: Optional[str] = None,
    seniority: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """Single endpoint aggregation powering the entire dashboard."""
    db = get_db()
    match_stage: dict = {}
    if category:
        match_stage["category"] = category
    if seniority:
        match_stage["seniority"] = seniority

    total_jobs = await db.jobs.count_documents(match_stage)

    top_skills_pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
        {"$project": {"skill": "$_id", "count": 1, "_id": 0}},
    ]
    top_skills = await db.jobs.aggregate(top_skills_pipeline).to_list(length=20)

    listed_skills_pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$unwind": "$listed_skills"},
        {"$group": {"_id": "$listed_skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
        {"$project": {"skill": "$_id", "count": 1, "_id": 0}},
    ]
    if not top_skills:
        top_skills = await db.jobs.aggregate(listed_skills_pipeline).to_list(length=20)

    salary_pipeline = [
        {"$match": {**match_stage, "salary_estimate": {"$ne": None}}},
        {"$group": {
            "_id": None,
            "avg_salary": {"$avg": "$salary_estimate"},
            "min_salary": {"$min": "$salary_estimate"},
            "max_salary": {"$max": "$salary_estimate"},
        }},
    ]
    salary_stats_list = await db.jobs.aggregate(salary_pipeline).to_list(length=1)
    salary_stats = salary_stats_list[0] if salary_stats_list else {
        "avg_salary": None, "min_salary": None, "max_salary": None
    }

    category_pipeline = [
        {"$match": {"category": {"$ne": None}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"category": "$_id", "count": 1, "_id": 0}},
    ]
    category_dist = await db.jobs.aggregate(category_pipeline).to_list(length=20)

    seniority_pipeline = [
        {"$match": {"seniority": {"$ne": None}}},
        {"$group": {"_id": "$seniority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"seniority": "$_id", "count": 1, "_id": 0}},
    ]
    seniority_dist = await db.jobs.aggregate(seniority_pipeline).to_list(length=10)

    top_companies_pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {"_id": "$company", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {"company": "$_id", "count": 1, "_id": 0}},
    ]
    top_companies = await db.jobs.aggregate(top_companies_pipeline).to_list(length=10)

    trends_pipeline = [
        {"$match": {"posted_date": {"$ne": None}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$posted_date"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {"month": "$_id", "count": 1, "_id": 0}},
    ]
    monthly_trends = await db.jobs.aggregate(trends_pipeline).to_list(length=100)

    return {
        "total_jobs": total_jobs,
        "top_skills": top_skills,
        "salary_stats": {
            "avg_salary": round(salary_stats.get("avg_salary") or 0),
            "min_salary": round(salary_stats.get("min_salary") or 0),
            "max_salary": round(salary_stats.get("max_salary") or 0),
        },
        "category_distribution": category_dist,
        "seniority_distribution": seniority_dist,
        "top_companies": top_companies,
        "monthly_trends": monthly_trends,
    }


async def get_skill_graph(min_weight: int = 3) -> dict:
    """Build a skill co-occurrence graph from normalized_skills arrays."""
    db = get_db()

    pipeline = [
        {"$match": {"normalized_skills": {"$exists": True, "$ne": []}}},
        {"$project": {"normalized_skills": 1}},
    ]
    docs = await db.jobs.aggregate(pipeline).to_list(length=5000)

    if not docs:
        pipeline = [
            {"$match": {"listed_skills": {"$exists": True, "$ne": []}}},
            {"$project": {"listed_skills": 1}},
        ]
        docs = await db.jobs.aggregate(pipeline).to_list(length=5000)
        skill_field = "listed_skills"
    else:
        skill_field = "normalized_skills"

    node_counts: Counter = Counter()
    edge_counts: Counter = Counter()

    for doc in docs:
        skills = sorted(set(doc.get(skill_field, [])))
        for s in skills:
            node_counts[s] += 1
        for i, a in enumerate(skills):
            for b in skills[i + 1:]:
                edge_counts[(a, b)] += 1

    nodes = [{"id": skill, "count": count} for skill, count in node_counts.most_common(50)]
    node_ids = {n["id"] for n in nodes}

    edges = [
        {"source": a, "target": b, "weight": w}
        for (a, b), w in edge_counts.most_common(200)
        if w >= min_weight and a in node_ids and b in node_ids
    ]

    return {"nodes": nodes, "edges": edges}


# --- Advanced Analytics using MongoDB Aggregation & Pandas ---

async def get_market_overview() -> dict:
    """
    Get comprehensive market overview using MongoDB aggregation.
    Replaced pandas implementation with efficient aggregation pipelines.
    """
    db = get_db()
    
    # Total jobs count
    total_jobs = await db.jobs.count_documents({})
    
    # Total unique companies
    companies_pipeline = [
        {"$group": {"_id": "$company"}},
        {"$count": "count"}
    ]
    companies_result = await db.jobs.aggregate(companies_pipeline).to_list(length=1)
    total_companies = companies_result[0]["count"] if companies_result else 0
    
    # Salary stats
    salary_pipeline = [
        {"$match": {"salary_estimate": {"$gt": 0}}},
        {"$group": {
            "_id": None,
            "avg_salary": {"$avg": "$salary_estimate"},
            "min_salary": {"$min": "$salary_estimate"},
            "max_salary": {"$max": "$salary_estimate"},
        }},
    ]
    salary_stats_result = await db.jobs.aggregate(salary_pipeline).to_list(length=1)
    salary_stats = {
        "avg_salary": round(salary_stats_result[0]["avg_salary"]) if salary_stats_result else None,
        "min_salary": round(salary_stats_result[0]["min_salary"]) if salary_stats_result else None,
        "max_salary": round(salary_stats_result[0]["max_salary"]) if salary_stats_result else None,
    }
    
    # Category distribution
    category_pipeline = [
        {"$match": {"category": {"$ne": None}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"category": "$_id", "count": 1, "_id": 0}},
    ]
    category_dist = await db.jobs.aggregate(category_pipeline).to_list(length=20)
    
    # Unique skills count
    skills_pipeline = [
        {"$match": {"normalized_skills": {"$exists": True, "$ne": []}}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills"}},
        {"$count": "unique_skills"}
    ]
    skills_result = await db.jobs.aggregate(skills_pipeline).to_list(length=1)
    unique_skills = skills_result[0]["unique_skills"] if skills_result else 0

    return {
        "total_jobs": total_jobs,
        "total_companies": total_companies,
        "total_unique_skills": unique_skills,
        "salary_stats": salary_stats,
        "category_distribution": category_dist,
    }


async def get_advanced_salary_analysis(
    category: Optional[str] = None,
    seniority: Optional[str] = None,
) -> dict:
    """
    Get detailed salary analysis using MongoDB aggregation.
    Replaced get_salary_statistics/by_seniority/by_category with efficient pipelines.
    """
    db = get_db()
    
    base_match = {"salary_estimate": {"$gt": 0}}
    if category:
        base_match["category"] = category
    if seniority:
        base_match["seniority"] = seniority
    
    # Base salary stats
    salary_pipeline = [
        {"$match": base_match},
        {"$sort": {"salary_estimate": 1}},
    ]
    docs = await db.jobs.aggregate(salary_pipeline).to_list(length=5000)
    salaries = [d["salary_estimate"] for d in docs if d.get("salary_estimate")]
    
    if not salaries:
        base_stats = {
            "mean": None, "median": None, "std": None, 
            "min": None, "max": None, "q25": None, "q50": None, "q75": None, "count": 0
        }
    else:
        base_stats = {
            "mean": float(np.mean(salaries)),
            "median": float(np.median(salaries)),
            "std": float(np.std(salaries)),
            "min": float(np.min(salaries)),
            "max": float(np.max(salaries)),
            "q25": float(np.percentile(salaries, 25)),
            "q50": float(np.percentile(salaries, 50)),
            "q75": float(np.percentile(salaries, 75)),
            "count": len(salaries),
        }
    
    # By seniority
    by_seniority_pipeline = [
        {"$match": base_match},
        {"$group": {
            "_id": "$seniority",
            "avg_salary": {"$avg": "$salary_estimate"},
            "median_salary": {"$median": {"input": "$salary_estimate"}},
            "min_salary": {"$min": "$salary_estimate"},
            "max_salary": {"$max": "$salary_estimate"},
            "count": {"$sum": 1},
        }},
        {"$match": {"_id": {"$ne": None}}},
        {"$project": {
            "seniority": "$_id",
            "avg_salary": {"$round": ["$avg_salary", 0]},
            "median_salary": {"$round": ["$median_salary", 0]},
            "min_salary": 1,
            "max_salary": 1,
            "count": 1,
            "_id": 0,
        }},
        {"$sort": {"count": -1}},
    ]
    by_seniority = await db.jobs.aggregate(by_seniority_pipeline).to_list(length=10)
    
    # By category  
    by_category_pipeline = [
        {"$match": base_match},
        {"$group": {
            "_id": "$category",
            "avg_salary": {"$avg": "$salary_estimate"},
            "median_salary": {"$median": {"input": "$salary_estimate"}},
            "min_salary": {"$min": "$salary_estimate"},
            "max_salary": {"$max": "$salary_estimate"},
            "count": {"$sum": 1},
        }},
        {"$match": {"_id": {"$ne": None}}},
        {"$project": {
            "category": "$_id",
            "avg_salary": {"$round": ["$avg_salary", 0]},
            "median_salary": {"$round": ["$median_salary", 0]},
            "min_salary": 1,
            "max_salary": 1,
            "count": 1,
            "_id": 0,
        }},
        {"$sort": {"avg_salary": -1}},
    ]
    by_category = await db.jobs.aggregate(by_category_pipeline).to_list(length=20)

    return {
        "overall_stats": base_stats,
        "by_seniority": by_seniority,
        "by_category": by_category,
    }


async def get_skill_demand_metrics(top_n: int = 25) -> dict:
    """
    Get detailed skill demand analysis using MongoDB aggregation.
    Keeps correlation analysis from AnalyticsService (requires pandas masking).
    """
    db = get_db()
    
    # Skill demand via MongoDB aggregation
    skills_pipeline = [
        {"$match": {"normalized_skills": {"$exists": True, "$ne": []}}},
        {"$unwind": "$normalized_skills"},
        {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": top_n},
        {"$project": {"skill": "$_id", "count": 1, "_id": 0}},
    ]
    demand = await db.jobs.aggregate(skills_pipeline).to_list(length=top_n)
    
    # Calculate demand percentage
    total_jobs = await db.jobs.count_documents({"normalized_skills": {"$exists": True, "$ne": []}})
    demand = [
        {
            **d,
            "demand_percentage": (d["count"] / total_jobs * 100) if total_jobs > 0 else 0,
            "demand_rank": i + 1,
        } 
        for i, d in enumerate(demand)
    ]
    
    # Skill-salary correlation (requires pandas masking logic - keep from AnalyticsService)
    analytics = AnalyticsService()
    salary_correlation = await analytics.get_skill_salary_correlation(top_skills=15)

    return {
        "top_skills": demand,
        "skill_salary_correlation": salary_correlation,
    }


async def get_posting_trends_analysis(days: int = 90) -> dict:
    """
    Get job posting trends using MongoDB aggregation.
    Replaced pandas time-series analysis with aggregation pipelines.
    """
    db = get_db()
    
    trends_pipeline = [
        {"$match": {"posted_date": {"$ne": None}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$posted_date"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {"month": "$_id", "count": 1, "_id": 0}},
    ]
    trends = await db.jobs.aggregate(trends_pipeline).to_list(length=100)
    
    total_jobs = await db.jobs.count_documents({})

    return {
        "daily_trends": trends,
        "total_jobs": total_jobs,
        "analysis_period_days": days,
    }


async def get_company_analytics(top_n: int = 20) -> dict:
    """
    Get company hiring patterns using MongoDB aggregation.
    Replaced pandas groupby with efficient aggregation pipelines.
    """
    db = get_db()
    
    company_pipeline = [
        {"$group": {
            "_id": "$company",
            "job_postings": {"$sum": 1},
            "avg_salary": {"$avg": "$salary_estimate"},
            "median_salary": {"$median": {"input": "$salary_estimate"}},
            "min_salary": {"$min": "$salary_estimate"},
            "max_salary": {"$max": "$salary_estimate"},
            "primary_category": {"$first": "$category"},
            "primary_seniority": {"$first": "$seniority"},
        }},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"job_postings": -1}},
        {"$limit": top_n},
        {"$project": {
            "company": "$_id",
            "job_postings": 1,
            "avg_salary": {"$round": ["$avg_salary", 0]},
            "median_salary": {"$round": ["$median_salary", 0]},
            "salary_range": {
                "min": {"$round": ["$min_salary", 0]},
                "max": {"$round": ["$max_salary", 0]},
            },
            "primary_category": 1,
            "primary_seniority": 1,
            "_id": 0,
        }},
    ]
    
    companies = await db.jobs.aggregate(company_pipeline).to_list(length=top_n)
    
    return {
        "top_companies": companies,
    }


async def get_full_analytics_dashboard() -> dict:
    """
    Get comprehensive analytics dashboard combining all efficient aggregation pipelines.
    Replaces all pandas-based calculations with MongoDB aggregation for better performance.
    """
    db = get_db()
    
    # Get all aggregations in parallel for efficiency
    dashboard = await get_dashboard()  # Already optimized with aggregations
    skill_metrics = await get_skill_demand_metrics(top_n=20)
    
    return {
        "dashboard": dashboard,
        "skill_analysis": skill_metrics,
    }


_SENIORITY_RANK = {"junior": 0, "mid": 1, "senior": 2, "lead": 3}


def _salary_base_match(location: Optional[str]) -> dict:
    m: dict = {"salary_estimate": {"$gt": 0}}
    if location:
        m["location"] = {"$regex": location, "$options": "i"}
    return m


async def _avg_salary_group_by(db, match_stage: dict, field: str) -> list[dict]:
    pipe = [
        {"$match": match_stage},
        {"$group": {
            "_id": f"${field}",
            "avg_salary": {"$avg": "$salary_estimate"},
            "count": {"$sum": 1},
        }},
        {"$match": {"_id": {"$ne": None}}},
        {"$project": {
            field: "$_id",
            "avg_salary": {"$round": ["$avg_salary", 0]},
            "count": 1,
            "_id": 0,
        }},
    ]
    return await db.jobs.aggregate(pipe).to_list(length=80)


def _sort_by_seniority_order(rows: list[dict]) -> list[dict]:
    def rank(r: dict) -> int:
        s = str(r.get("seniority") or "").lower()
        return _SENIORITY_RANK.get(s, 50)

    return sorted(rows, key=rank)


# ---------------------------------------------------------------------------
# Salary Intelligence
# ---------------------------------------------------------------------------

async def get_salary_intelligence(
    category: Optional[str] = None,
    seniority: Optional[str] = None,
    location: Optional[str] = None,
) -> dict:
    """Salary distribution with percentiles and category-aware role comparisons."""
    db = get_db()

    base = _salary_base_match(location)
    match: dict = {**base}
    if category:
        match["category"] = category
    if seniority:
        match["seniority"] = seniority

    pipeline = [
        {"$match": match},
        {"$project": {"salary_estimate": 1, "category": 1, "seniority": 1}},
        {"$sort": {"salary_estimate": 1}},
    ]
    docs = await db.jobs.aggregate(pipeline).to_list(length=10000)
    salaries = [d["salary_estimate"] for d in docs if d.get("salary_estimate")]

    empty_extras = {
        "role_comparisons": [],
        "comparison_title": "",
        "comparison_subtitle": "",
        "comparison_mode": "none",
    }

    if not salaries:
        return {
            "percentiles": {"p25": 0, "p50": 0, "p75": 0, "p90": 0},
            "distribution": [],
            "count": 0,
            "avg": 0,
            **empty_extras,
        }

    salaries.sort()
    n = len(salaries)

    def percentile(p: float) -> int:
        # Linear interpolation avoids overly coarse percentile jumps.
        pos = (p / 100) * (n - 1)
        lower_idx = int(pos)
        upper_idx = min(lower_idx + 1, n - 1)
        if lower_idx == upper_idx:
            return round(salaries[lower_idx])
        weight_upper = pos - lower_idx
        weight_lower = 1 - weight_upper
        interpolated = salaries[lower_idx] * weight_lower + salaries[upper_idx] * weight_upper
        return round(interpolated)

    p25, p50, p75, p90 = percentile(25), percentile(50), percentile(75), percentile(90)

    bucket_size = max((salaries[-1] - salaries[0]) // 8, 1000)
    buckets: Counter = Counter()
    for s in salaries:
        bucket = int(s // bucket_size) * bucket_size
        buckets[bucket] += 1
    distribution = [
        {"range_start": k, "range_end": k + bucket_size, "count": v}
        for k, v in sorted(buckets.items())
    ]

    # Role comparisons depend on which filters are active (same location on all branches).
    role_comparisons: list[dict] = []
    comparison_title = ""
    comparison_subtitle = ""
    comparison_mode = ""

    if category and not seniority:
        comp_match = {**base, "category": category, "seniority": {"$ne": None}}
        raw = await _avg_salary_group_by(db, comp_match, "seniority")
        raw = _sort_by_seniority_order(raw)
        for r in raw:
            s = r.get("seniority") or "unknown"
            label = str(s).replace("_", " ").strip().title()
            role_comparisons.append({
                "label": label,
                "category": category,
                "seniority": s,
                "avg_salary": r["avg_salary"],
                "count": r["count"],
            })
        comparison_title = f"Seniority ladder — {category}"
        comparison_subtitle = (
            "Average pay at each level inside this category. "
            "Use it to see how compensation climbs from junior to lead."
        )
        comparison_mode = "seniority_within_category"

    elif seniority:
        comp_match = {**base, "seniority": seniority, "category": {"$ne": None}}
        raw = await _avg_salary_group_by(db, comp_match, "category")
        raw.sort(key=lambda x: x["avg_salary"], reverse=True)
        for r in raw:
            cat = r["category"]
            role_comparisons.append({
                "label": cat,
                "category": cat,
                "seniority": seniority,
                "avg_salary": r["avg_salary"],
                "count": r["count"],
            })
        if category:
            comparison_title = f"Same seniority ({seniority}), other categories"
            comparison_subtitle = (
                f"Benchmark {category} against other role types at the {seniority} level."
            )
        else:
            comparison_title = f"Categories at {seniority} level"
            comparison_subtitle = (
                "Average salary by category for this seniority. "
                "Helps compare pay across role types."
            )
        comparison_mode = "category_at_seniority"

    else:
        comp_match = {**base, "category": {"$ne": None}}
        raw = await _avg_salary_group_by(db, comp_match, "category")
        raw.sort(key=lambda x: x["avg_salary"], reverse=True)
        for r in raw:
            cat = r["category"]
            role_comparisons.append({
                "label": cat,
                "category": cat,
                "seniority": None,
                "avg_salary": r["avg_salary"],
                "count": r["count"],
            })
        comparison_title = "Market by category"
        comparison_subtitle = (
            "Average salary by role category across all seniority levels in the filtered data."
        )
        comparison_mode = "category_market_overview"

    return {
        "percentiles": {"p25": p25, "p50": p50, "p75": p75, "p90": p90},
        "distribution": distribution,
        "role_comparisons": role_comparisons,
        "comparison_title": comparison_title,
        "comparison_subtitle": comparison_subtitle,
        "comparison_mode": comparison_mode,
        "count": n,
        "avg": round(sum(salaries) / n),
    }
