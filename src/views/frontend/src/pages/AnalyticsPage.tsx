/**
 * Analytics Page
 * Market insights and analytics dashboards
 */

import { motion } from "framer-motion";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
        <div className="container mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Market Analytics</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Comprehensive insights into job market trends, skills demand, and salary analysis
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnalyticsDashboard />
        </motion.div>
      </div>

      {/* Info Section */}
      <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 mt-12">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <InfoSection
              title="Real-time Data"
              description="All analytics are based on live job market data, updated continuously to reflect current market conditions."
            />
            <InfoSection
              title="Deep Insights"
              description="Analyze salary trends, skill demand patterns, company hiring behaviors, and market opportunities."
            />
            <InfoSection
              title="Career Planning"
              description="Use these insights to identify high-demand skills, compare salary ranges, and plan your career growth."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ translateY: -4 }}
      className="text-center"
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
