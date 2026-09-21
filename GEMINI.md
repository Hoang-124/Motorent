# MOTORENT PROJECT DIRECTIVES & MANDATORY ARCHITECTURE STANDARD

Tất cả các câu lệnh, tác vụ và quá trình sinh mã đều bắt buộc phải tuân thủ 100% các nguyên tắc bất biến sau:

---

## 1. QUY CHUẨN KIẾN TRÚC MÁY CHỦ (SERVER ARCHITECTURE)
Mã nguồn Backend tại `server/src/` bắt buộc phải triển khai theo mô hình **Modular Monolith / Clean Architecture**:
* **`config/`**: Cấu hình môi trường, cơ sở dữ liệu MongoDB, VNPay, Mailer.
* **`core/`**: Tầng Middleware bảo vệ tập trung:
  - `authMiddleware.ts`: Xác thực JWT, giải mã thông tin User.
  - `rbacMiddleware.ts`: Phân quyền nghiêm ngặt 4 vai trò (`SystemAdmin`, `BranchManager`, `Staff`, `Customer`).
  - `auditMiddleware.ts`: Tự động ghi nhật ký mọi hành vi thêm/sửa/xóa nhạy cảm vào bảng `AuditLog`.
  - `uploadMiddleware.ts`: Multer xử lý tải lên ảnh xe, ảnh GPLX/CCCD (eKYC).
  - `errorHandler.ts`: Xử lý ngoại lệ và trả về cấu trúc lỗi chuẩn JSON.
* **`models/`**: 18 Mongoose Models chuẩn hóa đã định nghĩa.
* **`modules/`**: Phân rã nghiệp vụ theo 5 phân hệ độc lập (mỗi module có controller, service, routes):
  - `modules/auth/`: Đăng ký, đăng nhập, eKYC, đổi mật khẩu.
  - `modules/branch/`: Quản lý chi nhánh, tìm kiếm chi nhánh gần nhất theo GPS.
  - `modules/vehicle/`: Quản lý danh mục, đội xe, cảnh báo bảo dưỡng ODO.
  - `modules/booking/`: Luồng thuê xe trung tâm, cọc 30% VNPay, 70% tất toán, chống trùng lịch, Check-in/Check-out.
  - `modules/fleet/`: Lệnh điều chuyển xe (`VehicleTransfer`), Nhật ký bảo dưỡng (`MaintenanceLog`).
  - `modules/hr/`: Xếp ca trực (`StaffSchedule`), điểm danh vào/ra ca.
  - `modules/support/`: Đánh giá 1-1 (`Feedback`), Khiếu nại (`Complaint`), Lịch nhắc SMS (`BookingReminder`).
  - `modules/cms/`: Banner slider, Trang tĩnh, Live Chat Socket.IO.
* **`routes/`**: File `index.ts` tập hợp toàn bộ routes và gắn vào tiền tố `/api`.

---

## 2. QUY ĐỊNH BẮT BUỘC VỀ ICON & ĐỒ HỌA (STRICT SVG ONLY)
* **TUYỆT ĐỐI KHÔNG SỬ DỤNG EMOJI trong giao diện, mã nguồn UI, hoặc các components.**
* **TUYỆT ĐỐI KHÔNG SỬ DỤNG FONT ICON** (FontAwesome, Material Icon font, Icon fonts).
* **CHỈ SỬ DỤNG DUY NHẤT VECTOR SVG:**
  - Định dạng SVG thuần (Inline SVG code) hoặc các component SVG trực tiếp (như Lucide SVG Components / React SVG Icons).
  - Đường nét rõ ràng, sắc nét, có thể đổi màu linh hoạt qua `currentColor` hoặc CSS classes, chuẩn Responsive.

---

## 3. ACTIVE SKILLS ENGINE (HOẠT ĐỘNG THƯỜNG TRỰC TRÊN MỌI LỆNH)
* **obra/superpowers & garrytan/gstack**: Luôn kiểm thử tự động, xác thực thực tế trước khi tuyên bố hoàn thành (`verification-before-completion`).
* **ui-ux-pro-max, taste-skill, awesome-design-md**: Thiết kế chống slop, màu sắc cao cấp, micro-animations mượt mà.
* **mattpocock/skills & anthropics/skills**: TypeScript chặt chẽ, không dùng `any`, kiến trúc Domain-Driven sạch.
* **DietrichGebert/ponytail & juliusbrussee/caveman**: Giao tiếp mật độ thông tin cao, tập trung vào kết quả code thực tế.
* **nousresearch/hermes-agent & last30days-skill**: Tự chủ giải quyết vấn đề, áp dụng công nghệ mới nhất 2026.
