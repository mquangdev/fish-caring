# Fish Caring

Web app giúp người chơi thủy sinh / nuôi cá cảnh tại nhà nhớ lịch chăm sóc nhiều bể: cho ăn, thay nước, bón phân. Người dùng tạo bể, đặt lịch chăm (hàng ngày, mỗi N ngày hoặc một lần), nhận thông báo khi đến giờ, rồi bấm "Hoàn thành" hoặc "Tạm hoãn" (tự lùi sang ngày hôm sau và nhắc lại).

Người dùng chủ yếu dùng điện thoại, nên giao diện mobile-first và thông báo qua PWA + Web Push (không làm native app trong MVP).

Full requirements live in `docs/spec.md`. Read it before starting any feature.

## Stack

- Backend (`be/`): Java 21, Spring Boot 3 (monolith), Maven, Spring Security + JWT, Spring Data JPA, Flyway, Bean Validation
- Database: MySQL 8 (dev chạy bằng `docker-compose.yml`)
- Frontend (`fe/`): React 18 + Vite + TypeScript (strict) + Tailwind CSS + React Router
- State và gọi API ở FE: Redux Toolkit (`createSlice`, `createAsyncThunk`). Không dùng TanStack Query
- Thông báo: PWA (service worker) + Web Push (VAPID), kèm danh sách thông báo trong app
- Test: JUnit 5 (+ Testcontainers hoặc H2) cho BE; Vitest + Testing Library cho FE
- Monolith: một Spring Boot app, một database. Không tách microservice

## Commands

Chưa scaffold ở bước khởi tạo. Sau khi scaffold, các lệnh dự kiến:

Backend (chạy trong `be/`):
- `./mvnw spring-boot:run`: chạy server (port 8080)
- `./mvnw test`: unit/integration test
- `./mvnw verify`: build + test đầy đủ

Frontend (chạy trong `fe/`):
- `npm run dev`: dev server (port 5173, proxy `/api` sang BE)
- `npm run lint`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm test`: Vitest
- `npm run build`: production build

Hạ tầng dev: `docker compose up -d` (MySQL) ở thư mục gốc.

## Project layout

```
fish-caring/
  CLAUDE.md
  docs/spec.md            # requirements, API, data model
  docker-compose.yml      # MySQL for local dev
  .env.example            # variable names only
  be/                     # Spring Boot monolith
    src/main/java/com/fishcaring/
      auth/               # register, login, JWT
      tank/               # tanks and fish in tanks
      caretask/           # care schedules, complete/snooze, care logs
      notification/       # notifications, scheduler, web push
      common/             # config, exception handling, shared utils
    src/main/resources/
      db/migration/       # Flyway: V1__init.sql, ...
    src/test/java/com/fishcaring/
  fe/                     # React app
    public/               # manifest, icons, service worker
    src/
      api/                # HTTP client + endpoint functions
      store/              # Redux store, one slice per feature
      pages/              # route-level screens
      components/         # reusable UI
      lib/                # pure helpers (date, schedule text, ...)
```

Package/feature-first on the backend: each feature folder has its own controller, service, repository, entity and dto. Keep the layout above unless a task requires a change.

## Language

- UI copy shown to users: Vietnamese
- Code, identifiers, comments, commit messages, PR text: English
- Docs (`docs/spec.md`): Vietnamese
- URLs and API paths stay ASCII

## Conventions

Backend:
- Layering: controller (thin) -> service (business logic) -> repository. Never return JPA entities from controllers; use DTOs
- Validate input with Bean Validation; return one consistent error body from a global `@RestControllerAdvice`
- Every query on user data is scoped by the authenticated user. A user must never read or change another user's tank/task/notification (return 404, not 403)
- Store all timestamps as UTC `Instant`; each user has a `timezone` (default `Asia/Ho_Chi_Minh`) used only when computing "daily at HH:mm" and "today"
- Schedule maths (next due after complete, snooze) are pure functions in one class with unit tests; services and the scheduler never compute dates inline
- Schema changes only through Flyway migrations. Never edit an applied migration; add a new one. `spring.jpa.hibernate.ddl-auto` stays `validate`
- Passwords hashed with BCrypt; never log passwords, tokens or push keys
- Config and secrets (DB password, JWT secret, VAPID keys) come from environment variables

Frontend:
- Mobile-first: design for ~390px width, touch targets at least 44px, no hover-only interactions; must not break on desktop
- Support light and dark mode (follow `prefers-color-scheme`, manual toggle optional)
- Server data lives in Redux slices fetched with `createAsyncThunk`; components select state, they do not call `fetch`/axios directly. Each slice tracks `status` (`idle | loading | succeeded | failed`) and `error`
- Use typed hooks (`useAppDispatch`, `useAppSelector`); no `any`
- JWT is attached by the API client in `src/api/`; a 401 clears auth state and redirects to login
- Dates are shown in the user's timezone in Vietnamese format (`dd/MM/yyyy HH:mm`); never show raw ISO strings
- Every list needs a friendly empty state, every async action a loading and error state

General:
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- Development machine is Windows: avoid bash-only scripts in `package.json` and docs commands

## Rules

- Never commit to `main`. Work on `feature/*`, `fix/*` or `chore/*` branches and open a PR. The MVP lives on `feature/mvp1`
- One commit/PR = one concern. Keep diffs small and reviewable
- Do not add dependencies without asking first
- Do not invent business rules: if `docs/spec.md` is silent (e.g. what happens when a task is overdue for several days), ask or leave a clear TODO in the spec
- Never commit secrets or `.env*` files; keep `.env.example` with variable names only
- Do not change the folder structure or tooling config unless the task requires it
- Ask before deleting files or running destructive commands (including dropping database tables)
- Do not build features outside the MVP scope listed in `docs/spec.md`

## Definition of done

Before saying a task is finished:

1. Backend: `./mvnw verify` passes. Frontend: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass
2. New business logic has unit tests (especially schedule maths, snooze, and data isolation between users)
3. The screen works at mobile width (390px), does not break on desktop, and looks right in light and dark mode
4. No console errors, no unhandled API errors shown as raw text
5. Changes are committed on the feature branch with a clear message

## Workflow

1. Read `docs/spec.md` and this file
2. For any non-trivial task, propose a short plan and wait for approval
3. Implement step by step, committing after each working step
4. Run the checks above, then open a PR describing what changed and how to verify it

## Learned rules

Add a one-line rule here every time the AI repeats a mistake.

- (empty for now)
