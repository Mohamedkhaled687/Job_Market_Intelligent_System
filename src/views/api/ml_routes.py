"""
FastAPI routes for ML model predictions

Endpoints:
  POST /api/ml/predict-salary - Predict job salary
  POST /api/ml/predict-category - Predict job category
  POST /api/ml/predict-all - Predict both salary and category
  GET /api/ml/models/status - Check model status
  GET /api/ml/models/metrics - Get model metrics
"""

import asyncio
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional, Any

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from src.ml.train_models import load_trained_models, train_models
from src.ml.models import ModelEnsemble


router = APIRouter(prefix="/api/ml", tags=["ml"])

# Global model cache
_models_cache: Optional[ModelEnsemble] = None
_metrics_cache: Optional[Dict] = None
MODELS_DIR = Path(__file__).resolve().parents[2] / "ml" / "trained_models"
METRICS_PATH = MODELS_DIR / "metrics.json"

# Shared constants
SENIORITY_MAP = {
    'junior': 0, 'mid': 1, 'mid-level': 1,
    'senior': 2, 'lead': 3, 'manager': 3
}

TOP_SKILLS = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
    'react', 'vue', 'angular', 'django', 'fastapi', 'nodejs', 'express',
    'postgresql', 'mongodb', 'mysql', 'redis', 'elasticsearch',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes',
    'git', 'rest', 'graphql', 'sql', 'html', 'css',
    'bash', 'terraform', 'ansible', 'php', 'swift', 'kotlin', 'flutter',
]


def load_models() -> ModelEnsemble:
    """Load models with caching."""
    global _models_cache
    if _models_cache is None:
        try:
            _models_cache = load_trained_models()
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=str(e))
    return _models_cache


def load_metrics() -> Dict:
    """Load metrics with caching."""
    global _metrics_cache
    if _metrics_cache is None:
        if METRICS_PATH.exists():
            with open(METRICS_PATH, 'r') as f:
                _metrics_cache = json.load(f)
        else:
            _metrics_cache = {}
    return _metrics_cache


# Request schemas
class SalaryPredictionRequest(BaseModel):
    """Request for salary prediction"""
    seniority: str
    skill_count: int
    unique_skills: int
    has_python: int = 0
    has_react: int = 0
    has_aws: int = 0
    has_kubernetes: int = 0
    is_backend: int = 0
    is_frontend: int = 0
    is_devops: int = 0
    company_job_count: int = 1
    days_posted: int = 0


class CategoryPredictionRequest(BaseModel):
    """Request for category prediction"""
    seniority: str
    skill_count: int
    unique_skills: int
    has_python: int = 0
    has_react: int = 0
    has_aws: int = 0
    has_kubernetes: int = 0
    company_job_count: int = 1
    salary_estimate: float = 0
    days_posted: int = 0
    skills: List[str] = []


class CombinedPredictionRequest(BaseModel):
    """Request for both salary and category prediction"""
    seniority: str
    skill_count: int
    unique_skills: int
    has_python: int = 0
    has_react: int = 0
    has_aws: int = 0
    has_kubernetes: int = 0
    is_backend: int = 0
    is_frontend: int = 0
    is_devops: int = 0
    company_job_count: int = 1
    salary_estimate: float = 0
    days_posted: int = 0
    skills: List[str] = []


# Response schemas
class SalaryPredictionResponse(BaseModel):
    """Salary prediction response"""
    predicted_salary: float
    confidence_interval: Dict[str, float]
    model_version: str = "1.0"


class CategoryPredictionResponse(BaseModel):
    """Category prediction response"""
    predicted_category: str
    confidence: float
    top_3_predictions: List[Dict[str, Any]]
    model_version: str = "1.0"


class CombinedPredictionResponse(BaseModel):
    """Combined predictions response"""
    salary: Dict
    category: Dict
    model_version: str = "1.0"


# Routes

@router.post("/predict-salary", response_model=SalaryPredictionResponse)
async def predict_salary(request: SalaryPredictionRequest):
    """Predict job salary based on features."""
    try:
        models = load_models()

        features = {
            'seniority_encoded': SENIORITY_MAP.get(request.seniority.lower(), 1),
            'skill_count': request.skill_count,
            'unique_skills': request.unique_skills,
            'has_python': request.has_python,
            'has_react': request.has_react,
            'has_aws': request.has_aws,
            'has_kubernetes': request.has_kubernetes,
            'is_backend': request.is_backend,
            'is_frontend': request.is_frontend,
            'is_devops': request.is_devops,
            'company_job_count': request.company_job_count,
            'days_posted': request.days_posted,
        }

        X = pd.DataFrame([features])
        prediction = models.salary_model.predict(X)[0]
        margin = prediction * 0.15

        return SalaryPredictionResponse(
            predicted_salary=float(prediction),
            confidence_interval={
                'lower': float(prediction - margin),
                'upper': float(prediction + margin),
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict-category", response_model=CategoryPredictionResponse)
async def predict_category(request: CategoryPredictionRequest):
    """Predict job category based on features and skills."""
    try:
        models = load_models()

        features = {
            'seniority_encoded': SENIORITY_MAP.get(request.seniority.lower(), 1),
            'skill_count': request.skill_count,
            'unique_skills': request.unique_skills,
            'has_python': request.has_python,
            'has_react': request.has_react,
            'has_aws': request.has_aws,
            'has_kubernetes': request.has_kubernetes,
            'company_job_count': request.company_job_count,
            'salary_estimate': request.salary_estimate,
            'days_posted': request.days_posted,
        }

        request_skills_lower = [s.lower() for s in request.skills]
        for skill in TOP_SKILLS:
            features[f'skill_{skill}'] = 1 if skill in request_skills_lower else 0

        X = pd.DataFrame([features])
        predictions = models.category_model.predict(X)[0]
        probabilities = models.category_model.predict_proba(X)[0]

        top_indices = np.argsort(probabilities)[-3:][::-1]
        top_3 = [
            {
                'category': str(models.category_model.classes_[i]),
                'confidence': float(probabilities[i])
            }
            for i in top_indices
        ]

        return CategoryPredictionResponse(
            predicted_category=str(predictions),
            confidence=float(probabilities[np.argmax(probabilities)]),
            top_3_predictions=top_3,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict-all", response_model=CombinedPredictionResponse)
async def predict_all(request: CombinedPredictionRequest):
    """Predict both salary and category for a job."""
    try:
        salary_features = {
            'seniority_encoded': SENIORITY_MAP.get(request.seniority.lower(), 1),
            'skill_count': request.skill_count,
            'unique_skills': request.unique_skills,
            'has_python': request.has_python,
            'has_react': request.has_react,
            'has_aws': request.has_aws,
            'has_kubernetes': request.has_kubernetes,
            'is_backend': request.is_backend,
            'is_frontend': request.is_frontend,
            'is_devops': request.is_devops,
            'company_job_count': request.company_job_count,
            'days_posted': request.days_posted,
        }

        category_features = {**salary_features}
        category_features.pop('is_backend', None)
        category_features.pop('is_frontend', None)
        category_features.pop('is_devops', None)
        category_features['salary_estimate'] = request.salary_estimate

        request_skills_lower = [s.lower() for s in request.skills]
        for skill in TOP_SKILLS:
            category_features[f'skill_{skill}'] = 1 if skill in request_skills_lower else 0

        X_salary = pd.DataFrame([salary_features])
        X_category = pd.DataFrame([category_features])

        models = load_models()

        salary_pred = models.salary_model.predict(X_salary)[0]
        salary_margin = salary_pred * 0.15

        category_pred = models.category_model.predict(X_category)[0]
        category_proba = models.category_model.predict_proba(X_category)[0]

        return CombinedPredictionResponse(
            salary={
                'predicted_salary': float(salary_pred),
                'confidence_interval': {
                    'lower': float(salary_pred - salary_margin),
                    'upper': float(salary_pred + salary_margin),
                }
            },
            category={
                'predicted_category': str(category_pred),
                'confidence': float(np.max(category_proba)),
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/models/status")
async def models_status():
    """Check if models are loaded and ready."""
    try:
        models = load_models()
        return {
            'status': 'ready',
            'salary_model_trained': models.salary_model.is_trained,
            'category_model_trained': models.category_model.is_trained,
        }
    except Exception:
        return {
            'status': 'not_ready',
            'message': 'Models not trained. Run: python -m src.ml.train_models'
        }


@router.get("/models/metrics")
async def models_metrics():
    """Get model performance metrics."""
    try:
        metrics = load_metrics()
        if not metrics:
            raise HTTPException(status_code=404, detail="Metrics not found")
        return metrics
    except Exception:
        raise HTTPException(status_code=503, detail="Models not trained yet")


@router.post("/models/train")
async def train_models_endpoint(background_tasks: BackgroundTasks):
    """Trigger model training in background."""
    background_tasks.add_task(asyncio.run, train_models(limit=10000))
    return {
        'status': 'training_started',
        'message': 'Model training started in background. Check /api/ml/models/status for progress.'
    }


@router.get("/models/info")
async def models_info():
    """Get model information and capabilities."""
    return {
        'salary_model_info': {
            'algorithm': 'XGBoost Regressor',
            'training_samples': None,
            'test_samples': None,
            'input_features': [
                'seniority_encoded',
                'skill_count',
                'unique_skills',
                'has_python',
                'has_react',
                'has_aws',
                'has_kubernetes',
                'is_backend',
                'is_frontend',
                'is_devops',
                'company_job_count',
                'days_posted',
            ],
        },
        'category_model_info': {
            'algorithm': 'XGBoost Classifier',
            'training_samples': None,
            'test_samples': None,
            'input_features': [
                'seniority_encoded',
                'skill_count',
                'unique_skills',
                'has_python',
                'has_react',
                'has_aws',
                'has_kubernetes',
                'company_job_count',
                'salary_estimate',
                'days_posted',
                'skill_*',
            ],
            'categories': ['Backend', 'Frontend', 'DevOps', 'Full-Stack', 'Data'],
        },
        'models': {
            'salary_prediction': {
                'type': 'Regression',
                'algorithm': 'XGBoost',
                'input_features': 11,
                'output': 'Predicted salary with confidence interval',
                'expected_r2': 0.70,
                'expected_rmse': 'varies by market',
            },
            'category_classification': {
                'type': 'Multi-class Classification',
                'algorithm': 'XGBoost',
                'input_features': 40,
                'output': 'Job category with confidence scores',
                'expected_accuracy': 0.88,
                'categories': ['Backend', 'Frontend', 'DevOps', 'Full-Stack', 'Data'],
            }
        },
        'endpoints': {
            'salary': 'POST /api/ml/predict-salary',
            'category': 'POST /api/ml/predict-category',
            'combined': 'POST /api/ml/predict-all',
            'metrics': 'GET /api/ml/models/metrics',
            'status': 'GET /api/ml/models/status',
            'train': 'POST /api/ml/models/train',
        }
    }
