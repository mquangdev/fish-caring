# Spec: Fish Caring, nhắc lịch chăm sóc bể cá

## 1. Mục tiêu

Người chơi thủy sinh thường có nhiều bể, mỗi bể nuôi loài khác nhau và có chế độ chăm khác nhau (cho ăn, thay nước, bón phân...). Rất khó nhớ hôm nay bể nào cần làm gì. Web app này cho người dùng khai báo bể, đặt lịch chăm cho từng bể, nhắc đúng giờ trên điện thoại, và ghi nhận đã làm hay hoãn sang ngày mai.

Thước đo thành công của MVP:
- Đăng ký, tạo bể đầu tiên và đặt được một lịch chăm trong dưới 2 phút
- Đến giờ, điện thoại nhận được thông báo (Android: cả khi đóng trình duyệt; iPhone: sau khi thêm vào Màn hình chính)
- Mở trang "Hôm nay" là biết ngay việc nào cần làm, bấm một lần để hoàn thành hoặc hoãn
- Bấm "Tạm hoãn" thì ngày mai nhận lại thông báo đúng giờ cũ

## 2. Đối tượng

Người nuôi cá, chơi thủy sinh tại nhà, dùng điện thoại là chính. Tối ưu cho mobile (khoảng 390px); desktop chỉ cần không vỡ giao diện. Mỗi người dùng chỉ thấy dữ liệu của mình.

## 3. Phạm vi

**Trong MVP:** đăng ký/đăng nhập, quản lý bể, quản lý lịch chăm của từng bể, trang "Hôm nay", hoàn thành/tạm hoãn việc, lịch sử chăm bể, thông báo trong app, thông báo đẩy (Web Push) qua PWA.

**Ngoài MVP (làm sau, khi thật sự cần):** quên mật khẩu / xác thực email, đăng nhập Google, ảnh bể, ghi thông số nước (pH, NH3, nhiệt độ), chia sẻ bể giữa nhiều người, email/Zalo/Telegram, app native (Capacitor), đa ngôn ngữ, thống kê/biểu đồ, thư viện loài cá, hoãn với thời gian tuỳ chọn, nhắc nhắc lại nhiều lần trong ngày.

## 4. Nghiệp vụ cốt lõi

- Một **người dùng** (User) có nhiều **bể** (Tank).
- Một bể có danh sách **cá** (TankFish: tên loài + số lượng, nhập tay) và nhiều **lịch chăm** (CareTask).
- Một lịch chăm có: loại việc, tiêu đề, ghi chú, giờ nhắc, kiểu lặp, và `nextDueAt` (thời điểm đến hạn kế tiếp, giờ Việt Nam).
- Khi `nextDueAt <= now` và lịch đang bật, hệ thống tạo đúng **một thông báo** cho lần đến hạn đó, gửi push (nếu người dùng đã bật), và hiện lịch trong trang "Hôm nay" ở nhóm "Đến giờ / Quá hạn".
- Người dùng có hai hành động trên một việc đã đến hạn:
  - **Hoàn thành**: ghi một bản ghi `CareLog` (kết quả `DONE`) và tính `nextDueAt` kế tiếp.
  - **Tạm hoãn**: ghi `CareLog` (kết quả `SNOOZED`), lùi `nextDueAt` đúng 1 ngày (giữ nguyên giờ). Đến thời điểm mới, hệ thống thông báo lại.

### 4.1 Loại việc và kiểu lặp

Loại việc (`type`): `FEED` (cho ăn), `WATER_CHANGE` (thay nước), `FERTILIZE` (bón phân), `OTHER` (việc khác, dùng tiêu đề tự đặt).

Kiểu lặp (`repeatType`):
- `DAILY`: mỗi ngày vào `timeOfDay` (HH:mm)
- `EVERY_N_DAYS`: mỗi `intervalDays` ngày (2 đến 60) vào `timeOfDay`. Ngày bắt đầu do người dùng chọn khi tạo
- `ONCE`: một lần vào ngày giờ cụ thể; sau khi hoàn thành thì tự tắt

Ví dụ: "Cho ăn 8:00 mỗi ngày", "Thay 30% nước 19:00 mỗi 7 ngày", "Bón phân nền 20:00 mỗi 3 ngày", "Bón thử thuốc 25/11 21:00 một lần".

### 4.2 Quy tắc tính lịch (hàm thuần, có unit test)

Toàn hệ thống dùng một múi giờ duy nhất là giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7, không có giờ mùa hè). Mọi thời điểm lưu và tính bằng `LocalDateTime` theo giờ này, không có múi giờ riêng theo người dùng.

- Tạo lịch `DAILY`/`EVERY_N_DAYS`: `nextDueAt` là lần đầu tiên `timeOfDay` xảy ra từ `startDate` trở đi mà còn ở tương lai (nếu hôm nay đã qua giờ thì ngày mai).
- **Hoàn thành**: lấy `base = max(now, nextDueAt)` rồi lấy ngày của `base` (giờ Việt Nam). `DAILY`: ngày kế tiếp = ngày đó + 1. `EVERY_N_DAYS`: ngày đó + `intervalDays`. Ghép với `timeOfDay`. `ONCE`: tắt lịch (`enabled = false`). Nghĩa là hoàn thành trễ không làm dồn lịch, hoàn thành sớm không bị nhắc lại trong cùng ngày.
- **Tạm hoãn**: `nextDueAt = nextDueAt + 1 ngày` (cộng đúng 1 ngày lịch, giữ nguyên giờ). Nếu việc đã quá hạn nhiều ngày, hoãn vẫn chỉ cộng 1 ngày từ `nextDueAt` hiện tại; nếu kết quả vẫn ở quá khứ thì dùng cùng giờ của ngày mai tính từ `now`.
- Tạm hoãn không đổi lịch lặp: lần đến hạn sau của lịch được tính lại từ lúc hoàn thành như trên.
- Sửa `timeOfDay`, kiểu lặp hoặc ngày bắt đầu thì tính lại `nextDueAt` như khi tạo mới.
- Tắt lịch (`enabled = false`): không tạo thông báo; bật lại thì tính lại `nextDueAt` như khi tạo mới.

### 4.3 Quy tắc biên

- Mỗi (`taskId`, `dueAt`) chỉ có một thông báo (không tạo trùng khi scheduler chạy lại).
- Việc quá hạn nhiều ngày không sinh nhiều thông báo; mỗi lịch chỉ có tối đa một thông báo chưa xử lý.
- Hoàn thành hoặc hoãn một việc thì thông báo tương ứng chuyển sang trạng thái đã xử lý (`resolved`).
- Xoá bể thì xoá luôn cá, lịch, thông báo và nhật ký chăm của bể đó. Xoá bể cần hộp thoại xác nhận.
- Xoá lịch cần xác nhận; nhật ký đã ghi của lịch đó vẫn giữ theo bể, hiển thị theo tiêu đề đã lưu lúc ghi.
- Tên bể không rỗng, tối đa 100 ký tự, không trùng (không phân biệt hoa thường) trong cùng một người dùng. Việc kiểm tra làm ở service bằng `LOWER(name)`, không có ràng buộc unique ở DB. Trên MySQL (`utf8mb4_unicode_ci`) phép so sánh cũng không phân biệt dấu, nên "Bể" và "Be" bị coi là trùng.
- Thể tích bể (lít) là số nguyên dương, có thể để trống.
- Mỗi bể tối đa 20 lịch chăm, mỗi người dùng tối đa 30 bể (chặn lạm dụng, có thể chỉnh sau).
- Người dùng không bao giờ truy cập được dữ liệu của người khác; truy cập sai id trả 404.

## 5. Màn hình (mobile-first)

### 5.0 Routes (FE)

`/login`, `/register`, `/` (Hôm nay), `/tanks` (danh sách bể), `/tanks/new`, `/tanks/:id` (chi tiết bể), `/tanks/:id/edit`, `/tanks/:id/tasks/new`, `/tanks/:id/tasks/:taskId/edit`, `/notifications`, `/settings`. Các route ngoài `/login` và `/register` cần đăng nhập. Có trang 404 tiếng Việt.

Điều hướng dưới đáy màn hình (mobile): Hôm nay, Bể của tôi, Thông báo (có chấm số chưa đọc), Cài đặt.

### 5.1 Đăng ký / Đăng nhập
- Đăng ký: tên hiển thị, email, mật khẩu (tối thiểu 8 ký tự). Thành công thì đăng nhập luôn
- Đăng nhập: email + mật khẩu; báo lỗi chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại). API trả `401` với `code = INVALID_CREDENTIALS` cho cả email lạ lẫn sai mật khẩu
- Email được chuẩn hoá (cắt khoảng trắng, chữ thường); mật khẩu 8 đến 72 ký tự; tên hiển thị 1 đến 100 ký tự
- Thông điệp API bằng tiếng Anh kèm `code`; FE hiển thị tiếng Việt theo `code`
- Đăng xuất ở trang Cài đặt

### 5.2 Hôm nay `/`
- Nhóm "Đến giờ / Quá hạn": mỗi việc một thẻ gồm tên bể, loại việc, tiêu đề, ghi chú, giờ hẹn; hai nút lớn "Hoàn thành" và "Hoãn đến mai"
- Nhóm "Sắp tới hôm nay": các việc còn lại trong ngày, chỉ xem
- Trạng thái rỗng thân thiện ("Hôm nay không có việc gì, nghỉ ngơi thôi")
- Banner mời bật thông báo nếu chưa bật (xem mục 7)

### 5.3 Danh sách bể `/tanks` và chi tiết bể `/tanks/:id`
- Danh sách: thẻ bể (tên, thể tích, số lịch, việc kế tiếp), nút nổi "Thêm bể"
- Form bể: tên, thể tích (lít), loại bể (`PLANTED` thủy sinh, `FISH_ONLY` cá cảnh, `OTHER`), ngày setup, ghi chú, danh sách cá (tên loài + số lượng + trạng thái còn sống/đã chết, thêm/xoá nhanh; đàn cá chết một phần thì tách thành hai dòng)
- Chi tiết bể: thông tin bể, danh sách lịch chăm (bật/tắt nhanh, sửa, xoá, hiển thị "Mỗi ngày 08:00" / "Mỗi 7 ngày 19:00" / "Một lần 25/11 21:00" và lần đến hạn kế tiếp), nút "Thêm lịch chăm", lịch sử chăm gần đây (50 mục, mới nhất trước)

### 5.4 Form lịch chăm
- Loại việc (chọn), tiêu đề (mặc định theo loại, ví dụ "Cho ăn"), ghi chú (ví dụ "Thay 30% nước"), kiểu lặp, giờ nhắc, số ngày (khi `EVERY_N_DAYS`), ngày bắt đầu hoặc ngày giờ (khi `ONCE`)
- Xem trước dòng "Lần nhắc đầu tiên: ..." theo giờ Việt Nam

### 5.5 Thông báo `/notifications`
- Danh sách thông báo mới nhất trước: nội dung ("Bể Mini 30L: đến giờ cho ăn"), thời gian, trạng thái chưa đọc/đã đọc/đã xử lý
- Bấm vào thông báo mở trang "Hôm nay"; có nút "Đánh dấu đã đọc tất cả"
- FE gọi lại danh sách và số chưa đọc mỗi 60 giây khi tab đang mở (thunk polling)

### 5.6 Cài đặt `/settings`
- Tên hiển thị, bật/tắt thông báo đẩy trên thiết bị này, đăng xuất

### 5.7 Thành phần dùng chung
- Chế độ sáng/tối theo hệ thống
- Chữ lớn, vùng chạm tối thiểu 44px
- Mọi chuỗi giao diện bằng tiếng Việt; mọi danh sách có trạng thái rỗng, đang tải và lỗi
- Xoá bể / lịch cần hộp thoại xác nhận

## 6. Mô hình dữ liệu

Bảng MySQL, tạo bằng Flyway (`V1__init.sql`). Khoá chính `BIGINT AUTO_INCREMENT` (id số), thời gian kiểu `DATETIME(3)` lưu giờ Việt Nam (UTC+7). **Mọi bảng đều có hai cột `created_at` và `updated_at` (NOT NULL)**, do ứng dụng ghi (không dùng giá trị mặc định của DB); mô tả dưới đây không nhắc lại hai cột này.

```
users
  id, email (unique, lowercase), password_hash, display_name

tanks
  id, user_id (FK), name, volume_liters (nullable), type ('PLANTED'|'FISH_ONLY'|'OTHER'),
  setup_date (nullable), note (nullable)
  index (user_id, name)   -- tên bể không trùng trong một user: kiểm tra ở service, không ràng buộc ở DB

tank_fish
  id, tank_id (FK), species_name, quantity (int >= 1),
  status (TINYINT: 1 = còn sống, 0 = đã chết)

care_tasks
  id, tank_id (FK), type ('FEED'|'WATER_CHANGE'|'FERTILIZE'|'OTHER'),
  title, note (nullable),
  repeat_type ('DAILY'|'EVERY_N_DAYS'|'ONCE'),
  interval_days (nullable), time_of_day (TIME), start_date (nullable, DATE),
  enabled, next_due_at (nullable)
  index (enabled, next_due_at)

care_logs
  id, tank_id (FK), task_id (nullable, SET NULL khi xoá lịch), task_title,
  result ('DONE'|'SNOOZED'), due_at, acted_at

notifications
  id, user_id (FK), task_id (FK, cascade), due_at, message,
  status ('UNREAD'|'READ'|'RESOLVED')
  unique (task_id, due_at)

push_subscriptions
  id, user_id (FK), endpoint (unique), p256dh, auth, user_agent
```

Enum và hàm thuần ở BE: `RepeatType`, `TaskType`; lớp `ScheduleCalculator` với `firstDue(...)`, `nextAfterComplete(...)`, `snooze(...)` (có unit test, xem mục 10).

## 7. Thông báo đẩy (Web Push)

- Ứng dụng là PWA: `manifest` + service worker, cài được lên Màn hình chính
- BE tạo cặp khoá VAPID đọc từ biến môi trường (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); FE lấy public key qua `GET /api/push/public-key`
- Người dùng bấm "Bật thông báo" thì FE xin quyền, đăng ký `PushManager.subscribe`, gửi subscription lên `POST /api/push/subscribe`; tắt thì `DELETE /api/push/subscribe`
- Scheduler của BE chạy mỗi phút: tìm lịch `enabled` có `next_due_at <= now` chưa có thông báo cho lần đó, tạo `notifications`, rồi gửi push tới mọi subscription của người dùng. Push lỗi `404/410` thì xoá subscription
- Service worker nhận `push` và hiện thông báo; bấm vào thì mở `/` (Hôm nay)
- Hỗ trợ nền tảng:
  - Android (Chrome, Edge, Firefox): nhận push kể cả khi đóng trình duyệt, không bắt buộc cài PWA
  - iPhone/iPad (iOS/iPadOS 16.4 trở lên): chỉ nhận push khi web app đã được "Thêm vào Màn hình chính" (Safari -> Chia sẻ -> Thêm vào Màn hình chính); mở bằng tab Safari thường không bật được. Dưới 16.4 không hỗ trợ
  - Máy tính: các trình duyệt chính đều nhận
- FE phát hiện iOS chưa cài PWA thì hiện hướng dẫn tiếng Việt từng bước thay cho nút "Bật thông báo"; trình duyệt không hỗ trợ thì ẩn nút và chỉ dùng thông báo trong app
- Yêu cầu HTTPS khi triển khai thật (localhost dùng được khi dev)

## 8. API (REST, JSON, prefix `/api`)

Xác thực: header `Authorization: Bearer <JWT>` (HS256, claim `sub` = id user). JWT hết hạn sau 7 ngày (`JWT_EXPIRES_DAYS`), chưa có refresh token ở MVP. `JWT_SECRET` bắt buộc, tối thiểu 32 ký tự, không có giá trị mặc định. Thiếu hoặc sai token trả `401` với `code = UNAUTHORIZED`. `register` trả `201`, `login` trả `200`. Lỗi trả về dạng `{ "code": "...", "message": "...", "fieldErrors": { ... } }`.

```
POST   /api/auth/register          { email, password, displayName } -> { token, user }
POST   /api/auth/login             { email, password } -> { token, user }
GET    /api/me                     -> user
PATCH  /api/me                     { displayName? } -> user

GET    /api/tanks                  -> [tank + taskCount + nextDueAt]
POST   /api/tanks                  -> tank
GET    /api/tanks/{id}             -> tank + fish + tasks
PUT    /api/tanks/{id}             -> tank (gồm danh sách cá)
DELETE /api/tanks/{id}

GET    /api/tanks/{id}/tasks       -> [task]
POST   /api/tanks/{id}/tasks       -> task
PUT    /api/tasks/{taskId}         -> task
PATCH  /api/tasks/{taskId}/enabled { enabled } -> task
DELETE /api/tasks/{taskId}
POST   /api/tasks/{taskId}/complete -> task (đã có nextDueAt mới)
POST   /api/tasks/{taskId}/snooze   -> task (đã lùi 1 ngày)
GET    /api/tanks/{id}/logs?limit=50 -> [careLog]

GET    /api/today                  -> { due: [item], upcoming: [item] }
GET    /api/notifications?limit=50 -> [notification]
GET    /api/notifications/unread-count -> { count }
POST   /api/notifications/read-all

GET    /api/push/public-key        -> { publicKey }
POST   /api/push/subscribe         { endpoint, keys: { p256dh, auth } }
DELETE /api/push/subscribe         { endpoint }
```

Mã trạng thái: 400 (validation), 401 (chưa đăng nhập/token sai), 404 (không thấy hoặc không thuộc user), 409 (email đã tồn tại).

## 9. Bảo mật và phi chức năng

- Mật khẩu băm BCrypt; JWT ký HS256 bằng `JWT_SECRET` (từ biến môi trường, tối thiểu 32 ký tự); CORS chỉ cho origin của FE
- Mọi truy vấn dữ liệu luôn lọc theo user đang đăng nhập
- Không ghi log mật khẩu, token, khoá push
- Giới hạn tốc độ đăng nhập/đăng ký cơ bản là việc làm sau; ghi chú lại khi triển khai public
- Tải nhanh trên mạng di động; service worker chỉ cache tài nguyên tĩnh, không cache API
- Truy cập cơ bản: nhãn cho nút icon, tương phản đủ ở cả sáng và tối
- Không tracking bên thứ ba

## 10. Test case nghiệp vụ

`ScheduleCalculator` (unit test thuần, dùng `Clock` cố định theo giờ Việt Nam):
1. Tạo `DAILY` 08:00 lúc 07:00 -> hôm nay 08:00; lúc 09:00 -> ngày mai 08:00
2. Hoàn thành `DAILY` đúng giờ -> ngày mai cùng giờ
3. Hoàn thành `DAILY` trễ 3 ngày -> ngày mai (tính từ `now`), không dồn lịch
4. Hoàn thành `EVERY_N_DAYS` n=7 -> +7 ngày kể từ ngày hoàn thành
5. Hoàn thành `ONCE` -> `enabled = false`
6. Hoãn: `nextDueAt` +1 ngày, giữ nguyên giờ; hoãn khi đã quá hạn nhiều ngày vẫn ra một mốc ở tương lai
7. Hoãn không làm đổi `repeatType`/`timeOfDay`

Service/controller:
8. Scheduler chạy hai lần liên tiếp chỉ tạo một thông báo cho mỗi (task, dueAt)
9. Lịch bị tắt không sinh thông báo
10. Hoàn thành/hoãn chuyển thông báo sang `RESOLVED`
11. User A gọi id tank/task/notification của user B nhận 404
12. Đăng ký trùng email nhận 409; đăng nhập sai nhận 401 với thông báo chung
13. Tên bể trùng (khác hoa thường) bị từ chối

## 11. Milestone MVP1 (nhánh `feature/mvp1`)

Mỗi milestone là một nhóm commit nhỏ, mỗi commit một mối quan tâm. Milestone chỉ được coi là xong khi đạt đủ "Tiêu chí hoàn thành" và qua Definition of done trong `CLAUDE.md`. Làm tuần tự: milestone sau dựa vào milestone trước. Mỗi milestone có thể demo được trên máy dev.

Trạng thái: `[x]` xong, `[ ]` chưa làm.

### [x] M0. Khởi tạo tài liệu và cấu trúc
- Phạm vi: `CLAUDE.md`, `docs/spec.md`, thư mục `be/` và `fe/`, `.gitignore`, `.env.example`, `docker-compose.yml`, README
- Tiêu chí hoàn thành: đã commit và mở PR #1

### [x] M1. Scaffold BE và FE
- Phạm vi: Spring Boot 4 (Java 21, Maven, Spring JDBC, Flyway, Security, Validation, MySQL); Vite + React 19 + TypeScript + Tailwind + Redux Toolkit + React Router + Vitest
- Tiêu chí hoàn thành: `./mvnw verify` pass; `npm run lint`, `typecheck`, `test`, `build` pass; FE hiện trang chủ và 404

### [x] M2. Cơ sở dữ liệu và nền tảng BE
- Phạm vi: Flyway `V1__init.sql` tạo đủ bảng ở mục 6; entity và repository JDBC (`JdbcClient`); `@RestControllerAdvice` với một dạng lỗi chung (mục 8); cấu hình CORS; kết nối MySQL thật qua `docker compose`
- Tiêu chí hoàn thành: `docker compose up -d` rồi chạy BE thì Flyway tự tạo bảng; `GET /actuator/health` trả `UP`; test repository (chạy SQL thật trên H2) pass
- Không gồm: bất kỳ API nghiệp vụ nào

### [x] M3. Đăng ký, đăng nhập
- Phạm vi BE: `POST /api/auth/register`, `POST /api/auth/login`, `GET/PATCH /api/me`; BCrypt, JWT filter, mọi route còn lại yêu cầu đăng nhập
- Phạm vi FE: trang `/login`, `/register`, slice `auth`, API client gắn JWT, 401 thì về `/login`, route bảo vệ, đăng xuất ở `/settings`, khung điều hướng đáy màn hình
- Tiêu chí hoàn thành: đăng ký rồi đăng nhập được trên trình duyệt, tải lại trang vẫn giữ phiên, gọi API không token nhận 401; test mục 10 số 12 pass

### [ ] M4. Quản lý bể
- Phạm vi BE: CRUD `/api/tanks` (gồm danh sách cá), quy tắc tên bể và giới hạn số bể (mục 4.3), mọi truy vấn lọc theo user
- Phạm vi FE: `/tanks`, `/tanks/new`, `/tanks/:id`, `/tanks/:id/edit`, slice `tanks`, hộp thoại xác nhận xoá, trạng thái rỗng/tải/lỗi
- Tiêu chí hoàn thành: tạo, sửa, xoá bể và cá trong bể trên điện thoại (390px); user A không truy cập được bể của user B (404); test mục 10 số 11 và 13 pass

### [ ] M5. Lịch chăm và `ScheduleCalculator`
- Phạm vi BE: lớp thuần `ScheduleCalculator` (`firstDue`, `nextAfterComplete`, `snooze`) theo mục 4.2; CRUD `/api/tanks/{id}/tasks`, `/api/tasks/{id}`, bật/tắt, giới hạn 20 lịch mỗi bể
- Phạm vi FE: danh sách lịch trong chi tiết bể, form lịch chăm (mục 5.4) với dòng xem trước "Lần nhắc đầu tiên", bật/tắt nhanh, slice `tasks`
- Tiêu chí hoàn thành: tạo được ba kiểu lặp `DAILY`, `EVERY_N_DAYS`, `ONCE` và `nextDueAt` đúng theo giờ Việt Nam; test mục 10 số 1 đến 7 pass (đây là phần quan trọng nhất cần test kỹ)

### [ ] M6. Hoàn thành, tạm hoãn, trang Hôm nay, lịch sử
- Phạm vi BE: `POST /api/tasks/{id}/complete`, `POST /api/tasks/{id}/snooze`, ghi `CareLog`, `GET /api/today`, `GET /api/tanks/{id}/logs`
- Phạm vi FE: trang `/` (Hôm nay) với nhóm "Đến giờ / Quá hạn" và "Sắp tới", nút "Hoàn thành" và "Hoãn đến mai", lịch sử chăm trong chi tiết bể
- Tiêu chí hoàn thành: bấm Hoàn thành thì `nextDueAt` chuyển sang lần kế tiếp đúng quy tắc, bấm Hoãn thì lùi đúng 1 ngày giữ giờ, mỗi hành động có một dòng nhật ký; việc `ONCE` hoàn thành thì tự tắt

### [ ] M7. Thông báo trong app
- Phạm vi BE: scheduler `@Scheduled` mỗi phút tạo `notifications` cho lịch đến hạn (không trùng theo `task_id` + `due_at`, lịch tắt không sinh), `GET /api/notifications`, `unread-count`, `read-all`; hoàn thành/hoãn chuyển thông báo sang `RESOLVED`
- Phạm vi FE: trang `/notifications`, chuông/chấm số chưa đọc ở thanh điều hướng, polling 60 giây khi tab mở, slice `notifications`
- Tiêu chí hoàn thành: tạo lịch đến hạn sau 1 phút thì đúng 1 thông báo xuất hiện trong app; hoãn thì ngày mai thông báo mới xuất hiện lúc cùng giờ; test mục 10 số 8 đến 10 pass

### [ ] M8. PWA và Web Push
- Phạm vi BE: sinh/đọc khoá VAPID từ biến môi trường, `GET /api/push/public-key`, `POST/DELETE /api/push/subscribe`, gửi push khi tạo thông báo, xoá subscription khi push trả 404/410
- Phạm vi FE: `manifest`, icon, service worker (`push`, `notificationclick` mở `/`), nút "Bật/Tắt thông báo" ở `/settings` và banner ở Hôm nay, hướng dẫn cài vào Màn hình chính cho iOS, ẩn nút khi trình duyệt không hỗ trợ
- Tiêu chí hoàn thành: trên Chrome (desktop hoặc Android) nhận được push khi đến giờ kể cả đóng tab; bấm thông báo mở trang Hôm nay. iOS chỉ kiểm thử được khi có HTTPS và đã cài PWA (kiểm thử iOS có thể làm sau khi triển khai)

### [ ] M9. Hoàn thiện và phát hành bản thử
- Phạm vi: rà mobile 390px và chế độ sáng/tối, trạng thái rỗng/tải/lỗi mọi màn hình, trang 404, README hướng dẫn chạy từ đầu, GitHub Actions CI (BE `verify`, FE lint/typecheck/test/build), rà bảo mật mục 9
- Tiêu chí hoàn thành: người mới clone repo chạy được toàn bộ theo README; CI xanh; đi hết luồng của mục 1 (đăng ký, tạo bể, đặt lịch, nhận thông báo, hoàn thành/hoãn) không lỗi; không còn lỗi console; PR `feature/mvp1` sẵn sàng merge vào `main`

### Thứ tự và phụ thuộc

`M2 -> M3 -> M4 -> M5 -> M6 -> M7 -> M8 -> M9`. Có thể bỏ M8 ra bản sau nếu cần ra mắt sớm, vì M7 đã đủ để dùng được (người dùng phải mở app để thấy thông báo); khi đó lời hứa "nhận thông báo trên điện thoại" của mục 1 chưa đạt.

## 12. Quyết định đã chốt

- **Kiến trúc:** monolith Spring Boot + MySQL; FE React tách riêng trong `fe/`, giao tiếp qua REST
- **Truy cập DB:** không dùng JPA; dùng Spring `JdbcClient` với SQL viết tay, khoá chính `BIGINT AUTO_INCREMENT`
- **UI FE:** shadcn/ui trên Tailwind, quy chuẩn UI/UX chi tiết ở `fe/CLAUDE.md`; quy chuẩn BE ở `be/CLAUDE.md`
- **Auth:** email + mật khẩu, JWT, chưa có quên mật khẩu/OAuth
- **State FE:** Redux Toolkit (không dùng TanStack Query)
- **Thông báo:** PWA + Web Push và danh sách thông báo trong app; chưa làm native app/email
- **Hoãn:** MVP chỉ có một mức "hoãn đến mai" (+1 ngày, giữ giờ)
- **Lịch:** chỉ có `DAILY`, `EVERY_N_DAYS`, `ONCE`; chưa có lịch theo thứ trong tuần hay nhiều mốc giờ trong ngày
- **Dữ liệu cá:** nhập tay (tên + số lượng), chưa có thư viện loài
- **Múi giờ:** toàn hệ thống dùng giờ Việt Nam (UTC+7) cố định, lưu `LocalDateTime`; không có múi giờ theo người dùng
