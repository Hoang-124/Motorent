# Phần việc của Tài — triển khai và kiểm thử

Cập nhật: **18/10/2026**, múi giờ Việt Nam. Dự án: `E:\Projects\Motorent`.

Nguồn đối chiếu: `E:\Projects\Motorent.xlsx`, **30 dòng có Sign = Tài** trong `Tong_Quan`: 31–46, 79–84, 122–127, 137, 142. Chúng tương ứng với các dòng 2–31 của sheet `Tai`. Trạng thái trong Excel được giữ nguyên; báo cáo này mô tả mã hiện tại và bằng chứng kiểm tra.

Các thay đổi nằm ở working tree trên máy, nhánh `feat/UC67-72-manager-tai-v2`. Không commit, push hoặc merge lên GitHub. Giữ bố cục đen/màu đào của bản nhóm mới, các route đang có và quy trình đặt xe/thanh toán; bổ sung các màn hình, API và kiểm tra dữ liệu cho phần Tài.

## 1. Kết quả đã chạy

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| TypeScript server | Đạt: `npm --prefix server run typecheck`. |
| Build client | Đạt: `npm --prefix client run build`. Vite còn cảnh báo bundle chung >500 kB; build không lỗi. Các trang quản lý, chi tiết và đặt xe đã tải theo route. |
| Guest API | **13/13** bài đạt, có tìm một ký tự, ảnh đánh giá, phân trang, lịch GMT+7, xe bị xóa và trang chưa xuất bản. |
| Category validation/controller | **27/27** bài đạt; bộ này mock tầng lưu trữ để kiểm tra route, quyền và validation. |
| Vehicle + category trên MongoDB thật, DB kiểm thử riêng | **19/19** bài đạt; gồm thêm/sửa/xóa danh mục thật, xung đột khi vừa xóa danh mục vừa gán xe. |
| Tính giá mùa vụ | **22/22** bài đạt: giá giờ/ngày, trong/ngoài/giao mùa, trả lúc 00:00, làm tròn tiền. |
| Giá/quyền/audit/booking/payment | **19/19** bài đạt; giá báo trước = giá tạo đơn, voucher tính một lần, đổi giá sau đặt không đổi số tiền đơn/payment cũ. IPN VNPay được ký và gọi trong ứng dụng kiểm thử, không giao dịch với ngân hàng thật. |
| Điều chuyển/bảo trì/ODO | **15/15** bài đạt, bao gồm các trạng thái booking đang hoạt động, quyền chi nhánh, phiếu bảo trì và cảnh báo lặp. |
| Dashboard | **8/8** bài đạt: tổng trạng thái, chi nhánh, xe xóa mềm, xe Available nhưng cần bảo trì, chi phí thực tế/dự kiến. |
| Tổng | **123 bài kiểm tra tự động đạt**, cộng bộ kiểm tra helper ảnh và tương thích thuộc tính ảnh với React đang cài. |
| API đang chạy | `/api/health`: `UP`, MongoDB `Connected`. |
| Dữ liệu hiện tại | 20 xe, 4 xe Yamaha. `q=Ya` trả đúng 4 xe; lọc Yamaha + xe tay ga + 90.000–140.000 đ trả 3 xe. |
| Hiệu năng API | 6 nhóm truy vấn, mỗi nhóm 1 lần đầu + 10 lần đo. P95: **12,00–44,97 ms**, dưới 200 ms trên dữ liệu 20 xe của máy này. |
| Ảnh | 5 ảnh mẫu CDN trả HTTP 200, `image/webp`, **14.614–24.160 byte**, tải **809,04–1.066 ms** ở kích thước 640 px. |
| Giao diện bấm trực tiếp | Chưa xác nhận bằng thao tác trình duyệt: Browser Use lỗi khởi tạo; Computer Use bị dừng vì Cốc Cốc chưa hỗ trợ cơ chế kiểm soát URL của công cụ. Bảng thao tác bên dưới là checklist để bạn bấm kiểm tra, không phải nhật ký đã bấm toàn bộ UI. |

Bằng chứng đo trên ứng dụng đang chạy: [API và ảnh](E:/Projects/Motorent/docs/tai-runtime-results.json), [đăng nhập và API quản lý](E:/Projects/Motorent/docs/tai-management-smoke.json). Thời gian trong JSON là UTC; cộng 7 giờ để đổi sang giờ Việt Nam. Kết quả hiệu năng là mẫu đo trên máy này, chưa phải cam kết cho mọi mạng hoặc cơ sở dữ liệu lớn.

## 2. Từng dòng được giao đã triển khai thế nào

Trong mã, Actor **Admin** dùng role `SystemAdmin`; Actor **Manager** dùng `BranchManager`.

| Dòng Tong_Quan / Tai | UC hoặc công việc | Actor | Đã triển khai |
| --- | --- | --- | --- |
| 31 / 2 | UC107 — Add Category | Admin | Trang `/admin/categories`, tạo tên/slug/mô tả; chuẩn hóa slug, báo trùng tên/slug. `POST /api/categories`. |
| 32 / 3 | UC108 — Edit Category | Admin | Chọn Sửa, điền lại dữ liệu, lưu tên/mô tả; hỗ trợ đổi slug hợp lệ; kiểm tra trùng khi cập nhật. `PUT /api/categories/:id`. |
| 33 / 4 | UC109 — Delete Category | Admin | Xác nhận xóa; chặn HTTP 409 khi còn xe chưa xóa mềm được gán. Khóa chung với thao tác gán danh mục để tránh tạo xe mồ côi khi có thao tác đồng thời. |
| 34 / 5 | UC67 — Add Vehicle | Manager | `/manager/vehicles`; thêm đủ thông tin, màu, ODO, URL ảnh tối đa 10. Biển số được chuẩn hóa, kiểm tra duy nhất cả khi đổi màu hoặc xe cũ đã xóa mềm; chi nhánh/danh mục phải tồn tại. Manager chỉ thêm ở chi nhánh mình. |
| 35 / 6 | UC68 — Edit Vehicle | Manager | Sửa thông tin, danh mục, màu, năm, ODO, ảnh và trạng thái hợp lệ; giữ biển số bất biến cả ở API và service. Không giảm ODO. Đổi chi nhánh thực hiện qua UC79–80; giá sửa tại bảng Giá & mùa vụ. |
| 36 / 7 | UC69 — Remove Vehicle | Manager | Xóa mềm `isDeleted=true`; chặn xe có booking Pending/Approved/Confirmed/Ongoing, phiếu bảo trì chưa xong hoặc điều chuyển chưa xử lý. Lịch sử vẫn giữ. Xe xóa mềm biến mất ở Guest; mở URL cũ trả 404. |
| 37 / 8 | UC70 — Daily Price | Manager | `PUT /api/vehicles/:id/pricing`; giá dương, hữu hạn; kiểm tra quyền chi nhánh và ghi audit `UPDATE_VEHICLE_PRICING`. |
| 38 / 9 | UC71 — Hourly Price | Manager | Bảng Giá & mùa vụ sửa giá giờ. Dưới 24 giờ dùng giá giờ nếu có; từ 24 giờ tính tròn ngày. Để trống giá giờ sẽ dùng biểu giá ngày. |
| 39 / 10 | UC12 — Vehicle Detail | Guest | `/bikes/:vehicleId`: gallery đến 10 ảnh, thông số, chi nhánh, giá ngày/giờ, lịch và đánh giá; trạng thái tải/lỗi/thử lại; xe cần bảo trì không có nút đặt hoạt động. |
| 40 / 11 | UC03 — Fleet Catalog | Guest | `/bikes`: lưới/danh sách, ảnh, giá, biển số, trạng thái, phân trang 12 xe. Click tên/ảnh mở chi tiết; nút Đặt xe đi vào luồng đặt xe hiện có. |
| 41 / 12 | UC04–08 — Filters | Guest | Lọc kết hợp chi nhánh, danh mục, giá tối thiểu/tối đa, hãng; thêm lọc chỉ xe sẵn sàng. Server áp dụng bộ lọc, giữ trạng thái trong URL, reset trang khi đổi lọc. |
| 42 / 13 | UC09–10 — Sort | Guest | Giá tăng/giảm, điểm đánh giá tăng/giảm. Điểm lấy từ đánh giá công khai không bị chặn; sắp xếp toàn bộ kết quả trước khi phân trang. |
| 43 / 14 | UC11 — Search | Guest | Tìm một ký tự hoặc chuỗi con trong mẫu xe/hãng/biển số, không phân biệt hoa thường. Escape ký tự regex; gợi ý dưới ô tìm kiếm, chọn gợi ý mở chi tiết. |
| 44 / 15 | UC13 — Reviews | Guest | `GET /api/vehicles/:id/reviews`, phân trang; tên hiển thị, điểm, nội dung, ảnh và phản hồi; loại đánh giá private/blocked. Không tạo đánh giá giả vào DB ứng dụng. Xem phụ thuộc tại mục 6. |
| 45 / 16 | UC72 — Seasonal Pricing | Manager | Thêm, sửa, xóa kỳ giá theo khoảng ngày GMT+7 và hệ số; chặn chồng ngày. Dùng chung phép tính cho quote/estimate/create booking. Khách thấy giá cơ bản, điều chỉnh mùa vụ, ngày/hệ số và tổng tiền. |
| 46 / 17 | UC14 — Rental Policy | Guest | `/rental-policy`, liên kết ở Footer và chi tiết xe; đọc StaticPage đã xuất bản. Script xuất bản riêng không xóa dữ liệu hay ghi đè nội dung đã có. |
| 79 / 18 | UC79 — Request Transfer | Manager | `/manager/fleet` → Điều chuyển chi nhánh. Manager chi nhánh nhận yêu cầu xe từ chi nhánh khác; tạo `Pending`, chưa đổi branchId. Chặn xe bận, cần bảo trì hoặc đã có yêu cầu mở. |
| 80 / 19 | UC80 — Approve Transfer | Manager | Manager chi nhánh đang giữ xe phê duyệt/từ chối; không tự duyệt yêu cầu mình tạo. Phê duyệt kiểm tra lại trạng thái/booking, cập nhật branchId và `Approved`; duyệt lại bị chặn. |
| 81 / 20 | UC77 — Schedule Maintenance | Manager | Lập MaintenanceLog kèm công việc, kỹ thuật viên, dự kiến và chi phí; xe chuyển Maintenance ngay để giữ xe. Có Bắt đầu → Hoàn tất, lưu thời gian thực tế. |
| 82 / 21 | UC78 — Maintenance History | Manager | `GET /api/maintenance/vehicle/:id`, phân trang; tổng tiền đã hoàn tất và tiền dự kiến chưa hoàn tất riêng biệt; giới hạn quyền chi nhánh. |
| 83 / 22 | UC64 — Create Ticket | Staff | Staff dùng cùng màn hình lập phiếu tại chi nhánh mình, ghi lỗi và người phụ trách. Có thể bắt đầu công việc; Manager/Admin xác nhận hoàn tất. Người phụ trách được lưu tên bằng trường `performedBy` của mô hình hiện có. |
| 84 / 23 | ODO Alert System | System | Chạy lúc server khởi động và mỗi 5 phút; so các mốc 1.500 km với `lastMaintenanceBucket`, đặt requiresMaintenance và gửi notification đúng nhân sự. Không tạo lại thông báo cùng xe/mốc/người; hoàn tất bảo trì xóa cờ và lấy mốc mới. |
| 122 / 24 | Vehicle Search Optimization | System | Giữ text index, thêm index phân trang/sắp xếp giá; truy vấn giá lấy trang bằng find/count và gom điểm đánh giá theo lô. Không dùng `$text` thay chuỗi con vì sẽ làm hỏng tìm một ký tự. Kết quả đo ở mục 1. |
| 123 / 25 | Fleet Dashboard UI | Manager | `/manager/dashboard`: tổng xe theo trạng thái, biểu đồ SVG, xe thực sự sẵn sàng, cảnh báo ODO, bảo trì và điều chuyển; Manager chỉ thấy chi nhánh mình, Admin chọn chi nhánh. |
| 124 / 26 | Availability Calendar | Guest | Lịch theo tháng, ngày đã đặt màu đào, chưa có lịch màu xanh, quá khứ màu mờ; đổi tháng và retry khi lỗi. Booking kết thúc lúc 00:00 không chiếm ngày tiếp theo. Không hiển thị lịch giả khi API lỗi. |
| 125 / 27 | Maintenance Log UI | Manager | Timeline có ngày tạo/dự kiến/bắt đầu/kết thúc, tình trạng, người làm, ODO, chi phí, phân trang và bộ lọc theo xe. |
| 126 / 28 | Transfer Approval UI | Manager | Hàng đợi yêu cầu đi/đến, chi nhánh nguồn/đích, lý do, trạng thái, phê duyệt/từ chối có lý do; nút chỉ hiện cho người có quyền. |
| 127 / 29 | ODO Notification UI | Manager | Badge số lượng, thẻ cảnh báo ODO, phân trang cảnh báo; click thẻ chọn xe để lập phiếu/xem lịch sử. Thông báo chuông mở đúng màn hình kỹ thuật. |
| 137 / 30 | Responsive Vehicle Pages | Guest | Điều chỉnh card/spec/footer, bộ lọc, voucher, chi tiết/gallery và các form theo màn hình hẹp; lưới thay đổi theo breakpoint. Build đạt; kiểm tra nhìn/bấm trên các kích thước vẫn cần bạn thực hiện theo checklist. |
| 142 / 31 | Image Optimization | System | Ảnh Cloudinary WebP, giới hạn kích thước, `srcSet/sizes`, lazy loading/async decoding; ảnh chi tiết chính tải ưu tiên. Giữ URL ký số/ngoài CDN nguyên trạng; xử lý ảnh lỗi. 5 mẫu đã đo dưới 2 giây. |

## 3. Mở ứng dụng và dữ liệu thử

Tại PowerShell ở `E:\Projects\Motorent`:

```powershell
npm run dev
```

Mở `http://localhost:5173/`. Lệnh đã kiểm tra và tái sử dụng server/client MOTORENT đang chạy để tránh lỗi cổng 5000 hoặc 5173 bị chiếm. Nếu cổng thuộc ứng dụng khác, lệnh báo rõ để bạn dừng tiến trình đó; không tự tắt ứng dụng của bạn.

**Không chạy `npm run seed` trước mỗi lần dev.** Seed xóa dữ liệu. Trong lần triển khai này không chạy lại seed; chỉ xuất bản lại đúng trang chính sách đang có sau khi DB đã được khởi tạo lại. Mã seeder đã bổ sung mốc ODO ban đầu cho xe demo, xuất bản chính sách thuê xe và dọn quy tắc mùa vụ khi chính bạn chủ động seed lại sau này.

### Tài khoản đã đăng nhập API thành công trên DB hiện tại

| Vai trò | Tên đăng nhập | Mật khẩu seed mặc định | Phạm vi |
| --- | --- | --- | --- |
| Admin | `admin` | `Admin@123456` | Toàn hệ thống |
| Manager A | `manager_dad` | `Manager@123456` | Sân Bay Quốc Tế Đà Nẵng — CN-DAD |
| Manager B | `manager_mk` | `Manager@123456` | Bãi Biển Mỹ Khê — CN-MK |
| Staff A | `staff_dad` | `Staff@123456` | CN-DAD |
| Guest | Đăng xuất hoặc cửa sổ riêng tư | Không cần | Đọc danh sách/chi tiết/chính sách |

Nếu sau này bạn đổi mật khẩu hoặc seed với biến cấu hình khác thì dùng mật khẩu mới. Không đặt các file `.env` vào Git.

**Lưu ý dữ liệu hiện tại:** 20 xe đang có cảnh báo ODO, vì dữ liệu trước đó có ODO 1.500–6.820 km nhưng chưa có mốc bảo trì ban đầu. Dashboard thực tế báo 19 Available, 1 Rented, **0 xe đủ điều kiện cho thuê**, 20 cảnh báo. Available là trạng thái lưu trữ; requiresMaintenance vẫn chặn thuê. Không tự bỏ cờ để vượt kiểm tra. Để thử nhanh, tạo các xe thử ODO thấp dưới đây; hoặc thực hiện đầy đủ phiếu bảo trì cho xe không có booking đang hoạt động.

### Bộ dữ liệu để bạn tạo bằng giao diện

1. Admin tạo `Xe Kiểm Thử Tài`, slug `xe-kiem-thu-tai`, mô tả `Danh mục kiểm thử UC của Tài`.
2. Admin tạo thêm `Danh Mục Xóa Tài`, slug `danh-muc-xoa-tai`; giữ danh mục này không có xe để thử xóa thành công.
3. Dùng các xe riêng cho từng nhóm để thao tác không cản nhau:

| Mã trong checklist | Ai tạo / chi nhánh | Thương hiệu / mẫu xe | Biển số | Giá ngày / giờ | ODO | Mục đích |
| --- | --- | --- | --- | --- | --- | --- |
| A | Manager A / CN-DAD | Yamaha / `Sirius Tai A` | `43-TA 670.01` | 200000 / 30000 | 100 | Sửa thông tin, giá, mùa vụ, Guest/booking |
| B | Manager A / CN-DAD | Yamaha / `Sirius Tai B` | `43-TA 690.01` | 180000 / 25000 | 100 | Xóa mềm |
| C | Manager A / CN-DAD | Yamaha / `Sirius Tai C` | `43-TA 770.01` | 200000 / 30000 | 100 | Phiếu bảo trì và lịch sử |
| D | Manager B / CN-MK | Yamaha / `Sirius Tai D` | `43-TA 790.01` | 200000 / 30000 | 100 | Điều chuyển sang CN-DAD |
| E | Manager A / CN-DAD | Yamaha / `Sirius Tai E` | `43-TA 840.01` | 200000 / 30000 | 1499 | Mốc cảnh báo ODO |

Các xe dùng danh mục `Xe Kiểm Thử Tài`, năm 2024, màu `Xanh đen`, nhiên liệu Xăng, truyền động Số tay. Khi thử lại sau lần đầu, dùng biển số và tên danh mục khác; xe đã xóa mềm vẫn giữ biển số duy nhất.

Dán 3 URL ảnh hợp lệ này vào trường URL ảnh, mỗi dòng một URL:

```text
https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643881/bikes/20_1.jpg.png
https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643884/bikes/20_3.jpg.png
https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643884/bikes/20_4.jpg.png
```

### Địa chỉ cần mở

| Màn hình | Địa chỉ / thao tác |
| --- | --- |
| Danh mục | `/admin/categories` hoặc menu tài khoản → Danh mục xe · Admin |
| Xe, giá và mùa vụ | `/manager/vehicles` hoặc menu tài khoản → Quản lý xe & giá thuê |
| Dashboard | `/manager/dashboard` hoặc menu tài khoản → Tổng quan đội xe |
| Kỹ thuật/điều chuyển | `/manager/fleet`, chọn tab Phiếu bảo trì / Điều chuyển chi nhánh |
| Guest | `/bikes`, click tên xe hoặc ảnh → `/bikes/:id` |
| Chính sách | `/rental-policy`, hoặc Footer → Chính sách thuê xe |

## 4. Checklist bấm trên ứng dụng

Các bước dưới đây là **kiểm thử thủ công bạn cần thực hiện**. Kết quả “đạt” trong cột cuối là tiêu chí cần quan sát, không khẳng định công cụ đã bấm các bước đó. Khi lỗi, ghi tài khoản, biển số, đầu vào, thông báo trên trang và phản hồi ở F12 → Network.

### Admin — UC107–109

| ID / UC | Thao tác và dữ liệu | Tiêu chí đạt |
| --- | --- | --- |
| A01 / UC107 | Admin mở Danh mục, tạo `Xe Kiểm Thử Tài` / `xe-kiem-thu-tai` / mô tả ở trên. | Có thông báo thành công, xuất hiện trong danh sách; tải lại vẫn còn. |
| A02 / UC107 | Tạo danh mục khác nhưng slug `xe-kiem-thu-tai`; sau đó thử tên trùng nhưng slug khác. | Bị từ chối với lỗi rõ ràng; không có bản sao. |
| A03 / UC107 | Bỏ trống tên/slug; thử slug có dấu cách hoặc ký tự không hợp lệ. | Không lưu được, thông báo trường sai; trang vẫn sử dụng được. |
| A04 / UC108 | Sửa tên thành `Xe Kiểm Thử Tài cập nhật`, mô tả `Đã kiểm tra UC108`; giữ slug. | Danh sách và form thêm xe nhận tên mới; mô tả mới vẫn còn sau refresh. |
| A05 / UC109 | Xóa `Danh Mục Xóa Tài` chưa có xe, xác nhận. | Danh mục biến mất sau refresh. |
| A06 / UC109 | Sau khi tạo xe A, thử xóa danh mục đang gán cho A. | Bị chặn; danh mục và xe A vẫn tồn tại. |
| A07 / quyền | Đăng nhập Manager/Staff rồi mở `/admin/categories`. | Trang báo không đủ quyền; gọi API trực tiếp cũng bị chặn (đã kiểm bằng bộ tự động). |

### Manager — UC67–71, xóa xe và quyền chi nhánh

| ID / UC | Thao tác và dữ liệu | Tiêu chí đạt |
| --- | --- | --- |
| V01 / UC67 | Manager A thêm A, B, C, E theo bảng dữ liệu. Manager B thêm D tại Mỹ Khê. | Thêm thành công, đúng chi nhánh, đủ thông số và 3 ảnh; Guest tìm được các xe này. |
| V02 / UC67 | Tạo xe thứ hai biển `43-TA 670.01`, đổi màu thành Đỏ hoặc ODO khác. | Vẫn báo trùng biển số. Thay một thông số khác không cho phép trùng biển. |
| V03 / UC67 | Dán một URL hợp lệ đủ 10 dòng rồi thử thêm xe biển mới; thử lại với 11 dòng. | 10 ảnh được chấp nhận; 11 ảnh bị chặn ở giao diện/API. Dữ liệu cũ không bị thay thế khi sửa thất bại. |
| V04 / UC67 | Giá ngày 0 hoặc âm; ODO âm; URL ảnh `javascript:...`. | Không lưu. Chỉ nhận giá dương, ODO không âm, URL ảnh http/https hợp lệ. |
| V05 / UC68 | Sửa A: màu Đỏ đen, năm 2025, ODO 120, tên `Sirius Tai A Edit`, giữ ảnh. | Lưu và refresh vẫn đúng; Guest chi tiết hiển thị các thông số mới. |
| V06 / UC68 | Quan sát biển số trong form Sửa; thử giảm ODO từ 120 về 100. | Biển số bị khóa; ODO giảm bị từ chối, số đang lưu không đổi. |
| V07 / UC68 | Manager A tìm xe D của Mỹ Khê trong màn quản lý xe. | Không có quyền sửa/xóa D. Thao tác đổi chi nhánh phải qua yêu cầu điều chuyển. |
| V08 / UC70 | Ở A bấm **Giá & mùa vụ**, đổi giá ngày 250000, lưu. Admin mở `/audit`, tìm action `UPDATE_VEHICLE_PRICING` của xe. | Bảng giá mở/cuộn tới được, lưu có phản hồi; giá Guest đổi; có audit thành công. |
| V09 / UC71 | Đổi giá giờ 40000, lưu; sau đó đặt lại A về 200000/ngày và 30000/giờ để chạy phần mùa vụ. | Giá mới hiện sau refresh; thuê 4 giờ ngoài mùa tính 120000 sau khi đặt lại. |
| V10 / UC69 | Xóa mềm xe B chưa có đơn/phiếu/yêu cầu. | Biến mất ở quản lý và Guest; URL chi tiết cũ báo không tìm thấy, không làm mất lịch sử. |
| V11 / UC69 | Tạo lại xe cùng biển B sau khi xóa. | Bị chặn trùng biển số. |
| V12 / UC69 | Thử xóa Honda Vision Smartkey biển `43-B1 100.11` đang có đơn Confirmed; hoặc A sau khi tạo booking Pending. | Bị chặn; xe và đơn vẫn giữ nguyên. Pending ở tương lai cũng được bảo vệ. |
| V13 / quyền | Staff mở `/manager/vehicles` hoặc thử thao tác quản lý giá. | Không đủ quyền quản lý xe/giá, vẫn dùng được màn phiếu kỹ thuật. |

### UC72 — giá mùa vụ và tiền khách nhìn thấy

Trên A, đặt lại **200000 đ/ngày**, **30000 đ/giờ**. Trong Giá & mùa vụ, tạo tên `Cao điểm tháng 12`, từ **12/12/2026** đến **17/12/2026**, hệ số **2.3**. Nếu ô ngày của trình duyệt dùng mm/dd/yyyy, nhập 12/12/2026 và 12/17/2026. Dữ liệu gửi API luôn là `2026-12-12` / `2026-12-17`.

Để số tiền dễ đối chiếu: chọn nhận/trả cùng CN-DAD, xóa mã voucher rồi bấm áp dụng lại khi cần. Các số dưới đây **chưa có voucher/phụ phí khác**. Giờ Việt Nam, trong giờ mở cửa của chi nhánh.

| ID / UC | Thao tác và dữ liệu | Tiêu chí đạt |
| --- | --- | --- |
| P01 / UC72 | Thêm kỳ giá như trên. | Có kỳ giá hiển thị tên, khoảng ngày, ×2.3, nút Sửa và Xóa. |
| P02 / UC72 | Thêm kỳ khác từ 17/12 đến 20/12. | Bị báo chồng ngày vì 17/12 thuộc kỳ đã có; không tạo bản thứ hai. |
| P03 / UC72 | Nhập từ ngày sau đến ngày, hoặc hệ số 0, âm, >10. | Bị chặn, báo lỗi rõ ràng. |
| P04 / giá ngoài mùa | Mở A phía Guest → Đặt xe. Chọn 10/12/2026 08:00 → 11/12/2026 08:00. | 1 ngày: giá cơ bản 200000, điều chỉnh mùa vụ 0, tổng thuê 200000. |
| P05 / giá ngày trong mùa | Chọn 12/12 08:00 → 14/12 08:00. | 2 ngày: cơ bản **400000**, tăng mùa vụ **520000**, thuê **920000**, cọc 30% **276000**, còn lại **644000**. |
| P06 / giá giờ trong mùa | Chọn 13/12 08:00 → 13/12 12:00. | 4 giờ: cơ bản **120000**, tăng **156000**, tổng **276000**. |
| P07 / giao mùa | Chọn 11/12 08:00 → 12/12 08:00. | Cơ bản 200000; 16 giờ ngoài mùa + 8 giờ trong mùa; tăng **86667**, tổng **286667**. UI nêu ngày/hệ số và điều chỉnh, không nhân 2.3 cho cả phần ngoài mùa. |
| P08 / sửa kỳ giá | Bấm Sửa kỳ đang có, đổi 2.3 → 1.5, lưu; quay lại báo giá P05 hoặc refresh. | Chính kỳ được cập nhật, không báo chồng với chính nó. P05 thành cơ bản **400000**, tăng **200000**, tổng **600000**. |
| P09 / xóa kỳ giá | Bấm Xóa kỳ, mở lại lịch P05. | Tổng thuê về **400000**, không còn phần điều chỉnh mùa vụ. |
| P10 / tích hợp booking | Tạo lại ×2.3; ở P05 đi qua các bước đặt xe, so số tiền ở bước cuối với phần tổng kết sau tạo đơn. | Cùng một số tiền; server tính lại, không tin giá gửi từ client. Đổi biểu giá sau khi tạo không sửa số tiền của đơn đã lưu. Không cần thanh toán ngân hàng thật để kiểm tra phép tính. |

Hệ số áp dụng theo **ngày lịch Việt Nam**. Nếu một đơn vị thuê giao qua nửa đêm, tiền được phân bổ theo phần thời gian thực sự nằm trong từng ngày. Điều này giải thích trường hợp P07. Giá giờ dùng khi thời lượng dưới 24 giờ và xe có giá giờ; từ 24 giờ dùng ngày làm tròn lên. Phần tiền được làm tròn sao cho chi tiết cộng lại đúng tổng.

### Guest — UC03–14 và lịch xe

Trước khi thêm xe thử, DB hiện có 20 xe, trong đó 4 Yamaha. Sau khi bạn thêm dữ liệu, số xe tăng; đối chiếu theo bộ lọc/tên thay vì luôn yêu cầu tổng 20.

| ID / UC | Thao tác và dữ liệu | Tiêu chí đạt |
| --- | --- | --- |
| G01 / UC03 | Đăng xuất, mở `/bikes`, đổi Lưới ↔ Danh sách; bấm Trang sau/Trước khi có >12 xe. | Không cần đăng nhập; mỗi xe có ảnh/giá/trạng thái; trang tiếp theo là dữ liệu khác, không trùng trang cũ. |
| G02 / UC04–08 | Chọn chi nhánh Sân Bay rồi Mỹ Khê. | Chỉ các xe thuộc chi nhánh chọn; đổi bộ lọc về trang 1. |
| G03 / UC04–08 | Chọn Xe tay ga, hãng Yamaha, giá 90000–140000. | Trước dữ liệu thử: Janus 90000, Grande Hybrid 120000, NVX 140000; không có Sirius 80000. |
| G04 / UC04–08 | Nhập giá từ 200000, đến 100000. | Hiện lỗi khoảng giá; không âm thầm trả cả danh sách. Sửa lại khoảng hợp lệ thì tìm được. |
| G05 / UC04–08 | Bật Chỉ xe sẵn sàng. | Không có Rented/Maintenance/Transferring hoặc xe requiresMaintenance=true. Xe thử ODO thấp có thể xuất hiện; xe đang cảnh báo không có mặt. |
| G06 / UC09–10 | Chọn Giá thấp→cao, rồi cao→thấp. | Đơn giá theo đúng thứ tự trên toàn bộ tập lọc, kể cả đổi trang. |
| G07 / UC09–10 | Chọn Đánh giá cao→thấp rồi thấp→cao. | Dùng điểm đánh giá thật. Nếu tất cả chưa có đánh giá thì đều 0; không giả điểm để tạo thứ tự. Tình huống có điểm khác nhau đã kiểm bằng DB kiểm thử riêng. |
| G08 / UC11 | Gõ `Y`, rồi `Ya`, rồi `ya`. | Chỉ một ký tự đã tìm được, không cần Enter; gợi ý xuất hiện dưới ô tìm; Ya/ya cùng kết quả. Trên DB hiện tại trước xe thử có 4 kết quả Ya. |
| G09 / UC11 | Gõ `Sirius Tai` hoặc phần biển số `670.01`; bấm một gợi ý. | Đúng xe A; gợi ý mở chi tiết A, không nhảy sang xe khác. |
| G10 / UC11 | Gõ `(`, `.*`, hoặc chuỗi không tồn tại. | Tìm ký tự theo nghĩa literal; không crash, không trả toàn bộ do regex, thông báo không có kết quả khi thích hợp. |
| G11 / UC12 | Click tên/ảnh A, bấm các thumbnail và mũi tên gallery. | Đúng ảnh đang chọn và thông số; có chi nhánh, ODO, màu/năm, ngày/giờ; quay lại giữ bộ lọc. |
| G12 / UC12 | Mở một xe đang cảnh báo ODO hoặc Maintenance. | Hiển thị chưa sẵn sàng/cần bảo dưỡng, nút đặt bị khóa; không chỉ khóa trên card rồi lại mở được trên chi tiết. |
| G13 / lịch / dòng124 | Mở Honda Vision biển `43-B1 100.11`, chọn tháng 10/2026. | Với seed hiện tại, các ngày **18,19,20/10** có lịch thuê màu đào. Đổi tháng thấy dữ liệu đúng tháng. Ngày có thuê được phân biệt bằng nhãn lẫn màu. |
| G14 / lịch | Sau khi tạo đơn A, mở chi tiết A và tháng chứa lịch đặt. | Ngày thuê mới được đánh dấu. Trả đúng 00:00 không chiếm thêm ngày tiếp theo; quy tắc biên đã kiểm tự động. |
| G15 / UC13 | Kéo đến đánh giá khi DB hiện tại chưa có review. | Hiện Chưa có đánh giá, không hiển thị review giả và không báo “lỗi mạng” thay trạng thái trống. |
| G16 / UC13 có dữ liệu | Sau khi phần Reviews CRUD của Tuyên có, tạo ≥6 đánh giá công khai cho cùng xe bằng các booking đã hoàn tất khác nhau; ít nhất một review có ảnh. | Trang chi tiết có sao/nội dung/ảnh, 5 review/trang và trang 2; review bị ẩn/chặn không xuất hiện. Hiện chưa bấm được toàn luồng vì API tạo review chưa có, xem mục 6. |
| G17 / UC14 | Footer → Chính sách thuê xe; thử từ liên kết trong chi tiết xe. | Mở `/rental-policy`, có nội dung StaticPage đã xuất bản; không yêu cầu đăng nhập. |
| G18 / lỗi mạng | Trong DevTools Network chuyển Offline rồi tải trang danh sách/chi tiết/lịch; sau đó Online và Thử lại/Tải lại. | Có lỗi rõ ràng, không spinner vô hạn; không tô lịch “trống” giả lúc API lỗi; phục hồi được sau kết nối. |

### Điều chuyển — UC79–80 và hàng đợi

| ID / UC | Thao tác và dữ liệu | Tiêu chí đạt |
| --- | --- | --- |
| T01 / UC79 | Manager A mở Điều chuyển chi nhánh, chọn D đang ở Mỹ Khê; lý do `Bổ sung xe phục vụ khách CN-DAD`; gửi. | Tạo Pending; D vẫn thuộc Mỹ Khê, chưa về DAD. |
| T02 / UC79 | Gửi yêu cầu D lần nữa trước khi xử lý; thử chọn xe cần bảo trì hoặc có booking. | Yêu cầu lặp/xe không hợp lệ bị chặn. Server vẫn kiểm tra dù dữ liệu dropdown đã cũ. |
| T03 / UC80 | Manager A xem chính yêu cầu mình tạo. | Không có nút tự duyệt; không tự chuyển xe qua chi nhánh mình. |
| T04 / UC80 | Đăng nhập Manager B (Mỹ Khê), mở hàng đợi, Phê duyệt D. | D chuyển CN-DAD, yêu cầu hiện Đã điều chuyển/Approved; Manager A thấy D, Manager B không còn sửa D. |
| T05 / UC80 | Bấm duyệt lại từ trang cũ hoặc tải lại. | Không chuyển xe lần thứ hai; trạng thái đã xử lý được giữ. |
| T06 / từ chối | Tạo một xe thử khác tại Mỹ Khê, Manager A yêu cầu; Manager B bấm Từ chối, nhập `Chi nhánh đang cần giữ xe phục vụ khách`. | Lưu Rejected và lý do, xe vẫn ở Mỹ Khê; cả hai bên đọc được lý do. |
| T07 / bảo vệ đơn thuê | Có yêu cầu Pending rồi tạo booking cho xe trước khi nguồn duyệt; thử duyệt yêu cầu cũ. | Duyệt bị chặn vì server kiểm tra lại booking; không làm hỏng đơn vừa tạo. |

### Bảo trì / Staff / ODO — UC77–78, UC64 và các UI liên quan

| ID / UC | Thao tác và dữ liệu | Tiêu chí đạt |
| --- | --- | --- |
| M01 / UC64 | Staff A mở Phiếu bảo trì; chọn C, loại Sửa chữa, nội dung `Phanh trước có tiếng kêu khi bóp`, kỹ thuật viên `Nguyễn Văn An`, dự kiến để trống, chi phí 150000; tạo. | Có phiếu Scheduled/Đã lên lịch; C chuyển Maintenance, không cho đặt thuê. Tên người phụ trách được lưu. |
| M02 / UC77 | Manager tạo phiếu khác với thời gian dự kiến ngày mai. | Xe bị giữ ở Maintenance ngay, hiện thời gian dự kiến; nút Bắt đầu chưa hoạt động trước lịch. Để thử toàn quy trình nhanh, dùng phiếu M01 để trống thời gian. |
| M03 / UC77 | Trên phiếu C bấm Bắt đầu công việc. | InProgress/Đang thực hiện, có giờ bắt đầu thực tế; không tạo thêm phiếu mở thứ hai cho cùng xe. |
| M04 / quyền | Staff xem phiếu C đang thực hiện. | Staff không có quyền xác nhận Hoàn tất; cần Manager/Admin. |
| M05 / hoàn tất | Manager A chọn Ghi nhận hoàn tất, chi phí thực tế 180000, kỹ thuật viên Nguyễn Văn An, ODO 120; xác nhận. | Completed, thời gian kết thúc được lưu; C về Available, cờ bảo trì được xóa; chi phí thực tế là 180000. |
| M06 / UC78 | Chọn lịch sử riêng C. | Timeline có đủ mốc thời gian, mô tả, kỹ thuật viên, ODO; tổng thực tế **180000**, dự kiến chưa hoàn tất 0. |
| M07 / UC78 | Tạo/bắt đầu/hoàn tất thêm phiếu C chi phí 70000. | Tổng thực tế **250000**, không chỉ cộng những phiếu của trang đang xem. Tạo >8 phiếu hợp lệ qua từng vòng để thử phân trang. |
| M08 / chống dữ liệu sai | Thử chi phí âm; ODO hoàn tất thấp hơn ODO xe; lập phiếu xe có booking hoặc phiếu đang mở. | Bị chặn; không đổi xe về Available hoặc ghi nhận hoàn tất giả. |
| M09 / quyền chi nhánh | Staff/Manager A thử dữ liệu kỹ thuật của chi nhánh B. | Không đọc/sửa/hoàn tất dữ liệu ngoài phạm vi được cấp. |
| O01 / ODO | Xe E đang 1499 km; Manager sửa lên 1500. | Có cờ cần bảo trì; không đặt thuê. Sau tối đa khoảng 5 phút, tải lại: có thẻ ODO và thông báo chuông của nhân sự đúng chi nhánh. |
| O02 / ODO notification | Bấm thông báo chuông hoặc thẻ E; chờ qua lần quét tiếp theo. | Mở đúng trang kỹ thuật/xe E; không nhân đôi thông báo cùng mốc 1500 khi quét lặp. |
| O03 / xử lý ODO | Tạo phiếu E, Bắt đầu, Manager hoàn tất ODO 1500. | E đủ điều kiện cho thuê trở lại. Chạy quét sau đó không báo lại mốc đã xử lý. |
| O04 / mốc tiếp | Sửa E lên 2999, rồi 3000. | Chưa cảnh báo mới ở 2999; mốc 3000 tạo cảnh báo mới. Không giảm ODO về 0 để thử lại. |
| O05 / UI | Nếu có >8 xe cảnh báo, chuyển trang ở danh sách cảnh báo. | Đọc được các cảnh báo còn lại; badge vẫn là tổng đúng phạm vi. |

### Dashboard / responsive / hiệu năng

| ID / công việc | Thao tác | Tiêu chí đạt |
| --- | --- | --- |
| D01 / dòng123 | Manager A mở Tổng quan đội xe, so với danh sách xe của DAD. | Tổng trạng thái = tổng xe chưa xóa; các biểu đồ và bảng khớp. Số sẵn sàng cho thuê loại xe có requiresMaintenance. |
| D02 / dòng123 | Admin chọn DAD, Mỹ Khê rồi tất cả. | Chỉ số đổi đúng phạm vi; Manager không chọn được chi nhánh khác. |
| D03 / liên thông | Theo dõi dashboard trước/sau tạo phiếu C, hoàn tất C và duyệt D. Bấm tải lại. | Maintenance tăng/giảm tương ứng; tổng xe nguồn/đích thay đổi sau chuyển; chi phí hoàn tất và dự kiến tách biệt. |
| R01 / dòng137 | F12 → chế độ thiết bị, thử **360×800**, **768×1024**, **1366×768**; mở danh sách, chi tiết, giá và phiếu kỹ thuật. | Không tràn ngang toàn trang, input/nút không che nhau; gallery và danh mục có cuộn riêng, các nút thao tác bấm được. |
| R02 / dòng137 | Trên điện thoại: nhập từ khóa, chọn gợi ý, đổi lọc, xem gallery, đổi tháng, mở/đóng hộp thoại kỹ thuật. | Nội dung không bị menu/hộp thoại che; không có nút ghi chức năng nhưng không phản hồi. |
| F01 / dòng122 | Chạy `npm run check:tai-runtime`, mở `docs/tai-runtime-results.json`. | Các mục searches báo thời gian/thống kê cụ thể; trên mẫu đã đo P95 <200 ms. Dữ liệu lớn hơn cần đo lại. |
| F02 / dòng142 | DevTools Network → Img; mở danh sách/chi tiết, cuộn xuống, xem URL/Content-Type ảnh Cloudinary. | Có `f_webp`, giới hạn `w_...`; Content-Type WebP. Ảnh dưới màn hình lazy load, ảnh chính không chờ lazy; ảnh lỗi có trạng thái thay thế. |
| F03 / dòng142 | Xem ảnh ngoài Cloudinary hoặc ảnh ký số nếu có. | Giữ URL hợp lệ gốc, không sửa làm mất chữ ký; không cam kết nén WebP cho máy chủ ngoài quyền kiểm soát. |

## 5. Chạy lại kiểm tra tự động

```powershell
cd E:\Projects\Motorent
npm run test:tai
npm --prefix server run typecheck
npm --prefix client run build
npm run check:tai-runtime
```

`test:tai` chọn các cấu hình riêng, không dùng cấu hình test cũ của nhóm. Các bộ có MongoDB kết nối cố định `127.0.0.1:27017`, tạo tên DB ngẫu nhiên riêng, kiểm tra đúng host/tên DB trước dọn dữ liệu. Không xóa `motorent_db` của ứng dụng. Bộ category controller dùng mock; bộ management có kiểm tra API category thật trên DB riêng. Bộ ảnh không gọi mạng/DB; kiểm tra URL, resize, URL ký số, srcSet và React.

`check:tai-runtime` chỉ đọc ứng dụng và tải 5 ảnh mẫu, ghi báo cáo JSON. Cần server đang chạy; không tạo xe, đơn hay thanh toán. File báo cáo có thể đổi số lượng nếu bạn đã nhập thêm dữ liệu thử.

## 6. Phần cần phối hợp / giới hạn kiểm chứng

| Phần | Hiện trạng, phụ thuộc và cách xử lý |
| --- | --- |
| Review thật từ Customer → Guest | Excel `Tong_Quan` dòng **58**, **UC39–41 Reviews CRUD**, giao **Tuyên**; dòng **132 Review Listing UI** cũng giao Tuyên. Hiện `feedbackRoutes.ts` chỉ có GET `/public`, chưa có POST/PUT/DELETE đánh giá. Không thực hiện thay phần Reviews CRUD của Tuyên. UC13 đọc của Tài đã có và đã kiểm với DB riêng, nhưng chưa kiểm toàn luồng khách tự viết review thật trên UI. DB ứng dụng hiện có 0 review công khai, nên trạng thái trống là đúng. |
| Chuẩn bị ≥6 review có ảnh | Cần Tuyên hoàn thiện UC39–41 và dữ liệu booking Completed hợp lệ; sau đó dùng các booking khác nhau để tạo review. Không dùng một booking tạo nhiều review và không thêm review giả vào dữ liệu đang dùng. |
| Đặt xe/thanh toán/eKYC của nhóm | Các module nền đã tồn tại, nên giá mùa vụ đã nối vào phép tính đặt xe. Đã kiểm signed IPN bằng ứng dụng thử cục bộ và số tiền lưu. Chưa thực hiện thanh toán ngân hàng thật, gửi OTP hay xét hồ sơ người thật. |
| Giao diện lọc của Dương | Dòng 50 `Vehicle Filters FE` giao Dương có vùng chức năng giao nhau. Đã nối bộ lọc trong FleetPage hiện tại cho các AC của Tài, giữ bố cục nhóm; cần phối hợp khi nhóm gộp nhánh để tránh ghi đè cùng file. Không đổi trạng thái công việc của Dương trong Excel. |
| Mobile/tablet và bấm nút thực tế | CSS/component đã cập nhật và build đạt. Công cụ điều khiển trình duyệt bị chặn chính sách URL Cốc Cốc, nên các bước UI ở mục 4 cần bạn xác nhận. Không coi build hoặc API pass là bằng chứng đã bấm mọi nút trên mọi kích thước. |
| Hiệu năng | Đã đo đạt trên dữ liệu 20 xe và 5 ảnh CDN tại thời điểm ghi JSON. Chưa load test nhiều người, hàng nghìn xe, mạng chậm hoặc mọi nhà cung cấp ảnh. Tìm chuỗi con vẫn dùng regex an toàn; text index không tăng tốc được mọi truy vấn một ký tự. |
| Xe seed cũ đang báo ODO | Đã sửa mốc ODO trong **mã seed cho lần khởi tạo tương lai**, không chạy seed lại và không tự xóa cảnh báo/giả lập bảo trì cho các xe hiện tại. Dùng bộ xe thử ODO thấp, hoặc hoàn tất bảo trì hợp lệ để thử đặt xe. |

Không có UC khác của Tài cần viết thay một module chưa được giao để phần đọc/quản lý chính hoạt động. Điểm còn chờ rõ nhất là **toàn luồng tạo review thật của Tuyên**; các hạn chế kiểm chứng UI/hiệu năng được ghi riêng ở trên.

## 7. File mã chính để đối chiếu

- [Route màn hình và quyền truy cập](E:/Projects/Motorent/client/src/App.tsx).
- [Danh sách Guest](E:/Projects/Motorent/client/src/pages/FleetPage.tsx), [chi tiết/lịch/review](E:/Projects/Motorent/client/src/pages/VehicleDetailPage.tsx), [chính sách](E:/Projects/Motorent/client/src/pages/RentalPolicyPage.tsx).
- [Danh mục Admin](E:/Projects/Motorent/client/src/pages/AdminCategoriesPage.tsx), [API danh mục](E:/Projects/Motorent/server/src/modules/category/categoryService.ts).
- [Xe Manager](E:/Projects/Motorent/client/src/pages/ManagerVehiclesPage.tsx), [service xe](E:/Projects/Motorent/server/src/modules/vehicle/vehicleService.ts).
- [Bảng giá mùa vụ](E:/Projects/Motorent/client/src/components/VehiclePricingPanel.tsx), [phép tính giá](E:/Projects/Motorent/server/src/modules/pricing/pricingCalculator.ts), [nối booking](E:/Projects/Motorent/server/src/modules/booking/bookingService.ts).
- [Kỹ thuật/điều chuyển/timeline](E:/Projects/Motorent/client/src/pages/FleetOperationsPage.tsx), [điều chuyển](E:/Projects/Motorent/server/src/modules/fleet/transferService.ts), [bảo trì](E:/Projects/Motorent/server/src/modules/fleet/maintenanceService.ts).
- [Dashboard UI](E:/Projects/Motorent/client/src/pages/FleetDashboardPage.tsx), [API dashboard](E:/Projects/Motorent/server/src/modules/fleet/dashboardRoutes.ts), [cron ODO](E:/Projects/Motorent/server/src/core/jobs/odometerAlertJob.ts).
- [Tối ưu ảnh](E:/Projects/Motorent/client/src/utils/imageHelper.ts), [lệnh chạy test riêng](E:/Projects/Motorent/scripts/test-tai.cjs).
