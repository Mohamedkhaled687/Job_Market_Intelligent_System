from fastapi import APIRouter, HTTPException
from typing import List, Optional
from src.services.analysis_service import SalaryRegressionService, JobClassificationService
from src.services.clustering_service import SkillClusteringService
from src.services.nlp_service import NLPService

router = APIRouter(prefix="/api/analysis", tags=["Advanced Data Analysis"])

@router.get("/regression/salary")
async def get_salary_regression():
    return await SalaryRegressionService.predict_salary_by_skill_count()

@router.get("/classification/compare")
async def compare_classifiers(target: str = "category"):
    return await JobClassificationService.compare_classifiers(target)

@router.post("/classification/predict")
async def predict_category(skills: List[str]):
    return await JobClassificationService.predict_job_category(skills)

@router.get("/clustering/kmeans")
async def get_kmeans_clusters(k: int = 5):
    return await SkillClusteringService.cluster_jobs_kmeans(k)

@router.post("/nlp/analyze")
async def analyze_text(text: str):
    tokens = NLPService.tokenize_and_clean(text)
    sentiment = NLPService.analyze_sentiment(text)
    entities = NLPService.extract_entities(text)
    return {
        "tokens": tokens,
        "sentiment": sentiment,
        "entities": entities
    }

@router.post("/nlp/advice")
async def get_career_advice(job_title: str, skills: List[str]):
    advice = await NLPService.generate_career_advice(job_title, skills)
    return {"advice": advice}


