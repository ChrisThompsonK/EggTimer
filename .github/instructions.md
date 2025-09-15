# EggTimer Project Instructions

**Note:** All source files in this project must be written in TypeScript (`.ts`). Do not use JavaScript (`.js`) files for implementation or tests. Type safety and type annotations are required throughout the codebase.

## 1. Project Overview
EggTimer is a Node.js timer service and CLI for starting, pausing, resuming, and canceling named timers with millisecond accuracy.

**Features:**
- CLI: `eggtimer start 10m --name="tea"` etc.
- Local HTTP API: `POST /timers`, `GET /timers/:id`, `DELETE /timers/:id`
- Optional WebSocket push: `ws://…/events` for tick/complete events
- Persistence: file or SQLite; timers survive process restarts
- Clean shutdown: atomic persistence and final event emission

## 2. Goals
- **Accuracy:** ≤50ms drift over minutes; mitigate event-loop delays
- **Resilience:** survive restarts; idempotent API; no duplicate end events
- **Clarity:** small, well-named modules; strong typing (TypeScript or JSDoc)
- **Testability:** deterministic timer tests; no real sleeps in CI
- **Developer Experience:** predictable commands, consistent style, helpful errors/logs

## 3. Non-Goals / Guardrails
- No external job queues (Bull, Agenda) unless requested
- No cron syntax for v1 (may add later under `/schedules`)
- No desktop UI; CLI + HTTP + optional WS only
- Minimal production dependencies; prefer stdlib + one small DB layer

## 4. Tech Baseline
- **Runtime:** Node 20+
- **Timers:** `node:timers/promises`, `AbortController`
- **Perf/Clock:** `performance.now()`, store `startEpochMs`, `durationMs`, compute `remainingMs` from monotonic deltas
- **Signals:** Handle `SIGINT`/`SIGTERM` for graceful shutdown
- **Persistence:** SQLite (`better-sqlite3`) or JSON file (pluggable)
- **API:** Fastify (preferred) with Zod validation
- **Logging:** pino
- **Testing:** Vitest + `vi.useFakeTimers()`, supertest for HTTP
- **Lint/Format:** ESLint + Prettier; `.editorconfig` present

## 5. Folder Structure
```
/src
  /cli/        # yargs or commander commands
  /api/        # fastify plugins: timers, health
  /core/       # Timer, TimerStore, Scheduler abstractions
  /infra/      # sqlite adapter, file adapter, logger
  /ws/         # websocket event broadcaster
  index.ts     # app bootstrap
/tests
  /unit /api /e2e
```

## 6. Core Abstractions
- **Timer (POJO):** `{ id, name, durationMs, startMonotonicMs, paused, remainingMs, createdAt, status }`
- **TimerStore interface:** `get(id)`, `put(timer)`, `delete(id)`, `list()`, transactions/atomic write
- **Scheduler interface:** `schedule(id, dueInMs, cb, signal)`, `cancel(id)`
- **EventBus interface:** `emit(event)`, `subscribe(type, handler)`

## 7. Implementation Rules
- **Drift control:** Never chain `setTimeout` in a loop; always schedule next absolute due based on monotonic time
- **Pause/Resume:** Store `remainingMs` on pause; on resume, set new absolute due from `performance.now() + remainingMs`
- **Persistence:** Write after any state change; on startup, rehydrate timers and reschedule
- **Idempotency:** Completing an already completed/canceled timer is a no-op
- **Validation:** All API and CLI inputs validated (Zod schemas shared)
- **Errors:** Return typed errors with helpful messages; never throw raw DB errors to clients
- **Tests first:** Add tests (unit + API) with fake timers for new features
- **Docs:** Update README and `OPENAPI.md` on any API change
- **Telemetry hooks:** Expose `onTimerCreated`, `onTimerCompleted`, etc.

## 8. Coding Style
- Prefer pure functions in `/core`; keep side effects in `/infra`
- Use dependency injection for stores/scheduler/eventbus
- Small files (<200 lines) and functions (<40 lines)
- JSDoc or TypeScript types on all public functions
- Commit messages: Conventional Commits (e.g., `feat(core): pause/resume timers`)

## 9. HTTP API Shape
- `POST /timers` `{ name?, duration: "10m" | 600000 | {ms:number} }` → `201 {id}`
- `GET /timers/:id` → `{ ...timer, remainingMs }`
- `POST /timers/:id/pause` → `200`
- `POST /timers/:id/resume` → `200`
- `DELETE /timers/:id` (cancel) → `204`
- `GET /health` → `{ ok: true }`
- Validation errors: `400` with details; not found: `404`

## 10. CLI Shape
- `eggtimer start 2m --name tea`
- `eggtimer list`
- `eggtimer pause <id>`
- `eggtimer resume <id>`
- `eggtimer cancel <id>`

## 11. Testing Checklist
- Create/complete path with fake timers (advance by duration)
- Pause/resume preserves accuracy within 20ms across cycles
- Restart recovery: persist then reschedule correctly on boot
- API schemas reject invalid durations; property-based test for duration parser
- WS emits created, ticked (optional), completed, canceled exactly once

## 12. Performance & Correctness
- Use `performance.now()` for elapsed; avoid `Date.now()` for drift math
- Clamp negative remaining to zero on completion
- Backpressure: queue callbacks with `setImmediate` if many timers complete at once
- Don’t use `setInterval` for ticks; it drifts
- Cancel timeouts with `AbortController` to avoid leaks

## 13. Security & Ops
- Input length limits (name max 64)
- Rate-limit create/cancel endpoints (Fastify rate-limit plugin)
- Graceful shutdown: stop accepting new connections, persist, cancel scheduled tasks, flush logs
- Config via env: `EGGTIMER_DB_URL`, `EGGTIMER_PORT`, `EGGTIMER_WS_ENABLED`

## 14. Copilot Prompts (Seed Tasks)
- Implement pause/resume
- Add SQLite store
- HTTP validation
- WebSocket broadcast

## 15. Acceptance Criteria (for PRs)
- ✅ Unit + API tests passing; coverage for new branches
- ✅ No unhandled promise rejections; clean shutdown verified in test
- ✅ No TODOs left in new code; docs updated
- ✅ `pnpm build && pnpm start` runs without warnings
- ✅ Lint clean; types clean

## 16. Quick Scaffolding Snippets
**.editorconfig**
```editorconfig
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
```

**.eslintrc.json**
```json
{
  "env": { "es2023": true, "node": true },
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": { "no-console": "off" }
}
```

**Timer Math (Drift-Safe)**
```ts
const now = performance.now();
const dueMono = startMonotonicMs + durationMs;
const remainingMs = Math.max(0, dueMono - now);
```

**Scheduler Using AbortController**
```ts
import { setTimeout as sleep } from 'node:timers/promises';
export async function scheduleOnce(id: string, dueInMs: number, cb: () => Promise<void>|void, signal: AbortSignal) {
  try { await sleep(dueInMs, undefined, { signal }); await cb(); }
  catch (e: any) { if (e?.name !== 'AbortError') throw e; }
}
```

## 17. Using This File
- Keep this file named `COPILOT_INSTRUCTIONS.md` (or `docs/COPILOT.md`)
- Reference from `CONTRIBUTING.md` and README’s “For AI tools” section
- Paste Acceptance Criteria into PR descriptions for alignment
