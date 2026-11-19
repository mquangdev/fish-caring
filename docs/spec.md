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
- Một lịch chăm có: loại việc, tiêu đề, ghi chú, giờ nhắc, kiểu lặp, và `nextDueAt` (thời điểm đến hạn kế tiếp, UTC).
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

Tất cả tính theo múi giờ của người dùng (`user.timezone`, mặc định `Asia/Ho_Chi_Minh`), kết quả lưu UTC.

- Tạo lịch `DAILY`/`EVERY_N_DAYS`: `nextDueAt` là lần đầu tiên `timeOfDay` xảy ra từ `startDate` trở đi mà còn ở tương lai (nếu hôm nay đã qua giờ thì ngày mai).
- **Hoàn thành**: lấy `base = max(now, nextDueAt)` rồi lấy ngày của `base` (theo múi giờ người dùng). `DAILY`: ngày kế tiếp = ngày đó + 1. `EVERY_N_DAYS`: ngày đó + `intervalDays`. Ghép với `timeOfDay`. `ONCE`: tắt lịch (`enabled = false`). Nghĩa là hoàn thành trễ không làm dồn lịch, hoàn thành sớm không bị nhắc lại trong cùng ngày.
- **Tạm hoãn**: `nextDueAt = nextDueAt + 1 ngày` (cộng theo ngày lịch ở múi giờ người dùng, giữ nguyên giờ, đúng cả khi đổi giờ mùa hè). Nếu việc đã quá hạn nhiều ngày, hoãn vẫn chỉ cộng 1 ngày từ `nextDueAt` hiện tại; nếu kết quả vẫn ở quá khứ thì dùng cùng giờ của ngày mai tính từ `now`.
- Tạm hoãn không đổi lịch lặp: lần đến hạn sau của lịch được tính lại từ lúc hoàn thành như trên.
- Sửa `timeOfDay`, kiểu lặp hoặc ngày bắt đầu thì tính lại `nextDueAt` như khi tạo mới.
- Tắt lịch (`enabled = false`): không tạo thông báo; bật lại thì tính lại `nextDueAt` như khi tạo mới.

### 4.3 Quy tắc biên

- Mỗi (`taskId`, `dueAt`) chỉ có một thông báo (không tạo trùng khi scheduler chạy lại).
- Việc quá hạn nhiều ngày không sinh nhiều thông báo; mỗi lịch chỉ có tối đa một thông báo chưa xử lý.
- Hoàn thành hoặc hoãn một việc thì thông báo tương ứng chuyển sang trạng thái đã xử lý (`resolved`).
- Xoá bể thì xoá luôn cá, lịch, thông báo và nhật ký chăm của bể đó. Xoá bể cần hộp thoại xác nhận.
- Xoá lịch cần xác nhận; nhật ký đã ghi của lịch đó vẫn giữ theo bể, hiển thị theo tiêu đề đã lưu lúc ghi.
- Tên bể không rỗng, tối đa 100 ký tự, không trùng (không phân biệt hoa thường) trong cùng một người dùng.
- Thể tích bể (lít) là số nguyên dương, có thể để trống.
- Mỗi bể tối đa 20 lịch chăm, mỗi người dùng tối đa 30 bể (chặn lạm dụng, có thể chỉnh sau).
- Người dùng không bao giờ truy cập được dữ liệu của người khác; truy cập sai id trả 404.

## 5. Màn hình (mobile-first)

### 5.0 Routes (FE)

`/login`, `/register`, `/` (Hôm nay), `/tanks` (danh sách bể), `/tanks/new`, `/tanks/:id` (chi tiết bể), `/tanks/:id/edit`, `/tanks/:id/tasks/new`, `/tanks/:id/tasks/:taskId/edit`, `/notifications`, `/settings`. Các route ngoài `/login` và `/register` cần đăng nhập. Có trang 404 tiếng Việt.

Điều hướng dưới đáy màn hình (mobile): Hôm nay, Bể của tôi, Thông báo (có chấm số chưa đọc), Cài đặt.

### 5.1 Đăng ký / Đăng nhập
- Đăng ký: tên hiển thị, email, mật khẩu (tối thiểu 8 ký tự). Thành công thì đăng nhập luôn
- Đăng nhập: email + mật khẩu; báo lỗi chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại)
- Đăng xuất ở trang Cài đặt

### 5.2 Hôm nay `/`
- Nhóm "Đến giờ / Quá hạn": mỗi việc một thẻ gồm tên bể, loại việc, tiêu đề, ghi chú, giờ hẹn; hai nút lớn "Hoàn thành" và "Hoãn đến mai"
- Nhóm "Sắp tới hôm nay": các việc còn lại trong ngày, chỉ xem
- Trạng thái rỗng thân thiện ("Hôm nay không có việc gì, nghỉ ngơi thôi")
- Banner mời bật thông báo nếu chưa bật (xem mục 7)

### 5.3 Danh sách bể `/tanks` và chi tiết bể `/tanks/:id`
- Danh sách: thẻ bể (tên, thể tích, số lịch, việc kế tiếp), nút nổi "Thêm bể"
- Form bể: tên, thể tích (lít), loại bể (`PLANTED` thủy sinh, `FISH_ONLY` cá cảnh, `OTHER`), ngày setup, ghi chú, danh sách cá (tên + số lượng, thêm/xoá nhanh)
- Chi tiết bể: thông tin bể, danh sách lịch chăm (bật/tắt nhanh, sửa, xoá, hiển thị "Mỗi ngày 08:00" / "Mỗi 7 ngày 19:00" / "Một lần 25/11 21:00" và lần đến hạn kế tiếp), nút "Thêm lịch chăm", lịch sử chăm gần đây (50 mục, mới nhất trước)

### 5.4 Form lịch chăm
- Loại việc (chọn), tiêu đề (mặc định theo loại, ví dụ "Cho ăn"), ghi chú (ví dụ "Thay 30% nước"), kiểu lặp, giờ nhắc, số ngày (khi `EVERY_N_DAYS`), ngày bắt đầu hoặc ngày giờ (khi `ONCE`)
- Xem trước dòng "Lần nhắc đầu tiên: ..." theo giờ người dùng

### 5.5 Thông báo `/notifications`
- Danh sách thông báo mới nhất trước: nội dung ("Bể Mini 30L: đến giờ cho ăn"), thời gian, trạng thái chưa đọc/đã đọc/đã xử lý
- Bấm vào thông báo mở trang "Hôm nay"; có nút "Đánh dấu đã đọc tất cả"
- FE gọi lại danh sách và số chưa đọc mỗi 60 giây khi tab đang mở (thunk polling)

### 5.6 Cài đặt `/settings`
- Tên hiển thị, múi giờ (mặc định Asia/Ho_Chi_Minh), bật/tắt thông báo đẩy trên thiết bị này, đăng xuất

### 5.7 Thành phần dùng chung
- Chế độ sáng/tối theo hệ thống
- Chữ lớn, vùng chạm tối thiểu 44px
- Mọi chuỗi giao diện bằng tiếng Việt; mọi danh sách có trạng thái rỗng, đang tải và lỗi
- Xoá bể / lịch cần hộp thoại xác nhận

## 6. Mô hình dữ liệu

Bảng MySQL, tạo bằng Flyway (`V1__init.sql`). Khoá chính `BIGINT AUTO_INCREMENT` (id số), thời gian kiểu `DATETIME(3)` lưu UTC.

```
users
  id, email (unique, lowercase), password_hash, display_name,
  timezone (default 'Asia/Ho_Chi_Minh'), created_at

tanks
  id, user_id (FK), name, volume_liters (nullable), type ('PLANTED'|'FISH_ONLY'|'OTHER'),
  setup_date (nullable), note (nullable), created_at, updated_at
  unique (user_id, name_lower)

tank_fish
  id, tank_id (FK), species_name, quantity (int >= 1)

care_tasks
  id, tank_id (FK), type ('FEED'|'WATER_CHANGE'|'FERTILIZE'|'OTHER'),
  title, note (nullable),
  repeat_type ('DAILY'|'EVERY_N_DAYS'|'ONCE'),
  interval_days (nullable), time_of_day (TIME), start_date (nullable, DATE),
  enabled, next_due_at (nullable, UTC), created_at, updated_at
  index (enabled, next_due_at)

care_logs
  id, tank_id (FK), task_id (nullable, SET NULL khi xoá lịch), task_title,
  result ('DONE'|'SNOOZED'), due_at, acted_at

notifications
  id, user_id (FK), task_id (FK, cascade), due_at, message,
  status ('UNREAD'|'READ'|'RESOLVED'), created_at
  unique (task_id, due_at)

push_subscriptions
  id, user_id (FK), endpoint (unique), p256dh, auth, user_agent, created_at
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

Xác thực: header `Authorization: Bearer <JWT>`. JWT hết hạn sau 7 ngày (cấu hình), chưa có refresh token ở MVP. Lỗi trả về dạng `{ "code": "...", "message": "...", "fieldErrors": { ... } }`.

```
POST   /api/auth/register          { email, password, displayName } -> { token, user }
POST   /api/auth/login             { email, password } -> { token, user }
GET    /api/me                     -> user
PATCH  /api/me                     { displayName?, timezone? } -> user

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

`ScheduleCalculator` (unit test thuần, có cả trường hợp múi giờ `Asia/Ho_Chi_Minh`):
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

## 11. Kế hoạch triển khai (nhánh `feature/mvp1`, mỗi commit một mối quan tâm)

1. Khởi tạo: `CLAUDE.md`, `docs/spec.md`, cấu trúc thư mục `be/`, `fe/`, `.gitignore`, `.env.example`, `docker-compose.yml`
2. Scaffold BE (Spring Boot, Maven) và FE (Vite + React + TS + Tailwind + Redux Toolkit) và duyệt dependency
3. Flyway `V1__init.sql`, entity, repository
4. Auth BE + test; FE đăng ký/đăng nhập, store `auth`, route bảo vệ
5. CRUD bể (BE + test, FE danh sách/form/chi tiết)
6. CRUD lịch chăm + `ScheduleCalculator` + test; FE form lịch chăm
7. Hoàn thành/Hoãn + `CareLog` + trang Hôm nay + lịch sử
8. Scheduler + thông báo trong app + polling
9. Web Push + PWA + hướng dẫn iOS
10. Polish mobile, 404, empty states, README

## 12. Quyết định đã chốt

- **Kiến trúc:** monolith Spring Boot + MySQL; FE React tách riêng trong `fe/`, giao tiếp qua REST
- **Auth:** email + mật khẩu, JWT, chưa có quên mật khẩu/OAuth
- **State FE:** Redux Toolkit (không dùng TanStack Query)
- **Thông báo:** PWA + Web Push và danh sách thông báo trong app; chưa làm native app/email
- **Hoãn:** MVP chỉ có một mức "hoãn đến mai" (+1 ngày, giữ giờ)
- **Lịch:** chỉ có `DAILY`, `EVERY_N_DAYS`, `ONCE`; chưa có lịch theo thứ trong tuần hay nhiều mốc giờ trong ngày
- **Dữ liệu cá:** nhập tay (tên + số lượng), chưa có thư viện loài
- **Múi giờ:** mỗi người dùng có một múi giờ, mặc định `Asia/Ho_Chi_Minh`
