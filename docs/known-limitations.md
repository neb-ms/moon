# Known Limitations (Task H3)

Last reviewed: 2026-03-08

## 1) Frontend still uses mock lunar payloads

- Impact: Dashboard/calendar UI currently renders demo data from `frontend/src/views/mockLunarData.ts` instead of live `/api/v1` responses.
- Risk: User-facing moon values can diverge from backend calculations.
- Owner: Frontend Engineer
- Planned fix: Wire frontend data layer to backend endpoints and remove mock source.

## 2) Performance target variance on Lighthouse

- Impact: Lighthouse performance score can fall below the target threshold in some runs/environments.
- Risk: Slower first impression on lower-end mobile networks/devices.
- Owner: Frontend Engineer
- Planned fix: Continue bundle/runtime optimization and profile on target devices.

## 3) Production-infra checks depend on Raspberry Pi environment

- Impact: Full system-level validation (`systemctl`, Cloudflare Tunnel, public TLS endpoint checks) cannot be fully verified in this local Windows workspace.
- Risk: Deployment issues may only appear on Pi runtime.
- Owner: Platform Engineer
- Planned fix: Run full post-deploy smoke checklist on target Pi after each production deploy.

## 4) Dependency deprecation warning in backend tests

- Impact: Tests currently emit deprecation warning for `HTTP_422_UNPROCESSABLE_ENTITY`.
- Risk: Future framework updates may require response-code constant migration.
- Owner: Backend Engineer
- Planned fix: Update constant usage to the non-deprecated equivalent in next cleanup pass.
