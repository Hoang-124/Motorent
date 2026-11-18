import os
from PIL import Image, ImageDraw, ImageFont

def generate_package_architecture_diagram(output_path='docs/diagrams/modular_monolith_architecture.png'):
    width = 2400
    height = 1350
    img = Image.new('RGB', (width, height), color='#0C0C0C')
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 44)
        font_box_header = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 24)
        font_subhead = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
        font_body = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 19)
        font_body_bold = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 19)
        font_code = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 18)
        font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 16)
    except Exception:
        font_title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 44)
        font_box_header = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 24)
        font_subhead = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 20)
        font_body = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
        font_body_bold = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 19)
        font_code = ImageFont.truetype('C:/Windows/Fonts/couri.ttf', 18)
        font_badge = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 16)

    COLOR_BG = '#0C0C0C'
    COLOR_CARD = '#161616'
    COLOR_PEACH = '#FFC799'
    COLOR_MINT = '#99FFE4'
    COLOR_BLUE = '#70B4FF'
    COLOR_PURPLE = '#D1A3FF'
    COLOR_ROSE = '#FF7D8A'
    COLOR_TEXT_WHITE = '#FFFFFF'
    COLOR_TEXT_MUTED = '#A8A8A8'

    # Background grid
    for x in range(0, width, 60):
        draw.line([(x, 0), (x, height)], fill='#141414', width=1)
    for y in range(0, height, 60):
        draw.line([(0, y), (width, y)], fill='#141414', width=1)

    # Header
    draw.rectangle([80, 50, width - 80, 160], fill='#141414', outline=COLOR_PEACH, width=2)
    draw.rounded_rectangle([110, 68, 480, 100], radius=6, fill='#261E16', outline=COLOR_PEACH, width=1)
    draw.text((125, 74), "MOTORENT BACKEND ARCHITECTURE • MỤC 6", font=font_badge, fill=COLOR_PEACH)
    draw.text((110, 108), "KIẾN TRÚC MODULAR MONOLITH & VÒNG ĐỜI XỬ LÝ YÊU CẦU AN TOÀN", font=font_title, fill=COLOR_TEXT_WHITE)

    # 4 Layers Horizontal / Grid layout
    # Layer 1: Client & Entry Layer (Top left)
    # Layer 2: Core Protection Layer (Middle left)
    # Layer 3: 22 Domain Feature Modules (Center)
    # Layer 4: Foundation Layer (Models, Locks, Database)

    # CARD 1: CLIENTS & ENTRY LAYER
    draw.rounded_rectangle([80, 190, 780, 560], radius=16, fill=COLOR_CARD, outline=COLOR_BLUE, width=2)
    draw.rounded_rectangle([80, 190, 780, 255], radius=16, fill='#1B232E', outline=COLOR_BLUE, width=1)
    draw.rectangle([80, 240, 780, 255], fill='#1B232E')
    draw.text((105, 210), "TẦNG 1: CLIENTS & ENTRY LAYER (routes/index.ts)", font=font_box_header, fill=COLOR_TEXT_WHITE)

    cy = 280
    draw.text((105, cy), "• Clients tương tác:", font=font_body_bold, fill=COLOR_BLUE)
    cy += 28
    draw.text((125, cy), "- Web App Khách hàng (React 19, Tailwind, Lucide SVG)", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((125, cy), "- Quầy giao dịch tại trạm (Tablet / Mobile Staff Web)", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((125, cy), "- Admin & Manager Dashboard (KPI, Phân ca AI, Quản lý đội xe)", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 35

    draw.text((105, cy), "• Central Router Entry (src/routes/index.ts):", font=font_body_bold, fill=COLOR_TEXT_WHITE)
    cy += 28
    draw.text((125, cy), "- Tiền tố duy nhất: /api/* gắn với 22 router con độc lập", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((125, cy), "- Rate Limiter, Helmet bảo vệ HTTP Headers, CORS đa nguồn", font=font_body, fill=COLOR_TEXT_MUTED)

    # CARD 2: CORE MIDDLEWARES (Bottom left)
    draw.rounded_rectangle([80, 590, 780, 1280], radius=16, fill=COLOR_CARD, outline=COLOR_PEACH, width=2)
    draw.rounded_rectangle([80, 590, 780, 655], radius=16, fill='#261E16', outline=COLOR_PEACH, width=1)
    draw.rectangle([80, 640, 780, 655], fill='#261E16')
    draw.text((105, 610), "TẦNG 2: BẢO VỆ TẬP TRUNG (src/core/middlewares)", font=font_box_header, fill=COLOR_TEXT_WHITE)

    cy = 680
    mws = [
        ("authMiddleware.ts", "Xác thực JWT Bearer Token, kiểm tra tokenVersion trong DB để vô hiệu hóa tức thì phiên đăng nhập khi tài khoản bị khóa/đổi mật khẩu."),
        ("rbacMiddleware.ts", "Phân quyền ma trận nghiêm ngặt 4 vai trò: SystemAdmin, BranchManager, Staff, Customer. Chặn truy cập trái quyền ở mức Router."),
        ("auditMiddleware.ts", "Tự động chặn bắt mọi hành vi POST/PUT/DELETE nhạy cảm, lọc che các trường bí mật ([REDACTED]) và ghi nhật ký vào bảng AuditLog."),
        ("uploadMiddleware.ts", "Multer xử lý tải ảnh xe, ảnh hợp đồng, ảnh GPLX/CCCD (eKYC) với giới hạn 5MB và kiểm tra định dạng MIME chuẩn hóa an toàn."),
        ("errorHandler.ts", "Bộ tập trung xử lý ngoại lệ toàn cục, chuẩn hóa cấu trúc phản hồi lỗi JSON { success: false, message, code }.")
    ]
    for mw_name, mw_desc in mws:
        draw.rounded_rectangle([105, cy, 320, cy + 28], radius=4, fill='#2B221B')
        draw.text((115, cy + 4), mw_name, font=font_code, fill=COLOR_PEACH)
        cy += 34
        draw.text((115, cy), mw_desc, font=font_body, fill=COLOR_TEXT_MUTED)
        cy += 64

    # CARD 3: 22 FEATURE MODULES (Middle column)
    draw.rounded_rectangle([830, 190, 1610, 1280], radius=16, fill=COLOR_CARD, outline=COLOR_MINT, width=2)
    draw.rounded_rectangle([830, 190, 1610, 255], radius=16, fill='#152B28', outline=COLOR_MINT, width=1)
    draw.rectangle([830, 240, 1610, 255], fill='#152B28')
    draw.text((855, 210), "TẦNG 3: 22 FEATURE MODULES (src/modules/)", font=font_box_header, fill=COLOR_TEXT_WHITE)

    cy = 280
    draw.text((855, cy), "Cấu trúc chuẩn hóa: Controller -> Service -> Routes (Low Coupling, High Cohesion)", font=font_body_bold, fill=COLOR_MINT)
    cy += 38

    modules = [
        ("modules/auth/", "Đăng ký, Đăng nhập, eKYC xác thực GPLX, Đổi mật khẩu, OTP"),
        ("modules/branch/", "Quản lý mạng lưới chi nhánh trạm, Định vị GPS Haversine tìm trạm gần nhất"),
        ("modules/vehicle/", "Quản lý danh mục, thông số xe, 4 góc ảnh xe, cảnh báo bảo dưỡng ODO"),
        ("modules/booking/", "Luồng đặt xe trung tâm, Cọc 30% VNPay/VietQR, 70% tất toán, Ký hợp đồng"),
        ("modules/fleet/", "Lệnh điều chuyển xe giữa các trạm (VehicleTransfer), Nhật ký bảo dưỡng"),
        ("modules/hr/", "Lập lịch ca trực tuần thông minh (AI Dual-Engine), Điểm danh vào/ra ca"),
        ("modules/support/", "Đánh giá 1-1 (Feedback), Khiếu nại (Complaint), Lịch nhắc SMS Cron"),
        ("modules/cms/", "Quản lý Banner quảng cáo, Trang tĩnh điều khoản, Live Chat Socket.IO")
    ]
    for mod_name, mod_desc in modules:
        draw.rounded_rectangle([855, cy, 1585, cy + 85], radius=8, fill='#1A1F1E', outline='#2A3D38', width=1)
        draw.rounded_rectangle([870, cy + 10, 1080, cy + 38], radius=4, fill='#142E28')
        draw.text((880, cy + 14), mod_name, font=font_code, fill=COLOR_MINT)
        draw.text((875, cy + 48), mod_desc, font=font_body, fill=COLOR_TEXT_WHITE)
        cy += 98

    draw.rounded_rectangle([855, cy, 1585, cy + 120], radius=8, fill='#201C16', outline=COLOR_PEACH, width=1)
    draw.text((875, cy + 12), "QUY TẮC BẤT BIẾN CỦA MODULAR MONOLITH:", font=font_subhead, fill=COLOR_PEACH)
    draw.text((875, cy + 42), "• Không phụ thuộc vòng (Zero Circular Dependency) giữa các module.", font=font_body, fill=COLOR_TEXT_MUTED)
    draw.text((875, cy + 68), "• Mỗi module là một ranh giới nghiệp vụ độc lập (Bounded Context),", font=font_body, fill=COLOR_TEXT_MUTED)
    draw.text((875, cy + 92), "  dễ dàng tách thành Microservices khi quy mô chuỗi mở rộng toàn quốc.", font=font_body, fill=COLOR_TEXT_MUTED)

    # CARD 4: CONCURRENCY LOCKS & DATABASE (Right column)
    draw.rounded_rectangle([1660, 190, 2320, 1280], radius=16, fill=COLOR_CARD, outline=COLOR_PURPLE, width=2)
    draw.rounded_rectangle([1660, 190, 2320, 255], radius=16, fill='#241B2E', outline=COLOR_PURPLE, width=1)
    draw.rectangle([1660, 240, 2320, 255], fill='#241B2E')
    draw.text((1685, 210), "TẦNG 4: KHÓA TÀI NGUYÊN & CƠ SỞ DỮ LIỆU", font=font_box_header, fill=COLOR_TEXT_WHITE)

    cy = 280
    draw.text((1685, cy), "4.1. Động cơ Khóa Tài Nguyên Đồng Thời (Resource Lock):", font=font_subhead, fill=COLOR_PURPLE)
    cy += 32
    draw.text((1705, cy), "• Hàng đợi FIFO Promise Queue chống Race Condition đặt trùng xe.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• Cơ chế Khóa TTL tự động giải phóng (Avoid Deadlock).", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• withOptionalTransaction: MongoDB Atomic Session bảo đảm tính toàn vẹn.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 40

    draw.text((1685, cy), "4.2. 24 Mongoose Data Models Chuẩn Hóa:", font=font_subhead, fill=COLOR_TEXT_WHITE)
    cy += 32
    db_groups = [
        ("Định danh & Phân ca (3):", "User, StaffSchedule, StaffAvailability"),
        ("Đội xe & Chi nhánh (6):", "Branch, Vehicle, Category, SeasonalPricingRule, VehicleTransfer, MaintenanceLog"),
        ("Hợp đồng & Thanh toán (4):", "Booking, Payment, Discount, BookingReminder"),
        ("Hỗ trợ & Giao tiếp (6):", "Complaint, Feedback, Review, Wishlist, Conversation, Message"),
        ("Hệ thống & Cấu hình (5):", "AuditLog, Notification, Banner, StaticPage, SystemConfig")
    ]
    for g_title, g_models in db_groups:
        draw.text((1705, cy), g_title, font=font_body_bold, fill=COLOR_MINT)
        cy += 24
        draw.text((1705, cy), g_models, font=font_body, fill=COLOR_TEXT_MUTED)
        cy += 32

    cy += 20
    draw.text((1685, cy), "4.3. Hạ Tầng Dữ Liệu MongoDB:", font=font_subhead, fill=COLOR_PEACH)
    cy += 30
    draw.text((1705, cy), "• Index hợp chất (Compound Index) tăng tốc tìm kiếm xe & trạm.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• Mã hóa AES-256-GCM bảo vệ ảnh CCCD & GPLX khách hàng.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• AuditLog che mờ toàn bộ thông tin nhạy cảm [REDACTED].", font=font_body, fill=COLOR_TEXT_MUTED)

    # Footer
    draw.line([(80, 1315), (width - 80, 1315)], fill='#252525', width=1)
    draw.text((80, 1322), "HỆ THỐNG QUẢN LÝ THUÊ XE MÁY ĐA TRẠM MOTORENT • DỰ ÁN SWP391 • FPT UNIVERSITY", font=font_badge, fill='#666666')
    draw.text((width - 450, 1322), "MODULAR MONOLITH STANDARD ARCHITECTURE", font=font_badge, fill=COLOR_PEACH)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=95)
    print(f"Generated Package Architecture Diagram at {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_package_architecture_diagram()
