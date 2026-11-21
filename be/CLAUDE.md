# Quy chuẩn Backend (`be/`)

Quy chuẩn bắt buộc cho mọi dòng code backend. Đọc file này cùng `CLAUDE.md` gốc và `docs/spec.md` trước khi sinh hoặc sửa code trong `be/`. Vi phạm mục "BẮT BUỘC" hoặc "KHÔNG ĐƯỢC" là lỗi, kể cả khi code chạy đúng. Nếu một rule gây vướng, dừng lại và hỏi, không tự lách.

## Stack (cố định)

Java 21, Spring Boot 4, Maven, Spring JDBC (`JdbcClient`), Flyway, MySQL 8, Spring Security + JWT, Bean Validation, Lombok. Không thêm dependency khi chưa hỏi.

## Cơ sở dữ liệu

- BẮT BUỘC: mọi bảng có khoá chính `id BIGINT AUTO_INCREMENT` (Java là `Long`). Không dùng UUID, không dùng khoá tự nhiên
- BẮT BUỘC: tên bảng và cột theo `snake_case`; tên bảng số nhiều (`tanks`)
- BẮT BUỘC: **mọi bảng** có hai cột `created_at DATETIME(3) NOT NULL` và `updated_at DATETIME(3) NOT NULL` (giờ Việt Nam). Ứng dụng tự ghi cả hai (insert: bằng nhau; update: cập nhật `updated_at`), không dùng giá trị mặc định hay `ON UPDATE` của DB
- BẮT BUỘC: mọi khoá ngoại khai báo rõ `ON DELETE` (`CASCADE` hoặc `SET NULL`); đặt index cho mọi cột dùng để lọc hoặc join
- BẮT BUỘC: enum lưu bằng `VARCHAR` (không dùng kiểu `ENUM` của MySQL); boolean dùng `BOOLEAN`
- BẮT BUỘC: schema chỉ đổi qua Flyway migration `V<n>__<mo_ta>.sql`. Không sửa migration đã chạy, thêm migration mới. Mỗi migration một mối quan tâm
- BẮT BUỘC: SQL phải chạy được trên cả MySQL 8 và H2 ở `MODE=MySQL` (test chạy trên H2). Không dùng tính năng chỉ có ở MySQL. Lưu ý collation MySQL không phân biệt hoa thường và dấu, còn H2 thì phân biệt dấu; đừng viết test dựa vào khác biệt này

## Truy cập dữ liệu (JDBC, không JPA)

- KHÔNG ĐƯỢC: dùng JPA, Hibernate, `@Entity`, Spring Data repository hay bất kỳ ORM nào khác
- BẮT BUỘC: dùng `JdbcClient` với SQL viết tay và **tham số có tên** (`:userId`). KHÔNG ĐƯỢC nối dữ liệu người dùng vào chuỗi SQL
- BẮT BUỘC: **mọi câu SQL là hằng số** `public static final String` (Java text block) đặt trong package `constant`, mỗi bảng một class `XxxSql` (ví dụ `TankSql.FIND_BY_ID_AND_USER_ID`, `TankSql.INSERT`). Repository chỉ gọi `jdbc.sql(XxxSql.CONST)` rồi `.param(...)`, KHÔNG viết SQL trực tiếp trong repository và KHÔNG ghép/nối chuỗi để dựng SQL (không `"SELECT " + COLUMNS + ...`); mỗi hằng số là một câu SQL đầy đủ, đọc được nguyên văn. Class hằng số là `final`, constructor private (`@NoArgsConstructor(access = AccessLevel.PRIVATE)`)
- BẮT BUỘC: liệt kê cột tường minh. Không dùng `SELECT *`
- BẮT BUỘC: map một dòng DB vào một **class** `XxxEntity` (package `entity`) bằng `RowMapper` riêng (dùng constructor đầy đủ tham số). Dữ liệu đầu vào nội bộ để insert/update (không phải dòng DB, không phải DTO) là class ở package `object` (ví dụ `TankData`)
- BẮT BUỘC: repository là class `@Repository` tên `XxxRepository`, chỉ chứa SQL, không chứa logic nghiệp vụ
- BẮT BUỘC: lấy khoá sinh tự động bằng `GeneratedKeyHolder` và trả về `Long`
- BẮT BUỘC: `@Transactional` đặt ở tầng **service**, không đặt ở controller hay repository. Thao tác ghi gồm nhiều câu lệnh phải nằm trong một transaction
- BẮT BUỘC: giới hạn và phân trang bằng `LIMIT` trong SQL, không lấy hết rồi cắt trong Java

## Phân tầng và API

- BẮT BUỘC: chia package **theo tầng**, không chia theo feature. Chỉ có ba tầng xử lý: `controller` (mỏng) -> `service` (logic nghiệp vụ) -> `repository` (chỉ SQL). Controller không chạm vào SQL, không gọi repository trực tiếp
- BẮT BUỘC: các package hỗ trợ và nội dung của chúng: `entity` (map dòng DB), `dto` (request/response, `ApiError`), `object` (value object nội bộ), `mapper` (chuyển đổi entity <-> dto, không logic nghiệp vụ), `enums`, `constant` (hằng số SQL `XxxSql`), `config` (cấu hình Spring, `Clock`), `exception` (exception nghiệp vụ và `GlobalExceptionHandler`). Không tạo package mới theo feature; cần package khác thì hỏi trước
- BẮT BUỘC: tên lớp có hậu tố theo tầng (`TankController`, `TankService`, `TankRepository`, `TankEntity`, `TankResponse`/`TankRequest` cho DTO, `TankMapper`). Package test phản chiếu package main
- BẮT BUỘC: DTO request/response là class Lombok (xem mục Lombok), tách biệt với entity. Không bao giờ trả `password_hash` hay trường nội bộ ra ngoài
- BẮT BUỘC: validate đầu vào bằng Bean Validation (`@Valid`). Lỗi trả về một dạng duy nhất `{ code, message, fieldErrors }` qua `@RestControllerAdvice` toàn cục
- BẮT BUỘC: REST dưới `/api`, danh từ số nhiều, JSON `camelCase`, thời gian theo ISO-8601 (giờ Việt Nam, không kèm múi giờ). Dùng đúng mã trạng thái: 201 khi tạo, 204 khi xoá, 400, 401, 404, 409
- BẮT BUỘC: mọi câu SQL đọc hoặc ghi dữ liệu người dùng đều lọc theo `user_id` (trực tiếp hoặc qua join). Truy cập dữ liệu của người khác trả **404**, không trả 403

## Xác thực (Auth)

- BẮT BUỘC: dùng JWT access token (HS256), header `Authorization: Bearer <token>`, stateless. Không dùng session phía server, không dùng cookie
- BẮT BUỘC: mật khẩu băm bằng BCrypt. `JWT_SECRET` lấy từ biến môi trường (tối thiểu 32 ký tự). Thời hạn token cấu hình được. Không bao giờ log mật khẩu hay token
- BẮT BUỘC: lấy user hiện tại từ `SecurityContext` qua một helper dùng chung (`CurrentUser`). Không bao giờ nhận `userId` từ client
- Thư viện JWT đã chốt: `spring-boot-starter-oauth2-resource-server` (Nimbus). `JwtEncoder`/`JwtDecoder` HS256 cấu hình ở `config/JwtConfig`, token phát ra bởi `service/JwtService` (chỉ chứa `sub` = id user, `iat`, `exp`). Không tự viết filter JWT, không thêm thư viện JWT khác
- BẮT BUỘC: `JWT_SECRET` không có giá trị mặc định; thiếu hoặc ngắn hơn 32 byte thì ứng dụng không khởi động (kiểm tra trong `AppProperties.Jwt`)
- BẮT BUỘC: đăng nhập sai (email lạ hoặc sai mật khẩu) luôn trả cùng một lỗi `401 INVALID_CREDENTIALS`; so sánh BCrypt cả khi không có user (hash giả) để không lộ email tồn tại
- BẮT BUỘC: lỗi 401/403 từ Spring Security cũng trả body `ApiError` (`RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`); message API bằng tiếng Anh, FE tự hiển thị tiếng Việt theo `code`
- `CurrentUser` (`service/CurrentUser`) là cách duy nhất để controller biết user hiện tại

## Lombok và kiểu dữ liệu

- BẮT BUỘC: `entity`, `dto` và `object` là **class dùng Lombok**, KHÔNG ĐƯỢC dùng `record` (ví dụ `CareLogEntity` phải là `class CareLogEntity`). `record` chỉ được dùng cho thứ không thuộc ba package này (ví dụ class `@ConfigurationProperties`, hoặc kiểu phụ trợ trong test)
- BẮT BUỘC: entity dùng `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`. Thứ tự field trong class trùng thứ tự cột trong `RowMapper` (constructor đầy đủ tham số)
- BẮT BUỘC: response DTO và `object` là bất biến: field `private final`, dùng `@Getter @AllArgsConstructor` (thêm `@Builder` khi có từ 4 field trở lên)
- BẮT BUỘC: request DTO (body JSON đi vào) dùng `@Getter @Setter @NoArgsConstructor @AllArgsConstructor` để Jackson gán được giá trị, và đặt annotation Bean Validation lên field
- BẮT BUỘC: dùng wrapper (`Long`, `Integer`, `Boolean`) cho field của entity/dto/object để biểu diễn được `null`; getter của `Boolean` là `getEnabled()`
- KHÔNG ĐƯỢC: dùng `@Data`, `@Value`, `@SneakyThrows`, `@Cleanup`. Không đặt Lombok trong `constant` ngoài `@NoArgsConstructor(access = AccessLevel.PRIVATE)`
- Dùng Lombok cho constructor injection nếu muốn (`@RequiredArgsConstructor`) trong service/controller; log bằng `@Slf4j` thay cho khai báo logger tay

## Thời gian, lỗi, log

- BẮT BUỘC: toàn hệ thống dùng giờ Việt Nam (UTC+7), lưu và xử lý bằng `LocalDateTime`/`LocalDate`/`LocalTime`; không có múi giờ theo người dùng. Inject `Clock` (bean ở `config/TimeConfig`), không gọi `now()` không tham số (`LocalDateTime.now()`, `Instant.now()`, ...) trong code nghiệp vụ. Service lấy `LocalDateTime.now(clock)` rồi truyền xuống repository. Phép tính lịch là hàm thuần có unit test
- BẮT BUỘC: ném exception nghiệp vụ (`NotFoundException`, `ConflictException`, ...). Không nuốt exception, không trả stack trace cho client
- BẮT BUỘC: log bằng SLF4J. Không dùng `System.out`. Không log dữ liệu nhạy cảm

## Phong cách code

- BẮT BUỘC: chỉ dùng constructor injection (không `@Autowired` trên field)
- Dùng text block, pattern matching khi giúp code ngắn và rõ hơn
- Giữ method nhỏ, đặt tên rõ nghĩa; comment viết bằng tiếng Anh và chỉ khi code không tự nói lên được lý do

## Test

- BẮT BUỘC: mọi logic mới đều có test
  - hàm thuần: unit test thông thường
  - repository: chạy SQL thật trên H2 (`MODE=MySQL`) với Flyway migration đã áp dụng
  - controller: MockMvc, phủ các trường hợp thành công, 400, 401 và 404
  - có ít nhất một test chứng minh user A không đọc hay sửa được dữ liệu của user B
- `./mvnw verify` phải pass trước khi báo hoàn thành

## Checklist trước khi báo hoàn thành

1. Không có annotation JPA, không `SELECT *`, không ghép chuỗi vào SQL, không viết SQL trong repository (mọi SQL là hằng số trong `constant`)
2. Bảng/cột mới tuân thủ mục Cơ sở dữ liệu và đến từ một Flyway migration mới
3. Truy vấn dữ liệu người dùng đều lọc theo `user_id`
4. Entity/dto/object là class Lombok (không `record`); DTO tách khỏi entity; không lộ trường nhạy cảm
5. Đã thêm test; `./mvnw verify` pass
