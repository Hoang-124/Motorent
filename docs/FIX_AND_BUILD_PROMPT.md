# MASTER PROMPT: FIX AUDIT ISSUES + BUILD REMAINING BACKLOG (OWNER: HOÀNG)

## 0. ROLE AND GROUND RULES
You are a senior full-stack engineer on MOTORENT (`d:\Motorent`): Express + Mongoose + TypeScript (server), React 18 + Vite + Tailwind + TypeScript (client).

Hard rules (from `GEMINI.md` / `AGENTS.md`, no exceptions):
1. Server stays a Modular Monolith: `config/`, `core/`, `models/`, `modules/<feature>/{controller,service,routes}`, `routes/index.ts` only aggregates routes.
2. UI: NO emoji, NO icon fonts. Inline SVG or `lucide-react` SVG components only. Server logs should also drop emoji.
3. TypeScript strict. NO `any`. Validate every input with zod.
4. Do not delete or rewrite unrelated comments/docstrings.
5. Never print or commit secrets. Do not read `.env` values into output.
6. After EVERY phase run: `cd server; npx tsc --noEmit; npx vitest run` and `cd client; npx tsc -b`. Do not move on if red. Report real output, never assume success.
7. Work in small commits, one per phase. Do not start phase N+1 before phase N is green.
8. Before changing a file, read it fully. Before creating a new module, check that none already exists.

## 1. PHASE 0: SAFETY (do first, 10 minutes)
1. Add to `.gitignore`: `server/private_uploads/`, `server/uploads/`. Verify with `git check-ignore -v server/private_uploads`.
2. Create a separate test DB: tests must use `MONGODB_URI_TEST` (default `mongodb://127.0.0.1:27017/motorent_test`), never `motorent_db`. Update `config/env.ts`, `vitest.config.ts` (rename to `vitest.config.mts` to fix the ESM warning), and both existing test files. Drop the test DB in `afterAll`.
3. Add `.env.example` entries for every new variable you introduce. Real secrets already leaked (Gmail app password, Google client secret) must be rotated by the human. Print a clear reminder, do not attempt it yourself.
4. Commit the current uncommitted work first (`git add -A; git commit`) so there is a rollback point.

## 2. PHASE 1: CRITICAL FIXES (payments and bookings)

### 1.1 VNPay config hardening (`config/env.ts`, `vnpayService.ts`)
- Remove the `'DEMO_SECRET'` / `'DEMO_CODE'` fallbacks. In `env.ts` use `superRefine`: when `NODE_ENV === 'production'`, `VNP_TMNCODE`, `VNP_HASHSECRET`, `VNP_URL`, `VNP_RETURNURL`, `SMTP_*` are required, and `JWT_SECRET` must not contain `motorent_super_secret`.
- In development and test, a clear dev default is allowed, but log a warning once.
- Replace `Record<string, any>` with `Record<string, string | number | undefined>` (type alias `VnpParams`).
- Edge cases: secret with trailing whitespace (trim), `VNP_RETURNURL` missing scheme, amount as float (must be integer VND x100).

### 1.2 Make IPN the only source of truth
- `verifyReturnUrlData` must be READ-ONLY. Remove the block that sets `isPaid`/`status`. It only verifies the checksum and returns status for UI display. It may read the booking, never write it.
- `processVnPayIpn`:
  - Verify checksum, then find booking, then compare amount, then idempotency, then update. Keep this order and RspCodes `97 / 01 / 04 / 02 / 00`.
  - Return `00` for a failed payment (spec-correct), but record a `Payment` attempt as FAILED so the booking can be retried.
  - Idempotency must be atomic: use `Booking.findOneAndUpdate({ _id, isPaid: false, status: 'Pending' }, { $set: ... }, { new: true })`. If it returns `null`, respond `02`. This prevents double confirmation when IPN is retried concurrently.
  - Compare `vnp_TxnRef` against the LATEST issued txnRef stored on the booking (`booking.lastTxnRef`). Reject old refs.
  - Deposit vs full: set `booking.paidAmount`, `remainingAmount`. After a 30% deposit: `status='Confirmed'`, `isPaid=false` (balance still due), `depositPaid=true`. After Full100: `isPaid=true`. Add the `depositPaid` and `paidAmount` fields to the model (migration: default false/0).
  - Wrap `Booking` update + `AuditLog` + `Notification` so a failure in notification never fails the IPN (already caught, keep it).
- Add a unit test for each RspCode, replay of the same IPN (expect `02`, state unchanged), tampered amount (expect `04`), and tampered checksum (expect `97`).
- Timezone: `formatVnPayDate` must not depend on the server's local TZ. Compute GMT+7 with `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', ... })` or by pure UTC arithmetic. Test with `TZ=UTC` and `TZ=Asia/Tokyo`.

### 1.3 Auto-expire unpaid bookings (cron)
- Create `core/jobs/bookingExpiryJob.ts` using `node-cron` (every minute). Cancel `Pending` bookings where `paymentExpiresAt < now` OR (`paymentExpiresAt` missing AND `createdAt < now - 30min`) with `cancelReason='Quá hạn thanh toán'`. Also release a discount (`$inc usedCount: -1`) and mark the reminder cancelled.
- Use `updateMany` with a status guard, so it is safe if the IPN lands at the same time. Start the job only from `startServer()`, never at import time (tests import `app`). Guard against double start (hot reload) with a module-level flag.
- Race to consider: user pays at minute 14:59 and IPN arrives at 15:01 after the job cancelled the booking. Handle in IPN: if the booking is `Cancelled` but the payment succeeded, mark it `PaidAfterCancel`, create a refund-needed audit entry and notify staff. Never silently drop money.

### 1.4 Atomic booking creation (no double-booking)
- Current `findOne` then `create` is racy. Fix with a MongoDB transaction (`session.withTransaction`) PLUS a guard document.
  - Option chosen: add a `VehicleLock` collection (or reuse `Vehicle` with a `$push` reservation) is overkill. Use this approach: inside a transaction, `Booking.findOne(conflict).session(session)`, then `Booking.create([..], { session })`. Transactions need a replica set. Detect support at startup (`db.admin().command({ hello: 1 })`). If standalone (as in local dev with plain `mongod`), fall back to an in-process per-vehicle mutex (`Map<vehicleId, Promise>`) and log a warning. Document in README how to run a single-node replica set (`--replSet rs0`, `rs.initiate()`).
- Discount handling inside the same transaction: increment `usedCount` with a guarded update (`{ code, $expr: usedCount < usageLimit }`) and check `matchedCount`. If the booking creation fails, the transaction rolls back the increment. Also enforce per-user usage limit (add `usedBy: ObjectId[]` to Discount).
- Validate minimum duration (>= 2 hours) and maximum (<= 30 days), and the pickup time falls in the branch `hours_open/hours_close` window (convert with the Vietnam timezone). Return 400 with a clear message.
- Server-side price calculation only. Ignore any price in the request body. Support `hourlyPrice` for rentals < 24h (UC-71) and seasonal multiplier (UC-72) when those features exist.
- Index: add compound index `{ vehicleId: 1, status: 1, pickupDateTime: 1, returnDateTime: 1 }`.
- Concurrency test: fire 10 parallel `POST /bookings` for the same vehicle and slot, expect exactly 1 `201` and 9 `409`.

### 1.5 Check-in / Check-out correctness
- Check-in: only `Confirmed` or `Approved`. Reject `Pending`. Require `identityStatus === 'Verified'` on the customer, the 5-point checklist (ID verified, license verified, at least 4 photos, ODO, fuel), and `now >= pickupDateTime - 1h`. Vehicle must be `Available` (not `Maintenance`/`Rented`). Use `findOneAndUpdate` with a status guard to avoid double check-in.
- Staff/BranchManager with no `branchId`: respond 403 `Tài khoản nhân sự chưa được gán chi nhánh`. Never fall through to "see everything". Same in `getBranchBookings`. Only `SystemAdmin` is unrestricted.
- Check-out: calculate `lateFee = ceil(lateHours) * 30000` with a 15-minute grace period (config), `damageFee`, then `finalDue = remainingAmount + lateFee + damageFee - (Full100 paid ? remainingAmount : 0)`. Store `settlementAmount`. Do NOT set `isPaid = true` unless the counter payment was recorded. Add endpoint `PUT /bookings/:id/counter-pay` (UC-31) that records cash/POS payment (`paidAmount`, `paidBy`, `paidAt`), and make check-out require `finalDue === 0` or an explicit `settleNow` flag.
- Loyalty points: base on `totalAmount - discountAmount` actually paid, awarded once (guard with `loyaltyAwarded` flag), on `Completed` only.
- ODO maintenance flag: replace `% 1500 <= 100` with `Math.floor(odo / 1500) > vehicle.lastMaintenanceBucket`. Use a `nextMaintenanceOdo` field.
- Wrap check-out (booking + vehicle + user points) in one transaction (with the same fallback as 1.4).

## 3. PHASE 2: SECURITY HARDENING (UC "Security Hardening")
1. `authMiddleware`: remove `?token=` support from the global middleware. Add a separate `authenticateJWTFromQuery` used ONLY on eKYC image GET routes (`<img src>` cannot send headers). Alternatively issue a 60-second signed URL token. Tokens without `tokenVersion` must be rejected (401), and all issued tokens must include it. Also check `exp` handling and `status` (`Suspended`) on every request.
2. `app.set('trust proxy', 1)` configurable via env `TRUST_PROXY`. Create a helper `getClientIp(req)` and use it in payment and audit code instead of reading `x-forwarded-for` raw.
3. Rate limits: add limiters to `/payments/vnpay/create` (10/min/user), `/auth/verify-email`, `/auth/ekyc` (10/hour), booking create (20/hour). Use `keyGenerator` with user id when authenticated.
4. Remove SVG from the generic `upload` filter. Better: validate by magic bytes (read first bytes: JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF....WEBP`), because the extension and MIME header are client-controlled. Randomize file names (already) and never trust `originalname`. Delete the file when validation fails.
5. Socket.IO: add an auth middleware `io.use` that verifies the JWT from `socket.handshake.auth.token`. A user can only `join_conversation` for a conversation they belong to (customer owns it, or staff/admin). Rooms per booking: `booking:<id>` allowed only for the owner and branch staff.
6. CSRF: the API uses a Bearer header (not cookies), so CSRF risk is low. Document this decision, and add a test that no auth cookie is ever set. If cookies are introduced later, add `SameSite=Strict` + CSRF token.
7. XSS: sanitize rich text (CMS pages) server-side with `sanitize-html` (allow-list tags). Escape HTML in emails. Set a CSP via helmet for the API, and make sure the client never uses `dangerouslySetInnerHTML` without sanitization (grep for it).
8. Mongo operator injection: use `express-mongo-sanitize` or reject keys starting with `$` or containing `.` in `req.body/query/params`. Escape user input before building regex for search (UC-11).
9. `express.json({ limit })`: lower to 1mb (uploads go through multer).
10. Error handler: in production never return stack traces or Mongo error details. Map `ZodError` to 400 with field messages, `CastError` to 400, duplicate key (11000) to 409.

## 4. PHASE 3: ARCHITECTURE CLEANUP
- Move the health check out of `routes/index.ts` into `modules/system/healthRoutes.ts`, and make it light (no 18 `countDocuments`). Return `{ status, uptime, db: readyState }`; the detailed counts go behind `SystemAdmin`.
- Create the missing modules with the controller/service/routes triple: `fleet`, `hr`, `support`, `cms`, `admin`, `notification`, `report`, `finance`, `chat`, `audit`. Mount each in `routes/index.ts`.
- Apply `authorize(...)` explicitly on EVERY non-public route. Add a test that walks the router stack and fails if a non-whitelisted route has no `authenticateJWT`.
- Remove duplicate auth routes (`/profile` vs `/me`, `/avatar` vs `/me/avatar`, POST vs PUT `change-password`) after updating the client. Keep one canonical path.
- Replace the remaining `any` usages. Add `"noImplicitAny": true`, `"strict": true` check and an ESLint rule `@typescript-eslint/no-explicit-any: error`.
- Remove emoji from server logs. Create `core/logger.ts` (levels, no emoji).

## 5. PHASE 4: REMAINING BACKLOG (HOÀNG)

For each item: model changes, zod schema, service, controller, route with RBAC, audit log, tests (happy path, validation, authorization, edge cases), and the client UI where marked FE. Follow the order below (dependencies first).

### 4.1 Fix S1 inaccuracies
- Seed (`seeders/seed.ts`): match the acceptance criteria exactly, or update the doc: 3 branches (Hải Châu, Mỹ Khê, plus Sơn Trà), 10 users (1 admin, 3 managers, 2 staff, 4 customers), 5 categories, 20 vehicles. Make the seed idempotent (`deleteMany` only in `development`; refuse to run in `production` unless `--force`). Print a summary table.
- Register `GET /api/auth/verify-email/:token` as an alias of the query version. Add `GET /api/auth/google/callback` redirect flow if the client needs it; otherwise update the doc to `POST /api/auth/google`.
- Confirm email verification token expires after 24h, is single-use, and that expired tokens return 410 with a "resend" hint. Add tests.
- eKYC (UC-22): verify the whole flow: upload (3 files, magic-byte check), status goes to `Pending`, re-upload is allowed only when `Unverified/Rejected`, reviewer sets `Verified/Rejected` with a reason, customer notified, audit logged. Files are never served publicly. Delete old files when replaced. Add the FE state (pending banner, rejection reason).

### 4.2 UC-37 Track Status in real time (Socket.IO)
- Events: `booking:status` emitted from one function `emitBookingStatus(booking)` in `bookingEvents.ts`, called after every status change (IPN success, approve, reject, cancel, check-in, check-out, expiry job).
- Room `booking:<id>` + user room `user:<id>`. Authorization as in 2.5. Payload minimal: `{ bookingId, status, isPaid, updatedAt }`, no PII.
- Client hook `useBookingStatus(bookingId)` with reconnect + fallback to polling every 15s when the socket is down. Cleanup listeners on unmount. Test: connect without token (rejected), connect as another user (cannot join), owner receives event.

### 4.3 UC-44 / UC-66 Live Chat
- Models exist (`Conversation`, `Message`). Add `modules/chat`: REST for history (paginated, `before` cursor), Socket events `chat:send`, `chat:typing`, `chat:read`.
- Customer has at most 1 open conversation. Staff console lists open conversations of their branch, claim/assign, close. Message length <= 2000, rate limit 10 msg / 10s per socket, strip HTML. Persist before emitting. Ack with message id (idempotency by `clientMsgId`).
- Offline: unread counters per side, delivered on reconnect. FE: floating widget for customer, console page for staff.

### 4.4 UC-102 Audit Log Viewer + Audit Middleware completion
- `GET /api/audit` (SystemAdmin only): filters `userId, action, entity, from, to, q`, pagination (max 100/page), sort by `timestamp desc`. Indexes: `{ timestamp: -1 }`, `{ userId: 1, timestamp: -1 }`, `{ entity: 1, entityId: 1 }`.
- Audit middleware gaps: also log failed sensitive actions (401/403 on admin routes), store `before` and `after` for updates (diff of changed fields, redact sensitive keys), cap `details` size (e.g. 10KB), use TTL index (e.g. 1 year) configurable. The audit log must be append-only: no update/delete endpoint.
- FE: table with filters, JSON detail drawer, CSV export of the current filter.

### 4.5 UC-99 RBAC Matrix
- Central `core/permissions.ts`: `Record<Permission, UserRole[]>` as the single source of truth. `authorize` accepts permissions or roles. A SystemAdmin screen shows the matrix (read-only first, editable later with a `RolePermission` collection and a cache with invalidation).
- Add branch-scope helper `assertBranchAccess(user, branchId)` and use it everywhere (manager can only act on own branch).
- Test matrix: for every route x every role, assert the expected status (200/403/401).

### 4.6 UC-120 VNPay Reconciliation, UC-121 Tax Report
- Create `Payment` (transaction) collection if missing: `bookingId, txnRef, vnpTransactionNo, amount, type (DEPOSIT|FULL|COUNTER|REFUND), status, rawIpn (redacted), createdAt`, unique index on `{ vnpTransactionNo }` (sparse). Write one row per IPN, including failures.
- `GET /api/finance/reconcile?from&to`: compare `Payment` against `Booking` (paid booking with no payment row, payment row with a mismatched amount, duplicate transaction numbers, `PaidAfterCancel`). Return issues with severity. Optional: call VNPay `querydr` API per txn (behind a flag).
- `GET /api/finance/tax-report?period=month|quarter&year&n` exports xlsx via `exceljs`: revenue, VAT 8/10% (config), refunds, per branch. Stream the file, do not buffer huge sets. Test totals against fixture data. Money is stored as integer VND. Never use floating point.

### 4.7 UC-122 i18n (Could)
- Client: `react-i18next`, `vi` default, `en`. Extract all hard-coded strings by page into namespaces. Persist the language in localStorage and `Accept-Language` to the API. Server error messages return a `code` (e.g. `BOOKING_CONFLICT`) plus a message, and the client translates by code. Format dates/currency with `Intl` using the active locale.

### 4.8 Cross-team items you own
- Integration test suite in `server/src/__tests__/` covering: register, verify, login, lockout, forgot/reset, booking create, VNPay IPN (all codes), expiry job, check-in/out, cancellation, chat auth, audit.
- E2E (Playwright) for: customer books and pays (VNPay sandbox mocked), staff check-in/check-out, manager approve, admin audit view.
- Bug fix sprint checklist: `0 critical`, track in `docs/BUGS.md`.

## 6. PROBLEMS TO ANALYZE BEFORE CODING (write a short note per item in the PR)
1. Transactions need a replica set. What happens on standalone Mongo (dev, CI)? Fallback required.
2. Cron and multiple server instances: two instances would run the expiry job twice. Make the job idempotent (guarded `updateMany`) and optionally use a lock document with TTL.
3. IPN retries and ordering: IPN can arrive before the user returns, or twice. All state changes must be idempotent and monotonic (no status regression, e.g. `Completed` must never be reverted to `Confirmed`).
4. Clock skew and timezones: always store UTC; convert for display and VNPay only. Daylight saving does not apply in Vietnam, but the server host TZ may differ.
5. Money: integer VND only. Rounding of 30% deposit: `deposit = round(total * 0.3)`, `remaining = total - deposit` (never compute both by rounding).
6. Partial failures: check-out updates 3 collections. Use a transaction or compensating writes.
7. Discount abuse: parallel requests with one code, per-user limit, a cancelled booking must release the usage.
8. Authorization on object ids: every `:id` route must verify ownership or branch (IDOR). Add negative tests with a second user.
9. Mongoose `findById` with an invalid ObjectId throws `CastError`, so validate with `mongoose.isValidObjectId` and return 400.
10. Large uploads and disk growth: cleanup orphaned files, cap per-user uploads, serve eKYC with `Content-Disposition: inline` and `Cache-Control: no-store`.
11. Socket.IO behind a proxy and horizontal scaling (sticky sessions or Redis adapter): document the limitation.
12. Backward compatibility: removing duplicate routes and `?token=` can break the current client. Update the client in the same commit and grep all usages (`client/src/services/api.ts`, pages).
13. Data migration: new model fields need defaults, and a script `scripts/migrate_*.ts` for existing documents (idempotent).
14. Test isolation: each test creates its own data and cleans up. Do not depend on seed data or on order.
15. Secrets: if a secret was ever committed or shared, treat it as compromised and rotate it.

## 7. DEFINITION OF DONE (per phase and at the end)
- `npx tsc --noEmit` (server), `npx tsc -b` (client) green; `npx vitest run` green with the new tests (target: >= 60 server tests).
- No `any`, no emoji in UI, no icon fonts, no new `console.log` of sensitive data.
- Every new endpoint: zod validation, RBAC, audit entry for mutations, documented in `docs/API.md` (method, path, role, request, response, errors).
- Manual verification script: run the server, then exercise with curl or a REST client: register, login, book, pay (simulate signed IPN), check-in, check-out, cancel, chat, audit view. Paste actual outputs in the final report.
- Final report: list of files changed, issues fixed (map to the numbered items above), items intentionally deferred with the reason, and remaining risks. State clearly what was NOT verified.

## 8. EXECUTION ORDER
Phase 0 -> 1.1 -> 1.2 -> 1.3 -> 1.4 -> 1.5 -> Phase 2 -> Phase 3 -> 4.1 -> 4.5 -> 4.4 -> 4.2 -> 4.3 -> 4.6 -> 4.8 -> 4.7.
Stop and ask the human only for: secret rotation, choosing the tax/VAT rate, VNPay production credentials, and any destructive data operation.
