import { Search, X } from "lucide-react";
import { useFilterStore } from "@/store/filterStore";

export function FilterBar() {
  const { company, location, skill, seniority, category, search, setFilter, resetFilters } = useFilterStore();
  const hasFilters = company || location || skill || seniority || category || search;

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          placeholder="Search jobs by title, company, or description..."
          value={search}
          onChange={(e) => setFilter("search", e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
        />
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setFilter("company", e.target.value)}
          className="rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setFilter("location", e.target.value)}
          className="rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
        <input
          placeholder="Skill"
          value={skill}
          onChange={(e) => setFilter("skill", e.target.value)}
          className="rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
        <select
          value={seniority}
          onChange={(e) => setFilter("seniority", e.target.value)}
          className="rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          <option value="">All Levels</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>
        <select
          value={category}
          onChange={(e) => setFilter("category", e.target.value)}
          className="rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          <option value="">All Categories</option>
          <option value="backend">Backend</option>
          <option value="frontend">Frontend</option>
          <option value="fullstack">Full Stack</option>
          <option value="data">Data</option>
          <option value="devops">DevOps</option>
          <option value="mobile">Mobile</option>
          <option value="design">Design</option>
          <option value="management">Management</option>
          <option value="qa">QA</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}
