import { Outlet } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function CandidateLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal header — no nav */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center">
          <span className="font-semibold text-sm text-muted-foreground">AI Interview</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <ErrorBoundary fullScreen={false}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
