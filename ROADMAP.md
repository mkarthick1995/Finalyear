# RenalCare AI — Completion Roadmap

**Purpose**: capture what needs to be fixed, what the current repo actually contains, and what should be deferred until the API/LLM decision is made.

**Environment assumption**: macOS with zsh. The instructions below use macOS-compatible shell commands.

---

## Table of contents

- [Current repository status](#current-repository-status)
- [Budget allocation](#budget-allocation-target)
- [Phase 0 — Environment setup](#phase-0--environment-setup)
- [Phase 1 — Hygiene and cleanup](#phase-1--hygiene-and-cleanup)
- [Phase 2 — Core feature fixes](#phase-2--core-feature-fixes)
- [Phase 3 — Scan analysis model](#phase-3--scan-analysis-model)
- [Phase 4 — Multi-patient auth](#phase-4--multi-patient-auth)
- [Phase 5 — Health Goals / LLM (deferred)](#phase-5--health-goals--llm-deferred)
- [API / LLM decision note](#api--llm-decision-note)
- [Sequencing & effort estimate](#sequencing--effort-estimate)
- [Definition of done](#definition-of-done)
- [Rollback / fallback plan](#rollback--fallback-plan)

---

## Current repository status

- Backend: FastAPI with patient management, scan upload/analysis, hydration tracking, meals, risk insights, appointments, and doctor recommendations.
- Multi-user auth: signup/login/logout, hashed passwords, server-revoked session tokens, per-account data isolation on all patient endpoints.
- Vision model: MobileNetV2 normal/stone classifier trained on the public CT-KIDNEY dataset; honest held-out test metrics served by `/api/vision/metrics` and shown in the UI.
- Health Goals: rule-based by default with optional NVIDIA NIM LLM generation and graceful fallback + daily cache.
- Frontend: auth-gated dashboard with live backend data (hydration, risk, latest scan), scan upload, hydration tracker, risk insights, appointment booking (persisted), and health goals.
- Tests: 28-pass pytest suite (isolated DB) covering auth, isolation, water/meal round-trips, appointments, goals, vision metrics, and the scan endpoint.

---

## Budget allocation (target)

| Item | Cost | Notes |
|---|---|---|
| Data / training environment | ₹0 | Use free Kaggle/Colab or local CPU for any model work. |
| Model training / integration | ₹0 | Optional, only if scan analysis needs a stronger ML path. |
| Health Goals / LLM | ~₹150–250 | Only if the paid LLM decision is made. |
| Buffer / contingency | ~₹150–250 | Keep budget headroom for any paid service. |
| **Total** | **≤ ₹500** | |

> The LLM phase is deferred until the API decision is finalized.

---

## Phase 0 — Environment setup

1. Confirm tools:
   - `python3 --version` (3.10+)
   - `node --version` (18+)
   - `npm --version`
   - `git --version`

2. Install dependencies:
   - `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
   - `cd ../ && npm install`

3. Sanity check:
   - Run `python init_db.py` in `backend` to seed the demo patient.
   - Run `python main.py` in `backend` and `npm run dev` in `renalcare`.
   - Confirm backend docs at `http://localhost:8001/docs` and frontend at the Vite URL.

---

## Phase 1 — Hygiene and cleanup

This is the first priority.

### 1.1 Fix repository hygiene

- Add backend artifacts to `.gitignore`:
  - `backend/__pycache__/`
  - `backend/*.pyc`
  - `backend/venv/`
  - `backend/*.db`
  - `backend/uploads/*`
  - `.env`
  - `backend/.env`
- Keep a placeholder `backend/uploads/.gitkeep` if needed.

### 1.2 Remove stale assets and docs

- Remove duplicate or stale root docs that are no longer accurate.
- Remove the top-level `api.js` file if it is not used.
- Keep only the accurate `README.md` and `backend/README.md`.

### 1.3 Make `.env` local-only

- Keep only `.env.example` in git with placeholders.
- Do not commit `backend/.env`.

---

## Phase 2 — Core feature fixes

This phase is the current implementation priority.

### 2.1 Appointment persistence

What needs to be done:
- Wire the `Book Now` button to call the backend appointment creation endpoint.
- Ensure the backend returns a real appointment id.
- Use the real id when saving recommendations, not a synthetic local id.
- Verify the appointment is persisted and visible via `/api/appointments/{patient_id}`.

### 2.2 Dashboard should be live data

What needs to be done:
- Replace static dashboard cards with real values from backend APIs.
- Use existing API helpers like `getHealthSummary()` and `getRiskInsights()`.
- Replace the fake drag-and-drop upload area with the real scan upload flow or a navigation path to the scan tab.
- Avoid showing placeholder metrics as if they are real.

### 2.3 Clean stale frontend/backend imports

What needs to be done:
- Remove unused imports such as `pickle` from `backend/main.py`.
- Remove unused frontend imports like `getPatient` from `ImageUploadComponent.jsx` if the function is not used.

---

## Phase 3 — Scan analysis model

This phase is optional and only needed if the current scan analysis path is not good enough.

### 3.1 Current status

- The backend already accepts scan uploads and stores analysis results.
- If the existing image analysis is sufficient for the demo, keep it and document it as the current behavior.

### 3.2 Optional model work

- If you choose to add real ML later, do it as a separate follow-up phase.
- Keep any model training and integration isolated from the core feature fix path.

---

## Phase 4 — Multi-patient auth

This is optional and can be delayed.

### 4.1 Current state

- The app still depends on a seeded demo patient id.
- No login or user session flow exists.

### 4.2 Recommended decision

- If you want the app to feel multi-user, add minimal auth later.
- If not, leave the app on the seeded demo patient and document that as future work.

---

## Phase 5 — Health Goals / LLM (deferred)

This phase is intentionally last and deferred until the LLM/API decision is final.

### 5.1 Current state

- The Goals tab is a placeholder.
- No Anthropic or other paid LLM integration is implemented.

### 5.2 What to do later if decided

- Add a dedicated goals endpoint and frontend component.
- Use a cached daily result to keep cost predictable.
- Only implement the paid LLM integration after the budget and API approach are confirmed.

---

## API / LLM decision note

- Keep this section last in the roadmap.
- Do not start any paid LLM or API-key-based implementation until the final decision is made.
- If the decision is delayed, keep the Goal tab as a static or simple rule-based placeholder.

---

## Sequencing & effort estimate

- Phase 0: environment setup — ~30 min
- Phase 1: hygiene and cleanup — ~15 min
- Phase 2: core fixes — ~1 day
- Phase 3: scan model — optional if needed
- Phase 4: auth — optional if chosen
- Phase 5: Goals / LLM — deferred until decision

---

## Definition of done

- [x] Repo runs end to end after fresh clone and setup
- [x] No stale docs or duplicate top-level files remain
- [x] Dashboard uses live backend data, not placeholders
- [x] Appointment booking persists to the backend
- [x] `backend/.env` is local-only and gitignored
- [x] Goals / LLM work ships with a rule-based default and optional NVIDIA NIM path

---

## Rollback / fallback plan

| Phase | If not finished in time | Fallback |
|---|---|---|
| Phase 3 | Scan model not ready | Keep current scan analysis path and ship it as the working feature |
| Phase 4 | Auth not ready | Use the seeded demo patient and document auth as future work |
| Phase 5 | LLM decision delayed | Keep Goals as a placeholder and postpone paid integration |

---
