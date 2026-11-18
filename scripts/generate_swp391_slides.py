import sys
import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_paths=['MOTORENT_SWP391_Slide_Trinh_Bay.pptx', 'docs/MOTORENT_SWP391_Slide_Trinh_Bay.pptx']):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Theme Colors: Professional Dark Mode with Peach & Mint accents
    BG_DARK = RGBColor(12, 12, 12)         # #0C0C0C
    CARD_BG = RGBColor(22, 22, 22)         # #161616
    CARD_BORDER = RGBColor(42, 42, 42)     # #2A2A2A
    ACCENT_PEACH = RGBColor(255, 199, 153) # #FFC799
    ACCENT_MINT = RGBColor(153, 255, 228)  # #99FFE4
    TEXT_WHITE = RGBColor(255, 255, 255)   # #FFFFFF
    TEXT_MUTED = RGBColor(168, 168, 168)   # #A8A8A8
    ACCENT_BLUE = RGBColor(112, 180, 255)  # #70B4FF
    ACCENT_ROSE = RGBColor(255, 125, 138)  # #FF7D8A

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, section_tag, title_text):
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(11.7), Inches(0.35))
        tf = tag_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = section_tag.upper()
        p.font.name = 'Segoe UI'
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.6))
        tf2 = title_box.text_frame
        tf2.word_wrap = True
        tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
        p2 = tf2.paragraphs[0]
        p2.text = title_text
        p2.font.name = 'Segoe UI'
        p2.font.size = Pt(22)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE

    def add_card(slide, left, top, width, height, border_color=CARD_BORDER, bg_color=CARD_BG):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        return card

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)
    add_card(s1, Inches(1.0), Inches(1.2), Inches(11.333), Inches(5.1), border_color=ACCENT_PEACH, bg_color=CARD_BG)

    tb1 = s1.shapes.add_textbox(Inches(1.5), Inches(1.6), Inches(10.333), Inches(4.3))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "TRƯỜNG ĐẠI HỌC FPT • BÁO CÁO ĐỒ ÁN SWP391 (FALL 2026)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(12)

    p = tf1.add_paragraph()
    p.text = "MOTORENT"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.space_after = Pt(6)

    p = tf1.add_paragraph()
    p.text = "Hệ Thống Thuê Xe Máy Công Nghệ & Tự Động Hóa Vận Hành Đa Trạm"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_MINT
    p.space_after = Pt(20)

    p = tf1.add_paragraph()
    p.text = "Nhóm thực hiện: Group 4 • 5 Thành viên • GVHD: Ban Giám Khảo SWP391"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 2: MỤC 1 - THÀNH VIÊN NHÓM (GROUP 4)
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Mục 1 • Nhóm Thực Hiện", "Thành Viên Nhóm 4 & Phân Công Trách Nhiệm")

    team = [
        ("Trần Quang Bửu Hoàng", "Leader / Full-Stack", "35%", [
            "Kiến trúc Modular Monolith, RBAC & Audit Log",
            "Đặt xe, Giỏ xe, Cổng VNPay/VietQR, Hợp đồng ký số",
            "AI Phân ca trực (Gemini & Rule-v2), Giao xe tận nơi",
            "Biên soạn RDS, SDS, Final Release, Project Tracking"
        ]),
        ("Phạm Quốc Cả", "Business Analyst / Backend", "20%", [
            "Khảo sát phân tích nghiệp vụ, Đặc tả SRS",
            "Quản lý chi nhánh, tìm trạm gần nhất theo GPS",
            "Quản lý hồ sơ nhân sự trạm",
            "Danh mục khuyến mãi & mã giảm giá"
        ]),
        ("Nguyễn Thái Dương", "Full-Stack Developer", "18%", [
            "Quy trình gia hạn thuê xe (thông báo đa kênh)",
            "Hủy đơn theo điều khoản KHÔNG HOÀN TIỀN",
            "Quầy Check-in/Check-out (kiểm tra 4 góc xe, ODO)",
            "Ký biên bản bàn giao & Xuất hóa đơn PDF"
        ]),
        ("Nguyễn Hữu Tài", "Full-Stack Developer", "15%", [
            "Danh mục đội xe, bộ lọc tìm kiếm & giá mùa vụ",
            "Cảnh báo bảo dưỡng theo ODO & chi phí sửa chữa",
            "Lệnh điều chuyển xe giữa các chi nhánh",
            "Theo dõi vòng đời xe thời gian thực"
        ]),
        ("Phạm Tuyên", "Frontend Developer", "12%", [
            "Xe yêu thích & Đánh giá/Phản hồi dịch vụ",
            "Gửi khiếu nại (Complaint) & tra cứu tiến độ",
            "Thông báo nhắc lịch, tích điểm đổi thưởng",
            "Quản lý banner slider & trang chính sách"
        ])
    ]

    card_w = Inches(2.22)
    card_h = Inches(5.3)
    gap = Inches(0.16)
    left_start = Inches(0.8)

    for i, (name, role, pct, tasks) in enumerate(team):
        cx = left_start + i * (card_w + gap)
        border = ACCENT_PEACH if i == 0 else CARD_BORDER
        add_card(s2, cx, Inches(1.45), card_w, card_h, border_color=border)

        tb = s2.shapes.add_textbox(cx + Inches(0.15), Inches(1.6), card_w - Inches(0.3), card_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = f"{pct}"
        p.font.name = 'Segoe UI'
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH
        p.space_after = Pt(4)

        p = tf.add_paragraph()
        p.text = name
        p.font.name = 'Segoe UI'
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(2)

        p = tf.add_paragraph()
        p.text = role
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(10)

        for t in tasks:
            p = tf.add_paragraph()
            p.text = f"• {t}"
            p.font.name = 'Segoe UI'
            p.font.size = Pt(8.5)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(4)

    # ==========================================
    # SLIDE 3: MỤC 2 - PRODUCT BACKGROUND
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Mục 2 • Bối Cảnh Sản Phẩm", "Product Background: Thực Trạng, Nỗi Đau & Giải Pháp")

    bg_cards = [
        ("NỖI ĐAU KHÁCH HÀNG", [
            ("Giữ giấy tờ gốc rủi ro cao:", "Bị giữ CCCD/Hộ chiếu gốc gây bất tiện nhận phòng khách sạn hoặc bay."),
            ("Giá thiếu minh bạch & Xe cũ:", "Bị chặt chém mùa cao điểm, chất lượng xe không kiểm định."),
            ("Nhận/trả bất tiện:", "Khó nhận/trả linh hoạt tại sân bay, ga tàu hoặc giao tận khách sạn.")
        ], ACCENT_ROSE),
        ("NỖI ĐAU CHỦ CƠ SỞ", [
            ("Quản lý sổ sách thủ công:", "Dễ thất thoát xe, tranh chấp khi va chạm không có ảnh hiện trạng."),
            ("Mất kiểm soát bảo dưỡng ODO:", "Không theo dõi chu kỳ km xe chạy, dễ hỏng hóc dọc đường."),
            ("Khó điều phối nhân sự:", "Tải khách biến động sáng/chiều, nhân viên phải đi giao xe tận nơi.")
        ], ACCENT_PEACH),
        ("GIẢI PHÁP MOTORENT", [
            ("eKYC không giữ gốc:", "Quét CCCD/GPLX online, mã hóa AES-256-GCM bảo mật tuyệt đối."),
            ("Ký số tại quầy & Đa trạm:", "Hợp đồng song phương tablet kèm 4 góc ảnh, cọc 30%, trả khác trạm."),
            ("AI Tự động xếp ca trực:", "Dual-AI Engine cân bằng tải công thái học, tiết kiệm 90% thời gian.")
        ], ACCENT_MINT)
    ]

    for j, (c_title, c_points, c_color) in enumerate(bg_cards):
        cx = Inches(0.8 + j * 3.95)
        add_card(s3, cx, Inches(1.45), Inches(3.8), Inches(5.3), border_color=c_color)

        tb = s3.shapes.add_textbox(cx + Inches(0.2), Inches(1.65), Inches(3.4), Inches(4.9))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = c_title
        p.font.name = 'Segoe UI'
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = c_color
        p.space_after = Pt(12)

        for p_h, p_d in c_points:
            p = tf.add_paragraph()
            p.text = p_h
            p.font.name = 'Segoe UI'
            p.font.size = Pt(10.5)
            p.font.bold = True
            p.font.color.rgb = TEXT_WHITE
            p.space_after = Pt(2)

            p = tf.add_paragraph()
            p.text = p_d
            p.font.name = 'Segoe UI'
            p.font.size = Pt(9.5)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(10)

    # ==========================================
    # SLIDE 4: MỤC 3 - EXISTING SYSTEM
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Mục 3 • Hiện Trạng Hệ Thống", "So Sánh Năng Lực 8 Tiêu Chí Với Các Giải Pháp Hiện Hành")

    add_card(s4, Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.3))

    table_shape = s4.shapes.add_table(9, 4, Inches(1.0), Inches(1.6), Inches(11.333), Inches(5.0))
    table = table_shape.table
    table.columns[0].width = Inches(2.2)
    table.columns[1].width = Inches(3.0)
    table.columns[2].width = Inches(3.0)
    table.columns[3].width = Inches(3.133)

    headers = ["Tiêu Chí Nghiệp Vụ", "Thuê Xe Truyền Thống", "Nền Tảng Ô Tô (Mioto...)", "Hệ Thống MOTORENT"]
    for ci, h in enumerate(headers):
        cell = table.cell(0, ci)
        cell.text = h
        p = cell.text_frame.paragraphs[0]
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if ci == 3 else TEXT_WHITE

    rows_data = [
        ("Xác thực danh tính", "Giữ CCCD / Hộ chiếu gốc trực tiếp", "Tải ảnh giấy tờ (tập trung ô tô)", "eKYC mã hóa AES-256-GCM, không giữ gốc"),
        ("Hợp đồng thuê", "Viết tay 1 liên, dễ tranh chấp", "Xác nhận đơn điện tử 1 chiều", "Ký số song phương tại quầy trên tablet"),
        ("Thanh toán & Cọc", "Tiền mặt / Chuyển khoản lẻ", "Giữ cọc thẻ tín dụng phức tạp", "Cọc 30% VNPay/VietQR, tất toán 70% tại quầy"),
        ("Trả xe sớm", "Tự thương lượng, dễ tranh cãi", "Tùy chính sách từng chủ xe", "Quy chuẩn minh bạch: KHÔNG HOÀN TIỀN"),
        ("Giao xe tận nơi", "Thỏa thuận ngoài qua điện thoại", "Chủ xe tự thương lượng", "Tự động tính phí 40.000 đ/chiều chuẩn hóa"),
        ("Quản lý đa trạm", "1 cửa hàng cố định, đơn lẻ", "Cá nhân phân tán, không có trạm", "Mạng lưới trạm, trả khác trạm, điều chuyển xe"),
        ("Bảo dưỡng ODO", "Cảm tính, hỏng đâu sửa đó", "Chủ xe tự theo dõi", "Cảnh báo ODO tự động, khóa xe bảo dưỡng"),
        ("Xếp ca nhân sự", "Sổ sách / Excel thủ công", "Không có", "AI Tự động xếp ca (Heuristic + Gemini LLM)")
    ]

    for ri, row in enumerate(rows_data):
        for ci, val in enumerate(row):
            cell = table.cell(ri + 1, ci)
            cell.text = val
            p = cell.text_frame.paragraphs[0]
            p.font.name = 'Segoe UI'
            p.font.size = Pt(9.5)
            if ci == 0:
                p.font.bold = True
                p.font.color.rgb = TEXT_WHITE
            elif ci == 3:
                p.font.bold = True
                p.font.color.rgb = ACCENT_MINT
            else:
                p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 5: MỤC 4 - USE CASE DIAGRAM (CUSTOMER & GUEST)
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Mục 4 • Sơ Đồ Use Case (Phần 1)", "Sơ Đồ UML Use Case: Khách Hàng (Customer) & Vãng Lai (Guest)")

    add_card(s5, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_u = s5.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_u = tb_u.text_frame
    tf_u.word_wrap = True

    p = tf_u.paragraphs[0]
    p.text = "USE CASES KHÁCH HÀNG (UC01-25)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    uc_c = [
        ("Khám phá xe (Guest):", "Xem danh mục xe, lọc trạm/giá, xem ảnh 4 góc, bản đồ trạm GPS, đăng ký/đăng nhập."),
        ("Đặt xe & Thanh toán:", "Chọn ngày/giờ, giao xe tận nơi (+40k), áp mã giảm giá, cọc 30% VNPay/VietQR, hủy đơn."),
        ("eKYC & Hợp đồng:", "Quét CCCD/GPLX (AES-256), xác thực danh tính online, ký số hợp đồng tại quầy trên tablet."),
        ("Hậu mãi & Đánh giá:", "Gia hạn thuê xe, đánh giá sao/review, gửi khiếu nại (kèm ảnh), Live Chat Socket.IO.")
    ]
    for ut, ud in uc_c:
        p = tf_u.add_paragraph()
        p.text = ut
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_u.add_paragraph()
        p.text = ud
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)

    uc_cust_path = 'docs/diagrams/usecase_customer.png'
    if os.path.exists(uc_cust_path):
        add_card(s5, Inches(5.3), Inches(1.45), Inches(7.2), Inches(5.3), bg_color=RGBColor(255, 255, 255))
        s5.shapes.add_picture(uc_cust_path, Inches(5.4), Inches(1.55), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 6: MỤC 4 - USE CASE DIAGRAM (STAFF, MANAGER, ADMIN)
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Mục 4 • Sơ Đồ Use Case (Phần 2)", "Sơ Đồ UML Use Case Nội Bộ: Nhân Viên, Quản Lý & Quản Trị")

    add_card(s6, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_u2 = s6.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_u2 = tb_u2.text_frame
    tf_u2.word_wrap = True

    p = tf_u2.paragraphs[0]
    p.text = "3 TÁC NHÂN NỘI BỘ (UC26-50)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    internal_uc = [
        ("Nhân viên quầy (Staff):", "Điểm danh ca, đăng ký lịch rảnh NLP chat, bàn giao xe 4 góc + ODO, thu 70% tất toán, cứu hộ sự cố."),
        ("Quản lý trạm (BranchManager):", "Điều phối đội xe, tạo lệnh điều chuyển trạm (VehicleTransfer), duyệt bảo dưỡng ODO, AI xếp lịch ca tuần."),
        ("Quản trị viên (SystemAdmin):", "Quản lý chi nhánh & bản đồ GPS, ma trận RBAC 4 vai trò, giám sát AuditLog bảo mật, quản lý CMS & KPI.")
    ]
    for ut, ud in internal_uc:
        p = tf_u2.add_paragraph()
        p.text = ut
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(2)

        p = tf_u2.add_paragraph()
        p.text = ud
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(10)

    uc_staff_path = 'docs/diagrams/usecase_staff.png'
    uc_mgr_path = 'docs/diagrams/usecase_manager.png'
    if os.path.exists(uc_staff_path) and os.path.exists(uc_mgr_path):
        add_card(s6, Inches(5.3), Inches(1.45), Inches(7.2), Inches(2.55), bg_color=RGBColor(255, 255, 255))
        s6.shapes.add_picture(uc_staff_path, Inches(5.4), Inches(1.5), Inches(7.0), Inches(2.45))

        add_card(s6, Inches(5.3), Inches(4.2), Inches(7.2), Inches(2.55), bg_color=RGBColor(255, 255, 255))
        s6.shapes.add_picture(uc_mgr_path, Inches(5.4), Inches(4.25), Inches(7.0), Inches(2.45))

    # ==========================================
    # SLIDE 7: MỤC 5 - DATABASE (24 MODELS / 5 CỤM DỮ LIỆU)
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Mục 5 • Cơ Sở Dữ Liệu (Phần 1)", "Kiến Trúc CSDL MongoDB 24 Models & Sơ Đồ ERD Booking")

    add_card(s7, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_db1 = s7.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_db1 = tb_db1.text_frame
    tf_db1.word_wrap = True

    p = tf_db1.paragraphs[0]
    p.text = "5 CỤM DỮ LIỆU (24 MODELS)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    db_summary = [
        ("1. Định danh & Nhân sự (3):", "User (bcrypt, tokenVersion, eKYC AES-256), StaffSchedule, StaffAvailability."),
        ("2. Đội xe & Chi nhánh (6):", "Branch (GPS), Vehicle, Category, SeasonalPricingRule, VehicleTransfer, MaintenanceLog."),
        ("3. Thuê xe & Giao dịch (4):", "Booking (chữ ký số, cọc 30%, tất toán 70%), Payment (VNPay/VietQR), Discount, BookingReminder."),
        ("4. Hỗ trợ & Tương tác (6):", "Complaint (Open->Closed), Feedback, Review, Wishlist, Conversation, Message (Socket.IO)."),
        ("5. Hệ thống & Nội dung (5):", "AuditLog (che [REDACTED]), Notification, Banner, StaticPage, SystemConfig.")
    ]
    for gt, gd in db_summary:
        p = tf_db1.add_paragraph()
        p.text = gt
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_db1.add_paragraph()
        p.text = gd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    erd_booking_path = 'docs/diagrams/database_booking_erd.jpeg'
    if os.path.exists(erd_booking_path):
        add_card(s7, Inches(5.3), Inches(1.45), Inches(7.2), Inches(5.3), bg_color=RGBColor(255, 255, 255))
        s7.shapes.add_picture(erd_booking_path, Inches(5.4), Inches(1.55), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 8: MỤC 5 - DATABASE (ĐỘI XE, ĐIỀU CHUYỂN & HỖ TRỢ)
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Mục 5 • Cơ Sở Dữ Liệu (Phần 2)", "Sơ Đồ ERD Thực Thể: Đội Xe & Phân Hệ Hỗ Trợ Khiếu Nại")

    add_card(s8, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_db2 = s8.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_db2 = tb_db2.text_frame
    tf_db2.word_wrap = True

    p = tf_db2.paragraphs[0]
    p.text = "QUAN HỆ THỰC THỂ CỐT LÕI"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    db_rel = [
        ("Vòng đời xe & Lệnh điều chuyển:", "Vehicle thuộc 1 Branch. Khi trạm thừa/thiếu xe, BranchManager tạo VehicleTransfer (Pending -> InTransit -> Completed). Đến nơi xe tự chuyển quyền quản lý."),
        ("Bảo dưỡng định kỳ theo ODO:", "Mỗi lượt trả xe, ODO mới được cập nhật. Vượt ngưỡng km (vd: 3.000km thay nhớt), hệ thống tự động khóa xe vào MaintenanceLog."),
        ("Khiếu nại ràng buộc Booking:", "Complaint gắn chặt BookingId tránh khiếu nại ảo. Xử lý qua 4 bước: Open -> InProgress -> Resolved -> Closed kèm ảnh hiện trường.")
    ]
    for rt, rd in db_rel:
        p = tf_db2.add_paragraph()
        p.text = rt
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(2)

        p = tf_db2.add_paragraph()
        p.text = rd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(10)

    erd_fleet_path = 'docs/diagrams/database_fleet_erd.jpeg'
    erd_supp_path = 'docs/diagrams/database_support_erd.jpeg'
    if os.path.exists(erd_fleet_path) and os.path.exists(erd_supp_path):
        add_card(s8, Inches(5.3), Inches(1.45), Inches(7.2), Inches(2.55), bg_color=RGBColor(255, 255, 255))
        s8.shapes.add_picture(erd_fleet_path, Inches(5.4), Inches(1.5), Inches(7.0), Inches(2.45))

        add_card(s8, Inches(5.3), Inches(4.2), Inches(7.2), Inches(2.55), bg_color=RGBColor(255, 255, 255))
        s8.shapes.add_picture(erd_supp_path, Inches(5.4), Inches(4.25), Inches(7.0), Inches(2.45))

    # ==========================================
    # SLIDE 9: MỤC 6 - PACKAGE DIAGRAM [TRỌNG TÂM 1]
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "Mục 6 • Sơ Đồ Package [Trọng Tâm 1]", "Kiến Trúc Modular Monolith: 3 Điểm Nhấn Cốt Lõi")

    add_card(s9, Inches(0.8), Inches(1.45), Inches(4.5), Inches(5.3), border_color=ACCENT_PEACH)
    tb_pkg = s9.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(4.1), Inches(4.9))
    tf_pkg = tb_pkg.text_frame
    tf_pkg.word_wrap = True

    p = tf_pkg.paragraphs[0]
    p.text = "ĐIỂM NHẤN KIẾN TRÚC VỚI HỘI ĐỒNG"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    pkg_highlights = [
        ("1. Tính độc lập cao (22 Modules):", "Đóng gói khép kín Controller -> Service -> Routes. Không vòng lặp phụ thuộc (Zero Circular Dependency), dễ nâng cấp Microservices."),
        ("2. Tầng bảo vệ tập trung (core/):", "Phễu bảo vệ bắt buộc: Giải mã JWT -> Kiểm tra vô hiệu hóa phiên tức thì (tokenVersion) -> Phân quyền RBAC 4 vai trò -> Che secret AuditLog [REDACTED]."),
        ("3. An toàn đồng thời (Concurrency):", "resourceLock.ts (FIFO Promise queue + TTL lock) & withOptionalTransaction triệt tiêu hoàn toàn race condition đặt trùng xe.")
    ]
    for pt, pd in pkg_highlights:
        p = tf_pkg.add_paragraph()
        p.text = pt
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(2)

        p = tf_pkg.add_paragraph()
        p.text = pd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(10)

    pkg_img_path = 'docs/diagrams/package_diagram.png'
    if os.path.exists(pkg_img_path):
        add_card(s9, Inches(5.5), Inches(1.45), Inches(7.0), Inches(5.3), bg_color=RGBColor(255, 255, 255))
        s9.shapes.add_picture(pkg_img_path, Inches(5.6), Inches(1.55), Inches(6.8), Inches(5.1))

    # ==========================================
    # SLIDE 10: MỤC 6 - VÒNG ĐỜI XỬ LÝ & KHÓA TÀI NGUYÊN [TRỌNG TÂM 1]
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Mục 6 • Vòng Đời Xử Lý & Khóa Tài Nguyên [Trọng Tâm 1]", "Kiến Trúc 4 Tầng & Động Cơ Khóa Đồng Thời Chống Đặt Trùng Xe")

    arch_img_path = 'docs/diagrams/modular_monolith_architecture.png'
    if os.path.exists(arch_img_path):
        add_card(s10, Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.3), border_color=ACCENT_PEACH)
        s10.shapes.add_picture(arch_img_path, Inches(0.9), Inches(1.55), Inches(11.533), Inches(5.1))

    # ==========================================
    # SLIDE 11: MỤC 7 - CÁCH APPLY AI VÀO HỆ THỐNG [TRỌNG TÂM 2]
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "Mục 7 • Ứng Dụng AI Vào Hệ Thống [Trọng Tâm 2]", "Kiến Trúc Toàn Cảnh Dual-AI Engine & Quy Trình 5 Bước")

    ai_arch_path = 'docs/diagrams/ai_scheduling_architecture.png'
    if os.path.exists(ai_arch_path):
        add_card(s11, Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.3), border_color=ACCENT_PEACH)
        s11.shapes.add_picture(ai_arch_path, Inches(0.9), Inches(1.55), Inches(11.533), Inches(5.1))

    # ==========================================
    # SLIDE 12: MỤC 7 - CÁCH APPLY AI (SIÊU NGẮN GỌN)
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)
    add_header(s12, "Mục 7 • 4 Điểm Cốt Lõi Của AI [Trọng Tâm 2]", "Hệ Thống AI Giải Quyết Bài Toán Phân Ca Như Thế Nào?")

    ai_4boxes_simple = [
        ("1. ĐỌC HIỂU TIẾNG VIỆT", [
            "Nhân viên chat tự do như Zalo:",
            "('t2 làm ca 1 2, t4 bận')",
            "Hệ thống tự nhận diện thứ, ca",
            "Tự động điền lịch, không nhập tay"
        ], ACCENT_BLUE),
        ("2. XẾP CA KHOA HỌC", [
            "Đếm lượng khách: xếp 1 - 3 người/ca",
            "Ưu tiên ca liền (làm 1 mạch về nghỉ)",
            "CẤM ca kiệt sức: tối 22h -> sáng 7h",
            "Chia đều giờ làm, đảm bảo công bằng"
        ], ACCENT_PEACH),
        ("3. GEMINI AI TỐI ƯU", [
            "Đóng vai trò 'Quản Lý Ảo'",
            "Tính toán phương án tối ưu nhất",
            "Giải thích lý do xếp ca bằng tiếng Việt",
            "Tự động dự phòng khi mạng chậm"
        ], ACCENT_MINT),
        ("4. BẢO TOÀN CHẤM CÔNG", [
            "Chạy lại AI giữa tuần không mất dữ liệu",
            "Giữ nguyên 100% ca quá khứ",
            "Giữ nguyên ca nhân viên đã điểm danh",
            "Chỉ xếp bù vào ca tương lai còn trống"
        ], ACCENT_ROSE)
    ]

    card_bw = Inches(2.78)
    card_bh = Inches(5.3)
    card_bg = Inches(0.2)
    left_b = Inches(0.8)

    for bi, (b_title, b_items, b_col) in enumerate(ai_4boxes_simple):
        cx = left_b + bi * (card_bw + card_bg)
        add_card(s12, cx, Inches(1.45), card_bw, card_bh, border_color=b_col)

        tb = s12.shapes.add_textbox(cx + Inches(0.15), Inches(1.65), card_bw - Inches(0.3), card_bh - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = b_title
        p.font.name = 'Segoe UI'
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = b_col
        p.space_after = Pt(14)

        for bi_text in b_items:
            p = tf.add_paragraph()
            p.text = f"• {bi_text}"
            p.font.name = 'Segoe UI'
            p.font.size = Pt(10)
            p.font.color.rgb = TEXT_WHITE if "CẤM" in bi_text or "Giữ nguyên" in bi_text or "Zalo" in bi_text else TEXT_MUTED
            p.space_after = Pt(10)

    # ==========================================
    # SLIDE 13: ĐẢM BẢO CHẤT LƯỢNG & KIỂM THỬ
    # ==========================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13)
    add_header(s13, "Đảm Bảo Chất Lượng • Kiểm Thử", "Kết Quả Kiểm Thử Thực Tế: 30/30 Test Suites Đạt Chuẩn Tuyệt Đối")

    metrics = [
        ("30 / 30", "Test Suites Passed", "100% bộ kiểm thử tự động Vitest gồm Unit, Integration, Concurrency Locks & AI Verification đạt kết quả Pass."),
        ("1,807", "Client Modules", "Vite build sản phẩm sạch bóng, 0 lỗi TypeScript, cấu trúc Responsive mượt mà trên cả Mobile, Tablet và Desktop."),
        ("100%", "Bảo Mật Dữ Liệu", "Mã hóa AES-256-GCM bảo vệ eKYC, phân quyền RBAC 4 vai trò, AuditLog tự động che mờ dữ liệu nhạy cảm [REDACTED]."),
        ("0.00s", "Xung Đột Đặt Trùng", "Hàng đợi Promise FIFO kết hợp MongoDB Atomic CAS loại bỏ hoàn toàn lỗi đặt trùng xe trong điều kiện tải cao.")
    ]

    for mi, (m_val, m_title, m_desc) in enumerate(metrics):
        cx = left_b + mi * (card_bw + card_bg)
        border = ACCENT_PEACH if mi in [0, 3] else ACCENT_MINT
        add_card(s13, cx, Inches(1.45), card_bw, card_bh, border_color=border)

        tb = s13.shapes.add_textbox(cx + Inches(0.15), Inches(1.7), card_bw - Inches(0.3), card_bh - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = m_val
        p.font.name = 'Segoe UI'
        p.font.size = Pt(32)
        p.font.bold = True
        p.font.color.rgb = border
        p.space_after = Pt(4)

        p = tf.add_paragraph()
        p.text = m_title
        p.font.name = 'Segoe UI'
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(12)

        p = tf.add_paragraph()
        p.text = m_desc
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 14: TỔNG KẾT & Q&A
    # ==========================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14)
    add_header(s14, "Tổng Kết • Hướng Phát Triển", "Kết Luận Đề Tài & Hướng Mở Rộng Hệ Thống")

    add_card(s14, Inches(0.8), Inches(1.45), Inches(5.7), Inches(5.3), border_color=ACCENT_MINT)
    tb_c1 = s14.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(4.9))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True

    p = tf_c1.paragraphs[0]
    p.text = "4 THÀNH TỰU ĐẠT ĐƯỢC"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_MINT
    p.space_after = Pt(8)

    achieve = [
        ("• Hoàn thành 100% mục tiêu RDS/SDS:", "22 modules tính năng hoạt động trơn tru, bao quát mọi luồng thuê xe đa trạm."),
        ("• Đột phá AI ứng dụng thực chiến:", "Dual-AI Engine giải quyết triệt để ca kiệt sức clopening và ca gãy phi lý, bảo toàn chấm công."),
        ("• Pháp lý số hóa minh bạch:", "Cọc 30% VNPay/VietQR, ký số biên bản bàn giao 4 góc xe, không giữ giấy tờ gốc khách."),
        ("• Kiến trúc phần mềm chuẩn mực:", "Modular Monolith phân tầng sạch sẽ, an toàn đồng thời, 30/30 test suites pass.")
    ]
    for at, ad in achieve:
        p = tf_c1.add_paragraph()
        p.text = at
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(1)

        p = tf_c1.add_paragraph()
        p.text = ad
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)

    add_card(s14, Inches(6.8), Inches(1.45), Inches(5.733), Inches(5.3), border_color=ACCENT_PEACH)
    tb_c2 = s14.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.333), Inches(4.9))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True

    p = tf_c2.paragraphs[0]
    p.text = "ĐỊNH HƯỚNG TƯƠNG LAI & Q&A"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    future = [
        ("• Tích hợp IoT Hộp Đen GPS Trên Xe:", "Theo dõi định vị thời gian thực, chống trộm, cảnh báo va chạm và cứu hộ khẩn cấp."),
        ("• Phát triển Mobile App Native:", "Ứng dụng di động iOS/Android quét mã QR nhận/trả xe tự động không cần nhân viên."),
        ("• Mở rộng chuỗi toàn quốc:", "Sẵn sàng phân tách các module cốt lõi thành Microservices khi đạt quy mô 100+ trạm."),
        ("• Kính mời Quý Thầy Cô đặt câu hỏi:", "Nhóm 4 xin chân thành cảm ơn Ban Giám Khảo SWP391 FPT University!")
    ]
    for ft, fd in future:
        p = tf_c2.add_paragraph()
        p.text = ft
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(1)

        p = tf_c2.add_paragraph()
        p.text = fd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)

    for out in output_paths:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
            prs.save(out)
            print(f"Generated {len(prs.slides)} slides in PPTX deck at {out} ({os.path.getsize(out)} bytes)")
        except PermissionError:
            print(f"Notice: {out} is currently open in another app. Saved root version successfully.")

if __name__ == '__main__':
    create_deck()
