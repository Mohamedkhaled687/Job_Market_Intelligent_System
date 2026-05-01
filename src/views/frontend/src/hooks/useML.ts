/**
 * ML Models Hooks - Salary Prediction & Category Classification
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

// Types
export interface SalaryPredictionInput {
  seniority: string;
  skill_count: number;
  unique_skills: number;
  has_python?: number;
  has_react?: number;
  has_aws?: number;
  has_kubernetes?: number;
  is_backend?: number;
  is_frontend?: number;
  is_devops?: number;
  company_job_count?: number;
  days_posted?: number;
}

export interface SalaryPredictionResult {
  predicted_salary: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  model_version: string;
}

export interface CategoryPredictionInput {
  seniority: string;
  skill_count: number;
  unique_skills: number;
  has_python?: number;
  has_react?: number;
  has_aws?: number;
  has_kubernetes?: number;
  company_job_count?: number;
  salary_estimate?: number;
  days_posted?: number;
  skills?: string[];
}

export interface CategoryPredictionResult {
  predicted_category: string;
  confidence: number;
  top_3_predictions: Array<{
    category: string;
    confidence: number;
  }>;
  model_version: string;
}

export interface CombinedPredictionInput extends SalaryPredictionInput, CategoryPredictionInput {}

export interface CombinedPredictionResult {
  salary: {
    predicted_salary: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
  };
  category: {
    predicted_category: string;
    confidence: number;
  };
  model_version: string;
}

export interface ModelMetrics {
  salary_prediction: {
    model_path: string;
    metrics: {
      mse: number;
      rmse: number;
      mae: number;
      r2: number;
      mape: number;
    };
    feature_importance: Record<string, number>;
  };
  category_classification: {
    model_path: string;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      per_class: Record<string, {
        precision: number;
        recall: number;
        f1: number;
        support: number;
      }>;
    };
    feature_importance: Record<string, number>;
  };
  training_info: {
    total_jobs_used: number;
    train_size: number;
    test_size: number;
    test_split: number;
  };
}

// Hooks

export function useSalaryPrediction() {
  return useMutation({
    mutationFn: async (input: SalaryPredictionInput) => {
      const { data } = await apiClient.post<SalaryPredictionResult>(
        "/api/ml/predict-salary",
        input
      );
      return data;
    },
  });
}

export function useCategoryPrediction() {
  return useMutation({
    mutationFn: async (input: CategoryPredictionInput) => {
      const { data } = await apiClient.post<CategoryPredictionResult>(
        "/api/ml/predict-category",
        input
      );
      return data;
    },
  });
}

export function useCombinedPrediction() {
  return useMutation({
    mutationFn: async (input: CombinedPredictionInput) => {
      const { data } = await apiClient.post<CombinedPredictionResult>(
        "/api/ml/predict-all",
        input
      );
      return data;
    },
  });
}

export function useMLModelsMetrics() {
  return useQuery({
    queryKey: ["ml-models-metrics"],
    queryFn: async () => {
      const { data } = await apiClient.get<ModelMetrics>("/api/ml/models/metrics");
      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useMLModelsStatus() {
  return useQuery({
    queryKey: ["ml-models-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/ml/models/status");
      return data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

export function useMLModelsInfo() {
  return useQuery({
    queryKey: ["ml-models-info"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/ml/models/info");
      return data;
    },
    staleTime: 3600_000, // 1 hour (rarely changes)
  });
}
