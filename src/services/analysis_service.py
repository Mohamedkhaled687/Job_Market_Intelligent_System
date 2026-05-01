"""
Data Analysis Service
Implements Regression and Classification Analysis as per Lecture 4.
"""

import numpy as np
from typing import Dict, List, Any, Optional
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from src.models.database import get_db


class SalaryRegressionService:
    """
    Implements Linear Regression for Salary Prediction.
    Formula: Y = a0 + a1X + ε
    """

    @staticmethod
    async def predict_salary_by_skill_count() -> Dict:
        """
        Models the relationship between number of skills (X) and Salary (Y).
        """
        db = get_db()
        jobs = await db.jobs.find(
            {"salary_estimate": {"$ne": None}, "normalized_skills": {"$ne": None}},
            {"salary_estimate": 1, "normalized_skills": 1}
        ).to_list(length=1000)

        if not jobs:
            return {"error": "Insufficient data for regression"}

        X = [] # Number of skills
        Y = [] # Salary

        for job in jobs:
            X.append([len(job.get("normalized_skills", []))])
            Y.append(job.get("salary_estimate"))

        X = np.array(X)
        Y = np.array(Y)

        # Train model
        model = LinearRegression()
        model.fit(X, Y)

        # Coefficient (a1) and Intercept (a0)
        a1 = model.coef_[0]
        a0 = model.intercept_
        r_squared = model.score(X, Y)

        # Predict for a few sample skill counts
        predictions = {}
        for count in [3, 5, 10, 15]:
            pred = model.predict([[count]])[0]
            predictions[f"{count}_skills"] = round(float(pred), 2)

        return {
            "algorithm": "Linear Regression",
            "intercept_a0": round(float(a0), 2),
            "coefficient_a1": round(float(a1), 2),
            "r_squared": round(float(r_squared), 4),
            "predictions": predictions,
            "formula": f"Salary = {round(a0, 2)} + {round(a1, 2)} * skill_count"
        }


class JobClassificationService:
    """
    Implements various Classification Analysis techniques.
    """

    @staticmethod
    async def get_model_accuracy(target_field: str = "category") -> Dict:
        """
        Calculates accuracy using Random Forest classifier.
        """
        db = get_db()
        jobs = await db.jobs.find(
            {target_field: {"$ne": None}, "normalized_skills": {"$ne": None}},
            {target_field: 1, "normalized_skills": 1}
        ).to_list(length=1000)

        if len(jobs) < 50:
            return {"error": "Insufficient data for classification"}

        # Vectorize skills
        job_texts = [" ".join(job.get("normalized_skills", [])) for job in jobs]
        vectorizer = TfidfVectorizer(max_features=100)
        X = vectorizer.fit_transform(job_texts).toarray()

        # Encode target
        le = LabelEncoder()
        y = le.fit_transform([job.get(target_field) for job in jobs])

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Random Forest
        rf = RandomForestClassifier()
        rf.fit(X_train, y_train)
        accuracy = rf.score(X_test, y_test)

        return {
            "target": target_field,
            "model": "Random Forest",
            "accuracy": round(accuracy, 4),
            "sample_size": len(jobs)
        }

    @staticmethod
    async def predict_job_category(skills: List[str]) -> Dict:
        """
        Predict job category using the best classifier (Random Forest).
        """
        db = get_db()
        jobs = await db.jobs.find(
            {"category": {"$ne": None}, "normalized_skills": {"$ne": None}},
            {"category": 1, "normalized_skills": 1}
        ).to_list(length=2000)

        job_texts = [" ".join(job.get("normalized_skills", [])) for job in jobs]
        vectorizer = TfidfVectorizer(max_features=200)
        X = vectorizer.fit_transform(job_texts).toarray()

        le = LabelEncoder()
        y = le.fit_transform([job.get("category") for job in jobs])

        model = RandomForestClassifier()
        model.fit(X, y)

        input_text = " ".join(skills)
        input_vector = vectorizer.transform([input_text]).toarray()
        prediction_idx = model.predict(input_vector)[0]
        category = le.inverse_transform([prediction_idx])[0]

        return {
            "predicted_category": category,
            "input_skills": skills
        }



