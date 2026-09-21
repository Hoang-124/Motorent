# TÀI LIỆU ĐẶC TẢ TỔNG HỢP HỆ THỐNG QUẢN LÝ CHUỖI CỬA HÀNG CHO THUÊ XE MÁY (MOTOV)

> **Loại tài liệu:** Đặc tả Yêu cầu, Kiến trúc Hệ thống, Use Case, Cơ sở Dữ liệu & Toàn bộ Mã Nguồn DrawDB JSON  
> **Phiên bản:** 1.0 (Dự án xây dựng mới hoàn toàn)  
> **Đối tượng sử dụng:** Hội đồng chấm đồ án, Giảng viên hướng dẫn, Đội ngũ Phát triển phần mềm  

---

## MỤC LỤC
1. [GIỚI THIỆU, PHẠM VI VÀ MÔ HÌNH VẬN HÀNH](#1-giới-thiệu-phạm-vi-và-mô-hình-vận-hành)
2. [KHẢO SÁT CÁC HỆ THỐNG THỰC TẾ TƯƠNG TỰ](#2-khảo-sát-các-hệ-thống-thực-tế-tương-tự)
3. [MA TRẬN 7 TÁC NHÂN (ACTORS) VÀ PHÂN QUYỀN](#3-ma-trận-7-tác-nhân-actors-và-phân-quyền)
4. [DANH MỤC TOÀN BỘ 142 USE CASE CHI TIẾT](#4-danh-mục-toàn-bộ-142-use-case-chi-tiết)
5. [THIẾT KẾ CƠ SỞ DỮ LIỆU TOÀN DIỆN (18 BẢNG)](#5-thiết-kế-cơ-sở-dữ-liệu-toàn-diện-18-bảng)
6. [PHÂN RÃ 5 MÔ-ĐUN NGHIỆP VỤ & SƠ ĐỒ LIÊN KẾT (KÈM CODE JSON)](#6-phân-rã-5-mô-đun-nghiệp-vụ--sơ-đồ-liên-kết-kèm-code-json)
7. [CÁC SƠ ĐỒ TRẠNG THÁI VÒNG ĐỜI (STATE LIFECYCLE)](#7-các-sơ-đồ-trạng-thái-vòng-đời-state-lifecycle)
8. [QUY TRÌNH NGHIỆP VỤ CỐT LÕI (CORE BUSINESS FLOWS)](#8-quy-trình-nghiệp-vụ-cốt-lõi-core-business-flows)
9. [HƯỚNG DẪN TÀI NGUYÊN VÀ CÔNG CỤ TRÌNH DIỄN](#9-hướng-dẫn-tài-nguyên-và-công-cụ-trình-diễn)
10. [PHỤ LỤC: TOÀN BỘ MÃ NGUỒN JSON IMPORT VÀO DRAWDB](#10-phụ-lục-toàn-bộ-mã-nguồn-json-import-vào-drawdb)

---

# 1. GIỚI THIỆU, PHẠM VI VÀ MÔ HÌNH VẬN HÀNH

### 1.1. Giới thiệu đề tài & Tính cấp thiết
Thuê xe máy tự lái là nhu cầu cực kỳ lớn tại Việt Nam, đặc biệt ở các đô thị lớn (TP.HCM, Hà Nội, Đà Nẵng) và các thành phố du lịch đông sinh viên, người lao động ngoại tỉnh và khách du lịch.

Trên thực tế, nhiều cửa hàng cho thuê xe máy đã mở rộng thành **chuỗi nhiều cơ sở** trong cùng một thành phố để đảm bảo luôn có xe phục vụ khách vào mùa cao điểm bằng cách luân chuyển xe giữa các chi nhánh. Tuy nhiên, phần lớn các chuỗi này hiện nay vẫn vận hành rất thủ công:
* Trao đổi, giữ xe qua Zalo, sổ tay hoặc ghi nhớ miệng.
* Dẫn đến tình trạng trùng lịch xe (Double Booking), quên giờ trả xe của khách.
* Khó kiểm soát tình trạng kỹ thuật của xe (quên thay nhớt, không nắm rõ số km lăn bánh).
* Khó theo dõi công nợ, tiền cọc và điều phối xe giữa các chi nhánh.

**Mục tiêu của đề tài:** Xây dựng **"Hệ thống Quản lý Chuỗi Cửa Hàng Cho Thuê Xe Máy"** hoàn toàn mới nhằm số hóa toàn bộ quy trình thuê xe máy — từ tìm kiếm xe, đặt xe theo chi nhánh, thanh toán cọc online, giao/nhận xe tại quầy, quản lý điều chuyển xe giữa các cơ sở, bảo dưỡng kỹ thuật cho đến báo cáo doanh thu và đối soát tài chính trên một nền tảng tập trung thống nhất.

### 1.2. Phạm vi đề tài
* **Mô hình vận hành:** Một chuỗi cửa hàng tự doanh gồm nhiều chi nhánh vật lý trong cùng khu vực/thành phố. Mỗi chi nhánh trực tiếp quản lý đội xe máy và các đơn thuê phát sinh tại cơ sở mình, đồng thời chịu sự giám sát, điều phối tổng thể từ Ban quản trị trung tâm.
* **Quyền sở hữu tài sản:** Toàn bộ xe máy, trang thiết bị đều thuộc sở hữu trực tiếp của chuỗi (không phải mô hình P2P cá nhân).
* **Phạm vi nghiệp vụ chuyên sâu:**
  1. *Khách hàng:* Tìm kiếm theo chi nhánh, đặt thuê linh hoạt (nhận ở chi nhánh A, trả ở chi nhánh B), cọc 30%, ký hợp đồng điện tử, nhận tin nhắn SMS nhắc lịch, đánh giá chất lượng và tích điểm thưởng loyalty.
  2. *Nhân viên chi nhánh:* Thẩm định GPLX/CCCD, giao xe chốt số ODO và xăng, nhận xe kiểm tra hư hại, tính phụ phí phát sinh và xử lý tiền cọc.
  3. *Quản lý chi nhánh:* Điều phối kho xe, tạo lệnh chuyển xe (`VehicleTransfer`), xếp ca trực nhân viên (`StaffSchedule`), giải quyết khiếu nại sự cố (`Complaint`) và theo dõi bảo dưỡng xe (`MaintenanceLog`).
  4. *Quản trị viên toàn hệ thống (Admin):* Quản lý danh mục cơ sở, quản lý tài khoản nhân sự toàn chuỗi, thiết lập bảng giá động theo mùa/ngày lễ, kiểm toán hệ thống (`AuditLog`), quản trị banner và trang tĩnh CMS.

---

# 2. KHẢO SÁT CÁC HỆ THỐNG THỰC TẾ TƯƠNG TỰ

### 2.1. MOTOGO – Chuỗi cho thuê xe máy tự lái tại Hà Nội, Hà Giang, Ninh Bình
* **Điểm mạnh:**
  * Đồng bộ 100% xe mới (Honda Wave, Vision, Air Blade), định kỳ thay xe sau 2–3 năm.
  * Cho phép nhận xe tại điểm A và trả xe tại điểm B (đặc biệt tuyến Hà Giang – Cao Bằng, Hà Nội – Ninh Bình).
  * Ứng dụng công nghệ định vị GPS giám sát hành trình toàn bộ đội xe.
  * Hợp đồng điện tử minh bạch, không giữ CMND/CCCD gốc của khách mà chỉ chụp ảnh đối soát.
* **Hạn chế:**
  * Khách vẫn phải liên hệ qua tổng đài hoặc Zalo để xác nhận lại đơn sau khi đặt trên website.
  * Chưa có tính năng tích điểm thưởng (Loyalty Program) gắn kết khách hàng thân thiết.
  * Phân hệ xếp ca trực và chấm công nhân viên vận hành tách rời khỏi hệ thống quản lý xe.

### 2.2. Gia Bảo Moto – Chuỗi 4 chi nhánh cho thuê xe máy tại TP.HCM
* **Điểm mạnh:**
  * Mạng lưới phủ khắp các quận trung tâm (Quận 1, Tân Bình gần Sân bay, Bình Thạnh, Quận 7).
  * Hỗ trợ giao xe tận nơi (khách sạn, bến xe, sân bay) trong bán kính 5km.
  * Đa dạng dòng xe từ phổ thông đến xe côn tay, phân khối lớn (Winner X, Exciter, CBR150).
* **Hạn chế:**
  * Vận hành chủ yếu qua phần mềm sổ sách offline kết hợp nhắn tin nội bộ giữa các cơ sở.
  * Chưa có hệ thống điều chuyển xe tự động hóa giữa các chi nhánh, dẫn đến việc cơ sở Sân bay thường xuyên thiếu xe trong khi cơ sở khác lại tồn đọng xe không có khách.
  * Quy trình xử lý khiếu nại khi xe hỏng hóc dọc đường chưa có quy trình chuẩn trên phần mềm.

👉 **Bài học rút ra cho đề tài:** Hệ thống cần tích hợp trọn gói cả luồng khách hàng (Web/App đặt cọc online, eKYC) và luồng nội bộ (Quản lý đa chi nhánh, Lệnh chuyển xe, Bảo dưỡng ODO, Xếp ca trực và Kiểm toán an toàn).

---

# 3. MA TRẬN 7 TÁC NHÂN (ACTORS) VÀ PHÂN QUYỀN

Hệ thống phân cấp nghiêm ngặt theo mô hình Role-Based Access Control (RBAC):

```
                        ┌───────────────────────────────┐
                        │   System Admin (Quản trị)     │
                        └───────────────┬───────────────┘
                                        │ (Kế thừa toàn quyền)
                        ┌───────────────▼───────────────┐
                        │ Branch Manager (Quản lý CN)   │
                        └───────────────┬───────────────┘
                                        │ (Kế thừa quyền quầy)
                        ┌───────────────▼───────────────┐
                        │   Staff (Nhân viên chi nhánh) │
                        └───────────────────────────────┘

┌───────────────────────────────┐               ┌───────────────────────────────┐
│   Customer (Khách hàng)       │               │   Guest (Khách vãng lai)      │
└───────────────────────────────┘               └───────────────────────────────┘

┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Payment Gateway (Cổng T.Toán) │               │   Hệ thống Email / SMS        │
└───────────────────────────────┘               └───────────────────────────────┘
```

| STT | Tác nhân (Actor) | Phạm vi quyền hạn | Mô tả vai trò |
| :---: | :--- | :--- | :--- |
| 1 | **Khách vãng lai (Guest)** | Công khai (Public) | Xem danh sách xe, xem chi nhánh, tính giá dự kiến, đọc bài viết hướng dẫn |
| 2 | **Khách hàng (Customer)** | Cá nhân đã đăng ký | Đặt xe, cọc online, quản lý chuyến đi, nhận SMS nhắc lịch, đánh giá, khiếu nại |
| 3 | **Nhân viên chi nhánh (Staff)** | Tại 1 chi nhánh trực thuộc | Giao xe, thẩm định giấy tờ, nhận xe, chốt ODO, thu phí còn lại, điểm danh ca trực |
| 4 | **Quản lý chi nhánh (Manager)**| Quản lý 1 cơ sở cụ thể | Quản lý đội xe cơ sở, tạo lệnh chuyển xe, xếp lịch nhân viên, xem doanh thu chi nhánh |
| 5 | **Quản trị hệ thống (Admin)** | Toàn quyền toàn hệ thống | Mở chi nhánh mới, bổ nhiệm quản lý, thiết lập giá toàn chuỗi, kiểm toán hệ thống |
| 6 | **Payment Gateway (Ngoại vi)** | Cổng thanh toán (VNPay...) | Nhận yêu cầu thanh toán cọc 30%, xử lý hoàn tiền, gửi webhook xác nhận |
| 7 | **Hệ thống Email/SMS (Ngoại vi)**| Dịch vụ gửi tin (Twilio...) | Gửi OTP, gửi email xác nhận đặt cọc, gửi SMS nhắc lịch trả xe trước 1 tiếng |

---

# 4. DANH MỤC TOÀN BỘ 142 USE CASE CHI TIẾT

### 4.1. Tác nhân Guest - Khách vãng lai (10 Use Cases: UC1 - UC10)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC1** | Xem danh sách chi nhánh |
| **UC2** | Xem chi nhánh trên bản đồ (Google Maps) |
| **UC3** | Xem danh sách xe máy |
| **UC4** | Lọc xe theo chi nhánh |
| **UC5** | Lọc xe theo loại xe |
| **UC6** | Lọc xe theo khoảng giá |
| **UC7** | Lọc xe theo tình trạng (còn xe/hết xe) |
| **UC8** | Lọc xe theo hãng sản xuất |
| **UC9** | Sắp xếp xe theo giá tăng/giảm |
| **UC10** | Sắp xếp xe theo đánh giá cao nhất |


---

### 4.2. Tác nhân Customer - Khách hàng (41 Use Cases: UC11 - UC51)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC11** | Tìm kiếm xe theo từ khóa |
| **UC12** | Xem chi tiết xe (ảnh, thông số, giá) |
| **UC13** | Xem đánh giá & bình luận của xe |
| **UC14** | Xem chính sách thuê xe (điều khoản, đặt cọc) |
| **UC15** | Đăng ký tài khoản |
| **UC16** | Xác thực email khi đăng ký |
| **UC17** | Đăng nhập bằng email/mật khẩu |
| **UC18** | Đăng nhập bằng Google/Facebook (OAuth) |
| **UC19** | Quên mật khẩu (gửi email khôi phục) |
| **UC20** | Xem thông tin cá nhân |
| **UC21** | Cập nhật thông tin cá nhân |
| **UC22** | Tải lên ảnh đại diện |
| **UC23** | Tải lên ảnh CMND/CCCD, GPLX để xác minh |
| **UC24** | Đổi mật khẩu |
| **UC25** | Đăng xuất |
| **UC26** | Thêm xe vào danh sách yêu thích (wishlist) |
| **UC27** | Xóa xe khỏi danh sách yêu thích |
| **UC28** | Tìm kiếm xe theo vị trí hiện tại (GPS) |
| **UC29** | Đặt thuê xe (chọn ngày giờ nhận/trả) |
| **UC30** | Chọn chi nhánh nhận xe khác chi nhánh trả xe (one-way rental) |
| **UC31** | Áp dụng mã giảm giá/khuyến mãi |
| **UC32** | Xem tổng chi phí tạm tính (giá thuê + cọc + phí phát sinh) |
| **UC33** | Ký hợp đồng thuê điện tử (e-signature) |
| **UC34** | Thanh toán đặt cọc trực tuyến |
| **UC35** | Thanh toán toàn bộ đơn thuê trực tuyến |
| **UC36** | Thanh toán tại quầy khi nhận xe |
| **UC37** | Hủy đơn thuê trước hạn |
| **UC38** | Yêu cầu hoàn tiền khi hủy đơn |
| **UC39** | Gia hạn thời gian thuê xe |
| **UC40** | Xem lịch sử đơn thuê |
| **UC41** | Xem chi tiết một đơn thuê |
| **UC42** | Theo dõi trạng thái đơn thuê real-time |
| **UC43** | Tải hóa đơn điện tử (PDF) |
| **UC44** | Viết đánh giá xe kèm ảnh |
| **UC45** | Chỉnh sửa đánh giá đã viết |
| **UC46** | Xóa đánh giá đã viết |
| **UC47** | Gửi khiếu nại/báo cáo sự cố (VD: xe hỏng khi nhận, thu phí sai) |
| **UC48** | Theo dõi trạng thái khiếu nại |
| **UC49** | Chat trực tiếp với nhân viên hỗ trợ (live chat) |
| **UC50** | Nhận thông báo đẩy (push notification) |
| **UC51** | Nhận thông báo qua email |


---

### 4.3. Tác nhân Staff - Nhân viên chi nhánh (34 Use Cases: UC52 - UC85)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC52** | Nhận thông báo qua SMS |
| **UC53** | Tích lũy điểm thưởng (loyalty points) sau mỗi đơn |
| **UC54** | Đổi điểm thưởng lấy voucher |
| **UC55** | Mời bạn bè (referral) nhận ưu đãi |
| **UC56** | Đăng ký nhận bản tin khuyến mãi |
| **UC57** | Đăng nhập hệ thống |
| **UC58** | Đăng xuất |
| **UC59** | Xem danh sách đơn thuê tại chi nhánh |
| **UC60** | Xem chi tiết một đơn thuê |
| **UC61** | Xác minh giấy tờ khách hàng (CCCD, GPLX) khi giao xe |
| **UC62** | Chụp ảnh tình trạng xe trước khi giao |
| **UC63** | Xác nhận giao xe cho khách (check-in) |
| **UC64** | Chụp ảnh tình trạng xe khi nhận lại |
| **UC65** | Xác nhận nhận lại xe từ khách (check-out) |
| **UC66** | So sánh tình trạng xe trước/sau để phát hiện hư hỏng |
| **UC67** | Ghi nhận sự cố/hư hỏng phát sinh |
| **UC68** | Tính phí phạt phát sinh (trả trễ, hư hỏng) |
| **UC69** | Thu phí phạt phát sinh tại quầy |
| **UC70** | Cập nhật trạng thái xe sang "đang thuê" |
| **UC71** | Cập nhật trạng thái xe sang "có sẵn" |
| **UC72** | Cập nhật trạng thái xe sang "đang bảo trì" |
| **UC73** | Lập phiếu bảo trì xe |
| **UC74** | Xử lý khiếu nại của khách tại chi nhánh |
| **UC75** | Phản hồi tin nhắn chat hỗ trợ khách hàng |
| **UC76** | Thêm xe mới vào chi nhánh |
| **UC77** | Sửa thông tin xe |
| **UC78** | Xóa xe khỏi chi nhánh |
| **UC79** | Đặt giá thuê theo ngày cho xe |
| **UC80** | Đặt giá thuê theo giờ cho xe |
| **UC81** | Thiết lập giá thuê động theo mùa cao điểm (dynamic pricing) |
| **UC82** | Duyệt đơn đặt thuê |
| **UC83** | Từ chối đơn đặt thuê (kèm lý do) |
| **UC84** | Duyệt yêu cầu hoàn tiền |
| **UC85** | Từ chối yêu cầu hoàn tiền (kèm lý do) |


---

### 4.4. Tác nhân Branch Manager - Quản lý chi nhánh (22 Use Cases: UC86 - UC107)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC86** | Lập lịch bảo trì định kỳ cho từng xe |
| **UC87** | Xem lịch sử bảo trì của xe |
| **UC88** | Yêu cầu điều chuyển xe từ chi nhánh khác (transfer request) |
| **UC89** | Duyệt yêu cầu điều chuyển xe đến chi nhánh khác |
| **UC90** | Thêm tài khoản nhân viên |
| **UC91** | Sửa thông tin tài khoản nhân viên |
| **UC92** | Xóa tài khoản nhân viên |
| **UC93** | Phân ca làm việc cho nhân viên |
| **UC94** | Duyệt/xử lý khiếu nại mức chi nhánh |
| **UC95** | Xem báo cáo doanh thu chi nhánh theo ngày |
| **UC96** | Xem báo cáo doanh thu chi nhánh theo tháng |
| **UC97** | Xem báo cáo doanh thu chi nhánh theo quý/năm |
| **UC98** | Xuất báo cáo doanh thu ra file Excel/PDF |
| **UC99** | Xem báo cáo tần suất hỏng hóc từng xe |
| **UC100** | Xem báo cáo hiệu suất cho thuê từng xe (tỷ lệ lấp đầy) |
| **UC101** | Xem thống kê đánh giá trung bình của chi nhánh |
| **UC102** | Thêm chi nhánh mới |
| **UC103** | Sửa thông tin chi nhánh |
| **UC104** | Xóa/vô hiệu hóa chi nhánh |
| **UC105** | Thêm tài khoản Branch Manager |
| **UC106** | Sửa tài khoản Branch Manager |
| **UC107** | Xóa tài khoản Branch Manager |


---

### 4.5. Tác nhân System Admin - Quản trị viên toàn hệ thống (24 Use Cases: UC108 - UC131)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC108** | Phân quyền chi tiết theo vai trò (role-based access control) |
| **UC109** | Khóa tài khoản người dùng vi phạm |
| **UC110** | Mở khóa tài khoản người dùng |
| **UC111** | Xem nhật ký hoạt động hệ thống (audit log) |
| **UC112** | Xem báo cáo doanh thu toàn chuỗi |
| **UC113** | So sánh hiệu suất giữa các chi nhánh |
| **UC114** | Xem dashboard tổng quan (KPI toàn hệ thống) |
| **UC115** | Dự báo nhu cầu thuê xe theo mùa (dựa trên dữ liệu lịch sử) |
| **UC116** | Thêm loại xe mới vào hệ thống |
| **UC117** | Sửa loại xe |
| **UC118** | Xóa loại xe |
| **UC119** | Tạo mã giảm giá/voucher toàn hệ thống |
| **UC120** | Sửa mã giảm giá |
| **UC121** | Vô hiệu hóa mã giảm giá |
| **UC122** | Cấu hình chính sách hủy đơn & hoàn tiền |
| **UC123** | Cấu hình mức đặt cọc mặc định theo loại xe |
| **UC124** | Cấu hình chương trình tích điểm thưởng |
| **UC125** | Thêm banner/khuyến mãi trên trang chủ |
| **UC126** | Sửa banner/khuyến mãi |
| **UC127** | Xóa banner/khuyến mãi |
| **UC128** | Quản lý nội dung trang tĩnh (giới thiệu, điều khoản, FAQ) |
| **UC129** | Đối soát giao dịch thanh toán với cổng thanh toán |
| **UC130** | Xuất báo cáo thuế/tài chính theo kỳ |
| **UC131** | Quản lý đa ngôn ngữ giao diện (nếu hỗ trợ) |


---

### 4.6. Tác nhân Payment Gateway - Cổng thanh toán (6 Use Cases: UC132 - UC137)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC132** | Nhận yêu cầu thanh toán từ hệ thống |
| **UC133** | Xử lý giao dịch thanh toán |
| **UC134** | Trả kết quả giao dịch thành công |
| **UC135** | Trả kết quả giao dịch thất bại |
| **UC136** | Xử lý yêu cầu hoàn tiền (refund) |
| **UC137** | Gửi webhook xác nhận giao dịch về hệ thống |


---

### 4.7. Tác nhân Hệ thống Email/SMS (5 Use Cases: UC138 - UC142)
| Mã UC | Tên Chức Năng / Nghiệp Vụ |
| :---: | :--- |
| **UC138** | Gửi email xác nhận đăng ký |
| **UC139** | Gửi email xác nhận đơn thuê |
| **UC140** | Gửi email hóa đơn |
| **UC141** | Gửi SMS nhắc lịch trả xe |
| **UC142** | Gửi SMS mã OTP xác thực |


---

# 5. THIẾT KẾ CƠ SỞ DỮ LIỆU TOÀN DIỆN (18 BẢNG)

Toàn bộ hệ thống được xây dựng trên **18 bảng chuẩn hóa**. Dưới đây là bảng đặc tả chi tiết cấu trúc dữ liệu:

### 5.1. Bảng `Branch` (Chi nhánh cửa hàng)
Quản lý thông tin mạng lưới các cơ sở cho thuê của chuỗi.
* `_id` (VARCHAR, PK): Mã định danh duy nhất.
* `name` (VARCHAR, Not Null): Tên chi nhánh (VD: Chi nhánh Quận 1 - Chợ Bến Thành).
* `code` (VARCHAR, Unique, Not Null): Mã viết tắt cơ sở (VD: `CN-Q1`, `CN-SB`).
* `address` (VARCHAR, Not Null): Địa chỉ số nhà, đường, phường, quận.
* `phone` (VARCHAR, Not Null): Số điện thoại hotline tại quầy.
* `email` (VARCHAR, Nullable): Email liên hệ của chi nhánh.
* `location_lng` (FLOAT): Kinh độ địa lý GPS.
* `location_lat` (FLOAT): Vĩ độ địa lý GPS (phục vụ tính khoảng cách tìm chi nhánh gần nhất).
* `hours_open` (VARCHAR, Default '08:00'): Giờ mở cửa phục vụ giao xe.
* `hours_close` (VARCHAR, Default '22:00'): Giờ đóng cửa nhận xe.
* `managerId` (VARCHAR, FK -> User, Nullable): Mã Quản lý trưởng cơ sở.
* `isActive` (BOOLEAN, Default true): Trạng thái hoạt động của cơ sở.
* `description` (TEXT): Mô tả vị trí, hướng dẫn đỗ xe.

### 5.2. Bảng `User` (Người dùng & Nhân sự)
Quản lý toàn bộ tài khoản trong hệ thống theo cơ chế RBAC.
* `_id` (VARCHAR, PK): Mã người dùng.
* `username` (VARCHAR, Unique, Not Null): Tên đăng nhập.
* `email` (VARCHAR, Unique, Nullable): Email xác thực.
* `passwordHash` (VARCHAR): Mật khẩu băm an toàn (bcrypt).
* `googleId` (VARCHAR, Unique, Nullable): Mã xác thực Google OAuth.
* `firstName`, `lastName` (VARCHAR): Họ và tên đệm, tên chính.
* `phoneNumber` (VARCHAR): Số điện thoại liên hệ nhận SMS.
* `avatarUrl` (VARCHAR): Link ảnh đại diện.
* `gender` (VARCHAR): Giới tính (Male/Female/Other).
* `dob` (DATETIME): Ngày tháng năm sinh.
* `roles` (VARCHAR, Default 'Customer'): Phân quyền (`SystemAdmin`, `BranchManager`, `Staff`, `Customer`).
* `status` (VARCHAR, Default 'Active'): Trạng thái tài khoản (`Active`, `Suspended`, `Unverified`).
* `branchId` (VARCHAR, FK -> Branch, Nullable): Cơ sở trực thuộc (dành cho Staff và BranchManager).
* `strikes` (INT, Default 0): Số lần vi phạm quy định thuê xe.
* `identityStatus` (VARCHAR, Default 'Unverified'): Trạng thái eKYC (`Unverified`, `Pending`, `Verified`, `Rejected`).
* `loyaltyPoints` (INT, Default 0): Điểm thưởng tích lũy sau mỗi chuyến đi.
* `referralCode` (VARCHAR, Unique): Mã giới thiệu bạn bè nhận ưu đãi.
* `drivingLicenseUrl` (VARCHAR): Đường dẫn ảnh chụp Giấy phép lái xe đã thẩm định.

### 5.3. Bảng `Category` (Danh mục phân loại xe)
* `_id` (VARCHAR, PK): Mã danh mục.
* `name` (VARCHAR, Unique, Not Null): Tên loại xe (Xe tay ga, Xe số, Xe côn tay, Xe điện).
* `slug` (VARCHAR, Unique, Not Null): Đường dẫn thân thiện (`xe-tay-ga`, `xe-so`).
* `description` (TEXT): Đặc tính kỹ thuật của dòng xe.

### 5.4. Bảng `Vehicle` (Tài sản đội xe)
Quản lý chi tiết từng chiếc xe gắn máy thuộc sở hữu của chuỗi.
* `_id` (VARCHAR, PK): Mã chiếc xe.
* `branchId` (VARCHAR, FK -> Branch, Not Null): Chi nhánh hiện đang quản lý xe.
* `vehicleModel` (VARCHAR, Not Null): Tên đời xe (Honda Vision 2024, Air Blade 160).
* `brand` (VARCHAR, Not Null): Thương hiệu (Honda, Yamaha, Suzuki, VinFast).
* `licensePlate` (VARCHAR, Unique, Not Null): Biển số xe thực tế.
* `odometer` (INT, Default 0): Số km lăn bánh thực tế trên đồng hồ xe.
* `dailyPrice` (FLOAT, Not Null): Giá niêm yết thuê theo ngày (VND).
* `hourlyPrice` (FLOAT, Nullable): Giá thuê tính theo giờ phát sinh.
* `status` (VARCHAR, Default 'Available'): `Available` (Sẵn sàng), `Rented` (Đang cho thuê), `Maintenance` (Đang bảo dưỡng), `Transferring` (Đang điều chuyển).
* `category` (VARCHAR, FK -> Category, Not Null): Thuộc loại xe nào.
* `transmissionType` (VARCHAR): Hộp số (`Automatic`, `Manual`, `Semi-Auto`).
* `fuelType` (VARCHAR, Default 'Gasoline'): Loại nhiên liệu (`Gasoline`, `Electric`).
* `yearManufactured` (INT): Năm sản xuất.
* `requiresMaintenance` (BOOLEAN, Default false): Cờ cảnh báo xe cần đưa vào xưởng.
* `isDeleted` (BOOLEAN, Default false): Cờ xóa mềm (Soft Delete) bảo toàn lịch sử thuê.

### 5.5. Bảng `Booking` (Đơn thuê xe & Hợp đồng giao dịch)
Bảng trung tâm liên kết Khách, Xe, Chi nhánh và Dòng tiền.
* `_id` (VARCHAR, PK): Mã đơn thuê.
* `bookingCode` (VARCHAR, Unique, Not Null): Mã đặt xe chuẩn hóa (`MTV-XXXXXX`).
* `userId` (VARCHAR, FK -> User, Not Null): Khách hàng thuê xe.
* `vehicleId` (VARCHAR, FK -> Vehicle, Not Null): Chiếc xe được thuê.
* `pickupBranchId` (VARCHAR, FK -> Branch, Not Null): Chi nhánh đến nhận xe.
* `returnBranchId` (VARCHAR, FK -> Branch, Not Null): Chi nhánh hẹn đến trả xe.
* `pickupDateTime` (DATETIME, Not Null): Thời gian hẹn lấy xe.
* `returnDateTime` (DATETIME, Not Null): Thời gian hẹn trả xe.
* `totalAmount` (FLOAT, Not Null): Tổng số tiền thuê dự tính.
* `depositAmount` (FLOAT, Default 0): Số tiền cọc thanh toán trước (30%).
* `remainingAmount` (FLOAT, Default 0): Số tiền còn lại phải thanh toán tại quầy (70%).
* `status` (VARCHAR, Default 'Pending'): `Pending` -> `Approved` -> `Confirmed` -> `Ongoing` -> `Completed` -> `Cancelled` / `Rejected`.
* `approvedBy` (VARCHAR, FK -> User, Nullable): Nhân viên chi nhánh duyệt đơn.
* `rejectReason` (VARCHAR, Nullable): Lý do từ chối nếu có.
* `discountId` (VARCHAR, FK -> Discount, Nullable): Mã giảm giá đã áp dụng.
* `eSignatureUrl` (VARCHAR, Nullable): Ảnh chữ ký số trên biên bản bàn giao xe.
* `loyaltyPointsEarned` (INT, Default 0): Điểm thưởng tích được từ đơn này.
* `actualReturnDateTime` (DATETIME, Nullable): Thời gian trả xe thực tế chốt tại quầy.
* `lateFee` (FLOAT, Default 0): Phụ phí phát sinh do trả xe trễ giờ.
* `damageFee` (FLOAT, Default 0): Phụ phí bồi thường hư hại xe phát hiện lúc kiểm tra.

### 5.6. Bảng `VehicleTransfer` (Điều chuyển xe giữa 2 chi nhánh)
* `_id` (VARCHAR, PK): Mã lệnh điều chuyển.
* `vehicleId` (VARCHAR, FK -> Vehicle, Not Null): Chiếc xe được chuyển.
* `fromBranchId` (VARCHAR, FK -> Branch, Not Null): Chi nhánh xuất phát.
* `toBranchId` (VARCHAR, FK -> Branch, Not Null): Chi nhánh tiếp nhận.
* `transferReason` (VARCHAR, Not Null): Lý do (Cân bằng xe cuối tuần, Đưa xe về xưởng lớn).
* `requestedBy` (VARCHAR, FK -> User, Not Null): Quản lý cơ sở yêu cầu.
* `approvedBy` (VARCHAR, FK -> User, Nullable): Quản lý phê duyệt.
* `status` (VARCHAR, Default 'Pending'): `Pending` -> `Approved` -> `InTransit` -> `Completed` -> `Rejected`.
* `departureTime`, `arrivalTime` (DATETIME): Thời gian xuất bến và đến nơi thực tế.
* `notes` (TEXT): Ghi chú tình trạng xe lúc bàn giao.

### 5.7. Bảng `MaintenanceLog` (Nhật ký bảo dưỡng kỹ thuật)
* `_id` (VARCHAR, PK): Mã nhật ký.
* `vehicleId` (VARCHAR, FK -> Vehicle, Not Null): Chiếc xe được bảo dưỡng.
* `branchId` (VARCHAR, FK -> Branch, Not Null): Cơ sở chịu trách nhiệm bảo dưỡng.
* `maintenanceType` (VARCHAR, Default 'Routine'): `Routine` (Định kỳ), `Repair` (Sửa chữa sự cố).
* `description` (TEXT, Not Null): Nội dung (Thay nhớt máy, thay nhớt lap, thay má phanh).
* `cost` (FLOAT, Default 0): Chi phí sửa chữa, thay thế linh kiện (VND).
* `startDate`, `endDate` (DATETIME): Thời gian bắt đầu và hoàn tất bảo dưỡng.
* `performedBy` (VARCHAR): Tên thợ máy hoặc xưởng liên kết thực hiện.
* `odometerAtMaintenance` (INT): Số km hiển thị trên đồng hồ tại thời điểm làm dịch vụ.
* `status` (VARCHAR, Default 'Scheduled'): `Scheduled` -> `InProgress` -> `Completed`.

### 5.8. Bảng `StaffSchedule` (Phân ca trực nhân viên)
* `_id` (VARCHAR, PK): Mã ca trực.
* `staffId` (VARCHAR, FK -> User, Not Null): Nhân viên được phân ca.
* `branchId` (VARCHAR, FK -> Branch, Not Null): Cơ sở làm việc.
* `shiftDate` (DATETIME, Not Null): Ngày trực.
* `shiftType` (VARCHAR, Default 'Morning'): Ca làm (`Morning`: 8h-13h, `Afternoon`: 13h-18h, `Evening`: 18h-22h).
* `checkInTime`, `checkOutTime` (DATETIME): Giờ điểm danh thực tế bằng GPS/App.
* `status` (VARCHAR, Default 'Assigned'): `Assigned` (Được giao), `Present` (Có mặt), `Absent` (Vắng), `OnLeave` (Nghỉ phép).
* `notes` (VARCHAR): Ghi chú bàn giao ca.

### 5.9. Bảng `Complaint` (Xử lý sự cố & Khiếu nại)
* `_id` (VARCHAR, PK): Mã khiếu nại.
* `customerId` (VARCHAR, FK -> User, Not Null): Khách hàng khiếu nại.
* `bookingId` (VARCHAR, FK -> Booking, Nullable): Liên kết đơn thuê phát sinh sự cố.
* `branchId` (VARCHAR, FK -> Branch, Nullable): Chi nhánh liên quan chịu trách nhiệm.
* `title` (VARCHAR, Not Null): Tiêu đề sự cố (Xe bị thủng lốp dọc đường, Tranh chấp tiền cọc).
* `description` (TEXT, Not Null): Mô tả chi tiết sự việc.
* `status` (VARCHAR, Default 'Pending'): `Pending` -> `Investigating` -> `Resolved` -> `Rejected`.
* `priority` (VARCHAR, Default 'Medium'): Mức độ khẩn cấp (`Low`, `Medium`, `High`, `Urgent`).
* `resolutionNotes` (TEXT): Kết luận xử lý và phương án đền bù của quản lý.
* `resolvedBy` (VARCHAR, FK -> User, Nullable): Người xử lý dứt điểm khiếu nại.

### 5.10. Bảng `AuditLog` (Nhật ký kiểm toán an toàn hệ thống)
* `_id` (VARCHAR, PK): Mã bản ghi kiểm toán.
* `userId` (VARCHAR, FK -> User, Not Null): Ai vừa thực hiện thao tác.
* `action` (VARCHAR, Not Null): Hành động (`CREATE_BOOKING`, `REFUND_DEPOSIT`, `UPDATE_PRICE`...).
* `entity` (VARCHAR, Not Null): Thực thể bị tác động (`Booking`, `Vehicle`, `Branch`...).
* `entityId` (VARCHAR): Mã ID của đối tượng bị thay đổi.
* `details` (TEXT): Dữ liệu cũ và mới trước khi sửa (JSON diff).
* `ipAddress` (VARCHAR): Địa chỉ IP mạng của thiết bị gửi yêu cầu.
* `userAgent` (VARCHAR): Thông tin trình duyệt / thiết bị.
* `timestamp` (DATETIME): Mốc thời gian chính xác đến từng mili-giây.

### 5.11. Bảng `Discount` (Mã giảm giá / Voucher)
* `_id` (VARCHAR, PK): Mã voucher.
* `code` (VARCHAR, Unique, Not Null): Mã khuyến mãi nhập vào (VD: `HELLOSUMMER`).
* `description` (VARCHAR): Mô tả chương trình.
* `discountPercent` (INT, Default 0): Tỷ lệ giảm giá (%).
* `maxDiscountAmount` (FLOAT, Default 0): Số tiền giảm tối đa (VND).
* `minBookingAmount` (FLOAT, Default 0): Giá trị đơn hàng tối thiểu để được áp mã.
* `startDate`, `endDate` (DATETIME): Thời gian hiệu lực.
* `usageLimit` (INT, Default 100): Tổng số lượt mã được sử dụng.
* `usedCount` (INT, Default 0): Số lượt đã sử dụng thực tế.
* `isActive` (BOOLEAN, Default true): Trạng thái kích hoạt mã.

### 5.12. Bảng `Feedback` (Đánh giá chất lượng sau chuyến đi)
* `_id` (VARCHAR, PK): Mã đánh giá.
* `userId` (VARCHAR, FK -> User, Not Null): Khách hàng đánh giá.
* `vehicleId` (VARCHAR, FK -> Vehicle, Not Null): Chiếc xe được đánh giá.
* `bookingId` (VARCHAR, FK -> Booking, Unique, Not Null): Đơn thuê (Quan hệ 1-1, 1 đơn chỉ đánh giá 1 lần).
* `rating` (INT, Default 5): Số sao chấm từ 1 đến 5 sao.
* `comment` (TEXT): Nhận xét của khách về độ êm của xe, thái độ nhân viên.
* `response` (TEXT): Phản hồi công khai của đại diện chuỗi cửa hàng.
* `respondedBy` (VARCHAR, FK -> User, Nullable): Nhân viên/Quản lý phản hồi.
* `isPublic` (BOOLEAN, Default true): Cho phép hiển thị công khai trên website.

### 5.13. Bảng `Notification` (Thông báo đẩy in-app)
* `_id` (VARCHAR, PK): Mã thông báo.
* `userId` (VARCHAR, FK -> User, Not Null): Người nhận thông báo.
* `title` (VARCHAR, Not Null): Tiêu đề thông báo.
* `body` (TEXT, Not Null): Nội dung chi tiết.
* `type` (VARCHAR, Default 'SYSTEM'): Loại (`BOOKING`, `REMINDER`, `PROMO`, `MAINTENANCE`).
* `isRead` (BOOLEAN, Default false): Trạng thái đã xem hay chưa.
* `data` (TEXT): Dữ liệu đính kèm (JSON chứa `bookingId` để bấm vào chuyển trang).

### 5.14. Bảng `BookingReminder` (Nhắc lịch tự động SMS/Email)
* `_id` (VARCHAR, PK): Mã lịch nhắc.
* `bookingId` (VARCHAR, FK -> Booking, Not Null): Đơn thuê cần nhắc.
* `reminderType` (VARCHAR): Loại nhắc (`PICKUP_UPCOMING`, `RETURN_UPCOMING`, `RETURN_OVERDUE`).
* `scheduledTime` (DATETIME): Thời điểm hệ thống sẽ tự động kích hoạt gửi.
* `sentTime` (DATETIME, Nullable): Thời điểm đã gửi tin nhắn thành công.
* `status` (VARCHAR, Default 'Pending'): `Pending` -> `Sent` -> `Failed`.
* `channel` (VARCHAR, Default 'SMS'): Kênh gửi (`SMS`, `Email`).

### 5.15. Bảng `Conversation` (Phiên hội thoại chat trực tuyến)
* `_id` (VARCHAR, PK): Mã cuộc trò chuyện.
* `participants` (TEXT): Mảng danh sách User IDs tham gia phòng chat.
* `lastMessageId` (VARCHAR, Nullable): Tin nhắn mới nhất để hiển thị preview.

### 5.16. Bảng `Message` (Chi tiết tin nhắn chat thời gian thực)
* `_id` (VARCHAR, PK): Mã tin nhắn.
* `conversationId` (VARCHAR, FK -> Conversation, Not Null): Thuộc cuộc hội thoại nào.
* `senderId` (VARCHAR, FK -> User, Not Null): Người gửi tin nhắn.
* `content` (TEXT, Not Null): Nội dung tin nhắn văn bản.
* `isRead` (BOOLEAN, Default false): Trạng thái người bên kia đã đọc tin chưa.

### 5.17. Bảng `Banner` (Quảng cáo slider trang chủ - Phân hệ CMS)
* `_id` (VARCHAR, PK): Mã banner.
* `title` (VARCHAR, Not Null): Tên banner quảng cáo.
* `imageUrl` (VARCHAR, Not Null): Đường dẫn ảnh banner.
* `linkUrl` (VARCHAR, Nullable): Link điều hướng khi người dùng nhấp vào ảnh.
* `position` (INT, Default 0): Thứ tự ưu tiên hiển thị trên slide ảnh.
* `isActive` (BOOLEAN, Default true): Bật/Tắt hiển thị ngoài trang chủ.

### 5.18. Bảng `StaticPage` (Trang tĩnh chính sách & FAQ - Phân hệ CMS)
* `_id` (VARCHAR, PK): Mã trang.
* `slug` (VARCHAR, Unique, Not Null): Đường dẫn URL (`about-us`, `terms`, `privacy`, `faq`).
* `title` (VARCHAR, Not Null): Tiêu đề trang bài viết.
* `content` (TEXT, Not Null): Nội dung bài viết chi tiết định dạng HTML/Markdown.
* `isPublished` (BOOLEAN, Default false): Trạng thái công khai hay lưu nháp.
* `updatedBy` (VARCHAR, FK -> User, Nullable): Admin chỉnh sửa gần nhất.

---

# 6. PHÂN RÃ 5 MÔ-ĐUN NGHIỆP VỤ & SƠ ĐỒ LIÊN KẾT (KÈM CODE JSON)

Để đảm bảo CSDL mạch lạc, dễ quản lý và không bị hiện tượng "chằng chịt", hệ thống được phân rã thành **5 mô-đun độc lập**:

### 6.1. Mô-đun 1: Thuê Xe & Đặt Cọc (Core Rental Flow)
* **Thành phần:** `User`, `Booking`, `Vehicle`, `Branch`, `Discount`.
* **Sơ đồ:**
```
[User] (1) ───────────< (N) [Booking] (N) >─────────── (1) [Vehicle]
                              │
               ┌──────────────┴──────────────┐
               ▼ (N)                         ▼ (N)
          [Branch] (1)                  [Discount] (1)
  (pickupBranch / returnBranch)
```
<details>
<summary><b>👉 Bấm vào đây để xem / copy toàn bộ mã JSON Mô-đun 1 (Import vào DrawDB)</b></summary>

```json
{
  "author": "Motov Team",
  "title": "Mo-dun 1: Thue Xe & Giao Dich (Core Rental Flow)",
  "date": "2026-09-21",
  "tables": [
    {
      "id": 0, "name": "User", "x": 80, "y": 80, "comment": "Khach hang thue xe",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"username","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"","id":1},
        {"name":"firstName","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":2},
        {"name":"lastName","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":3},
        {"name":"phoneNumber","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4},
        {"name":"identityStatus","type":"VARCHAR","default":"Unverified","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"eKYC","id":5},
        {"name":"drivingLicenseUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"GPLX","id":6}
      ],
      "indices": []
    },
    {
      "id": 1, "name": "Booking", "x": 480, "y": 80, "comment": "Don thue xe",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"bookingCode","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"MTV-XXXXXX","id":1},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":2},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":3},
        {"name":"pickupBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch (nhan)","id":4},
        {"name":"returnBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch (tra)","id":5},
        {"name":"pickupDateTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":6},
        {"name":"returnDateTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":7},
        {"name":"totalAmount","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Tong tien","id":8},
        {"name":"depositAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Coc 30%","id":9},
        {"name":"remainingAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Con lai 70%","id":10},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/Approved/Ongoing...","id":11},
        {"name":"discountId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Discount","id":12}
      ],
      "indices": []
    },
    {
      "id": 2, "name": "Vehicle", "x": 880, "y": 80, "comment": "Xe duoc thue",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"vehicleModel","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Vision, SH...","id":1},
        {"name":"licensePlate","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Bien so","id":2},
        {"name":"dailyPrice","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Gia/ngay","id":3},
        {"name":"status","type":"VARCHAR","default":"Available","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Available/Rented...","id":4},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":5}
      ],
      "indices": []
    },
    {
      "id": 3, "name": "Branch", "x": 480, "y": 520, "comment": "Chi nhanh nhan/tra xe",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"name","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Ten chi nhanh","id":1},
        {"name":"code","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"CN-Q1","id":2},
        {"name":"address","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"phone","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    },
    {
      "id": 4, "name": "Discount", "x": 80, "y": 520, "comment": "Ma giam gia ap dung",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"code","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Voucher code","id":1},
        {"name":"discountPercent","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"% giam","id":2},
        {"name":"maxDiscountAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Toi da VND","id":3}
      ],
      "indices": []
    }
  ],
  "relationships": [
    {"id":0,"name":"booking_user","startTableId":0,"startFieldId":0,"endTableId":1,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":1,"name":"booking_vehicle","startTableId":2,"startFieldId":0,"endTableId":1,"endFieldId":3,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":2,"name":"booking_pickup_branch","startTableId":3,"startFieldId":0,"endTableId":1,"endFieldId":4,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":3,"name":"booking_return_branch","startTableId":3,"startFieldId":0,"endTableId":1,"endFieldId":5,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":4,"name":"booking_discount","startTableId":4,"startFieldId":0,"endTableId":1,"endFieldId":12,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":5,"name":"vehicle_branch","startTableId":3,"startFieldId":0,"endTableId":2,"endFieldId":5,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"}
  ],
  "notes": [],
  "subjectAreas": [
    {"id":0,"name":"MÔ-ĐUN 1: THUÊ XE & GIAO DỊCH","x":40,"y":30,"width":1100,"height":720,"color":"#3b82f6"}
  ],
  "types": []
}
```
</details>

---

### 6.2. Mô-đun 2: Đội Xe & Vận Hành Chi Nhánh (Fleet & Operations)
* **Thành phần:** `Category`, `Vehicle`, `Branch`, `VehicleTransfer`, `MaintenanceLog`.
* **Sơ đồ:**
```
[Category] (1) ──< (N) [Vehicle] (N) >── (1) [Branch]
                           │                     │
               ┌───────────┴───────────┐         │
               ▼ (N)                   ▼ (N)     ▼
      [VehicleTransfer]         [MaintenanceLog] ┘
     (fromBranch/toBranch)      (bảo dưỡng tại xưởng)
```
<details>
<summary><b>👉 Bấm vào đây để xem / copy toàn bộ mã JSON Mô-đun 2 (Import vào DrawDB)</b></summary>

```json
{
  "author": "Motov Team",
  "title": "Mo-dun 2: Quan Ly Doi Xe & Van Hanh Chi Nhanh (Fleet Operations)",
  "date": "2026-09-21",
  "tables": [
    {
      "id": 0, "name": "Category", "x": 80, "y": 80, "comment": "Phan loai xe",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"name","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Tay ga/Xe so...","id":1},
        {"name":"slug","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"","id":2}
      ],
      "indices": []
    },
    {
      "id": 1, "name": "Vehicle", "x": 450, "y": 80, "comment": "Xe cua chi nhanh",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":1},
        {"name":"category","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Category","id":2},
        {"name":"vehicleModel","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Vision, AirBlade","id":3},
        {"name":"licensePlate","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Bien so","id":4},
        {"name":"odometer","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"So km","id":5},
        {"name":"dailyPrice","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Gia/ngay","id":6},
        {"name":"status","type":"VARCHAR","default":"Available","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Available/Rented/Maintenance/Transferring","id":7},
        {"name":"requiresMaintenance","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8}
      ],
      "indices": []
    },
    {
      "id": 2, "name": "Branch", "x": 880, "y": 80, "comment": "Chi nhanh quan ly kho xe",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"name","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Ten chi nhanh","id":1},
        {"name":"code","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"CN-Q1","id":2},
        {"name":"address","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"phone","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    },
    {
      "id": 3, "name": "VehicleTransfer", "x": 180, "y": 480, "comment": "Dieu chuyen xe giua 2 chi nhanh",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":1},
        {"name":"fromBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch (di)","id":2},
        {"name":"toBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch (den)","id":3},
        {"name":"transferReason","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Can bang xe/Bao duong","id":4},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/InTransit/Completed","id":5}
      ],
      "indices": []
    },
    {
      "id": 4, "name": "MaintenanceLog", "x": 680, "y": 480, "comment": "Nhat ky bao duong sua chua",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":1},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":2},
        {"name":"maintenanceType","type":"VARCHAR","default":"Routine","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Routine/Repair","id":3},
        {"name":"description","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Thay nhot, phanh...","id":4},
        {"name":"cost","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Chi phi VND","id":5},
        {"name":"odometerAtMaintenance","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"So km","id":6}
      ],
      "indices": []
    }
  ],
  "relationships": [
    {"id":0,"name":"vehicle_category","startTableId":0,"startFieldId":0,"endTableId":1,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":1,"name":"vehicle_branch","startTableId":2,"startFieldId":0,"endTableId":1,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":2,"name":"transfer_vehicle","startTableId":1,"startFieldId":0,"endTableId":3,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":3,"name":"transfer_from","startTableId":2,"startFieldId":0,"endTableId":3,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":4,"name":"transfer_to","startTableId":2,"startFieldId":0,"endTableId":3,"endFieldId":3,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":5,"name":"maintenance_vehicle","startTableId":1,"startFieldId":0,"endTableId":4,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":6,"name":"maintenance_branch","startTableId":2,"startFieldId":0,"endTableId":4,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"}
  ],
  "notes": [],
  "subjectAreas": [
    {"id":0,"name":"MÔ-ĐUN 2: QUẢN LÝ ĐỘI XE & VẬN HÀNH","x":40,"y":30,"width":1150,"height":720,"color":"#f59e0b"}
  ],
  "types": []
}
```
</details>

---

### 6.3. Mô-đun 3: Nhân Sự, Ca Trực & Kiểm Toán (HR & Security)
* **Thành phần:** `User`, `Branch`, `StaffSchedule`, `AuditLog`.
* **Sơ đồ:**
```
[Branch] (1) ──< (N) [User] (N) >── (1) [Branch] (Quản lý trưởng cơ sở)
  │                    │
  │                    ├──────────────> (N) [AuditLog] (Nhật ký thao tác)
  ▼ (1)                ▼ (1)
  └───────< (N) [StaffSchedule] (Ca trực nhân viên)
```
<details>
<summary><b>👉 Bấm vào đây để xem / copy toàn bộ mã JSON Mô-đun 3 (Import vào DrawDB)</b></summary>

```json
{
  "author": "Motov Team",
  "title": "Mo-dun 3: Nhan Su, Ca Truc & Kiem Toan (HR & Audit)",
  "date": "2026-09-21",
  "tables": [
    {
      "id": 0, "name": "User", "x": 100, "y": 80, "comment": "Nhan vien & Quan ly",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"username","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"","id":1},
        {"name":"firstName","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":2},
        {"name":"lastName","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":3},
        {"name":"roles","type":"VARCHAR","default":"Staff","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"SystemAdmin/BranchManager/Staff","id":4},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Branch","id":5}
      ],
      "indices": []
    },
    {
      "id": 1, "name": "Branch", "x": 600, "y": 80, "comment": "Chi nhanh truc thuoc",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"name","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Ten chi nhanh","id":1},
        {"name":"code","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"CN-Q1","id":2},
        {"name":"managerId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User (Truong CN)","id":3}
      ],
      "indices": []
    },
    {
      "id": 2, "name": "StaffSchedule", "x": 100, "y": 420, "comment": "Phan ca truc nhan vien",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"staffId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":2},
        {"name":"shiftDate","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Ngay truc","id":3},
        {"name":"shiftType","type":"VARCHAR","default":"Morning","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Morning/Afternoon/Evening","id":4},
        {"name":"checkInTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"checkOutTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":6},
        {"name":"status","type":"VARCHAR","default":"Assigned","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Assigned/Present/Absent","id":7}
      ],
      "indices": []
    },
    {
      "id": 3, "name": "AuditLog", "x": 600, "y": 420, "comment": "Nhat ky thao tac kiem toan",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User (Ai thao tac)","id":1},
        {"name":"action","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"CREATE_BOOKING, EDIT_PRICE...","id":2},
        {"name":"entity","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Booking/Vehicle...","id":3},
        {"name":"entityId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4},
        {"name":"ipAddress","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"timestamp","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":6}
      ],
      "indices": []
    }
  ],
  "relationships": [
    {"id":0,"name":"user_branch","startTableId":1,"startFieldId":0,"endTableId":0,"endFieldId":5,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":1,"name":"branch_manager","startTableId":0,"startFieldId":0,"endTableId":1,"endFieldId":3,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":2,"name":"schedule_staff","startTableId":0,"startFieldId":0,"endTableId":2,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":3,"name":"schedule_branch","startTableId":1,"startFieldId":0,"endTableId":2,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":4,"name":"audit_user","startTableId":0,"startFieldId":0,"endTableId":3,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"}
  ],
  "notes": [],
  "subjectAreas": [
    {"id":0,"name":"MÔ-ĐUN 3: NHÂN SỰ & KIỂM TOÁN","x":50,"y":30,"width":950,"height":680,"color":"#f59e0b"}
  ],
  "types": []
}
```
</details>

---

### 6.4. Mô-đun 4: Chăm Sóc Khách Hàng & Hậu Mãi (Customer Support)
* **Thành phần:** `User`, `Booking`, `Feedback`, `Complaint`, `Notification`, `BookingReminder`.
* **Sơ đồ:**
```
[User] (1) ──< (N) [Booking] (1) ──|| (1) [Feedback] (Đánh giá 1-1)
  │                    │
  ├─> (N) [Notification]│
  │                    ├─> (N) [Complaint] (Khiếu nại sự cố)
  │                    │
  └────────────────────┴─> (N) [BookingReminder] (SMS nhắc lịch)
```
<details>
<summary><b>👉 Bấm vào đây để xem / copy toàn bộ mã JSON Mô-đun 4 (Import vào DrawDB)</b></summary>

```json
{
  "author": "Motov Team",
  "title": "Mo-dun 4: CSKH, Danh Gia & Hau Mai (Support & Feedback)",
  "date": "2026-09-21",
  "tables": [
    {
      "id": 0, "name": "User", "x": 80, "y": 80, "comment": "Khach hang",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"username","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"","id":1},
        {"name":"phoneNumber","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":2}
      ],
      "indices": []
    },
    {
      "id": 1, "name": "Booking", "x": 480, "y": 80, "comment": "Don thue goc",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"bookingCode","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"MTV-XXXXXX","id":1},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":2},
        {"name":"status","type":"VARCHAR","default":"Completed","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":3}
      ],
      "indices": []
    },
    {
      "id": 2, "name": "Notification", "x": 880, "y": 80, "comment": "Thong bao push app",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":2},
        {"name":"body","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"isRead","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    },
    {
      "id": 3, "name": "Complaint", "x": 80, "y": 420, "comment": "Khieu nai su co",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"customerId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"bookingId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Booking","id":2},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Tieu de","id":3},
        {"name":"description","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Mo ta su co","id":4},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/Resolved","id":5}
      ],
      "indices": []
    },
    {
      "id": 4, "name": "Feedback", "x": 480, "y": 420, "comment": "Danh gia sau chuyen di",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"bookingId","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"FK -> Booking (1-1)","id":2},
        {"name":"rating","type":"INT","default":"5","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"1 - 5 sao","id":3},
        {"name":"comment","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Nhan xet","id":4},
        {"name":"response","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Phan hoi tu cua hang","id":5}
      ],
      "indices": []
    },
    {
      "id": 5, "name": "BookingReminder", "x": 880, "y": 420, "comment": "Nhac nho SMS/Email",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"bookingId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Booking","id":1},
        {"name":"reminderType","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"PICKUP/RETURN","id":2},
        {"name":"scheduledTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"channel","type":"VARCHAR","default":"SMS","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"SMS/Email","id":4}
      ],
      "indices": []
    }
  ],
  "relationships": [
    {"id":0,"name":"booking_user","startTableId":0,"startFieldId":0,"endTableId":1,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":1,"name":"notif_user","startTableId":0,"startFieldId":0,"endTableId":2,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":2,"name":"complaint_user","startTableId":0,"startFieldId":0,"endTableId":3,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":3,"name":"complaint_booking","startTableId":1,"startFieldId":0,"endTableId":3,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":4,"name":"feedback_user","startTableId":0,"startFieldId":0,"endTableId":4,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":5,"name":"feedback_booking","startTableId":1,"startFieldId":0,"endTableId":4,"endFieldId":2,"cardinality":"One to one","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":6,"name":"reminder_booking","startTableId":1,"startFieldId":0,"endTableId":5,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"}
  ],
  "notes": [],
  "subjectAreas": [
    {"id":0,"name":"MÔ-ĐUN 4: CSKH & ĐÁNH GIÁ","x":40,"y":30,"width":1100,"height":680,"color":"#10b981"}
  ],
  "types": []
}
```
</details>

---

### 6.5. Mô-đun 5: Giao Tiếp Trực Tuyến & CMS (Chat & Content)
* **Thành phần:** `Conversation`, `Message`, `Banner`, `StaticPage`, `User`.
* **Sơ đồ:**
```
[Conversation] (1) ──< (N) [Message] (N) >── (1) [User]

[Banner] (Độc lập trang chủ)          [StaticPage] (Điều khoản/FAQ độc lập)
```
<details>
<summary><b>👉 Bấm vào đây để xem / copy toàn bộ mã JSON Mô-đun 5 (Import vào DrawDB)</b></summary>

```json
{
  "author": "Motov Team",
  "title": "Mo-dun 5: Giao Tiep Chat & Quan Tri CMS (Chat & CMS)",
  "date": "2026-09-21",
  "tables": [
    {
      "id": 0, "name": "User", "x": 80, "y": 80, "comment": "Nguoi dung he thong",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"username","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"","id":1}
      ],
      "indices": []
    },
    {
      "id": 1, "name": "Conversation", "x": 480, "y": 80, "comment": "Cuoc hoi thoai chat",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"participants","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Array User IDs","id":1},
        {"name":"lastMessageId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":2}
      ],
      "indices": []
    },
    {
      "id": 2, "name": "Message", "x": 480, "y": 380, "comment": "Tin nhan",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"conversationId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Conversation","id":1},
        {"name":"senderId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":2},
        {"name":"content","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"isRead","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    },
    {
      "id": 3, "name": "Banner", "x": 880, "y": 80, "comment": "Banner quang cao",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":1},
        {"name":"imageUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":2},
        {"name":"linkUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":3},
        {"name":"isActive","type":"BOOLEAN","default":"true","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    },
    {
      "id": 4, "name": "StaticPage", "x": 880, "y": 380, "comment": "Trang tinh (Dieu khoan, FAQ)",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"slug","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"about/terms/faq","id":1},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":2},
        {"name":"content","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"isPublished","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    }
  ],
  "relationships": [
    {"id":0,"name":"message_conversation","startTableId":1,"startFieldId":0,"endTableId":2,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":1,"name":"message_sender","startTableId":0,"startFieldId":0,"endTableId":2,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"}
  ],
  "notes": [],
  "subjectAreas": [
    {"id":0,"name":"MÔ-ĐUN 5: CHAT & CMS","x":40,"y":30,"width":1100,"height":680,"color":"#8b5cf6"}
  ],
  "types": []
}
```
</details>

---

# 7. CÁC SƠ ĐỒ TRẠNG THÁI VÒNG ĐỜI (STATE LIFECYCLE)

### 7.1. Vòng đời Đơn thuê xe (`Booking.status`)
1. **Pending:** Khách tạo đơn thuê trên Web/App, chờ đặt cọc 30%.
2. **Approved:** Đã cọc 30% thành công qua cổng thanh toán, nhân viên thẩm định sơ bộ.
3. **Confirmed:** Hệ thống khóa chiếc xe lại, xe chuyển sang trạng thái `Rented`.
4. **Ongoing:** Khách đến quầy nhận xe, ký biên bản bàn giao điện tử (`eSignatureUrl`).
5. **Completed:** Khách trả xe, nhân viên chốt số ODO, thu 70% còn lại và phụ phí (nếu có).
6. **Rejected:** Nhân viên từ chối đơn do giấy phép lái xe giả hoặc khách có điểm phạt xấu.
7. **Cancelled:** Khách chủ động hủy đơn trước giờ nhận xe (xử lý hoàn tiền theo quy định).

### 7.2. Vòng đời Chiếc xe (`Vehicle.status`)
1. **Available:** Xe đang rảnh rỗi trong bãi đỗ của chi nhánh, sẵn sàng đón khách.
2. **Rented:** Khách đã nhận chìa khóa và đang lưu thông trên đường.
3. **Maintenance:** Xe đến hạn số km ODO bảo dưỡng hoặc vừa đi tour xa về cần kiểm định xưởng.
4. **Transferring:** Xe đang trên đường điều chuyển từ chi nhánh xuất phát sang chi nhánh đích.

---

# 8. QUY TRÌNH NGHIỆP VỤ CỐT LÕI (CORE BUSINESS FLOWS)

### 8.1. Quy trình Đặt cọc 30% - Thanh toán 70% còn lại
1. Khách hàng chọn Chi nhánh nhận, Chi nhánh trả, Loại xe và Khung giờ.
2. Hệ thống tính tổng tiền `totalAmount`. Yêu cầu thanh toán trước **30% tiền cọc** (`depositAmount`) qua cổng thanh toán trực tuyến.
3. Sau khi cọc thành công, đơn chuyển sang `Approved` và khóa xe thành `Rented`.
4. Khi khách đến nhận xe tại chi nhánh: Nhân viên kiểm tra GPLX đối chiếu eKYC, ký biên bản bàn giao điện tử (`eSignatureUrl`).
5. Khi khách trả xe: Nhân viên đối soát số km lăn bánh thực tế, kiểm tra trầy xước. Thu nốt **70% còn lại** (`remainingAmount`) cộng với phụ phí trễ giờ (`lateFee`) hoặc hư hại (`damageFee`) nếu có.

### 8.2. Quy trình Thuê 1 nơi - Trả 1 nẻo (One-Way Rental)
1. Khách đặt `pickupBranchId` = Chi nhánh Quận 1, nhưng chọn `returnBranchId` = Chi nhánh Sân Bay.
2. Hệ thống vẫn cho phép đặt lệnh nếu Chi nhánh Sân Bay còn chỗ trống trong bãi đỗ.
3. Khi khách hoàn tất trả xe tại Sân Bay: Hệ thống tự động cập nhật trường `Vehicle.branchId` chuyển sang Chi nhánh Sân Bay.
4. Tài sản xe lúc này chính thức thuộc về tồn kho của cơ sở Sân Bay mà không cần thủ tục giấy tờ thủ công.

### 8.3. Quy trình Điều chuyển xe cân bằng tồn kho (`VehicleTransfer`)
1. Quản lý Chi nhánh Sân Bay nhận thấy nhu cầu khách du lịch cuối tuần tăng cao, kho xe sắp hết.
2. Tạo yêu cầu `VehicleTransfer` rút 5 xe Vision từ Chi nhánh Thủ Đức về Sân Bay.
3. Quản lý Chi nhánh Thủ Đức xác nhận lệnh xuất bến (`departureTime`), xe chuyển sang trạng thái `Transferring`.
4. Tài xế vận chuyển xe đến Sân Bay, nhân viên Sân Bay bấm xác nhận tiếp nhận (`arrivalTime`), xe chuyển trạng thái về `Available` tại kho Sân Bay.

---

# 9. HƯỚNG DẪN TÀI NGUYÊN VÀ CÔNG CỤ TRÌNH DIỄN

Toàn bộ mã nguồn dữ liệu và giao diện minh họa đã được lưu sẵn trong thư mục dự án `d:\Motov\Motov\`:

1. **Giao diện Trình chiếu 5 Mô-đun (Khuyên dùng khi báo cáo với cô):**
   * Đường dẫn: `d:\Motov\Motov\xem_tung_modun.html`
   * *Đặc điểm:* Chỉ cần mở bằng trình duyệt Chrome/Edge, có 5 nút tab bấm chuyển qua lại mượt mà, sơ đồ card trực quan, không có dây chéo.
2. **File CSDL Tổng thể 18 bảng (Đã chuẩn hóa quan hệ 1-N):**
   * Đường dẫn: `d:\Motov\Motov\motov_v2_drawdb.json`
3. **5 File JSON DrawDB riêng cho từng mô-đun:**
   * Mô-đun 1 (Thuê xe & Đặt cọc): `module1_thue_xe.json`
   * Mô-đun 2 (Đội xe & Chi nhánh): `module2_doi_xe_chi_nhanh.json`
   * Mô-đun 3 (Nhân sự & Kiểm toán): `module3_nhan_su_kiem_toan.json`
   * Mô-đun 4 (CSKH & Đánh giá): `module4_cskh_danh_gia.json`
   * Mô-đun 5 (Chat & CMS): `module5_chat_cms.json`

---

# 10. PHỤ LỤC: TOÀN BỘ MÃ NGUỒN JSON IMPORT VÀO DRAWDB

Phần này cung cấp mã nguồn JSON đầy đủ của toàn bộ 18 bảng để bạn có thể copy và Import trực tiếp vào [drawdb.app](https://drawdb.app/editor) bất cứ lúc nào:

<details>
<summary><b>👉 Bấm vào đây để xem / copy Toàn Bộ CSDL 18 Bảng (DrawDB Full Master JSON)</b></summary>

```json
{
  "author": "Motov Team",
  "title": "Motov - Chuoi Cua Hang Cho Thue Xe May",
  "date": "2026-09-15",
  "tables": [
    {
      "id": 0, "name": "Branch", "x": 60, "y": 380, "comment": "Chi nhanh cua hang",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"name","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Ten chi nhanh","id":1},
        {"name":"code","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Ma CN: CN-Q1","id":2},
        {"name":"address","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"phone","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":4},
        {"name":"email","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"location_lng","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Kinh do","id":6},
        {"name":"location_lat","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Vi do","id":7},
        {"name":"hours_open","type":"VARCHAR","default":"08:00","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8},
        {"name":"hours_close","type":"VARCHAR","default":"22:00","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":9},
        {"name":"managerId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User","id":10},
        {"name":"isActive","type":"BOOLEAN","default":"true","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":11},
        {"name":"description","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":12}
      ],
      "indices": []
    },
    {
      "id": 1, "name": "User", "x": 1360, "y": 380, "comment": "Nguoi dung he thong",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"username","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"","id":1},
        {"name":"email","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":false,"increment":false,"comment":"","id":2},
        {"name":"passwordHash","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"bcrypt","id":3},
        {"name":"googleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":false,"increment":false,"comment":"OAuth","id":4},
        {"name":"firstName","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"lastName","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":6},
        {"name":"phoneNumber","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":7},
        {"name":"avatarUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8},
        {"name":"gender","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Male/Female/Other","id":9},
        {"name":"dob","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Ngay sinh","id":10},
        {"name":"roles","type":"VARCHAR","default":"Customer","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"SystemAdmin/BranchManager/Staff/Customer","id":11},
        {"name":"status","type":"VARCHAR","default":"Active","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Active/Suspended/Unverified","id":12},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Branch","id":13},
        {"name":"strikes","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Vi pham","id":14},
        {"name":"identityStatus","type":"VARCHAR","default":"Unverified","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"eKYC","id":15},
        {"name":"loyaltyPoints","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Diem thuong","id":16},
        {"name":"referralCode","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":false,"increment":false,"comment":"Ma gioi thieu","id":17},
        {"name":"drivingLicenseUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Anh GPLX","id":18}
      ],
      "indices": []
    },
    {
      "id": 2, "name": "Vehicle", "x": 480, "y": 380, "comment": "Xe may cua chi nhanh",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":1},
        {"name":"vehicleModel","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Vision, SH...","id":2},
        {"name":"brand","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Honda, Yamaha...","id":3},
        {"name":"licensePlate","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Bien so","id":4},
        {"name":"odometer","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"So km","id":5},
        {"name":"dailyPrice","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Gia/ngay VND","id":6},
        {"name":"hourlyPrice","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Gia/gio VND","id":7},
        {"name":"status","type":"VARCHAR","default":"Available","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Available/Rented/Maintenance/Transferring","id":8},
        {"name":"category","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Category","id":9},
        {"name":"transmissionType","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Manual/Automatic/Semi-Auto","id":10},
        {"name":"fuelType","type":"VARCHAR","default":"Gasoline","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Gasoline/Electric","id":11},
        {"name":"yearManufactured","type":"INT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":12},
        {"name":"requiresMaintenance","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Can bao duong","id":13},
        {"name":"isDeleted","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Soft delete","id":14}
      ],
      "indices": []
    },
    {
      "id": 3, "name": "Category", "x": 480, "y": 80, "comment": "Loai xe may",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"name","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"Tay ga/So/Con tay","id":1},
        {"name":"slug","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"xe-tay-ga","id":2},
        {"name":"description","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":3}
      ],
      "indices": []
    },
    {
      "id": 4, "name": "Booking", "x": 920, "y": 380, "comment": "Don thue xe",
      "color": "#3b82f6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User (Khach)","id":1},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":2},
        {"name":"pickupBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch nhan xe","id":3},
        {"name":"returnBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch tra xe","id":4},
        {"name":"pickupDateTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":5},
        {"name":"returnDateTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":6},
        {"name":"totalAmount","type":"FLOAT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Tong tien VND","id":7},
        {"name":"depositAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Coc 30%","id":8},
        {"name":"remainingAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Con lai 70%","id":9},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/Approved/Confirmed/Ongoing/Completed/Cancelled/Rejected","id":10},
        {"name":"bookingCode","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"MTV-XXXXXX","id":11},
        {"name":"approvedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User (Manager)","id":12},
        {"name":"rejectReason","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":13},
        {"name":"discountId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Discount","id":14},
        {"name":"eSignatureUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Hop dong dien tu","id":15},
        {"name":"loyaltyPointsEarned","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Diem tich luy","id":16},
        {"name":"actualReturnDateTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":17},
        {"name":"lateFee","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Phi tre gio","id":18},
        {"name":"damageFee","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Phi hu hong","id":19}
      ],
      "indices": []
    },
    {
      "id": 5, "name": "VehicleTransfer", "x": 480, "y": 820, "comment": "Dieu chuyen xe giua chi nhanh",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":1},
        {"name":"fromBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch goc","id":2},
        {"name":"toBranchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch dich","id":3},
        {"name":"transferReason","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Can bang xe/Bao duong","id":4},
        {"name":"requestedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":5},
        {"name":"approvedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User","id":6},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/Approved/InTransit/Completed/Rejected","id":7},
        {"name":"departureTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8},
        {"name":"arrivalTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":9},
        {"name":"notes","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":10}
      ],
      "indices": []
    },
    {
      "id": 6, "name": "Complaint", "x": 1360, "y": 820, "comment": "Khieu nai cua khach",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"customerId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"bookingId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Booking","id":2},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> Branch","id":3},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Tieu de","id":4},
        {"name":"description","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":5},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/Investigating/Resolved/Rejected","id":6},
        {"name":"priority","type":"VARCHAR","default":"Medium","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Low/Medium/High/Urgent","id":7},
        {"name":"resolutionNotes","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8},
        {"name":"resolvedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User","id":9}
      ],
      "indices": []
    },
    {
      "id": 7, "name": "MaintenanceLog", "x": 60, "y": 820, "comment": "Lich su bao tri xe",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":1},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":2},
        {"name":"maintenanceType","type":"VARCHAR","default":"Routine","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Routine/Repair/Inspection","id":3},
        {"name":"description","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Thay nhot, phanh...","id":4},
        {"name":"cost","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Chi phi VND","id":5},
        {"name":"startDate","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":6},
        {"name":"endDate","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":7},
        {"name":"performedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Ten tho/gara","id":8},
        {"name":"odometerAtMaintenance","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"So km luc bao duong","id":9},
        {"name":"status","type":"VARCHAR","default":"Scheduled","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Scheduled/InProgress/Completed","id":10}
      ],
      "indices": []
    },
    {
      "id": 8, "name": "AuditLog", "x": 60, "y": 1220, "comment": "Nhat ky he thong",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"action","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"CREATE_BOOKING...","id":2},
        {"name":"entity","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Booking/Vehicle...","id":3},
        {"name":"entityId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4},
        {"name":"details","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"JSON diff","id":5},
        {"name":"ipAddress","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":6},
        {"name":"userAgent","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":7},
        {"name":"timestamp","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8}
      ],
      "indices": []
    },
    {
      "id": 9, "name": "StaffSchedule", "x": 60, "y": 80, "comment": "Phan ca nhan vien",
      "color": "#f59e0b",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"staffId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"branchId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Branch","id":2},
        {"name":"shiftDate","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Ngay truc","id":3},
        {"name":"shiftType","type":"VARCHAR","default":"Morning","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Morning/Afternoon/Evening","id":4},
        {"name":"checkInTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"checkOutTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":6},
        {"name":"status","type":"VARCHAR","default":"Assigned","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Assigned/Present/Absent/OnLeave","id":7},
        {"name":"notes","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8}
      ],
      "indices": []
    },
    {
      "id": 10, "name": "Discount", "x": 920, "y": 80, "comment": "Ma giam gia / Voucher",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"code","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"HELLOSUMMER","id":1},
        {"name":"description","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":2},
        {"name":"discountPercent","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"10 = 10%","id":3},
        {"name":"maxDiscountAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Toi da VND","id":4},
        {"name":"minBookingAmount","type":"FLOAT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Don toi thieu","id":5},
        {"name":"startDate","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":6},
        {"name":"endDate","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":7},
        {"name":"usageLimit","type":"INT","default":"100","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"So luot dung","id":8},
        {"name":"usedCount","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":9},
        {"name":"isActive","type":"BOOLEAN","default":"true","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":10}
      ],
      "indices": []
    },
    {
      "id": 11, "name": "Feedback", "x": 920, "y": 820, "comment": "Danh gia xe va chuyen di",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"vehicleId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Vehicle","id":2},
        {"name":"bookingId","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"FK -> Booking (1-1)","id":3},
        {"name":"rating","type":"INT","default":"5","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"1 den 5 sao","id":4},
        {"name":"comment","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"response","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Phan hoi cua cua hang","id":6},
        {"name":"respondedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User","id":7},
        {"name":"isPublic","type":"BOOLEAN","default":"true","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":8}
      ],
      "indices": []
    },
    {
      "id": 12, "name": "Notification", "x": 1360, "y": 80, "comment": "Thong bao push",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"userId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":1},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":2},
        {"name":"body","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"type","type":"VARCHAR","default":"SYSTEM","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"BOOKING/REMINDER/PROMO/MAINTENANCE","id":4},
        {"name":"isRead","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5},
        {"name":"data","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"JSON meta","id":6}
      ],
      "indices": []
    },
    {
      "id": 13, "name": "BookingReminder", "x": 920, "y": 1220, "comment": "Nhac nho SMS/Email",
      "color": "#10b981",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"bookingId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Booking","id":1},
        {"name":"reminderType","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"PICKUP_UPCOMING/RETURN_UPCOMING/RETURN_OVERDUE","id":2},
        {"name":"scheduledTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"Thoi gian gui","id":3},
        {"name":"sentTime","type":"DATETIME","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4},
        {"name":"status","type":"VARCHAR","default":"Pending","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Pending/Sent/Failed","id":5},
        {"name":"channel","type":"VARCHAR","default":"SMS","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"SMS/Email","id":6}
      ],
      "indices": []
    },
    {
      "id": 14, "name": "Banner", "x": 480, "y": 1220, "comment": "Banner trang chu",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":1},
        {"name":"imageUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":2},
        {"name":"linkUrl","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":3},
        {"name":"position","type":"INT","default":"0","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Thu tu","id":4},
        {"name":"isActive","type":"BOOLEAN","default":"true","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":5}
      ],
      "indices": []
    },
    {
      "id": 15, "name": "StaticPage", "x": 1360, "y": 1220, "comment": "Trang tinh: FAQ, Dieu khoan",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"slug","type":"VARCHAR","default":"","check":"","primary":false,"unique":true,"notNull":true,"increment":false,"comment":"about/terms/faq","id":1},
        {"name":"title","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":2},
        {"name":"content","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"HTML/Markdown","id":3},
        {"name":"isPublished","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4},
        {"name":"updatedBy","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"FK -> User","id":5}
      ],
      "indices": []
    },
    {
      "id": 16, "name": "Conversation", "x": 1800, "y": 80, "comment": "Hoi thoai chat",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"participants","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"Array User IDs","id":1},
        {"name":"lastMessageId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":2}
      ],
      "indices": []
    },
    {
      "id": 17, "name": "Message", "x": 1800, "y": 380, "comment": "Tin nhan chat",
      "color": "#8b5cf6",
      "fields": [
        {"name":"_id","type":"VARCHAR","default":"","check":"","primary":true,"unique":true,"notNull":true,"increment":false,"comment":"PK","id":0},
        {"name":"conversationId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> Conversation","id":1},
        {"name":"senderId","type":"VARCHAR","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"FK -> User","id":2},
        {"name":"content","type":"TEXT","default":"","check":"","primary":false,"unique":false,"notNull":true,"increment":false,"comment":"","id":3},
        {"name":"isRead","type":"BOOLEAN","default":"false","check":"","primary":false,"unique":false,"notNull":false,"increment":false,"comment":"","id":4}
      ],
      "indices": []
    }
  ],
  "relationships": [
    {"id":0,"name":"user_branch","startTableId":0,"startFieldId":0,"endTableId":1,"endFieldId":13,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":1,"name":"branch_manager","startTableId":1,"startFieldId":0,"endTableId":0,"endFieldId":10,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":2,"name":"vehicle_branch","startTableId":0,"startFieldId":0,"endTableId":2,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":3,"name":"vehicle_category","startTableId":3,"startFieldId":0,"endTableId":2,"endFieldId":9,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":4,"name":"booking_user","startTableId":1,"startFieldId":0,"endTableId":4,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":5,"name":"booking_vehicle","startTableId":2,"startFieldId":0,"endTableId":4,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":6,"name":"booking_pickup_branch","startTableId":0,"startFieldId":0,"endTableId":4,"endFieldId":3,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":7,"name":"booking_return_branch","startTableId":0,"startFieldId":0,"endTableId":4,"endFieldId":4,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":8,"name":"booking_discount","startTableId":10,"startFieldId":0,"endTableId":4,"endFieldId":14,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":9,"name":"transfer_vehicle","startTableId":2,"startFieldId":0,"endTableId":5,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":10,"name":"transfer_from","startTableId":0,"startFieldId":0,"endTableId":5,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":11,"name":"transfer_to","startTableId":0,"startFieldId":0,"endTableId":5,"endFieldId":3,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":12,"name":"complaint_user","startTableId":1,"startFieldId":0,"endTableId":6,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":13,"name":"complaint_booking","startTableId":4,"startFieldId":0,"endTableId":6,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":14,"name":"complaint_branch","startTableId":0,"startFieldId":0,"endTableId":6,"endFieldId":3,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":15,"name":"maintenance_vehicle","startTableId":2,"startFieldId":0,"endTableId":7,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":16,"name":"maintenance_branch","startTableId":0,"startFieldId":0,"endTableId":7,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":17,"name":"audit_user","startTableId":1,"startFieldId":0,"endTableId":8,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":18,"name":"schedule_staff","startTableId":1,"startFieldId":0,"endTableId":9,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":19,"name":"schedule_branch","startTableId":0,"startFieldId":0,"endTableId":9,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":20,"name":"feedback_user","startTableId":1,"startFieldId":0,"endTableId":11,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":21,"name":"feedback_vehicle","startTableId":2,"startFieldId":0,"endTableId":11,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":22,"name":"feedback_booking","startTableId":4,"startFieldId":0,"endTableId":11,"endFieldId":3,"cardinality":"One to one","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":23,"name":"notif_user","startTableId":1,"startFieldId":0,"endTableId":12,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":24,"name":"reminder_booking","startTableId":4,"startFieldId":0,"endTableId":13,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":25,"name":"message_conversation","startTableId":16,"startFieldId":0,"endTableId":17,"endFieldId":1,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"},
    {"id":26,"name":"message_sender","startTableId":1,"startFieldId":0,"endTableId":17,"endFieldId":2,"cardinality":"One to many","updateConstraint":"No action","deleteConstraint":"No action"}
  ],
  "notes": [],
  "subjectAreas": [
    {"id":0,"name":"1. CHI NHÁNH & NHÂN SỰ","x":30,"y":30,"width":380,"height":1500,"color":"#3b82f6"},
    {"id":1,"name":"2. ĐỘI XE & BẢO DƯỠNG","x":440,"y":30,"width":420,"height":1500,"color":"#f59e0b"},
    {"id":2,"name":"3. ĐẶT XE & THANH TOÁN","x":880,"y":30,"width":420,"height":1500,"color":"#10b981"},
    {"id":3,"name":"4. NGƯỜI DÙNG & HỖ TRỢ","x":1320,"y":30,"width":420,"height":1500,"color":"#8b5cf6"},
    {"id":4,"name":"5. CHAT TRỰC TUYẾN","x":1760,"y":30,"width":360,"height":1500,"color":"#ec4899"}
  ],
  "types": []
}
```
</details>
