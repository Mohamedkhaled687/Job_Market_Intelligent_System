import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from src.models.database import get_db


class AnalyticsService:
    """Service for performing data analysis on job market data using pandas and numpy"""

    def __init__(self):
        self.db = get_db()

    async def get_job_dataframe(
        self,
        category: Optional[str] = None,
        seniority: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Fetch job data and convert to pandas DataFrame for analysis

        Args:
            category: Filter by job category
            seniority: Filter by seniority level
            limit: Maximum number of documents to fetch

        Returns:
            DataFrame with job data
        """
        query = {}
        if category:
            query["category"] = category
        if seniority:
            query["seniority"] = seniority

        cursor = self.db.jobs.find(query)
        if limit:
            cursor = cursor.limit(limit)

        jobs = await cursor.to_list(length=limit or 10000)

        df = pd.DataFrame(jobs)
        if len(df) > 0:
            # Convert MongoDB ObjectIds to strings
            if "_id" in df.columns:
                df["_id"] = df["_id"].astype(str)
            # Ensure datetime columns are properly typed
            if "posted_date" in df.columns:
                df["posted_date"] = pd.to_datetime(
                    df["posted_date"], errors="coerce")
            if "scraped_at" in df.columns:
                df["scraped_at"] = pd.to_datetime(
                    df["scraped_at"], errors="coerce")

        return df

    async def get_salary_statistics(
        self, category: Optional[str] = None, seniority: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive salary statistics

        Returns:
            Dictionary with salary stats (mean, median, std, quartiles, etc.)
        """
        df = await self.get_job_dataframe(category=category, seniority=seniority)

        if "salary_estimate" not in df.columns or df.empty:
            return {
                "mean": None,
                "median": None,
                "std": None,
                "min": None,
                "max": None,
                "q25": None,
                "q50": None,
                "q75": None,
                "count": 0,
            }

        salary_data = df["salary_estimate"].dropna()

        if len(salary_data) == 0:
            return {
                "mean": None,
                "median": None,
                "std": None,
                "min": None,
                "max": None,
                "q25": None,
                "q50": None,
                "q75": None,
                "count": 0,
            }

        return {
            "mean": float(np.mean(salary_data)),
            "median": float(np.median(salary_data)),
            "std": float(np.std(salary_data)),
            "min": float(np.min(salary_data)),
            "max": float(np.max(salary_data)),
            "q25": float(np.percentile(salary_data, 25)),
            "q50": float(np.percentile(salary_data, 50)),
            "q75": float(np.percentile(salary_data, 75)),
            "count": int(len(salary_data)),
        }

    async def get_salary_by_seniority(self) -> List[Dict[str, Any]]:
        """
        Analyze salary distribution by seniority level

        Returns:
            List of dictionaries with seniority level and salary stats
        """
        df = await self.get_job_dataframe()

        if df.empty or "salary_estimate" not in df.columns or "seniority" not in df.columns:
            return []

        salary_by_seniority = []
        for seniority in df["seniority"].dropna().unique():
            salary_data = df[df["seniority"] ==
                             seniority]["salary_estimate"].dropna()
            if len(salary_data) > 0:
                salary_by_seniority.append({
                    "seniority": str(seniority),
                    "count": int(len(salary_data)),
                    "avg_salary": float(np.mean(salary_data)),
                    "median_salary": float(np.median(salary_data)),
                    "min_salary": float(np.min(salary_data)),
                    "max_salary": float(np.max(salary_data)),
                    "std_salary": float(np.std(salary_data)),
                })

        return sorted(salary_by_seniority, key=lambda x: x["count"], reverse=True)

    async def get_salary_by_category(self) -> List[Dict[str, Any]]:
        """
        Analyze salary distribution by job category

        Returns:
            List of dictionaries with category and salary stats
        """
        df = await self.get_job_dataframe()

        if df.empty or "salary_estimate" not in df.columns or "category" not in df.columns:
            return []

        salary_by_category = []
        for category in df["category"].dropna().unique():
            salary_data = df[df["category"] ==
                             category]["salary_estimate"].dropna()
            if len(salary_data) > 0:
                salary_by_category.append({
                    "category": str(category),
                    "count": int(len(salary_data)),
                    "avg_salary": float(np.mean(salary_data)),
                    "median_salary": float(np.median(salary_data)),
                    "min_salary": float(np.min(salary_data)),
                    "max_salary": float(np.max(salary_data)),
                    "std_salary": float(np.std(salary_data)),
                })

        return sorted(salary_by_category, key=lambda x: x["avg_salary"], reverse=True)

    async def get_skill_demand_analysis(self, top_n: int = 25) -> List[Dict[str, Any]]:
        """
        Analyze skill demand with statistical metrics

        Args:
            top_n: Number of top skills to return

        Returns:
            List of skills with demand metrics
        """
        df = await self.get_job_dataframe()

        if df.empty or "normalized_skills" not in df.columns:
            return []

        # Flatten all skills
        all_skills = []
        for skills in df["normalized_skills"].dropna():
            if isinstance(skills, list):
                all_skills.extend(skills)

        if not all_skills:
            return []

        # Count skill frequencies
        skill_counts = pd.Series(all_skills).value_counts()

        # Calculate skill statistics
        total_jobs = len(df)
        skill_analysis = []
        for skill, count in skill_counts.head(top_n).items():
            skill_analysis.append({
                "skill": str(skill),
                "demand_count": int(count),
                "demand_percentage": float((count / total_jobs) * 100),
                "demand_rank": len(skill_analysis) + 1,
            })

        return skill_analysis

    async def get_skill_salary_correlation(self, top_skills: int = 15) -> List[Dict[str, Any]]:
        """
        Analyze correlation between skills and salary

        Args:
            top_skills: Number of top skills to analyze

        Returns:
            List of skills with average salary for jobs requiring them
        """
        df = await self.get_job_dataframe()

        if df.empty or "normalized_skills" not in df.columns or "salary_estimate" not in df.columns:
            return []

        # Get top skills
        all_skills = []
        for skills in df["normalized_skills"].dropna():
            if isinstance(skills, list):
                all_skills.extend(skills)

        if not all_skills:
            return []

        skill_counts = pd.Series(all_skills).value_counts()
        top_skill_list = skill_counts.head(top_skills).index.tolist()

        skill_salary = []
        for skill in top_skill_list:
            # Find all jobs with this skill
            mask = df["normalized_skills"].apply(
                lambda x: isinstance(x, list) and skill in x
            )
            salary_data = df[mask &
                             df["salary_estimate"].notna()]["salary_estimate"]

            if len(salary_data) > 0:
                skill_salary.append({
                    "skill": str(skill),
                    "job_count": int(mask.sum()),
                    "avg_salary": float(np.mean(salary_data)),
                    "median_salary": float(np.median(salary_data)),
                    "salary_premium": float(np.mean(salary_data) - df["salary_estimate"].mean()) if len(df["salary_estimate"].dropna()) > 0 else 0,
                })

        return sorted(skill_salary, key=lambda x: x["avg_salary"], reverse=True)

    async def get_job_posting_trends(self, days: int = 90) -> List[Dict[str, Any]]:
        """
        Analyze job posting trends over time

        Args:
            days: Number of days to analyze

        Returns:
            List of daily job posting counts
        """
        df = await self.get_job_dataframe()

        if df.empty or "posted_date" not in df.columns:
            return []

        df["posted_date"] = pd.to_datetime(df["posted_date"], errors="coerce")
        df_clean = df.dropna(subset=["posted_date"])

        if len(df_clean) == 0:
            return []

        # Filter to last N days
        cutoff_date = df_clean["posted_date"].max() - timedelta(days=days)
        df_recent = df_clean[df_clean["posted_date"] >= cutoff_date]

        # Group by date
        daily_trends = df_recent.groupby(
            df_recent["posted_date"].dt.date).size().reset_index()
        daily_trends.columns = ["date", "count"]

        # Convert to list of dicts
        trends = [
            {
                "date": str(row["date"]),
                "count": int(row["count"]),
            }
            for _, row in daily_trends.iterrows()
        ]

        return trends

    async def get_company_insights(self, top_n: int = 20) -> List[Dict[str, Any]]:
        """
        Analyze job postings and hiring patterns by company

        Args:
            top_n: Number of top companies to return

        Returns:
            List of companies with insights
        """
        df = await self.get_job_dataframe()

        if df.empty or "company" not in df.columns:
            return []

        company_groups = df.groupby("company").agg({
            "_id": "count",
            "salary_estimate": ["mean", "median", "min", "max"],
            "category": lambda x: x.value_counts().index[0] if len(x) > 0 else None,
            "seniority": lambda x: x.value_counts().index[0] if len(x) > 0 else None,
        }).round(2)

        company_groups.columns = ["job_count", "avg_salary", "median_salary",
                                  "min_salary", "max_salary", "primary_category", "primary_seniority"]
        company_groups = company_groups.sort_values(
            "job_count", ascending=False).head(top_n)

        company_insights = []
        for company, row in company_groups.iterrows():
            company_insights.append({
                "company": str(company),
                "job_postings": int(row["job_count"]),
                "avg_salary": float(row["avg_salary"]) if pd.notna(row["avg_salary"]) else None,
                "median_salary": float(row["median_salary"]) if pd.notna(row["median_salary"]) else None,
                "salary_range": {
                    "min": float(row["min_salary"]) if pd.notna(row["min_salary"]) else None,
                    "max": float(row["max_salary"]) if pd.notna(row["max_salary"]) else None,
                },
                "primary_category": str(row["primary_category"]) if pd.notna(row["primary_category"]) else None,
                "primary_seniority": str(row["primary_seniority"]) if pd.notna(row["primary_seniority"]) else None,
            })

        return company_insights

    async def get_market_overview(self) -> Dict[str, Any]:
        """
        Get comprehensive market overview

        Returns:
            Dictionary with overall market statistics
        """
        df = await self.get_job_dataframe()

        if df.empty:
            return {
                "total_jobs": 0,
                "total_companies": 0,
                "total_unique_skills": 0,
                "salary_stats": {},
                "category_distribution": [],
                "seniority_distribution": [],
            }

        # Overall statistics
        overview = {
            "total_jobs": int(len(df)),
            "total_companies": int(df["company"].nunique()) if "company" in df.columns else 0,
            "total_unique_skills": 0,
            "salary_stats": await self.get_salary_statistics(),
        }

        # Category distribution
        if "category" in df.columns:
            category_dist = df["category"].value_counts().to_dict()
            overview["category_distribution"] = [
                {"category": str(k), "count": int(
                    v), "percentage": float((v / len(df)) * 100)}
                for k, v in category_dist.items()
            ]

        # Seniority distribution
        if "seniority" in df.columns:
            seniority_dist = df["seniority"].value_counts().to_dict()
            overview["seniority_distribution"] = [
                {"seniority": str(k), "count": int(
                    v), "percentage": float((v / len(df)) * 100)}
                for k, v in seniority_dist.items()
            ]

        # Unique skills count
        if "normalized_skills" in df.columns:
            all_skills = set()
            for skills in df["normalized_skills"].dropna():
                if isinstance(skills, list):
                    all_skills.update(skills)
            overview["total_unique_skills"] = len(all_skills)

        return overview

    async def get_correlation_matrix(self) -> Dict[str, Any]:
        """
        Calculate correlation matrix for numerical features

        Returns:
            Correlation matrix as dictionary
        """
        df = await self.get_job_dataframe()

        if df.empty:
            return {}

        # Select numerical columns
        numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        if not numerical_cols:
            return {"message": "No numerical columns found for correlation analysis"}

        # Calculate correlation matrix
        corr_matrix = df[numerical_cols].corr()

        # Convert to dictionary format
        return corr_matrix.to_dict()
