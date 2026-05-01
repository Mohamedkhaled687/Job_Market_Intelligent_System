"""
Data Analysis Service
Implements Regression and Classification Analysis.
"""

import numpy as np
from typing import Dict, List, Any, Optional
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from src.models.database import get_db


class SalaryRegressionService:
    """
    Implements Linear Regression for Salary Prediction.
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
    async def compare_classifiers(target_field: str = "category") -> Dict:
        """
        Compares different classifiers: Logistic Regression, SVM, KNN, Decision Tree, Random Forest, Naive Bayes.
        """
        db = get_db()
        jobs = await db.jobs.find(
            {target_field: {"$ne": None}, "normalized_skills": {"$ne": None}},
            {target_field: 1, "normalized_skills": 1}
        ).to_list(length=1000)

        if len(jobs) < 50:
            return {"error": "Insufficient data for classification comparison"}

        # Vectorize skills
        job_texts = [" ".join(job.get("normalized_skills", [])) for job in jobs]
        vectorizer = TfidfVectorizer(max_features=100)
        X = vectorizer.fit_transform(job_texts).toarray()

        # Encode target
        le = LabelEncoder()
        y = le.fit_transform([job.get(target_field) for job in jobs])

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        results = {}

        # 1. Logistic Regression
        lr = LogisticRegression(max_iter=1000)
        lr.fit(X_train, y_train)
        results["Logistic Regression"] = lr.score(X_test, y_test)

        # 2. Support Vector Machines (SVM)
        svm = SVC()
        svm.fit(X_train, y_train)
        results["SVM"] = svm.score(X_test, y_test)

        # 3. K-Nearest Neighbors (KNN)
        knn = KNeighborsClassifier(n_neighbors=5)
        knn.fit(X_train, y_train)
        results["KNN"] = knn.score(X_test, y_test)

        # 4. Decision Tree
        dt = DecisionTreeClassifier()
        dt.fit(X_train, y_train)
        results["Decision Tree"] = dt.score(X_test, y_test)

        # 5. Random Forest
        rf = RandomForestClassifier()
        rf.fit(X_train, y_train)
        results["Random Forest"] = rf.score(X_test, y_test)

        # 6. Naive Bayes
        nb = GaussianNB()
        nb.fit(X_train, y_train)
        results["Naive Bayes"] = nb.score(X_test, y_test)

        return {
            "target": target_field,
            "accuracy_comparison": {k: round(v, 4) for k, v in results.items()},
            "best_model": max(results, key=results.get),
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



