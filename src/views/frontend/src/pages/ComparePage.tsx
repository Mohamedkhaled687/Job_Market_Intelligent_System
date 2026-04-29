import { useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/hooks/useInsights";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend,
} from "recharts";
import { ChartSkeleton } from "@/components/Skeleton";

const COLORS = ["hsl(221, 83%, 53%)", "hsl(160, 60%, 45%)", "hsl(340, 75%, 55%)"];

export function ComparePage() {
  const { data, isLoading } = useDashboard();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const allSkills = data?.top_skills || [];
  const filtered = allSkills.filter(
    (s) =>
      s.skill.toLowerCase().includes(search.toLowerCase()) &&
      !selected.includes(s.skill)
  );

  const addSkill = (skill: string) => {
    if (selected.length < 3) {
      setSelected([...selected, skill]);
      setSearch("");
    }
  };
  const removeSkill = (skill: string) => {
    setSelected(selected.filter((s) => s !== skill));
  };

  const maxCount = Math.max(...allSkills.map((s) => s.count), 1);
  const radarData = [
    { metric: "Demand" },
    { metric: "Relative Rank" },
    { metric: "Market Share %" },
  ].map((item) => {
    const out: Record<string, string | number> = { metric: item.metric };
    selected.forEach((skill) => {
      const entry = allSkills.find((s) => s.skill === skill);
      if (!entry) return;
      const rank = allSkills.findIndex((s) => s.skill === skill) + 1;
      if (item.metric === "Demand") out[skill] = Math.round((entry.count / maxCount) * 100);
      else if (item.metric === "Relative Rank") out[skill] = Math.round(((allSkills.length - rank + 1) / allSkills.length) * 100);
      else out[skill] = data ? Math.round((entry.count / data.total_jobs) * 100) : 0;
    });
    return out;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Skill Comparison</h1>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Skill Comparison</h1>
      <p className="text-[hsl(var(--muted-foreground))]">
        Select up to 3 skills to compare their market demand side by side.
      </p>

      {/* Selected chips */}
      <div className="flex flex-wrap items-center gap-2">
        <AnimatePresence>
          {selected.map((skill, i) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: COLORS[i] }}
            >
              {skill}
              <button onClick={() => removeSkill(skill)} className="hover:opacity-70">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {selected.length < 3 && (
          <div className="relative">
            <div className="flex items-center gap-1 rounded-full border border-dashed border-[hsl(var(--border))] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Add skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-32 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
            {search && filtered.length > 0 && (
              <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
                {filtered.slice(0, 8).map((s) => (
                  <button
                    key={s.skill}
                    onClick={() => addSkill(s.skill)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <span>{s.skill}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{s.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison Panels */}
      {selected.length >= 2 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Radar Chart */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h3 className="text-base font-semibold mb-4">Relative Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                {selected.map((skill, i) => (
                  <Radar
                    key={skill}
                    name={skill}
                    dataKey={skill}
                    stroke={COLORS[i]}
                    fill={COLORS[i]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Table */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h3 className="text-base font-semibold mb-4">Detailed Stats</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="pb-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Metric</th>
                  {selected.map((skill, i) => (
                    <th key={skill} className="pb-2 text-right font-medium" style={{ color: COLORS[i] }}>
                      {skill}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                <tr>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">Job Count</td>
                  {selected.map((skill) => {
                    const entry = allSkills.find((s) => s.skill === skill);
                    return <td key={skill} className="py-3 text-right font-medium">{entry?.count || 0}</td>;
                  })}
                </tr>
                <tr>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">Rank</td>
                  {selected.map((skill) => {
                    const rank = allSkills.findIndex((s) => s.skill === skill) + 1;
                    return <td key={skill} className="py-3 text-right font-medium">#{rank}</td>;
                  })}
                </tr>
                <tr>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">Market Share</td>
                  {selected.map((skill) => {
                    const entry = allSkills.find((s) => s.skill === skill);
                    const pct = data ? ((entry?.count || 0) / data.total_jobs * 100).toFixed(1) : "0";
                    return <td key={skill} className="py-3 text-right font-medium">{pct}%</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center">
          <Plus className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-4 text-[hsl(var(--muted-foreground))]">
            Select at least 2 skills to see the comparison
          </p>
        </div>
      )}
    </div>
  );
}
