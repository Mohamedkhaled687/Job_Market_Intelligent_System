/**
 * Category Prediction Component
 */

import { useState } from "react";
import { Loader, Tag, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCategoryPrediction } from "@/hooks/useML";
import { CategoryPredictionInput } from "@/hooks/useML";

const TOP_SKILLS = [
  "python", "javascript", "typescript", "java", "react", "vue",
  "nodejs", "django", "fastapi", "postgresql", "mongodb",
  "aws", "docker", "kubernetes", "git", "rest", "graphql"
];

export function CategoryPredictor() {
  const [formData, setFormData] = useState<CategoryPredictionInput>({
    seniority: "mid",
    skill_count: 5,
    unique_skills: 5,
    has_python: 1,
    has_react: 0,
    has_aws: 0,
    has_kubernetes: 0,
    company_job_count: 5,
    salary_estimate: 100000,
    days_posted: 0,
    skills: ["python", "react"],
  });

  const { mutate: predict, isPending, data, error } = useCategoryPrediction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    predict(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ["skill_count", "unique_skills", "company_job_count", "salary_estimate", "days_posted"].includes(name)
        ? parseInt(value)
        : value,
    });
  };

  const toggleSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.includes(skill)
        ? formData.skills.filter((s) => s !== skill)
        : [...(formData.skills || []), skill],
    });
  };

  const CATEGORY_COLORS: Record<string, string> = {
    Backend: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700",
    Frontend: "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 border-purple-300 dark:border-purple-700",
    DevOps: "bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 border-orange-300 dark:border-orange-700",
    "Full-Stack": "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-300 dark:border-green-700",
    Data: "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700",
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Tag className="h-6 w-6 text-[hsl(var(--primary))]" />
          <h2 className="text-2xl font-bold">Job Category Predictor</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seniority */}
          <div>
            <label className="block text-sm font-medium mb-2">Seniority Level</label>
            <select
              name="seniority"
              value={formData.seniority}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          {/* Skills Section */}
          <div>
            <label className="block text-sm font-medium mb-3">Select Skills</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOP_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    formData.skills?.includes(skill)
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  {formData.skills?.includes(skill) && <Check className="w-3 h-3 inline mr-1" />}
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Total Skills</label>
              <input
                type="number"
                name="skill_count"
                value={formData.skill_count}
                onChange={handleChange}
                min="0"
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
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              />
            </div>
          </div>

          {/* Market Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Salary Estimate ($)</label>
              <input
                type="number"
                name="salary_estimate"
                value={formData.salary_estimate}
                onChange={handleChange}
                min="0"
                step="10000"
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              />
            </div>
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full px-4 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isPending ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Classifying...
              </>
            ) : (
              <>
                <Tag className="h-4 w-4" />
                Predict Category
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
            {/* Main Prediction */}
            <div className={`rounded-xl border-2 p-6 ${CATEGORY_COLORS[data.predicted_category] || CATEGORY_COLORS.Backend}`}>
              <p className="text-sm font-medium opacity-75 mb-2">Predicted Category</p>
              <h3 className="text-3xl font-bold mb-2">{data.predicted_category}</h3>
              
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-current opacity-75"
                    style={{ width: `${data.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold ml-2">
                  {(data.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Top 3 Predictions */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-3">
              <h4 className="font-semibold mb-4">Top 3 Predictions</h4>
              {data.top_3_predictions.map((pred, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))]">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-[hsl(var(--primary))]">{idx + 1}</div>
                    <span className="font-medium">{pred.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--primary))]"
                        style={{ width: `${pred.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">
                      {(pred.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence Note */}
            {data.confidence < 0.7 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Low Confidence</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    The model has lower confidence in this prediction. Consider the alternative categories above.
                  </p>
                </div>
              </div>
            )}

            {/* Skill Recommendations */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <span>🎯</span> Recommended Skills
              </h4>
              <SkillRecommendations category={data.predicted_category} currentSkills={formData.skills || []} />
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
            <p className="text-sm">{(error as any).message || "Failed to predict category"}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillRecommendations({ category, currentSkills }: { category: string; currentSkills: string[] }) {
  // Recommended skills by category
  const skillRecommendations: Record<string, { skill: string; importance: "critical" | "recommended" | "nice-to-have" }[]> = {
    Backend: [
      { skill: "Python", importance: "critical" },
      { skill: "Django", importance: "critical" },
      { skill: "PostgreSQL", importance: "critical" },
      { skill: "Docker", importance: "recommended" },
      { skill: "REST", importance: "recommended" },
      { skill: "AWS", importance: "nice-to-have" },
    ],
    Frontend: [
      { skill: "React", importance: "critical" },
      { skill: "TypeScript", importance: "critical" },
      { skill: "Vue", importance: "recommended" },
      { skill: "CSS", importance: "critical" },
      { skill: "GraphQL", importance: "recommended" },
    ],
    DevOps: [
      { skill: "Docker", importance: "critical" },
      { skill: "Kubernetes", importance: "critical" },
      { skill: "AWS", importance: "critical" },
      { skill: "CI/CD", importance: "recommended" },
      { skill: "Terraform", importance: "recommended" },
    ],
    "Full-Stack": [
      { skill: "React", importance: "critical" },
      { skill: "Django", importance: "critical" },
      { skill: "PostgreSQL", importance: "critical" },
      { skill: "Docker", importance: "recommended" },
    ],
    Data: [
      { skill: "Python", importance: "critical" },
      { skill: "SQL", importance: "critical" },
      { skill: "Machine Learning", importance: "critical" },
    ],
  };

  const recommendations = skillRecommendations[category] || [];
  const missingSkills = recommendations.filter(r => !currentSkills.includes(r.skill));

  return (
    <div className="space-y-3">
      {missingSkills.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Great! You have all recommended skills. Keep learning!</p>
      ) : (
        <>
          <div className="space-y-2">
            {missingSkills.slice(0, 3).map((skill, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-950 rounded-lg">
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  skill.importance === "critical" ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200" :
                  skill.importance === "recommended" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200" :
                  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                }`}>
                  {skill.importance === "critical" ? "⭐ Critical" : skill.importance === "recommended" ? "📈 Recommended" : "✨ Nice-to-have"}
                </div>
                <span className="text-sm font-medium">{skill.skill}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
            {missingSkills.length} more skill{missingSkills.length > 1 ? "s" : ""} recommended. Learning these skills will increase your competitiveness!
          </p>
        </>
      )}
    </div>
  );
}
