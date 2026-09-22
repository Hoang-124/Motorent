# MOTORENT - Hệ Thống Chuỗi Quản Lý & Cho Thuê Xe Máy Tự Lái Đa Chi Nhánh

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

> **MOTORENT (Motorent)** là nền tảng quản lý và vận hành chuỗi cho thuê xe máy tự lái tự doanh đa chi nhánh. Hệ thống giải quyết trọn vẹn bài toán di chuyển liên trạm (thuê tại Quận 1 - trả tại Sân bay), loại bỏ rủi ro giữ giấy tờ tùy thân của khách bằng quy trình eKYC số hóa, và tối ưu hóa quy trình điều chuyển xe nội bộ giữa các cơ sở.

---

## Mục Lục
1. [Tổng Quan & Giá Trị Khác Biệt](#tổng-quan--giá-trị-khác-biệt)
2. [Kiến Trúc Hệ Thống (Architecture)](#kiến-trúc-hệ-thống-architecture)
3. [Phân Hệ Chức Năng](#phân-hệ-chức-năng)
4. [Mô Hình Dữ Liệu 18 Bảng (Database Models)](#mô-hình-dữ-liệu-18-bảng-database-models)
5. [Quy Chuẩn Thẩm Mỹ & Đồ Họa](#quy-chuẩn-thẩm-mỹ--đồ-họa)
6. [Hướng Dẫn Cài Đặt & Khởi Chạy](#hướng-dẫn-cài-đặt--khởi-chạy)
7. [Tài Khoản Thử Nghiệm Mẫu](#tài-khoản-thử-nghiệm-mẫu)
8. [Danh Sách REST API](#danh-sách-rest-api)

---

## Tổng Quan & Giá Trị Khác Biệt

MOTORENT được thiết kế dựa trên các nghiệp vụ thực tế của thị trường cho thuê xe máy tại Việt Nam:

* **Không Giữ CCCD Bản Gốc**: Khách hàng chỉ cần quét/chụp ảnh giấy tờ tùy thân và GPLX qua quy trình eKYC đối chiếu. Khách toàn quyền giữ lại bản gốc khi tham gia giao thông.
* **Cơ Chế Cọc 30% Minh Bạch**: Hệ thống tự động tính toán dòng tiền: Khách thanh toán cọc 30% online để khóa đúng biển số xe mong muốn, 70% còn lại thanh toán tại quầy khi nhận xe và ưng ý.
* **Thuê Xe Một Chiều (One-Way Rental)**: Hỗ trợ linh hoạt nhận xe tại trạm Trung tâm (Quận 1 Bến Thành) và trả xe tại trạm Cửa ngõ (Sân bay Tân Sơn Nhất) mà không tính thêm phụ phí chuyển trạm.
* **Quầy Tiếp Tân Kỹ Thuật Số (Counter Desk)**: Bàn làm việc cho nhân viên tại trạm xử lý check-in đối chiếu 5 điểm an toàn, lưu ODO ban đầu, chữ ký số điện tử và check-out tự động tính phụ thu trễ giờ (30.000 đ/giờ).
* **Gói An Tâm Chu Đáo**: Mỗi xe cho thuê đi kèm 2 mũ bảo hiểm đạt chuẩn kiểm định CR khử khuẩn, 2 áo mưa tiện lợi dự phòng và giá kẹp điện thoại phượt.

---

## Kiến Trúc Hệ Thống (Architecture)

Dự án được tổ chức theo mô hình **Client-Server Monorepo**:

```text
Motorent/
├── client/                     # Frontend Single Page Application (React + Vite)
│   ├── public/                 # Static assets & SVG Favicon
│   └── src/
│       ├── components/         # Reusable UI components (Navbar, Footer, BookingWidget, VehicleCard, BookingModal)
│       ├── pages/              # Main routes (HomePage, FleetPage, BranchesPage, CounterDesk)
│       ├── services/           # Axios HTTP client & API handlers
│       ├── types/              # TypeScript Interfaces (Vehicle, Branch, Booking, User, etc.)
│       ├── App.tsx             # React Router routing configuration
│       └── index.css           # Custom emerald design tokens & Tailwind utilities
│
├── server/                     # Backend Modular Monolith (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/             # Database connection & environment configuration
│   │   ├── core/               # Middleware layer (auth, RBAC, audit, upload, error handling)
│   │   ├── models/             # 18 normalized Mongoose schemas & domain types
│   │   ├── seeders/            # Automated test data generator (seed.ts)
│   │   └── server.ts           # HTTP server, Socket.IO & REST API endpoints
│   ├── tsconfig.json           # In-memory TypeScript execution via tsx (noEmit: true)
│   └── package.json
│
├── docs/                       # System technical documentation & business requirements
├── package.json                # Root orchestration scripts (concurrently dev runner)
└── README.md
```

---

## Phân Hệ Chức Năng

### 1. Giao Diện Khách Hàng (Customer Experience)
* **Widget Tìm & Giữ Xe Nhanh**: Chọn điểm nhận, điểm trả độc lập, thời gian thuê với tính toán số ngày tức thời.
* **Đội Xe & Bộ Lọc Đa Chiều**: Phân loại theo dòng xe (Xe ga, Xe số, Côn tay, Xe máy điện), lọc theo cơ sở quản lý, sắp xếp theo đơn giá thuê.
* **Modal Đặt Xe Thông Minh**: Tính toán tự động mức cọc 30%, lựa chọn phương thức thanh toán (QR VNPay / Chuyển khoản ngân hàng / Cọc tại quầy).
* **Tra Cứu Chi Nhánh**: Danh bạ 3 chi nhánh trực thuộc kèm giờ mở cửa, số hotline và số lượng phương tiện thực tế đang sẵn sàng tại trạm.

### 2. Bàn Làm Việc Tiếp Tân Quầy (Staff Counter Desk)
* **Tra Cứu Mã Đặt Xe**: Tìm kiếm tức thì thông tin đơn thuê qua mã `MV-xxxxxx`.
* **Quy Trình Check-in Nhận Xe**:
  * Ghi nhận chỉ số ODO công-tơ-mét khi giao xe.
  * Biên bản kiểm tra 5 tiêu chuẩn an toàn (Lốp, Phanh, Đèn xi-nhan, Xăng/Pin, Nón bảo hiểm).
  * Chữ ký điện tử xác nhận bàn giao trên màn hình cảm ứng.
* **Quy Trình Check-out Trả Xe & Tất Toán**:
  * Ghi nhận ODO kết thúc để tính quãng đường di chuyển.
  * Tự động tính phụ thu trả trễ hẹn theo công thức `30.000 đ/giờ`.
  * Khấu trừ hoặc phụ thu hư hỏng phát sinh (nếu có).
  * Lập phiếu quyết toán 70% số tiền còn lại và chuyển trạng thái xe về `Available`.

### 3. Vận Hành & Quản Trị Doanh Nghiệp (Enterprise Fleet & HR)
* **Phân Quyền RBAC 4 Cấp**: `SystemAdmin`, `BranchManager`, `Staff`, `Customer`.
* **Điều Chuyển Xe Giữa Các Trạm (`VehicleTransfer`)**: Điều phối số lượng xe cân bằng giữa trạm Quận 1 và Sân bay.
* **Cảnh Báo Bảo Dưỡng ODO (`MaintenanceLog`)**: Tự động bật cờ bảo trì khi xe chạm ngưỡng ODO khuyến nghị.
* **Phân Ca Trực & Điểm Danh (`StaffSchedule`)**: Xếp ca sáng/chiều/tối, ghi nhận thời gian vào/ra ca của nhân viên chi nhánh.
* **Kiểm Toán An Toàn (`AuditLog`)**: Tự động lưu vết người dùng, thao tác sửa đổi dữ liệu nhạy cảm, địa chỉ IP và User-Agent.
* **Live Chat Thời Gian Thực**: Kết nối phòng trò chuyện hỗ trợ khách hàng trực tuyến thông qua Socket.IO.

### 3. Phân Hệ Xác Thực & Quản Lý Hồ Sơ Cá Nhân (Auth & Profile Subsystem)
* **Đăng ký tài khoản & Kích hoạt Email**: Đăng ký nhanh, tự động gửi email chứa token xác thực (`/verify-email?token=...`). Mật khẩu được mã hóa an toàn bằng thuật toán bcrypt (Salt round 10).
* **Đăng nhập linh hoạt**: Hỗ trợ đăng nhập bằng Username hoặc Email + Mật khẩu, hoặc đăng nhập trực tiếp một chạm qua **Google OAuth2** (xác thực ID token từ Google Auth Library).
* **Quên mật khẩu & Cơ chế phân luồng Email thông minh**:
  * Hỗ trợ đa dạng tên miền email cá nhân và doanh nghiệp: `@outlook.com.vn`, `@yahoo.com`, `@company.vn`, v.v.
  * **Bộ lọc nhận diện tài khoản Google**: Nếu người dùng nhập email Google (`@gmail.com`, `@googlemail.com` hoặc tài khoản đã liên kết Google ID), hệ thống sẽ chủ động hướng dẫn khách hàng đăng nhập trực tiếp bằng tài khoản Google, kèm nút đăng nhập Google nhanh chóng để tránh nhầm lẫn.
* **Đổi ảnh đại diện (Avatar Upload)**: Tải lên ảnh avatar cá nhân (PNG, JPG, WebP) qua Multer, lưu trữ tĩnh tại `/uploads/avatars/` và cập nhật tức thì.
* **Hồ sơ cá nhân & Đổi mật khẩu**: Xem trạng thái eKYC, điểm thưởng thành viên, cập nhật thông tin cá nhân (Họ tên, SĐT, giới tính, ngày sinh) và đổi mật khẩu bảo mật.

---

## Mô Hình Dữ Liệu 18 Bảng (Database Models)

Hệ thống quản lý chặt chẽ 18 Collections chuẩn hóa trong MongoDB:

| # | Tên Model | File định nghĩa | Mục đích nghiệp vụ |
| :---: | :--- | :--- | :--- |
| 1 | `Branch` | `Branch.ts` | Quản lý 3 cơ sở, tọa độ GPS, giờ mở/đóng cửa, quản lý trưởng |
| 2 | `User` | `User.ts` | Người dùng đa vai trò (Admin, Manager, Staff, Customer), eKYC, điểm thưởng |
| 3 | `Category` | `Category.ts` | Phân loại dòng xe (Xe ga, Xe số, Côn tay, Xe điện) |
| 4 | `Vehicle` | `Vehicle.ts` | Quản lý tài sản xe, biển số, ODO, đơn giá ngày, cờ bảo dưỡng |
| 5 | `Booking` | `Booking.ts` | Hợp đồng thuê xe, tách biệt trạm nhận/trả, cọc 30%, tất toán 70%, ODO, chữ ký số |
| 6 | `VehicleTransfer` | `VehicleTransfer.ts` | Lệnh điều chuyển phương tiện giữa các chi nhánh |
| 7 | `MaintenanceLog` | `MaintenanceLog.ts` | Nhật ký bảo dưỡng định kỳ, thay dầu nhớt và chi phí xưởng |
| 8 | `StaffSchedule` | `StaffSchedule.ts` | Phân ca làm việc, điểm danh check-in/out ca trực của nhân viên |
| 9 | `Complaint` | `Complaint.ts` | Tiếp nhận và xử lý sự cố, khiếu nại của khách hàng |
| 10 | `AuditLog` | `AuditLog.ts` | Nhật ký kiểm toán an toàn hệ thống, lưu JSON diff thao tác nhạy cảm |
| 11 | `Discount` | `Discount.ts` | Quản lý voucher, mã giảm giá theo % hoặc giá trị cố định |
| 12 | `Feedback` | `Feedback.ts` | Đánh giá sao và phản hồi sau chuyến đi, liên kết 1-1 với đơn thuê |
| 13 | `Notification` | `Notification.ts` | Thông báo in-app cho khách hàng và nhân sự |
| 14 | `BookingReminder` | `BookingReminder.ts` | Lập lịch gửi SMS/Email nhắc giờ nhận/trả xe |
| 15 | `Conversation` | `Conversation.ts` | Phiên hội thoại hỗ trợ trực tuyến giữa khách và nhân viên |
| 16 | `Message` | `Message.ts` | Tin nhắn chi tiết trong phiên hội thoại chat |
| 17 | `Banner` | `Banner.ts` | Quản lý banner quảng cáo và hình ảnh slider trang chủ |
| 18 | `StaticPage` | `StaticPage.ts` | Quản trị các trang chính sách, điều khoản dịch vụ |

---

## Quy Chuẩn Thẩm Mỹ & Đồ Họa

1. **Bảng Màu Chủ Đạo (Emerald & Forest Green)**:
   * Màu chính: `#047857` (Forest 700), `#059669` (Forest 600), `#10b981` (Emerald 500).
   * Màu phụ trợ: Mint nhạt `#ecfdf5` tạo điểm nhấn dịu mắt, kết hợp nền sáng `#f8fafc` và Dark Slate `#0f172a`.
2. **Nguyên Tắc Anti-AI (Thiết Kế Đậm Chất Thực Tế)**:
   * Văn phong bản địa hóa tự nhiên, thực tế: xe có biển số cụ thể (59-P1 988.23), mốc ODO chính xác, cam kết phụ kiện thực (2 nón bảo hiểm + 2 áo mưa).
   * Tuyệt đối không dùng những hình ảnh trừu tượng, thẻ trống hoặc từ ngữ sáo rỗng thường thấy ở các giao diện dựng tự động.
3. **Quy Chuẩn STRICT SVG ONLY**:
   * **0 emoji** trong mã nguồn và giao diện người dùng.
   * **100% biểu tượng vector SVG** chuẩn từ `lucide-react` và inline SVGs, đảm bảo độ sắc nét tuyệt đối trên màn hình Retina / 4K.

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu cầu tiên quyết
* **Node.js**: Phiên bản 18.0.0 trở lên.
* **MongoDB**: Cài đặt MongoDB cục bộ (`mongodb://127.0.0.1:27017`) hoặc URI MongoDB Atlas.
* **Git**: Đã cài đặt trên máy tính.

### Bước 1: Clone kho mã nguồn
```bash
git clone https://github.com/Hoang-124/Motorent.git
cd Motorent
```

### Bước 2: Cài đặt dependencies
Cài đặt cho cả thư mục gốc, máy chủ backend và giao diện client:
```bash
# Cài đặt gói điều phối thư mục gốc
npm install

# Cài đặt dependencies Backend
npm --prefix server install

# Cài đặt dependencies Frontend
npm --prefix client install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` cho backend:
```bash
cp server/.env.example server/.env
```
*(Chỉnh sửa thông số kết nối MongoDB hoặc cổng chạy nếu có thay đổi)*.

### Bước 4: Nạp dữ liệu mẫu (Seeder)
Chạy lệnh khởi tạo dữ liệu mẫu cho toàn bộ 18 models:
```bash
npm run seed
```

### Bước 5: Khởi chạy toàn bộ hệ thống
Khởi động đồng thời cả Backend (Port 5000) và Frontend (Port 5173) chỉ với 1 lệnh duy nhất:
```bash
npm run dev
```

* **Frontend Web**: [http://localhost:5173/](http://localhost:5173/)
* **Backend API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Tài Khoản Thử Nghiệm Mẫu

Sau khi chạy lệnh `npm run seed`, hệ thống đã có sẵn các tài khoản tương ứng với 4 vai trò RBAC:

| Vai trò | Tên đăng nhập | Mật khẩu mặc định | Ghi chú quyền hạn |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin123` | Toàn quyền kiểm soát toàn chuỗi và xem audit log |
| **Branch Manager Q1** | `manager_q1` | `manager123` | Quản lý cơ sở Quận 1, duyệt lệnh điều chuyển xe |
| **Branch Manager Sân Bay**| `manager_sb` | `manager123` | Quản lý cơ sở Sân Bay Tân Sơn Nhất |
| **Staff Q1** | `staff_q1` | `staff123` | Nhân viên bàn quầy Check-in / Check-out tại Quận 1 |
| **Staff Sân Bay** | `staff_sb` | `staff123` | Nhân viên bàn quầy Check-in / Check-out tại Sân Bay |
| **Customer An** | `customer_an` | `customer123` | Khách hàng đã hoàn thành đối chiếu eKYC |
| **Customer Bình** | `customer_binh`| `customer123` | Khách hàng mới đăng ký |

---

## Danh Sách REST API

* `GET /api/health`: Kiểm tra trạng thái máy chủ và thống kê số lượng bản ghi của 18 collections.
* `GET /api/branches`: Lấy danh sách toàn bộ các chi nhánh đang hoạt động.
* `GET /api/categories`: Lấy danh mục các loại xe máy.
* `GET /api/vehicles`: Lấy danh sách đội xe (hỗ trợ lọc theo `branchId`, `category`, `status`).
* `GET /api/bookings`: Lấy danh sách các đơn đặt thuê xe mới nhất.
* `POST /api/bookings`: Tạo đơn đặt xe mới (tính cọc 30%, sinh mã đơn `MV-xxxxxx`).

### Nhóm API Xác Thực & Hồ Sơ (`/api/auth`)
* `POST /api/auth/register`: Đăng ký tài khoản mới & gửi email xác thực kích hoạt.
* `GET /api/auth/verify-email?token=...`: Kích hoạt tài khoản người dùng qua token email.
* `POST /api/auth/login`: Đăng nhập bằng tên người dùng hoặc email + mật khẩu (trả về JWT Token).
* `POST /api/auth/google`: Đăng nhập/Đăng ký một chạm với Google ID token.
* `POST /api/auth/logout`: Xóa phiên đăng nhập người dùng.
* `POST /api/auth/forgot-password`: Yêu cầu cấp lại mật khẩu (hỗ trợ email đa miền `@outlook.com.vn`, phân luồng thông minh với tài khoản `@gmail.com`).
* `POST /api/auth/reset-password`: Đặt lại mật khẩu mới với token bí mật.
* `GET /api/auth/me`: Lấy dữ liệu hồ sơ cá nhân của người dùng hiện tại (kèm thông tin eKYC, điểm thưởng).
* `PUT /api/auth/profile`: Chỉnh sửa thông tin cá nhân (Họ tên, SĐT, giới tính, ngày sinh).
* `POST /api/auth/change-password`: Thay đổi mật khẩu tài khoản.
* `POST /api/auth/avatar`: Tải lên và cập nhật ảnh đại diện đại diện người dùng.

---

## Giấy Phép & Bản Quyền

Dự án được phân phối dưới giấy phép **MIT License**. Toàn bộ mã nguồn và tài liệu thuộc về nhóm phát triển hệ thống **MOTORENT**.
