from typing import Optional

from src.models.database import get_db


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

    from collections import Counter
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
