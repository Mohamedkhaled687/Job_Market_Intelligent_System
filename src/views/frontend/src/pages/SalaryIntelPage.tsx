import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Cell, ReferenceLine,
} from "recharts";
import { useSalaryIntelligence } from "@/hooks/useInsights";
import { ChartSkeleton } from "@/components/Skeleton";

const CATEGORIES = ["", "backend", "frontend", "ai", "fullstack", "data", "devops", "mobile", "design", "management", "qa"];
const SENIORITIES = ["", "junior", "mid", "senior", "lead"];
const BAR_COLOR = "hsl(221, 83%, 53%)";
const BAR_HIGHLIGHT = "hsl(280, 65%, 48%)";

export function SalaryIntelPage() {
  const [category, setCategory] = useState("");
  const [seniority, setSeniority] = useState("");

  const { data, isLoading } = useSalaryIntelligence(
    category || undefined,
    seniority || undefined,
  );

  const chartRows = useMemo(() => data?.role_comparisons ?? [], [data?.role_comparisons]);

  const chartHeight = Math.min(520, Math.max(260, chartRows.length * 36));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Salary Intelligence</h1>
        <p className="mt-1 text-[hsl(var(--muted-foreground))]">
          Salary distributions, percentiles, and role comparisons driven by your filters — no AI, only aggregated job data.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c || "All categories"}</option>
          ))}
        </select>
        <select
          value={seniority}
          onChange={(e) => setSeniority(e.target.value)}
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        >
          {SENIORITIES.map((s) => (
            <option key={s} value={s}>{s || "All seniorities"}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Median", value: data.percentiles.p50, icon: DollarSign, color: "bg-[hsl(var(--primary)/0.1)]", iconColor: "text-[hsl(var(--primary))]" },
              { label: "P75", value: data.percentiles.p75, icon: TrendingUp, color: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
              { label: "P90", value: data.percentiles.p90, icon: TrendingUp, color: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
              { label: "Sample size", value: data.count, icon: Users, color: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400", noPrefix: true },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl ${kpi.color} p-3`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {!kpi.noPrefix && "$"}<CountUp end={kpi.value} duration={1} separator="," />
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{kpi.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h3 className="text-base font-semibold mb-4">Salary distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={data.distribution}
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                  className="[&_.recharts-cartesian-axis-tick-value]:fill-[hsl(var(--muted-foreground))]"
                >
                  <XAxis
                    dataKey="range_start"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 13,
                    }}
                    labelFormatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <ReferenceLine x={data.percentiles.p50} stroke="hsl(340, 75%, 55%)" strokeDasharray="4 4" label={{ value: "Median", position: "top", fontSize: 11, fill: "hsl(340, 75%, 55%)" }} />
                  <Bar dataKey="count" name="Jobs" radius={[4, 4, 0, 0]}>
                    {data.distribution.map((_, i) => (
                      <Cell key={i} fill={BAR_COLOR} opacity={0.8} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="count" stroke="hsl(221, 83%, 43%)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col">
              <h3 className="text-base font-semibold">{data.comparison_title || "Role comparisons"}</h3>
              {data.comparison_subtitle ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 mb-4">{data.comparison_subtitle}</p>
              ) : (
                <div className="mb-4" />
              )}
              {chartRows.length === 0 ? (
                <div className="flex flex-1 min-h-[200px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  Not enough data for comparisons with the current filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={chartRows}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                    className="[&_.recharts-cartesian-axis-tick-value]:fill-[hsl(var(--muted-foreground))]"
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      width={118}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 13,
                      }}
                      formatter={(value: number, _name: string, item: { payload?: { count?: number } }) => {
                        const jobs = item.payload?.count;
                        const jobsPart = jobs != null ? ` · ${jobs} jobs` : "";
                        return [`$${value.toLocaleString()}${jobsPart}`, "Avg salary"];
                      }}
                    />
                    <Bar dataKey="avg_salary" name="Avg salary" radius={[0, 4, 4, 0]}>
                      {chartRows.map((row, i) => {
                        const isPeerHighlight =
                          data.comparison_mode === "category_at_seniority" &&
                          !!category &&
                          row.category === category;
                        return (
                          <Cell
                            key={`${row.label}-${i}`}
                            fill={isPeerHighlight ? BAR_HIGHLIGHT : BAR_COLOR}
                            opacity={isPeerHighlight ? 1 : 0.85}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
