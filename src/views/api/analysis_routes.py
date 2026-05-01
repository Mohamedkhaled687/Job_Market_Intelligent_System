from fastapi import APIRouter
from typing import List
from src.services.analysis_service import SalaryRegressionService, JobClassificationService
from src.services.clustering_service import SkillClusteringService

router = APIRouter(prefix="/api/analysis", tags=["Advanced Data Analysis"])

@router.get("/regression/salary")
async def get_salary_regression():
    return await SalaryRegressionService.predict_salary_by_skill_count()

@router.get("/classification/accuracy")
async def get_classification_accuracy(target: str = "category"):
    return await JobClassificationService.get_model_accuracy(target)

@router.post("/classification/predict")
async def predict_category(skills: List[str]):
    return await JobClassificationService.predict_job_category(skills)
