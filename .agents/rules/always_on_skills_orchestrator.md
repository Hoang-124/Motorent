---
trigger: always_on
description: Master All-Skills Autonomous Engine that activates on every command and user turn.
---

# 🚀 ALL-SKILLS AUTONOMOUS ENGINE (ALWAYS ON)

Whenever the user gives any instruction or command, this rule enforces that all installed skill frameworks and architectural constraints run simultaneously across every phase of planning, coding, reviewing, and responding.

---

## 1. PERSISTENT SYSTEM ARCHITECTURE (Modular Monolith)
* **Backend Structure (`server/src/`):**
  - `config/`: Environment, DB, VNPay, Mailer.
  - `core/`: Middlewares (`authMiddleware`, `rbacMiddleware`, `auditMiddleware`, `uploadMiddleware`, `errorHandler`).
  - `models/`: 18 Mongoose models.
  - `modules/`: Feature-based (`auth`, `branch`, `vehicle`, `booking`, `fleet`, `hr`, `support`, `cms`).
  - `routes/`: Central `/api` index aggregator.
* **STRICT SVG ONLY REQUIREMENT:**
  - Zero emojis in UI or component icons.
  - Zero icon-font dependencies.
  - ONLY use pure vector SVGs or SVG React components (e.g. Lucide SVGs, inline raw SVG elements).

---

## 2. ENGINEERING & EXECUTION PROTOCOL (obra/superpowers & garrytan/gstack)
* **Plan & Brainstorm Gate (`brainstorming`, `writing-plans`, `gstack-spec`):**
  - Always think deeply before making modifications.
  - Break down complex logic into clear, discrete, verified sub-steps.
* **Systematic Debugging & TDD (`systematic-debugging`, `test-driven-development`, `matt-tdd`):**
  - Never guess or patch blindly; inspect root causes with logs and data.
  - Verify edge cases, validate inputs with schemas, ensure deterministic execution.
* **Verification Before Completion (`verification-before-completion`, `gstack-qa`, `gstack-review`):**
  - Never declare a task done without automated or manual verification proof (run tests, curl endpoints, check database records).
  - Actively perform self-code review to prevent regressions.

---

## 3. DESIGN & VISUAL EXCELLENCE (ui-ux-pro-max, taste-skill, awesome-design-md)
* **Zero Slop & Anti-Generic Aesthetics (`taste-skill`, `awesome-design-md`):**
  - Modern typography hierarchy (Inter, Outfit, Plus Jakarta Sans).
  - Micro-interactions, smooth hover transitions, responsive mobile-first grid layouts.
  - No broken images or ugly placeholders.

---

## 4. ARCHITECTURE & CODE QUALITY (mattpocock/skills & anthropics/skills)
* **Domain Modeling & Clean Architecture (`matt-domain-modeling`, `matt-codebase-design`):**
  - Enforce strict typing with TypeScript; avoid `any`.
  - Maintain clean boundaries: Separate controllers, services, models, routes, and middleware.

---

## 5. CONCISE & DENSE COMMUNICATION (DietrichGebert/ponytail & juliusbrussee/caveman)
* **High Signal-to-Noise Ratio (`ponytail`, `caveman`):**
  - Cut useless conversational fluff, boilerplate pleasantries, and redundant repetitions.
  - Deliver actionable, precise, dense code diffs and verifiable status reports.

---

## 6. 2026 CUTTING-EDGE & AGENTIC AUTONOMY (nousresearch/hermes-agent & last30days-skill)
* **Autonomous Execution (`hermes-agent`, `last30days`):**
  - Proactively execute tasks, test environments, seed data, and fix errors autonomously without asking permission for trivial actions.
