import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadError from "@/components/LoadError";
import EmptyState from "@/components/EmptyState";
import Notice from "@/components/Notice";
import SessionStatusBadge from "@/components/SessionStatusBadge";
import PageHeader from "@/components/layout/PageHeader";
import { assessmentsApi } from "@/services/assessments";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/apiError";
import { copyText } from "@/utils/clipboard";
import { MAX_TEXT_FIELD_LENGTH } from "@/utils/validation";
import { LEVEL_LABELS } from "@/utils/constants";
import { ArrowRight, Copy, Check, Eye, Pencil, Clock, Plus, UserRound, Link2 } from "lucide-react";
import type { Assessment, Session } from "@/types";

// key is a session id, or "new" for the link card shown right after creating a session.
interface CopyResult {
  key: number | "new";
  ok: boolean;
}

function SessionRow({
  session,
  index,
  assessmentId,
  onCopy,
  copyResult,
}: {
  session: Session;
  index: number;
  assessmentId: string;
  onCopy: (id: number) => void;
  copyResult: CopyResult | null;
}) {
  const navigate = useNavigate();
  const isLive = session.status === "active";
  const isEnded = session.status === "ended";
  const isPending = session.status === "pending";
  const displayName = session.candidate_name || `Candidate ${index}`;

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rakamin-light-cyan text-xs font-semibold text-primary">
          {index}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium">{displayName}</div>
          {session.started_at && (
            <div className="text-xs text-muted-foreground">
              Started {new Date(session.started_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
        <SessionStatusBadge session={session} />
        {isPending && (
          <Button variant="ghost" size="sm" onClick={() => onCopy(session.id)}>
            {copyResult?.key === session.id && copyResult.ok ? (
              <>
                <Check /> Copied
              </>
            ) : copyResult?.key === session.id ? (
              <span className="text-destructive">Copy failed — copy the link manually</span>
            ) : (
              <>
                <Copy /> Copy link
              </>
            )}
          </Button>
        )}
        {isLive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/assessments/${assessmentId}/sessions/${session.id}/monitor`)}
          >
            <Eye /> Monitor
          </Button>
        )}
        {isEnded && session.end_reason !== "error" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`/assessments/${assessmentId}/sessions/${session.id}/portfolio`)
            }
          >
            Results <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AssessmentInvitePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newSession, setNewSession] = useState<Session | null>(null);
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [candidateNameInput, setCandidateNameInput] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      const res = await assessmentsApi.getSessions(Number(id));
      setSessions(res.data.sessions);
    } catch {
      // Transient poll failure — keep the current list and retry on the next interval.
    }
  }, [id]);

  const loadPage = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([assessmentsApi.get(Number(id)), assessmentsApi.getSessions(Number(id))])
      .then(([aRes, sRes]) => {
        setAssessment(aRes.data.assessment);
        setSessions(sRes.data.sessions);
      })
      .catch((requestError: unknown) =>
        setLoadError(
          getApiErrorStatus(requestError) === 404
            ? "This assessment doesn't exist or was deleted."
            : getApiErrorMessage(requestError, "Failed to load the assessment."),
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // Poll while any session is live or pending
  useEffect(() => {
    const hasActive = sessions.some((s) => s.status !== "ended");
    if (!hasActive) return;
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [sessions, loadSessions]);

  const openInviteDialog = () => {
    setCandidateNameInput("");
    setInviteError(null);
    setShowInviteDialog(true);
  };

  const handleInviteCandidate = async () => {
    // Enter and a click can both fire before the first request resolves.
    if (creatingSession) return;
    setCreatingSession(true);
    setInviteError(null);
    try {
      const res = await assessmentsApi.createSession(
        Number(id),
        candidateNameInput.trim() || undefined,
      );
      const created = res.data.session;
      setNewSession(created);
      setSessions((prev) => [created, ...prev]);
      setShowInviteDialog(false);
    } catch (requestError: unknown) {
      setInviteError(getApiErrorMessage(requestError, "Failed to create the invite link."));
    } finally {
      setCreatingSession(false);
    }
  };

  const copyLink = async (url: string, key: CopyResult["key"]) => {
    const ok = await copyText(url);
    setCopyResult({ key, ok });
    if (ok) setTimeout(() => setCopyResult(null), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader backTo="/assessments" backLabel="Back to assessments" title="Assessment" />
        <LoadError message={loadError} onRetry={loadPage} />
      </div>
    );
  }

  const skillCount = assessment?.skills?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backTo="/assessments"
        backLabel="Back to assessments"
        eyebrow="Assessment"
        title={assessment?.name ?? "—"}
        description={
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {assessment?.time_limit_min} min · {skillCount} skill{skillCount === 1 ? "" : "s"}
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/assessments/${id}/edit`)}>
              <Pencil /> Edit
            </Button>
            <Button onClick={openInviteDialog} disabled={creatingSession}>
              <Plus />
              {creatingSession ? "Creating..." : "Invite Candidate"}
            </Button>
          </>
        }
      />

      {/* Invite candidate dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="candidate-name">Candidate name</Label>
            <Input
              id="candidate-name"
              placeholder="e.g. Budi Santoso"
              maxLength={MAX_TEXT_FIELD_LENGTH}
              value={candidateNameInput}
              onChange={(e) => setCandidateNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteCandidate()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Optional — helps you identify this session later.
            </p>
            {inviteError && <Notice variant="error">{inviteError}</Notice>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteCandidate} disabled={creatingSession}>
              {creatingSession ? "Creating..." : "Create Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Newly created session invite link */}
      {newSession && (
        <div className="bg-brand-gradient space-y-3 rounded-3xl border border-rakamin-teal/20 p-5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            {newSession.candidate_name ? (
              <span>
                Link for <span className="font-semibold">{newSession.candidate_name}</span> ready —
                share with your candidate:
              </span>
            ) : (
              <span>New invite link ready — share with your candidate:</span>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <span className="flex-1 select-all truncate rounded-full border bg-card px-4 py-2.5 font-mono text-sm text-muted-foreground">
              {newSession.invite_url}
            </span>
            <Button onClick={() => copyLink(newSession.invite_url, "new")}>
              {copyResult?.key === "new" && copyResult.ok ? (
                <>
                  <Check /> Copied!
                </>
              ) : (
                <>
                  <Copy /> Copy link
                </>
              )}
            </Button>
          </div>
          {copyResult?.key === "new" && !copyResult.ok && (
            <Notice variant="error">
              Copy failed — select the link above and copy it manually
            </Notice>
          )}
        </div>
      )}

      {/* Sessions list */}
      <section className="space-y-3">
        <h2 className="font-semibold">
          Candidates
          {sessions.length > 0 && (
            <span className="ml-1.5 font-normal text-muted-foreground">({sessions.length})</span>
          )}
        </h2>

        {sessions.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No candidates yet"
            description='Click "Invite Candidate" to generate an interview link.'
          />
        ) : (
          <Card className="divide-y overflow-hidden">
            {sessions.map((session, i) => (
              <SessionRow
                key={session.id}
                session={session}
                index={sessions.length - i}
                assessmentId={id!}
                onCopy={(sid) => {
                  const s = sessions.find((x) => x.id === sid);
                  if (s) copyLink(s.invite_url, sid);
                }}
                copyResult={copyResult}
              />
            ))}
          </Card>
        )}
      </section>

      {/* Assessment skills detail */}
      {assessment?.skills && assessment.skills.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Skills assessed</h2>
          <ul className="flex flex-wrap gap-2">
            {assessment.skills.map((s) => (
              <li
                key={s.id ?? s.skill_label}
                className="flex items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1 text-sm shadow-sm"
              >
                <span>{s.skill_label}</span>
                <span className="rounded-full bg-rakamin-light-cyan px-2 py-0.5 text-xs font-medium text-primary">
                  expected {LEVEL_LABELS[s.expected_level]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
