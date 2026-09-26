import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import ComparisonTable from "@/components/fitgap/ComparisonTable";
import LoadError from "@/components/LoadError";
import { portfoliosApi } from "@/services/portfolios";
import { sessionsApi } from "@/services/sessions";
import { usePolling } from "@/hooks/usePolling";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/apiError";
import { LEVEL_LABELS, parseLevel } from "@/utils/constants";
import { downloadBlob } from "@/utils/download";
import { ArrowLeft, Download, Loader2, RefreshCw, Zap } from "lucide-react";
import type { FitGapReport, Portfolio } from "@/types";

// Reports normally finish within a few minutes; stop polling well past that so a stuck job is visible.
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

export default function FitGapReportPage() {
  const { id, sessionId, vacancyId } = useParams<{
    id: string;
    sessionId: string;
    vacancyId: string;
  }>();

  const [report, setReport] = useState<FitGapReport | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [portfolioNotReady, setPortfolioNotReady] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const startGenerating = () => {
    setGenerating(true);
    setGenerationTimedOut(false);
    setGenerationStartedAt(Date.now());
  };

  const fetchReport = useCallback(async () => {
    if (!portfolio) return;
    setReportError(null);
    try {
      const res = await portfoliosApi.getFitGap(portfolio.id, Number(vacancyId));
      setReport(res.data.report);
      setGenerating(false);
    } catch (requestError: unknown) {
      if (getApiErrorStatus(requestError) !== 404) {
        setReportError(getApiErrorMessage(requestError, "Failed to load the fit/gap report."));
        return;
      }
      try {
        const res = await portfoliosApi.triggerFitGap(portfolio.id, Number(vacancyId));
        // The API returns an existing report directly instead of queueing a new one.
        if ("report" in res.data) {
          setReport(res.data.report);
          setGenerating(false);
        } else {
          setGenerating(true);
          setGenerationStartedAt((startedAt) => startedAt ?? Date.now());
        }
      } catch (triggerError: unknown) {
        setGenerating(false);
        setReportError(getApiErrorMessage(triggerError, "Failed to start the fit/gap analysis."));
      }
    }
  }, [portfolio, vacancyId]);

  const loadPortfolio = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    sessionsApi
      .getPortfolio(Number(sessionId))
      .then((res) => {
        const data = res.data;
        if ("portfolio" in data && data.portfolio.generation_status === "complete") {
          setPortfolio(data.portfolio);
          setPortfolioNotReady(false);
        } else {
          setPortfolioNotReady(true);
        }
      })
      .catch((requestError: unknown) =>
        setLoadError(getApiErrorMessage(requestError, "Failed to load the portfolio.")),
      )
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    if (portfolio) fetchReport();
  }, [portfolio, fetchReport]);

  const pollReport = useCallback(async () => {
    if (generationStartedAt && Date.now() - generationStartedAt > GENERATION_TIMEOUT_MS) {
      setGenerationTimedOut(true);
      return;
    }
    if (!portfolio) return;
    try {
      const res = await portfoliosApi.getFitGap(portfolio.id, Number(vacancyId));
      setReport(res.data.report);
      setGenerating(false);
    } catch {
      // Still generating (404) or a transient failure — try again on the next interval.
    }
  }, [portfolio, vacancyId, generationStartedAt]);

  usePolling(pollReport, 5000, generating && !generationTimedOut && !!portfolio);

  const handleRegenerate = async () => {
    if (!portfolio) return;
    setRegenerating(true);
    setActionError(null);
    try {
      await portfoliosApi.regenerateFitGap(portfolio.id, Number(vacancyId));
      setReport(null);
      startGenerating();
    } catch (requestError: unknown) {
      setActionError(getApiErrorMessage(requestError, "Failed to regenerate the report."));
    } finally {
      setRegenerating(false);
    }
  };

  const handleExport = async (format: "pdf" | "json") => {
    if (!portfolio) return;
    setExporting(format);
    setActionError(null);
    try {
      const res = await portfoliosApi.exportPortfolio(portfolio.id, format, Number(vacancyId));
      const blob =
        format === "pdf"
          ? new Blob([res.data as BlobPart], { type: "application/pdf" })
          : new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `fitgap-${sessionId}-${vacancyId}.${format}`);
    } catch (requestError: unknown) {
      setActionError(getApiErrorMessage(requestError, "Export failed. Please try again."));
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/assessments/${id}/sessions/${sessionId}/portfolio`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold">Fit/Gap Report</h1>
          </div>
        </div>

        {portfolio && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating || generating}
            >
              {regenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Regenerate
            </Button>
            {report && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  disabled={!!exporting}
                >
                  {exporting === "pdf" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("json")}
                  disabled={!!exporting}
                >
                  {exporting === "json" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1" />
                  )}
                  JSON
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {loadError && <LoadError message={loadError} onRetry={loadPortfolio} />}

      {portfolioNotReady && (
        <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
          The portfolio isn't ready yet. Fit/gap analysis can run once portfolio generation has
          finished.
        </div>
      )}

      {reportError && <LoadError message={reportError} onRetry={fetchReport} />}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {generating && generationTimedOut && (
        <div className="border border-amber-300 rounded-lg p-6 text-center space-y-3">
          <p className="text-sm">
            The fit/gap report is taking longer than expected. It may still finish, or the job may
            be stuck.
          </p>
          <Button variant="outline" size="sm" onClick={startGenerating}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Check again
          </Button>
        </div>
      )}

      {/* Generating */}
      {generating && !generationTimedOut && (
        <div className="border rounded-lg p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Generating fit/gap report...</p>
        </div>
      )}

      {/* Report ready */}
      {report && (
        <>
          {/* Skill comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Skill Comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ComparisonTable comparisons={report.skill_comparisons} />
            </CardContent>
          </Card>

          <Separator />

          {/* Culture & competency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Culture &amp; Competency Fit</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {report.culture_narrative || report.overall_narrative}
              </p>
            </CardContent>
          </Card>

          {/* Discovered skills */}
          {portfolio && portfolio.skills.some((s) => s.is_discovered) && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Discovered Skills (not in vacancy requirements)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {portfolio.skills
                    .filter((s) => s.is_discovered)
                    .map((s) => (
                      <div key={s.id} className="text-sm flex items-center gap-2">
                        <span className="font-medium">{s.skill_label}</span>
                        <span className="text-muted-foreground">
                          {LEVEL_LABELS[parseLevel(s.ai_level) ?? 0] ?? "Unrated"} (
                          {s.ai_confidence?.toLowerCase() === "low"
                            ? "low confidence"
                            : "confirmed"}
                          )
                        </span>
                        <span className="text-xs text-muted-foreground">
                          — Not required for this role, may be additive.
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
