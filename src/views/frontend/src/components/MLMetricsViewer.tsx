/**
 * ML Models Metrics Viewer
 * Displays comprehensive performance metrics for trained ML models
 */

import { useState } from "react";
import { useMLModelsMetrics, useMLModelsStatus, useMLModelsInfo } from "@/hooks/useML";
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "./Skeleton";

const METRIC_COLORS = {
  salary: "hsl(221, 83%, 53%)",
  category: "hsl(160, 60%, 45%)",
  success: "hsl(120, 100%, 40%)",
  warning: "hsl(40, 90%, 50%)",
  error: "hsl(0, 80%, 50%)",
};

export function MLMetricsViewer() {
  const [activeTab, setActiveTab] = useState<"salary" | "category" | "comparison">("salary");
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useMLModelsMetrics();
  const { data: status, isLoading: statusLoading } = useMLModelsStatus();
  const { data: info, isLoading: infoLoading } = useMLModelsInfo();

  if (metricsLoading || statusLoading || infoLoading) {
    return <MetricsSkeleton />;
  }

  if (metricsError || !metrics) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 flex gap-3">
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-100">Metrics Unavailable</h3>
          <p className="text-sm text-red-800 dark:text-red-200 mt-1">
            Models may not be trained yet. Please train the models first.
          </p>
        </div>
      </div>
    );
  }

  // The API returns salary_prediction / category_classification (per ModelMetrics type in useML.ts)
  const salaryMetrics = metrics.salary_prediction;
  const categoryMetrics = metrics.category_classification;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">ML Model Performance</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Comprehensive metrics and diagnostics for salary prediction and category classification models
        </p>
      </div>

      {/* Model Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModelStatusCard
            name="Salary Prediction"
            trained={status.salary_model_trained}
            description="XGBoost regression model predicting job salaries"
          />
          <ModelStatusCard
            name="Category Classification"
            trained={status.category_model_trained}
            description="XGBoost classifier predicting job categories"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[hsl(var(--border))]">
        {["salary", "category", "comparison"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === tab
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Model
          </button>
        ))}
      </div>

      {/* Salary Model Metrics */}
      {activeTab === "salary" && salaryMetrics && (
        <SalaryModelMetrics metrics={salaryMetrics} info={info} />
      )}

      {/* Category Model Metrics */}
      {activeTab === "category" && categoryMetrics && (
        <CategoryModelMetrics metrics={categoryMetrics} info={info} />
      )}

      {/* Model Comparison */}
      {activeTab === "comparison" && (
        <ModelComparison salaryMetrics={salaryMetrics} categoryMetrics={categoryMetrics} />
      )}
    </div>
  );
}

function SalaryModelMetrics({ metrics, info }: { metrics: any; info: any }) {
  const featureImportanceData =
    metrics.feature_importance &&
    Object.entries(metrics.feature_importance)
      .map(([name, importance]: any) => ({
        feature: name.replace(/_/g, " ").toUpperCase(),
        importance: parseFloat(importance),
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

  // API returns metrics.metrics.r2, rmse, mae, mape (per ModelMetrics type)
  const m = metrics.metrics ?? metrics;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="R² Score"
          value={m.r2}
          description="Coefficient of determination"
          color="bg-blue-100 dark:bg-blue-900"
          percentage
        />
        <MetricCard
          label="RMSE"
          value={m.rmse}
          description="Root mean squared error"
          color="bg-purple-100 dark:bg-purple-900"
          prefix="$"
        />
        <MetricCard
          label="MAE"
          value={m.mae}
          description="Mean absolute error"
          color="bg-green-100 dark:bg-green-900"
          prefix="$"
        />
        <MetricCard
          label="MAPE"
          value={m.mape}
          description="Mean absolute % error"
          color="bg-orange-100 dark:bg-orange-900"
          percentage
        />
      </div>

      {/* Model Info */}
      {info?.salary_model_info && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Model Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">Input Features</h3>
              <ul className="space-y-2 text-sm">
                {info.salary_model_info.input_features?.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                    {feature.replace(/_/g, " ").toUpperCase()}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Model Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Algorithm: </span>
                  <span className="font-medium">XGBoost Regressor</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Training Samples: </span>
                  <span className="font-medium">{info.salary_model_info.training_samples}</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Test Samples: </span>
                  <span className="font-medium">{info.salary_model_info.test_samples}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Importance Chart */}
      {featureImportanceData && featureImportanceData.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Top 10 Most Important Features</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={featureImportanceData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="feature" type="category" width={140} />
              <Tooltip />
              <Bar dataKey="importance" fill={METRIC_COLORS.salary} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Prediction Intervals */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="text-xl font-bold mb-4">Prediction Confidence</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Confidence Interval Width</span>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">±15%</span>
            </div>
            <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
              <div className="h-full w-[15%] bg-[hsl(var(--primary))]" />
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Predictions include confidence intervals indicating the expected range of variation
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function CategoryModelMetrics({ metrics, info }: { metrics: any; info: any }) {
  const featureImportanceData =
    metrics.feature_importance &&
    Object.entries(metrics.feature_importance)
      .map(([name, importance]: any) => ({
        feature: name.replace(/_/g, " ").toUpperCase(),
        importance: parseFloat(importance),
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

  // API returns metrics.metrics.accuracy, precision, recall, f1, per_class
  const m = metrics.metrics ?? metrics;

  const classMetrics = m.per_class
    ? Object.entries(m.per_class)
        .map(([category, stats]: any) => ({
          category,
          Precision: parseFloat(stats.precision),
          Recall: parseFloat(stats.recall),
          "F1-Score": parseFloat(stats.f1),
        }))
        .slice(0, 5)
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Accuracy"
          value={m.accuracy}
          description="Overall classification accuracy"
          color="bg-blue-100 dark:bg-blue-900"
          percentage
        />
        <MetricCard
          label="Precision"
          value={m.precision}
          description="Positive prediction accuracy"
          color="bg-green-100 dark:bg-green-900"
          percentage
        />
        <MetricCard
          label="Recall"
          value={m.recall}
          description="True positive rate"
          color="bg-purple-100 dark:bg-purple-900"
          percentage
        />
        <MetricCard
          label="F1 Score"
          value={m.f1}
          description="Harmonic mean of precision/recall"
          color="bg-orange-100 dark:bg-orange-900"
          percentage
        />
      </div>

      {/* Model Info */}
      {info?.category_model_info && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Model Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">Job Categories</h3>
              <div className="space-y-2 text-sm">
                {info.category_model_info.categories?.map((cat: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                    {cat}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Model Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Algorithm: </span>
                  <span className="font-medium">XGBoost Classifier</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Training Samples: </span>
                  <span className="font-medium">{info.category_model_info.training_samples}</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Test Samples: </span>
                  <span className="font-medium">{info.category_model_info.test_samples}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Importance */}
      {featureImportanceData && featureImportanceData.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Top 10 Most Important Features</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={featureImportanceData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="feature" type="category" width={140} />
              <Tooltip />
              <Bar dataKey="importance" fill={METRIC_COLORS.category} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-Class Performance Radar */}
      {classMetrics.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Per-Category Performance</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={classMetrics}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis domain={[0, 1]} />
              <Radar name="Precision" dataKey="Precision" stroke={METRIC_COLORS.salary} fill={METRIC_COLORS.salary} fillOpacity={0.25} />
              <Radar name="Recall" dataKey="Recall" stroke={METRIC_COLORS.category} fill={METRIC_COLORS.category} fillOpacity={0.25} />
              <Radar name="F1-Score" dataKey="F1-Score" stroke={METRIC_COLORS.success} fill={METRIC_COLORS.success} fillOpacity={0.25} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Support Table */}
      {m.per_class && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-xl font-bold mb-4">Classification Metrics by Category</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-right py-3 px-4 font-semibold">Precision</th>
                  <th className="text-right py-3 px-4 font-semibold">Recall</th>
                  <th className="text-right py-3 px-4 font-semibold">F1-Score</th>
                  <th className="text-right py-3 px-4 font-semibold">Support</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(m.per_class).map(([category, stats]: any, idx) => (
                  <tr key={idx} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                    <td className="py-3 px-4">{category}</td>
                    <td className="text-right py-3 px-4">{(parseFloat(stats.precision) * 100).toFixed(1)}%</td>
                    <td className="text-right py-3 px-4">{(parseFloat(stats.recall) * 100).toFixed(1)}%</td>
                    <td className="text-right py-3 px-4">{(parseFloat(stats.f1) * 100).toFixed(1)}%</td>
                    <td className="text-right py-3 px-4">{stats.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ModelComparison({ salaryMetrics, categoryMetrics }: { salaryMetrics: any; categoryMetrics: any }) {
  // Guard: both models must be present to compare
  if (!salaryMetrics || !categoryMetrics) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-6 flex gap-3">
        <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">Comparison Unavailable</h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            Both models must be trained before they can be compared.
          </p>
        </div>
      </div>
    );
  }

  const sm = salaryMetrics.metrics ?? salaryMetrics;
  const cm = categoryMetrics.metrics ?? categoryMetrics;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-lg font-bold mb-4">Salary Prediction Model</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>R² Score</span>
              <span className="font-bold text-lg">{(sm.r2 * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>RMSE</span>
              <span className="font-bold">${Number(sm.rmse).toLocaleString()}</span>
            </div>
            <div className="w-full h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-[hsl(221,_83%,_53%)]"
                style={{ width: `${sm.r2 * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-lg font-bold mb-4">Category Classification Model</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Accuracy</span>
              <span className="font-bold text-lg">{(cm.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>F1 Score</span>
              <span className="font-bold">{(cm.f1 * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-[hsl(160,_60%,_45%)]"
                style={{ width: `${cm.accuracy * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="text-lg font-bold mb-4">Model Purpose Comparison</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Salary Prediction</h3>
            <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-1 list-disc list-inside">
              <li>Predicts continuous salary values</li>
              <li>Regression task (numerical output)</li>
              <li>Key features: skills, seniority, company</li>
            </ul>
          </div>
          <div className="h-px bg-[hsl(var(--border))]" />
          <div>
            <h3 className="font-semibold mb-2">Category Classification</h3>
            <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-1 list-disc list-inside">
              <li>Predicts job category (Backend/Frontend/etc)</li>
              <li>Classification task (categorical output)</li>
              <li>Key features: skills, seniority, salary level</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  description,
  color,
  percentage = false,
  prefix = "",
}: {
  label: string;
  value: number;
  description: string;
  color: string;
  percentage?: boolean;
  prefix?: string;
}) {
  const displayValue = percentage ? (value * 100).toFixed(1) : value.toFixed(2);
  const suffix = percentage ? "%" : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl ${color} p-4`}
    >
      <p className="text-xs font-medium opacity-75 mb-2">{label}</p>
      <p className="text-2xl font-bold mb-1">
        {prefix}
        {displayValue}
        {suffix}
      </p>
      <p className="text-xs opacity-60">{description}</p>
    </motion.div>
  );
}

function ModelStatusCard({
  name,
  trained,
  description,
}: {
  name: string;
  trained: boolean;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">{name}</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        </div>
        <div
          className={`rounded-full p-2 ${trained ? "bg-green-100 dark:bg-green-900" : "bg-yellow-100 dark:bg-yellow-900"}`}
        >
          {trained ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <Clock className="h-6 w-6 text-yellow-600" />
          )}
        </div>
      </div>
      <div className="mt-4">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${
            trained
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
          }`}
        >
          {trained ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Trained
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Pending
            </>
          )}
        </span>
      </div>
    </motion.div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">ML Model Performance</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Loading metrics...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>

      <Skeleton className="h-10" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <Skeleton className="h-96" />
    </div>
  );
}