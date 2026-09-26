# Feature: Public landing page and a consistent visual redesign of the web app

Branch: `feat/web-landing-redesign` (from `submission/assessment` at `46b82f2`; it builds on the unmerged error-handling fixes there, so it is not cut from `main`).

| Type | Status | Area |
| --- | --- | --- |
| **Feature** (landing page, visual system) plus **five defects** (P1: every assessor page showed "Page not found"; P2: transcript load failures had no retry; P2: the assessor monitor labelled the candidate "You"; P2: an invite could be created without a candidate name; P2: incomplete vacancies could be created with only a title). | The landing/redesign commit series is documented in sections 4–8, with invite, vacancy, and mobile-layout follow-ups in sections 9–11. The latest frontend verification covered 30 files / 114 tests; six behavior faults plus the mobile-layout regression were proved by failing tests before their fixes. The redesign, latest vacancy error state, and compact mobile landing layout were checked by hand in headless Chrome. | Primarily the web frontend. The two validation follow-ups also change the session-create endpoint and the vacancy model, with request specs for each. There are no database migrations, scoring, tenant, or authentication changes. |

## 1. Observed behavior and product impact

| Observed | Where | Who is affected |
| --- | --- | --- |
| There was no public front page: `/` redirected straight to `/assessments`, so a signed-out visitor landed on the login form with no explanation of the product. | `App.tsx` | Prospective assessors, and candidates who open the site root instead of their invite link. |
| Each page styled its own errors, empty states, and headers (`<p className="text-sm text-destructive">`, `border rounded-lg p-12`, back-arrow rows). Colors outside the Rakamin palette (blue, purple, amber) were used for levels, coverage, and banners. | All pages | Assessors see inconsistent error and status cues; the product doesn't look like one system. |
| **Every assessor URL rendered "Page not found"** in the running app. `main.tsx` mounts `<App />` under a data-router `path: "*"`, so `useParams()` also returns `"*": "assessments"`, and the numeric-id guard (`33eb2a7`) rejected it. The existing tests used a plain `MemoryRouter` without the splat parent, so they passed. | `NumericParamsRoute.tsx` | All assessors: no list, form, result, or monitor page was reachable. |
| A failed transcript load said "Please refresh" with no reason and no retry. | `TranscriptPage.tsx` | Assessors reviewing evidence. |
| The live monitor reused the candidate's `TranscriptBubble`, which labels candidate turns "You". | `LiveMonitorPage.tsx` | Assessors read the candidate's words as their own. |
| The invite dialog described the candidate name as optional, converted a blank value to `undefined`, and the session-create endpoint persisted it as `nil`. | `AssessmentInvitePage.tsx`, `assessments.ts`, `SessionsController#create` | Assessors could create anonymous invite links that were harder to identify in the candidate list and downstream evidence views. |
| The new/edit vacancy forms and `Vacancy` model required only `role_title`; an empty skill list, culture, and competency expectations were accepted. | `VacancyNewPage.tsx`, `VacancyEditPage.tsx`, `Vacancy` | Assessors could create a vacancy that had no requirements to compare. Fit/gap then had no skill rows and lacked the culture/competency context used for its narrative. |
| The "Sign up" page was requested to be removed. | — | It was **already deleted** in `1ac0684 chore(web): remove the unrouted signup page`; nothing referenced it. This work makes sure no sign-up entry point comes back. |

## 2. Expected behavior

The PRDs don't specify marketing pages or visual design, so these are **assumptions**:

- The visual reference (a hiring-SaaS landing page) guides layout and mood only: gradient hero with a floating pill navigation, an italic accent word, pill buttons with an arrow bubble, soft rounded "bento" cards. The content, copy, and colors are our own; the palette stays the Rakamin tokens in `index.css`.
- The landing page makes **no claims the product can't back up**: no user counts, ratings, customer logos, or testimonials. The reference's testimonial slot becomes a short guide for candidates. Sample UI in the hero is illustrative and hidden from screen readers so it is never read out as real candidate data.
- Accounts are provisioned by the organization (the API only has `POST /auth/login`), so the landing and login pages say "Ask your workspace admin" and offer no sign-up.
- Signed-in assessors who visit `/` see the landing page with an "Open your dashboard" call to action instead of being redirected.
- Status colors: green stays for success and red for errors (universally understood); everything else uses the palette. Level badges form a ramp: gray → light cyan → teal tint → dark teal → yellow.
- The PRDs do not specify whether a candidate name is optional. Based on the reported assessor workflow, this follow-up treats it as required when creating a new invite. Existing sessions with a missing name remain readable; no historical data migration is assumed.

## 3. Acceptance criteria and options

Acceptance criteria:

- `/` is public and links signed-out visitors to `/login`, signed-in assessors to `/assessments`. No link to `/register` or `/signup` exists. *(test)*
- Login marks both fields invalid only on a 401; a network error shows a notice but leaves the fields unmarked. *(test)*
- Form fields with errors show a red border and ring (from `aria-invalid`) plus an icon-and-text message; form, load, and connection messages use one `Notice` component with `role="alert"` for errors. *(existing validation tests + screenshots)*
- List rows are real links (keyboard reachable) and show the latest session status. *(test)*
- Every assessor URL renders its page when mounted as in `main.tsx`; non-numeric ids still show "Page not found". *(test)*
- Transcript load failures show the reason and a working Retry. *(test)*
- The assessor monitor labels candidate turns "Candidate". *(test)*
- A saved override reads "Overridden by you" (previously "You Overridden ✓"). *(test)*
- The invite dialog marks candidate name as required, treats whitespace-only input as empty, shows an accessible inline error, and does not call the API while invalid. Enter and the Create Link button use the same form submission path. *(test)*
- The session-create endpoint independently rejects a missing or whitespace-only candidate name with `422`, does not persist a session, and trims a valid name before saving. Existing sessions with `candidate_name = nil` continue to load. *(request test)*
- Pages work at 390 px width with no page-level horizontal overflow; repeated landing-page cards use compact, labelled rails instead of one long vertical stack, and icon-only navigation keeps accessible names. *(test + headless-Chrome measurements)*
- Result logic is unchanged: invalid AI levels still render as unrated, confidence stays separate from level, evidence is shown as given. *(existing tests)*

Options considered:

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Restyle each page's markup individually | No new components | ~15 copies of banners, empty states, and headers drift again | Rejected |
| **Restyle the shared primitives, then add four small shared pieces** (`Notice`, `EmptyState`, `PageHeader`, `FormSection`) for patterns already copy-pasted across pages | One place to change; pages shrink; consistent error handling | A few new files | **Chosen** |
| Add a UI kit or web font | Faster polish | New dependency, bundle weight, against AGENTS.md | Rejected; system serif italic provides the accent |
| Redirect signed-in users from `/` to `/assessments` | Old behavior | Hides the landing page from anyone logged in | Rejected; show a dashboard CTA instead |
| Validate candidate name only in the invite dialog | Fast feedback with the smallest UI change | Direct API requests could still create anonymous sessions | Rejected |
| **Validate the invite form and session-create endpoint, while leaving the database column nullable** | Fast accessible feedback; protects the API boundary; preserves historical sessions and internal setup helpers | The requirement is scoped to invite creation rather than becoming a global model invariant | **Chosen** |

## 4. Implementation

Commits are ordered so each one builds and passes on its own.

| Layer | Change |
| --- | --- |
| Tokens (`index.css`) | `--radius` 0.5 → 0.75 rem; `.bg-brand-gradient` (teal "sky" with a yellow glow) and `.bg-page-wash`, built only from palette variables. |
| Primitives (`components/ui`) | Pill buttons; 44 px rounded inputs, textareas, and selects with focus rings and **`aria-invalid` error styling**; softer cards, dialogs (blurred charcoal overlay), menus, skeletons; badge `soft` variant; progress track uses `muted` instead of yellow. |
| Palette (`utils/constants.ts`) | Level badges, coverage bars, and fit/gap results moved from blue/purple/amber to palette classes. |
| Shared components | `Notice` (error/warning/info/success), rebuilt `LoadError` and `FieldError`, `EmptyState`, `PageHeader`, `FormSection`, `SessionStatusBadge`, `BrandMark`, `VacancySkillRow` (was duplicated in two vacancy forms). |
| Layouts | Floating pill header with a segmented nav; icon-only on phones with `sr-only` labels. |
| Landing (`pages/landing/LandingPage.tsx`) | Hero, principle chips, belief section, three-step "how it works", feature bento, candidate guide, closing CTA, footer. Below 768 px, repeated workflow/highlight cards use keyboard-focusable horizontal snap rails, while the small feature cards use a two-column grid. |
| Pages | Login split layout; lists; assessment and vacancy forms as titled sections; invite page with a link card and status badges; portfolio, fit/gap, transcript, and monitor with notices and pills; candidate interview status screens as icon cards (emoji removed); hardware check; not-found and crash fallback. |
| Invite validation | `AssessmentInvitePage` uses a real form, requires a trimmed candidate name, exposes the error with `aria-invalid`, `aria-describedby`, and `role="alert"`, and sends only a non-empty string. The TypeScript service contract now requires the name. `SessionsController#create` repeats the trim/presence guard and returns `422` before persistence. |
| Fixes | `NumericParamsRoute` ignores the parent `*` param; transcript load uses `LoadError` with retry and API messages; `TranscriptBubble` takes `candidateLabel` (monitor passes "Candidate"); override label wording; green status text moved to `green-700` for WCAG AA contrast on white; the reconnected prompt's "✕" and the skill drag handle got accessible names; voice bars respect reduced motion. |

**Unchanged on purpose:** interview audio, socket, and state logic; polling and timeouts; API calls and payloads other than requiring `candidate_name` when creating a session; rating, confidence, and evidence logic. Existing session reads still tolerate a missing candidate name.

## 5. Verification

All commands ran through Docker Compose (`docker compose run --rm --no-deps web …`).

| Check | Result |
| --- | --- |
| Baseline before changes (`npm run test`) | 88/89; the one failure was `colorPalette.test.ts` expecting a cream background after `1af46ba` switched it to white. The test was updated separately in `46b82f2` (not part of this work). |
| `npm run check` after the redesign (ESLint, Prettier check, Vitest, `tsc`, `vite build`) | Exit 0. 27 files, 99 tests passed; build succeeded. |
| `npm run check` on the branch tip `e99f792`, run in a clean `git worktree` so uncommitted work in the main checkout could not affect it | Exit 0. **29 files, 107 tests passed**; build succeeded. |
| Full frontend `npm run check` during invite validation, before the final `role="alert"` assertion refinement | Exit 0. **29 files, 109 tests passed**; build succeeded. One pre-existing unused-import warning remains in the separately modified `NotFoundPage.tsx`. The final focused test below covers the subsequent accessibility-only refinement. |
| Focused final invite UI test | Exit 0. **5 tests passed**, including blank/whitespace rejection, no API call, accessible error, trimming, and the existing failure/copy states. |
| Rails test database preparation and full RSpec suite | Exit 0. **20 examples, 0 failures**. The new session-create request spec contributes two examples. |
| RuboCop on the changed controller and request spec | **2 files inspected, no offenses detected.** |
| Per-slice checks | Lint, `tsc`, and the affected tests were run before every commit. |

**Seeded faults** (temporary change, test observed failing, change reverted):

| Fault | Failing assertion |
| --- | --- |
| Added `<Link to="/register">Sign up</Link>` to the landing header | `expected <a href="/register" …> to be null` |
| Ran the new transcript test against the pre-fix `TranscriptPage` from `HEAD` | `Unable to find an element with the text: Failed to load the transcript.` |
| Removed `candidateLabel="Candidate"` from the monitor | `Unable to find an element with the text: Candidate` |
| Temporarily removed the server-side candidate-name guard | The request spec failed because a whitespace-only request created a session, returned `201` instead of `422`, and omitted the expected error. The guard was restored and the full backend suite passed. |
| (Reproduction, not seeded) Ran the new splat-route test before fixing `NumericParamsRoute` | `Unable to find an element with the text: Assessment list` |

**Manual check:** a scratch Node script (built-in WebSocket over the Chrome DevTools Protocol; no new dependency) drove headless Chrome against the running dev server at `localhost:5173`. It signed in with the seeded development admin through the real login form, and no token was written anywhere. Screenshots are in `assessment/screenshots/web-landing-redesign/`:

- `01`/`02`: landing page at 1440 px and 390 px (no horizontal scroll).
- `03`: login with rejected credentials (red fields and notice).
- `04`/`05`/`15`: not-found, invalid interview link, unknown assessment id.
- `06`/`07`: assessment list, desktop and phone (icon-only nav).
- `08`: new-assessment validation errors on every required field.
- `09`–`14`: invite, portfolio (failed-generation state), transcript, edit assessment, vacancies, new vacancy.

The first screenshot run is how the "Page not found on every assessor page" defect was found; the tests had missed it.

## 6. Risks, assumptions, and what remains unverified

- **Not verified by hand:** the live interview states (connecting, speaking, reconnecting, draining) and the live monitor with real coverage updates. These need a microphone and a live Gemini session. They are covered only by the existing mocked tests and by code review of the markup changes.
- **Not verified by hand:** the updated required-name state in the invite dialog, the skill picker, unsaved-changes and end-session dialogs, the portfolio "complete" state with real ratings, and the fit/gap report with data. The local data only had failed portfolios. Screenshot `09` predates the required-name follow-up and must not be treated as visual proof of it.
- **Dark mode** tokens exist in `index.css`, but nothing toggles `.dark`; the new gradients were designed for light mode only.
- **Behavior changes to note in review:** `/` is now a public page for everyone (signed-in users are no longer auto-redirected); on the invite page, a failed copy of a new link now appears as a notice below the link instead of inside the button.
- **Pre-existing, left alone:** the portfolio page offers PDF/JSON export even when generation failed (`!generating && portfolio`). Exporting a failed portfolio may produce an empty or misleading file; worth a separate fix.
- Landing copy describes design intent ("designed to…") for interviewer behavior that the frontend cannot verify (follow-up quality, evidence integrity). If the backend doesn't meet those invariants, the copy should be revisited.
- The screenshots contain locally entered development candidate names only; they must stay out of commits, like the rest of `assessment/`.
- **Demo request form doesn't send anything** (section 8). Its confirmation says "We'll reach out at {email}…", which a real visitor would believe. Before this ships, either connect it to a real endpoint or change the confirmation so it doesn't promise follow-up.
- Rollback: the redesign remains frontend-only; the invite follow-up additionally changes `SessionsController#create` but adds no migration or environment variable. Reverting the invite UI/service/controller/spec changes restores the previous optional-name behavior without a data rollback.

## 7. Follow-up: one voice orb that takes turns

**Observed:** during an active interview, the AI's voice bars ("Listening...") and the candidate's bars ("You're speaking") were shown at the same time, stacked. Candidates couldn't tell at a glance whose turn it was. Also, "You're speaking" was shown whenever it was the candidate's turn, even if they were silent or muted.

**Change** (`f2217b6`, tests in `67b2633`): a single `VoiceOrb` replaces both bar groups. Its mode is derived from state the page already had (interview state, `speaker`, mic mute); no audio or socket logic changed.

| Mode | When | Look | Label |
| --- | --- | --- | --- |
| connecting | socket opening | pale orb, spinner | Connecting... |
| waiting | active, nobody's turn yet, or reconnecting | teal, slow pulse | Listening... |
| ai | `speaker === "ai"` | teal orb, teal ripples | AI is speaking |
| candidate | `speaker === "candidate"`, mic on | yellow orb, yellow ripples | Your turn — go ahead |
| muted | candidate's turn, mic muted | gray orb, mic-off icon | You're muted — unmute to answer |
| wrapping | `draining_audio` | teal orb, soft ripples | Wrapping up... |

- The status pill is `aria-live="polite"`, so screen readers announce turn changes. With reduced motion, ripples and pulse are removed and color, icon, and label still show the turn.
- Yellow is kept separate from teal in the candidate orb; blending them turned olive in the first render.
- The transcript stays visible in a "Conversation" card under the orb and scrolls to the newest turn.
- Controls become a dock of round buttons: mic toggle (`aria-pressed`, "Mute/Unmute microphone") and a red end button that still asks for confirmation.
- The landing page still uses `VoiceBars` for its "Run the voice interview" preview (unchanged at `e99f792`), so the preview no longer matches the real interview screen. Swapping in `VoiceOrb` is a small follow-up.

**Verification:** three new tests (one orb at a time with an AI → candidate handover, the muted label and pressed state, the transcript kept under the orb). Seeded fault: rendering a second orb during the candidate's turn failed with `expected … to have a length of 1 but got 2`. Full suite: 28 files, 106 tests passed; `tsc` clean. Visual check of each mode via a temporary preview page on the dev server (deleted afterwards): `screenshots/web-landing-redesign/16-voice-orb-modes.png`.

**Not verified:** the orb in a live interview with a real microphone and Gemini session. Mode changes there depend on the backend's `speaker_changed` events, which are covered only by mocked tests.

## 8. Later landing-page commits

These commits came after the orb work (`3f953ad`…`e99f792`). This section summarizes their messages and diffs; it isn't a separate review.

| Commit | Change |
| --- | --- |
| `3f953ad` feat | Brand icon and favicon use the Rakamin "</" mark, redrawn as inline SVG in the palette's teal and yellow (`BrandMark.tsx`, `public/favicon.svg`, `index.html`). |
| `1230643` fix | `.bg-brand-gradient` fades each glow out over several stops and keeps teal and yellow in opposite corners, so it no longer bands or mixes to olive. A light cyan base keeps the panel edge visible on white. |
| `7d6d029` feat | Landing motion: staggered hero entrance, a yellow underline drawn under "listen", floating side preview cards, coverage bars that fill when scrolled into view, sections that fade up on first view, and hover lift on cards and pills. Adds `hooks/useInView.ts` and keyframes in `tailwind.config.js`. All motion is disabled under `prefers-reduced-motion`. |
| `b62de98` feat | The closing call to action's third "Sign in" button becomes **"Request a demo"**, which opens a validated form (name, work email, company, optional roles). **The form is demo-only: submissions are acknowledged in the browser and never sent to the API.** |
| `e99f792` test | Tests for `useInView`, the demo request dialog, and the landing call to action. |

**Why these changes** (user feedback on the landing page):

- The hero gradient ended in a hard horizontal band about a third of the way down, where the teal radial glow stopped at `transparent 70%`. Where the teal and yellow glows overlapped at top right, the colors mixed to olive. The panel also faded to pure white at the bottom, so its rounded edge vanished into the page (`17` vs `18`).
- The page had four "Sign in" buttons (header, hero, belief section, closing CTA). The belief-section button was removed, and the closing CTA became "Request a demo". Sign-in now appears twice.
- The brand mark was a generic `AudioLines` icon. The Rakamin Academy site only publishes the mark as PNG, so it was traced from the 180 px app icon (`appletouchicon-….png`, linked from `app.rakamin.com/academy`) and checked by overlaying the SVG on the original (`22`). The yellow of its cap is why yellow now appears as an accent in a few places: the "listen" underline, the chip dots, the step-number badges, the demo button, the nav link underline on hover, and the feature icon tiles on hover.

**Verified:**

- `npm run check` at `e99f792` passes: 29 files, 107 tests, build OK. The intermediate commit `7d6d029` (animations only) also passed lint, `tsc`, and the landing and hooks tests, except for the demo test that `b62de98` introduces.
- Seeded faults (temporary change, test observed failing, change reverted):

| Fault | Failing assertion |
| --- | --- |
| Removed the email `pattern` rule from the demo form | `Unable to find an element with the text: Enter a valid email address` |
| Ran the new landing test against the animation-only version, before committing it as `7d6d029` | `expected [ <a …> ] to have a length of 2 but got 4` (four sign-in links) |
| (During development) Ignored the demo destination in the closing CTA | `Unable to find an accessible element with the role "link" and name /Request a demo/`. This was against an earlier external-link version that was replaced before commit (see below). |

- Headless Chrome screenshots against the Docker dev server:
  - `17`/`18`: hero before and after the gradient fix.
  - `19`: full page at 1440 px.
  - `20`: 390 px, captured while the entrance animation was still running (no horizontal scroll).
  - `21`: the demo dialog, opened for the screenshot by a temporary `defaultOpen` that was reverted.
  - `22`: the traced mark overlaid on the original icon.

**Corrected during development:**

- The first version of the demo CTA linked to an external URL through a new `VITE_DEMO_REQUEST_URL` variable (added to `docker-compose.yml` and `.env.example`). The user rejected it: the request was for a button that opens a form, not new deployment configuration. It was replaced by the in-page dialog before any commit, and the compose and env changes were reverted.
- The first traced mark had a semicircular yellow cap. The original's cap is squarer with a sharp top-left corner, and the teal round end showed above it. Both were caught in the overlay and fixed.
- Candidate-step cards applied the hover lift to the same element as the staggered scroll reveal. That element's `transition-delay` would have lagged the hover by up to 240 ms, so the hover was moved to an inner element.
- The first `useInView` test set the ref and then called `rerender()`. That never re-ran the effect, because its dependencies were unchanged, so the observer path went untested. The test was rewritten with a probe component that attaches the ref during render.

**Not verified:** hover effects and `prefers-reduced-motion` in an interactive browser (headless screenshots can't hover or toggle the setting); the demo dialog's thank-you state, which the tests cover but no screenshot shows; the gradient change on the other pages that share `.bg-brand-gradient` (login panel, not-found page, invite link card).

**Open issue:** after submitting, the demo form says "Thanks, {name}! We'll reach out at {email} to set up a walkthrough for {company}", but nothing is stored or sent. Section 2 says the landing page makes no claims the product can't back up, and this confirmation breaks that. Fix before release: connect the form to a real endpoint, or change the confirmation to something honest (for example "This is a preview; contact us at …").

## 9. Follow-up: require a candidate name before creating an invite

**Observed:** the invite dialog explicitly called the name optional and passed `undefined` for an empty value. `SessionsController#create` converted a blank value to `nil`, so both the UI and a direct API request could create an invite with no candidate identity. This is a defective implementation relative to the reported assessor workflow; the PRDs do not independently specify this field.

**Expected:** creating a new invite requires a non-whitespace candidate name. Invalid input stays in the open dialog, is announced accessibly, and creates no session. Valid input is trimmed consistently by both client and server. Historical sessions remain compatible because the database column is not changed to `NOT NULL`.

**Implementation:** the dialog is now a semantic form shared by Enter and the Create Link button. It marks the label required, renders the shared `FieldError`, and connects it to the input with `aria-invalid` and `aria-describedby`; the error wrapper uses `role="alert"`. The frontend service requires a `string`. The create endpoint trims the submitted value and returns `422 Candidate name is required` before persistence when it is blank.

**Verification:** `AssessmentInvitePage.test.tsx` covers whitespace-only input, the absence of an API call, accessible error state, trimming, request failure, and clipboard failure (5/5 passing after the final UI change). `sessions_spec.rb` covers server-side rejection without persistence and successful trimmed creation (2/2 passing); the full backend suite passed with 20/20 examples. Targeted RuboCop inspected the controller and request spec with no offenses. A temporary removal of the API guard produced the expected request-spec failure and was restored before the passing runs.

**Remaining risk:** the updated dialog was not manually checked or re-screenshot at desktop/mobile widths. Screenshot `09` shows the earlier optional-name version. The API change affects only new session creation; no migration, tenant/auth contract, candidate-facing endpoint, interview lifecycle, or scoring behavior changed.

## 10. Follow-up: require complete vacancy requirements

**Observed:** `/vacancies/new` visually marked only the role title as required, and the frontend sent empty `culture_dimensions`, `competency_expectations`, and `vacancy_skills_attributes`. The `Vacancy` model likewise validated only `role_title`, so direct API requests could persist the same incomplete record. This is a defective implementation relative to the vacancy's fit/gap purpose: PRD 02 compares candidate levels against vacancy skill levels and supplies vacancy culture dimensions to the narrative.

**Expected and acceptance criteria:** a vacancy requires a non-whitespace role title, company culture, competency expectations, and at least one expected skill. The new and edit forms show inline errors, mark invalid text controls with `aria-invalid`, and make no API request while invalid. The server independently returns `422` for missing required context or all skills removed. Required text is trimmed consistently. Existing incomplete rows remain readable, but an assessor must complete them before saving an edit.

Options considered:

| Option | Product impact | Complexity and failure mode | Decision |
| --- | --- | --- | --- |
| Validate only in React | Fast feedback in the normal form | Direct API requests and future clients can still persist unusable vacancies | Rejected |
| Add database `NOT NULL` constraints immediately | Strongest storage invariant for the two text columns | Existing blank/null rows need a data decision; it still cannot enforce at least one child skill with a simple column constraint | Rejected for this scoped fix |
| Validate in React and the Rails model, leaving columns nullable | Immediate accessible feedback and an authoritative API guard; no migration risk for existing rows | Historical incomplete rows must be completed when next edited | **Chosen** |

**Implementation:** both vacancy forms use the existing whitespace-aware `requiredText` rule for culture and competency fields, field-array validation for at least one skill, `aria-invalid`, shared `FieldError`, visible required markers, and trimmed payloads. The `Vacancy` model trims all three required text fields, validates their presence, and checks for at least one skill that is not marked for nested destruction. The edit form uses the same rules, so removing the last saved skill cannot bypass validation.

**Verification:**

- Seeded regression proof before the production change: the two focused frontend files failed 3 of 6 tests, including the missing skill error and untrimmed payload; the vacancy request spec failed all 4 examples because incomplete vacancies were accepted and text was not normalized. The implementation was then applied without weakening assertions.
- Focused final runs: 6/6 frontend tests and 5/5 vacancy request examples passed, including rejection when an edit marks the final nested skill for destruction.
- Full Docker Compose validation: frontend `npm run check` exited 0 with **30 files / 113 tests**, TypeScript and the production build passing; the full Rails suite passed **25 examples / 0 failures**; targeted RuboCop inspected 2 files with no offenses. ESLint still reports the pre-existing unused `Compass` import in `NotFoundPage.tsx` as a warning, not an error.
- Manual headless-Chrome check used the real local login and `/vacancies/new`: all four messages appeared after submit, the three text controls had `aria-invalid="true"`, the route stayed on the form, and there was no horizontal overflow at 1440 px. Screenshot: `screenshots/web-landing-redesign/23-new-vacancy-required-errors.png`.

**Risk and rollback:** no schema, tenant lookup, authorization, scoring, or fit/gap calculation changed. The behavior change is that existing incomplete vacancies cannot be resaved unchanged. Reverting the two form changes, model validation, and their tests restores optional fields without a data rollback. Mobile rendering of this new error state and a full fit/gap run using a newly created vacancy remain unverified.

## 11. Follow-up: compact the landing page on mobile

**Observed:** at a true emulated 390 × 844 CSS-pixel viewport, every repeated card group used the desktop content order as a single vertical column. After triggering all scroll reveals, the landing page was 6,272 px tall. There was no page-level horizontal overflow (`scrollWidth = innerWidth = 390`), but the three workflow cards, two large product highlights, and three small feature cards dominated the scroll and made the page feel like one long stack. This is a responsive presentation defect reported by the user, not interview/scoring behavior specified by the PRDs.

**Expected and acceptance criteria:** mobile keeps the complete copy and card previews readable without shrinking them into dense tiles. The workflow and main highlight groups should be swipeable, show part of the next card as a discoverability cue, expose their list purpose to assistive technology, accept keyboard focus/scrolling, and return to the existing multi-column grid at `md`. The page itself must remain exactly viewport-width. Supporting chips and secondary feature cards may use two columns where the content remains readable.

Options considered:

| Option | Product impact | Complexity and failure mode | Decision |
| --- | --- | --- | --- |
| Only reduce type, padding, and gaps | Preserves the existing order | The same eight cards still form a long stack, with worse readability | Rejected |
| Hide previews or secondary cards on phones | Produces the shortest page | Removes product explanation and creates different mobile content | Rejected |
| Use horizontal snap rails for repeated large cards and a two-column grid for short feature cards | Keeps all content legible, reduces vertical repetition, and leaves desktop unchanged | Horizontal content needs a clear cue and keyboard access | **Chosen** |

**Implementation:** the three-step workflow and two large product highlights are labelled `ol`/`ul` rails below 768 px. Each uses 88%-width snap cards, a visible “Swipe or scroll” hint, `tabIndex=0`, a focus ring, and local `overflow-x-auto`; the next card remains partially visible. At `md`, the same lists switch back to the original three- and two-column grids and hide the hint. Principle chips now form a two-column mobile grid, secondary feature cards use two columns with the final card spanning both, and oversized mobile section gaps were reduced. No copy, routing, CTA, authentication, interview, or assessment logic changed.

**Verification:**

- Seeded regression proof: the new landing test was run before the production markup changed and failed because no list named “Assessment workflow” existed. The implementation was then added without weakening the assertion.
- Focused Docker run: `LandingPage.test.tsx` passed 6/6 tests, including both labelled, focusable rails, their responsive classes, and the two visible mobile hints.
- Full Docker run: `npm run check` exited 0; ESLint, Prettier, 30 Vitest files / 114 tests, TypeScript, and the Vite production build passed. ESLint still reports the pre-existing unused `Compass` import in `NotFoundPage.tsx` as one warning.
- Manual headless-Chrome check: at 390 px, page `scrollWidth` stayed 390 px and revealed document height fell from 6,272 to 4,706 px (25% shorter). The workflow rail measured 358 px visible / 951 px scrollable and the highlights rail 358 px / 634 px. At 1,440 px, there was no horizontal overflow, the rails resolved to the original 3- and 2-column grids, and both mobile hints were hidden. Temporary before/after screenshots were inspected locally and were not added to the repository.

**Remaining risk and rollback:** touch inertia and scrollbar rendering were not checked on a physical iOS or Android device; Chrome emulation and keyboard-focus behavior were checked instead. Horizontal rails intentionally require a swipe/scroll to see every card, mitigated by the hint and partially visible next card. Reverting the landing component/test changes restores the vertical mobile stack without data or API rollback.
