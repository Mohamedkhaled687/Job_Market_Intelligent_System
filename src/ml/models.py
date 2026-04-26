"""
ML Models: Salary Prediction & Category Classification

This module contains trained models and prediction utilities for:
1. Salary estimation (Regression)
2. Job category classification (Multi-class)
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, Optional
from sklearn.preprocessing import LabelEncoder
import pickle
from pathlib import Path

from xgboost import XGBRegressor, XGBClassifier
from sklearn.metrics import (
    mean_squared_error, r2_score, mean_absolute_error,
    accuracy_score, precision_recall_fscore_support, confusion_matrix
)
import json


class SalaryPredictionModel:
    """XGBoost model for salary prediction"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize salary prediction model.
        
        Args:
            model_path: Path to load existing model (optional)
        """
        if model_path and Path(model_path).exists():
            self.model = XGBRegressor()
            self.model.load_model(model_path)
            self.is_trained = True
        else:
            self.model = XGBRegressor(
                n_estimators=100,
                max_depth=7,
                learning_rate=0.1,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
                n_jobs=-1,
                objective='reg:squarederror',
            )
            self.is_trained = False
    
    def train(self, X_train: pd.DataFrame, y_train: pd.Series, 
              X_val: Optional[pd.DataFrame] = None, y_val: Optional[pd.Series] = None):
        """
        Train salary prediction model.
        
        Args:
            X_train: Training features
            y_train: Training target (salary)
            X_val: Validation features (optional)
            y_val: Validation target (optional)
        """
        eval_set = None
        if X_val is not None and y_val is not None:
            eval_set = [(X_train, y_train), (X_val, y_val)]
        
        self.model.fit(
            X_train, y_train,
            eval_set=eval_set,
            verbose=10
        )
        self.is_trained = True
        print(" Salary prediction model trained")
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict salary for job features.
        
        Args:
            X: Job features
            
        Returns:
            Predicted salary values
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        
        return self.model.predict(X)
    
    def predict_with_interval(self, X: pd.DataFrame, percentile: float = 10) -> Dict:
        """
        Predict salary with confidence interval.
        
        Args:
            X: Job features
            percentile: Percentile for interval (default 10% = 80% confidence)
            
        Returns:
            Dict with predictions and intervals
        """
        predictions = self.predict(X)
        
        # Calculate intervals based on model's expected errors
        residuals = self.model.feature_importances_ * 1000  # Rough approximation
        lower_bound = predictions - (percentile / 100 * predictions)
        upper_bound = predictions + (percentile / 100 * predictions)
        
        return {
            'predictions': predictions,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
        }
    
    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
        """
        Evaluate model performance.
        
        Args:
            X_test: Test features
            y_test: Test target
            
        Returns:
            Dict with metrics
        """
        y_pred = self.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # MAPE (Mean Absolute Percentage Error)
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
        
        metrics = {
            'mse': float(mse),
            'rmse': float(rmse),
            'mae': float(mae),
            'r2': float(r2),
            'mape': float(mape),
        }
        
        print("\n Salary Prediction Model Evaluation:")
        print(f"  R² Score: {r2:.4f}")
        print(f"  RMSE: ${rmse:.0f}")
        print(f"  MAE: ${mae:.0f}")
        print(f"  MAPE: {mape:.2f}%")
        
        return metrics
    
    def save(self, filepath: str):
        """Save model to disk."""
        self.model.save_model(filepath)
        print(f" Model saved to {filepath}")
    
    def get_feature_importance(self, feature_names: list) -> Dict[str, float]:
        """Get feature importance scores."""
        importance = dict(zip(feature_names, self.model.feature_importances_))
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))


class CategoryClassificationModel:
    """XGBoost model for job category classification"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize category classification model.
        
        Args:
            model_path: Path to load existing model (optional)
        """
        if model_path and Path(model_path).exists():
            self.model = XGBClassifier()
            self.model.load_model(model_path)
            self.is_trained = True
        else:
            self.model = XGBClassifier(
                n_estimators=100,
                max_depth=7,
                learning_rate=0.1,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
                n_jobs=-1,
                objective='multi:softmax',
                eval_metric='mlogloss',
            )
            self.is_trained = False
        
            self.classes_ = None
            self.label_encoder: Optional[LabelEncoder] = None
    
    def train(self, X_train: pd.DataFrame, y_train: pd.Series,
              X_val: Optional[pd.DataFrame] = None, y_val: Optional[pd.Series] = None):
        """
        Train category classification model.
        
        Args:
            X_train: Training features
            y_train: Training categories
            X_val: Validation features (optional)
            y_val: Validation categories (optional)
        """
        # Always encode labels via LabelEncoder to ensure numeric classes
        self.label_encoder = LabelEncoder()
        y_train_enc = self.label_encoder.fit_transform(y_train.astype(str))
        y_val_enc = None
        if y_val is not None:
            y_val_enc = self.label_encoder.transform(y_val.astype(str))

        eval_set = None
        if X_val is not None and y_val is not None:
            eval_set = [(X_train, y_train_enc), (X_val, y_val_enc)]

        self.model.fit(
            X_train, y_train_enc,
            eval_set=eval_set,
            verbose=10
        )

        # store classes in original label form if we encoded
        if self.label_encoder is not None:
            self.classes_ = list(self.label_encoder.classes_)
        else:
            # model.classes_ may be numeric; keep as list
            try:
                self.classes_ = list(self.model.classes_)
            except Exception:
                self.classes_ = []

        self.is_trained = True
        print(" Category classification model trained")
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict job categories.
        
        Args:
            X: Job features
            
        Returns:
            Predicted categories
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        y_pred = self.model.predict(X)
        if self.label_encoder is not None:
            try:
                y_pred = self.label_encoder.inverse_transform(y_pred.astype(int))
            except Exception:
                pass
        return y_pred
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict category probabilities.
        
        Args:
            X: Job features
            
        Returns:
            Probability for each category
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")
        
        return self.model.predict_proba(X)
    
    def predict_with_confidence(self, X: pd.DataFrame, confidence_threshold: float = 0.5) -> Dict:
        """
        Predict categories with confidence scores.
        
        Args:
            X: Job features
            confidence_threshold: Minimum confidence to report (default 50%)
            
        Returns:
            Dict with predictions and confidence scores
        """
        predictions = self.predict(X)
        probabilities = self.predict_proba(X)
        
        # Get top prediction confidence
        top_confidence = np.max(probabilities, axis=1)
        
        results = {
            'predictions': predictions,
            'confidence': top_confidence,
            'above_threshold': top_confidence >= confidence_threshold,
            'probabilities': probabilities,
        }
        
        return results
    
    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
        """
        Evaluate model performance.
        
        Args:
            X_test: Test features
            y_test: Test categories
            
        Returns:
            Dict with metrics
        """
        y_pred = self.predict(X_test)
        
        accuracy = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average='weighted', zero_division=0
        )
        
        # Per-class metrics
        precision_per_class, recall_per_class, f1_per_class, support = \
            precision_recall_fscore_support(y_test, y_pred, labels=self.classes_, zero_division=0)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'per_class': {
                str(category): {
                    'precision': float(p),
                    'recall': float(r),
                    'f1': float(f),
                    'support': int(s),
                }
                for category, p, r, f, s in zip(self.classes_, precision_per_class, recall_per_class, f1_per_class, support)
            }
        }
        
        print("\n Category Classification Model Evaluation:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        print("\n  Per-Class Metrics:")
        for category, scores in metrics['per_class'].items():
            print(f"    {category}: P={scores['precision']:.3f}, R={scores['recall']:.3f}, F1={scores['f1']:.3f}")
        
        return metrics
    
    def save(self, filepath: str):
        """Save model to disk."""
        self.model.save_model(filepath)
        print(f" Model saved to {filepath}")
    
    def get_feature_importance(self, feature_names: list) -> Dict[str, float]:
        """Get feature importance scores."""
        importance = dict(zip(feature_names, self.model.feature_importances_))
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))


class ModelEnsemble:
    """Combined interface for both models"""
    
    def __init__(self, salary_model: Optional[SalaryPredictionModel] = None,
                 category_model: Optional[CategoryClassificationModel] = None):
        """
        Initialize model ensemble.
        
        Args:
            salary_model: Salary prediction model
            category_model: Category classification model
        """
        self.salary_model = salary_model or SalaryPredictionModel()
        self.category_model = category_model or CategoryClassificationModel()
    
    def predict_all(self, X_salary: pd.DataFrame, X_category: pd.DataFrame) -> Dict:
        """
        Run both models on job features.
        
        Args:
            X_salary: Features for salary prediction
            X_category: Features for category classification
            
        Returns:
            Dict with both predictions
        """
        salary_pred = self.salary_model.predict(X_salary)
        category_pred = self.category_model.predict(X_category)
        category_proba = self.category_model.predict_proba(X_category)
        
        return {
            'salary': {
                'predictions': salary_pred,
                'mean': float(np.mean(salary_pred)),
                'std': float(np.std(salary_pred)),
            },
            'category': {
                'predictions': category_pred,
                'probabilities': category_proba,
            }
        }
    
    def save_all(self, salary_path: str, category_path: str):
        """Save both models."""
        self.salary_model.save(salary_path)
        self.category_model.save(category_path)
