# Quy chuẩn Backend (`be/`)

Quy chuẩn bắt buộc cho mọi dòng code backend. Đọc file này cùng `CLAUDE.md` gốc và `docs/spec.md` trước khi sinh hoặc sửa code trong `be/`. Vi phạm mục "BẮT BUỘC" hoặc "KHÔNG ĐƯỢC" là lỗi, kể cả khi code chạy đúng. Nếu một rule gây vướng, dừng lại và hỏi, không tự lách.

## Stack (cố định)

Java 21, Spring Boot 4, Maven, Spring JDBC (`JdbcClient`), Flyway, MySQL 8, Spring Security + JWT, Bean Validation. Không dùng Lombok. Không thêm dependency khi chưa hỏi.

## Cơ sở dữ liệu

- BẮT BUỘC: mọi bảng có khoá chính `id BIGINT AUTO_INCREMENT` (Java là `Long`). Không dùng UUID, không dùng khoá tự nhiên
- BẮT BUỘC: tên bảng và cột theo `snake_case`; tên bảng số nhiều (`tanks`)
- BẮT BUỘC: mọi bảng có `created_at DATETIME(3)` (UTC); bảng có thể bị sửa thì thêm `updated_at`
- BẮT BUỘC: mọi khoá ngoại khai báo rõ `ON DELETE` (`CASCADE` hoặc `SET NULL`); đặt index cho mọi cột dùng để lọc hoặc join
- BẮT BUỘC: enum lưu bằng `VARCHAR` (không dùng kiểu `ENUM` của MySQL); boolean dùng `BOOLEAN`
- BẮT BUỘC: schema chỉ đổi qua Flyway migration `V<n>__<mo_ta>.sql`. Không sửa migration đã chạy, thêm migration mới. Mỗi migration một mối quan tâm
- BẮT BUỘC: SQL phải chạy được trên cả MySQL 8 và H2 ở `MODE=MySQL` (test chạy trên H2). Không dùng tính năng chỉ có ở MySQL

## Truy cập dữ liệu (JDBC, không JPA)

- KHÔNG ĐƯỢC: dùng JPA, Hibernate, `@Entity`, Spring Data repository hay bất kỳ ORM nào khác
- BẮT BUỘC: dùng `JdbcClient` với SQL viết tay trong Java text block và **tham số có tên** (`:userId`). KHÔNG ĐƯỢC nối dữ liệu người dùng vào chuỗi SQL
- BẮT BUỘC: liệt kê cột tường minh. Không dùng `SELECT *`
- BẮT BUỘC: map một dòng DB vào một Java `record` (đặt tên `XxxRow`, hoặc tên miền như `Tank`) bằng `RowMapper` riêng
- BẮT BUỘC: repository là class `@Repository` tên `XxxRepository`, chỉ chứa SQL, không chứa logic nghiệp vụ
- BẮT BUỘC: lấy khoá sinh tự động bằng `GeneratedKeyHolder` và trả về `Long`
- BẮT BUỘC: `@Transactional` đặt ở tầng **service**, không đặt ở controller hay repository. Thao tác ghi gồm nhiều câu lệnh phải nằm trong một transaction
- BẮT BUỘC: giới hạn và phân trang bằng `LIMIT` trong SQL, không lấy hết rồi cắt trong Java

## Phân tầng và API

- BẮT BUỘC: chia package theo feature (`auth`, `tank`, `caretask`, `notification`, `common`). Controller (mỏng) -> service (logic nghiệp vụ) -> repository. Controller không chạm vào SQL
- BẮT BUỘC: DTO request/response là `record`, tách biệt với row record. Không bao giờ trả `password_hash` hay trường nội bộ ra ngoài
- BẮT BUỘC: validate đầu vào bằng Bean Validation (`@Valid`). Lỗi trả về một dạng duy nhất `{ code, message, fieldErrors }` qua `@RestControllerAdvice` toàn cục
- BẮT BUỘC: REST dưới `/api`, danh từ số nhiều, JSON `camelCase`, thời gian theo ISO-8601 UTC. Dùng đúng mã trạng thái: 201 khi tạo, 204 khi xoá, 400, 401, 404, 409
- BẮT BUỘC: mọi câu SQL đọc hoặc ghi dữ liệu người dùng đều lọc theo `user_id` (trực tiếp hoặc qua join). Truy cập dữ liệu của người khác trả **404**, không trả 403

## Xác thực (Auth)

- BẮT BUỘC: dùng JWT access token (HS256), header `Authorization: Bearer <token>`, stateless. Không dùng session phía server, không dùng cookie
- BẮT BUỘC: mật khẩu băm bằng BCrypt. `JWT_SECRET` lấy từ biến môi trường (tối thiểu 32 ký tự). Thời hạn token cấu hình được. Không bao giờ log mật khẩu hay token
- BẮT BUỘC: lấy user hiện tại từ `SecurityContext` qua một helper dùng chung (`CurrentUser`). Không bao giờ nhận `userId` từ client
- Thư viện JWT phải được duyệt trước khi thêm (quyết định ở M3)

## Thời gian, lỗi, log

- BẮT BUỘC: lưu thời gian dạng UTC `Instant`. Inject `Clock`, không gọi `Instant.now()` hay `LocalDate.now()` trong logic nghiệp vụ. Phép tính lịch là hàm thuần có unit test
- BẮT BUỘC: ném exception nghiệp vụ (`NotFoundException`, `ConflictException`, ...). Không nuốt exception, không trả stack trace cho client
- BẮT BUỘC: log bằng SLF4J. Không dùng `System.out`. Không log dữ liệu nhạy cảm

## Phong cách code

- BẮT BUỘC: chỉ dùng constructor injection (không `@Autowired` trên field)
- Dùng record, text block, pattern matching khi giúp code ngắn và rõ hơn
- Giữ method nhỏ, đặt tên rõ nghĩa; comment viết bằng tiếng Anh và chỉ khi code không tự nói lên được lý do

## Test

- BẮT BUỘC: mọi logic mới đều có test
  - hàm thuần: unit test thông thường
  - repository: chạy SQL thật trên H2 (`MODE=MySQL`) với Flyway migration đã áp dụng
  - controller: MockMvc, phủ các trường hợp thành công, 400, 401 và 404
  - có ít nhất một test chứng minh user A không đọc hay sửa được dữ liệu của user B
- `./mvnw verify` phải pass trước khi báo hoàn thành

## Checklist trước khi báo hoàn thành

1. Không có annotation JPA, không `SELECT *`, không ghép chuỗi vào SQL
2. Bảng/cột mới tuân thủ mục Cơ sở dữ liệu và đến từ một Flyway migration mới
3. Truy vấn dữ liệu người dùng đều lọc theo `user_id`
4. DTO tách khỏi row; không lộ trường nhạy cảm
5. Đã thêm test; `./mvnw verify` pass
