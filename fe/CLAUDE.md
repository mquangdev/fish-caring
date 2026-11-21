# Quy chuẩn Frontend (`fe/`)

Quy chuẩn bắt buộc cho mọi dòng code frontend. Đọc file này cùng `CLAUDE.md` gốc và `docs/spec.md` trước khi sinh hoặc sửa code trong `fe/`. Vi phạm mục "BẮT BUỘC" hoặc "KHÔNG ĐƯỢC" là lỗi, kể cả khi màn hình chạy đúng. Nếu một rule gây vướng, dừng lại và hỏi, không tự lách.

## Stack (cố định)

React 19, Vite, TypeScript (strict), Tailwind CSS 4, React Router, Redux Toolkit, axios, shadcn/ui, Vitest + Testing Library. Không thêm dependency khi chưa hỏi (shadcn/ui và các gói đi kèm đã được duyệt khi cài đặt).

## UI và UX

Người dùng là người chơi cá cảnh dùng điện thoại, nhiều khi tay còn ướt. Giao diện phải dễ chịu, đơn giản và rõ ràng.

- BẮT BUỘC: mobile-first. Thiết kế ở 390px trước rồi mới mở rộng. Vùng chạm tối thiểu 44x44px. Không có tính năng chỉ hoạt động khi hover. Không được vỡ ở desktop (giới hạn bề rộng nội dung bằng `max-w` hợp lý)
- BẮT BUỘC: giữ màn hình gọn gàng, không rối mắt. Mỗi màn hình tối đa **một hành động chính**; hành động phụ dùng kiểu nút nhẹ hơn. Không nhồi nhiều thông tin vào một thẻ. Phân nhóm nội dung bằng khoảng trắng thay vì viền dày
- BẮT BUỘC: dùng **design token** (màu, cỡ chữ, khoảng cách, bo góc) khai báo một chỗ trong theme ở `index.css`. Không hard-code mã màu hex hay số px tuỳ ý trong component. Bám theo thang khoảng cách của Tailwind
- BẮT BUỘC: hỗ trợ chế độ sáng/tối qua biến màu của theme. Độ tương phản chữ đạt WCAG AA. Không dùng màu làm dấu hiệu duy nhất (thêm icon hoặc nhãn)
- BẮT BUỘC: dựng màn hình từ các component dùng chung ở `components/ui` (shadcn/ui: Button, Input, Card, Dialog, ...). Không tự dựng nút hoặc ô nhập dùng một lần. Mọi màn hình cùng một phong cách
- BẮT BUỘC: mọi thao tác bất đồng bộ có đủ ba trạng thái: **đang tải** (skeleton hoặc spinner, khoá nút khi đang gửi), **lỗi** (thông báo tiếng Việt thân thiện kèm nút thử lại) và **rỗng** (một câu thân thiện kèm nút hành động). Báo thành công ngắn gọn (toast)
- BẮT BUỘC: thao tác phá huỷ (xoá) luôn mở hộp thoại xác nhận nói rõ sẽ mất gì. Nút xoá không bao giờ là hành động chính
- BẮT BUỘC: form có nhãn rõ ràng, lỗi hiện ngay cạnh ô nhập, đúng `type`/`inputMode` cho bàn phím điện thoại, `autocomplete` phù hợp, bấm Enter để gửi
- BẮT BUỘC: truy cập cơ bản: `aria-label` cho nút chỉ có icon, thứ tự focus hợp lý, dùng thẻ ngữ nghĩa (`button`, `nav`, `main`, `label`)
- BẮT BUỘC: chữ hiển thị cho người dùng bằng tiếng Việt, ngắn gọn, thân thiện, dùng thuật ngữ nhất quán ("bể", "lịch chăm", "Hoàn thành", "Hoãn đến mai"). Ngày giờ hiển thị dạng `dd/MM/yyyy HH:mm` (giờ Việt Nam, API không trả kèm múi giờ) qua helper trong `lib/`. Không bao giờ hiện chuỗi ISO thô

## Code

- BẮT BUỘC: TypeScript strict. Không dùng `any`, không dùng `@ts-ignore`. Kiểu dữ liệu API khai báo trong `src/api/` (hoặc `src/types/`)
- BẮT BUỘC: dữ liệu từ server nằm trong Redux slice (`createSlice` + `createAsyncThunk`). Mỗi slice theo dõi `status` (`idle | loading | succeeded | failed`) và `error`. Component chỉ dùng `useAppSelector` / `useAppDispatch`, không bao giờ gọi HTTP trực tiếp
- BẮT BUỘC: dùng `axios` cho mọi lời gọi HTTP, KHÔNG dùng `fetch`, và KHÔNG gọi axios hay service trực tiếp trong component/page. Ba lớp tách riêng: `src/api/axiosClient.ts` (**file cấu hình axios duy nhất**: base URL, timeout, interceptor gắn JWT, chuẩn hoá lỗi thành `ApiError`, xử lý 401 qua hàm do store đăng ký), `src/services/XxxService.ts` (mỗi tài nguyên một file, mỗi hàm chỉ gọi axiosClient và trả `response.data`), `src/types/` (kiểu request/response). Luồng: component -> `dispatch(thunk)` -> thunk gọi service -> service dùng axiosClient
- BẮT BUỘC: mọi câu chữ lỗi hiển thị cho người dùng đặt ở `src/lib/messages.ts` (API trả thông điệp tiếng Anh + `code`, FE ánh xạ sang tiếng Việt theo `code`/tên field); validate form phía client ở `src/lib/validation.ts`
- Không dùng `class-variance-authority`: biến thể component viết bằng bảng tra thuần + `cn()` (xem `components/ui/button.tsx`). Khi chạy `shadcn add`, rà lại import này
- BẮT BUỘC: mỗi file một component, tên `PascalCase`. Hook đặt tên `useXxx`. Màn hình theo route nằm ở `pages/`, phần tái sử dụng ở `components/`, hàm thuần ở `lib/` (có test)
- BẮT BUỘC: style bằng class Tailwind và helper `cn()`. Không dùng inline `style`, không viết CSS rời rạc ngoài token toàn cục
- BẮT BUỘC: giữ component nhỏ (tách khi vượt khoảng 150 dòng). Không sao chép cùng một khối UI ba lần, hãy tách thành component

## Test và kiểm tra

- BẮT BUỘC: test logic và các luồng chính bằng Vitest + Testing Library (render, thao tác người dùng, trạng thái đang tải/lỗi/rỗng)
- BẮT BUỘC: trước khi báo hoàn thành, xem màn hình trên trình duyệt ở 390px và ở bề rộng desktop, cả chế độ sáng và tối, và xác nhận không có lỗi console
- `npm run lint`, `npm run typecheck`, `npm test` và `npm run build` đều phải pass

## Checklist trước khi báo hoàn thành

1. Dùng component UI dùng chung và design token, không hard-code màu
2. Có đủ trạng thái tải, lỗi, rỗng; thao tác xoá có xác nhận
3. Chạy tốt ở 390px và desktop, sáng và tối, không có lỗi console
4. Không dùng `any`; không gọi HTTP trực tiếp trong component
5. Nội dung tiếng Việt ngắn, thân thiện, nhất quán; ngày giờ định dạng qua `lib/`
6. Đã thêm test; lint, typecheck, test và build đều pass
