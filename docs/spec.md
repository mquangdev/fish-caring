# Spec: Fish Caring, nhắc lịch chăm sóc bể cá

## 1. Mục tiêu

Người chơi thủy sinh thường có nhiều bể, mỗi bể nuôi loài khác nhau và có chế độ chăm khác nhau (cho ăn, thay nước, bón phân...). Rất khó nhớ hôm nay bể nào cần làm gì. Web app này cho người dùng khai báo bể, đặt lịch chăm cho từng bể (hoặc lịch chung không gắn bể nào, ví dụ thay nước cho trùn chỉ), nhắc đúng giờ trên điện thoại, và ghi nhận đã làm hay hoãn sang ngày mai.

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

Loại việc (`type`): `FEED` (cho ăn), `WATER_CHANGE` (thay nước), `FERTILIZE` (bón phân), `OTHER` (việc khác, dùng tiêu đề tự đặt). Mỗi loại có thêm **một ô nhập riêng, không bắt buộc**:
- `FEED`: `foodName` (loại thức ăn, chữ, tối đa 100 ký tự), ví dụ "Hạt 1mm"
- `WATER_CHANGE`: `waterChangePercent` (thay bao nhiêu % nước bể, số nguyên 1 đến 100)
- `FERTILIZE`: `fertilizerMl` (bao nhiêu ml phân nước, từ 0,1 đến 1.000, tối đa 1 chữ số thập phân)
- `OTHER`: không có ô riêng

Server chỉ lưu ô riêng khớp với `type`; ô của loại khác bị bỏ qua (lưu `null`), nên đổi loại việc thì giá trị ô của loại cũ bị xoá.

Kiểu lặp (`repeatType`):
- `DAILY`: mỗi ngày vào `timeOfDay` (HH:mm); không dùng `intervalDays` và `startDate` (lưu `null`)
- `EVERY_N_DAYS`: mỗi `intervalDays` ngày (2 đến 60) vào `timeOfDay`. `startDate` bắt buộc, có thể ở quá khứ
- `ONCE`: một lần vào `startDate` lúc `timeOfDay`, **phải ở tương lai** khi tạo hoặc khi đổi ngày giờ (quá khứ trả `400` ở khoá `startDate`); sau khi hoàn thành thì tự tắt

Ví dụ: "Cho ăn 8:00 mỗi ngày", "Thay 30% nước 19:00 mỗi 7 ngày", "Bón phân nền 20:00 mỗi 3 ngày", "Bón thử thuốc 25/11 21:00 một lần".

### 4.2 Quy tắc tính lịch (hàm thuần, có unit test)

Toàn hệ thống dùng một múi giờ duy nhất là giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7, không có giờ mùa hè). Mọi thời điểm lưu và tính bằng `LocalDateTime` theo giờ này, không có múi giờ riêng theo người dùng.

- Tạo lịch (hàm `firstDue`; so sánh với `now` là nghiêm ngặt, đúng bằng `now` tính là đã qua):
  - `DAILY`: hôm nay lúc `timeOfDay` nếu còn sau `now`, không thì ngày mai
  - `EVERY_N_DAYS`: các mốc là `startDate + k x intervalDays` (k = 0, 1, 2...) lúc `timeOfDay`; lấy mốc đầu tiên sau `now`
  - `ONCE`: đúng `startDate` lúc `timeOfDay`
- **Hoàn thành**: lấy `base = max(now, nextDueAt)` rồi lấy ngày của `base` (giờ Việt Nam). `DAILY`: ngày kế tiếp = ngày đó + 1. `EVERY_N_DAYS`: ngày đó + `intervalDays`. Ghép với `timeOfDay`. `ONCE`: tắt lịch (`enabled = false`). Nghĩa là hoàn thành trễ không làm dồn lịch, hoàn thành sớm không bị nhắc lại trong cùng ngày.
- **Tạm hoãn**: `nextDueAt = nextDueAt + 1 ngày` (cộng đúng 1 ngày lịch, giữ nguyên giờ). Nếu việc đã quá hạn nhiều ngày, hoãn vẫn chỉ cộng 1 ngày từ `nextDueAt` hiện tại; nếu kết quả vẫn ở quá khứ thì dùng cùng giờ của ngày mai tính từ `now`.
- Tạm hoãn không đổi lịch lặp: lần đến hạn sau của lịch được tính lại từ lúc hoàn thành như trên.
- Sửa `timeOfDay`, kiểu lặp, số ngày hoặc ngày bắt đầu thì tính lại `nextDueAt` như khi tạo mới. Sửa tiêu đề, ghi chú, loại việc hay các ô riêng **không** tính lại (không làm mất lần đã hoãn).
- Tắt lịch (`enabled = false`): `nextDueAt = null`, không tạo thông báo; bật lại thì tính lại `nextDueAt` như khi tạo mới. Bật lại lịch `ONCE` đã qua thời điểm trả `400` ở khoá `startDate` (người dùng cần sửa ngày giờ).

### 4.3 Quy tắc biên

- Mỗi (`taskId`, `dueAt`) chỉ có một thông báo (không tạo trùng khi scheduler chạy lại).
- Việc quá hạn nhiều ngày không sinh nhiều thông báo; mỗi lịch chỉ có tối đa một thông báo chưa xử lý.
- Hoàn thành hoặc hoãn một việc thì thông báo tương ứng chuyển sang trạng thái đã xử lý (`resolved`).
- Xoá bể thì xoá luôn cá, lịch gắn bể đó, thông báo và nhật ký chăm của bể đó. **Lịch không gắn bể ("Việc chung") không bị ảnh hưởng.** Xoá bể cần hộp thoại xác nhận.
- **Lịch chăm có thể không gắn bể nào** ("Việc chung", ví dụ thay nước cho trùn chỉ): `tankId` là `null`. Lịch luôn thuộc về một người dùng (`user_id`). Sửa lịch được đổi bể gắn kèm (từ bể này sang bể khác, từ bể sang không gắn bể và ngược lại); đổi bể **không** tính lại `nextDueAt`. `tankId` trỏ tới bể của người khác trả `404`.
- Xoá lịch cần xác nhận; nhật ký đã ghi của lịch đó vẫn giữ theo bể, hiển thị theo tiêu đề đã lưu lúc ghi.
- Tên bể không rỗng, tối đa 100 ký tự (được cắt khoảng trắng hai đầu). **Cho phép trùng tên**, kể cả trong cùng một người dùng; không có giới hạn số bể.
- **Kích thước bể là không bắt buộc** và nhập theo một trong hai cách: (a) nhập **dài, rộng, cao** (cm) để hệ thống tính thể tích, hoặc (b) nhập thẳng **thể tích** (lít). Nhập kích thước thì phải nhập **đủ cả ba cạnh** hoặc không nhập cạnh nào. Mỗi cạnh từ 0,1 đến 1.000 cm; thể tích từ 0,1 đến 10.000 lít; cả hai tối đa 1 chữ số thập phân.
- Khi có dài, rộng, cao thì **server tính thể tích** = dài x rộng x cao / 1000, làm tròn nửa lên 1 chữ số thập phân (60 x 30 x 36 cm = 64,8 lít) và bỏ qua thể tích client gửi; thể tích tính ra vượt 10.000 lít hoặc dưới 0,1 lít bị từ chối. Frontend dùng cùng công thức để hiện thể tích ngay khi gõ. Kích thước đã nhập được lưu để sửa lại; sửa bể mà không gửi kích thước thì kích thước bị xoá.
- Bể không có thông tin "loại bể". Ghi chú tối đa 1.000 ký tự. Ngày setup có thể để trống.
- Cá trong bể: tối đa 50 dòng mỗi bể; mỗi dòng có tên loài (1 đến 100 ký tự), số lượng (số nguyên từ 1 đến 9.999) và trạng thái `ALIVE` (còn sống) hoặc `DEAD` (đã chết). Danh sách cá hiển thị **cá mới lên trước**; danh sách bể hiển thị **bể mới tạo lên trước**.
- Sửa bể gửi lại toàn bộ danh sách cá và thay thế danh sách cũ (đúng thứ tự đang hiển thị).
- Không giới hạn số lịch chăm mỗi bể. Lịch có tiêu đề 1 đến 100 ký tự, ghi chú tối đa 500 ký tự. Trong chi tiết bể, lịch xếp: đang bật trước (lần đến hạn gần nhất trước), lịch tắt cuối.
- Người dùng không bao giờ truy cập được dữ liệu của người khác; truy cập sai id trả 404.

## 5. Màn hình (mobile-first)

### 5.0 Routes (FE)

`/login`, `/register`, `/` (Hôm nay), `/tanks` (danh sách bể), `/tanks/new`, `/tanks/:id` (chi tiết bể), `/tanks/:id/edit`, `/tanks/:id/tasks/new` (thêm lịch vào bể), `/tasks/new` (thêm lịch không gắn bể), `/tasks/:taskId/edit` (sửa lịch, kể cả đổi bể), `/notifications`, `/settings`. Các route ngoài `/login` và `/register` cần đăng nhập. Có trang 404 tiếng Việt.

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
- Danh sách: thẻ bể (tên, thể tích, số lịch, việc kế tiếp), nút nổi "Thêm bể". Bên dưới có mục **"Việc chung"**: danh sách lịch không gắn bể (cùng thẻ lịch với công tắc bật/tắt, sửa, xoá như ở chi tiết bể), nút phụ "Thêm lịch chung" và trạng thái rỗng "Chưa có việc chung. Ví dụ: thay nước cho trùn chỉ."
- Form bể: tên; kích thước (không bắt buộc) chọn bằng nút phân đoạn "Nhập thể tích" (một ô lít) hoặc "Nhập kích thước" (ba ô dài, rộng, cao tính bằng cm, hiện thể tích ngay khi gõ); ngày setup; ghi chú; danh sách cá (tên loài + số lượng + trạng thái còn sống/đã chết, thêm/xoá nhanh; đàn cá chết một phần thì tách thành hai dòng)
- Chi tiết bể: thông tin bể, danh sách lịch chăm (bật/tắt nhanh, sửa, xoá, hiển thị "Mỗi ngày 08:00" / "Mỗi 7 ngày 19:00" / "Một lần 25/11 21:00" và lần đến hạn kế tiếp), nút "Thêm lịch chăm", lịch sử chăm gần đây (50 mục, mới nhất trước)

### 5.4 Form lịch chăm
- **Gắn với** (ô chọn): "Không gắn bể" hoặc một trong các bể của người dùng; mở form từ chi tiết bể thì chọn sẵn bể đó, mở từ "Việc chung" thì chọn sẵn "Không gắn bể"
- Loại việc (nút phân đoạn: Cho ăn / Thay nước / Bón phân / Khác), tiêu đề (tự điền theo loại nếu người dùng chưa tự sửa; "Khác" để trống), **ô riêng theo loại** (không bắt buộc: "Loại thức ăn", "Thay bao nhiêu % nước", "Lượng phân nước (ml)"), ghi chú, kiểu lặp (nút phân đoạn), giờ nhắc, số ngày (khi `EVERY_N_DAYS`), ngày bắt đầu (khi `EVERY_N_DAYS`) hoặc ngày (khi `ONCE`). **Ô ngày gõ theo `dd/MM/yyyy`** (tự thêm dấu `/` khi gõ) kèm nút biểu tượng lịch mở bộ chọn ngày của trình duyệt, không phụ thuộc ngôn ngữ trình duyệt; ngày không có thật (30/02) bị báo lỗi
- Xem trước dòng "Lần nhắc đầu tiên: ..." theo giờ Việt Nam (frontend dùng cùng công thức `firstDue`, lấy "bây giờ" theo giờ Việt Nam chứ không theo múi giờ điện thoại)
- Thẻ lịch trong chi tiết bể hiện tiêu đề kèm chi tiết theo loại ("Thay 30% nước", "Bón 5,5 ml phân nước", "Thức ăn: Hạt 1mm")

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
- Mọi ô ngày (ngày setup, ngày bắt đầu của lịch) gõ và hiển thị theo `dd/MM/yyyy`, không theo ngôn ngữ của trình duyệt
- Xoá bể / lịch cần hộp thoại xác nhận

## 6. Mô hình dữ liệu

Bảng MySQL, tạo bằng Flyway (`V1__init.sql`). Khoá chính `BIGINT AUTO_INCREMENT` (id số), thời gian kiểu `DATETIME(3)` lưu giờ Việt Nam (UTC+7). **Mọi bảng đều có hai cột `created_at` và `updated_at` (NOT NULL)**, do ứng dụng ghi (không dùng giá trị mặc định của DB); mô tả dưới đây không nhắc lại hai cột này.

```
users
  id, email (unique, lowercase), password_hash, display_name

tanks
  id, user_id (FK), name, volume_liters (DECIMAL(7,1), nullable),
  length_cm, width_cm, height_cm (DECIMAL(5,1), nullable; đủ cả ba hoặc không có),
  setup_date (nullable), note (nullable)
  index (user_id, name)   -- chỉ để tra cứu nhanh; cho phép trùng tên

tank_fish
  id, tank_id (FK), species_name, quantity (int >= 1),
  status (TINYINT: 1 = còn sống, 0 = đã chết)

care_tasks
  id, user_id (FK, cascade), tank_id (nullable FK, cascade; null = lịch không gắn bể), type ('FEED'|'WATER_CHANGE'|'FERTILIZE'|'OTHER'),
  title, note (nullable),
  repeat_type ('DAILY'|'EVERY_N_DAYS'|'ONCE'),
  interval_days (nullable), time_of_day (TIME), start_date (nullable, DATE),
  food_name (nullable, VARCHAR 100), water_change_percent (nullable, INT),
  fertilizer_ml (nullable, DECIMAL(6,1)),   // ba ô riêng theo loại việc (migration V3)
  enabled, next_due_at (nullable)
  index (enabled, next_due_at), index (user_id), index (tank_id)
  // migration V4: thêm user_id (điền từ bể cũ), cho phép tank_id null

care_logs
  id, tank_id (nullable FK, cascade; null cho lịch không gắn bể), task_id (nullable, SET NULL khi xoá lịch), task_title,
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

GET    /api/tanks                  -> [{ id, name, volumeLiters, taskCount, nextDueAt }] (bể mới tạo trước)
POST   /api/tanks                  TankRequest -> 201 tank
GET    /api/tanks/{id}             -> tank (gồm `fish` và `tasks`)
PUT    /api/tanks/{id}             TankRequest -> tank (thay toàn bộ danh sách cá)
DELETE /api/tanks/{id}             -> 204 (xoá cả cá, lịch, nhật ký, thông báo của bể)
```

`TankRequest` / `tank`:

```
TankRequest { name, volumeLiters?, lengthCm?, widthCm?, heightCm?, setupDate?, note?, fish?: [FishRequest] }
FishRequest { speciesName, quantity, status }          // status: "ALIVE" | "DEAD"
tank        { id, name, volumeLiters, lengthCm, widthCm, heightCm, setupDate, note, createdAt, updatedAt,
              fish: [{ id, speciesName, quantity, status }] }   // cá mới lên trước
```

Kích thước: gửi đủ `lengthCm`, `widthCm`, `heightCm` (server tính `volumeLiters`, bỏ qua giá trị client gửi) hoặc chỉ gửi `volumeLiters`; gửi thiếu một hai cạnh trả `400` với khoá lỗi là tên các cạnh còn thiếu, thể tích tính ra ngoài khoảng 0,1 đến 10.000 lít trả `400` với khoá `volumeLiters`. Số thập phân JSON, ví dụ `64.8`. Trường `type` cũ (nếu client còn gửi) bị bỏ qua. Danh sách `fish` trong request là thứ tự hiển thị (cá mới lên trước). Lỗi validation của một dòng cá có khoá dạng `fish[0].quantity`.

```

`tank.tasks` là danh sách `task` của bể (không có endpoint liệt kê theo bể); lịch không gắn bể lấy bằng `GET /api/tasks/general`:

```
TaskRequest { tankId?, type, title, note?, repeatType, intervalDays?, timeOfDay: "HH:mm", startDate?: "yyyy-MM-dd",
              foodName?, waterChangePercent?, fertilizerMl? }
task        { id, tankId (null nếu không gắn bể), type, title, note, repeatType, intervalDays, timeOfDay, startDate,
              foodName, waterChangePercent, fertilizerMl, enabled, nextDueAt, createdAt, updatedAt }
```

Chỉ ô riêng khớp `type` được lưu. Lỗi validation theo khoá `tankId` (không phải bể của người dùng thì `404`), `title`, `waterChangePercent`, `fertilizerMl`, `foodName`, `intervalDays`, `startDate`.

```
POST   /api/tasks                   TaskRequest -> 201 task (tankId bỏ trống = không gắn bể)
GET    /api/tasks/general          -> [task] (lịch không gắn bể của người dùng)
GET    /api/tasks/{taskId}         -> task
PUT    /api/tasks/{taskId}         TaskRequest -> task (đổi tankId được)
PATCH  /api/tasks/{taskId}/enabled { enabled } -> task
DELETE /api/tasks/{taskId}         -> 204 (nhật ký của lịch được giữ, task_id thành null)
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
13. Tên bể trùng vẫn được tạo; cá mới thêm luôn đứng đầu danh sách sau khi lưu
14. Tạo lịch không gắn bể (`tankId` bỏ trống) thành công và chỉ xuất hiện ở `GET /api/tasks/general` của đúng người đó; đổi bể gắn kèm (bể ↔ không gắn bể) giữ nguyên `nextDueAt`; xoá bể không xoá lịch không gắn bể
15. User A không xem, sửa, bật/tắt, xoá được lịch không gắn bể của user B, và không gắn lịch của mình vào bể của user B (`404`)
16. Ô ngày nhận `dd/MM/yyyy`, tự thêm dấu `/`, từ chối ngày không có thật (30/02, 29/02 năm không nhuận) và gửi lên server dạng `yyyy-MM-dd`

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

### [x] M4. Quản lý bể
- Phạm vi BE: CRUD `/api/tanks` (gồm danh sách cá), các giới hạn dữ liệu (mục 4.3), `taskCount` và `nextDueAt` trong danh sách bể, nhập kích thước (dài, rộng, cao) hoặc thể tích với thể tích do server tính (migration `V2`, bỏ loại bể), mọi truy vấn lọc theo user
- Phạm vi FE: `/tanks`, `/tanks/new`, `/tanks/:id`, `/tanks/:id/edit`, slice `tanks`, hộp thoại xác nhận xoá, trạng thái rỗng/tải/lỗi
- Tiêu chí hoàn thành: tạo, sửa, xoá bể và cá trong bể trên điện thoại (390px); user A không truy cập được bể của user B (404); test mục 10 số 11 và 13 pass

### [x] M5. Lịch chăm và `ScheduleCalculator`
- Phạm vi BE: lớp thuần `ScheduleCalculator` (`firstDue`, `nextAfterComplete`, `snooze`) theo mục 4.2; `POST /api/tasks`, `GET /api/tasks/{id}`, `GET /api/tasks/general`, `PUT/PATCH/DELETE /api/tasks/{id}`, `tasks` trong chi tiết bể, ô riêng theo loại việc (migration `V3`), lịch không gắn bể và đổi bể gắn kèm (migration `V4`), không giới hạn số lịch
- Phạm vi FE: danh sách lịch trong chi tiết bể và mục "Việc chung" ở `/tanks`, form lịch chăm (mục 5.4) với ô "Gắn với" và dòng xem trước "Lần nhắc đầu tiên", ô ngày `dd/MM/yyyy`, bật/tắt nhanh, slice `tasks`
- **TODO cho M6/M7 (spec chưa quy định, cần hỏi lại khi làm):** nhật ký của lịch không gắn bể hiện ở đâu (chi tiết bể không áp dụng); thẻ ở trang Hôm nay và nội dung thông báo hiện gì thay cho tên bể ("Việc chung"?)
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
- **Dữ liệu cá:** nhập tay (tên loài + số lượng + còn sống/đã chết), chưa có thư viện loài
- **Bể:** cho phép trùng tên bể, không giới hạn số bể mỗi người dùng; bể mới tạo và cá mới thêm hiển thị lên trước
- **Không có "loại bể"** (bỏ để giao diện đỡ rối). Kích thước bể nhập theo thể tích hoặc theo dài, rộng, cao; thể tích có 1 chữ số thập phân và do server tính khi có kích thước
- **Lịch không gắn bể:** lịch chăm có thể không thuộc bể nào ("Việc chung", ví dụ thay nước cho trùn chỉ); lịch có chủ riêng (`user_id`) và đổi bể gắn kèm được
- **Ô ngày:** luôn gõ và hiển thị `dd/MM/yyyy` (không theo ngôn ngữ trình duyệt)
- **Lịch chăm:** giữ "loại việc" kèm một ô riêng không bắt buộc cho từng loại (thức ăn, % nước, ml phân nước); không giới hạn số lịch mỗi bể; lịch một lần phải ở tương lai
- **Múi giờ:** toàn hệ thống dùng giờ Việt Nam (UTC+7) cố định, lưu `LocalDateTime`; không có múi giờ theo người dùng
