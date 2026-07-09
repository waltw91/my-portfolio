# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Despite the repo name, this is not a portfolio site — it's **Fintrack**, a single-page personal finance tracker for an Argentine investor. It manages CEDEARs, Merval (local equities), and Crypto holdings, cash positions, monthly expenses, and a trading desk (open/closed trades), all in ARS/USD with MEP/CCL exchange-rate conversion. UI copy and code comments are largely in Spanish, reflecting Argentine market terminology (CEDEARs, Merval, MEP, CCL, Dolarización).

There is no backend: all data is persisted client-side in `localStorage`.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run lint      # eslint .
npm run preview   # preview a production build locally
```

There is no test suite/framework configured in this repo.

## Architecture

- **`src/App.jsx` is the entire application** — a single ~4200-line file exporting one component, `PortfolioTracker`, rendered by `src/main.jsx`. There is no component-file-per-component split; everything (lookup tables, helpers, subcomponents, tab views, and the root component) lives in this one file, organized by `// ── Section ──` banner comments. When making changes, locate the relevant banner section first rather than assuming a separate file exists.
- **Four tabs**, switched via `activeTab` state in `PortfolioTracker` (bottom of the file, `// ── App ──`): `portfolio`, `eot` (Evolution Over Time), `expenses`, `trading`. Each non-portfolio tab is its own top-level view component (`EOTView`, `ExpensesView`, `TradingView`) that manages its own localStorage-backed state independently — they do not share React state with `PortfolioTracker` or each other.
- **Persistence is 100% `localStorage`**, namespaced by key prefix:
  - `portfolio:<section>:<year>-<month>` — monthly snapshot rows for `cedears` | `pesos` (Merval) | `crypto`
  - `portfolio:fx:<year>-<month>` — MEP/CCL/crypto FX rates for that month
  - `portfolio:cash:<year>-<month>` — cash panel (Uala, Mercado Pago, físicos, banco, IOL)
  - `portfolio:comment:<section>` — the note bubble per section
  - `expenses:<year>` and `expenses:comments:<year>` — Expenses tab
  - `trading:<key>` (portfolio / active / historic) and `trading:mepHoy` — Trading Desk tab
  - Key builders: `makeKey`, `fxKey`, `cashKey`, `commentKey`, `expKey` — always use these instead of hand-building keys, so Export/Import continues to pick everything up.
  - Export (`handleExport`) and Import (`handleImport`) work by scanning/writing *all* localStorage keys under the `portfolio:`, `expenses:`, and `trading:` prefixes as one JSON backup. If you add a new persisted key, make sure it uses one of these three prefixes or it will silently be excluded from backup/restore.
  - Import triggers a full `window.location.reload()` because `ExpensesView`/`TradingView`/etc. only read localStorage on mount and don't listen for external changes.
- **Data model**: each portfolio row (`emptyRow()`) is a monthly snapshot: `{id, ticker, name, shares, type, valor}`. `valor` is a single manually-entered number in the section's *native* currency (USD for CEDEARs/Crypto, ARS for Merval); the other currency is derived on the fly via the MEP/CCL/crypto FX rate and is never persisted. There is no cost-basis/P&L-per-position concept anymore — "P&L" shown throughout the app is the delta vs. the previous month's snapshot for the same ticker (see `ComparePanel`, `prevMonthNativeTotals` in `PortfolioTracker`).
- **Per-section config lives in parallel lookup tables** near the top of the file, keyed by section (`cedears`/`pesos`/`crypto`): `SECTION_META`, `*_NAMES` (ticker→company name autocomplete), `*_TYPES` (the "Tipo" dropdown options), and `*_TYPE_COLORS` (color coding). When adding a new asset type or ticker, update the matching table for that section rather than adding ad hoc logic. Trading Desk's "Portafolio Actual" table intentionally reuses CEDEARs' `TYPE_COLORS` as its single source of truth (see comment above `TYPE_COLORS`).
- **Styling is 100% inline style objects** — no CSS modules, no Tailwind, no styled-components. The dark-theme palette is centralized in the `C` object near the top of `App.jsx`; reuse `C.*` values instead of hardcoding colors. `src/index.css` only styles the (largely unused/legacy) static shell from the original Vite template — most visual work happens through inline styles in `App.jsx`. Fonts are injected via a `<style>{FONTS}</style>` Google Fonts `@import`.
- **Charts** use `recharts` (`PieChart`/`LineChart` etc.), wrapped in local components like `SectionPieChart` and `DonutChart`.
- **React Compiler** is enabled via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` in `vite.config.js` — avoid manual `useMemo`/`useCallback` micro-optimizations that fight the compiler; the existing sparse use of `useCallback`/`useMemo` in `App.jsx` is intentional (e.g., for values with real recompute cost) rather than a pattern to imitate everywhere.

## Conventions

- **Version header**: the top of `App.jsx` has a hand-maintained `VERSION HISTORY` comment block followed by `const APP_VERSION = "x.y"` and `APP_BUILD`. When making a user-visible change to the app, append a new dated entry to this changelog and bump `APP_VERSION` (and `APP_BUILD` to the current date), following the existing terse Spanish changelog style.
- Money formatting goes through `fmt()`/`fmtPct()` (locale `es-AR`), and P&L coloring through `pnlColor()`/`pnlBg()` (green/red, with **zero treated as amber**, not green) — reuse these instead of ad hoc formatting.
- Section-specific behavior (FX key, native currency, color function) is generally implemented as a small lookup object keyed by section (e.g. `FX_KEY_MAP`, `SECTION_TYPE_COLOR_FN`) rather than `if/else` chains — follow this pattern when extending per-section logic.
