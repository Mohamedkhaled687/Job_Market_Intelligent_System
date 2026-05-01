"""
Model training script for Salary Prediction & Category Classification

"""

import asyncio
import json
from pathlib import Path

from src.ml.data_preparation import MLDataPreparation
from src.ml.models import SalaryPredictionModel, CategoryClassificationModel, ModelEnsemble
from src.models.database import connect_db, close_db


# Model save paths
MODELS_DIR = Path(__file__).parent / "trained_models"
MODELS_DIR.mkdir(exist_ok=True)

SALARY_MODEL_PATH = MODELS_DIR / "salary_model.json"
CATEGORY_MODEL_PATH = MODELS_DIR / "category_model.json"
METRICS_PATH = MODELS_DIR / "metrics.json"


def _to_builtin(value):
    """Recursively convert NumPy/Pandas scalar values into JSON-serializable Python types."""
    if isinstance(value, dict):
        return {key: _to_builtin(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_to_builtin(item) for item in value]
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return value
    return value


async def train_models(limit: int = 10000, test_size: float = 0.2):
    """
    Complete training pipeline for both models.
    
    Args:
        limit: Number of jobs to fetch
        test_size: Train/test split ratio
    """
    
    print("\n" + "=" * 70)
    print(" STARTING ML MODEL TRAINING PIPELINE")
    print("=" * 70)
    
    # STEP 1: Data Preparation
    print("\n[1/4] PREPARING DATA")
    print("-" * 70)
    
    prep = MLDataPreparation()
    data = await prep.prepare_all_data(limit=limit, test_size=test_size)
    
    salary_data = data['salary']
    category_data = data['category']
    
    # STEP 2: Train Salary Prediction Model
    print("\n[2/4] TRAINING SALARY PREDICTION MODEL")
    print("-" * 70)
    
    salary_model = SalaryPredictionModel()
    salary_model.train(
        salary_data['X_train'], 
        salary_data['y_train'],
        salary_data['X_test'],
        salary_data['y_test']
    )
    
    salary_metrics = salary_model.evaluate(
        salary_data['X_test'],
        salary_data['y_test']
    )
    
    salary_importance = salary_model.get_feature_importance(
        salary_data['X_train'].columns.tolist()
    )
    print("\n Top 10 features:")
    for i, (feature, importance) in enumerate(list(salary_importance.items())[:10], 1):
        print(f"   {i}. {feature}: {importance:.4f}")
    
    # STEP 3: Train Category Classification Model
    print("\n[3/4] TRAINING CATEGORY CLASSIFICATION MODEL")
    print("-" * 70)
    
    category_model = CategoryClassificationModel()
    category_model.train(
        category_data['X_train'],
        category_data['y_train'],
        category_data['X_test'],
        category_data['y_test']
    )
    
    category_metrics = category_model.evaluate(
        category_data['X_test'],
        category_data['y_test']
    )
    
    category_importance = category_model.get_feature_importance(
        category_data['X_train'].columns.tolist()
    )
    print("\n Top 10 features:")
    for i, (feature, importance) in enumerate(list(category_importance.items())[:10], 1):
        print(f"   {i}. {feature}: {importance:.4f}")
    
    # STEP 4: Save Models
    print("\n[4/4] SAVING MODELS")
    print("-" * 70)
    
    salary_model.save(str(SALARY_MODEL_PATH))
    category_model.save(str(CATEGORY_MODEL_PATH))
    
    # Save metrics
    all_metrics = _to_builtin({
        'salary_prediction': {
            'model_path': str(SALARY_MODEL_PATH),
            'metrics': salary_metrics,
            'feature_importance': salary_importance,
        },
        'category_classification': {
            'model_path': str(CATEGORY_MODEL_PATH),
            'metrics': category_metrics,
            'feature_importance': category_importance,
        },
        'training_info': {
            'total_jobs_used': len(salary_data['X_train']) + len(salary_data['X_test']),
            'train_size': len(salary_data['X_train']),
            'test_size': len(salary_data['X_test']),
            'test_split': test_size,
        }
    })
    
    with open(METRICS_PATH, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    
    print(f" Metrics saved to {METRICS_PATH}")
    
    # Summary
    print("\n" + "=" * 70)
    print("✨ TRAINING COMPLETE")
    print("=" * 70)
    print("\n RESULTS SUMMARY:")
    print("\n Salary Prediction:")
    print(f"   R² Score: {salary_metrics['r2']:.4f}")
    print(f"   RMSE: ${salary_metrics['rmse']:.0f}")
    print(f"   MAE: ${salary_metrics['mae']:.0f}")
    
    print("\n  Category Classification:")
    print(f"   Accuracy: {category_metrics['accuracy']:.4f}")
    print(f"   F1-Score: {category_metrics['f1']:.4f}")
    
    print(f"\n Models saved to: {MODELS_DIR}")
    print(f" Metrics saved to: {METRICS_PATH}")
    
    return {
        'salary_model': salary_model,
        'category_model': category_model,
        'metrics': all_metrics,
    }


def load_trained_models() -> ModelEnsemble:
    """
    Load trained models from disk.
    
    Returns:
        ModelEnsemble with both models
    """
    if not SALARY_MODEL_PATH.exists() or not CATEGORY_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Models not found. Run training first:\n"
            f"  python -m src.ml.train_models"
        )
    
    salary_model = SalaryPredictionModel(str(SALARY_MODEL_PATH))
    category_model = CategoryClassificationModel(str(CATEGORY_MODEL_PATH))
    
    return ModelEnsemble(salary_model, category_model)


if __name__ == "__main__":
    async def main():
        # Initialize database
        await connect_db()
        
        try:
            # Run training
            results = await train_models(limit=10000, test_size=0.2)
            
            print("\n Models trained successfully!")
            print(f"   Salary Model R²: {results['metrics']['salary_prediction']['metrics']['r2']:.4f}")
            print(f"   Category Accuracy: {results['metrics']['category_classification']['metrics']['accuracy']:.4f}")
        finally:
            # Close database connection
            await close_db()
    
    asyncio.run(main())
