# Workspace Map

## Purpose
This repo currently hosts two different web experiences on purpose.

## 1) Static Holding Page (production placeholder)
- File: `index.html` (repo root)
- Role: temporary landing page for `www.aapstart.com` while the portal is still in active development
- Notes: keep this stable unless you explicitly want to change the live holding page

## 2) Product App (in active development)
- Frontend: `frontend/` (Next.js)
- Backend: `backend/` (FastAPI)
- Main dev route: `http://localhost:3000/overview`

## Daily Dev Workflow
1. Start backend from `backend/`.
2. Start frontend from `frontend/` with `npm run dev`.
3. Validate changes on `localhost:3000` routes (`/overview`, `/resources`, `/roadmap`, etc.).
4. Do not use root `index.html` to verify portal UI changes.

## Guardrails
- Keep the root `index.html` until the team is ready to replace the holding page.
- Build and polish portal features only inside `frontend/` and `backend/`.
- If a change should affect the public holding page, call that out explicitly in the PR/commit summary.
