# MOTORENT — Hệ Thống Chuỗi Quản Lý & Cho Thuê Xe Máy Tự Lái Đa Chi Nhánh (TP. Đà Nẵng)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

> **MOTORENT** là nền tảng quản lý và vận hành chuỗi cho thuê xe máy tự lái đa chi nhánh tại **TP. Đà Nẵng**. Hệ thống giải quyết trọn vẹn bài toán giao nhận xe liên trạm giữa **Chi nhánh Sân Bay Quốc Tế Đà Nẵng (`CN-DAD`)** và **Chi nhánh Bãi Biển Mỹ Khê (`CN-MK`)**, số hóa định danh eKYC (mã hóa AES-256-GCM, không giữ giấy tờ tùy thân gốc), hợp đồng điện tử song phương, thanh toán cọc 30% / 100% qua VNPay & VietQR, và tối ưu hóa lịch phân ca nhân sự bằng AI.

---

## Mục Lục
1. [Thành Viên Nhóm Phát Triển (Group 4)](#thành-viên-nhóm-phát-triển-group-4)
2. [Tổng Quan & Giá Trị Khác Biệt](#tổng-quan--giá-trị-khác-biệt)
3. [Kiến Trúc Máy Chủ Modular Monolith](#kiến-trúc-máy-chủ-modular-monolith)
4. [Mô Hình Dữ Liệu 24 Bảng](#mô-hình-dữ-liệu-24-bảng)
5. [Quy Chuẩn Thẩm Mỹ Dark Luxury & STRICT SVG ONLY](#quy-chuẩn-thẩm-mỹ-dark-luxury--strict-svg-only)
6. [Hướng Dẫn Cài Đặt, Kiểm Thử & Khởi Chạy](#hướng-dẫn-cài-đặt-kiểm-thử--khởi-chạy)
7. [Tài Khoản Thử Nghiệm Mẫu (9 Tài Khoản Seed)](#tài-khoản-thử-nghiệm-mẫu-9-tài-khoản-seed)
8. [Danh Sách REST API & Realtime Socket.IO](#danh-sách-rest-api--realtime-socketio)
9. [Quy Chuẩn Tài Liệu](#quy-chuẩn-tài-liệu)

---

## Thành Viên Nhóm Phát Triển (Group 4)

| STT | Họ và Tên | Vai trò | Trọng tâm phụ trách |
| :---: | :--- | :--- | :--- |
| **1** | **Trần Quang Bửu Hoàng** *(Leader)* | Team Leader / Full-Stack | Kiến trúc Modular Monolith, RBAC & AuditLog, Auth/Google OAuth2/eKYC Vault, Đặt xe & Giỏ xe, VNPay/VietQR, Hợp đồng điện tử song phương, Giao xe tận nơi, AI tối ưu hóa phân ca, Live Chat, Báo cáo Admin & toàn bộ bộ tài liệu kỹ thuật |
| **2** | **Phạm Quốc Cả** | Business Analyst / Backend | Phân tích nghiệp vụ (SRS), Quản lý chi nhánh, Tìm kiếm trạm theo bản đồ GPS, Nhân sự trạm, Ca trực cơ bản & Danh mục khuyến mãi |
| **3** | **Nguyễn Thái Dương** | Full-Stack Developer | Đặt xe, Gia hạn thuê (cảnh báo đa kênh), Hủy đơn theo điều khoản KHÔNG HOÀN TIỀN, Nghiệp vụ quầy Check-in/Check-out liên trạm, Tính phí phạt & Xuất hợp đồng/hóa đơn PDF |
| **4** | **Nguyễn Hữu Tài** | Full-Stack Developer | Danh mục đội xe, Bộ lọc tìm kiếm, Cấu hình biểu giá mùa vụ, Cảnh báo bảo dưỡng định kỳ theo ODO (1.500 km) & Điều chuyển xe liên trạm |
| **5** | **Phạm Tuyên** | Frontend Developer | Danh sách xe yêu thích (Wishlist), Đánh giá sao sau chuyến đi (Reviews), Khiếu nại (Complaints), Thông báo nhắc lịch, Tích điểm Loyalty & CMS Banner/Trang tĩnh |

---

## Tổng Quan & Giá Trị Khác Biệt

* **Không Giữ CCCD Bản Gốc (eKYC Vault AES-256-GCM)**: Hồ sơ CCCD/GPLX/Selfie được đóng dấu bảo mật watermark và mã hóa nhị phân chuẩn `MRENC1` theo Nghị định 13/2023/NĐ-CP; khách hàng toàn quyền giữ giấy tờ gốc.
* **Cơ Chế Đặt Xe Đơn Lẻ & Giỏ Xe Đa Phương Tiện**: Khóa độc quyền biển số xe nguyên tử (`withResourceLock`), hỗ trợ cọc 30% hoặc thanh toán đủ 100% qua VNPay HMAC-SHA512 và VietQR, tất toán phần còn lại tại quầy.
* **Giao Nhận Liên Trạm & Tận Nơi**: Trả xe khác chi nhánh giữa Sân bay Đà Nẵng (`CN-DAD`) và Bãi biển Mỹ Khê (`CN-MK`) với phụ phí chuyển trạm `0đ`; hỗ trợ giao/nhận tận nơi nội thành (`40.000 đ/chiều`, `80.000 đ` khứ hồi).
* **Hợp Đồng Điện Tử Song Phương & Check-in/Check-out 4 Góc**: Ký xác nhận điện tử giữa Đại diện Motorent (Bên A) và Khách thuê (Bên B), chụp đối chiếu 04 góc xe + ODO, tự động tính phí trả trễ (`30.000 đ/giờ` sau 15 phút ân hạn) và áp dụng điều khoản **KHÔNG HOÀN TIỀN** khi tự hủy/trả sớm.
* **AI Xếp Lịch Phân Ca Nhân Sự**: Kết hợp Google Gemini (`geminiShiftService.ts`) và bộ giải quyết định `MOTORENT-Rule-v2` phân tích mật độ giao/nhận xe, độ tin cậy chuyên cần Bayes, chỉ số công bằng Jain và ngôn ngữ tự nhiên tiếng Việt.

---

## Kiến Trúc Máy Chủ Modular Monolith

Dự án được tổ chức theo mô hình **Client-Server Monorepo** với kiến trúc **Modular Monolith / Clean Architecture**:

```text
Motorent/
├── client/                     # Frontend SPA (React + TypeScript + Vite + Tailwind CSS)
│   ├── vercel.json             # Cấu hình SPA rewrite cho môi trường triển khai Vercel
│   ├── vite.config.ts          # Vite dev server (:5173) kèm proxy /uploads -> :5000
│   └── src/
│       ├── components/         # UI Components chuẩn SVG (Navbar, LiveChatWidget, ShiftCalendarView, FinanceManager, ReportsCenter...)
│       ├── context/            # AuthContext, CartContext, WishlistContext, ThemeContext, I18nContext
│       ├── i18n/               # Từ điển song ngữ Việt - Anh & bộ dịch tự động runtime
│       ├── pages/              # Các trang nghiệp vụ theo 4 vai trò (SystemAdmin, BranchManager, Staff, Customer)
│       ├── services/           # Axios client (tự động gắn Bearer JWT + HMAC-SHA256 CSRF token) & Socket.IO client
│       └── types/              # Định nghĩa kiểu TypeScript chặt chẽ (Zero any)
│
├── server/                     # Backend Modular Monolith (Node.js + Express + TypeScript + Mongoose)
│   ├── src/
│   │   ├── config/             # env.ts (Zod), database.ts, mailer.ts, cloudinary.ts, pdfFonts.ts
│   │   ├── core/               # authMiddleware, rbacMiddleware, auditMiddleware, securityMiddleware, cryptoVault, resourceLock, jobs/
│   │   ├── models/             # 24 Mongoose Models chuẩn hóa (kèm ComplaintResponse & ComplaintStatusLog)
│   │   ├── modules/            # 22 Module nghiệp vụ độc lập:
│   │   │   ├── admin/          # Thống kê chuỗi & quản trị người dùng SystemAdmin
│   │   │   ├── audit/          # Tra cứu nhật ký kiểm toán bảo mật (SystemAdmin)
│   │   │   ├── auth/           # Đăng ký OTP, đăng nhập, Google OAuth2, eKYC Vault, hồ sơ
│   │   │   ├── booking/        # Luồng đặt xe, giỏ xe, hợp đồng PDF, Check-in/Check-out, gia hạn
│   │   │   ├── branch/         # Quản lý chi nhánh & tìm trạm gần nhất theo GPS Haversine
│   │   │   ├── category/       # Danh mục phân khúc xe
│   │   │   ├── chat/           # Tổng đài Live Chat thời gian thực phân lập theo chi nhánh
│   │   │   ├── cms/            # Quản trị Banner trang chủ & Trang tĩnh chính sách (TipTap HTML)
│   │   │   ├── discount/       # Quản lý chương trình khuyến mãi & mã giảm giá
│   │   │   ├── finance/        # Đối soát sổ cái VNPay/VietQR/Quầy & Xuất báo cáo thuế ExcelJS (.xlsx)
│   │   │   ├── fleet/          # Điều chuyển xe liên trạm, Nhật ký bảo dưỡng & Dashboard đội xe
│   │   │   ├── hr/             # Quản lý nhân sự, Chấm công ca kép & AI Shift Optimizer
│   │   │   ├── loyalty/        # Tích điểm thưởng chuyến đi, giới thiệu bạn bè & đổi voucher
│   │   │   ├── notifications/  # Thông báo in-app & đồng bộ huy hiệu Socket.IO thời gian thực
│   │   │   ├── payment/        # Cổng thanh toán VNPay Sandbox (IPN + Return) & VietQR
│   │   │   ├── pricing/        # Quy tắc giá thuê linh hoạt theo mùa vụ / lễ tết
│   │   │   ├── report/         # Báo cáo doanh thu, hiệu suất xe, KPI nhân sự & Dự báo nhu cầu (PDF/Excel)
│   │   │   ├── review/         # Đánh giá sao & hình ảnh thực tế sau chuyến đi
│   │   │   ├── support/        # Vòng đời Khiếu nại (Open -> InProgress -> Resolved -> Closed) & Feedback
│   │   │   ├── system/         # Health check, Ma trận quyền RBAC, Cấu hình hệ thống & Đa ngôn ngữ i18n
│   │   │   ├── vehicle/        # Quản trị đội xe, tình trạng khai thác & cảnh báo ODO
│   │   │   └── wishlist/       # Đồng bộ danh sách xe yêu thích của khách hàng
│   │   ├── routes/index.ts     # Tập hợp toàn bộ routes gắn vào tiền tố /api
│   │   ├── seeders/seed.ts     # Khởi tạo 2 chi nhánh, 9 tài khoản, 5 danh mục, 20 xe mẫu
│   │   └── server.ts           # Entry point Express + Helmet + CSRF + CORS + Socket.IO ("/" & "/chat")
│   └── tests/                  # Bộ kiểm thử tự động Vitest
│
├── docs/                       # Bộ tài liệu bàn giao chính thức (RDS, SDS, Final Release, Tracking, Issues)
├── package.json                # Scripts điều phối toàn workspace
└── README.md
```

---

## Mô Hình Dữ Liệu 24 Bảng

Hệ thống chuẩn hóa **24 Mongoose Models** trong `server/src/models/` (cùng các bảng phụ nhật ký khiếu nại `ComplaintResponse`, `ComplaintStatusLog`):

| # | Tên Model | File định nghĩa | Mục đích nghiệp vụ |
| :---: | :--- | :--- | :--- |
| 1 | `Branch` | `Branch.ts` | Quản lý các chi nhánh tại Đà Nẵng (`CN-DAD`, `CN-MK`), tọa độ GPS, giờ đóng/mở cửa, quản lý trạm |
| 2 | `User` | `User.ts` | Tài khoản 4 vai trò (`SystemAdmin`, `BranchManager`, `Staff`, `Customer`), eKYC AES-256-GCM, `tokenVersion`, khóa tạm thời |
| 3 | `Category` | `Category.ts` | 5 phân khúc xe chuẩn (`Xe tay ga`, `Xe số`, `Xe côn tay`, `Xe 50cc`, `Xe máy điện`) |
| 4 | `Vehicle` | `Vehicle.ts` | Tài sản xe theo biển số, giá giờ/ngày, ODO, cờ bảo dưỡng định kỳ 1.500 km, điểm sao trung bình |
| 5 | `SeasonalPricingRule` | `SeasonalPricingRule.ts` | Quy tắc hệ số điều chỉnh giá thuê theo mùa cao điểm, lễ hội hoặc ưu đãi |
| 6 | `Booking` | `Booking.ts` | Hợp đồng thuê xe, trạm nhận/trả, giao xe tận nơi, cọc 30%/100%, ảnh 4 góc, chữ ký song phương |
| 7 | `Payment` | `Payment.ts` | Sổ cái bút toán thanh toán (`DEPOSIT`, `FULL`, `COUNTER`, `REFUND`) đối soát với VNPay/VietQR |
| 8 | `Review` | `Review.ts` | Đánh giá sao (1–5) và hình ảnh thực tế của khách hàng sau chuyến thuê hoàn tất |
| 9 | `Wishlist` | `Wishlist.ts` | Danh sách phương tiện yêu thích được lưu theo từng khách hàng |
| 10 | `VehicleTransfer` | `VehicleTransfer.ts` | Lệnh điều chuyển phương tiện liên chi nhánh và lịch sử phê duyệt |
| 11 | `MaintenanceLog` | `MaintenanceLog.ts` | Phiếu bảo dưỡng, thay nhớt định kỳ và chi phí sửa chữa kỹ thuật |
| 12 | `StaffSchedule` | `StaffSchedule.ts` | Lịch phân ca trực (`Morning`, `Afternoon`, `Evening`, `FullDay`) và chấm công vào/ra ca |
| 13 | `StaffAvailability` | `StaffAvailability.ts` | Đăng ký lịch rảnh/bận theo tuần của nhân viên phục vụ thuật toán xếp ca AI |
| 14 | `Complaint` | `Complaint.ts` | Hồ sơ khiếu nại khách hàng kèm nhật ký phản hồi (`ComplaintResponse`) & chuyển trạng thái (`ComplaintStatusLog`) |
| 15 | `Feedback` | `Feedback.ts` | Phản hồi chất lượng dịch vụ hiển thị công khai trên trang chủ |
| 16 | `AuditLog` | `AuditLog.ts` | Nhật ký kiểm toán bất biến cho mọi thao tác nhạy cảm, tự động ẩn khóa/mật khẩu |
| 17 | `Discount` | `Discount.ts` | Chương trình khuyến mãi công khai và mã voucher đổi điểm Loyalty cá nhân |
| 18 | `Notification` | `Notification.ts` | Thông báo thời gian thực đẩy qua Socket.IO cho khách hàng và nhân sự vận hành |
| 19 | `BookingReminder` | `BookingReminder.ts` | Lịch quét tự động nhắc giờ nhận xe và trả xe qua Email/In-app |
| 20 | `Conversation` | `Conversation.ts` | Phiên hội thoại Live Chat gắn riêng từng khách hàng với từng chi nhánh |
| 21 | `Message` | `Message.ts` | Tin nhắn chi tiết, chống trùng `clientMsgId` và trạng thái đã đọc trong Live Chat |
| 22 | `Banner` | `Banner.ts` | Chuỗi banner quảng cáo trang chủ hỗ trợ xóa mềm và chuẩn hóa thứ tự `1..n` |
| 23 | `StaticPage` | `StaticPage.ts` | Quản trị nội dung HTML đã làm sạch (`faq`, `terms`, `privacy`, `dieu-khoan-dich-vu`, `chinh-sach-bao-mat`) |
| 24 | `SystemConfig` | `SystemConfig.ts` | Cấu hình thông số hệ thống và bộ từ điển ghi đè đa ngôn ngữ (`vi` / `en`) |

---

## Quy Chuẩn Thẩm Mỹ Dark Luxury & STRICT SVG ONLY

1. **Ngôn Ngữ Thiết Kế Dark Luxury Atelier**:
   * Nền chủ đạo Obsidian tinh giản: `#101010` (Canvas chính) và `#161616` / `#181818` (Thẻ nghiệp vụ tách lớp bằng viền mảnh `border-white/10`).
   * Điểm nhấn thương hiệu Peach-Gold ấm áp: `#FFC799` (CTA chính, tiêu đề nhấn) kết hợp Mint `#99FFE4` (trạng thái xác thực / hoàn tất).
   * Hệ thống hỗ trợ chuyển đổi linh hoạt Sáng / Tối (`ThemeContext`) và Song ngữ Việt / Anh (`I18nContext`).
2. **Quy Chuẩn Bắt Buộc `STRICT SVG ONLY`**:
   * **TUYỆT ĐỐI 0 EMOJI** trong toàn bộ giao diện, mã nguồn UI và thông báo hiển thị.
   * **TUYỆT ĐỐI 0 FONT ICON** bên ngoài (không dùng FontAwesome / Material Icons font).
   * **100% Vector SVG thuần** (`lucide-react` và inline SVG components), sắc nét trên mọi độ phân giải màn hình.

---

## Hướng Dẫn Cài Đặt, Kiểm Thử & Khởi Chạy

### Yêu cầu tiên quyết
* **Node.js**: Phiên bản `>= 20.x` (tương thích `>= 18.18+`).
* **MongoDB**: MongoDB cục bộ (`mongodb://127.0.0.1:27017/motorent_db`) hoặc MongoDB Atlas URI.

### Bước 1: Cài đặt dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### Bước 2: Cấu hình biến môi trường
```bash
cp server/.env.example server/.env
```
Đảm bảo `JWT_SECRET` có độ dài tối thiểu từ 32 ký tự trở lên (tùy chọn cấu hình thêm `GEMINI_API_KEY`, `CLOUDINARY_*`, `SMTP_*` nếu sử dụng dịch vụ đám mây ngoài).

### Bước 3: Nạp dữ liệu khởi tạo chuẩn (Seeder)
```bash
npm run seed
```
Khởi tạo idempotent: **02 chi nhánh (`CN-DAD`, `CN-MK`)**, **09 tài khoản phân quyền**, **05 danh mục xe**, **20 phương tiện mẫu**, **02 mã giảm giá**, cùng hệ thống **Banner & Trang chính sách**.

### Bước 4: Kiểm tra kiểu dữ liệu, chạy bộ kiểm thử tự động & đóng gói
```bash
# Kiểm tra TypeScript toàn dự án (Server + Client)
npm run typecheck

# Chạy toàn bộ bộ kiểm thử tự động Vitest trên Server + Lint kiểu Client
npm test

# Đóng gói bản dựng Production cho Frontend
npm run build
```

### Bước 5: Khởi chạy môi trường phát triển
```bash
npm run dev
```
* **Frontend Web App**: [http://localhost:5173/](http://localhost:5173/)
* **Backend API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Tài Khoản Thử Nghiệm Mẫu (9 Tài Khoản Seed)

Sau khi chạy `npm run seed`, hệ thống cung cấp 9 tài khoản chuẩn cho 4 vai trò:

| Vai trò | Tên đăng nhập | Email | Mật khẩu mặc định | Chi nhánh / Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **SystemAdmin** | `admin` | `admin@motorent.vn` | `Admin@123456` | Quản trị toàn chuỗi hệ thống |
| **BranchManager** | `manager_dad` | `manager.dad@motorent.vn` | `Manager@123456` | Quản lý Chi nhánh Sân Bay Quốc Tế Đà Nẵng (`CN-DAD`) |
| **BranchManager** | `manager_mk` | `manager.mk@motorent.vn` | `Manager@123456` | Quản lý Chi nhánh Bãi Biển Mỹ Khê (`CN-MK`) |
| **Staff** | `staff_dad` | `staff.dad@motorent.vn` | `Staff@123456` | Nhân viên điều phối Sân Bay Đà Nẵng (`CN-DAD`) |
| **Staff** | `staff_mk` | `staff.mk@motorent.vn` | `Staff@123456` | Nhân viên điều phối Bãi Biển Mỹ Khê (`CN-MK`) |
| **Customer** | `customer_hoang` | `hoang.nguyen@gmail.com` | `Customer@123456` | Khách hàng (Đã xác thực Email & eKYC `Verified`) |
| **Customer** | `customer_linh` | `linh.tran@gmail.com` | `Customer@123456` | Khách hàng (Đã xác thực Email & eKYC `Verified`) |
| **Customer** | `customer_tuan` | `tuan.le@gmail.com` | `Customer@123456` | Khách hàng (Đã xác thực Email & eKYC `Verified`) |
| **Customer** | `customer_mai` | `mai.phuong@gmail.com` | `Customer@123456` | Khách hàng (Đã xác thực Email & eKYC `Verified`) |

---

## Danh Sách REST API & Realtime Socket.IO

Toàn bộ REST API nghiệp vụ được gắn dưới tiền tố `/api` và bảo vệ bởi CSRF HMAC-SHA256 + JWT + RBAC:

* **Hệ thống & Quản trị (`/api/health`, `/api/system/*`, `/api/admin/*`, `/api/audit`)**: Kiểm tra sức khỏe dịch vụ, ma trận phân quyền RBAC, cấu hình chính sách, từ điển đa ngôn ngữ `vi`/`en`, quản trị tài khoản và nhật ký kiểm toán (`SystemAdmin`).
* **Xác thực & Định danh eKYC (`/api/auth/*`)**: Đăng ký OTP 6 số, đăng nhập mật khẩu & Google OAuth2, tải/xem/duyệt hồ sơ eKYC mã hóa riêng tư, đổi/đặt lại mật khẩu.
* **Chi nhánh, Đội xe & Giá mùa vụ (`/api/branches/*`, `/api/categories/*`, `/api/vehicles/*`, `/api/transfers/*`, `/api/maintenance/*`, `/api/fleet/*`)**: Tìm trạm gần nhất theo GPS, quản lý xe & phân khúc, cấu hình giá mùa vụ, điều chuyển xe liên trạm và bảo dưỡng kỹ thuật.
* **Đặt xe, Thanh toán & Loyalty (`/api/bookings/*`, `/api/payments/*`, `/api/discounts/*`, `/api/loyalty/*`)**: Tạm tính giá thuê, đặt xe đơn/giỏ xe, VNPay Sandbox (`create`, `vnpay_return`, `vnpay_ipn`), VietQR, thu tiền tại quầy, ký hợp đồng điện tử song phương, xuất hợp đồng PDF, gia hạn thuê và đổi điểm thưởng.
* **Nhân sự & Lịch phân ca AI (`/api/staff/*`, `/api/schedules/*`)**: Quản lý nhân viên chi nhánh, đăng ký lịch rảnh tự nhiên tiếng Việt, tối ưu hóa phân ca tuần bằng Gemini AI / Heuristic `MOTORENT-Rule-v2`, chấm công ca đơn & ca kép.
* **Hỗ trợ, Đánh giá, Yêu thích & CMS (`/api/complaints/*`, `/api/me/complaints/*`, `/api/staff/complaints/*`, `/api/manager/complaints/*`, `/api/reviews/*`, `/api/wishlist/*`, `/api/chat/*`, `/api/notifications/*`, `/api/banners/*`, `/api/pages/*`)**: Vòng đời xử lý khiếu nại 4 bước, đánh giá sao kèm ảnh, danh sách xe yêu thích, Live Chat thời gian thực trên cả 2 namespace `/` và `/chat`, cùng quản trị Banner & Trang tĩnh.
* **Đối soát Tài chính & Báo cáo (`/api/finance/*`, `/api/reports/*`)**: Đối soát dòng tiền theo chi nhánh, kết xuất sổ cái thuế GTGT ExcelJS (`.xlsx`), báo cáo doanh thu/công suất đội xe/KPI nhân sự/dự báo nhu cầu xuất PDF & Excel.

---

## Quy Chuẩn Tài Liệu

* **Đặc tả Yêu cầu & Thiết kế (RDS Final)**: [docs/MOTORENT_RDS_Final.docx](file:///d:/Motorent/docs/MOTORENT_RDS_Final.docx)
* **Đặc tả Thiết kế Phần mềm (SDS Final)**: [docs/MOTORENT_SDS_Final.docx](file:///d:/Motorent/docs/MOTORENT_SDS_Final.docx)
* **Tài liệu Bàn giao & Hướng dẫn sử dụng (Final Release Document)**: [docs/MOTORENT_Final_Release_Document.docx](file:///d:/Motorent/docs/MOTORENT_Final_Release_Document.docx)
* **Bảng theo dõi tiến độ dự án (Project Tracking)**: [docs/MOTORENT_Project_Tracking.xlsx](file:///d:/Motorent/docs/MOTORENT_Project_Tracking.xlsx)
* **Báo cáo 160 GitHub Issues (Issues Report)**: [docs/MOTORENT_Issues_Report.xlsx](file:///d:/Motorent/docs/MOTORENT_Issues_Report.xlsx)
* **Bảng đóng góp thành viên & phân công tài liệu**: [docs/README.md](file:///d:/Motorent/docs/README.md)

---

## Giấy Phép & Bản Quyền

Dự án được phân phối dưới giấy phép **MIT License**. Toàn bộ mã nguồn và tài liệu thuộc về **Nhóm 4 (Group 4) — Dự án MOTORENT**.
