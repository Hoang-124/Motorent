# MOTORENT - Tài Liệu Kỹ Thuật & Nghiệp Vụ (Documentation Index)

Hệ thống tài liệu dự án MOTORENT được quy hoạch và quản lý tập trung theo cấu trúc sau:

## 1. Nguồn Chân Lý Duy Nhất (Single Source of Truth)
* **`MOTORENT_SRS_Document.md`**: **BẢN CHUẨN DUY NHẤT (Canonical SRS)** đặc tả toàn bộ yêu cầu nghiệp vụ, luồng quy trình (Use Cases), kiến trúc Modular Monolith, mô hình 18 thực thể dữ liệu và ma trận phân quyền RBAC 4 cấp (`SystemAdmin`, `BranchManager`, `Staff`, `Customer`).
  - Mọi cập nhật và thay đổi nghiệp vụ bắt buộc phải đối chiếu và chỉnh sửa trên tệp này.
  - Các tệp Word (`.docx`) trong thư mục là các bản xuất bản (exports) từ tệp Markdown nguồn này.

## 2. Ma Trận Trạng Thái Triển Khai (Sprint & Task Matrix)
* **`MOTORENT_TASK_MATRIX.tsv`**: Bảng theo dõi tiến độ chi tiết theo Sprint, User Story, độ ưu tiên, phân công trách nhiệm và trạng thái hoàn thành thực tế (`Status`).

## 3. Bản Vẽ Thiết Kế & Sơ Đồ Hệ Thống
* **`motorent_overview_usecase.drawio`** & **`motorent_overview_usecase.svg`**: Sơ đồ tổng quan Use Cases toàn hệ thống (SVG vector thuần, 0 emoji).
* **`motorent_dbdiagram.dbml`** & thư mục **`dbml/`**: Định nghĩa cấu trúc 18 Mongoose models dạng Database Markup Language (DBML) cho DBdiagram.
* **`motorent_screen_flow.jpg`** & **`motorent_package_diagram.jpg`**: Sơ đồ luồng màn hình UI và phân rã các package kiến trúc.

## 4. Tài Liệu Lịch Sử (Legacy Archive)
* **`TAI_LIEU_TONG_HOP_HE_THONG_MOTOV.md`**: Bản nháp tài liệu ban đầu từ giai đoạn khảo sát, được lưu giữ để tra cứu bối cảnh lịch sử. Khi có sự khác biệt, luôn lấy `MOTORENT_SRS_Document.md` làm chuẩn cao nhất.
