# PreOrder Project Instructions

## Project Scope
Holiday Pre-Order Manager for seasonal bakery events (Thanksgiving pies, Christmas cookies, etc.).

## Repository Layout
- Backend API: `api/`
- Frontend (Angular): `web/`
- CI/CD and automation: `.github/`

## Working Guidelines
- Keep changes focused on preOrder requirements.
- Reuse patterns from BakeBoard when helpful, but avoid bringing over unrelated legacy complexity.
- Prefer small, incremental changes that compile quickly.
- Do not create extra documentation files unless explicitly requested.

## Backend Guidelines
- Target .NET 8 unless explicitly changed.
- Keep API modules feature-oriented:
  - Auth
  - Holiday Events
  - Menu Items
  - Pre-Orders
  - Admin Operations
- Favor DTO-based controller contracts and service-layer business logic.
- Use environment variables/appsettings for connection and auth settings.

## Frontend Guidelines
- Use Angular feature modules and clear route boundaries:
  - Auth
  - Admin (Events/Menu/Orders)
  - Public Order Form
- Keep API calls centralized in services.
- Keep forms strongly validated with clear user feedback.

## Authentication
- Default admin auth: secure cookie-based auth.
- JWT may be added for API/mobile integration use cases.
- Never hardcode secrets or tokens in source.

## Copy/Re-use Strategy
When copying from BakeBoard:
1. Copy only the minimum needed slice.
2. Build/verify after each slice.
3. Rename/refactor for preOrder semantics early.

## Completion Expectations
- Ensure modified backend builds.
- Ensure modified frontend builds (or report exact blockers).
- Summarize what was changed and next recommended step.
