# Fish Caring

Web app giúp người chơi thủy sinh / nuôi cá cảnh tại nhà nhớ lịch chăm sóc nhiều bể: cho ăn, thay nước, bón phân. Người dùng tạo bể, đặt lịch chăm (hàng ngày, mỗi N ngày hoặc một lần), nhận thông báo khi đến giờ, rồi bấm "Hoàn thành" hoặc "Tạm hoãn" (tự lùi sang ngày hôm sau và nhắc lại).

Người dùng chủ yếu dùng điện thoại, nên giao diện mobile-first và thông báo qua PWA + Web Push (không làm native app trong MVP).

Full requirements live in `docs/spec.md`. Read it before starting any feature.

## Stack

- Backend (`be/`): Java 21, Spring Boot 4 (monolith), Maven, Spring Security + JWT, Spring JDBC (`JdbcClient`, không dùng JPA), Flyway, Bean Validation, Lombok
- Database: MySQL 8 (dev chạy bằng `docker-compose.yml`)
- Frontend (`fe/`): React 19 + Vite + TypeScript (strict) + Tailwind CSS + React Router + shadcn/ui
- State ở FE: Redux Toolkit (`createSlice`, `createAsyncThunk`). Gọi API bằng `axios` qua một file cấu hình và các file service (không dùng `fetch` trực tiếp). Không dùng TanStack Query
- Thông báo: PWA (service worker) + Web Push (VAPID), kèm danh sách thông báo trong app
- Test: JUnit 5 + H2 (MODE=MySQL) cho BE; Vitest + Testing Library cho FE
- Monolith: một Spring Boot app, một database. Không tách microservice

## Commands

Các lệnh dưới đây đã scaffold sẵn:

Backend (chạy trong `be/`):
- `./mvnw spring-boot:run`: chạy server (port 8080)
- `./mvnw test`: unit/integration test
- `./mvnw verify`: build + test đầy đủ

Frontend (chạy trong `fe/`):
- `npm run dev`: dev server (port 5173, proxy `/api` sang BE)
- `npm run lint`: oxlint
- `npm run typecheck`: `tsc -b`
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
      controller/         # REST controllers (thin)
      service/            # business logic, @Transactional
      repository/         # JdbcClient + SQL only
      entity/             # Lombok classes mapping DB rows (XxxEntity)
      dto/                # request/response Lombok classes, ApiError
      object/             # internal value objects (TankData, CareTaskData, ...)
      constant/           # SQL constants, one XxxSql class per table
      mapper/             # entity <-> dto conversion
      enums/              # FishStatus, TaskType, RepeatType, ...
      config/             # SecurityConfig, TimeConfig (Clock), AppProperties
      exception/          # domain exceptions, GlobalExceptionHandler
    src/main/resources/
      db/migration/       # Flyway: V1__init.sql, ...
    src/test/java/com/fishcaring/   # mirrors the main packages
  fe/                     # React app
    public/               # manifest, icons, service worker
    src/
      api/                # axiosClient.ts: the only axios config (base URL, token, error handling)
      services/           # one XxxService.ts per resource; only layer that calls axiosClient
      types/              # API request/response types
      store/              # Redux store, one slice per feature
      pages/              # route-level screens
      components/         # reusable UI
      lib/                # pure helpers (date, schedule text, ...)
```

The backend is organised by layer (not by feature) and the frontend by role. Keep the layout above unless a task requires a change.

## Language

- UI copy shown to users: Vietnamese
- Code, identifiers, comments, commit messages, PR text: English
- Docs (`docs/spec.md`): Vietnamese
- URLs and API paths stay ASCII

## Rule bắt buộc theo thư mục

Trước khi sinh hoặc sửa code, đọc file rule của thư mục đó. Các rule này là bắt buộc, vi phạm là lỗi:

- Code trong `be/`: đọc `be/CLAUDE.md` (khoá chính `BIGINT AUTO_INCREMENT`, JDBC không JPA, JWT, phân tầng, test...)
- Code trong `fe/`: đọc `fe/CLAUDE.md` (UI/UX thân thiện không rối mắt, design token, shadcn/ui, Redux slice, 3 trạng thái tải/lỗi/rỗng...)

Rule chung cho cả hai phía:

- Toàn hệ thống dùng giờ Việt Nam (UTC+7), lưu `LocalDateTime`; không có múi giờ theo user. Mọi bảng có `created_at` và `updated_at`
- Mọi truy vấn dữ liệu người dùng lọc theo user đang đăng nhập; truy cập dữ liệu người khác trả 404
- Config và secret (mật khẩu DB, `JWT_SECRET`, khoá VAPID) lấy từ biến môi trường
- Máy dev là Windows: không dùng script chỉ chạy được trên bash trong `package.json` và tài liệu
- Commit message theo Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)

## Rules

- Never commit to `main`. Work on `feature/*`, `fix/*` or `chore/*` branches. The MVP lives on `feature/mvp1`
- Do NOT commit or push on your own. Leave changes uncommitted in the working tree and list the changed files so the user can review locally first. Commit, push or open a PR only when the user asks
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
5. Changes are left uncommitted for the user to review (see Rules)

## Workflow

1. Read `docs/spec.md` and this file
2. For any non-trivial task, propose a short plan and wait for approval
3. Implement step by step, running the checks as you go
4. Run the checks above, then stop and report the changed files for review. Commit and open a PR only when the user asks

## Learned rules

Add a one-line rule here every time the AI repeats a mistake.

- (empty for now)
