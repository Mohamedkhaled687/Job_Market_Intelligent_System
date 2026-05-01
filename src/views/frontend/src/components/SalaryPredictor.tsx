/**
 * Salary Prediction Component
 */

import { useState } from "react";
import { Loader, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSalaryPrediction } from "@/hooks/useML";
import { SalaryPredictionInput } from "@/hooks/useML";

export function SalaryPredictor() {
  const [formData, setFormData] = useState<SalaryPredictionInput>({
    seniority: "mid",
    skill_count: 5,
    unique_skills: 5,
    has_python: 1,
    has_react: 0,
    has_aws: 0,
    has_kubernetes: 0,
    is_backend: 1,
    is_frontend: 0,
    is_devops: 0,
    company_job_count: 5,
    days_posted: 0,
  });

  const { mutate: predict, isPending, data, error } = useSalaryPrediction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    predict(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name.startsWith("is_") || name.startsWith("has_") ? parseInt(value) : 
              ["skill_count", "unique_skills", "company_job_count", "days_posted"].includes(name) ? parseInt(value) : value,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-6 w-6 text-[hsl(var(--primary))]" />
          <h2 className="text-2xl font-bold">Salary Predictor</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seniority */}
          <div>
            <label className="block text-sm font-medium mb-2">Seniority Level</label>
            <select
              name="seniority"
              value={formData.seniority}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Total Skills</label>
              <input
                type="number"
                name="skill_count"
                value={formData.skill_count}
                onChange={handleChange}
                min="0"
                max="20"
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Unique Skills</label>
              <input
                type="number"
                name="unique_skills"
                value={formData.unique_skills}
                onChange={handleChange}
                min="0"
                max="20"
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              />
            </div>
          </div>

          {/* Key Skills Checkboxes */}
          <div>
            <label className="block text-sm font-medium mb-2">Key Skills</label>
            <div className="grid grid-cols-2 gap-3">
              {["has_python", "has_react", "has_aws", "has_kubernetes"].map((skill) => (
                <label key={skill} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={skill}
                    checked={formData[skill as keyof SalaryPredictionInput] === 1}
                    onChange={(e) =>
                      handleChange({
                        ...e,
                        target: {
                          ...e.target,
                          value: e.target.checked ? "1" : "0",
                        },
                      } as any)
                    }
                    className="rounded"
                  />
                  <span className="text-sm">{skill.replace("has_", "").toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category Indicators */}
          <div>
            <label className="block text-sm font-medium mb-2">Job Category</label>
            <div className="flex gap-2">
              {[
                { name: "is_backend", label: "Backend" },
                { name: "is_frontend", label: "Frontend" },
                { name: "is_devops", label: "DevOps" },
              ].map((category) => (
                <button
                  key={category.name}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      is_backend: 0,
                      is_frontend: 0,
                      is_devops: 0,
                      [category.name]: 1,
                    })
                  }
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    formData[category.name as keyof SalaryPredictionInput] === 1
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Job Count</label>
              <input
                type="number"
                name="company_job_count"
                value={formData.company_job_count}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Days Posted</label>
              <input
                type="number"
                name="days_posted"
                value={formData.days_posted}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full px-4 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isPending ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Predicting...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Predict Salary
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      <AnimatePresence>
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Prediction Card */}
            <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-6">
              <h3 className="font-semibold text-lg mb-4">Salary Prediction Results</h3>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-950 rounded-lg p-4">
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Predicted Salary</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${data.predicted_salary.toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950 rounded-lg p-4">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Lower Bound</p>
                    <p className="text-lg font-semibold">
                      ${data.confidence_interval.lower.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-950 rounded-lg p-4">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Upper Bound</p>
                    <p className="text-lg font-semibold">
                      ${data.confidence_interval.upper.toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Confidence Interval: ±15% (80% confidence level)
                </p>
              </div>
            </div>

            {/* Market Context Card */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span>📊</span> Market Benchmark
              </h3>
              
              <div className="space-y-3">
                <MarketBenchmark 
                  category={formData.is_backend ? "Backend" : formData.is_frontend ? "Frontend" : "DevOps"}
                  seniority={formData.seniority}
                  predicted={data.predicted_salary}
                />
                
                <div className="bg-white dark:bg-slate-950 rounded-lg p-3 mt-4">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Salary Improvement Tips</p>
                  <ul className="text-sm space-y-1">
                    <li>✓ Adding AWS expertise could increase salary by ~8%</li>
                    <li>✓ Moving to Senior level increases salary by ~25%</li>
                    <li>✓ Expanding to 10+ skills could boost earnings by ~12%</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-300"
          >
            <p className="font-semibold">Prediction Error</p>
            <p className="text-sm">{(error as any).message || "Failed to predict salary"}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarketBenchmark({ category, seniority, predicted }: { category: string; seniority: string; predicted: number }) {
  // Market average salary data (estimated from typical market ranges)
  const marketAverages: Record<string, Record<string, number>> = {
    Backend: { junior: 35000, mid: 60000, senior: 95000, lead: 130000 },
    Frontend: { junior: 32000, mid: 55000, senior: 85000, lead: 120000 },
    DevOps: { junior: 40000, mid: 70000, senior: 110000, lead: 150000 },
  };

  const marketAvg = marketAverages[category]?.[seniority] || 60000;
  const difference = predicted - marketAvg;
  const percentDiff = ((difference / marketAvg) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-950 rounded-lg p-3">
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Market Avg</p>
        <p className="text-lg font-semibold">${marketAvg.toLocaleString()}</p>
      </div>
      <div className="bg-white dark:bg-slate-950 rounded-lg p-3">
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Your Prediction</p>
        <p className="text-lg font-semibold">${predicted.toLocaleString()}</p>
      </div>
      <div className={`rounded-lg p-3 ${difference > 0 ? "bg-green-100 dark:bg-green-900" : "bg-orange-100 dark:bg-orange-900"}`}>
        <p className="text-xs font-medium mb-1">vs Market</p>
        <p className={`text-lg font-bold ${difference > 0 ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"}`}>
          {difference > 0 ? "+" : ""}{percentDiff}%
        </p>
      </div>
    </div>
  );
}
