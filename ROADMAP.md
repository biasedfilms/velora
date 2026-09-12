# Velora Roadmap

Velora is a private, browser-first, local-first personal budgeting application.

## Project Principles

- Private by default: financial records remain local to the user's device.
- Fast daily use: recording an expense should take seconds.
- Useful, not noisy: insights should explain spending without overwhelming users.
- Portable: users can export and restore their own data.
- Progressive: start small while keeping the architecture ready for a richer product.
- Responsive and accessible: desktop and mobile layouts are deliberately designed, with clear controls and readable contrast.

## Current Architecture

- HTML5
- CSS3
- Vanilla JavaScript
- IndexedDB for financial/application data
- localStorage only for non-sensitive UI preferences such as theme
- System / Light / Dark theme support
- Liquid Glass visual language

## Development Progress

### Phase 0 — Foundation
- [x] Project structure
- [x] Application shell
- [x] Responsive layout foundation
- [x] Light / Dark / System themes
- [x] Liquid Glass design system foundation

### Phase 1 — Core Finance
- [x] Transactions
- [x] Categories
- [x] Accounts
- [x] Data-driven dashboard
- [x] Dashboard monthly income / expenses
- [x] Dashboard account summary
- [x] Dashboard recent activity

### Phase 2 — Budgeting
- [x] Monthly budgets
- [x] Budget progress indicators
- [x] Recurring expenses
- [x] Savings goals
- [x] Calendar view

### Phase 3 — Intelligence
- [x] Spending trends
- [x] Month-over-month comparisons
- [x] Safe to Spend
- [x] Personalized insights
- [x] Financial timeline

### Phase 4 — Resilience & Polish
- [x] PWA / offline support
- [x] Import / export backup
- [x] CSV export
- [x] Data reset and recovery flows
- [x] Performance pass
- [x] Accessibility pass
- [x] Final visual polish
- [x] Release smoke testing

## Current Status

**Release-ready candidate — Phase 4 complete**

Phase 0, Phase 1, Phase 2, and Phase 3 are complete. Velora now includes core finance tracking, budgeting, recurring expenses, savings goals, Calendar, spending trends, Safe to Spend, Personalized Insights, and the Financial Timeline.

## Next Milestone

**Phase 4 — Resilience & Polish (complete)**

Phase 4 is complete. The remaining work before v1.0.0 is final device/browser QA, production HTTPS deployment, and launch packaging.

## Product Boundaries

Velora is a budgeting and personal finance organization tool.

It is not intended to become:
- a bank
- an investment platform
- a financial-advice service
- a payment processor

Avoid early feature creep such as direct bank synchronization, payment processing, lending, investments, or social-finance features.
