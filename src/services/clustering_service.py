"""
Clustering and Big Data Analysis Service
Implements skill-based clustering and company hiring pattern analysis
"""

import logging
from typing import Optional, List, Dict, Any
from collections import defaultdict, Counter
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from src.models.database import get_db

logger = logging.getLogger(__name__)


class SkillClusteringService:
    """Cluster jobs by required skills using co-occurrence patterns"""

    @staticmethod
    def _normalize_filter_value(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip().lower()
        if not normalized or normalized in {"all", "all categories", "all levels"}:
            return None

        return normalized

    @staticmethod
    async def cluster_jobs_by_skills(
        min_skill_frequency: int = 5,
        category: Optional[str] = None,
        seniority: Optional[str] = None,
    ) -> Dict:
        """
        Cluster jobs based on skill co-occurrence patterns.
        Returns a heatmap-ready matrix of skill combinations.
        """
        logger.info(f"Clustering jobs for category={category}, seniority={seniority}")
        db = get_db()

        category = SkillClusteringService._normalize_filter_value(category)
        seniority = SkillClusteringService._normalize_filter_value(seniority)

        # Build match stage for filtering
        match_stage = {}
        if category:
            match_stage["category"] = category
        if seniority:
            match_stage["seniority"] = seniority

        # Get all jobs with their skills
        pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {
                "$project": {
                    "_id": 1,
                    "normalized_skills": 1,
                    "job_title": 1,
                    "company": 1,
                    "category": 1,
                }
            },
        ]

        jobs = await db.jobs.aggregate(pipeline).to_list(length=None)

        if not jobs:
            return {
                "skills": [],
                "heatmap": [],
                "clusters": [],
                "job_count": 0,
                "unique_skill_count": 0,
                "message": "No jobs found for the selected filters"
            }

        # Extract top skills
        all_skills = []
        job_skills = []

        for job in jobs:
            skills = job.get("normalized_skills") or []
            job_skills.append(skills)
            all_skills.extend(skills)

        # Filter skills by frequency
        skill_counts = Counter(all_skills)
        top_skills = [
            skill
            for skill, count in skill_counts.most_common(30)
            if count >= min_skill_frequency
        ]

        if not top_skills:
            return {
                "skills": [],
                "heatmap": [],
                "clusters": [],
                "job_count": len(jobs),
                "unique_skill_count": 0,
                "message": f"Not enough skills to cluster (minimum {min_skill_frequency} occurrences required)"
            }

        # Build co-occurrence matrix (skill-to-skill relationships)
        co_occurrence = defaultdict(lambda: defaultdict(int))

        for skills in job_skills:
            filtered_skills = [s for s in skills if s in top_skills]
            for i, skill1 in enumerate(filtered_skills):
                for skill2 in filtered_skills[i + 1 :]:
                    co_occurrence[skill1][skill2] += 1
                    co_occurrence[skill2][skill1] += 1

        # Create heatmap matrix
        heatmap_matrix = []
        for skill1 in top_skills:
            row = []
            for skill2 in top_skills:
                count = co_occurrence[skill1].get(skill2, 0)
                row.append(count)
            heatmap_matrix.append(row)

        # Identify skill clusters using simple clustering
        clusters = SkillClusteringService._identify_clusters(
            top_skills, co_occurrence, heatmap_matrix
        )

        return {
            "skills": top_skills,
            "heatmap": heatmap_matrix,
            "clusters": clusters,
            "job_count": len(jobs),
            "unique_skill_count": len(top_skills),
        }

    @staticmethod
    def _identify_clusters(
        skills: List[str], co_occurrence: Dict, heatmap: List[List[int]]
    ) -> List[Dict]:
        """
        Identify skill clusters based on co-occurrence strength.
        Groups similar skills together.
        """
        clusters = []
        visited = set()

        for i, skill in enumerate(skills):
            if skill in visited:
                continue

            # Start a new cluster with this skill
            cluster = {"name": skill, "skills": [skill], "strength": 0}
            visited.add(skill)

            # Find strongly related skills
            for j, other_skill in enumerate(skills):
                if other_skill not in visited:
                    co_count = heatmap[i][j]
                    if co_count > 3:  # Threshold for similarity
                        cluster["skills"].append(other_skill)
                        cluster["strength"] += co_count
                        visited.add(other_skill)

            if len(cluster["skills"]) > 1:
                clusters.append(cluster)

        # Sort by strength
        clusters.sort(key=lambda x: x["strength"], reverse=True)
        return clusters[:10]  # Return top 10 clusters

    @staticmethod
    async def get_elbow_data(max_k: int = 10) -> Dict:
        """
        Calculate WSS (Within-Cluster Sum of Squares) for different K values
        to help identify the 'elbow' point.
        """
        db = get_db()
        jobs = await db.jobs.find({}, {"normalized_skills": 1}).to_list(length=1000)
        
        if not jobs:
            return {"error": "No jobs found"}

        job_texts = [" ".join(job.get("normalized_skills", [])) for job in jobs if job.get("normalized_skills")]
        if not job_texts:
            return {"error": "No jobs with skills found"}

        vectorizer = TfidfVectorizer(max_features=100)
        X = vectorizer.fit_transform(job_texts).toarray()

        elbow_data = []
        for k in range(2, max_k + 1):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(X)
            elbow_data.append({
                "k": k,
                "wss": float(kmeans.inertia_)
            })

        return {"elbow_data": elbow_data}

    @staticmethod
    async def cluster_jobs_kmeans(k: int = 5) -> Dict:
        """
        Enhanced K-Means Clustering implementation.
        Includes Silhouette scores and PCA for visualization.
        """
        from sklearn.metrics import silhouette_score
        from sklearn.decomposition import PCA

        db = get_db()
        jobs = await db.jobs.find({}, {"normalized_skills": 1, "job_title": 1, "company": 1, "category": 1}).to_list(length=1000)
        
        if not jobs:
            return {"error": "No jobs found"}

        # Prepare data
        valid_jobs = [j for j in jobs if j.get("normalized_skills")]
        job_texts = [" ".join(j.get("normalized_skills", [])) for j in valid_jobs]
        
        if not job_texts:
            return {"error": "Insufficient data with skills"}

        # Vectorize
        vectorizer = TfidfVectorizer(max_features=100)
        X = vectorizer.fit_transform(job_texts).toarray()

        # Apply K-Means
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X)
        
        # Calculate Silhouette Score
        sil_score = silhouette_score(X, kmeans.labels_)

        # Dimensionality Reduction for Visualization (PCA to 2D)
        pca = PCA(n_components=2)
        X_2d = pca.fit_transform(X)

        # Group jobs by cluster
        clusters = defaultdict(list)
        plot_points = []

        for idx, label in enumerate(kmeans.labels_):
            job = valid_jobs[idx]
            cluster_id = int(label)
            
            job_data = {
                "title": job.get("job_title"),
                "company": job.get("company"),
                "skills": job.get("normalized_skills"),
                "category": job.get("category"),
                "x": float(X_2d[idx][0]),
                "y": float(X_2d[idx][1])
            }
            
            clusters[cluster_id].append(job_data)
            plot_points.append({**job_data, "cluster": cluster_id})

        # Get top skills and descriptive names per cluster
        cluster_summaries = []
        for i in range(k):
            cluster_jobs = clusters[i]
            all_cluster_skills = []
            for j in cluster_jobs:
                all_cluster_skills.extend(j["skills"] or [])
            
            top_skills_counts = Counter(all_cluster_skills).most_common(5)
            top_skills = [s[0] for s in top_skills_counts]
            
            # Generate a cluster name from top skills
            cluster_name = " & ".join([s.title() for s in top_skills[:2]]) + " Experts"
            
            cluster_summaries.append({
                "cluster_id": i,
                "name": cluster_name,
                "count": len(cluster_jobs),
                "top_skills": top_skills,
                "sample_jobs": cluster_jobs[:5]
            })

        return {
            "k": k,
            "wss": float(kmeans.inertia_),
            "silhouette_score": float(sil_score),
            "clusters": cluster_summaries,
            "plot_points": plot_points[:200]  # Return limited points for frontend performance
        }



class CompanyHiringAnalysisService:
    """Analyze company hiring patterns and trends"""

    @staticmethod
    async def get_company_hiring_patterns() -> Dict:
        """
        Analyze hiring patterns:
        - Top hiring companies
        - Skills preferred by each company
        - Average salary by company
        - Job categories per company
        """
        db = get_db()

        # Pipeline to get company stats
        pipeline = [
            {
                "$group": {
                    "_id": "$company",
                    "total_jobs": {"$sum": 1},
                    "avg_salary": {"$avg": "$salary_estimate"},
                    "categories": {"$push": "$category"},
                    "skills": {"$push": "$normalized_skills"},
                    "seniority_levels": {"$push": "$seniority"},
                }
            },
            {"$sort": {"total_jobs": -1}},
            {"$limit": 50},
        ]

        companies = await db.jobs.aggregate(pipeline).to_list(length=50)

        company_patterns = []

        for company in companies:
            company_name = company["_id"]

            # Get top skills for this company
            all_skills = []
            for skills_list in company.get("skills", []):
                if skills_list:
                    all_skills.extend(skills_list)

            top_skills = Counter(all_skills).most_common(5)

            # Get category distribution
            categories = company.get("categories", [])
            category_dist = Counter(c for c in categories if c).most_common(3)

            # Get seniority distribution
            seniorities = company.get("seniority_levels", [])
            seniority_dist = Counter(s for s in seniorities if s).most_common(3)

            pattern = {
                "company": company_name,
                "total_jobs": company["total_jobs"],
                "avg_salary": round(company.get("avg_salary") or 0, 2),
                "top_skills": [
                    {"skill": skill, "count": count}
                    for skill, count in top_skills
                ],
                "categories": [
                    {"category": cat, "count": count}
                    for cat, count in category_dist
                ],
                "seniority_distribution": [
                    {"level": level, "count": count}
                    for level, count in seniority_dist
                ],
            }

            company_patterns.append(pattern)

        return {
            "companies": company_patterns,
            "total_companies_analyzed": len(company_patterns),
        }

    @staticmethod
    async def get_skill_demand_by_company() -> Dict:
        """
        Create a matrix: Companies vs Top Skills
        Shows skill demand heatmap by company
        """
        db = get_db()

        # Get top companies
        top_companies_pipeline = [
            {
                "$group": {
                    "_id": "$company",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 15},
        ]

        top_companies = await db.jobs.aggregate(top_companies_pipeline).to_list(
            length=15
        )
        company_names = [c["_id"] for c in top_companies]

        # Get top skills overall
        top_skills_pipeline = [
            {"$unwind": "$normalized_skills"},
            {"$group": {"_id": "$normalized_skills", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 15},
        ]

        top_skills_data = await db.jobs.aggregate(top_skills_pipeline).to_list(
            length=15
        )
        top_skills = [s["_id"] for s in top_skills_data]

        # Build company-skill matrix
        heatmap_data = []

        for company in company_names:
            row = []
            for skill in top_skills:
                # Count jobs in this company that require this skill
                count = await db.jobs.count_documents(
                    {
                        "company": company,
                        "normalized_skills": skill,
                    }
                )
                row.append(count)

            heatmap_data.append(
                {
                    "company": company,
                    "skill_counts": row,
                }
            )

        return {
            "companies": company_names,
            "skills": top_skills,
            "heatmap": heatmap_data,
        }

    @staticmethod
    async def get_hiring_trends_by_category() -> Dict:
        """
        Analyze hiring trends across job categories
        """
        db = get_db()

        pipeline = [
            {
                "$group": {
                    "_id": "$category",
                    "total_jobs": {"$sum": 1},
                    "avg_salary": {"$avg": "$salary_estimate"},
                    "companies": {"$push": "$company"},
                    "seniority": {"$push": "$seniority"},
                }
            },
            {"$sort": {"total_jobs": -1}},
        ]

        categories = await db.jobs.aggregate(pipeline).to_list(length=None)

        trends = []
        for cat in categories:
            category_name = cat["_id"]

            # Unique companies hiring in this category
            unique_companies = len(set(c for c in cat.get("companies", []) if c))

            # Seniority breakdown
            seniorities = cat.get("seniority", [])
            seniority_breakdown = Counter(
                s for s in seniorities if s
            ).most_common(3)

            trend = {
                "category": category_name,
                "total_jobs": cat["total_jobs"],
                "avg_salary": round(cat.get("avg_salary") or 0, 2),
                "unique_companies": unique_companies,
                "seniority_breakdown": [
                    {"level": level, "count": count}
                    for level, count in seniority_breakdown
                ],
            }

            trends.append(trend)

        return {
            "category_trends": trends,
            "total_categories": len(trends),
        }
