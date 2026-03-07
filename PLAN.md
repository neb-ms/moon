# Project Lunar Implementation Plan (Agent-Executable)

## 1. Plan Purpose
This plan breaks the PRD into small, verifiable tasks that AI agents can execute safely and sequentially. Every task includes:
- Scope (small enough for one agent run)
- Deliverables
- Validation steps (what to run/check)
- Exit criteria (what must be true before moving on)

## 2. Recommended Stack (Locked for Consistency)
- Frontend: React + Vite + Tailwind CSS (SPA feel)
- Backend: FastAPI + Pydantic
- Astronomical engine: `skyfield` (offline-capable after ephemeris download)
- Web server: Nginx
- Process manager: `systemd`
- Remote access: Cloudflare Tunnel
- Runtime target: Raspberry Pi Zero 2 W

## 3. Agent Workflow Rules

### 3.1 Task Size Rule
Each task should fit one focused PR and take roughly 30-90 minutes of agent work.

### 3.2 Required Agent Output Per Task
Each agent must return:
1. Files changed
2. What was implemented
3. Validation evidence (command output summary)
4. Risk/known gaps
5. Next suggested task ID

### 3.3 Branch/Commit Convention
- Branch: `task/<id>-<short-name>`
- Commit style: `feat(task-XX): ...`, `fix(task-XX): ...`, `chore(task-XX): ...`

### 3.4 Definition of Done (Global)
- No secrets committed
- Lint/tests pass for touched areas
- Mobile layout checked (at least 390x844)
- Accessibility basics checked (keyboard + contrast + labels)
- Security checklist for touched component completed

## 4. Global Non-Functional Requirements

### 4.1 Security Baseline
- Strict input validation for all API inputs
- No stack traces leaked in production responses
- Rate limit public API endpoints
- CORS restricted to expected origin(s)
- Security headers via Nginx (CSP, X-Frame-Options, etc.)
- Optional access control via Cloudflare Access for private use
- Dependency vulnerability scan in CI

### 4.2 UX/Design Baseline
- Always dark mode (high contrast)
- Pixel-art moon visuals/icons
- Fast, glanceable daily dashboard
- Intuitive nav to calendar and back
- Smooth scrolling and bottom-sheet modal behavior
- Touch-first interactions with clear tap targets

### 4.3 Performance Baseline
- Initial page load target under 2.5s on mobile Wi-Fi
- API response target under 300ms (cached/common requests)
- Lighthouse PWA score target >= 90

## 5. Milestones and Tasks

## Milestone A: Foundation and Tooling

### Task A1: Initialize repository structure
- Scope: Create frontend/backend/infra/docs skeleton and shared conventions.
- Deliverables:
  - `frontend/`, `backend/`, `infra/`, `scripts/`, `docs/`
  - Root `README.md` with run instructions
  - `.editorconfig`, `.gitignore`
- Validation:
  - Confirm directories/files exist
  - `git status` shows only intended additions
- Exit criteria:
  - Clean project skeleton ready for implementation.

### Task A2: Setup backend FastAPI scaffold
- Scope: Minimal API app with health endpoint and app config.
- Deliverables:
  - `backend/app/main.py`
  - `GET /health` endpoint
  - Environment config module
- Validation:
  - Run server locally
  - `curl /health` returns 200 and expected JSON
- Exit criteria:
  - Backend bootstraps reliably.

### Task A3: Setup frontend React + Tailwind scaffold
- Scope: Create mobile-first SPA shell with dark theme tokens.
- Deliverables:
  - Vite React app
  - Tailwind configured
  - Global styles with design tokens (colors/spacing/type)
  - App shell with header/nav placeholders
- Validation:
  - Local run succeeds
  - Mobile viewport renders without overflow
- Exit criteria:
  - Frontend baseline ready for feature work.

### Task A4: Add quality tooling and CI baseline
- Scope: Lint, format, tests, and CI checks for frontend/backend.
- Deliverables:
  - Python lint/test config
  - JS lint/test config
  - CI workflow executing both
- Validation:
  - Run linters/tests locally
  - CI file syntactically valid
- Exit criteria:
  - Automated guardrails active.

## Milestone B: Core Domain Logic (Moon Data)

### Task B1: Implement moon domain models
- Scope: Define canonical response schema for daily and calendar data.
- Deliverables:
  - Pydantic models: phase, illumination, rise/set, zodiac, vibe
  - Shared enum/constants for phase names
- Validation:
  - Unit tests for schema serialization
- Exit criteria:
  - Stable contract for frontend/backend integration.

### Task B2: Integrate `skyfield` and phase calculations
- Scope: Compute moon phase + illumination for a given date/time and location.
- Deliverables:
  - Service module for astronomical calculations
  - Caching strategy for repeated lookups
- Validation:
  - Unit tests with known dates
  - Outputs match trusted reference values within tolerance
- Exit criteria:
  - Accurate phase/illumination engine available.

### Task B3: Implement moonrise/moonset calculations
- Scope: Compute local moonrise/set from lat/lon/date.
- Deliverables:
  - Rise/set function with timezone-aware outputs
  - Handling for edge cases (no rise/no set days)
- Validation:
  - Tests for multiple geographies/timezones
- Exit criteria:
  - Reliable local rise/set data.

### Task B4: Implement zodiac sign + vibe generator
- Scope: Provide zodiac label and one-sentence daily vibe.
- Deliverables:
  - Deterministic zodiac mapping
  - Controlled vibe template system (safe, no hallucinated claims)
- Validation:
  - Tests ensure output length/tone constraints
- Exit criteria:
  - Astrological context ready for UI display.

### Task B5: Expose MVP API endpoints
- Scope: Build endpoints for dashboard and monthly calendar.
- Deliverables:
  - `GET /api/v1/dashboard?lat&lon&date`
  - `GET /api/v1/calendar?lat&lon&month`
  - Structured error responses
- Validation:
  - API contract tests
  - Manual curl smoke tests
- Exit criteria:
  - Frontend-consumable API complete for MVP.

## Milestone C: Frontend MVP UX

### Task C1: Build app shell and routing state
- Scope: Daily dashboard default view + calendar view toggle (SPA feel).
- Deliverables:
  - Header, bottom nav/top icon nav
  - View state management without full reload
- Validation:
  - Manual navigation checks
  - Basic frontend tests
- Exit criteria:
  - Core navigation flow works.

### Task C2: Build daily dashboard hero
- Scope: Main moon graphic, phase name, zodiac, and vibe sentence.
- Deliverables:
  - Pixel-art moon component
  - Prominent phase/zodiac heading
  - Vibe card
- Validation:
  - Snapshot/visual tests
  - Contrast checks for text readability
- Exit criteria:
  - At-a-glance dashboard is complete.

### Task C3: Build scientific stats card
- Scope: Show illumination, moonrise, moonset in clear grid.
- Deliverables:
  - Responsive stats grid
  - Placeholder/loading/error states
- Validation:
  - Component tests for each state
- Exit criteria:
  - Scientific data section complete and robust.

### Task C4: Build lunar calendar grid with pixel icons
- Scope: Monthly calendar using moon icons for each day.
- Deliverables:
  - Calendar grid component
  - Day cell states (today, selected, out-of-month)
- Validation:
  - Rendering tests for month boundaries
- Exit criteria:
  - Calendar view complete.

### Task C5: Build date detail bottom-sheet modal
- Scope: Tap day -> bottom sheet with phase, illumination, zodiac.
- Deliverables:
  - Accessible modal (focus trap, close on ESC/tap X)
  - Smooth open/close animation
- Validation:
  - Keyboard and touch interaction tests
- Exit criteria:
  - Calendar detail interaction complete.

### Task C6: Add location permission and fallback UX
- Scope: Request location on first run; graceful fallback if denied.
- Deliverables:
  - Permission prompt flow
  - Manual location entry fallback (city or lat/lon)
  - Stored preference handling
- Validation:
  - Test both granted and denied flows
- Exit criteria:
  - Reliable location-driven behavior.

## Milestone D: PWA and Offline Experience

### Task D1: Add web app manifest + installability
- Scope: Configure PWA manifest and icons.
- Deliverables:
  - `manifest.webmanifest`
  - App icons (including maskable)
  - Install prompt handling
- Validation:
  - Browser installability checks
- Exit criteria:
  - Home-screen install works on mobile.

### Task D2: Add service worker caching strategy
- Scope: Offline shell + stale-while-revalidate API caching.
- Deliverables:
  - Service worker registration
  - Cache versioning and invalidation
- Validation:
  - Offline mode smoke tests
- Exit criteria:
  - App remains useful with poor/no connectivity.

### Task D3: Offline/error UI polish
- Scope: Friendly, themed states for offline/API failures.
- Deliverables:
  - Offline banner/toast
  - Retry actions
- Validation:
  - Network throttling and offline simulations
- Exit criteria:
  - Failure modes are understandable and recoverable.

## Milestone E: Security Hardening

### Task E1: Backend security middleware
- Scope: Add trusted host checks, request size limits, safe error handling.
- Deliverables:
  - Middleware config
  - Sanitized error responses
- Validation:
  - Tests for invalid/malicious input payloads
- Exit criteria:
  - API resilient against common misuse.

### Task E2: API rate limiting and abuse controls
- Scope: Basic per-IP throttling for public endpoints.
- Deliverables:
  - Rate limit middleware/store
  - Clear 429 response schema
- Validation:
  - Automated tests for threshold behavior
- Exit criteria:
  - Abuse resistance in place.

### Task E3: Nginx security headers + TLS upstream setup
- Scope: Secure reverse proxy config for frontend/backend.
- Deliverables:
  - Nginx site config with security headers
  - Correct websocket/proxy settings if needed
- Validation:
  - Header inspection tests
- Exit criteria:
  - Strong browser-side hardening configured.

### Task E4: Secrets and dependency security
- Scope: Secure env management and vulnerability checks.
- Deliverables:
  - `.env.example` without secrets
  - Secret handling docs
  - Dependency scanning in CI
- Validation:
  - Run scan tools and confirm pass/triage
- Exit criteria:
  - Baseline supply-chain hygiene established.

## Milestone F: Deployment on Raspberry Pi

### Task F1: Build production artifacts
- Scope: Create frontend build and backend runtime packaging.
- Deliverables:
  - Frontend static build output
  - Backend requirements lock and startup command
- Validation:
  - Production build completes locally
- Exit criteria:
  - Deployable artifacts prepared.

### Task F2: Provision Raspberry Pi runtime
- Scope: Install Python, Nginx, Node (build-only if needed), and directories.
- Deliverables:
  - Provisioning script or documented command set
  - Standardized filesystem layout
- Validation:
  - Fresh Pi setup reproducible
- Exit criteria:
  - Runtime dependencies installed.

### Task F3: Configure `systemd` services
- Scope: Ensure backend and cloudflared auto-start and restart.
- Deliverables:
  - `project-lunar-api.service`
  - Optional frontend sync/reload service
- Validation:
  - `systemctl status` healthy
  - Reboot persistence check
- Exit criteria:
  - Services are reliable across reboots.

### Task F4: Configure Cloudflare Tunnel
- Scope: Publish app securely without opening router ports.
- Deliverables:
  - Tunnel config mapping domain -> local Nginx
  - DNS routing instructions
- Validation:
  - External access test over cellular + Wi-Fi
- Exit criteria:
  - Secure remote access operational.

### Task F5: Deployment runbook
- Scope: One-command/low-friction update flow.
- Deliverables:
  - `scripts/deploy.sh` or PowerShell equivalent
  - Rollback instructions
- Validation:
  - Dry run then real deploy test
- Exit criteria:
  - Repeatable deployment process established.

## Milestone G: QA, Accessibility, and Visual Polish

### Task G1: End-to-end MVP flow tests
- Scope: Automate critical path (launch -> dashboard -> calendar -> modal).
- Deliverables:
  - E2E tests for mobile viewport
- Validation:
  - Passing local/CI E2E run
- Exit criteria:
  - Core flow regression protection exists.

### Task G2: Accessibility pass
- Scope: Keyboard nav, labels, focus order, color contrast.
- Deliverables:
  - Accessibility checklist results
  - Fixes for any violations
- Validation:
  - Automated + manual a11y checks
- Exit criteria:
  - Baseline accessibility achieved.

### Task G3: Visual refinement pass (fun + intuitive)
- Scope: Improve delight without sacrificing clarity.
- Deliverables:
  - Micro-animations for transitions
  - Polished spacing/typography/icon consistency
  - Empty/loading states with personality
- Validation:
  - Manual UX review on target phone size
- Exit criteria:
  - App feels clean, fun, and easy to navigate.

### Task G4: Performance pass
- Scope: Optimize bundle size, caching, and paint performance.
- Deliverables:
  - Code-splitting/minification tuning
  - Image/icon optimization
- Validation:
  - Lighthouse + runtime performance checks
- Exit criteria:
  - Performance targets met.

## Milestone H: Launch and Operations

### Task H1: Observability and logs
- Scope: Structured logs and basic health visibility.
- Deliverables:
  - Request logging format
  - Health and uptime check script
- Validation:
  - Simulate faults and confirm visibility
- Exit criteria:
  - Operational debugging is practical.

### Task H2: Backup and recovery basics
- Scope: Protect configs and critical state.
- Deliverables:
  - Backup script for configs/data
  - Restore instructions tested once
- Validation:
  - Recovery drill run
- Exit criteria:
  - Recovery confidence established.

### Task H3: Release checklist and sign-off
- Scope: Final production readiness gate.
- Deliverables:
  - Release checklist with owner per item
  - Known limitations list
- Validation:
  - All required checks signed off
- Exit criteria:
  - MVP ready for daily use.

## 6. API Contract Draft (for Agent Alignment)

### `GET /api/v1/dashboard`
- Query params: `lat`, `lon`, optional `date` (ISO)
- Returns:
  - `date`
  - `phase_name`
  - `illumination_pct`
  - `moonrise_local`
  - `moonset_local`
  - `zodiac_sign`
  - `vibe`

### `GET /api/v1/calendar`
- Query params: `lat`, `lon`, `month` (`YYYY-MM`)
- Returns:
  - `month`
  - `days[]` with `date`, `phase_name`, `illumination_pct`, `zodiac_sign`, `icon_key`

### Error envelope
- `error.code`
- `error.message`
- `error.details` (optional)

## 7. Security Checklist (Run Every Milestone)
- Input validated and typed at boundaries
- No sensitive data in logs
- Error responses sanitized
- Dependencies reviewed for new vulnerabilities
- Auth/access assumptions documented
- Public endpoints rate-limited where needed

## 8. UX Checklist (Run Every Milestone)
- Mobile-first layout verified
- Touch targets large enough
- Navigation is obvious in under 5 seconds
- Important data visible without scrolling overload
- Motion is smooth and not distracting
- Visual contrast remains high in dark mode

## 9. Suggested Execution Order
1. A1-A4
2. B1-B5
3. C1-C6
4. D1-D3
5. E1-E4
6. F1-F5
7. G1-G4
8. H1-H3

## 10. Handoff Template (Use for Every Agent Task)
```md
Task ID: <e.g., C4>
Summary:
Files Changed:
Validation Run:
- <command>
- <result>
Security Notes:
UX Notes:
Known Gaps:
Next Task Recommendation:
```
