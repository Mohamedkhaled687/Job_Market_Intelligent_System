/**
 * ML Dashboard Page
 * Unified interface for ML predictions and model metrics
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { SalaryPredictor } from "@/components/SalaryPredictor";
import { CategoryPredictor } from "@/components/CategoryPredictor";
import { MLMetricsViewer } from "@/components/MLMetricsViewer";

type TabValue = "predictors" | "metrics";

export function MLDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("predictors");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))]">
      {/* Header with Navigation */}
      <div className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Predictors</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                AI-powered salary predictions and job category classification
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab("predictors")}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "predictors"
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            Predictors
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "metrics"
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            Model Metrics
          </button>
        </div>

        {/* Predictors Tab */}
        {activeTab === "predictors" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Salary Predictor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2"> Salary Predictor</h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Predict job salary based on skills, seniority, and market factors
                    </p>
                  </div>
                  <SalaryPredictor />
                </div>
              </motion.div>

              {/* Category Predictor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2"> Category Predictor</h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Identify the best job category based on your skill set
                    </p>
                  </div>
                  <CategoryPredictor />
                </div>
              </motion.div>
            </div>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <InfoCard
                icon=""
                title="Real-time Predictions"
                description="Get instant salary estimates and category recommendations based on your profile"
              />
              <InfoCard
                icon=""
                title="Advanced Analytics"
                description="Powered by XGBoost models trained on over 10,000 job postings"
              />
              <InfoCard
                icon=""
                title="Market Insights"
                description="Understand trends in salary ranges and skill demand across categories"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <MLMetricsViewer />
          </motion.div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <StatCard label="Models Deployed" value="2" />
            <StatCard label="Training Samples" value="10K+" />
            <StatCard label="Features Engineered" value="40+" />
            <StatCard label="Accuracy Rate" value="85%+" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ translateY: -4 }}
      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
    </motion.div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
      <p className="text-3xl font-bold text-[hsl(var(--primary))]">{value}</p>
    </motion.div>
  );
}