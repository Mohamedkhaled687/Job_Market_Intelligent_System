import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any

from src.models.database import get_db


class AnalyticsService:
    """
    Service for advanced statistical analysis on job market data using pandas and numpy.
    
    NOTE: This service is now focused on complex statistical operations and correlation analysis.
    Aggregation-based queries (salary stats, skill demand, market overview) should use
    analytics_controller.py MongoDB aggregation pipelines for better performance.
    """

    def __init__(self):
        self.db = get_db()

    async def get_job_dataframe(
        self,
        limit: Optional[int] = 5000,
    ) -> pd.DataFrame:
        """
        Fetch job data and convert to pandas DataFrame for statistical analysis.
        
        WARNING: This loads data into memory. For aggregation queries, use MongoDB pipelines
        in analytics_controller instead.

        Args:
            limit: Maximum number of documents to fetch (default 5000 to prevent memory issues)

        Returns:
            DataFrame with job data
        """
        cursor = self.db.jobs.find({}).limit(limit or 5000)
        jobs = await cursor.to_list(length=limit or 5000)

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

    async def get_skill_salary_correlation(self, top_skills: int = 15) -> List[Dict[str, Any]]:
        """
        RETAINED: Complex correlation analysis using pandas masking logic.
        Analyze correlation between skills and salary with advanced filtering.

        Args:
            top_skills: Number of top skills to analyze

        Returns:
            List of skills with average salary for jobs requiring them, sorted by salary
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
        overall_mean = df["salary_estimate"].dropna().mean() if len(df["salary_estimate"].dropna()) > 0 else 0
        
        for skill in top_skill_list:
            # Complex masking logic - this justifies pandas over MongoDB
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
                    "salary_premium": float(np.mean(salary_data) - overall_mean),
                })

        return sorted(skill_salary, key=lambda x: x["avg_salary"], reverse=True)

    async def get_correlation_matrix(self) -> Dict[str, Any]:
        """
        RETAINED: Calculate correlation matrix for numerical features.
        This is complex statistical analysis best done with pandas.

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
