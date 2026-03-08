# Accessibility Checklist (Task G2)

Audit date: 2026-03-08

## Automated checks

Commands run from `frontend/`:

```bash
npm run test:a11y
npm run test:e2e
npm run test
npm run lint
```

Results:
- `test:a11y`: pass (`axe-core` scan on dashboard, calendar, and date detail modal)
- `test:e2e`: pass (critical MVP flow on mobile viewport)
- `test`: pass (includes dialog keyboard close/focus-return component tests)
- `lint`: pass

## Manual checklist results

- Keyboard-only navigation:
  - Dashboard primary navigation links are reachable and operable with keyboard.
  - Calendar day buttons are reachable and open details with Enter/Space.
  - Detail sheet close button is focused on open; Escape closes sheet.
- Focus order:
  - Focus moves in logical top-to-bottom order.
  - Focus-visible indicator is present on interactive controls.
  - Focus returns to selected calendar day when detail sheet closes.
- Labels and semantics:
  - Primary navigation has an explicit `aria-label`.
  - Dialog uses `role="dialog"` with `aria-modal="true"` and accessible name.
  - Form controls in manual location entry have labels.
  - Non-interactive/placeholder control (`Settings`) is now disabled to avoid misleading interaction.
- Contrast:
  - Calendar out-of-month day number contrast adjusted to meet WCAG AA in automated audit.
  - Existing contrast token tests continue to pass.

## Fixes applied in this task

- Added automated `axe-core` Playwright accessibility spec.
- Added visible focus styles for links, buttons, and form controls.
- Improved navigation semantics (`aria-label` on primary nav).
- Updated non-actionable settings control to true `disabled`.
- Increased low-contrast calendar text for out-of-month day cells.
