export const meta = {
  name: 'tm-tracker-pages',
  description: 'Build tm-tracker feature pages in parallel against the fixed contract, then typecheck-fix and review',
  phases: [
    { title: 'Pages', detail: 'one agent per page/area, file-disjoint' },
    { title: 'Typecheck', detail: 'run tsc -b and fix all errors' },
    { title: 'Review', detail: 'adversarial review vs DESIGN.md + tmpdf' },
  ],
};

const CONTRACT = `
You are building ONE part of "tm-tracker", a React + TypeScript + Vite + Tailwind
app (Firebase backend) hosted on GitHub Pages. The foundation, design system,
data layer and shared components ALREADY EXIST and MUST be reused — do not
reinvent them, do not modify them, do not change any file outside your assigned
list. Write COMPLETE, production-quality implementations (no TODOs, no stubs).

STYLE / CONSISTENCY (match the sibling app tmpdf):
- Use the shadcn-style primitives from '@/components/ui': Button, Badge, Card,
  CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Label,
  Select, Progress, Skeleton, ConfirmDialog, and Dialog/DialogContent/
  DialogHeader/DialogTitle/DialogDescription/DialogFooter/DialogTrigger/DialogClose.
- Tailwind tokens only (bg-background, bg-card, text-foreground, text-muted-foreground,
  border, bg-primary, text-primary-foreground, bg-muted, bg-secondary, etc.).
  Brand accent is indigo via 'primary'. NEVER hardcode hex colors.
- Completed papers/rows: add the 'bg-completed text-completed-foreground' classes.
- Leaderboard top-3 rows use the CSS helper classes 'row-gold' / 'row-silver' /
  'row-bronze' (already defined in index.css).
- Icons from 'lucide-react'. Toast notifications via "import { toast } from 'sonner'".
- Clean, minimal, generous whitespace, rounded cards. FULLY mobile-responsive.
- Use 'cn' from '@/lib/cn' to compose classes.

CONTRACT — import and use these (DO NOT redefine them):

Types — '@/types':
  AppUser { uid, email, displayName, classId, role:'student'|'admin', isTMStudent,
            paperCount, lastCompletedAt:number|null, createdAt, onboarded }
  ClassInfo { id, name, badge, archived, order }
  Paper { id, setId, school, year, type, label, storagePath, fileName }
  PaperSet { id, name, type, count }
  Completion { paperId, paperLabel, completedAt:number, score:number|null, notes:string|null }
  TodoItem { paperId, paperLabel, order:number, addedAt:number, done:boolean }
  LeaderboardEntry { uid, displayName, classId, paperCount, lastCompletedAt, rank, isYou }

Catalog — '@/lib/catalog':
  PAPERS: Paper[]; PAPER_SETS: PaperSet[]; getPaper(id): Paper|undefined;
  type PaperStatus = 'all'|'completed'|'uncompleted';
  interface PaperFilter { search:string; status:PaperStatus; showOlder:boolean; setId?:string }
  filterPapers(papers, filter, completedIds:Set<string>, minYear): Paper[]

Config — '@/lib/config':
  BOOTSTRAP_ADMIN_EMAIL, DEFAULT_CLASSES, DEFAULT_MIN_YEAR(=2018),
  LEADERBOARD_TOP_POSITIONS(=5), RECENT_COMPLETED_COUNT(=5)

Format — '@/lib/format':
  relativeTime(ms|null)->string; formatScore(score|null)->string('78%'|'—');
  formatCount(n)->'37 papers'; isWithinLastWeek(ms,now?); averageScore(scores)->number|null

Ranking — '@/lib/ranking':
  rankEntries(users:AppUser[], currentUid:string, classId?:string): LeaderboardEntry[]
  topPositions(entries, maxRank): LeaderboardEntry[]
  findYou(entries): LeaderboardEntry|undefined

Stats — '@/lib/stats':
  studentStats(completions, now?) -> { total, average:number|null, thisWeek }
  recentCompletions(completions, n) -> Completion[]

DB writes — '@/lib/db' (all async):
  markComplete(uid, paper), unmarkComplete(uid, paperId),
  saveCompletionDetails(uid, paperId, {score:number|null, notes:string|null}),
  addTodo(uid, paper, alreadyDone:boolean), removeTodo(uid, paperId),
  reorderTodos(uid, orderedPaperIds:string[]),
  completeOnboarding(uid, displayName, classId), updateDisplayName(uid, name),
  setTMStudent(uid, bool), setRole(uid, 'student'|'admin'),
  reassignClass(uid, classId), removeUser(uid),
  addClass(name, badge, order), updateClass(id, patch), getPaperUrl(storagePath)->Promise<string>

Live hooks — '@/hooks/useData':
  useAllUsers() -> { users:AppUser[], loading }
  useClasses() -> { classes:ClassInfo[], loading }   // sorted; falls back to defaults
  useClassMap() -> Map<string, ClassInfo>
  useCompletions(uid|undefined) -> { completions, completedIds:Set<string>, byId:Map, loading }
  useTodos(uid|undefined) -> { todos:TodoItem[], loading }   // sorted by order
  useActivityFeed(max?) -> { items: {uid,paperId,paperLabel,completedAt}[], loading }

Auth — '@/store/useAuthStore':
  useAuthStore((s)=>...) with { firebaseUser, profile:AppUser|null, loading,
    signInWithGoogle():Promise, signOutUser():Promise }
  useProfile(), useIsAdmin()

Theme — '@/store/useThemeStore': useThemeStore((s)=>{theme,toggleTheme})

Shared components (already built — import & reuse):
  '@/components/ClassBadge' -> <ClassBadge badge={string} />
  '@/components/PdfOpenButton' -> <PdfOpenButton storagePath={string} />
  '@/components/StatStrip' -> <StatStrip stats={StudentStats} />
  '@/components/RecentList' -> <RecentList completions={Completion[]} showScore? />
  '@/components/Spinner' -> <FullPageSpinner label? />, <Spinner />

The signed-in user's uid: useAuthStore((s)=>s.firebaseUser?.uid) and profile via useProfile().

Before writing, READ these for conventions:
  DESIGN.md (the spec), src/components/Layout.tsx, src/components/ui/Button.tsx,
  src/components/RecentList.tsx, src/lib/db.ts, src/hooks/useData.ts.

IMPORTANT: Do NOT run npm/tsc/vite/eslint/build — only create/edit YOUR files.
A later phase typechecks and fixes. Keep imports exact. TypeScript is strict with
noUnusedLocals/noUnusedParameters — no unused vars.
`;

const SPECS = [
  {
    label: 'login',
    files: ['src/pages/LoginPage.tsx'],
    spec: `Build the LOGIN / LANDING page (export: function LoginPage). DESIGN.md §4.1.
Full-screen centered layout on bg-background. A clean Card (max-w-sm) with:
- brand "tm-tracker" (font-bold text-2xl),
- tagline "Log your papers. Climb the board.",
- a single primary Button "Sign in with Google" (full width). On click call
  useAuthStore.getState().signInWithGoogle() (or the hook action) with a loading
  state (disable + Spinner) and toast.error on failure.
Nothing else is visible (the whole app is login-gated). No email/password.`,
  },
  {
    label: 'onboarding',
    files: ['src/pages/OnboardingPage.tsx'],
    spec: `Build the FIRST-RUN onboarding page (export: function OnboardingPage). DESIGN.md §4.2.
Full-screen centered Card. Heading "Welcome to tm-tracker", subtitle
"Set your display name and pick your class to get started."
Form:
- Display name (Input, required, trim, max ~40 chars).
- Class (Select, required) populated from useClasses() — only non-archived,
  sorted; option value = class.id, text = class.name. Include a disabled
  placeholder option.
Submit button "Continue" (disabled until both valid + while saving). On submit
call completeOnboarding(uid, displayName, classId) then navigate('/') via
react-router useNavigate. uid from useAuthStore((s)=>s.firebaseUser?.uid).
toast.error on failure. Prefill display name from profile.displayName if present.`,
  },
  {
    label: 'options-modal',
    files: ['src/components/OptionsModal.tsx'],
    spec: `Build the OPTIONS modal (export: function OptionsModal, props {open:boolean,
onOpenChange:(o:boolean)=>void}). DESIGN.md §5. It is rendered by Layout already.
Use Dialog/DialogContent/DialogHeader/DialogTitle. Contents:
- Editable display name: Input prefilled from profile.displayName + a "Save"
  Button calling updateDisplayName(uid, name) (toast success/error; disable while saving).
- Class: READ-ONLY. Show the user's class name + <ClassBadge badge={...}/> resolved
  via useClassMap().get(profile.classId). Caption: "Class is set by your teacher —
  ask Calvin to change it." (omit the row entirely if the user is an admin or has
  no class).
- "Signed in as": show profile.email (read-only, muted).
- A Sign out Button (variant outline, with LogOut icon) calling signOutUser().
Use useProfile() + useAuthStore for actions. Guard against profile===null.`,
  },
  {
    label: 'home-leaderboard',
    files: ['src/pages/HomePage.tsx', 'src/components/leaderboard/LeaderboardTable.tsx', 'src/components/leaderboard/Tabs.tsx'],
    spec: `Build the HOME page (export: function HomePage) + its leaderboard components.
DESIGN.md §6 and §10. Layout top-to-bottom inside the page:

1) Leaderboard card titled with a Trophy icon + "Leaderboard".
   - Tabs: "All" (default) + one tab per non-archived class (label = class.badge).
     Build a small Tabs component in src/components/leaderboard/Tabs.tsx (controlled
     by props value/onChange/options). Active tab uses bg-primary text-primary-foreground,
     inactive bg-muted — pill style (see tmpdf Leaderboard period pills).
   - LeaderboardTable (src/components/leaderboard/LeaderboardTable.tsx): given the
     selected classId (undefined for All), compute
     entries = rankEntries(users, myUid, classId); rows = topPositions(entries,
     LEADERBOARD_TOP_POSITIONS). Three columns: plain rank number (no '#'),
     name + <ClassBadge badge={classMap.get(row.classId)?.badge ?? ''}/>,
     and formatCount(row.paperCount) right-aligned tabular-nums.
     Top-3 rank rows get row-gold / row-silver / row-bronze classes (rank===1/2/3).
     Subtly highlight the row where isYou (e.g. ring-1 ring-primary/40 or font-semibold).
     Empty state: "No ranked students yet."
   - users from useAllUsers(); classMap from useClassMap().

2) Personal "You" section — ONLY for non-admin users (admins skip the whole
   personal block; they are not TM students). DESIGN §6.2:
   - A visually separated standalone row (a bordered/rounded panel, NOT inside the
     table) showing the current user's own entry from the CURRENT tab's entries
     (findYou). Layout mirrors a leaderboard row: rank · name + badge · count.
     Label it "You".
   - If the user is NOT ranked (not a TM student → findYou undefined), instead show
     a gentle banner: "You're tracking privately — ask Calvin to add you to the
     leaderboard." (use a muted Card).

3) Stats section — ONLY for non-admin users. Two columns on desktop, stacked on
   mobile: left = <StatStrip stats={studentStats(myCompletions)} />; right =
   <RecentList completions={recentCompletions(myCompletions, RECENT_COMPLETED_COUNT)} />.
   Use useCompletions(myUid). Wrap each in a Card with a small heading
   ("Your stats" / "Recently completed").

myUid = useAuthStore((s)=>s.firebaseUser?.uid); profile = useProfile().
Show Skeletons while users/completions loading. Mobile-friendly.`,
  },
  {
    label: 'tracker',
    files: [
      'src/pages/TrackerPage.tsx',
      'src/components/tracker/TodoList.tsx',
      'src/components/tracker/PaperRow.tsx',
      'src/components/tracker/PaperFilters.tsx',
      'src/components/tracker/ScoreNotesEditor.tsx',
    ],
    spec: `Build the TRACKER page (export: function TrackerPage) + components. DESIGN.md §7.
Two stacked sections; the page scrolls (the full list is long).

uid = useAuthStore((s)=>s.firebaseUser?.uid). Use useTodos(uid) and useCompletions(uid)
(gives completedIds + byId). All mutations via '@/lib/db'. toast.error on failures.

TOP — To-do list (src/components/tracker/TodoList.tsx):
- Heading "To-do".
- A drag-to-reorder list using @dnd-kit (@dnd-kit/core + @dnd-kit/sortable +
  @dnd-kit/utilities). Items come from useTodos(uid) (already sorted by order).
  On drag end, compute the new ordered array of paperIds and call
  reorderTodos(uid, ids) (optimistically reorder local state for snappy UX).
- Each todo row: a drag handle (GripVertical icon), a completion checkbox
  (checked = completedIds.has(paperId); toggling calls markComplete/unmarkComplete
  with the Paper from getPaper(paperId)), the paper label, a <PdfOpenButton/>, and
  an ✕ remove button (removeTodo). Completed items STAY in the list, shaded with
  bg-completed (do NOT strike through). Empty state: "Your to-do list is empty —
  add papers from the list below."

BOTTOM — Full paper list:
- Filters (src/components/tracker/PaperFilters.tsx): a search Input (placeholder
  "Search papers…"), a status filter (All / Completed / Uncompleted — pill buttons
  or a Select), and a "Show older papers" toggle (checkbox/switch) that flips
  showOlder (default false → only year >= DEFAULT_MIN_YEAR). If PAPER_SETS.length > 1,
  also a set switcher (Select). Controlled via props.
- Compute rows = filterPapers(PAPERS, filter, completedIds, DEFAULT_MIN_YEAR).
  Show a small count "Showing N papers". Render rows with PaperRow. 487 rows max —
  plain rendering is acceptable; keep each row light.
- PaperRow (src/components/tracker/PaperRow.tsx): instant-tick checkbox
  (markComplete/unmarkComplete), the label "<School> <Year> <Type>", an "Add to
  to-do"/"In to-do" toggle button (addTodo(uid, paper, completedIds.has(id)) /
  removeTodo) — reflect whether it's already in todos (pass a Set of todo paperIds),
  and a <PdfOpenButton storagePath={paper.storagePath}/>. When completed, shade the
  row bg-completed AND reveal an inline (NON-modal) expander to add score/notes via
  ScoreNotesEditor. Do not use a dialog.
- ScoreNotesEditor (src/components/tracker/ScoreNotesEditor.tsx): given the existing
  Completion (or its score/notes), an inline form: a number Input for score (0–100,
  %, optional) and a textarea for notes (optional). Debounce or save on blur / a
  small Save button -> saveCompletionDetails(uid, paperId, {score, notes}). Show the
  privacy reassurance text: "Your scores and notes are private — only you and your
  teacher can see them. Other students only see how many papers you've completed."

Keep state (search/status/showOlder/setId) in TrackerPage and pass down. Mobile-friendly.`,
  },
  {
    label: 'admin',
    files: [
      'src/pages/AdminPage.tsx',
      'src/components/admin/UsersTable.tsx',
      'src/components/admin/ClassesManager.tsx',
      'src/components/admin/ActivityFeed.tsx',
    ],
    spec: `Build the ADMIN page (export: function AdminPage) + components. DESIGN.md §8.1.
Three Card sections stacked. Data: useAllUsers(), useClasses()/useClassMap(),
useActivityFeed(). Mutations via '@/lib/db'. toast on success/failure.

1) UsersTable (src/components/admin/UsersTable.tsx): one table, filterable by a
   pill control: All / TM students / Not TM. Default sort: TM students first, then
   by paperCount desc. Columns: name (+ a small "admin" Badge if role==='admin'),
   class (Select to reassign -> reassignClass(uid, classId); options from useClasses),
   paper count (tabular-nums), last active (relativeTime(lastCompletedAt)), and
   actions: a "TM student" toggle (setTMStudent), an "Admin" toggle (setRole to
   'admin'/'student'), and a "Remove" button that opens a ConfirmDialog (destructive)
   -> removeUser(uid). Use a switch/toggle styled with tokens. Only show users with
   onboarded===true OR include a small "pending name" hint for not-yet-onboarded.

2) ClassesManager (src/components/admin/ClassesManager.tsx): list current classes
   (name + ClassBadge). Each row: edit name/badge inline (Inputs + Save ->
   updateClass(id,{name,badge})) and an Archive/Unarchive toggle (updateClass(id,
   {archived})). An "Add class" form: name Input + badge Input + Add Button ->
   addClass(name, badge, nextOrder) where nextOrder = max(order)+1.

3) ActivityFeed (src/components/admin/ActivityFeed.tsx): useActivityFeed(50). Build a
   uid->displayName map from useAllUsers(). Render rows: "<name> completed <paperLabel>
   · <relativeTime(completedAt)>". Newest first. Empty state friendly.

Guard: this page is only mounted for admins (App routes handle it) but still code
defensively. Mobile: allow horizontal scroll on the users table (overflow-x-auto).`,
  },
  {
    label: 'student-tracker',
    files: ['src/pages/StudentTrackerPage.tsx'],
    spec: `Build the ADMIN STUDENT-TRACKER page (export: function StudentTrackerPage).
DESIGN.md §8.2 — "same as the student tracker, but pick a student to view".
- A student picker at top: a Select (or searchable list) of users from useAllUsers()
  (show displayName + class badge; include all onboarded users). Store selectedUid.
- When a student is selected, show a READ-ONLY view of THEIR tracker:
  - Their <StatStrip stats={studentStats(completions)} /> and
    <RecentList completions={recentCompletions(completions, 10)} /> (admins may see
    scores — showScore).
  - Their to-do list (read-only): from useTodos(selectedUid) — label + a small
    "done"/"to do" badge + <PdfOpenButton/>. Completed ones shaded bg-completed.
  - Their full completions list (read-only): label · relativeTime · formatScore(score)
    · notes (if any) · <PdfOpenButton/>. Sort newest first.
  Use useCompletions(selectedUid) and useTodos(selectedUid). No editing controls.
- Empty state before selecting: "Pick a student to view their tracker."
Resolve each paper's storagePath via getPaper(paperId) for the PDF buttons.
Mobile-friendly.`,
  },
];

function buildPrompt(spec) {
  return `${CONTRACT}

=== YOUR ASSIGNMENT: ${spec.label} ===
You OWN exactly these files (create/overwrite only these):
${spec.files.map((f) => '  - ' + f).join('\n')}

${spec.spec}

Deliver complete, strict-TypeScript-clean React. Return a 2-3 sentence summary of
what you built and any assumptions.`;
}

phase('Pages');
const pageResults = await parallel(
  SPECS.map((spec) => () => agent(buildPrompt(spec), { label: spec.label, phase: 'Pages' })),
);
log(`Pages built: ${pageResults.filter(Boolean).length}/${SPECS.length}`);

phase('Typecheck');
const fixReport = await agent(
  `The tm-tracker app's pages were just written by parallel agents. Make the whole
project typecheck cleanly.

Run: \`cd ${'/home/mint/Projects/past-paper-leaderboard'} && npx tsc -b\`
Fix EVERY error. Common causes: wrong import paths, unused vars/params (tsconfig has
noUnusedLocals/noUnusedParameters), missing types, calling a hook conditionally,
wrong prop shapes. Only edit files under src/. Do NOT weaken tsconfig, do NOT use
\`any\` to paper over real type errors, do NOT delete features to silence errors —
fix them properly. Re-run tsc after each round. Repeat until \`npx tsc -b\` exits 0
(or you've done 6 rounds). Then run \`npx vite build\` once and fix any build-only
errors too.

Report the final \`npx tsc -b\` exit status and a list of the substantive fixes you made.`,
  { label: 'typecheck-fix', phase: 'Typecheck' },
);
log('Typecheck phase done');

phase('Review');
const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          file: { type: 'string' },
          issue: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['severity', 'file', 'issue', 'suggestion'],
      },
    },
  },
  required: ['findings'],
};
const REVIEW_TARGETS = [
  { key: 'home+ranking', area: 'src/pages/HomePage.tsx + src/components/leaderboard/* against DESIGN.md §6/§10 (tabs, top-5 positions with shared/dense ranks, top-3 medal shading, separated You row, admin hides personal block, banner for non-TM)' },
  { key: 'tracker', area: 'src/pages/TrackerPage.tsx + src/components/tracker/* against DESIGN.md §7 (drag reorder persists, completed todos stay shaded, instant-tick, inline score/notes non-modal, privacy text, add-to-todo copies not moves, show-older toggle defaults to 2018+)' },
  { key: 'admin+auth', area: 'src/pages/AdminPage.tsx + src/components/admin/* + src/pages/OnboardingPage.tsx + src/components/OptionsModal.tsx against DESIGN.md §4/§5/§8 (TM toggle, admin toggle, class reassign, remove with confirm, class locked for students, sign out)' },
];
const reviews = await parallel(
  REVIEW_TARGETS.map((t) => () =>
    agent(
      `Adversarially review the tm-tracker implementation for CORRECTNESS and fidelity
to the spec. Focus: ${t.area}.
Read DESIGN.md and the actual files. Report concrete bugs or spec deviations only
(not style nitpicks): wrong logic, missing behavior, broken data flow, mismatched
props, runtime crashes, privacy leaks (scores/notes shown publicly), incorrect
ranking/tie handling. For each, give file, the issue, and a concrete fix. If a
category is correct, don't invent problems.`,
      { label: `review:${t.key}`, phase: 'Review', schema: REVIEW_SCHEMA },
    ),
  ),
);

const findings = reviews.filter(Boolean).flatMap((r) => r.findings || []);
return {
  pagesBuilt: pageResults.filter(Boolean).length,
  fixReport,
  findings,
};
