import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { authAtom } from "@/stores/authAtom";
import BrandMark from "@/components/layout/BrandMark";
import LevelBadge from "@/components/portfolio/LevelBadge";
import VoiceBars from "@/components/interview/VoiceBars";
import { Progress } from "@/components/ui/progress";
import {
  COVERAGE_STATE_COLOR,
  COVERAGE_STATE_WIDTH,
  FIT_GAP_RESULT_CLASSES,
  FIT_GAP_RESULT_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUpRight,
  Download,
  Headphones,
  Link2,
  ListChecks,
  Mic,
  Scale,
  UserCheck,
} from "lucide-react";

// Everything shown in the preview cards is illustrative sample content, hidden from
// assistive technology so it is never read out as real candidate data.

function PillLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-5 pr-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-primary transition-transform group-hover:rotate-45 motion-reduce:transition-none">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-rakamin-light-cyan px-3 py-1 text-xs font-medium text-rakamin-dark-teal",
        className,
      )}
    >
      {children}
    </span>
  );
}

function PreviewSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-2xl border border-white/80 bg-card/95 p-4 text-left shadow-[0_20px_50px_-20px_rgb(33_102_111/0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

const SAMPLE_COVERAGE = [
  { label: "System design", state: "covered", probes: 3 },
  { label: "React performance", state: "partial", probes: 2 },
  { label: "Stakeholder communication", state: "initiated", probes: 1 },
  { label: "Testing strategy", state: "not_yet", probes: 0 },
] as const;

function CoveragePreview() {
  return (
    <PreviewSurface className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold">Live coverage</p>
        <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-800">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600 motion-reduce:animate-none" />
          Live
        </span>
      </div>
      <div className="space-y-3">
        {SAMPLE_COVERAGE.map((skill) => (
          <div key={skill.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium">{skill.label}</span>
              <span className="text-muted-foreground">
                {skill.probes} probe{skill.probes === 1 ? "" : "s"} ·{" "}
                {skill.state.replace("_", " ")}
              </span>
            </div>
            <Progress
              value={COVERAGE_STATE_WIDTH[skill.state]}
              indicatorClassName={COVERAGE_STATE_COLOR[skill.state]}
              className="h-1.5"
            />
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

function SetupPreview({ className }: { className?: string }) {
  return (
    <PreviewSurface className={className}>
      <p className="mb-2 text-xs font-semibold">New assessment</p>
      <div className="mb-3 rounded-lg border px-2.5 py-1.5 text-[11px] text-muted-foreground">
        Senior Frontend Engineer
      </div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Skills to assess
      </p>
      <div className="space-y-1.5">
        {[
          ["System design", "L4"],
          ["React performance", "L3"],
          ["Testing strategy", "L3"],
        ].map(([label, level]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg bg-rakamin-light-cyan/60 px-2.5 py-1.5 text-[11px]"
          >
            <span>{label}</span>
            <span className="font-semibold text-primary">{level}</span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

function PortfolioPreview({ className }: { className?: string }) {
  return (
    <PreviewSurface className={className}>
      <div className="flex items-start gap-3">
        <LevelBadge level={4} />
        <div className="space-y-1">
          <p className="text-xs font-semibold">System design</p>
          <p className="flex items-center gap-1 text-[10px] text-green-800">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Confidence: HIGH
          </p>
        </div>
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Evidence from interview
      </p>
      <p className="mt-1 border-l-2 border-rakamin-teal pl-2 text-[11px] italic leading-relaxed">
        “We split the feed service once write volume doubled, and kept reads on a cache…”
      </p>
    </PreviewSurface>
  );
}

function InterviewPreview() {
  return (
    <PreviewSurface className="w-full">
      <div className="flex justify-center py-2">
        <VoiceBars active label="AI speaking" />
      </div>
      <div className="mt-2 space-y-1.5 text-[11px]">
        <p className="max-w-[85%] rounded-xl bg-muted px-2.5 py-1.5">
          What did you measure before changing the render path?
        </p>
        <p className="ml-auto max-w-[85%] rounded-xl bg-primary/10 px-2.5 py-1.5">
          We profiled the list and saw each socket update re-render every row…
        </p>
      </div>
    </PreviewSurface>
  );
}

function FitGapPreview() {
  return (
    <PreviewSurface className="w-full">
      <p className="mb-2 text-xs font-semibold">Fit/gap vs. vacancy</p>
      <div className="space-y-1.5 text-[11px]">
        {[
          ["System design", "exceed"],
          ["React performance", "match"],
          ["Testing strategy", "gap"],
        ].map(([label, result]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg border px-2.5 py-1.5"
          >
            <span>{label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                FIT_GAP_RESULT_CLASSES[result],
              )}
            >
              {FIT_GAP_RESULT_LABELS[result]}
            </span>
          </div>
        ))}
      </div>
    </PreviewSurface>
  );
}

const STEPS = [
  {
    title: "Configure the assessment",
    body: "Pick skills from the taxonomy or write your own, with L1–L5 behavioral anchors and the level you expect. Set the language and time limit.",
    preview: <SetupPreview className="w-full" />,
  },
  {
    title: "Run the voice interview",
    body: "Send the candidate a personal link. The AI interviewer asks follow-ups about what the candidate actually says, not a fixed list of questions.",
    preview: <InterviewPreview />,
  },
  {
    title: "Review evidence and decide",
    body: "Each skill gets a level, a separate confidence rating, and quotes from the candidate. Compare the result against a vacancy.",
    preview: <FitGapPreview />,
  },
];

const SMALL_FEATURES = [
  {
    icon: UserCheck,
    title: "Assessor overrides",
    body: "Disagree with a rating? Record your own level and notes. The AI rating stays visible next to yours.",
  },
  {
    icon: Scale,
    title: "Fit/gap against vacancies",
    body: "Compare demonstrated levels with a role's requirements, including skills found outside the plan.",
  },
  {
    icon: Download,
    title: "Transcript and export",
    body: "Read the full transcript and export results as PDF or JSON for your hiring workflow.",
  },
];

const CANDIDATE_STEPS = [
  { icon: Link2, text: "Open the interview link from your recruiter. You don't need an account." },
  {
    icon: Headphones,
    text: "Run the quick check for your browser, connection, microphone, and sound.",
  },
  { icon: Mic, text: "Find a quiet place and answer naturally. Follow-up questions are expected." },
];

export default function LandingPage() {
  const { token } = useAtomValue(authAtom);
  const primaryCta = token
    ? { to: "/assessments", label: "Open your dashboard" }
    : { to: "/login", label: "Sign in" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <section className="bg-brand-gradient relative overflow-hidden rounded-[2rem] px-4 pb-0 pt-4 sm:px-6">
          <header className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/70 bg-card/60 pl-3 pr-1.5 backdrop-blur">
            <BrandMark />
            <nav aria-label="Page sections" className="hidden items-center gap-6 text-sm md:flex">
              <a href="#how-it-works" className="hover:text-primary">
                How it works
              </a>
              <a href="#features" className="hover:text-primary">
                Features
              </a>
              <a href="#candidates" className="hover:text-primary">
                For candidates
              </a>
            </nav>
            <Link
              to={primaryCta.to}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-card pl-4 pr-1.5 text-sm font-medium shadow-sm hover:bg-rakamin-light-cyan"
            >
              {token ? "Dashboard" : "Sign in"}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </header>

          <div className="mx-auto max-w-3xl pb-10 pt-14 text-center sm:pt-20">
            <Eyebrow className="bg-card/70">Voice interviews for skills assessment</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Interviews that <em className="font-serif font-normal italic text-primary">listen</em>
              ,
              <br className="hidden sm:block" /> then show their evidence
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-rakamin-charcoal/80 sm:text-lg">
              An AI interviewer that asks about each answer, tracks skill coverage live, and turns
              the conversation into an L1–L5 portfolio you can check against the transcript.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PillLink to={primaryCta.to}>{primaryCta.label}</PillLink>
              <a
                href="#how-it-works"
                className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-rakamin-dark-teal hover:bg-card/60"
              >
                See how it works <ArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product preview: three floating cards, trimmed to one on phones */}
          <div className="relative mx-auto flex max-w-5xl items-end justify-center gap-4 pb-0">
            <SetupPreview className="mb-6 hidden w-64 -rotate-3 lg:block" />
            <div className="w-full max-w-md translate-y-6 sm:translate-y-8">
              <CoveragePreview />
            </div>
            <PortfolioPreview className="mb-6 hidden w-64 rotate-3 lg:block" />
          </div>
          <div className="h-10" />
        </section>
      </div>

      <main>
        {/* Principles strip */}
        <section className="mx-auto max-w-5xl px-4 pt-14 text-center">
          <p className="text-sm text-muted-foreground">
            Designed around how careful interviewers work
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            {[
              "Follow-ups on real answers",
              "Coverage tracked for every skill",
              "Evidence shown with every rating",
              "Confidence shown separately from level",
            ].map((item) => (
              <li
                key={item}
                className="rounded-full border bg-card px-4 py-2 text-rakamin-charcoal shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Belief */}
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-20 md:grid-cols-2 md:gap-12">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              A hiring decision should rest on evidence, not a gut feeling
            </h2>
            <PillLink to={primaryCta.to}>{primaryCta.label}</PillLink>
          </div>
          <p className="self-end text-lg leading-relaxed text-rakamin-charcoal">
            A good interviewer listens, asks what was behind an answer, and knows when they have
            heard enough.{" "}
            <span className="text-rakamin-gray">
              Rakamin AI Interview is designed to work the same way, and to be open about what it
              doesn't know: a skill that was only briefly explored is flagged as low confidence
              instead of being hidden.
            </span>
          </p>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-8 mx-auto max-w-6xl px-4 pb-20">
          <div className="mb-10 text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              From role to results <span className="text-rakamin-teal">in three steps</span>
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col">
                <div className="flex aspect-[4/3] items-center rounded-3xl bg-rakamin-light-cyan/60 p-5">
                  {step.preview}
                </div>
                <h3 className="mt-5 text-lg font-semibold">
                  <span className="mr-2 text-rakamin-teal">0{i + 1}</span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-rakamin-charcoal/80">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-8 bg-rakamin-light-cyan/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything an assessor needs
                <br />
                <span className="text-rakamin-teal">in one place</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-rakamin-charcoal/80">
                Set up, monitor, and review interviews without switching tools, with every rating
                linked to what the candidate said.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="flex flex-col rounded-3xl border bg-card p-6">
                <Eyebrow className="self-start">Live monitor</Eyebrow>
                <h3 className="mt-4 text-lg font-semibold">
                  Watch skill coverage fill in while the interview runs
                </h3>
                <div className="my-6 flex flex-1 items-center justify-center rounded-2xl bg-rakamin-light-cyan/60 p-5">
                  <CoveragePreview />
                </div>
                <p className="text-sm text-rakamin-charcoal/80">
                  <strong className="font-semibold text-rakamin-charcoal">
                    Skills move from not started to covered
                  </strong>{" "}
                  as follow-up questions add evidence. The transcript updates beside them.
                </p>
              </article>
              <article className="flex flex-col rounded-3xl border bg-card p-6">
                <Eyebrow className="self-start">Evidence-backed portfolio</Eyebrow>
                <h3 className="mt-4 text-lg font-semibold">
                  Ratings you can trace to the transcript
                </h3>
                <div className="my-6 flex flex-1 items-center justify-center rounded-2xl bg-rakamin-light-cyan/60 p-5">
                  <PortfolioPreview className="w-full max-w-sm" />
                </div>
                <p className="text-sm text-rakamin-charcoal/80">
                  <strong className="font-semibold text-rakamin-charcoal">
                    Level, confidence, and quotes for every skill,
                  </strong>{" "}
                  including relevant skills the interviewer found outside the plan.
                </p>
              </article>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {SMALL_FEATURES.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-3xl border bg-card p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rakamin-light-cyan text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-rakamin-charcoal/80">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Candidates */}
        <section id="candidates" className="scroll-mt-8 mx-auto max-w-5xl px-4 py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <Eyebrow>For candidates</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Got an interview link?</h2>
              <p className="mt-3 text-rakamin-charcoal/80">
                The interview is a spoken conversation with no fixed script. Take your time and
                answer in your own words. Follow-up questions just mean the interviewer wants to
                hear more.
              </p>
            </div>
            <ol className="space-y-3">
              {CANDIDATE_STEPS.map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  className="flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-rakamin-teal">Step {i + 1}</p>
                    <p className="text-sm">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="bg-brand-gradient mx-auto flex max-w-6xl flex-col items-center rounded-[2rem] px-6 py-16 text-center">
            <ListChecks className="h-8 w-8 text-primary" />
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight">
              Ready to run your next assessment?
            </h2>
            <p className="mt-3 max-w-md text-sm text-rakamin-charcoal/80">
              Sign in with the account from your organization. Need access? Ask your workspace admin
              to add you.
            </p>
            <div className="mt-6">
              <PillLink to={primaryCta.to}>{primaryCta.label}</PillLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <BrandMark />
        <p>© {new Date().getFullYear()} Rakamin · Evidence-based skills assessment</p>
      </footer>
    </div>
  );
}
