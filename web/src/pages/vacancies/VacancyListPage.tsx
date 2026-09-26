import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LoadError from "@/components/LoadError";
import { vacanciesApi } from "@/services/vacancies";
import { getApiErrorMessage } from "@/lib/apiError";
import { Plus, Briefcase, ChevronRight, Loader2 } from "lucide-react";
import type { PaginationMeta, Vacancy } from "@/types";

export default function VacancyListPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadPage = useCallback((page: number) => {
    const firstPage = page === 1;
    if (firstPage) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    vacanciesApi
      .list(page)
      .then((res) => {
        setVacancies((prev) => (firstPage ? res.data.vacancies : [...prev, ...res.data.vacancies]));
        setMeta(res.data.meta);
      })
      .catch((requestError: unknown) =>
        setError(getApiErrorMessage(requestError, "Failed to load vacancies.")),
      )
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const nextPage = meta ? meta.current_page + 1 : 1;
  const hasMore = !!meta && meta.current_page < meta.total_pages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vacancies</h1>
        <Button onClick={() => navigate("/vacancies/new")}>
          <Plus className="h-4 w-4 mr-1.5" /> New Vacancy
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error && vacancies.length === 0 ? (
        <LoadError message={error} onRetry={() => loadPage(nextPage)} />
      ) : vacancies.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-sm text-muted-foreground">
          <p className="mb-3">No vacancies yet.</p>
          <Button variant="outline" onClick={() => navigate("/vacancies/new")}>
            <Plus className="h-4 w-4 mr-1.5" /> Create your first vacancy
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {vacancies.map((v) => (
            <Card
              key={v.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`/vacancies/${v.id}/edit`)}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{v.role_title}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {error && <LoadError message={error} onRetry={() => loadPage(nextPage)} />}
          {hasMore && !error && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => loadPage(nextPage)}
              disabled={loadingMore}
            >
              {loadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
