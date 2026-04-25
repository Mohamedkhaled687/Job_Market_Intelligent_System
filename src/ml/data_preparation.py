"""
Data preparation for ML models (Salary Prediction & Category Classification)
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, List, Optional
from sklearn.preprocessing import StandardScaler, OrdinalEncoder, MultiLabelBinarizer
from sklearn.model_selection import train_test_split
import pickle

from src.models.database import get_db
from src.services.analytics_service import AnalyticsService


class MLDataPreparation:
    """Prepare data for ML models"""

    # Seniority mapping (ordinal encoding)
    SENIORITY_MAP = {
        'junior': 0,
        'mid-level': 1,
        'mid': 1,
        'senior': 2,
        'lead': 3,
        'manager': 3,
    }

    # High-value skills for feature importance
    TOP_SKILLS = [
        'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
        'react', 'vue', 'angular', 'django', 'fastapi', 'nodejs', 'express',
        'postgresql', 'mongodb', 'mysql', 'redis', 'elasticsearch',
        'aws', 'gcp', 'azure', 'docker', 'kubernetes',
        'git', 'rest', 'graphql', 'sql', 'html', 'css'
    ]

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.category_encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
        
    async def get_raw_data(self, limit: int = 10000) -> pd.DataFrame:
        """
        Fetch job data from MongoDB.
        
        Args:
            limit: Maximum number of jobs to fetch
            
        Returns:
            DataFrame with raw job data
        """
        analytics = AnalyticsService()
        df = await analytics.get_job_dataframe(limit=limit)
        return df

    def filter_valid_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Remove invalid records (missing critical fields).
        
        Args:
            df: Raw data
            
        Returns:
            Cleaned dataframe
        """
        print(f"Original data: {len(df)} records")
        
        # Remove missing salary
        df = df[df['salary_estimate'].notna() & (df['salary_estimate'] > 0)]
        print(f"After salary filter: {len(df)} records")
        
        # Remove missing category
        df = df[df['category'].notna()]
        print(f"After category filter: {len(df)} records")
        
        return df

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create new features for models.
        
        Args:
            df: Cleaned data
            
        Returns:
            DataFrame with engineered features
        """
        # Seniority encoding (ordinal)
        df['seniority_encoded'] = df['seniority'].str.lower().map(self.SENIORITY_MAP).fillna(1)
        
        # Skill count
        df['skill_count'] = df['normalized_skills'].apply(
            lambda x: len(x) if isinstance(x, list) else 0
        )
        
        # Skill diversity (unique skills)
        df['unique_skills'] = df['normalized_skills'].apply(
            lambda x: len(set(x)) if isinstance(x, list) else 0
        )
        
        # Has high-demand skills
        df['has_python'] = df['normalized_skills'].apply(
            lambda x: 1 if isinstance(x, list) and 'python' in x else 0
        )
        df['has_react'] = df['normalized_skills'].apply(
            lambda x: 1 if isinstance(x, list) and 'react' in x else 0
        )
        df['has_aws'] = df['normalized_skills'].apply(
            lambda x: 1 if isinstance(x, list) and 'aws' in x else 0
        )
        df['has_kubernetes'] = df['normalized_skills'].apply(
            lambda x: 1 if isinstance(x, list) and 'kubernetes' in x else 0
        )
        
        # Backend category indicator
        df['is_backend'] = (df['category'] == 'Backend').astype(int)
        df['is_frontend'] = (df['category'] == 'Frontend').astype(int)
        df['is_devops'] = (df['category'] == 'DevOps').astype(int)
        
        # Company size (proxy: number of postings)
        company_counts = df['company'].value_counts().to_dict()
        df['company_job_count'] = df['company'].map(company_counts).fillna(1)
        
        # Posted date features
        if 'posted_date' in df.columns:
            df['posted_date'] = pd.to_datetime(df['posted_date'], errors='coerce')
            df['days_posted'] = (pd.Timestamp.now() - df['posted_date']).dt.days
            df['days_posted'] = df['days_posted'].fillna(0).clip(lower=0)
        else:
            df['days_posted'] = 0
        
        return df

    def prepare_salary_prediction_data(
        self, 
        df: pd.DataFrame,
        test_size: float = 0.2
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Prepare data for salary prediction model.
        
        Args:
            df: Engineered features dataframe
            test_size: Train/test split ratio
            
        Returns:
            (X_train, X_test, y_train, y_test)
        """
        # Feature selection for salary prediction
        feature_cols = [
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
        ]
        
        # Target
        target = df['salary_estimate'].copy()
        X = df[feature_cols].copy()
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, target,
            test_size=test_size,
            random_state=self.random_state
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        X_train = pd.DataFrame(X_train_scaled, columns=feature_cols, index=X_train.index)
        X_test = pd.DataFrame(X_test_scaled, columns=feature_cols, index=X_test.index)
        
        print(f"\nSalary Prediction Data:")
        print(f"Training set: {len(X_train)}")
        print(f"Test set: {len(X_test)}")
        print(f"Target range: ${y_train.min():.0f} - ${y_train.max():.0f}")
        
        return X_train, X_test, y_train, y_test

    def prepare_category_classification_data(
        self,
        df: pd.DataFrame,
        test_size: float = 0.2
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Prepare data for category classification model.
        
        Args:
            df: Engineered features dataframe
            test_size: Train/test split ratio
            
        Returns:
            (X_train, X_test, y_train, y_test)
        """
        # Feature selection for category classification
        feature_cols = [
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
        ]
        
        # One-hot encode categorical features from skills
        skill_dummies = self._get_skill_features(df)
        
        # Target
        target = df['category'].copy()
        X = df[feature_cols].copy()
        X = pd.concat([X.reset_index(drop=True), skill_dummies.reset_index(drop=True)], axis=1)
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, target,
            test_size=test_size,
            stratify=target,  # Stratified for balanced splits
            random_state=self.random_state
        )
        
        # Scale numerical features only
        numerical_cols = [col for col in feature_cols if col != 'days_posted']
        X_train_scaled = self.scaler.fit_transform(X_train[numerical_cols])
        X_test_scaled = self.scaler.transform(X_test[numerical_cols])
        
        X_train[numerical_cols] = X_train_scaled
        X_test[numerical_cols] = X_test_scaled
        
        print(f"\nCategory Classification Data:")
        print(f"Training set: {len(X_train)}")
        print(f"Test set: {len(X_test)}")
        print(f"Categories: {y_train.nunique()}")
        print(f"Category distribution:\n{y_train.value_counts()}")
        
        return X_train, X_test, y_train, y_test

    def _get_skill_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create one-hot encoded skill features."""
        skill_data = []
        
        for skills in df['normalized_skills']:
            skill_row = {}
            if isinstance(skills, list):
                for skill in self.TOP_SKILLS:
                    skill_row[f'skill_{skill}'] = 1 if skill in skills else 0
            else:
                for skill in self.TOP_SKILLS:
                    skill_row[f'skill_{skill}'] = 0
            skill_data.append(skill_row)
        
        return pd.DataFrame(skill_data)

    async def prepare_all_data(
        self,
        limit: int = 10000,
        test_size: float = 0.2
    ) -> Dict:
        """
        Complete pipeline: fetch, clean, engineer, prepare for both models.
        
        Args:
            limit: Max records to fetch
            test_size: Train/test split
            
        Returns:
            Dict with both models' data
        """
        print("=" * 60)
        print("ML DATA PREPARATION PIPELINE")
        print("=" * 60)
        
        # Fetch data
        print("\n Fetching raw data...")
        df = await self.get_raw_data(limit=limit)
        
        # Clean
        print("\n Cleaning data...")
        df = self.filter_valid_data(df)
        
        # Engineer features
        print("\n Engineering features...")
        df = self.engineer_features(df)
        
        # Prepare for both models
        print("\n Preparing for Salary Prediction...")
        salary_data = self.prepare_salary_prediction_data(df, test_size)
        
        print("\n Preparing for Category Classification...")
        category_data = self.prepare_category_classification_data(df, test_size)
        
        print("\n Data preparation complete!")
        
        return {
            'salary': {
                'X_train': salary_data[0],
                'X_test': salary_data[1],
                'y_train': salary_data[2],
                'y_test': salary_data[3],
            },
            'category': {
                'X_train': category_data[0],
                'X_test': category_data[1],
                'y_train': category_data[2],
                'y_test': category_data[3],
            },
            'scaler': self.scaler,
        }


# Utility functions for loading/saving preprocessors
def save_preprocessor(preprocessor: MLDataPreparation, filepath: str):
    """Save scaler and encoder to disk."""
    with open(filepath, 'wb') as f:
        pickle.dump({
            'scaler': preprocessor.scaler,
            'category_encoder': preprocessor.category_encoder,
        }, f)


def load_preprocessor(filepath: str) -> Dict:
    """Load scaler and encoder from disk."""
    with open(filepath, 'rb') as f:
        return pickle.load(f)
