# Secrets And Dependency Security (Task E4)

## Environment and secrets policy

- Never commit real secrets (`.env`, tokens, private keys, passwords).
- Commit only template files (`.env.example`) with non-sensitive defaults.
- Keep production secrets in host-level secret stores or deployment environment variables.
- Rotate credentials immediately if exposure is suspected.

Current template files:
- [`backend/.env.example`](../backend/.env.example)
- [`frontend/.env.example`](../frontend/.env.example)

## Dependency vulnerability scanning

Project Lunar uses:
- `pip-audit` for Python dependencies
- `npm audit` for Node dependencies

### Run locally

From repository root:

```bash
python -m pip install --upgrade pip
python -m pip install pip-audit
pip-audit -r backend/requirements.txt
```

From `frontend/`:

```bash
npm ci
npm audit --audit-level=high
```

## CI enforcement

CI runs dedicated dependency scanning jobs:
- `pip-audit -r backend/requirements.txt`
- `npm audit --audit-level=high` in `frontend/`

PRs fail when high-impact dependency vulnerabilities are detected.
