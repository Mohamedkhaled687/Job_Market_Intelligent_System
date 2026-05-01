import React, { useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  Brain, BarChart2, TrendingUp, Zap, 
  ChevronRight, Info, Search 
} from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { SkillHeatmap, SkillClusterCard } from '../components/SkillHeatmap';
import {
  useSkillClustering,
  useKMeansClustering,
  useElbowData,
} from '../hooks/useClustering';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const ClusteringAnalysisPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [kValue, setKValue] = useState(5);
  
  const skillClustering = useSkillClustering(5, selectedCategory);
  const kmeansClustering = useKMeansClustering(kValue);
  const elbowData = useElbowData();

  const categories = [
    'backend', 'frontend', 'fullstack', 'data', 'devops', 
    'mobile', 'ai', 'qa', 'design', 'management', 'cybersecurity'
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] space-y-10 pb-20">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight uppercase">Clustering Analysis</h1>
          </div>
          <p className="text-xl text-blue-50/90 leading-relaxed font-medium">
            Discover hidden skill patterns and market segments using K-Means clustering 
            and PCA-based visualization.
          </p>
        </div>
        <div className="absolute top-[-20%] right-[-10%] opacity-10">
          <Brain className="h-96 w-96" />
        </div>
      </section>

      {/* Elbow Method & Parameters */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
          <section className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-500" />
              Optimal Clusters (Elbow)
            </h2>
            <div className="h-48 w-full">
              {elbowData.isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={elbowData.data?.elbow_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="k" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line type="monotone" dataKey="wss" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-6 space-y-4">
              <label className="text-sm font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
                Cluster Count (K)
              </label>
              <input 
                type="range" min="2" max="10" step="1" 
                value={kValue} onChange={(e) => setKValue(parseInt(e.target.value))}
                className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between font-bold text-indigo-600">
                <span>Current: K = {kValue}</span>
                {kmeansClustering.data?.silhouette_score && (
                  <span className="text-emerald-600">Score: {kmeansClustering.data.silhouette_score.toFixed(3)}</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Quick Filters</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedCategory(undefined)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!selectedCategory ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[hsl(var(--muted))] hover:bg-indigo-50 text-[hsl(var(--foreground))]'}`}
              >
                ALL CATEGORIES
              </button>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[hsl(var(--muted))] hover:bg-indigo-50 text-[hsl(var(--foreground))]'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* PCA Plot */}
        <div className="lg:col-span-2">
          <section className="h-full rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-blue-500" />
                Skill Map (PCA 2D)
              </h2>
              <div className="flex gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                {kmeansClustering.data?.clusters.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>Cluster {i}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              {kmeansClustering.isLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="x" hide />
                    <YAxis type="number" dataKey="y" hide />
                    <ZAxis type="number" range={[100, 400]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 rounded-2xl shadow-xl">
                              <p className="font-black text-indigo-600">{data.title}</p>
                              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">{data.company}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {data.skills.slice(0, 3).map((s: string) => (
                                  <span key={s} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {kmeansClustering.data?.clusters.map((c, i) => (
                      <Scatter 
                        key={i} 
                        name={`Cluster ${i}`} 
                        data={kmeansClustering.data?.plot_points?.filter(p => p.cluster === i)} 
                        fill={COLORS[i % COLORS.length]} 
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Cluster Details */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 px-2">
          <Search className="h-6 w-6 text-indigo-500" />
          Cluster Breakdowns
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {kmeansClustering.isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)
          ) : (
            kmeansClustering.data?.clusters.map((cluster, i) => (
              <div 
                key={i} 
                className="group relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm transition-all hover:border-indigo-500 hover:shadow-xl"
              >
                <div className="absolute top-0 right-0 h-2 w-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-100">{cluster.name}</h3>
                    <p className="text-sm font-bold text-[hsl(var(--muted-foreground))]">{cluster.count} Jobs Identifed</p>
                  </div>
                  <span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    CL-{cluster.cluster_id}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {cluster.top_skills.map(skill => (
                      <span key={skill} className="rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-1 text-xs font-bold text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <p className="text-xs font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">Sample Roles</p>
                    <div className="space-y-2">
                      {cluster.sample_jobs.slice(0, 3).map((job, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3 text-indigo-500" />
                          <span className="font-medium truncate">{job.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Heatmap Section (Original Heatmap kept but improved style) */}
      <section className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Skill Co-Occurrence</h2>
            <p className="text-[hsl(var(--muted-foreground))] font-medium mt-1">Correlation matrix of frequently required technologies</p>
          </div>
          {skillClustering.data && (
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase">Total Jobs</p>
                <p className="text-xl font-black">{skillClustering.data.job_count}</p>
              </div>
              <div className="text-right border-l border-[hsl(var(--border))] pl-4">
                <p className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase">Unique Skills</p>
                <p className="text-xl font-black">{skillClustering.data.unique_skill_count}</p>
              </div>
            </div>
          )}
        </div>
        
        {skillClustering.isLoading ? (
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-slate-900 p-4">
            <SkillHeatmap 
              skills={skillClustering.data?.skills || []} 
              heatmap={skillClustering.data?.heatmap || []} 
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default ClusteringAnalysisPage;
