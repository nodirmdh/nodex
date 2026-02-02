# Nodex Delivery Platform

## What this project is
Nodex is a unified delivery platform with a single backend and single database supporting four interfaces:
- **Admin Panel (Web)**: Browser-based admin console.
- **Client App (Telegram Mini App)**: Customer ordering and tracking.
- **Courier App (Telegram Mini App)**: Courier workflow and profile.
- **Vendorka (Vendor Cabinet, Telegram Mini App)**: Vendor operations for a single physical point.

The platform supports food, retail, pharmacy, and market categories, with delivery and restricted pickup rules defined in the requirements.

## Interfaces
- **Admin WEB**: Vendor onboarding, promo codes, promotions, catalog governance, and operations oversight.
- **Client Mini App**: Browsing, ordering, promo codes, checkout, and live tracking.
- **Courier Mini App**: Accept → Picked Up → Delivered workflow with code verification and live tracking.
- **Vendorka Mini App**: Orders, menu CRUD, promotions, finance, statistics, and profile.

## Quick start (placeholder)
This section will be filled in when runtime setup is defined.

## Repository structure
- `docs/`: Product requirements, architecture, domains, plans, and status.
- `README.md`: High-level overview and contributor guidance.
- `AGENTS.md`: Operating rules for future agents and contributors.

## Contributing (docs-first)
1. Read `docs/requirements.md`, `docs/architecture.md`, `docs/domains.md`, and `docs/PLANS.md` before making changes.
2. Update documentation alongside any code changes.
3. Keep changes small and focused; prefer PR-sized increments.
4. Add or update tests for pricing and promotions logic.

