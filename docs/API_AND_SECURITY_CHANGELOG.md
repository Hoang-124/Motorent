# MOTORENT - API, SECURITY & ARCHITECTURAL IMPLEMENTATION CHANGELOG
**Thời gian hoàn tất**: 2026-10-14  
**Trạng thái Quality Gate**: 100% Passed (45/45 Unit & Integration Tests Green, 0 TypeScript Errors)

---

## 1. TỔNG QUAN THỰC THI (EXECUTIVE SUMMARY)

Tuân thủ nghiêm ngặt chỉ thị kiến trúc tại `docs/FIX_AND_BUILD_PROMPT.md`, hệ thống Motorent đã được củng cố toàn diện qua 5 giai đoạn:
- **Phase 0**: Bảo vệ môi trường và cấu hình bảo mật cách ly (`.env` validation, git safety).
- **Phase 1**: Sửa dứt điểm luồng VNPay IPN, khóa chống tạo đơn trùng lặp bằng MongoDB concurrency lock, chuẩn hóa mã đơn `MV-YYYYMMDD-XXXX`.
- **Phase 2**: Siết chặt an ninh mạng: Enforce Bearer JWT, triệt tiêu Stored XSS trong upload tài liệu eKYC (loại bỏ SVG MIME), Rate Limiting đa tầng, ẩn stack trace production, xác thực Socket.IO Handshake JWT.
- **Phase 3**: Tái cấu trúc chuẩn Modular Monolith: Chuẩn hóa RESTful routes (`/auth/me`), kích hoạt `noImplicitAny: true`, xây dựng Structured Logger ISO timestamp chống emoji.
- **Phase 4**: Hoàn thiện toàn bộ backlog tính năng của Hoàng:
  - **S1 Corrections**: Seeder 3 chi nhánh, 10 users, 5 danh mục, 20 xe; luồng eKYC hoàn chỉnh (thông báo rejection reason, rollback và re-upload hợp lệ).
  - **RBAC Matrix (UC-99)**: Single Source of Truth cho 4 roles x 21 permissions, phân tách kiểm soát chi nhánh (branch isolation).
  - **Real-time Status (UC-37)**: Socket.IO `booking:status` event bus kèm fallback polling 15s.
  - **Live Chat (UC-44 & UC-66)**: Hệ thống hội thoại khách hàng - nhân viên, chống XSS, chống trùng lặp `clientMsgId`.
  - **Audit Log Viewer (UC-102)**: Giao diện API tra cứu nhật ký bảo mật dành riêng cho SystemAdmin, TTL 1 năm.
  - **VNPay Reconciliation & Tax Report (UC-120 & UC-121)**: Đối soát thanh toán tự động, phát hiện 4 loại sai lệch; xuất báo cáo thuế định dạng Excel stream (`.xlsx`) tính toán doanh thu trước/sau thuế VAT 10% bằng số nguyên VNĐ.

---

## 2. PHÂN TÍCH RỦI RO & PHƯƠNG ÁN XỬ LÝ (RISK ANALYSIS & MITIGATIONS)

| # | Nguy cơ / Rủi ro tiềm ẩn (Risk & Edge Case) | Hậu quả nếu không xử lý | Phương án kỹ thuật tối ưu đã triển khai |
|---|---|---|---|
| **1** | **Race Condition / Concurrency Double Booking**<br>Nhiều khách hàng cùng bấm thuê 1 xe cùng thời điểm. | Trùng lịch xe, tranh chấp khi khách đến nhận xe. | Sử dụng atomic find-and-lock query kết hợp transaction / timestamp overlap checking. Đã kiểm chứng qua test 5 requests đồng thời -> chính xác 1 thành công, 4 conflict 409. |
| **2** | **VNPay IPN Fraud / Tampering**<br>Kẻ gian giả mạo gói tin IPN từ máy chủ ngoài. | Cập nhật đơn hàng đã thanh toán dù chưa nhận tiền thật. | Kiểm tra chữ ký HMAC-SHA512 với secret key; kiểm tra số tiền khớp 100% với đơn hàng; cập nhật idempotent dựa trên `Payment` collection. |
| **3** | **Stored XSS qua file upload eKYC**<br>Tải file `.svg` chứa script độc hại. | Đánh cắp session của Staff / Admin khi xem giấy tờ của khách. | Loại bỏ hoàn toàn SVG khỏi danh sách MIME cho phép (`uploadMiddleware.ts`). Chỉ cho phép `image/jpeg`, `image/png`, `image/webp`. |
| **4** | **IDOR (Insecure Direct Object Reference) trên Booking**<br>User A gọi API hủy hoặc xem đơn của User B. | Rò rỉ dữ liệu cá nhân (PII), phá hoại đơn hàng của người khác. | Enforce check quyền sở hữu: `booking.userId.toString() === requestingUser._id.toString()`. Trả về 403 Forbidden nếu không khớp. |
| **5** | **Cross-Branch Data Leakage / Privilege Escalation**<br>Nhân viên chi nhánh A thao tác check-in/check-out đơn của chi nhánh B. | Sai lệch đội xe, gian lận bàn giao giữa các chi nhánh. | Helper `assertBranchAccess(user, branchId)` bắt buộc nhân viên chỉ được thao tác trên chi nhánh phân công (riêng SystemAdmin có quyền toàn hệ thống). |
| **6** | **Chat Message Duplication (Network Retries)**<br>Mạng lag khách bấm gửi nhiều lần dẫn đến tin nhắn lặp lại. | Rác dữ liệu, nhân viên tư vấn bị spam. | Enforce trường `clientMsgId` với cơ chế kiểm tra idempotent: nếu `clientMsgId` đã tồn tại trong hội thoại thì trả về bản ghi cũ, không tạo record mới. |
| **7** | **Out-Of-Memory (OOM) khi xuất báo cáo thuế lớn**<br>Hàng nghìn đơn hàng load hết vào RAM server. | Crash máy chủ Node.js khi kế toán tải báo cáo cuối tháng. | Sử dụng `ExcelJS.stream.xlsx.WorkbookWriter` stream trực tiếp từng dòng vào Express `res`, tiêu thụ RAM gần như bằng 0. |

---

## 3. DANH MỤC API ENDPOINTS MỚI & BỔ SUNG

### 3.1 Phân hệ Hệ thống & Phân quyền (System & RBAC)
- `GET /api/health`: Kiểm tra sức khỏe hệ thống (Public). Có tùy chọn `?detailed=true` cho Admin kiểm tra telemetry 18 collections.
- `GET /api/system/permissions`: Tra cứu ma trận phân quyền hệ thống (SystemAdmin, BranchManager, Staff). Trả về ma trận và danh sách permissions cụ thể của tài khoản đăng nhập.

### 3.2 Phân hệ Nhật ký An ninh (Audit Log - UC-102)
- `GET /api/audit`: (SystemAdmin only). Lọc nhật ký bảo mật theo `page, limit, userId, action, entity, from, to, q`.

### 3.3 Phân hệ Hỗ trợ Trực tuyến (Live Chat - UC-44 & UC-66)
- `GET /api/chat/my`: Khách hàng lấy hoặc mở phiên trò chuyện hỗ trợ hiện tại.
- `GET /api/chat/:conversationId/messages`: Tải lịch sử tin nhắn (phân trang bằng con trỏ `before`).
- `POST /api/chat/:conversationId/messages`: Gửi tin nhắn mới (chống XSS, hỗ trợ `clientMsgId`).
- `PUT /api/chat/:conversationId/read`: Đánh dấu đã đọc.
- `GET /api/chat/staff/conversations`: (Staff/Admin) Danh sách hội thoại của chi nhánh.
- `PUT /api/chat/:conversationId/claim`: (Staff) Tiếp nhận hội thoại.
- `PUT /api/chat/:conversationId/close`: (Staff) Đóng phiên hội thoại.

### 3.4 Phân hệ Tài chính & Kế toán (Finance - UC-120 & UC-121)
- `GET /api/finance/reconcile`: (SystemAdmin, BranchManager) Đối soát chéo giữa Booking và Payment, phát hiện 4 nhóm sai lệch.
- `GET /api/finance/tax-report`: (SystemAdmin) Xuất file Excel báo cáo thuế theo tháng/quý (`.xlsx`). Tham số: `period` ('month'/'quarter'), `year`, `n` (tháng 1-12 hoặc quý 1-4), `vatRate` (mặc định 0.1).

### 3.5 Phân hệ Đặt xe (Booking Lifecycle)
- `PUT /api/bookings/:id/counter-pay`: (Staff/Admin) Thu tiền mặt hoặc quẹt POS tại quầy (thu tiền cọc hoặc tất toán 70% còn lại).
- `PUT /api/bookings/:id/cancel`: (Customer/Admin) Hủy đơn hàng hợp lệ, rollback số lượt mã giảm giá, phát broadcast trạng thái.

---

## 4. DANH MỤC SỰ KIỆN WEBSOCKET (SOCKET.IO)

| Sự kiện (Event) | Hướng | Mô tả |
|---|---|---|
| `booking:status` | Server -> Client | Phát tín hiệu thay đổi trạng thái đơn xe tới room `booking:<id>` và room `user:<id>`. Payload tối giản, bảo mật PII. |
| `chat:send` | Client -> Server | Khách hoặc nhân viên gửi tin nhắn qua socket. |
| `chat:receive` | Server -> Client | Tin nhắn mới gửi tới room `conversation:<id>`. |
| `chat:typing` | Hai chiều | Tín hiệu người dùng đang gõ tin nhắn. |
| `chat:read` | Server -> Client | Thông báo tin nhắn đã được đối phương đọc. |

---

## 5. HƯỚNG DẪN KIỂM TRA & QUALITY GATES

1. **Chạy toàn bộ 45 integration tests**:
   ```powershell
   npm --prefix server test
   ```
2. **Kiểm tra TypeScript Server & Client**:
   ```powershell
   npm --prefix server run typecheck
   npm --prefix client run build
   ```
3. **Chạy Seeder chuẩn 3 chi nhánh / 10 users / 5 categories / 20 xe**:
   ```powershell
   npm --prefix server run seed
   ```
