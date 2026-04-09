# Lead Management System — DiscountAutoParts

## TL;DR

> **Quick Summary**: Replace the team's CSV-based lead tracking with a full-stack web application. React + Vite frontend with Supabase backend (Postgres, Auth, Edge Functions, Realtime). Individual dashboards per sales rep, manager overview, standardized lead pipeline, round-robin assignment, and in-app real-time notifications.
> 
> **Deliverables**:
> - Supabase project with DB schema, RLS policies, Edge Functions
> - React + Vite SPA with role-based dashboards
> - In-app notification system (realtime via Supabase)
> - CSV import script for existing ~100 leads
> - Vercel deployment configuration
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Schema → Auth + RLS → Lead CRUD → Dashboard → Notifications → Deploy

---

## Context

### Original Request
User's team (DiscountAutoParts) tracks auto parts sales leads in a CSV file (`DiscountAutoParts - Sheet1.csv`). They want a proper web-based system with individual team member dashboards and in-dashboard notifications. Tech preferences: JavaScript, Supabase (DB + Auth + Edge Functions), React.

### Interview Summary
**Key Discussions**:
- **Framework**: React + Vite (SPA, no SSR needed)
- **Rahul = Manager/Supervisor**: Oversees Neal & Michael, sees all leads, assigns work
- **Lead Pipeline**: Standardized stages — New → Contacted → Quoted → Negotiating → Won / Lost / Dead
- **Notifications**: ALL types selected — new lead, follow-up reminders, status changes, daily summary, all via Supabase Realtime
- **Admin Dashboard**: Yes — manager sees everything, team performance, reassignment
- **Lead Assignment**: Round-robin automatic, manager can override
- **CSV Import**: Yes — migrate existing ~100 leads
- **Team Scale**: Will grow to 5-10 reps — need scalable user management
- **Lead Source**: Phone calls only (manual entry)
- **Daily Summary**: In-dashboard card (no email)
- **Hosting**: Vercel
- **Tests**: No automated tests — agent-executed QA only

**CSV Data Analysis (13 columns)**:
- Date, Customer Name, Phone, Secondary Info/Tags, Vehicle Year, Make, Model, Part Needed, Notes/Status, Follow-up Notes, Primary Rep, Secondary Rep, Extra
- ~100 existing leads with inconsistent status text
- Vehicle data is core: year/make/model/part + mileage/warranty pricing
- Tags observed: "Incompatible", "Spanish", "small part", "Abused", "no voice"

### Self-Gap Analysis (in lieu of Metis)
**Identified & Resolved**:
- **Supabase project creation**: User must create Supabase project manually and provide credentials. Plan includes env setup task.
- **RLS complexity**: Supabase Row Level Security is critical for role-based access. Dedicated task for this.
- **Edge Function cold starts**: Supabase Edge Functions run Deno. Round-robin logic must be stateless.
- **Realtime subscription management**: Must properly subscribe/unsubscribe to avoid memory leaks.
- **CSV date parsing**: Dates are informal ("25th march 26") — import script needs robust parsing.
- **Phone number formats**: Mix of formats in CSV — normalize on import.
- **Follow-up reminder trigger**: Need a scheduled Edge Function (cron) to check daily for due follow-ups and insert notifications.
- **Daily summary generation**: Also needs a cron Edge Function running each morning.

---

## Work Objectives

### Core Objective
Build a complete lead management web application that replaces CSV tracking, provides per-user dashboards, standardized pipeline management, and real-time in-app notifications — all powered by Supabase and deployed on Vercel.

### Concrete Deliverables
- Supabase DB schema (tables: leads, profiles, notifications, activity_log)
- Supabase RLS policies for role-based access
- 3 Edge Functions: round-robin assignment, follow-up reminder cron, daily summary cron
- React SPA: login, rep dashboard, manager dashboard, lead detail, notification panel
- CSV import utility
- Vercel deployment config (vercel.json + env vars)

### Definition of Done
- [ ] Manager can log in and see all leads across the team
- [ ] Sales rep can log in and see only their assigned leads
- [ ] New lead can be created with vehicle details and auto-assigned via round-robin
- [ ] Lead can progress through pipeline stages (New → Contacted → Quoted → Negotiating → Won/Lost/Dead)
- [ ] Follow-up dates trigger in-app reminder notifications
- [ ] Real-time: when manager updates a lead, the assigned rep sees it live (no refresh)
- [ ] Daily summary notification card appears for each user on login
- [ ] Existing CSV data is imported into the system
- [ ] App is deployed and accessible via Vercel URL

### Must Have
- Supabase Auth with role-based access (manager vs rep)
- Row Level Security — reps CANNOT see other reps' leads via API
- Standardized lead pipeline with stage transitions
- Round-robin lead assignment
- In-app notification bell with unread count
- Follow-up reminder notifications
- Search and filter on leads (by status, date, rep, vehicle make/model)
- CSV import of existing data
- Responsive layout (works on desktop, usable on tablet)

### Must NOT Have (Guardrails)
- NO email or SMS notifications (out of scope)
- NO web form lead capture or public-facing pages
- NO mobile native app
- NO advanced analytics or reporting dashboards (beyond basic counts/stats on dashboard)
- NO payment processing or invoicing
- NO inventory management
- NO multi-tenant / multi-company support
- NO over-abstraction — keep components simple and direct
- NO excessive comments or JSDoc on every function
- NO `any` types if using TypeScript features in JSX
- NO hardcoded Supabase credentials in source code (use env vars)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: NO
- **Framework**: None
- **QA Method**: Agent-executed QA scenarios per task (Playwright for UI, curl/Supabase client for API)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **API/Edge Functions**: Use Bash (curl) — Send requests, assert status + response fields
- **Database**: Use Bash (Supabase CLI / psql) — Query tables, verify RLS, check constraints
- **Realtime**: Use Playwright — Open 2 tabs, trigger event in one, assert notification in other

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — mostly parallel, with intra-wave dependencies):
├── Task 1: Project scaffolding — React + Vite + Supabase client setup [quick] (independent)
├── Task 2: Supabase DB schema — all tables, enums, indexes [unspecified-high] (independent)
├── Task 3: Supabase Auth + profiles setup + RLS policies [deep] (starts after Task 2 — needs tables for RLS)
├── Task 4: UI design system — shared components (Button, Input, Badge, Modal, etc.) [visual-engineering] (starts after Task 1 — needs React project)

Wave 2 (Core features — after Wave 1):
├── Task 5: Lead CRUD — create, read, update, delete leads (depends: 1, 2, 3) [unspecified-high]
├── Task 6: Round-robin assignment Edge Function (depends: 2, 3) [deep]
├── Task 7: Notification system — DB triggers + Realtime subscriptions + bell UI (depends: 2, 3, 4) [deep]
├── Task 8: CSV import script (depends: 2) [quick]

Wave 3 (Dashboards & UX — after Wave 2):
├── Task 9: Sales rep dashboard — my leads, follow-ups, stats (depends: 5, 7) [visual-engineering]
├── Task 10: Manager dashboard — all leads, team view, reassignment (depends: 5, 7) [visual-engineering]
├── Task 11: Lead detail page + pipeline stage transitions (depends: 5, 4) [visual-engineering]
├── Task 12: Search, filter & sort on leads list (depends: 5) [unspecified-high]
├── Task 13: Follow-up reminder Edge Function (cron) (depends: 7) [quick]
├── Task 14: Daily summary Edge Function (cron) (depends: 7) [quick]

Wave 4 (Polish & Deploy — after Wave 3):
├── Task 15: Vercel deployment + env config (depends: all) [quick]
├── Task 16: Run CSV import on production data (depends: 8, 15) [quick]

Wave FINAL (Verification — after ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 5 → Task 9/10 → Task 15 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1, 2, 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 5, 6, 7, 8, 9, 10, 11, 12 | 1 |
| 2 | — | 3, 5, 6, 7, 8, 12, 13, 14 | 1 |
| 3 | 2 | 5, 6, 7, 9, 10 | 1 |
| 4 | — | 7, 9, 10, 11 | 1 |
| 5 | 1, 2, 3 | 9, 10, 11, 12 | 2 |
| 6 | 2, 3 | 9, 10 | 2 |
| 7 | 2, 3, 4 | 9, 10, 13, 14 | 2 |
| 8 | 2 | 16 | 2 |
| 9 | 5, 7 | 15 | 3 |
| 10 | 5, 7 | 15 | 3 |
| 11 | 5, 4 | 15 | 3 |
| 12 | 5 | 15 | 3 |
| 13 | 7 | 15 | 3 |
| 14 | 7 | 15 | 3 |
| 15 | all | 16 | 4 |
| 16 | 8, 15 | — | 4 |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1 → `quick`, T2 → `unspecified-high`, T3 → `deep`, T4 → `visual-engineering`
- **Wave 2**: **4 tasks** — T5 → `unspecified-high`, T6 → `deep`, T7 → `deep`, T8 → `quick`
- **Wave 3**: **6 tasks** — T9 → `visual-engineering`, T10 → `visual-engineering`, T11 → `visual-engineering`, T12 → `unspecified-high`, T13 → `quick`, T14 → `quick`
- **Wave 4**: **2 tasks** — T15 → `quick`, T16 → `quick`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Project Scaffolding — React + Vite + Supabase Client Setup

  **What to do**:
  - Initialize a new React + Vite project in the `/Users/apple/work/lead_management` directory (alongside the existing CSV)
  - Install dependencies: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `lucide-react` (icons)
  - Set up project structure:
    ```
    src/
      components/     # Shared components
        ui/           # Design system (Task 4)
      pages/          # Route pages
      lib/            # Supabase client, utilities
      hooks/          # Custom React hooks
      context/        # Auth context, notification context
    ```
  - Create `src/lib/supabase.js` — Supabase client initialized from env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  - Create `.env.example` with placeholder Supabase vars
  - Create `.env` with actual Supabase project credentials (user must create Supabase project first — add comment in .env.example)
  - Set up React Router with placeholder routes: `/login`, `/dashboard`, `/manager`, `/leads`, `/leads/:id`
  - Create a minimal `App.jsx` with router setup and an `AuthProvider` context shell (actual auth logic in Task 3)
  - Add `vercel.json` with SPA rewrite rule: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
  - Verify `npm run dev` starts and shows a "Lead Management" heading

  **Must NOT do**:
  - Do NOT install a CSS framework or UI library (we build our own lightweight design system in Task 4)
  - Do NOT implement actual auth logic (Task 3)
  - Do NOT connect to Supabase yet (just client init)
  - Do NOT add excessive boilerplate or abstraction layers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard scaffolding task, well-understood steps, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no UI to test yet, just build verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 8, 9, 10, 11, 12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - No existing codebase — greenfield project

  **External References**:
  - Vite React quickstart: `npm create vite@latest . -- --template react`
  - Supabase JS client docs: https://supabase.com/docs/reference/javascript/initializing
  - React Router v6 docs: https://reactrouter.com/en/main/start/overview

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dev server starts and renders app shell
    Tool: Bash
    Preconditions: Dependencies installed (npm install completed)
    Steps:
      1. Run `npm run build` — must exit 0
      2. Run `npm run preview &` — start preview server
      3. curl http://localhost:4173 — should return HTML containing "Lead Management"
      4. Kill preview server
    Expected Result: Build succeeds, HTML contains app shell markup
    Failure Indicators: Build errors, missing dependencies, blank page
    Evidence: .sisyphus/evidence/task-1-build-success.txt

  Scenario: Supabase client module exports correctly
    Tool: Bash
    Preconditions: src/lib/supabase.js exists
    Steps:
      1. Check file exists and exports `supabase` client
      2. Verify .env.example contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
      3. Verify no hardcoded URLs or keys in supabase.js
    Expected Result: Client module uses import.meta.env for credentials
    Failure Indicators: Hardcoded credentials, missing env vars
    Evidence: .sisyphus/evidence/task-1-supabase-client.txt

  Scenario: Route structure renders without errors
    Tool: Bash
    Preconditions: App built successfully
    Steps:
      1. Run preview server
      2. curl http://localhost:4173/login — should return 200
      3. curl http://localhost:4173/dashboard — should return 200
      4. curl http://localhost:4173/nonexistent — should still return 200 (SPA)
    Expected Result: All routes return 200 (SPA routing)
    Failure Indicators: 404 errors, routing crashes
    Evidence: .sisyphus/evidence/task-1-routes.txt
  ```

  **Commit**: YES
  - Message: `chore(scaffold): init React+Vite with Supabase client`
  - Files: `package.json, vite.config.js, src/*, .env.example, vercel.json`
  - Pre-commit: `npm run build`

---

- [ ] 2. Supabase DB Schema — Tables, Enums, Indexes, Triggers

  **What to do**:
  - Initialize Supabase locally: `supabase init` (if not already) and create migration files under `supabase/migrations/`
  - Create the following database objects:

  **Enums**:
  ```sql
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'dead');
  CREATE TYPE user_role AS ENUM ('manager', 'rep');
  CREATE TYPE notification_type AS ENUM ('lead_assigned', 'follow_up_reminder', 'status_change', 'daily_summary');
  ```

  **Tables**:

  `profiles` — extends Supabase auth.users:
  - `id` UUID PK (references auth.users.id)
  - `full_name` TEXT NOT NULL
  - `role` user_role NOT NULL DEFAULT 'rep'
  - `is_active` BOOLEAN DEFAULT true (for round-robin — only active reps get leads)
  - `created_at`, `updated_at` TIMESTAMPTZ

  `leads`:
  - `id` UUID PK DEFAULT gen_random_uuid()
  - `date` DATE NOT NULL
  - `customer_name` TEXT
  - `phone` TEXT
  - `phone_secondary` TEXT
  - `vehicle_year` INTEGER
  - `vehicle_make` TEXT
  - `vehicle_model` TEXT
  - `part_needed` TEXT
  - `part_detail` TEXT (engine size, transmission type, etc.)
  - `status` lead_status NOT NULL DEFAULT 'new'
  - `notes` TEXT
  - `follow_up_notes` TEXT
  - `follow_up_date` DATE (nullable — when set, triggers reminder)
  - `price_quoted` DECIMAL(10,2)
  - `mileage` TEXT
  - `warranty_info` TEXT
  - `tags` TEXT[] (for things like 'spanish', 'incompatible', 'small_part', 'abused')
  - `assigned_to` UUID REFERENCES profiles(id)
  - `created_by` UUID REFERENCES profiles(id)
  - `created_at`, `updated_at` TIMESTAMPTZ

  `notifications`:
  - `id` UUID PK DEFAULT gen_random_uuid()
  - `user_id` UUID REFERENCES profiles(id) NOT NULL
  - `type` notification_type NOT NULL
  - `title` TEXT NOT NULL
  - `message` TEXT NOT NULL
  - `lead_id` UUID REFERENCES leads(id) (nullable — some notifications are general)
  - `is_read` BOOLEAN DEFAULT false
  - `created_at` TIMESTAMPTZ DEFAULT now()

  `activity_log` (tracks changes for audit):
  - `id` UUID PK DEFAULT gen_random_uuid()
  - `lead_id` UUID REFERENCES leads(id)
  - `user_id` UUID REFERENCES profiles(id)
  - `action` TEXT NOT NULL (e.g., 'status_changed', 'assigned', 'note_added')
  - `old_value` TEXT
  - `new_value` TEXT
  - `created_at` TIMESTAMPTZ DEFAULT now()

  **Indexes**:
  - `leads.assigned_to` — fast lookup for rep's leads
  - `leads.status` — fast pipeline filtering
  - `leads.follow_up_date` — fast reminder query
  - `leads.created_at` — sort by newest
  - `notifications.user_id, is_read` — fast unread count
  - `notifications.created_at` — sort notifications

  **Database Triggers/Functions**:
  - `on_lead_status_change()` — when `leads.status` changes, insert a `notification` for the assigned rep AND log to `activity_log`
  - `on_lead_assigned()` — when `leads.assigned_to` changes, insert a `lead_assigned` notification for the new assignee AND log to `activity_log`
  - `handle_updated_at()` — auto-set `updated_at` on any row update (for leads and profiles)
  - `on_auth_user_created()` — auto-create a `profiles` row when a new auth user signs up (Supabase standard pattern)

  **Must NOT do**:
  - Do NOT create RLS policies here (Task 3)
  - Do NOT create Edge Functions here
  - Do NOT add unnecessary tables (no invoices, no inventory)
  - Do NOT use JSONB for structured data that has known columns

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex SQL with multiple tables, triggers, and functions requiring careful relational design
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 3, 5, 6, 7, 8, 12, 13, 14
  - **Blocked By**: None (can start immediately — but Task 3 should start after this finishes since RLS depends on tables existing)

  **References**:

  **Pattern References**:
  - CSV file for column mapping: `/Users/apple/work/lead_management/DiscountAutoParts - Sheet1.csv`
    - Map Column 1→date, 2→customer_name, 3→phone, 4→phone_secondary/tags, 5→vehicle_year, 6→vehicle_make, 7→vehicle_model, 8→part_needed, 9→notes, 10→follow_up_notes, 11→assigned_to (primary), 12→assigned_to (secondary/manager), 13→extra

  **External References**:
  - Supabase DB guide: https://supabase.com/docs/guides/database
  - Supabase trigger functions: https://supabase.com/docs/guides/database/postgres/triggers

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All tables created with correct columns
    Tool: Bash (supabase CLI or psql)
    Preconditions: Supabase project running locally
    Steps:
      1. Run `supabase db reset` to apply all migrations
      2. Query: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' — expect: profiles, leads, notifications, activity_log
      3. Query: SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' — expect all lead columns listed above
      4. Query: SELECT typname FROM pg_type WHERE typname IN ('lead_status', 'user_role', 'notification_type') — expect 3 rows
    Expected Result: All 4 tables exist with correct columns, all 3 enums exist
    Failure Indicators: Missing tables, wrong column types, missing enums
    Evidence: .sisyphus/evidence/task-2-schema-verify.txt

  Scenario: Triggers fire correctly on lead status change
    Tool: Bash (psql)
    Preconditions: Tables and triggers created, test profile inserted
    Steps:
      1. Insert a test profile: INSERT INTO profiles (id, full_name, role) VALUES ('test-uuid', 'Test Rep', 'rep')
      2. Insert a test lead assigned to test profile with status 'new'
      3. UPDATE leads SET status = 'quoted' WHERE id = [test-lead-id]
      4. Query notifications table — expect a 'status_change' notification for 'test-uuid'
      5. Query activity_log — expect a 'status_changed' entry with old_value='new', new_value='quoted'
    Expected Result: Both notification and activity_log rows created automatically
    Failure Indicators: No notification created, no activity_log entry, trigger error
    Evidence: .sisyphus/evidence/task-2-triggers-verify.txt

  Scenario: Indexes exist on key columns
    Tool: Bash (psql)
    Preconditions: Migrations applied
    Steps:
      1. Query: SELECT indexname FROM pg_indexes WHERE tablename = 'leads' — expect indexes on assigned_to, status, follow_up_date, created_at
      2. Query: SELECT indexname FROM pg_indexes WHERE tablename = 'notifications' — expect indexes on user_id+is_read, created_at
    Expected Result: All specified indexes present
    Failure Indicators: Missing indexes
    Evidence: .sisyphus/evidence/task-2-indexes-verify.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add Supabase schema — leads, profiles, notifications, activity_log`
  - Files: `supabase/migrations/*.sql`
  - Pre-commit: `supabase db reset` (migrations apply cleanly)

---

- [ ] 3. Supabase Auth + RLS Policies + Profile Sync + Auth UI

  **What to do**:
  - **Auth Setup**:
    - Configure Supabase Auth for email/password login (simplest for internal team tool)
    - Create `src/context/AuthContext.jsx` — React context providing: `user`, `profile` (with role), `signIn`, `signOut`, `loading`
    - On mount, check `supabase.auth.getSession()` — if session exists, fetch profile from `profiles` table
    - Subscribe to `supabase.auth.onAuthStateChange` for session changes
    - Create `src/components/ProtectedRoute.jsx` — redirects to `/login` if no session, optionally checks role (manager-only routes)
    - Create `src/pages/Login.jsx` — simple email/password login form. Show error messages. Redirect to `/dashboard` on success.

  - **Profile Sync** (relies on trigger from Task 2):
    - The `on_auth_user_created` trigger (Task 2) auto-creates a profile row
    - In the Supabase dashboard (or via migration), pre-create the 3 initial users: Rahul (manager), Neal (rep), Michael (rep) — or document as a manual step with SQL provided

  - **RLS Policies** (CRITICAL — security boundary):
    - Enable RLS on ALL public tables: `leads`, `profiles`, `notifications`, `activity_log`

    `profiles`:
    - SELECT: Users can read all profiles (needed for displaying names) — `USING (true)`
    - UPDATE: Users can only update their own profile — `USING (auth.uid() = id)`

    `leads`:
    - SELECT: Managers can see all leads. Reps can only see leads assigned to them — `USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager') OR assigned_to = auth.uid())`
    - INSERT: Any authenticated user can create leads — `WITH CHECK (auth.uid() IS NOT NULL)`
    - UPDATE: Managers can update any lead. Reps can only update their assigned leads — same pattern as SELECT
    - DELETE: Managers only — `USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))`

    `notifications`:
    - SELECT: Users can only read their own notifications — `USING (user_id = auth.uid())`
    - UPDATE: Users can only update their own (mark as read) — `USING (user_id = auth.uid())`
    - INSERT: Only service_role or trigger functions (not direct user insert)

    `activity_log`:
    - SELECT: Managers can read all. Reps can read activity on their leads — similar to leads policy
    - INSERT: Only triggers (not direct user insert)

  - **Wire up routing in App.jsx**:
    - Wrap routes in `AuthProvider`
    - `/login` — public
    - `/dashboard` — protected, any role
    - `/manager` — protected, manager only
    - `/leads/*` — protected, any role

  **Must NOT do**:
  - Do NOT implement OAuth/social login (email/password only for internal tool)
  - Do NOT add password reset flow (out of scope for MVP — manager can reset via Supabase dashboard)
  - Do NOT create the login UI with excessive styling (Task 4's design system will be available — use basic inline styles or minimal CSS module)
  - Do NOT bypass RLS for convenience — every policy must be tested

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Auth + RLS is security-critical. Wrong RLS policies = data leaks between reps. Requires careful SQL and thorough testing.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: PARTIAL — can start in Wave 1 but depends on Task 2 tables existing for RLS policies
  - **Parallel Group**: Wave 1 (start auth context/UI in parallel; apply RLS after Task 2 schema is done)
  - **Blocks**: Tasks 5, 6, 7, 9, 10
  - **Blocked By**: Task 2 (for RLS policies on tables)

  **References**:

  **External References**:
  - Supabase Auth guide: https://supabase.com/docs/guides/auth
  - Supabase RLS guide: https://supabase.com/docs/guides/auth/row-level-security
  - Supabase auth helpers for React: https://supabase.com/docs/guides/auth/auth-helpers/react

  **WHY Each Reference Matters**:
  - Auth guide: Shows `signInWithPassword`, session management, `onAuthStateChange` pattern
  - RLS guide: Shows policy syntax, `auth.uid()` usage, common patterns for role-based access
  - React helpers: Shows how to integrate auth state with React context

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Login with valid credentials succeeds
    Tool: Playwright
    Preconditions: Supabase running, test user created (rep role)
    Steps:
      1. Navigate to http://localhost:5173/login
      2. Fill input[name="email"] with "neal@test.com"
      3. Fill input[name="password"] with "testpass123"
      4. Click button[type="submit"]
      5. Wait for navigation to /dashboard
      6. Assert URL is /dashboard
      7. Assert page contains the user's name or "Dashboard" heading
    Expected Result: Redirected to dashboard, user session established
    Failure Indicators: Stays on login, error message, 401
    Evidence: .sisyphus/evidence/task-3-login-success.png

  Scenario: Login with invalid credentials shows error
    Tool: Playwright
    Preconditions: Supabase running
    Steps:
      1. Navigate to http://localhost:5173/login
      2. Fill input[name="email"] with "wrong@test.com"
      3. Fill input[name="password"] with "wrongpass"
      4. Click button[type="submit"]
      5. Assert error message is visible on page (text contains "Invalid" or "error")
      6. Assert URL is still /login
    Expected Result: Error displayed, stays on login page
    Failure Indicators: Redirects anyway, no error shown, app crashes
    Evidence: .sisyphus/evidence/task-3-login-failure.png

  Scenario: RLS prevents rep from seeing other rep's leads
    Tool: Bash (curl with Supabase REST API)
    Preconditions: Two reps exist (Neal, Michael), each has leads assigned
    Steps:
      1. Get auth token for Neal: curl -X POST supabase_url/auth/v1/token?grant_type=password -d '{"email":"neal@test.com","password":"testpass123"}'
      2. Query leads as Neal: curl supabase_url/rest/v1/leads -H "Authorization: Bearer <neal_token>" -H "apikey: <anon_key>"
      3. Assert response contains ONLY leads where assigned_to = Neal's UUID
      4. Assert response does NOT contain any leads assigned to Michael
    Expected Result: Neal sees only his leads, zero of Michael's
    Failure Indicators: Michael's leads visible, all leads visible, 403 error
    Evidence: .sisyphus/evidence/task-3-rls-rep-isolation.txt

  Scenario: RLS allows manager to see all leads
    Tool: Bash (curl)
    Preconditions: Manager user exists (Rahul), leads assigned to various reps
    Steps:
      1. Get auth token for Rahul (manager role)
      2. Query leads as Rahul
      3. Assert response contains leads from ALL reps
    Expected Result: Manager sees every lead in the system
    Failure Indicators: Only sees own leads, missing leads, error
    Evidence: .sisyphus/evidence/task-3-rls-manager-all.txt

  Scenario: Protected routes redirect unauthenticated users
    Tool: Playwright
    Preconditions: No active session (clear cookies/storage)
    Steps:
      1. Navigate directly to http://localhost:5173/dashboard
      2. Assert URL redirected to /login
      3. Navigate directly to http://localhost:5173/manager
      4. Assert URL redirected to /login
    Expected Result: Both protected routes redirect to login
    Failure Indicators: Dashboard renders without auth, no redirect
    Evidence: .sisyphus/evidence/task-3-protected-routes.png
  ```

  **Commit**: YES
  - Message: `feat(auth): add Supabase Auth + RLS policies + profile sync`
  - Files: `supabase/migrations/*.sql, src/context/AuthContext.jsx, src/components/ProtectedRoute.jsx, src/pages/Login.jsx`
  - Pre-commit: `npm run build`

---

- [ ] 4. UI Design System — Shared Components + Global Styles

  **What to do**:
  - Create a lightweight, consistent design system using CSS modules (no external UI library)
  - Create global styles in `src/index.css`:
    - CSS custom properties (variables) for colors, spacing, typography, border-radius
    - Color palette: professional, clean — primary blue, success green, warning amber, danger red, neutral grays
    - Base reset and typography

  - Create shared components in `src/components/ui/`:
    - `Button.jsx` — variants: primary, secondary, danger, ghost. Sizes: sm, md, lg. Loading state.
    - `Input.jsx` — text input with label, error state, helper text
    - `Select.jsx` — dropdown select with label
    - `Badge.jsx` — status badges with colors mapped to lead_status enum (new=blue, contacted=yellow, quoted=purple, negotiating=orange, won=green, lost=red, dead=gray)
    - `Modal.jsx` — overlay modal with title, body, footer actions, close on escape/backdrop
    - `Card.jsx` — content card with optional header and footer
    - `Table.jsx` — data table with header, rows, optional sorting indicator
    - `Spinner.jsx` — loading spinner
    - `EmptyState.jsx` — "No data" placeholder with icon and message
    - `NotificationBadge.jsx` — red circle with unread count (for bell icon)
    - `Layout.jsx` — app shell with sidebar navigation, top bar with user name + notification bell, main content area
    - `Sidebar.jsx` — navigation: Dashboard, Leads, Manager (visible only for manager role). Active state indicator.

  - Each component should be simple, functional, no over-engineering
  - Use `lucide-react` for icons throughout

  **Must NOT do**:
  - Do NOT install Tailwind, MUI, Chakra, Ant Design, or any CSS framework
  - Do NOT create a complex theme system or dark mode
  - Do NOT add animations beyond simple transitions (hover, focus)
  - Do NOT create components that aren't needed by the plan (no Accordion, Tabs, Carousel, etc.)
  - Do NOT add Storybook or component documentation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component design requiring visual consistency, responsive layout, and design sensibility
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 7, 9, 10, 11
  - **Blocked By**: Task 1 (needs React project to exist) — but can start ASAP after Task 1

  **References**:

  **External References**:
  - Lucide React icons: https://lucide.dev/guide/packages/lucide-react
  - CSS Modules in Vite: https://vitejs.dev/guide/features.html#css-modules

  **WHY Each Reference Matters**:
  - Lucide: Icon library to use for bell, search, filter, chevron, etc.
  - CSS Modules: Vite's built-in scoped CSS approach — use `*.module.css` convention

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All shared components render without errors
    Tool: Playwright
    Preconditions: Dev server running, a test page or route exists that renders all components
    Steps:
      1. Navigate to http://localhost:5173 (app shell should use Layout)
      2. Assert sidebar is visible with navigation links
      3. Assert top bar is visible with notification bell icon
      4. Take screenshot of full layout
    Expected Result: Layout renders with sidebar, top bar, content area
    Failure Indicators: Missing sidebar, broken layout, CSS errors in console
    Evidence: .sisyphus/evidence/task-4-layout.png

  Scenario: Badge component shows correct colors for each lead status
    Tool: Bash
    Preconditions: Badge component exists
    Steps:
      1. Read Badge.jsx source — verify it maps each lead_status to a distinct color
      2. Verify all 7 statuses are mapped: new, contacted, quoted, negotiating, won, lost, dead
      3. npm run build — no CSS errors
    Expected Result: All 7 statuses have color mappings, build succeeds
    Failure Indicators: Missing status mapping, build error
    Evidence: .sisyphus/evidence/task-4-badge-colors.txt

  Scenario: Modal opens and closes correctly
    Tool: Playwright
    Preconditions: A page that triggers modal open
    Steps:
      1. Trigger modal open (via a test button or lead form action)
      2. Assert modal overlay is visible
      3. Assert modal content is visible
      4. Press Escape key
      5. Assert modal is closed (overlay gone)
    Expected Result: Modal opens, displays content, closes on Escape
    Failure Indicators: Modal doesn't appear, doesn't close, overlay persists
    Evidence: .sisyphus/evidence/task-4-modal.png

  Scenario: Layout is responsive on tablet viewport
    Tool: Playwright
    Preconditions: Dev server running, Layout component rendered
    Steps:
      1. Set viewport to 1024x768 (tablet landscape)
      2. Navigate to http://localhost:5173
      3. Assert sidebar is visible (may collapse to icon-only or hamburger)
      4. Assert main content area is usable — no horizontal overflow
      5. Set viewport to 768x1024 (tablet portrait)
      6. Assert layout adapts — sidebar collapses or becomes a hamburger menu
      7. Assert content area fills available width
      8. Take screenshot at both viewports
    Expected Result: Layout remains usable at tablet viewports, no overflow
    Failure Indicators: Content cut off, horizontal scroll, sidebar overlaps content
    Evidence: .sisyphus/evidence/task-4-responsive-tablet.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add shared design system components`
  - Files: `src/components/ui/*, src/index.css`
  - Pre-commit: `npm run build`

---

- [ ] 5. Lead CRUD — Create, Read, Update, Delete Leads

  **What to do**:
  - Create `src/lib/leads.js` — Supabase query functions:
    - `getLeads(filters)` — fetch leads with optional filters (status, assigned_to, date range, search query). Uses `.select('*, profiles!assigned_to(full_name)')` to join assigned rep name.
    - `getLeadById(id)` — fetch single lead with full details + activity_log
    - `createLead(data)` — insert new lead. After insert, invoke the round-robin assignment Edge Function (Task 6) or set `assigned_to` if manually specified.
    - `updateLead(id, data)` — update lead fields. DB triggers (Task 2) handle notifications and activity logging.
    - `deleteLead(id)` — soft delete or hard delete (manager only). Use hard delete for MVP.
  - Create `src/pages/Leads.jsx` — leads list page:
    - Table view showing: date, customer name, phone, vehicle (year make model), part, status badge, assigned rep
    - "New Lead" button opens a modal with the lead creation form
    - Each row is clickable → navigates to lead detail (Task 11)
    - Pagination or infinite scroll for large datasets (simple offset-based pagination)
  - Create `src/components/LeadForm.jsx` — reusable form for create/edit:
    - Fields: customer_name, phone, phone_secondary, vehicle_year (number), vehicle_make, vehicle_model, part_needed, part_detail, notes, follow_up_date (date picker), tags (multi-select from predefined list), price_quoted, mileage, warranty_info
    - Validation: phone is required, vehicle_year is 4-digit number
    - On submit: call `createLead` or `updateLead`
  - Loading states using Spinner component
  - Empty state when no leads exist using EmptyState component

  **Must NOT do**:
  - Do NOT implement search/filter UI here (Task 12)
  - Do NOT implement the lead detail page (Task 11)
  - Do NOT implement round-robin logic (Task 6) — just call the Edge Function endpoint
  - Do NOT add drag-and-drop or Kanban view
  - Do NOT over-validate — keep form simple

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core business logic — CRUD with Supabase queries, form handling, data display. Not purely visual, not purely algorithmic.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Tasks 9, 10, 11, 12
  - **Blocked By**: Tasks 1 (React app), 2 (DB schema), 3 (Auth + RLS)

  **References**:

  **Pattern References**:
  - DB schema from Task 2 — leads table columns define form fields and query shape
  - Auth context from Task 3 — use `useAuth()` to get current user for RLS-aware queries
  - UI components from Task 4 — use Button, Input, Select, Badge, Table, Modal, Card, Spinner, EmptyState

  **External References**:
  - Supabase JS select with joins: https://supabase.com/docs/reference/javascript/select
  - Supabase JS insert: https://supabase.com/docs/reference/javascript/insert

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create a new lead with vehicle details
    Tool: Playwright
    Preconditions: Logged in as rep (Neal), dev server running
    Steps:
      1. Navigate to /leads
      2. Click "New Lead" button
      3. Assert modal opens with lead form
      4. Fill input[name="customer_name"] with "John Test"
      5. Fill input[name="phone"] with "15551234567"
      6. Fill input[name="vehicle_year"] with "2015"
      7. Fill input[name="vehicle_make"] with "Ford"
      8. Fill input[name="vehicle_model"] with "F-150"
      9. Fill input[name="part_needed"] with "Engine"
      10. Click submit button
      11. Assert modal closes
      12. Assert leads table now contains a row with "John Test" and "Ford F-150"
    Expected Result: Lead appears in list with correct data
    Failure Indicators: Form validation error, lead not in list, wrong data
    Evidence: .sisyphus/evidence/task-5-create-lead.png

  Scenario: Edit an existing lead
    Tool: Playwright
    Preconditions: Logged in, at least one lead exists
    Steps:
      1. Navigate to /leads
      2. Click edit button on first lead row
      3. Change customer_name to "Updated Name"
      4. Click save/submit
      5. Assert table row now shows "Updated Name"
    Expected Result: Lead updated in place, table reflects change
    Failure Indicators: Old name still showing, error on save
    Evidence: .sisyphus/evidence/task-5-edit-lead.png

  Scenario: Delete a lead (manager only)
    Tool: Playwright
    Preconditions: Logged in as manager (Rahul)
    Steps:
      1. Navigate to /leads
      2. Note the number of leads
      3. Click delete button on a lead
      4. Confirm deletion in modal
      5. Assert lead count decreased by 1
      6. Assert deleted lead no longer in table
    Expected Result: Lead removed from list
    Failure Indicators: Lead still visible, error on delete
    Evidence: .sisyphus/evidence/task-5-delete-lead.png

  Scenario: Rep cannot delete leads
    Tool: Playwright
    Preconditions: Logged in as rep (Neal)
    Steps:
      1. Navigate to /leads
      2. Assert no delete button is visible on any lead row
    Expected Result: Delete action not available to reps
    Failure Indicators: Delete button visible to rep
    Evidence: .sisyphus/evidence/task-5-rep-no-delete.png

  Scenario: Empty state shows when no leads
    Tool: Playwright
    Preconditions: Logged in, no leads assigned to current user
    Steps:
      1. Navigate to /leads
      2. Assert EmptyState component is visible with appropriate message
    Expected Result: "No leads" message with icon displayed
    Failure Indicators: Blank page, error, table headers with no body
    Evidence: .sisyphus/evidence/task-5-empty-state.png
  ```

  **Commit**: YES
  - Message: `feat(leads): add lead CRUD with vehicle data`
  - Files: `src/lib/leads.js, src/pages/Leads.jsx, src/components/LeadForm.jsx`
  - Pre-commit: `npm run build`

---

- [ ] 6. Round-Robin Assignment — Supabase Edge Function

  **What to do**:
  - Create Supabase Edge Function: `supabase/functions/assign-lead/index.ts`
  - The function:
    - Is called after a new lead is created (from frontend or could be a DB trigger)
    - Accepts: `{ lead_id: string }` in request body
    - Queries `profiles` for all active reps (`role = 'rep'` AND `is_active = true`)
    - Queries `leads` to find which rep was most recently assigned a lead (by `created_at` desc)
    - Assigns the new lead to the NEXT rep in rotation (alphabetical by name, cycling)
    - Updates `leads.assigned_to` for the given lead_id
    - Returns: `{ assigned_to: uuid, assigned_name: string }`
  - Edge Function uses `supabase.createClient` with service_role key (bypasses RLS for assignment)
  - Handle edge cases:
    - Only 1 active rep → always assign to them
    - No active reps → return error
    - All reps have equal lead count → assign to first alphabetically
  - Create `src/lib/assignment.js` — frontend helper to call the Edge Function:
    - `assignLead(leadId)` — calls the Edge Function endpoint
    - Used by `createLead()` in Task 5 after inserting a new lead

  **Must NOT do**:
  - Do NOT implement weighted round-robin or skill-based routing
  - Do NOT consider time zones or availability schedules
  - Do NOT build an admin UI for assignment rules (round-robin is automatic)
  - Keep the logic simple — true round-robin, not load-balanced

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Edge Function in Deno runtime, service_role key usage, stateless round-robin logic with edge cases
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Tasks 2 (schema), 3 (auth/profiles)

  **References**:

  **Pattern References**:
  - `profiles` table (Task 2) — `role`, `is_active` columns used for rep selection
  - `leads` table (Task 2) — `assigned_to`, `created_at` used for rotation tracking

  **External References**:
  - Supabase Edge Functions guide: https://supabase.com/docs/guides/functions
  - Supabase Edge Functions: creating client inside function: https://supabase.com/docs/guides/functions/auth

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Round-robin assigns to next rep in rotation
    Tool: Bash (curl)
    Preconditions: 2 active reps exist (Neal, Michael). No leads yet.
    Steps:
      1. Create lead_1 via API, call assign-lead Edge Function with lead_1.id
      2. Assert lead_1.assigned_to = first rep (alphabetically: Michael)
      3. Create lead_2 via API, call assign-lead Edge Function with lead_2.id
      4. Assert lead_2.assigned_to = second rep (Neal)
      5. Create lead_3 via API, call assign-lead Edge Function with lead_3.id
      6. Assert lead_3.assigned_to = Michael again (rotation)
    Expected Result: Leads alternate between Michael and Neal
    Failure Indicators: Same rep gets all leads, error from Edge Function
    Evidence: .sisyphus/evidence/task-6-round-robin.txt

  Scenario: Only active reps receive leads
    Tool: Bash (curl + psql)
    Preconditions: 2 reps, set Michael as is_active=false
    Steps:
      1. UPDATE profiles SET is_active = false WHERE full_name = 'Michael'
      2. Create a lead and call assign-lead
      3. Assert lead is assigned to Neal (only active rep)
      4. Create another lead and call assign-lead
      5. Assert also assigned to Neal
    Expected Result: Inactive rep never receives leads
    Failure Indicators: Lead assigned to inactive Michael
    Evidence: .sisyphus/evidence/task-6-active-only.txt

  Scenario: No active reps returns error
    Tool: Bash (curl)
    Preconditions: All reps set to is_active=false
    Steps:
      1. Set all reps inactive
      2. Call assign-lead Edge Function
      3. Assert response status is 400 or 422
      4. Assert response body contains error message about no active reps
    Expected Result: Graceful error, no assignment
    Failure Indicators: 500 error, silent failure, assigned to manager
    Evidence: .sisyphus/evidence/task-6-no-reps-error.txt
  ```

  **Commit**: YES
  - Message: `feat(assignment): add round-robin Edge Function`
  - Files: `supabase/functions/assign-lead/index.ts, src/lib/assignment.js`
  - Pre-commit: `supabase functions serve` (no startup errors)

---

- [ ] 7. Notification System — DB Layer + Realtime Subscriptions + Bell UI

  **What to do**:
  - This is the core notification infrastructure that Tasks 13, 14 (cron functions) will build on.

  **Database layer** (additions to Task 2 schema if needed):
  - Verify `notifications` table has Realtime enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`
  - Ensure DB triggers from Task 2 are inserting notifications on: lead_assigned, status_change

  **React Notification Context** — `src/context/NotificationContext.jsx`:
  - On mount, fetch unread notifications: `supabase.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false })`
  - Subscribe to Supabase Realtime: `supabase.channel('notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, handleNewNotification).subscribe()`
  - Provide: `notifications`, `unreadCount`, `markAsRead(id)`, `markAllAsRead()`
  - On new notification via Realtime: add to state, increment unread count, optionally play a subtle sound or flash the bell

  **Notification Bell UI** — `src/components/NotificationBell.jsx`:
  - Bell icon (from lucide-react) in the top bar (Layout component from Task 4)
  - Red badge showing unread count (using NotificationBadge from Task 4)
  - Click bell → opens dropdown panel showing recent notifications
  - Each notification shows: icon (by type), title, message, time ago, read/unread indicator
  - Click notification → marks as read, navigates to related lead (if lead_id exists)
  - "Mark all as read" button at top of dropdown
  - Dropdown closes on click outside

  **Notification Panel page** (optional — if too many notifications for dropdown):
  - `src/pages/Notifications.jsx` — full list of all notifications with pagination
  - Link from bell dropdown: "View all notifications"

  **Cleanup**:
  - Unsubscribe from Realtime channel on unmount (prevent memory leaks)
  - Handle Realtime connection errors gracefully

  **Must NOT do**:
  - Do NOT implement follow-up reminders here (Task 13)
  - Do NOT implement daily summary here (Task 14)
  - Do NOT send browser push notifications or desktop notifications
  - Do NOT implement email/SMS delivery
  - Do NOT add notification preferences/settings

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Supabase Realtime subscriptions, React context state management, dropdown UI logic, and cleanup patterns require careful implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8)
  - **Blocks**: Tasks 9, 10, 13, 14
  - **Blocked By**: Tasks 2 (notifications table), 3 (auth for user_id), 4 (UI components for bell/badge)

  **References**:

  **Pattern References**:
  - `notifications` table schema from Task 2 — columns define notification shape
  - `NotificationBadge.jsx` and `Layout.jsx` from Task 4 — where bell lives in the UI
  - Auth context from Task 3 — provides `user.id` for filtering

  **External References**:
  - Supabase Realtime guide: https://supabase.com/docs/guides/realtime
  - Supabase JS subscribe to changes: https://supabase.com/docs/reference/javascript/subscribe

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Notification appears in real-time when lead is assigned
    Tool: Playwright (2 browser contexts)
    Preconditions: Manager and rep both logged in
    Steps:
      1. Open browser context A — login as Rep (Neal), navigate to /dashboard
      2. Note unread count on bell icon (e.g., 0)
      3. Open browser context B — login as Manager (Rahul)
      4. In context B: create a new lead and assign it to Neal
      5. Switch to context A — WITHOUT refreshing
      6. Assert bell unread count increased by 1
      7. Click bell icon
      8. Assert dropdown shows notification: "New lead assigned: [customer name]"
    Expected Result: Rep sees real-time notification without page refresh
    Failure Indicators: Count doesn't update, notification missing, requires refresh
    Evidence: .sisyphus/evidence/task-7-realtime-notification.png

  Scenario: Mark notification as read
    Tool: Playwright
    Preconditions: Logged in, at least 1 unread notification
    Steps:
      1. Click bell icon — note unread count
      2. Click on an unread notification in dropdown
      3. Assert notification visual changes to "read" state
      4. Assert unread count decreased by 1
      5. If notification has lead_id, assert navigation to lead detail page
    Expected Result: Notification marked read, count updates, navigation works
    Failure Indicators: Count doesn't change, notification stays unread, no navigation
    Evidence: .sisyphus/evidence/task-7-mark-read.png

  Scenario: Mark all as read clears badge
    Tool: Playwright
    Preconditions: Logged in, 3+ unread notifications
    Steps:
      1. Click bell icon
      2. Click "Mark all as read"
      3. Assert unread count is 0
      4. Assert badge disappears or shows 0
      5. All notifications in dropdown show "read" state
    Expected Result: All notifications marked read, badge cleared
    Failure Indicators: Some still unread, badge persists
    Evidence: .sisyphus/evidence/task-7-mark-all-read.png

  Scenario: Dropdown closes on outside click
    Tool: Playwright
    Preconditions: Bell dropdown is open
    Steps:
      1. Click bell icon to open dropdown
      2. Assert dropdown is visible
      3. Click anywhere outside the dropdown
      4. Assert dropdown is no longer visible
    Expected Result: Dropdown closes cleanly
    Failure Indicators: Dropdown stays open
    Evidence: .sisyphus/evidence/task-7-dropdown-close.png
  ```

  **Commit**: YES
  - Message: `feat(notifications): add notification system + Realtime subscriptions`
  - Files: `src/context/NotificationContext.jsx, src/components/NotificationBell.jsx, src/pages/Notifications.jsx, supabase/migrations/*`
  - Pre-commit: `npm run build`

---

- [ ] 8. CSV Import Script — Migrate Existing Data

  **What to do**:
  - Create `scripts/import-csv.js` — Node.js script to import the existing CSV data
  - Uses `@supabase/supabase-js` with service_role key (bypasses RLS)
  - Reads `/Users/apple/work/lead_management/DiscountAutoParts - Sheet1.csv`
  - Parsing logic:
    - Skip header row (Column 1, Column 2, etc.)
    - Parse dates: "25th march 26" → 2026-03-25 (handle ordinals, month names, 2-digit year)
    - Normalize phone numbers: strip non-digits, ensure consistent format
    - Map Column 4 tags: detect "Incompatible", "Spanish", "small part", "Abused", "No voice" → store in `tags[]`
    - Map Column 11 (primary rep name) → look up `profiles.id` by name
    - Map Column 12 (secondary/manager) → ignore for assignment (Rahul = manager, not assigned_to)
    - Infer lead status from notes:
      - "Sold" / "payment done" → 'won'
      - "will bought locally" / "buy from local" → 'lost'
      - "hung up" / "abused" / "scammed" → 'dead'
      - "quot" / "Quotation given" → 'quoted'
      - "call back" / "CB" / "will call" → 'contacted'
      - Default → 'new'
    - Handle empty rows gracefully (skip rows with no phone number AND no customer name)

  - **Dry run mode**: `node scripts/import-csv.js --dry-run` — prints parsed data without inserting
  - **Import mode**: `node scripts/import-csv.js` — inserts into Supabase
  - Print summary: X leads imported, Y skipped, Z errors

  - Add dependency: `csv-parse` (or use built-in line-by-line parsing)

  **Must NOT do**:
  - Do NOT create a web UI for CSV import (script is sufficient)
  - Do NOT modify the original CSV file
  - Do NOT import duplicate rows if run multiple times (check by phone number + date)
  - Do NOT assign follow_up_dates from import (no reliable data in CSV)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single script, well-defined input/output, straightforward parsing logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Task 16
  - **Blocked By**: Task 2 (tables must exist)

  **References**:

  **Pattern References**:
  - Source CSV: `/Users/apple/work/lead_management/DiscountAutoParts - Sheet1.csv` — 101 lines, 13 columns, informal date/status formats
  - DB schema from Task 2 — leads table columns define target shape

  **External References**:
  - Supabase JS insert: https://supabase.com/docs/reference/javascript/insert
  - csv-parse npm: https://csv.js.org/parse/

  **WHY Each Reference Matters**:
  - CSV file: Source data with exact formats to parse (date patterns, status text, phone formats)
  - Schema: Target table structure to map CSV columns into

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dry run parses all rows correctly
    Tool: Bash
    Preconditions: Script exists, CSV file at known path
    Steps:
      1. Run `node scripts/import-csv.js --dry-run`
      2. Assert output shows parsed lead count (should be ~95+ of 100 data rows)
      3. Assert output shows skipped rows with reasons
      4. Assert no database inserts occurred (query leads table — should be empty)
      5. Verify date parsing: "25th march 26" → "2026-03-25"
    Expected Result: All parseable rows shown, dates correct, no DB changes
    Failure Indicators: Parse errors, wrong dates, rows missing
    Evidence: .sisyphus/evidence/task-8-dry-run.txt

  Scenario: Full import inserts correct row count
    Tool: Bash
    Preconditions: Supabase running, profiles for Neal/Michael exist
    Steps:
      1. Run `node scripts/import-csv.js`
      2. Assert output shows "X leads imported"
      3. Query: SELECT count(*) FROM leads — assert matches import count
      4. Query: SELECT * FROM leads WHERE customer_name = 'Riketa Smith' — assert vehicle_year=2019, vehicle_make='NISSAN', status='won'
      5. Query: SELECT * FROM leads WHERE phone = '19726985372' — assert tags contains 'no_voice'
    Expected Result: Correct row count, data mapped accurately
    Failure Indicators: Wrong count, missing data, wrong status mapping
    Evidence: .sisyphus/evidence/task-8-import-verify.txt

  Scenario: Re-running import does not create duplicates
    Tool: Bash
    Preconditions: Import already ran once
    Steps:
      1. Note current lead count: SELECT count(*) FROM leads
      2. Run `node scripts/import-csv.js` again
      3. Assert lead count is unchanged (no new rows)
    Expected Result: Idempotent — no duplicates
    Failure Indicators: Count doubled, duplicate entries
    Evidence: .sisyphus/evidence/task-8-idempotent.txt
  ```

  **Commit**: YES
  - Message: `feat(import): add CSV import script`
  - Files: `scripts/import-csv.js`
  - Pre-commit: `node scripts/import-csv.js --dry-run`

---

- [ ] 9. Sales Rep Dashboard — My Leads, Follow-ups, Stats

  **What to do**:
  - Create `src/pages/Dashboard.jsx` — the default landing page for sales reps after login
  - **Layout**: Uses Layout component (Task 4). Content area has 3 sections:

  **Section 1 — Stats Cards (top row)**:
  - Card: "My Active Leads" — count of leads where status NOT IN ('won', 'lost', 'dead')
  - Card: "Follow-ups Due Today" — count of leads where follow_up_date = today
  - Card: "Quoted This Week" — count of leads where status = 'quoted' AND updated_at within current week
  - Card: "Won This Month" — count of leads where status = 'won' AND updated_at within current month
  - Each card uses Card component from Task 4, with a number and label

  **Section 2 — Follow-ups Due** (middle):
  - Table of leads where `follow_up_date <= today` AND status NOT IN ('won', 'lost', 'dead')
  - Sorted by follow_up_date ascending (most overdue first)
  - Columns: Customer, Phone, Vehicle, Part, Follow-up Date, Days Overdue
  - Each row clickable → navigates to lead detail (Task 11)
  - If no follow-ups due: EmptyState "No follow-ups due. You're all caught up!"

  **Section 3 — Recent Leads** (bottom):
  - Table of last 10 leads assigned to this rep, sorted by created_at desc
  - Columns: Date, Customer, Phone, Vehicle, Status (badge), Actions
  - Quick action: click status badge → dropdown to change status inline
  - "View all" link → navigates to /leads

  **Data fetching**:
  - All queries filtered by `assigned_to = auth.uid()` (RLS handles this automatically)
  - Use `useEffect` + loading states
  - Create `src/hooks/useDashboardData.js` — custom hook that fetches all dashboard data

  **Daily Summary Notification Card** (from Task 14):
  - If there's a `daily_summary` notification from today, show it as a prominent card at the top
  - "You have X active leads, Y follow-ups due today, Z new leads this week"
  - Dismissible (marks notification as read)

  **Must NOT do**:
  - Do NOT show other reps' leads (RLS enforces this anyway)
  - Do NOT add charts or graphs (out of scope)
  - Do NOT add drag-and-drop or Kanban
  - Do NOT add export functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dashboard layout, stats cards, tables, responsive design — primarily a visual/UI task
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 5 (lead CRUD for data), 7 (notifications for daily summary card)

  **References**:

  **Pattern References**:
  - Lead CRUD functions from Task 5 (`src/lib/leads.js`) — reuse `getLeads(filters)` with dashboard-specific filters
  - UI components from Task 4 — Card, Table, Badge, EmptyState, Spinner, Layout
  - Notification context from Task 7 — for daily summary card
  - Auth context from Task 3 — for current user identity

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Rep dashboard shows only their data
    Tool: Playwright
    Preconditions: Logged in as Neal, Neal has 5 leads, Michael has 3 leads
    Steps:
      1. Navigate to /dashboard
      2. Assert "My Active Leads" card shows a number (e.g., 5 or less depending on statuses)
      3. Assert recent leads table shows only leads assigned to Neal
      4. Assert no leads assigned to Michael appear anywhere
    Expected Result: Dashboard shows exclusively Neal's data
    Failure Indicators: Michael's leads visible, wrong counts
    Evidence: .sisyphus/evidence/task-9-rep-dashboard.png

  Scenario: Follow-ups due section shows overdue leads
    Tool: Playwright
    Preconditions: Neal has 2 leads with follow_up_date = yesterday, 1 with follow_up_date = tomorrow
    Steps:
      1. Navigate to /dashboard
      2. Assert "Follow-ups Due Today" card shows count >= 2
      3. Assert follow-ups table shows the 2 overdue leads
      4. Assert follow-ups table does NOT show tomorrow's lead
      5. Assert overdue leads show "1 day overdue" or similar
    Expected Result: Only due/overdue follow-ups shown, correct counts
    Failure Indicators: Future follow-ups shown, wrong count
    Evidence: .sisyphus/evidence/task-9-followups-due.png

  Scenario: Empty dashboard state for new rep
    Tool: Playwright
    Preconditions: Create new rep user with no assigned leads
    Steps:
      1. Login as new rep
      2. Navigate to /dashboard
      3. Assert stats cards show 0 for all metrics
      4. Assert follow-ups section shows EmptyState message
      5. Assert recent leads section shows EmptyState
    Expected Result: Clean empty state, no errors, friendly messages
    Failure Indicators: Error, broken layout, undefined values
    Evidence: .sisyphus/evidence/task-9-empty-dashboard.png
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add sales rep dashboard`
  - Files: `src/pages/Dashboard.jsx, src/hooks/useDashboardData.js`
  - Pre-commit: `npm run build`

---

- [ ] 10. Manager Dashboard — All Leads, Team View, Reassignment

  **What to do**:
  - Create `src/pages/Manager.jsx` — manager-only dashboard (protected by role check)
  - **Layout**: Uses Layout component. Content has 4 sections:

  **Section 1 — Team Overview Cards (top row)**:
  - Card: "Total Active Leads" — count across all reps
  - Card: "Unassigned Leads" — count where assigned_to IS NULL
  - Card: "Follow-ups Due Today" — across all reps
  - Card: "Won This Month" — across all reps
  - Card per rep: "[Rep Name]: X active leads" — quick view of distribution

  **Section 2 — Team Activity Feed** (sidebar or middle):
  - Recent activity_log entries across all users
  - Shows: "[Rep] changed [Lead] status to Quoted — 5 min ago"
  - Last 20 entries, sorted by created_at desc

  **Section 3 — All Leads Table** (main content):
  - Same structure as Leads page but shows ALL leads (manager RLS allows this)
  - Additional column: "Assigned To" showing rep name
  - **Reassignment**: Click on "Assigned To" cell → dropdown to reassign to any active rep
  - After reassignment: notification sent to new assignee (handled by DB trigger)
  - Filter by rep (dropdown at top): "Show leads for: All / Neal / Michael"

  **Section 4 — Unassigned Leads** (if any):
  - Table of leads where assigned_to IS NULL
  - "Assign" button per lead → dropdown to pick rep, or "Auto-assign" to trigger round-robin

  **Data fetching**:
  - Manager bypasses RLS rep filter — sees all leads
  - Create `src/hooks/useManagerData.js`

  **Must NOT do**:
  - Do NOT add performance metrics beyond basic counts (no conversion rates, no charts)
  - Do NOT add user management (add/remove reps) — done via Supabase dashboard for MVP
  - Do NOT add export/report generation
  - Do NOT add bulk actions (bulk reassign, bulk status change)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dashboard layout, multiple data tables, interactive reassignment UI
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 5 (lead CRUD), 7 (notifications/activity)

  **References**:

  **Pattern References**:
  - Lead CRUD from Task 5 — reuse query functions, extend for manager filters
  - Notification system from Task 7 — reassignment triggers notification via DB trigger
  - Round-robin from Task 6 — "Auto-assign" button calls the Edge Function
  - Activity log from Task 2 schema — query `activity_log` table for feed
  - UI components from Task 4

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Manager sees leads from all reps
    Tool: Playwright
    Preconditions: Logged in as Rahul (manager), leads exist for Neal and Michael
    Steps:
      1. Navigate to /manager
      2. Assert "Total Active Leads" count matches sum across all reps
      3. Assert leads table shows leads assigned to both Neal AND Michael
      4. Assert "Assigned To" column shows rep names
    Expected Result: Manager sees complete team overview
    Failure Indicators: Missing leads, only seeing own leads
    Evidence: .sisyphus/evidence/task-10-manager-all-leads.png

  Scenario: Reassign lead to different rep
    Tool: Playwright
    Preconditions: Manager logged in, lead assigned to Neal
    Steps:
      1. Navigate to /manager
      2. Find a lead assigned to Neal
      3. Click on the "Assigned To" cell for that lead
      4. Select "Michael" from dropdown
      5. Assert "Assigned To" now shows "Michael"
      6. Assert notification was created for Michael (check notification count or DB)
    Expected Result: Lead reassigned, notification sent
    Failure Indicators: Assignment doesn't change, no notification
    Evidence: .sisyphus/evidence/task-10-reassign.png

  Scenario: Non-manager cannot access manager dashboard
    Tool: Playwright
    Preconditions: Logged in as Neal (rep)
    Steps:
      1. Navigate directly to /manager
      2. Assert redirect to /dashboard OR "Access denied" message
      3. Assert manager content is NOT visible
    Expected Result: Rep blocked from manager page
    Failure Indicators: Manager page renders for rep
    Evidence: .sisyphus/evidence/task-10-rep-blocked.png

  Scenario: Filter leads by specific rep
    Tool: Playwright
    Preconditions: Manager logged in, leads for both reps exist
    Steps:
      1. Navigate to /manager
      2. Select "Neal" from rep filter dropdown
      3. Assert all visible leads are assigned to Neal
      4. Assert no Michael leads visible
      5. Select "All" from filter
      6. Assert leads from both reps visible again
    Expected Result: Filter correctly isolates rep's leads
    Failure Indicators: Wrong leads shown, filter doesn't work
    Evidence: .sisyphus/evidence/task-10-filter-by-rep.png
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add manager dashboard with team view`
  - Files: `src/pages/Manager.jsx, src/hooks/useManagerData.js`
  - Pre-commit: `npm run build`

---

- [ ] 11. Lead Detail Page + Pipeline Stage Transitions

  **What to do**:
  - Create `src/pages/LeadDetail.jsx` — full detail view for a single lead at `/leads/:id`
  - **Layout**:

  **Header**:
  - Customer name (large), phone number (clickable — `tel:` link), status badge
  - Action buttons: Edit (opens form modal), Delete (manager only), Back to list

  **Pipeline Stage Bar** (prominent, below header):
  - Visual horizontal bar showing all stages: New → Contacted → Quoted → Negotiating → Won / Lost / Dead
  - Current stage highlighted
  - Clickable stages: click a stage to advance/change status
  - On stage change: calls `updateLead` → DB trigger creates notification + activity_log entry
  - Won/Lost/Dead are "terminal" — show confirmation dialog before setting

  **Vehicle Information Card**:
  - Year, Make, Model, Part Needed, Part Detail
  - Mileage, Price Quoted, Warranty Info
  - Tags displayed as badges

  **Notes Section**:
  - Current notes displayed
  - "Add Note" textarea + save button — appends to notes (or replaces — simpler)
  - Follow-up section: current follow_up_date shown, "Set Follow-up" date picker

  **Activity Timeline** (bottom):
  - Query `activity_log` for this lead
  - Display as vertical timeline: "[User] changed status from New to Contacted — Mar 25, 2026"
  - Sorted newest first

  **Must NOT do**:
  - Do NOT add file attachments or image uploads
  - Do NOT add commenting system (notes field is sufficient)
  - Do NOT add print/PDF export
  - Do NOT add related leads or linking

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Pipeline visualization, detail layout, timeline component, interactive stage bar
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 5 (lead CRUD), 4 (UI components)

  **References**:

  **Pattern References**:
  - Lead CRUD from Task 5 — `getLeadById`, `updateLead`
  - Activity log from Task 2 schema
  - LeadForm from Task 5 — reuse for edit modal
  - Badge, Card, Modal from Task 4

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Lead detail shows all vehicle information
    Tool: Playwright
    Preconditions: Logged in, a lead exists with full vehicle data
    Steps:
      1. Navigate to /leads/[lead-id]
      2. Assert customer name is displayed prominently
      3. Assert phone number is visible and clickable (href starts with "tel:")
      4. Assert vehicle year, make, model, part are displayed
      5. Assert status badge shows current status
    Expected Result: All lead data visible and correctly formatted
    Failure Indicators: Missing fields, wrong data, broken layout
    Evidence: .sisyphus/evidence/task-11-lead-detail.png

  Scenario: Pipeline stage transition works
    Tool: Playwright
    Preconditions: Lead exists with status = 'new'
    Steps:
      1. Navigate to lead detail
      2. Assert pipeline bar shows "New" as active
      3. Click "Contacted" stage in pipeline bar
      4. Assert status badge changes to "Contacted"
      5. Assert pipeline bar now highlights "Contacted"
      6. Check activity timeline shows "Status changed from New to Contacted"
    Expected Result: Stage updates, badge updates, activity logged
    Failure Indicators: Status doesn't change, no activity entry
    Evidence: .sisyphus/evidence/task-11-stage-transition.png

  Scenario: Terminal status shows confirmation
    Tool: Playwright
    Preconditions: Lead exists with status = 'quoted'
    Steps:
      1. Navigate to lead detail
      2. Click "Lost" stage in pipeline bar
      3. Assert confirmation dialog appears: "Mark this lead as Lost?"
      4. Click "Confirm"
      5. Assert status changed to "Lost"
    Expected Result: Confirmation required for terminal states
    Failure Indicators: No confirmation, status changes directly
    Evidence: .sisyphus/evidence/task-11-terminal-confirm.png

  Scenario: Activity timeline shows history
    Tool: Playwright
    Preconditions: Lead with multiple status changes
    Steps:
      1. Navigate to lead detail
      2. Scroll to activity timeline section
      3. Assert at least 2 activity entries visible
      4. Assert entries show user name, action, timestamp
      5. Assert entries are in newest-first order
    Expected Result: Timeline shows chronological activity history
    Failure Indicators: Empty timeline, wrong order, missing entries
    Evidence: .sisyphus/evidence/task-11-activity-timeline.png
  ```

  **Commit**: YES
  - Message: `feat(leads): add lead detail page + pipeline transitions`
  - Files: `src/pages/LeadDetail.jsx`
  - Pre-commit: `npm run build`

---

- [ ] 12. Search, Filter & Sort on Leads List

  **What to do**:
  - Enhance the Leads page (Task 5) with search, filter, and sort capabilities
  - Create `src/components/LeadFilters.jsx` — filter bar component placed above the leads table

  **Search**:
  - Text input: searches across customer_name, phone, vehicle_make, vehicle_model, notes
  - Uses Supabase `.or()` with `.ilike()` for case-insensitive partial matching
  - Debounced input (300ms) to avoid excessive queries

  **Filters** (side by side in filter bar):
  - **Status filter**: Multi-select dropdown — filter by one or more lead_status values
  - **Assigned To filter**: Dropdown of rep names (visible to manager only — rep sees only their leads anyway)
  - **Date Range**: From/To date pickers — filters by `leads.date` (lead creation date)
  - **Tags filter**: Multi-select for tags (spanish, incompatible, small_part, etc.)
  - "Clear all filters" button

  **Sort**:
  - Clickable column headers on the table: Date, Customer, Status, Assigned To
  - Toggle ascending/descending on click
  - Default sort: created_at DESC (newest first)

  **URL State**:
  - Persist filter/sort state in URL query params (e.g., `/leads?status=quoted&search=ford`)
  - On page load, read filters from URL to restore state
  - Enables sharing filtered views via URL

  **Must NOT do**:
  - Do NOT add saved/bookmarked filters
  - Do NOT add advanced query builder
  - Do NOT implement full-text search (ilike is sufficient for this scale)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: URL state management, debounced search, multi-filter Supabase queries — logic-heavy UI work
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 13, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Task 5 (leads list page to enhance)

  **References**:

  **Pattern References**:
  - Leads page from Task 5 (`src/pages/Leads.jsx`) — integrate filter bar above table
  - `getLeads(filters)` from Task 5 (`src/lib/leads.js`) — extend to accept search/filter/sort params
  - UI components from Task 4 — Input, Select, Button

  **External References**:
  - Supabase JS filters: https://supabase.com/docs/reference/javascript/using-filters

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Search by customer name returns matching leads
    Tool: Playwright
    Preconditions: Multiple leads exist, one with name "Fernando"
    Steps:
      1. Navigate to /leads
      2. Type "Fernando" in search input
      3. Wait 500ms for debounce
      4. Assert table shows only leads matching "Fernando"
      5. Assert other leads are not visible
    Expected Result: Only matching leads displayed
    Failure Indicators: All leads still showing, no results, error
    Evidence: .sisyphus/evidence/task-12-search.png

  Scenario: Filter by status shows correct subset
    Tool: Playwright
    Preconditions: Leads with mixed statuses exist
    Steps:
      1. Navigate to /leads
      2. Select "Quoted" from status filter
      3. Assert all visible leads have "Quoted" badge
      4. Assert no leads with other statuses visible
    Expected Result: Only quoted leads shown
    Failure Indicators: Mixed statuses, wrong filter
    Evidence: .sisyphus/evidence/task-12-filter-status.png

  Scenario: Combined filters narrow results
    Tool: Playwright
    Preconditions: Diverse lead data
    Steps:
      1. Select status = "Contacted"
      2. Type "Ford" in search
      3. Assert results match BOTH criteria (status=contacted AND contains "Ford")
    Expected Result: Intersection of filters applied
    Failure Indicators: Only one filter applied, empty when shouldn't be
    Evidence: .sisyphus/evidence/task-12-combined-filters.png

  Scenario: Clear filters restores full list
    Tool: Playwright
    Preconditions: Filters are active (some applied)
    Steps:
      1. With filters active, note reduced lead count
      2. Click "Clear all filters"
      3. Assert full lead list restored
      4. Assert URL query params cleared
    Expected Result: All leads visible, clean URL
    Failure Indicators: Filters persist, partial clear
    Evidence: .sisyphus/evidence/task-12-clear-filters.png

  Scenario: Sort by column toggles order
    Tool: Playwright
    Preconditions: Multiple leads with different dates
    Steps:
      1. Click "Date" column header
      2. Assert leads sorted by date ascending
      3. Click "Date" column header again
      4. Assert leads sorted by date descending
    Expected Result: Sort toggles correctly
    Failure Indicators: Sort doesn't change, wrong order
    Evidence: .sisyphus/evidence/task-12-sort.png
  ```

  **Commit**: YES
  - Message: `feat(leads): add search, filter, sort`
  - Files: `src/components/LeadFilters.jsx, src/pages/Leads.jsx (modified), src/lib/leads.js (modified)`
  - Pre-commit: `npm run build`

---

- [ ] 13. Follow-Up Reminder — Cron Edge Function

  **What to do**:
  - Create Supabase Edge Function: `supabase/functions/follow-up-reminder/index.ts`
  - **Purpose**: Runs daily (cron), checks for leads with `follow_up_date <= today` AND status NOT IN ('won', 'lost', 'dead'), inserts `follow_up_reminder` notifications for the assigned rep
  - **Logic**:
    1. Query leads where `follow_up_date <= CURRENT_DATE` AND status is active AND no reminder notification already sent today for this lead
    2. For each lead: INSERT INTO notifications (user_id = assigned_to, type = 'follow_up_reminder', title = 'Follow-up Due', message = '[Customer Name] — [Vehicle] follow-up was due [date]', lead_id = lead.id)
    3. Uses service_role key
  - **Scheduling**: Configure via Supabase dashboard cron (pg_cron) or document the cron setup:
    - `SELECT cron.schedule('follow-up-reminders', '0 8 * * *', $$ SELECT ... $$)` — runs at 8 AM daily
    - Alternative: Use `supabase/functions/follow-up-reminder` triggered by pg_cron calling the function URL
  - **Idempotent**: Don't create duplicate reminders if run multiple times in same day

  **Must NOT do**:
  - Do NOT send emails or SMS
  - Do NOT implement snooze or dismiss-and-reschedule
  - Do NOT modify the lead's follow_up_date

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple Edge Function — query + insert, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 12, 14)
  - **Blocks**: Task 15
  - **Blocked By**: Task 7 (notifications table + Realtime setup)

  **References**:

  **Pattern References**:
  - Notification system from Task 7 — notification insertion pattern, Realtime will auto-deliver
  - `notifications` table schema from Task 2
  - `leads` table schema from Task 2 — `follow_up_date`, `assigned_to`, `status`

  **External References**:
  - Supabase pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron
  - Supabase Edge Functions scheduling: https://supabase.com/docs/guides/functions/schedule-functions

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Reminder created for leads with due follow-ups
    Tool: Bash (curl + psql)
    Preconditions: Lead exists with follow_up_date = today, assigned to Neal
    Steps:
      1. Invoke Edge Function: curl -X POST supabase_url/functions/v1/follow-up-reminder -H "Authorization: Bearer <service_role_key>"
      2. Query: SELECT * FROM notifications WHERE user_id = [neal_id] AND type = 'follow_up_reminder' AND created_at::date = CURRENT_DATE
      3. Assert 1 row exists with correct lead_id and message containing customer name
    Expected Result: Reminder notification created for Neal
    Failure Indicators: No notification, wrong user, wrong lead
    Evidence: .sisyphus/evidence/task-13-reminder-created.txt

  Scenario: No duplicate reminders on re-run
    Tool: Bash (curl + psql)
    Preconditions: Reminder already ran today for same lead
    Steps:
      1. Note notification count for today's reminders
      2. Invoke Edge Function again
      3. Assert notification count is unchanged (no new row)
    Expected Result: Idempotent — no duplicates
    Failure Indicators: Count increased, duplicate notifications
    Evidence: .sisyphus/evidence/task-13-no-duplicates.txt

  Scenario: Won/Lost/Dead leads are excluded
    Tool: Bash (curl + psql)
    Preconditions: Lead with follow_up_date = today BUT status = 'won'
    Steps:
      1. Invoke Edge Function
      2. Query notifications — assert NO reminder for this lead
    Expected Result: Closed leads don't generate reminders
    Failure Indicators: Reminder created for won lead
    Evidence: .sisyphus/evidence/task-13-closed-excluded.txt
  ```

  **Commit**: YES
  - Message: `feat(reminders): add follow-up reminder cron Edge Function`
  - Files: `supabase/functions/follow-up-reminder/index.ts`
  - Pre-commit: `curl -X POST ... (function responds 200)`

---

- [ ] 14. Daily Summary — Cron Edge Function

  **What to do**:
  - Create Supabase Edge Function: `supabase/functions/daily-summary/index.ts`
  - **Purpose**: Runs daily (cron, e.g., 7 AM), generates a summary notification for each active user
  - **Logic**:
    1. Query all active profiles
    2. For each user, calculate:
       - Active lead count (assigned_to = user, status NOT IN won/lost/dead)
       - Follow-ups due today
       - New leads assigned yesterday
       - Leads won this week
    3. INSERT INTO notifications: type = 'daily_summary', title = 'Daily Summary', message = "You have X active leads, Y follow-ups due today, Z new leads yesterday. W leads won this week."
    4. For manager: include team totals — "Team: X total leads, Y unassigned"
  - **Scheduling**: pg_cron at 7 AM daily
  - **Idempotent**: Only one summary per user per day

  **Must NOT do**:
  - Do NOT send emails
  - Do NOT include detailed lead lists in the notification (just counts)
  - Do NOT add notification preferences

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple aggregation query + notification insert, same pattern as Task 13
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11, 12, 13)
  - **Blocks**: Task 15
  - **Blocked By**: Task 7 (notification infrastructure)

  **References**:

  **Pattern References**:
  - Follow-up reminder from Task 13 — same Edge Function pattern, same notification insertion
  - Notification system from Task 7

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Daily summary created for each active user
    Tool: Bash (curl + psql)
    Preconditions: 3 active users (Rahul, Neal, Michael), leads exist
    Steps:
      1. Invoke Edge Function: curl -X POST supabase_url/functions/v1/daily-summary
      2. Query: SELECT * FROM notifications WHERE type = 'daily_summary' AND created_at::date = CURRENT_DATE
      3. Assert 3 rows exist (one per user)
      4. Assert Neal's summary mentions his lead count
      5. Assert Rahul's summary includes team totals
    Expected Result: One summary per user with correct counts
    Failure Indicators: Missing summaries, wrong counts, duplicates
    Evidence: .sisyphus/evidence/task-14-daily-summary.txt

  Scenario: Manager summary includes team metrics
    Tool: Bash (curl + psql)
    Preconditions: Rahul is manager, leads distributed across reps
    Steps:
      1. Invoke daily-summary function
      2. Query Rahul's daily_summary notification
      3. Assert message contains "Team:" followed by total counts
    Expected Result: Manager gets team-wide stats
    Failure Indicators: Only personal stats, no team data
    Evidence: .sisyphus/evidence/task-14-manager-summary.txt

  Scenario: No duplicate summaries on re-run
    Tool: Bash (curl + psql)
    Preconditions: Summary already generated today
    Steps:
      1. Count daily_summary notifications for today
      2. Invoke function again
      3. Assert count unchanged
    Expected Result: Idempotent
    Failure Indicators: Doubled summaries
    Evidence: .sisyphus/evidence/task-14-no-duplicates.txt
  ```

  **Commit**: YES
  - Message: `feat(summary): add daily summary cron Edge Function`
  - Files: `supabase/functions/daily-summary/index.ts`
  - Pre-commit: `curl -X POST ... (function responds 200)`

---

- [ ] 15. Vercel Deployment + Environment Configuration

  **What to do**:
  - Ensure `vercel.json` exists (created in Task 1) with SPA rewrite rule
  - Create `.env.production.example` documenting all required env vars:
    - `VITE_SUPABASE_URL` — Supabase project URL
    - `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
  - Verify `npm run build` produces a clean `dist/` folder
  - Document deployment steps in a `DEPLOY.md`:
    1. Create Supabase project at supabase.com
    2. Run migrations: `supabase db push`
    3. Deploy Edge Functions: `supabase functions deploy`
    4. Set up pg_cron for follow-up-reminder and daily-summary
    5. Create initial users (Rahul, Neal, Michael) via Supabase Auth dashboard or provided SQL
    6. Connect Vercel to repo, set env vars, deploy
  - Create seed SQL script `supabase/seed.sql`:
    - Creates the 3 initial auth users (Rahul/manager, Neal/rep, Michael/rep)
    - Note: actual password setup may need to be done via Supabase Auth dashboard
  - Ensure no hardcoded secrets in any committed file (grep for keys/URLs)

  **Must NOT do**:
  - Do NOT set up CI/CD pipelines
  - Do NOT configure custom domains
  - Do NOT set up monitoring/logging services

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration files and documentation, no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential — after all features)
  - **Blocks**: Task 16
  - **Blocked By**: All previous tasks (app must be feature-complete)

  **References**:

  **External References**:
  - Vercel deployment: https://vercel.com/docs/frameworks/vite
  - Supabase CLI deploy: https://supabase.com/docs/guides/cli

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Build produces deployable output
    Tool: Bash
    Preconditions: All features implemented
    Steps:
      1. Run `npm run build`
      2. Assert exit code 0
      3. Assert `dist/` directory exists
      4. Assert `dist/index.html` exists
      5. Assert `dist/assets/` contains JS and CSS bundles
    Expected Result: Clean production build
    Failure Indicators: Build errors, missing files
    Evidence: .sisyphus/evidence/task-15-build.txt

  Scenario: No hardcoded secrets in source
    Tool: Bash (grep)
    Preconditions: Codebase complete
    Steps:
      1. grep -r "supabase.co" src/ --include="*.js" --include="*.jsx" — should return 0 results
      2. grep -r "eyJ" src/ --include="*.js" --include="*.jsx" — should return 0 results (JWT pattern)
      3. Verify .env is in .gitignore
    Expected Result: No secrets in committed code
    Failure Indicators: Hardcoded URLs or keys found
    Evidence: .sisyphus/evidence/task-15-no-secrets.txt

  Scenario: DEPLOY.md covers all steps
    Tool: Bash
    Preconditions: DEPLOY.md exists
    Steps:
      1. Read DEPLOY.md
      2. Assert it covers: Supabase project setup, migrations, Edge Functions deploy, pg_cron setup, user creation, Vercel deployment, env vars
    Expected Result: Complete deployment guide
    Failure Indicators: Missing critical steps
    Evidence: .sisyphus/evidence/task-15-deploy-docs.txt
  ```

  **Commit**: YES
  - Message: `chore(deploy): add Vercel config + deployment guide`
  - Files: `vercel.json, .env.production.example, DEPLOY.md, supabase/seed.sql`
  - Pre-commit: `npm run build`

---

- [ ] 16. Run CSV Import on Production Data

  **What to do**:
  - This task runs AFTER deployment (Task 15) — uses the import script from Task 8
  - Steps:
    1. Ensure Supabase production project has migrations applied
    2. Ensure initial users (Rahul, Neal, Michael) exist in production profiles
    3. Run: `SUPABASE_URL=<prod_url> SUPABASE_SERVICE_ROLE_KEY=<prod_key> node scripts/import-csv.js --dry-run`
    4. Review dry run output — verify data mapping looks correct
    5. Run actual import: `SUPABASE_URL=<prod_url> SUPABASE_SERVICE_ROLE_KEY=<prod_key> node scripts/import-csv.js`
    6. Verify: query production leads table — count should match import count
    7. Spot check: verify 3-5 specific leads have correct data (customer name, vehicle, status, assigned rep)

  **Must NOT do**:
  - Do NOT modify the import script (Task 8 handles that)
  - Do NOT import test/dummy data
  - Do NOT delete the original CSV file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running an existing script with verification — no code changes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 15)
  - **Blocks**: None
  - **Blocked By**: Tasks 8 (script), 15 (deployment)

  **References**:

  **Pattern References**:
  - Import script from Task 8: `scripts/import-csv.js`
  - Source CSV: `/Users/apple/work/lead_management/DiscountAutoParts - Sheet1.csv`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Production import matches expected count
    Tool: Bash
    Preconditions: Production Supabase running, migrations applied, users created
    Steps:
      1. Run import with --dry-run first, note expected count
      2. Run actual import
      3. Query production: SELECT count(*) FROM leads
      4. Assert count matches dry-run expected count
    Expected Result: All parseable rows imported
    Failure Indicators: Count mismatch, errors during import
    Evidence: .sisyphus/evidence/task-16-import-count.txt

  Scenario: Spot check imported data accuracy
    Tool: Bash (curl or psql)
    Preconditions: Import completed
    Steps:
      1. Query: SELECT * FROM leads WHERE phone = '14125290585' — Riketa Smith
      2. Assert: customer_name = 'Riketa Smith', vehicle_year = 2019, vehicle_make = 'NISSAN', vehicle_model = 'Sentra', status = 'won'
      3. Query: SELECT * FROM leads WHERE phone = '16143274863' — Maurice Bridge
      4. Assert: customer_name = 'Maurice Bridge', vehicle_make = 'Cadillac'
      5. Verify assigned_to points to correct rep profiles
    Expected Result: Data accurately mapped from CSV
    Failure Indicators: Wrong names, wrong status, unassigned leads
    Evidence: .sisyphus/evidence/task-16-spot-check.txt
  ```

  **Commit**: YES (if any config changes needed)
  - Message: `chore(data): import existing CSV data to production`
  - Files: None (script already committed)
  - Pre-commit: Verify row count

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run linter + build. Review all changed files for: `as any`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify no hardcoded Supabase keys.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (lead creation → notification → dashboard update). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After Task(s) | Commit Message | Files | Pre-commit Check |
|---|---|---|---|
| 1 | `chore(scaffold): init React+Vite with Supabase client` | package.json, vite.config.js, src/*, .env.example | `npm run build` |
| 2 | `feat(db): add Supabase schema — leads, profiles, notifications` | supabase/migrations/*.sql | Supabase CLI migrate |
| 3 | `feat(auth): add Supabase Auth + RLS policies + profile sync` | supabase/migrations/*.sql, src/context/AuthContext.jsx, src/components/ProtectedRoute.jsx, src/pages/Login.jsx | `npm run build` |
| 4 | `feat(ui): add shared design system components` | src/components/ui/* | `npm run build` |
| 5 | `feat(leads): add lead CRUD with vehicle data` | src/pages/leads/*, src/lib/leads.js | `npm run build` |
| 6 | `feat(assignment): add round-robin Edge Function` | supabase/functions/assign-lead/* | Supabase function deploy |
| 7 | `feat(notifications): add notification system + Realtime` | src/components/Notifications/*, supabase/migrations/* | `npm run build` |
| 8 | `feat(import): add CSV import script` | scripts/import-csv.js | `node scripts/import-csv.js --dry-run` |
| 9 | `feat(dashboard): add sales rep dashboard` | src/pages/dashboard/* | `npm run build` |
| 10 | `feat(dashboard): add manager dashboard with team view` | src/pages/manager/* | `npm run build` |
| 11 | `feat(leads): add lead detail page + pipeline transitions` | src/pages/leads/[id].jsx | `npm run build` |
| 12 | `feat(leads): add search, filter, sort` | src/components/LeadFilters.jsx | `npm run build` |
| 13 | `feat(reminders): add follow-up reminder cron Edge Function` | supabase/functions/follow-up-reminder/* | Deploy + test |
| 14 | `feat(summary): add daily summary cron Edge Function` | supabase/functions/daily-summary/* | Deploy + test |
| 15 | `chore(deploy): add Vercel config + env setup` | vercel.json, .env.production | Deploy succeeds |
| 16 | `chore(data): import existing CSV data to production` | — | Verify row count |

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: Build succeeds with no errors
npm run preview        # Expected: App loads at localhost
supabase db reset      # Expected: All migrations apply cleanly
supabase functions serve  # Expected: Edge Functions start
```

### Final Checklist
- [ ] Manager login → sees all leads from all reps
- [ ] Rep login → sees ONLY their leads (RLS enforced)
- [ ] Create lead → round-robin assigns to a rep → assigned rep gets notification
- [ ] Update lead stage → notification fires to relevant users
- [ ] Set follow-up date → reminder notification appears on that date
- [ ] Daily summary card appears on dashboard
- [ ] Search by vehicle make → correct results
- [ ] Filter by status → correct results
- [ ] CSV import → all ~100 leads present in system
- [ ] Vercel deployment → app accessible via public URL
- [ ] No hardcoded credentials in source
- [ ] All "Must NOT Have" items verified absent
