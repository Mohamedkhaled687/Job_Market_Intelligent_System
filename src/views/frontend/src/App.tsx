import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { LandingPage } from "@/pages/LandingPage";
import { JobBrowserPage } from "@/pages/JobBrowserPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ComparePage } from "@/pages/ComparePage";
import { StudyPlanChat } from "@/components/StudyPlanChat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/jobs" element={<JobBrowserPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/compare" element={<ComparePage />} />
            </Routes>
          </main>
        </div>
        <StudyPlanChat />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]",
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
