# Fish Caring

Web app nhắc lịch chăm sóc bể cá / thủy sinh tại nhà: cho ăn, thay nước, bón phân. Thông báo tới điện thoại qua PWA + Web Push.

- Yêu cầu và thiết kế: [docs/spec.md](docs/spec.md)
- Quy ước làm việc cho AI/dev: [CLAUDE.md](CLAUDE.md), [be/CLAUDE.md](be/CLAUDE.md), [fe/CLAUDE.md](fe/CLAUDE.md)

## Stack

- Backend `be/`: Java 21, Spring Boot 4 (monolith), Maven, Spring JDBC (`JdbcClient`), Flyway, MySQL 8
- Frontend `fe/`: React, Vite, TypeScript, Tailwind, Redux Toolkit

## Trạng thái

MVP1 đang phát triển trên nhánh `feature/mvp1`. Đã xong M0 (tài liệu), M1 (scaffold), M2 (schema, repository, nền tảng BE), M3 (đăng ký, đăng nhập), M4 (quản lý bể và cá), M5 (lịch chăm và tính lịch), M6 (hoàn thành, tạm hoãn, trang Hôm nay, lịch sử), M7 (thông báo trong app, tạo trước 30 phút khi gần tới giờ hẹn), M8 (PWA và Web Push). Xem milestone ở mục 11 của [docs/spec.md](docs/spec.md).

## Chạy local

1. Tạo database MySQL 8 và user (dùng `docker compose` ở thư mục gốc, hoặc MySQL có sẵn):

   ```powershell
   copy .env.example .env   # điền giá trị cho các biến MYSQL_*, rồi chạy:
   docker compose up -d
   ```

2. Chạy backend (Flyway tự tạo bảng ở lần chạy đầu). Đặt biến môi trường khớp với database ở bước 1:

   ```powershell
   cd be
   $env:DB_URL = "jdbc:mysql://localhost:3306/fishcaring"
   $env:DB_USERNAME = "<user>"
   $env:DB_PASSWORD = "<password>"
   $env:JWT_SECRET = "<chuỗi ngẫu nhiên >= 32 ký tự>"
   .\mvnw spring-boot:run
   ```

   `JWT_SECRET` là bắt buộc (thiếu hoặc quá ngắn thì backend không khởi động). Sinh nhanh một giá trị ngẫu nhiên:

   ```powershell
   $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```

   Kiểm tra: `http://localhost:8080/actuator/health` trả `{"status":"UP"}`. Cổng 8080 bận thì đặt `$env:SERVER_PORT = "8089"` (và khi chạy frontend đặt `$env:VITE_API_PROXY = "http://localhost:8089"`). Backend chỉ cho phép CORS từ `http://localhost:5173`; nếu frontend chạy ở cổng khác thì đặt `$env:CORS_ALLOWED_ORIGIN` cho khớp. Muốn mở web từ điện thoại cùng Wifi (`http://<IP máy tính>:5173`), cho phép nhiều địa chỉ, ngăn cách bằng dấu phẩy: `$env:CORS_ALLOWED_ORIGIN = "http://localhost:5173,http://192.168.0.104:5173"`. Lưu ý: qua `http://` thường, điện thoại xem được giao diện nhưng không bật được push (cần HTTPS).

3. Chạy frontend:

   ```powershell
   cd fe
   npm install
   npm run dev
   ```

   Cấu hình frontend nằm trong `fe/.env.example` (sao chép thành `fe/.env.local`, file này git bỏ qua). Chỉ có hai biến:

   | Biến | Dùng khi | Ý nghĩa |
   |---|---|---|
   | `VITE_API_PROXY` | chỉ khi chạy `npm run dev` | nơi dev server chuyển `/api` tới (mặc định `http://localhost:8080`). Đặt trong `fe/.env.local` thì khỏi gõ `$env:VITE_API_PROXY` mỗi lần; biến đặt trong shell vẫn thắng |
   | `VITE_API_BASE_URL` | khi build, mọi môi trường | địa chỉ backend, **không kèm `/api`** (app tự thêm). Để trống = cùng domain (dev proxy chuyển `/api`). Đặt thành `https://api.ten-mien.com` để gọi thẳng backend ở domain khác |

   Lưu ý: `VITE_API_BASE_URL` được ghi vào bản build, nên đổi giá trị rồi phải build/deploy lại. Trên Vercel đặt nó ở Project Settings, Environment Variables, không tạo `.env.production` trong repo. Khi gọi thẳng domain khác thì backend phải có `CORS_ALLOWED_ORIGIN` chứa domain của web, và domain đó phải là HTTPS thì điện thoại mới bật được thông báo đẩy. Chỉ biến bắt đầu bằng `VITE_` lọt vào trình duyệt, nên không đặt bí mật vào đây.

4. (Không bắt buộc) Bật thông báo đẩy Web Push: tạo cặp khoá VAPID rồi đặt các biến môi trường trước khi chạy backend. Không đặt thì backend vẫn chạy bình thường và thông báo chỉ hiện trong app.

   ```powershell
   cd be
   .\mvnw -q compile
   java -cp target/classes com.fishcaring.service.VapidKeyGenerator   # in ra VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
   $env:VAPID_PUBLIC_KEY = "<khoá công khai>"
   $env:VAPID_PRIVATE_KEY = "<khoá bí mật>"
   $env:VAPID_SUBJECT = "mailto:ban@example.com"
   ```

   Đặt cả ba biến hoặc không biến nào (thiếu một hoặc khoá sai thì backend không khởi động). Đổi khoá thì mọi thiết bị đã bật cần bật lại. Khoá bí mật không được đưa vào git.

   Lưu ý khi thử trên điện thoại: service worker và push chỉ chạy trên `localhost` hoặc **HTTPS**. Mở bằng `http://<IP mạng LAN>:5173` thì không bật được thông báo; cần một đường hầm HTTPS (tunnel) hoặc bản triển khai thật. iPhone/iPad (iOS 16.4 trở lên) chỉ nhận push sau khi thêm app vào Màn hình chính.

Test backend: `cd be; .\mvnw verify` (chạy trên H2, không cần MySQL).

## CI và triển khai

**CI** (`.github/workflows/ci.yml`) chạy trên mỗi pull request và khi push vào `main`, gồm hai job: `frontend` (lint, typecheck, test, build) và `backend` (`mvnw verify` trên H2). Không cần secret.

**Triển khai.** Vercel chỉ host frontend; backend Spring Boot cần một máy chủ chạy liên tục (bộ lập lịch thông báo chạy mỗi phút).

1. **Backend trước:** host có HTTPS (Render, Railway, Fly, VPS...) kèm MySQL 8. Flyway tự chạy migration khi khởi động. Biến môi trường: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (ngẫu nhiên, từ 32 ký tự, giữ cố định), `CORS_ALLOWED_ORIGIN=https://<app>.vercel.app`, và ba biến `VAPID_*` nếu bật push. Health check: `/actuator/health`. Repo chưa có Dockerfile cho backend.
2. **Vercel:** Add New Project, import repo, đặt **Root Directory** là `fe`, framework Vite (build `npm run build`, output `dist`). `fe/vercel.json` đã lo việc mở thẳng các đường dẫn như `/tanks` và không cache `sw.js`.
3. **Biến môi trường trên Vercel:** `VITE_API_BASE_URL=https://<domain-backend>` (không kèm `/api`). Đổi giá trị thì phải Redeploy.
4. Merge vào `main` là lên Production, mỗi PR có một địa chỉ Preview. Đăng nhập trên Preview bị CORS chặn trừ khi thêm địa chỉ đó vào `CORS_ALLOWED_ORIGIN`.
5. **GitHub:** Settings, Branches, thêm rule cho `main`: bắt buộc pull request và hai check `frontend`, `backend`.
6. Kiểm tra sau triển khai: đăng ký, đăng nhập, F5 ở `/tanks`; trên iPhone thêm vào Màn hình chính rồi bật thông báo.
