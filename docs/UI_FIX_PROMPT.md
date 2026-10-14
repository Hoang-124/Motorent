# PROMPT: Rà soát & sửa giao diện Motorent (bắt buộc kiểm chứng bằng ảnh chụp)

## Bối cảnh
- Client: `client/` (React 18 + Vite + Tailwind + lucide-react). Dev server: `http://localhost:5173`.
- Tông màu hiện tại: rừng núi tối (nền `#040D08`/`#07100D`, thẻ `#091810`/`#0D1C16`, nhấn `emerald-400/500`).
- Quy tắc dự án: chỉ dùng SVG (không emoji, không font icon), TypeScript strict, không `any`.

## Quy tắc làm việc (KHÔNG được bỏ qua)
1. **Build qua ≠ giao diện đúng.** Mỗi lỗi chỉ được coi là đã sửa khi có ảnh chụp trình duyệt *sau khi sửa* cho thấy đã ổn.
2. Chụp ở 2 kích thước: desktop **1440px** và mobile **390px**.
3. Không tìm–thay màu hàng loạt bằng regex. Sửa từng file, hiểu ý nghĩa của màu trước khi đổi.
4. Sau khi sửa: `npm --prefix client run build` phải ra 0 lỗi, quét emoji trong `client/src` phải ra 0 kết quả.

## Việc 1 — Kiểm chứng các sửa lỗi ở trang chủ (commit `deb815a`)
File: `client/src/components/BookingWidget.tsx`, `client/src/pages/HomePage.tsx`
- [ ] Ô giờ nhận/trả hiện đủ "08:30" và "18:00", không bị cắt.
- [ ] Ô chi nhánh hiện đủ tên (hoặc cắt gọn có dấu "…" chứ không cắt giữa chữ).
- [ ] Nút "Tìm xe phù hợp" nằm trên 1 dòng ở cả desktop lẫn mobile.
- [ ] Ở mobile 390px, form đặt xe về 1 cột, không tràn ngang (không có thanh cuộn ngang).
- [ ] Chữ "& BIỂN CẢ." và chữ "RENT" trong logo đọc rõ trên nền tối.

## Việc 2 — Rà các phần dưới của trang chủ (chưa kiểm tra sau khi sửa)
Chụp và đánh giá: Phòng trưng bày xe, Cung đường (bấm cả ROUTE 01/02/03), Tiêu chuẩn văn minh, 3 Trạm, Bảo tồn, Footer.
Kiểm tra:
- [ ] Phòng trưng bày: bấm từng xe ở danh sách bên phải → khung lớn bên trái đổi đúng xe, ảnh tải được, nút đổi góc chụp hoạt động. Ở mobile, danh sách xe không bị cuộn lồng khó dùng.
- [ ] Ô "Hộp số" trong khung thông số không bị tràn chữ ("Côn Tay Thể Thao" dài).
- [ ] Ảnh lỗi/không có ảnh phải có trạng thái thay thế gọn gàng, không để khung trắng trống.
- [ ] Khoảng cách giữa các phần đồng đều, tiêu đề phần cùng cỡ chữ và cùng kiểu.
- [ ] Footer đọc rõ, link hover thấy được.

## Việc 3 — Sửa lỗi ngữ nghĩa màu do tìm–thay hàng loạt (rủi ro cao)
Lần đổi màu trước đã thay **mọi** `amber` → `emerald` bằng script, làm mất ý nghĩa của màu cảnh báo. Rà và khôi phục:
- [ ] `client/src/utils/validation.ts` (~dòng 205): độ mạnh mật khẩu mức "trung bình" đã bị đổi sang xanh → phải là vàng/cam, nếu không thì trông giống mức "mạnh".
- [ ] `client/src/components/BookingModal.tsx` (~dòng 203–211): khung cảnh báo (AlertCircle) đã bị đổi sang xanh → phải là màu cảnh báo.
- [ ] `client/src/components/Navbar.tsx`: nhãn eKYC "Cần làm" giờ trùng màu với "Đã duyệt" → "Cần làm" phải là màu cảnh báo.
- [ ] `client/src/pages/ProfilePage.tsx`, `CounterDesk.tsx`, `BookingPage.tsx`: kiểm tra mọi badge trạng thái (Pending, Rented, Maintenance, Rejected, quá hạn, chưa thanh toán…). Mỗi trạng thái phải có màu khác nhau, có ý nghĩa: xanh = ổn, vàng = chờ/cảnh báo, đỏ = lỗi/từ chối, xám = không hoạt động.
- [ ] `client/src/utils/watermark.ts` dòng 86 dùng amber có chủ đích (điều khoản cảnh báo trên ảnh) → giữ nguyên.
- [ ] Tìm các chỗ có `text-[#050D0A]` / `text-[#06100C]` (chữ tối) nằm trên nền không phải emerald → chữ sẽ không đọc được.

## Việc 4 — Rà các trang con (chưa từng mở xem sau khi đổi màu)
Chụp desktop + mobile cho từng trang: `/bikes`, `/branches`, `/booking/:id` (lấy id từ một xe bất kỳ), `/login`, `/register`, `/forgot-password`, `/profile` (cần đăng nhập), `/counter` (tài khoản Staff).
Mỗi trang kiểm tra:
- [ ] Không có chữ tối trên nền tối hoặc chữ sáng trên nền sáng.
- [ ] Nút chính (CTA) đọc rõ: nền emerald thì chữ tối, nền tối thì chữ sáng.
- [ ] Ô nhập, dropdown, date picker không bị cắt chữ.
- [ ] Còn sót màu xanh dương/cam cũ không khớp tông (trừ màu cảnh báo có chủ đích ở Việc 3).
- [ ] Mobile 390px không tràn ngang.

## Việc 5 — Báo cáo
Trả về bảng: `Trang/Phần | Lỗi tìm thấy | Đã sửa (file:dòng) | Ảnh trước | Ảnh sau`.
Liệt kê riêng những gì **chưa kiểm chứng được** (ví dụ: không đăng nhập được Staff để xem `/counter`). Không ghi "hoàn thành" cho mục chưa có ảnh sau khi sửa.
Commit: `fix(ui): visual QA pass — status colors, subpages, mobile`.
