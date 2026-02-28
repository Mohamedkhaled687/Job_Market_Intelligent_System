import { Link } from "react-router-dom";
import { Briefcase, TrendingUp, DollarSign, Building2, ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboard } from "@/hooks/useInsights";
import { KPICard } from "@/components/KPICard";
import { SkillTag } from "@/components/SkillTag";
import { Skeleton } from "@/components/Skeleton";
import { useFilterStore } from "@/store/filterStore";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function LandingPage() {
  const { data, isLoading } = useDashboard();
  const navigate = useNavigate();
  const setFilter = useFilterStore((s) => s.setFilter);
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setFilter("search", searchValue.trim());
      navigate("/jobs");
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(260,80%,50%)] p-8 sm:p-12 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0xMiA2MGMxLjY1NyAwIDMtMS4zNDMgMy0zcy0xLjM0My0zLTMtMy0zIDEuMzQzLTMgMyAxLjM0MyAzIDMgM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Job Market Intelligence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 max-w-2xl text-lg text-white/80"
          >
            AI-powered insights into the Egyptian tech job market.
            Track skills, salaries, and trends in real time.
          </motion.p>

          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex max-w-xl gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs by title or skill..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-10 pr-4 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-white px-6 py-3 font-medium text-[hsl(var(--primary))] hover:bg-white/90 transition-colors"
            >
              Search
            </button>
          </motion.form>
        </div>
      </section>

      {/* KPIs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Market Snapshot</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-2xl" />
            ))}
          </div>
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Total Jobs" value={data.total_jobs} icon={Briefcase} />
            <KPICard title="Top Skill Demand" value={data.top_skills[0]?.count || 0} suffix={` (${data.top_skills[0]?.skill || "N/A"})`} icon={TrendingUp} />
            <KPICard title="Avg Salary" value={data.salary_stats.avg_salary} prefix="$" icon={DollarSign} />
            <KPICard title="Companies Hiring" value={data.top_companies.length} icon={Building2} />
          </div>
        ) : null}
      </section>

      {/* Trending Skills */}
      {data && data.top_skills.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Trending Skills</h2>
          <div className="flex flex-wrap gap-2">
            {data.top_skills.map(({ skill, count }) => (
              <motion.button
                key={skill}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setFilter("skill", skill);
                  navigate("/jobs");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm font-medium hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                {skill}
                <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {count}
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Quick Nav */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/jobs"
          className="group flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-all hover:border-[hsl(var(--primary))] hover:shadow-md"
        >
          <div>
            <h3 className="font-semibold">Browse Jobs</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Filter, search, and explore all scraped job listings
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
        </Link>
        <Link
          to="/dashboard"
          className="group flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-all hover:border-[hsl(var(--primary))] hover:shadow-md"
        >
          <div>
            <h3 className="font-semibold">Analytics Dashboard</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Charts, trends, and salary distributions
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
        </Link>
      </section>
    </div>
  );
}
