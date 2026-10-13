# MOTORENT - Hệ Thống Chuỗi Quản Lý & Cho Thuê Xe Máy Tự Lái Đa Chi Nhánh

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

> **MOTORENT** là nền tảng quản lý và vận hành chuỗi cho thuê xe máy tự lái tự doanh đa chi nhánh tại **TP. Đà Nẵng**. Hệ thống giải quyết trọn vẹn bài toán di chuyển liên trạm (thuê tại Sân bay Quốc tế Đà Nẵng - trả tại Bãi biển Mỹ Khê hoặc Cầu Rồng), loại bỏ rủi ro giữ giấy tờ tùy thân của khách bằng quy trình eKYC số hóa, và tối ưu hóa điều chuyển xe nội bộ giữa các cơ sở.

---

## Mục Lục
1. [Tổng Quan & Giá Trị Khác Biệt](#tổng-quan--giá-trị-khác-biệt)
2. [Kiến Trúc Máy Chủ Modular Monolith](#kiến-trúc-máy-chủ-modular-monolith)
3. [Phân Hệ Chức Năng](#phân-hệ-chức-năng)
4. [Mô Hình Dữ Liệu 18 Bảng](#mô-hình-dữ-liệu-18-bảng)
5. [Quy Chuẩn Thẩm Mỹ & STRICT SVG ONLY](#quy-chuẩn-thẩm-mỹ--strict-svg-only)
6. [Hướng Dẫn Cài Đặt & Khởi Chạy](#hướng-dẫn-cài-đặt--khởi-chạy)
7. [Tài Khoản Thử Nghiệm Mẫu](#tài-khoản-thử-nghiệm-mẫu)
8. [Danh Sách REST API Toàn Hệ Thống](#danh-sách-rest-api-toàn-hệ-thống)
9. [Quy Chuẩn Tài Liệu](#quy-chuẩn-tài-liệu)

---

## Tổng Quan & Giá Trị Khác Biệt

MOTORENT được thiết kế chuẩn hóa theo quy trình vận hành thực tế của chuỗi cho thuê xe máy tại TP. Đà Nẵng:

* **Không Giữ CCCD Bản Gốc**: Khách hàng chỉ cần xuất trình giấy tờ tùy thân và GPLX qua quy trình eKYC đối chiếu. Khách toàn quyền giữ lại bản gốc khi tham gia giao thông.
* **Cơ Chế Cọc 30% Minh Bạch**: Khách thanh toán cọc 30% online để hệ thống tự động khóa giữ đúng biển số xe, 70% còn lại tất toán tại quầy chi nhánh khi nhận xe và kiểm tra biên bản.
* **Thuê Xe Một Chiều (One-Way Rental)**: Hỗ trợ linh hoạt nhận xe tại Cửa ngõ (Sân bay Quốc tế Đà Nẵng) và trả xe tại trạm Ven biển (Bãi biển Mỹ Khê) hoặc Trung tâm (Cầu Rồng) mà không tính phụ phí chuyển trạm.
* **Quầy Tiếp Tân Kỹ Thuật Số (Counter Desk)**: Bàn làm việc cho nhân viên tại trạm xử lý check-in đối chiếu 5 điểm an toàn, lưu ODO ban đầu, chữ ký số điện tử trên canvas và check-out tự động tính phụ thu trễ giờ (`30.000 đ/giờ`).
* **Gói An Tâm Chu Đáo**: Mỗi xe cho thuê đi kèm 2 mũ bảo hiểm đạt chuẩn kiểm định CR khử khuẩn, 2 áo mưa tiện lợi dự phòng và giá kẹp điện thoại phượt.

---

## Kiến Trúc Máy Chủ Modular Monolith

Dự án được tổ chức theo mô hình **Client-Server Monorepo** với kiến trúc **Modular Monolith / Clean Architecture**:

```text
Motorent/
├── client/                     # Frontend Single Page Application (React 18 + Vite + Tailwind 3)
│   ├── public/                 # Static assets, SVG bike illustrations & SVG Favicon
│   └── src/
│       ├── components/         # Reusable UI components (Navbar, Footer, BookingWidget, VehicleCard, BookingModal, RequireRole)
│       ├── context/            # AuthContext (motorent_token, 401 interceptor)
│       ├── pages/              # Main routes (HomePage, FleetPage, BranchesPage, CounterDesk, ProfilePage, Login/Register)
│       ├── services/           # Axios HTTP client with auto 401 redirect & token injection
│       ├── types/              # Strict TypeScript definitions (Vehicle, Branch, Booking, User, Feedback, Notification, Category)
│       ├── App.tsx             # React Router routing configuration with RequireRole guards
│       └── index.css           # Custom emerald design tokens & Tailwind utilities
│
├── server/                     # Backend Modular Monolith (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/             # Database connection, mailer, env.ts (Zod schema fail-fast startup)
│   │   ├── core/               # Middleware layer (authMiddleware, rbacMiddleware, auditMiddleware with redaction, errorHandler)
│   │   ├── models/             # 18 normalized Mongoose schemas & domain types
│   │   ├── modules/            # Feature-based business modules:
│   │   │   ├── auth/           # Login, Google OAuth2 verifyIdToken, register, OTP 60s, eKYC, profile, password
│   │   │   ├── branch/         # Branch CRUD, nearby GPS lookup, vehicle ready counts
│   │   │   ├── vehicle/        # Fleet CRUD, pagination, filtering, category listing
│   │   │   ├── booking/        # Central booking engine, atomic overlap check, 30% deposit, checkin/checkout state machine
│   │   │   ├── support/        # Public customer feedbacks, complaints
│   │   │   ├── fleet/          # Vehicle transfers and maintenance logs
│   │   │   ├── hr/             # Staff schedules and shift attendance
│   │   │   └── cms/            # Banners, static pages, live chat
│   │   ├── routes/             # Central index.ts aggregator mounting all modules to /api
│   │   ├── seeders/            # seed.ts (3 branches, 11 users, 5 categories, 21 vehicles, MV- codes)
│   │   └── server.ts           # Slim entry point: Helmet, CORS whitelist, Socket.IO, routes, errorHandler
│   ├── tsconfig.json           # Strict TypeScript configuration
│   └── package.json
│
├── docs/                       # Technical specifications & business requirements
│   ├── README.md               # Documentation guide & Canonical SRS reference
│   ├── MOTORENT_SRS_Document.md # CANONICAL SINGLE SOURCE OF TRUTH (SRS)
│   └── MOTORENT_TASK_MATRIX.tsv # Detailed status matrix across all user stories
├── package.json                # Root orchestration scripts
└── README.md
```

---

## Phân Hệ Chức Năng

### 1. Giao Diện Khách Hàng (Customer Experience)
* **Widget Tìm & Giữ Xe Nhanh**: Chọn điểm nhận, điểm trả độc lập, thời gian thuê với tính toán số ngày tức thời theo múi giờ địa phương.
* **Đội Xe & Phân Loại Động**: Đồng bộ danh mục từ `GET /api/categories` (Xe tay ga, Xe số, Côn tay, Xe máy điện, Phân khối lớn), lọc theo chi nhánh, sắp xếp theo đơn giá thuê.
* **Modal Đặt Xe Bảo Mật**: Kiểm tra đăng nhập bắt buộc, tự động điền danh tính từ hồ sơ, kiểm tra chồng lấn lịch nguyên tử (chống trùng lịch 409), hiển thị thông báo lỗi thật từ máy chủ.
* **Mạng Lưới 3 Chi Nhánh**: Danh bạ 3 cơ sở tại Đà Nẵng (Sân bay, Bãi biển Mỹ Khê, Cầu Rồng) với số lượng xe sẵn sàng thời gian thực.
* **Đánh Giá Khách Hàng Thực Tế**: Tải trực tiếp phản hồi từ `GET /api/feedbacks/public`.

### 2. Bàn Làm Việc Tiếp Tân Quầy (Staff Counter Desk)
* **Bảo Vệ Quyền Truy Cập (`RequireRole`)**: Chỉ nhân viên thuộc vai trò `Staff`, `BranchManager`, hoặc `SystemAdmin` mới có thể truy cập `/counter`.
* **Tra Cứu Mã Đặt Xe**: Tìm kiếm tức thì theo mã đơn `MV-xxxxxx`.
* **Quy Trình Check-in Nhận Xe**:
  * Ghi nhận chỉ số ODO công-tơ-mét ban đầu.
  * Biên bản kiểm tra 5 tiêu chuẩn an toàn (Lốp xe, Phanh, Đèn xi-nhan, Xăng/Pin, Nón bảo hiểm).
  * Chữ ký điện tử xác nhận bằng HTML5 Canvas trực tiếp.
  * Chuyển trạng thái đơn sang `Ongoing` và xe sang `Rented`.
* **Quy Trình Check-out Trả Xe & Tất Toán**:
  * Ghi nhận ODO kết thúc để đối soát quãng đường.
  * Máy chủ tự động tính phụ thu trả trễ hẹn theo công thức `ceil(giờ trễ) * 30.000 đ`.
  * Nhập phụ phí hư hỏng / xăng phát sinh (nếu có).
  * Quyết toán 70% số tiền còn lại, tích điểm thưởng loyalty (1 điểm / 10.000đ) và hoàn trả trạng thái xe về `Available`.

### 3. Bảo Mật & Xác Thực (Security & Authentication)
* **Xác Thực Google ID Token An Toàn**: Sử dụng thư viện `google-auth-library` (`OAuth2Client.verifyIdToken`), kiểm tra nghiêm ngặt `email_verified === true`, xóa bỏ hoàn toàn payload JSON thô.
* **Mã OTP Bảo Mật Cao**: Sinh ngẫu nhiên 6 chữ số qua `crypto.randomInt(100000, 1000000)`, lưu trữ dạng SHA-256 hash trong DB, giới hạn tối đa 5 lần thử sai, thời gian chờ gửi lại (cooldown) tối thiểu 60 giây.
* **Khóa Tài Khoản & Invalidate Token**:
  * Tự động khóa tài khoản 30 phút sau 6 lần đăng nhập thất bại liên tiếp.
  * Cơ chế `tokenVersion` tự động vô hiệu hóa token cũ khi người dùng Đăng xuất, Đổi mật khẩu, hoặc Khóa tài khoản.
* **Kiểm Toán An Toàn (`AuditLog`)**: Tự động bóc tách và ẩn (redact) các trường nhạy cảm: `password`, `token`, `otp`, `credential`, `idCard*`, `drivingLicense*`.
* **Phòng Vệ Biên Giới**: Kích hoạt `helmet`, `express-rate-limit` trên các endpoint auth, whitelist CORS theo cấu hình `CLIENT_URL`.

---

## Mô Hình Dữ Liệu 18 Bảng

Hệ thống quản lý chặt chẽ 18 Collections chuẩn hóa trong MongoDB:

| # | Tên Model | File định nghĩa | Mục đích nghiệp vụ |
| :---: | :--- | :--- | :--- |
| 1 | `Branch` | `Branch.ts` | Quản lý 3 cơ sở tại Đà Nẵng, tọa độ GPS, giờ mở/đóng cửa, quản lý trưởng |
| 2 | `User` | `User.ts` | Người dùng đa vai trò (Admin, Manager, Staff, Customer), eKYC, tokenVersion, lockout |
| 3 | `Category` | `Category.ts` | Phân loại dòng xe (Xe ga, Xe số, Côn tay, Xe điện, Phân khối lớn) |
| 4 | `Vehicle` | `Vehicle.ts` | Quản lý tài sản xe, biển số, ODO, đơn giá ngày, cờ bảo dưỡng ODO |
| 5 | `Booking` | `Booking.ts` | Hợp đồng thuê xe, tách biệt trạm nhận/trả, cọc 30%, tất toán 70%, ODO, chữ ký số |
| 6 | `VehicleTransfer` | `VehicleTransfer.ts` | Lệnh điều chuyển phương tiện giữa các chi nhánh |
| 7 | `MaintenanceLog` | `MaintenanceLog.ts` | Nhật ký bảo dưỡng định kỳ, thay dầu nhớt và chi phí xưởng |
| 8 | `StaffSchedule` | `StaffSchedule.ts` | Phân ca làm việc, điểm danh check-in/out ca trực của nhân viên |
| 9 | `Complaint` | `Complaint.ts` | Tiếp nhận và xử lý sự cố, khiếu nại của khách hàng |
| 10 | `AuditLog` | `AuditLog.ts` | Nhật ký kiểm toán an toàn hệ thống, tự động ẩn trường nhạy cảm |
| 11 | `Discount` | `Discount.ts` | Quản lý voucher, mã giảm giá theo % hoặc giá trị tối đa |
| 12 | `Feedback` | `Feedback.ts` | Đánh giá sao và phản hồi sau chuyến đi, liên kết 1-1 với đơn thuê |
| 13 | `Notification` | `Notification.ts` | Thông báo in-app cho khách hàng và nhân sự |
| 14 | `BookingReminder` | `BookingReminder.ts` | Lập lịch gửi SMS/Email nhắc giờ nhận/trả xe |
| 15 | `Conversation` | `Conversation.ts` | Phiên hội thoại hỗ trợ trực tuyến giữa khách và nhân viên |
| 16 | `Message` | `Message.ts` | Tin nhắn chi tiết trong phiên hội thoại chat |
| 17 | `Banner` | `Banner.ts` | Quản lý banner quảng cáo và hình ảnh slider trang chủ |
| 18 | `StaticPage` | `StaticPage.ts` | Quản trị các trang chính sách, điều khoản dịch vụ |

---

## Quy Chuẩn Thẩm Mỹ & STRICT SVG ONLY

1. **Bảng Màu Chủ Đạo (Emerald & Forest Green)**:
   * Màu chính: `#047857` (Forest 700), `#059669` (Forest 600), `#10b981` (Emerald 500).
   * Màu nền: Slate sáng `#f8fafc`, trắng `#ffffff`, kết hợp Dark Slate `#0f172a` cho các khu vực terminal.
2. **Quy Chuẩn STRICT SVG ONLY**:
   * **TUYỆT ĐỐI 0 EMOJI** trong toàn bộ giao diện người dùng và component.
   * **100% biểu tượng vector SVG** chuẩn từ `lucide-react` và inline SVGs, đảm bảo độ sắc nét trên màn hình Retina / 4K.
   * **Zero Font Icon**: Không phụ thuộc vào font icon bên ngoài.

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu cầu tiên quyết
* **Node.js**: Phiên bản 18.0.0 trở lên.
* **MongoDB**: Cài đặt MongoDB cục bộ (`mongodb://127.0.0.1:27017`) hoặc URI MongoDB Atlas.

### Bước 1: Cài đặt dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### Bước 2: Cấu hình biến môi trường
Tạo file `.env` cho backend từ mẫu chuẩn:
```bash
cp server/.env.example server/.env
```
Đảm bảo `JWT_SECRET` có độ dài tối thiểu từ 32 ký tự trở lên.

### Bước 3: Nạp dữ liệu khởi tạo (Seeder)
```bash
npm run seed
```

### Bước 4: Khởi chạy toàn bộ hệ thống
```bash
npm run dev
```

* **Frontend Web**: [http://localhost:5173/](http://localhost:5173/)
* **Backend API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Tài Khoản Thử Nghiệm Mẫu

Sau khi chạy lệnh `npm run seed`, hệ thống khởi tạo sẵn các tài khoản thử nghiệm theo ma trận phân quyền:

| Vai trò | Tên đăng nhập | Mật khẩu mặc định | Cơ sở / Ghi chú |
| :--- | :--- | :--- | :--- |
| **SystemAdmin** | `admin` | `Admin@123456` | Quản trị toàn hệ thống chuỗi |
| **BranchManager** | `manager_dad` | `Manager@123456` | Quản lý Sân Bay Quốc Tế Đà Nẵng |
| **BranchManager** | `manager_mk` | `Manager@123456` | Quản lý Bãi Biển Mỹ Khê - Sơn Trà |
| **BranchManager** | `manager_cr` | `Manager@123456` | Quản lý Cầu Rồng - Hải Châu |
| **Staff** | `staff_dad` | `Staff@123456` | Nhân viên quầy Sân Bay Quốc Tế Đà Nẵng |
| **Staff** | `staff_mk` | `Staff@123456` | Nhân viên quầy Bãi Biển Mỹ Khê |
| **Staff** | `staff_cr` | `Staff@123456` | Nhân viên quầy Cầu Rồng |
| **Customer** | `customer_hoang` | `Customer@123456` | Khách hàng đã xác thực eKYC |
| **Customer** | `customer_linh` | `Customer@123456` | Khách hàng đã xác thực eKYC |
| **Customer** | `customer_tuan` | `Customer@123456` | Khách hàng đã xác thực eKYC |
| **Customer** | `customer_mai` | `Customer@123456` | Khách hàng mới (eKYC: Pending) |

*(Mật khẩu có thể tùy biến trước khi seed qua các biến môi trường: `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_CUSTOMER_PASSWORD`)*.

---

## Danh Sách REST API Toàn Hệ Thống

Tất cả các endpoint nghiệp vụ đều được gắn tiền tố `/api`:

### 1. Hệ thống & Sức khỏe
* `GET /api/health`: Kiểm tra trạng thái máy chủ và số lượng bản ghi của 18 collections.

### 2. Xác thực & Hồ sơ (`/api/auth`)
* `POST /api/auth/register`: Đăng ký tài khoản mới & gửi mã OTP 6 số ngẫu nhiên.
* `POST /api/auth/verify-otp`: Xác thực mã OTP kích hoạt tài khoản.
* `POST /api/auth/resend-otp`: Gửi lại mã OTP (giới hạn 60 giây giữa các lần).
* `GET /api/auth/verify-email`: Xác thực qua liên kết email (chỉ trả thông báo, không lộ JWT).
* `POST /api/auth/login`: Đăng nhập bằng username/email + mật khẩu (trả về JWT 24h).
* `POST /api/auth/google`: Đăng nhập/đăng ký bằng Google ID token (xác thực OAuth2Client).
* `POST /api/auth/logout`: Đăng xuất (yêu cầu JWT, ghi nhận AuditLog, tăng tokenVersion).
* `GET /api/auth/me`: Lấy thông tin tài khoản đang đăng nhập.
* `PUT /api/auth/profile`: Cập nhật thông tin cá nhân.
* `PUT /api/auth/me/avatar`: Cập nhật ảnh đại diện cá nhân (Multer upload).
* `POST /api/auth/ekyc`: Tải lên hồ sơ giấy tờ tùy thân CCCD / GPLX.
* `PUT /api/auth/change-password`: Đổi mật khẩu tài khoản (tối thiểu 8 ký tự, tăng tokenVersion).
* `POST /api/auth/forgot-password`: Yêu cầu gửi email đặt lại mật khẩu.
* `POST /api/auth/reset-password`: Đặt lại mật khẩu bằng token (SHA-256 hash).

### 3. Chi nhánh (`/api/branches`)
* `GET /api/branches`: Lấy danh sách toàn bộ các chi nhánh (kèm số lượng xe sẵn sàng).
* `GET /api/branches/nearby?lat=...&lng=...`: Tìm kiếm chi nhánh gần nhất theo tọa độ GPS.
* `GET /api/branches/:id`: Lấy chi tiết thông tin chi nhánh.
* `POST /api/branches`: Tạo mới chi nhánh (`SystemAdmin`).
* `PUT /api/branches/:id`: Cập nhật thông tin chi nhánh (`SystemAdmin`).
* `DELETE /api/branches/:id`: Xóa chi nhánh (`SystemAdmin`).

### 4. Phương tiện & Danh mục (`/api/vehicles`)
* `GET /api/vehicles`: Danh sách đội xe (lọc `branchId`, `category`, `status`, `q`, sắp xếp, phân trang, loại bỏ xe đã xóa).
* `GET /api/vehicles/:id`: Chi tiết phương tiện theo ID.
* `POST /api/vehicles`: Thêm phương tiện mới (`SystemAdmin`, `BranchManager`).
* `PUT /api/vehicles/:id`: Cập nhật thông tin phương tiện (`SystemAdmin`, `BranchManager`).
* `DELETE /api/vehicles/:id`: Xóa phương tiện khỏi khai thác (`SystemAdmin`, `BranchManager`).
* `GET /api/categories`: Lấy danh sách các phân loại xe.

### 5. Thuê xe & Đặt giữ chỗ (`/api/bookings`)
* `POST /api/bookings`: Tạo đơn đặt xe giữ chỗ (Bắt buộc đăng nhập `Customer`, cọc 30%, chống trùng lịch nguyên tử trong MongoDB session, sinh mã `MV-xxxxxx`).
* `GET /api/bookings/my`: Khách hàng xem lịch sử đơn thuê của chính mình (phân trang, lọc trạng thái).
* `GET /api/bookings/branch`: Nhân sự quầy xem các đơn thuộc chi nhánh của mình (`Staff`, `BranchManager`).
* `GET /api/bookings/code/:code`: Tra cứu nhanh đơn đặt xe theo mã (`Staff`, `BranchManager`, `SystemAdmin`).
* `GET /api/bookings/:id`: Xem chi tiết đơn theo ID (Khách sở hữu đơn hoặc Nhân sự chi nhánh).
* `PUT /api/bookings/:id/checkin`: Nhân viên quầy thực hiện Check-in giao xe (ghi ODO bắt đầu, checklist 5 điểm, chữ ký điện tử canvas).
* `PUT /api/bookings/:id/checkout`: Nhân viên quầy thực hiện Check-out thu hồi xe (ghi ODO kết thúc, tự động tính phí trễ 30.000đ/giờ, phụ phí, tất toán 70% còn lại, tích điểm loyalty).
* `PUT /api/bookings/:id/cancel`: Hủy đơn đặt xe kèm lý do bắt buộc.

### 6. Đánh giá & Phản hồi (`/api/feedbacks`)
* `GET /api/feedbacks/public`: Lấy danh sách các đánh giá 4-5 sao công khai cho trang chủ.

---

## Quy Chuẩn Tài Liệu

* **Bản đặc tả nghiệp vụ chuẩn (SRS Canonical)**: [docs/MOTORENT_SRS_Document.md](file:///d:/Motorent/docs/MOTORENT_SRS_Document.md)
* **Ma trận tiến độ chi tiết**: [docs/MOTORENT_TASK_MATRIX.tsv](file:///d:/Motorent/docs/MOTORENT_TASK_MATRIX.tsv)
* **Chỉ mục hướng dẫn tài liệu**: [docs/README.md](file:///d:/Motorent/docs/README.md)

---

## Giấy Phép & Bản Quyền

Dự án được phân phối dưới giấy phép **MIT License**. Toàn bộ mã nguồn và tài liệu thuộc về nhóm phát triển hệ thống **MOTORENT**.
