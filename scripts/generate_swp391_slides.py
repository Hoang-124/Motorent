import sys
import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path='docs/MOTORENT_SWP391_Slide_Trinh_Bay.pptx'):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Colors
    BG_DARK = RGBColor(12, 12, 12)         # #0C0C0C
    CARD_BG = RGBColor(22, 22, 22)         # #161616
    CARD_BORDER = RGBColor(42, 42, 42)     # #2A2A2A
    ACCENT_PEACH = RGBColor(255, 199, 153) # #FFC799
    ACCENT_MINT = RGBColor(153, 255, 228)  # #99FFE4
    TEXT_WHITE = RGBColor(255, 255, 255)   # #FFFFFF
    TEXT_MUTED = RGBColor(168, 168, 168)   # #A8A8A8
    ACCENT_BLUE = RGBColor(112, 180, 255)  # #70B4FF
    ACCENT_PURPLE = RGBColor(209, 163, 255)# #D1A3FF
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

    # Accent decorative box
    add_card(s1, Inches(1.0), Inches(1.2), Inches(11.333), Inches(5.1), border_color=ACCENT_PEACH, bg_color=CARD_BG)

    tb1 = s1.shapes.add_textbox(Inches(1.5), Inches(1.6), Inches(10.333), Inches(4.3))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "TRƯỜNG ĐẠI HỌC FPT • BÁO CÁO BẢO VỆ ĐỒ ÁN TỐT NGHIỆP SWP391"
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
    p.text = "Nền Tảng Quản Lý Cho Thuê Xe Máy Công Nghệ Đa Trạm & Tối Ưu Phân Ca AI"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = ACCENT_MINT
    p.space_after = Pt(20)

    p = tf1.add_paragraph()
    p.text = "Chuyên ngành: Kỹ Thuật Phần Mềm (Software Engineering) • Học kỳ Fall 2026"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_MUTED
    p.space_after = Pt(6)

    p = tf1.add_paragraph()
    p.text = "Giảng viên hướng dẫn: Ban Giám Khảo SWP391 FPT University"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 2: MỤC 1 - TÊN ĐỀ TÀI & THÀNH VIÊN
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Mục 1 • Giới Thiệu Nhóm", "Đề Tài & Danh Sách Thành Viên Thực Hiện Dự Án")

    team = [
        ("Võ Đặng Hoàng Long", "Trưởng Nhóm / Fullstack Dev", "Phụ trách Kiến trúc Modular Monolith, Core Middlewares, Luồng Booking VNPay/VietQR, Resource Lock & Tích hợp AI Dual-Engine"),
        ("Nguyễn Đức Thịnh", "Backend Developer", "Phụ trách Phân hệ Quản lý đội xe (Fleet), Điều chuyển xe (VehicleTransfer), Cảnh báo bảo dưỡng ODO và Mạng lưới chi nhánh"),
        ("Nguyễn Trung Hiếu", "Frontend Lead", "Phụ trách Toàn bộ giao diện Web Khách hàng, Mobile/Tablet Staff Web, Giao diện bản xem trước phân ca trực quan"),
        ("Đỗ Gia Bảo", "QA & Database Engineer", "Phụ trách Thiết kế CSDL MongoDB (24 Models), Viết bộ kiểm thử tự động 30/30 Vitest suites, eKYC AES-256 mã hóa"),
        ("Trần Minh Quân", "Business Analyst & Support", "Phụ trách Phân tích yêu cầu nghiệp vụ RDS/SDS, Phân hệ Khiếu nại (Complaint), Feedback, Live Chat Socket.IO")
    ]

    card_w = Inches(2.2)
    card_h = Inches(5.3)
    gap = Inches(0.18)
    left_start = Inches(0.8)

    for i, (name, role, tasks) in enumerate(team):
        cx = left_start + i * (card_w + gap)
        border = ACCENT_PEACH if i == 0 else CARD_BORDER
        add_card(s2, cx, Inches(1.45), card_w, card_h, border_color=border)

        tb = s2.shapes.add_textbox(cx + Inches(0.15), Inches(1.6), card_w - Inches(0.3), card_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = f"0{i+1}"
        p.font.name = 'Segoe UI'
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH
        p.space_after = Pt(8)

        p = tf.add_paragraph()
        p.text = name
        p.font.name = 'Segoe UI'
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(4)

        p = tf.add_paragraph()
        p.text = role
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(12)

        p = tf.add_paragraph()
        p.text = "Trách nhiệm chính:"
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(3)

        p = tf.add_paragraph()
        p.text = tasks
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9)
        p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 3: MỤC 2 - PRODUCT BACKGROUND
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Mục 2 • Bối Cảnh Sản Phẩm", "Product Background: Thực Trạng Thị Trường & Giải Pháp MOTORENT")

    # 3 Cards: Problem, Solution, Target
    bg_cards = [
        ("THỰC TRẠNG & BÀI TOÁN (PAIN POINTS)", [
            ("Giữ giấy tờ gốc rủi ro cao:", "Khách du lịch thuê xe bị giữ CCCD/Hộ chiếu gốc, không thể làm thủ tục máy bay hoặc check-in khách sạn."),
            ("Hợp đồng giấy viết tay lỏng lẻo:", "Dễ tranh chấp khi xe gặp sự cố, trầy xước không có biên bản chụp ảnh 4 góc làm bằng chứng đối soát."),
            ("Quản lý phân tán, thiếu công nghệ:", "Chủ xe quản lý thủ công qua Zalo/Excel, không thể liên kết trả xe khác trạm hoặc điều chuyển xe linh hoạt."),
            ("Tải ca nhân sự biến động thất thường:", "Sáng nhận xe ồ ạt, tối trả xe dồn dập, xếp ca tay dễ gây kiệt sức hoặc thiếu người quầy tiếp khách.")
        ], ACCENT_ROSE),
        ("GIẢI PHÁP ĐỘT PHÁ CỦA MOTORENT", [
            ("eKYC xác thực số, không giữ gốc:", "Khách hàng quét CCCD & GPLX trực tuyến, mã hóa chuẩn AES-256-GCM, bảo mật tuyệt đối danh tính."),
            ("Ký số hợp đồng tại quầy:", "Biên bản bàn giao xe điện tử có ảnh chụp 4 góc, ghi nhận mức xăng và ODO, ký số song phương trên tablet."),
            ("Mạng lưới trạm đa điểm & Đặt cọc chuẩn hóa:", "Khách đặt xe cọc 30% trực tuyến (VNPay/VietQR), 70% tất toán khi nhận xe, hỗ trợ nhận/trả khác trạm."),
            ("Tối ưu hóa phân ca bằng Trí Tuệ Nhân Tạo:", "Ứng dụng AI (Gemini + Heuristic) tự động tính toán nhu cầu trạm và xếp ca công bằng, khoa học.")
        ], ACCENT_MINT),
        ("MỤC TIÊU CHIẾN LƯỢC CỦA DỰ ÁN", [
            ("Chuẩn hóa trải nghiệm du lịch số:", "Xóa bỏ rào cản thuê xe truyền thống, mang lại sự tiện nghi và minh bạch cho khách du lịch và công tác."),
            ("Tối ưu hiệu suất vận hành chuỗi:", "Giúp chủ doanh nghiệp theo dõi vòng đời bảo dưỡng xe theo ODO, hạn chế hư hỏng dọc đường."),
            ("Nền tảng mở rộng sẵn sàng (Scalable):", "Kiến trúc Modular Monolith chuẩn hóa cao cấp, sẵn sàng tách thành Microservices khi mở rộng chuỗi toàn quốc."),
            ("Ứng dụng AI thực chiến đo lường được:", "Giảm 90% thời gian phân ca hàng tuần của quản lý, xóa bỏ 100% tình trạng ca kiệt sức clopening.")
        ], ACCENT_PEACH)
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
            p.space_after = Pt(1)

            p = tf.add_paragraph()
            p.text = p_d
            p.font.name = 'Segoe UI'
            p.font.size = Pt(9.5)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = Pt(8)

    # ==========================================
    # SLIDE 4: MỤC 3 - EXISTING SYSTEM
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Mục 3 • Hiện Trạng Hệ Thống", "Khảo Sát Hệ Thống Hiện Có & Bảng So Sánh Năng Lực Toàn Diện")

    # Table of comparison
    add_card(s4, Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.3))

    table_shape = s4.shapes.add_table(9, 4, Inches(1.0), Inches(1.6), Inches(11.333), Inches(5.0))
    table = table_shape.table
    table.columns[0].width = Inches(2.3)
    table.columns[1].width = Inches(3.0)
    table.columns[2].width = Inches(3.0)
    table.columns[3].width = Inches(3.033)

    headers = ["Tiêu Chí Nghiệp Vụ", "Thuê Xe Truyền Thống", "Nền Tảng Xe Ô Tô (Mioto)", "Hệ Thống MOTORENT"]
    for ci, h in enumerate(headers):
        cell = table.cell(0, ci)
        cell.text = h
        p = cell.text_frame.paragraphs[0]
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if ci == 3 else TEXT_WHITE

    rows_data = [
        ("Xác thực danh tính", "Giữ CCCD / Hộ chiếu gốc trực tiếp", "Tải ảnh giấy tờ (chủ xe tự duyệt)", "eKYC mã hóa AES-256-GCM, không giữ gốc"),
        ("Hợp đồng thuê xe", "Viết tay giấy 1 liên, dễ thất lạc", "Xác nhận điện tử 1 chiều", "Ký số song phương trên tablet kèm 4 góc ảnh"),
        ("Thanh toán & Đặt cọc", "Tiền mặt / Chuyển khoản lẻ", "Giữ cọc thẻ tín dụng phức tạp", "Cọc 30% VNPay/VietQR, 70% tất toán tại quầy"),
        ("Chính sách trả xe sớm", "Tự thỏa thuận, hay cãi cọ", "Tùy chủ xe riêng biệt", "Minh bạch chuẩn hóa: KHÔNG HOÀN TIỀN"),
        ("Giao xe tận nơi", "Thương lượng riêng qua điện thoại", "Chủ xe tự thỏa thuận", "Tự động tính phí 40.000 đ/chiều chuẩn hóa"),
        ("Mạng lưới đa trạm", "1 cửa hàng cố định, không liên trạm", "Cá nhân phân tán, không có trạm", "Hệ thống trạm liên kết, nhận/trả khác trạm"),
        ("Bảo dưỡng định kỳ", "Cảm tính, hỏng đâu sửa đó", "Chủ xe tự theo dõi", "Cảnh báo ODO tự động, khóa xe bảo dưỡng"),
        ("Xếp ca nhân sự", "Sổ sách / Excel thủ công", "Không có", "AI Dual-Engine (Gemini + Rule-v2) tự động")
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
    # SLIDE 5: MỤC 4 - USE CASE DIAGRAM (KHÁCH HÀNG & KHÁCH VÃNG LAI)
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Mục 4 • Sơ Đồ Use Case (Phần 1)", "Sơ Đồ UML Use Case: Khách Hàng (Customer) & Khách Vãng Lai (Guest)")

    # Left card: Use Case summary
    add_card(s5, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_u = s5.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_u = tb_u.text_frame
    tf_u.word_wrap = True

    p = tf_u.paragraphs[0]
    p.text = "TÁC NHÂN: CUSTOMER & GUEST"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    uc_customer_list = [
        ("1. Khách Vãng Lai (Guest - UC01-07):", "Xem danh sách xe, Tìm kiếm & Lọc theo giá/hãng, Kiểm tra xe trống theo trạm, Xem vị trí trạm GPS, Đăng ký & Đăng nhập tài khoản."),
        ("2. Đặt Xe & Thanh Toán (UC08-14):", "Chọn thuê ngày/giờ, Giao xe tận nơi (+40k), Thanh toán cọc 30% VNPay/VietQR, Hủy đơn theo chính sách hoàn tiền."),
        ("3. eKYC & Ký Hợp Đồng (UC15-18):", "Tải ảnh GPLX/CCCD mã hóa AES-256, Xác thực danh tính trước nhận xe, Ký hợp đồng nhận xe điện tử tại quầy."),
        ("4. Hậu Mãi & Tương Tác (UC19-25):", "Gia hạn thời gian thuê xe, Đánh giá sao & review, Gửi khiếu nại (kèm ảnh), Live Chat hỗ trợ Socket.IO, Tích điểm thành viên.")
    ]

    for u_t, u_d in uc_customer_list:
        p = tf_u.add_paragraph()
        p.text = u_t
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_u.add_paragraph()
        p.text = u_d
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)

    # Right: Authentic UML Customer Use Case Diagram
    uc_cust_path = 'docs/diagrams/usecase_customer.png'
    if os.path.exists(uc_cust_path):
        add_card(s5, Inches(5.3), Inches(1.45), Inches(7.2), Inches(5.3), bg_color=RGBColor(255, 255, 255))
        s5.shapes.add_picture(uc_cust_path, Inches(5.4), Inches(1.55), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 6: MỤC 4 - USE CASE DIAGRAM (NỘI BỘ: STAFF, MANAGER, ADMIN)
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Mục 4 • Sơ Đồ Use Case (Phần 2)", "Sơ Đồ UML Use Case Nội Bộ: Nhân Viên, Quản Lý Trạm & Quản Trị Viên")

    # Left card: Internal Actors breakdown
    add_card(s6, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_u2 = s6.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_u2 = tb_u2.text_frame
    tf_u2.word_wrap = True

    p = tf_u2.paragraphs[0]
    p.text = "3 TÁC NHÂN NỘI BỘ HỆ THỐNG"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    internal_uc_list = [
        ("Nhân Viên Quầy (Staff - UC26-32):", "Điểm danh vào/ra ca, Đăng ký lịch rảnh tiếng Việt (NLP), Tiếp nhận bàn giao xe, Chụp 4 góc ảnh & ODO, Thu 70% tất toán, Xử lý cứu hộ sự cố dọc đường."),
        ("Quản Lý Trạm (BranchManager - UC33-42):", "Quản lý đội xe trạm, Khởi tạo lệnh điều chuyển xe (VehicleTransfer), Duyệt lịch bảo dưỡng ODO, Kích hoạt AI xếp lịch ca trực tuần, Đối soát doanh thu trạm."),
        ("Quản Trị Hệ Thống (SystemAdmin - UC43-50):", "Quản lý mạng lưới chi nhánh & GPS Map, Cấu hình ma trận phân quyền RBAC, Giám sát nhật ký bảo mật AuditLog, Báo cáo KPI toàn chuỗi, Cấu hình CMS.")
    ]

    for u_t, u_d in internal_uc_list:
        p = tf_u2.add_paragraph()
        p.text = u_t
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_u2.add_paragraph()
        p.text = u_d
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(10)

    # Right: Split 2 UML images (Staff UC on top, Manager UC on bottom)
    uc_staff_path = 'docs/diagrams/usecase_staff.png'
    uc_mgr_path = 'docs/diagrams/usecase_manager.png'

    if os.path.exists(uc_staff_path) and os.path.exists(uc_mgr_path):
        add_card(s6, Inches(5.3), Inches(1.45), Inches(7.2), Inches(2.55), bg_color=RGBColor(255, 255, 255))
        s6.shapes.add_picture(uc_staff_path, Inches(5.4), Inches(1.5), Inches(7.0), Inches(2.45))

        add_card(s6, Inches(5.3), Inches(4.2), Inches(7.2), Inches(2.55), bg_color=RGBColor(255, 255, 255))
        s6.shapes.add_picture(uc_mgr_path, Inches(5.4), Inches(4.25), Inches(7.0), Inches(2.45))

    # ==========================================
    # SLIDE 7: MỤC 5 - DATABASE (HỢP ĐỒNG ĐẶT XE & THANH TOÁN)
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Mục 5 • Cơ Sở Dữ Liệu (Phần 1)", "Kiến Trúc CSDL MongoDB 24 Models & Sơ Đồ ERD Đặt Xe Cốt Lõi")

    add_card(s7, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_db1 = s7.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_db1 = tb_db1.text_frame
    tf_db1.word_wrap = True

    p = tf_db1.paragraphs[0]
    p.text = "5 NHÓM CSDL CHUẨN HÓA (24 MODELS)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    db_groups_list = [
        ("1. Hợp đồng & Thanh toán (4 models):", "Booking (hợp đồng số, chữ ký song phương, cọc 30%, tất toán 70%), Payment (VNPay/VietQR), Discount (voucher), BookingReminder (SMS cron)."),
        ("2. Đội xe & Bảo dưỡng (6 models):", "Vehicle, Category, Branch (tọa độ GPS), SeasonalPricingRule, VehicleTransfer (lệnh điều chuyển), MaintenanceLog (nhật ký ODO)."),
        ("3. Định danh & Nhân sự (3 models):", "User (bcrypt, tokenVersion, eKYC mã hóa AES-256), StaffSchedule (ca trực), StaffAvailability (đăng ký rảnh/bận)."),
        ("4. Hỗ trợ & Tương tác (6 models):", "Complaint (khiếu nại), Feedback, Review, Wishlist, Conversation, Message (Live Chat Socket.IO)."),
        ("5. Quản trị & CMS (5 models):", "AuditLog (che [REDACTED]), Notification, Banner, StaticPage, SystemConfig.")
    ]

    for g_t, g_d in db_groups_list:
        p = tf_db1.add_paragraph()
        p.text = g_t
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_db1.add_paragraph()
        p.text = g_d
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    # Right: Booking ERD Diagram
    erd_booking_path = 'docs/diagrams/database_booking_erd.jpeg'
    if os.path.exists(erd_booking_path):
        add_card(s7, Inches(5.3), Inches(1.45), Inches(7.2), Inches(5.3), bg_color=RGBColor(255, 255, 255))
        s7.shapes.add_picture(erd_booking_path, Inches(5.4), Inches(1.55), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 8: MỤC 5 - DATABASE (ĐỘI XE, ĐIỀU CHUYỂN & HỖ TRỢ)
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Mục 5 • Cơ Sở Dữ Liệu (Phần 2)", "Sơ Đồ ERD Thực Thể: Đội Xe, Điều Chuyển Trạm & Phân Hệ Hỗ Trợ")

    # Split 2 ERDs on right (Fleet & Support)
    add_card(s8, Inches(0.8), Inches(1.45), Inches(4.3), Inches(5.3))
    tb_db2 = s8.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(3.9), Inches(4.9))
    tf_db2 = tb_db2.text_frame
    tf_db2.word_wrap = True

    p = tf_db2.paragraphs[0]
    p.text = "QUẢN TRỊ ĐỘI XE & HỖ TRỢ"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    erd_sub_list = [
        ("Quan hệ Đội xe & Điều chuyển (Fleet ERD):", "Vehicle liên kết 1-N với Branch và Category. Khi trạm A thừa xe và trạm B thiếu, BranchManager tạo VehicleTransfer. Sau khi xe đến trạm đích, trạng thái chuyển về Available tại trạm mới."),
        ("Vòng đời Bảo dưỡng theo ODO:", "Mỗi lượt trả xe, ODO mới được cập nhật vào Vehicle. Khi vượt ngưỡng bảo dưỡng (vd: 3.000 km thay nhớt), hệ thống tự động khóa xe vào MaintenanceLog và gửi cảnh báo đến quản lý."),
        ("Hỗ trợ khách hàng & Khiếu nại (Support ERD):", "Complaint liên kết chặt chẽ với BookingId để chống khiếu nại ảo. Hệ thống xử lý qua trạng thái Open -> InProgress -> Resolved -> Closed kèm bằng chứng ảnh.")
    ]

    for s_t, s_d in erd_sub_list:
        p = tf_db2.add_paragraph()
        p.text = s_t
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(2)

        p = tf_db2.add_paragraph()
        p.text = s_d
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(10)

    # Right: 2 images stacked
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
    add_header(s9, "Mục 6 • Sơ Đồ Package [Trọng Tâm 1]", "Sơ Đồ Package Diagram Kiến Trúc Modular Monolith Chuẩn Hóa")

    # Left card: Package structure
    add_card(s9, Inches(0.8), Inches(1.45), Inches(4.5), Inches(5.3), border_color=ACCENT_PEACH)
    tb_pkg = s9.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(4.1), Inches(4.9))
    tf_pkg = tb_pkg.text_frame
    tf_pkg.word_wrap = True

    p = tf_pkg.paragraphs[0]
    p.text = "CẤU TRÚC GÓI (PACKAGES) & NGUYÊN TẮC"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    pkg_details = [
        ("routes/index.ts (Entry Layer):", "Điểm đón request duy nhất, gắn tiền tố chuẩn /api, phân phối vào 22 feature routers độc lập."),
        ("22 Feature Modules (Domain Layer):", "auth, branch, vehicle, booking, fleet, hr, support, cms... Mỗi module khép kín 3 tầng: Controller -> Service -> Routes."),
        ("core/ (Protection & Concurrency Layer):", "authMiddleware, rbacMiddleware (4 vai trò), auditMiddleware (che [REDACTED]), uploadMiddleware, và Động cơ Khóa Tài Nguyên Đồng Thời (Resource Lock)."),
        ("models/ & config/ (Foundation Layer):", "24 Mongoose Data Models chuẩn hóa, Cluster MongoDB, VNPay SDK, Mailer, Cron Jobs."),
        ("Nguyên tắc bất biến:", "Low Coupling, High Cohesion, Zero Circular Dependency giữa các module, an toàn tuyệt đối khi chịu tải cao.")
    ]

    for p_t, p_d in pkg_details:
        p = tf_pkg.add_paragraph()
        p.text = p_t
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_pkg.add_paragraph()
        p.text = p_d
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    # Right: Official Package Diagram Image from SDS
    pkg_img_path = 'docs/diagrams/package_diagram.png'
    if os.path.exists(pkg_img_path):
        add_card(s9, Inches(5.5), Inches(1.45), Inches(7.0), Inches(5.3), bg_color=RGBColor(255, 255, 255))
        s9.shapes.add_picture(pkg_img_path, Inches(5.6), Inches(1.55), Inches(6.8), Inches(5.1))

    # ==========================================
    # SLIDE 10: MỤC 6 - CHI TIẾT PACKAGE & VÒNG ĐỜI XỬ LÝ [TRỌNG TÂM 1]
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Mục 6 • Vòng Đời Xử Lý & Khóa Tài Nguyên [Trọng Tâm 1]", "Kiến Trúc 4 Tầng & Động Cơ Khóa Đồng Thời Chống Đặt Trùng Xe")

    # Embed modular_monolith_architecture.png
    arch_img_path = 'docs/diagrams/modular_monolith_architecture.png'
    if os.path.exists(arch_img_path):
        add_card(s10, Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.3), border_color=ACCENT_PEACH)
        s10.shapes.add_picture(arch_img_path, Inches(0.9), Inches(1.55), Inches(11.533), Inches(5.1))

    # ==========================================
    # SLIDE 11: MỤC 7 - CÁCH APPLY AI VÀO HỆ THỐNG [TRỌNG TÂM 2]
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "Mục 7 • Ứng Dụng AI Vào Hệ Thống [Trọng Tâm 2]", "Kiến Trúc & Quy Trình Hệ Thống AI Xếp Lịch Trực Thông Minh (Dual-AI Engine)")

    # Embed ai_scheduling_architecture.png full width
    ai_arch_path = 'docs/diagrams/ai_scheduling_architecture.png'
    if os.path.exists(ai_arch_path):
        add_card(s11, Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.3), border_color=ACCENT_PEACH)
        s11.shapes.add_picture(ai_arch_path, Inches(0.9), Inches(1.55), Inches(11.533), Inches(5.1))

    # ==========================================
    # SLIDE 12: MỤC 7 - THUẬT TOÁN HEURISTIC & PROMPT GEMINI [TRỌNG TÂM 2]
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)
    add_header(s12, "Mục 7 • Chi Tiết Thuật Toán Phân Ca [Trọng Tâm 2]", "Thuật Toán Heuristic MOTORENT-Rule-v2 & Kỹ Thuật Structured Prompt Gemini")

    # Left: Heuristic Rule-v2
    add_card(s12, Inches(0.8), Inches(1.45), Inches(5.7), Inches(5.3), border_color=ACCENT_PEACH)
    tb_h = s12.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(4.9))
    tf_h = tb_h.text_frame
    tf_h.word_wrap = True

    p = tf_h.paragraphs[0]
    p.text = "ĐỘNG CƠ HEURISTIC SOLVER (RULE-v2)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    h_points = [
        ("1. Công thức DemandScore tải ca trạm:", "Demand = Pickup*1.0 + Return*1.0 + DoorDelivery*0.8 + WeekendBoost (+1.5)\nQuy đổi linh hoạt ra 1, 2 hoặc 3 nhân sự/ca."),
        ("2. Thưởng Ca Liền Kề (+30 điểm):", "Ưu tiên tối đa xếp Ca 1 & 2 (Sáng - Chiều) hoặc Ca 2 & 3 (Chiều - Tối) để nhân viên làm 1 mạch về nghỉ trọn vẹn."),
        ("3. Phạt Nặng Ca Gãy Phi Lý (-85 điểm):", "Tránh xếp Ca 1 & 3 (làm sáng, tối lên làm tiếp, nghỉ chiều). Chỉ miễn cưỡng chọn khi trạm không còn ai khác."),
        ("4. Cấm Tuyệt Đối Clopening (-35 điểm):", "Cấm xếp Ca 3 tối hôm trước (kết thúc 22:00) rồi lại Ca 1 sáng hôm sau (bắt đầu 07:00). Đảm bảo thời gian ngủ nghỉ >= 9 tiếng."),
        ("5. Phân Bổ Công Bằng & Tham Lam (Greedy Balance):", "Ưu tiên phân slot cho nhân viên có tổng giờ làm tích lũy thấp nhất, ngăn chặn tình trạng người quá tải người thiếu giờ.")
    ]

    for ht, hd in h_points:
        p = tf_h.add_paragraph()
        p.text = ht
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_h.add_paragraph()
        p.text = hd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    # Right: Gemini LLM API Prompting
    add_card(s12, Inches(6.8), Inches(1.45), Inches(5.733), Inches(5.3), border_color=ACCENT_MINT)
    tb_g = s12.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.333), Inches(4.9))
    tf_g = tb_g.text_frame
    tf_g.word_wrap = True

    p = tf_g.paragraphs[0]
    p.text = "KỸ THUẬT PROMPT GOOGLE GEMINI AI"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_MINT
    p.space_after = Pt(8)

    g_points = [
        ("1. Chuỗi Mô Hình Fallback Đa Tầng:", "Tự động chuyển đổi mượt mà: gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash khi gặp sự cố mạng hoặc quota."),
        ("2. Structured Prompt Engineering:", "System prompt định vị chuyên gia điều phối vận hành chuỗi xe máy. Nạp đầy đủ context: danh sách nhân viên, đăng ký rảnh/bận, lịch đã có, slot thiếu."),
        ("3. Strict JSON Schema Validation:", "Bắt buộc mô hình trả về JSON chuẩn xác tuyệt đối, bao gồm confidenceScore, isReluctant13, và trường 'reason' giải thích lý do bằng tiếng Việt."),
        ("4. Tái Sử Dụng Bản Xem Trước (Single-Call):", "Lưu bản preview trên State Frontend; khi quản lý bấm 'Áp Dụng Lịch', dữ liệu ghi thẳng vào DB, KHÔNG gọi AI lần 2 (tiết kiệm 100% token).")
    ]

    for gt, gd in g_points:
        p = tf_g.add_paragraph()
        p.text = gt
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH
        p.space_after = Pt(1)

        p = tf_g.add_paragraph()
        p.text = gd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    # ==========================================
    # SLIDE 13: MỤC 7 - NLP TIẾNG VIỆT & BẢO TOÀN LỊCH SỬ ĐIỂM DANH [TRỌNG TÂM 2]
    # ==========================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13)
    add_header(s13, "Mục 7 • NLP Tiếng Việt & Bảo Toàn Dữ Liệu [Trọng Tâm 2]", "Bộ Phân Tích Cú Pháp Tiếng Việt & Cơ Chế Khóa Bất Biến Điểm Danh")

    # Left: NLP
    add_card(s13, Inches(0.8), Inches(1.45), Inches(5.7), Inches(5.3), border_color=ACCENT_BLUE)
    tb_nlp = s13.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(4.9))
    tf_nlp = tb_nlp.text_frame
    tf_nlp.word_wrap = True

    p = tf_nlp.paragraphs[0]
    p.text = "BỘ PHÂN TÍCH CÚ PHÁP TIẾNG VIỆT (NLP PARSER)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_BLUE
    p.space_after = Pt(8)

    nlp_details = [
        ("Tin nhắn mẫu của nhân viên:", '"t2 1 2, t3 sang chieu, t4 ban, t5 1 2 ban 3, t7 ko lam ca 2, cn off"'),
        ("Chuẩn hóa thứ linh hoạt:", "t2, thu 2, mon, monday -> Thứ 2 ... cn, chu nhat, sun -> Chủ Nhật"),
        ("Chuẩn hóa ca trực theo thói quen:", "1 / sang -> Ca 1 (07:00-12:00), 2 / chieu -> Ca 2 (12:00-17:00), 3 / toi -> Ca 3 (17:00-22:00)"),
        ("Xử lý ngữ nghĩa phủ định tự nhiên:", '"bận ca 1", "ko làm 2", "nghỉ sáng" -> Đánh dấu bận đúng ca đó'),
        ("Đồng bộ 2 chiều (Bidirectional Sync):", "Vừa gõ chat, ma trận ô lưới đăng ký trên UI tự động tick xanh/đỏ ngay lập tức, giúp nhân viên trực quan kiểm tra lại.")
    ]

    for nt, nd in nlp_details:
        p = tf_nlp.add_paragraph()
        p.text = nt
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT
        p.space_after = Pt(1)

        p = tf_nlp.add_paragraph()
        p.text = nd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    # Right: Historical Preservation (Immutability)
    add_card(s13, Inches(6.8), Inches(1.45), Inches(5.733), Inches(5.3), border_color=ACCENT_ROSE)
    tb_imm = s13.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.333), Inches(4.9))
    tf_imm = tb_imm.text_frame
    tf_imm.word_wrap = True

    p = tf_imm.paragraphs[0]
    p.text = "BẢO TOÀN LỊCH SỬ CHẤM CÔNG (IMMUTABILITY)"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_ROSE
    p.space_after = Pt(8)

    imm_details = [
        ("Vấn đề thực tế khi chạy lại AI giữa tuần:", "Nếu nhân viên xin nghỉ đột xuất vào thứ 5, chạy lại AI cho cả tuần có nguy cơ ghi đè hoặc xóa mất ca của Thứ 2, Thứ 3, Thứ 4 đã diễn ra!"),
        ("Quy tắc Khóa Bất Biến 1 (Ca quá khứ):", "Mọi ca có ngày nhỏ hơn ngày hiện tại (Date < Today) đều được KHÓA BẢO VỆ 100%, thuật toán AI không được phép can thiệp."),
        ("Quy tắc Khóa Bất Biến 2 (Ca đã Check-in):", "Ca làm việc đã có dấu mốc Check-in hoặc Check-out thực tế của nhân viên được bảo lưu tuyệt đối làm căn cứ tính lương."),
        ("Chỉ xếp bù slot tương lai:", "AI chỉ quét và phân bổ vào các slot trống trong tương lai chưa điểm danh."),
        ("Toàn vẹn số liệu kế toán & tiền lương:", "Đảm bảo đối soát HR và tính lương cuối tháng chính xác 100%, không xảy ra tranh chấp dữ liệu chấm công.")
    ]

    for it, idesc in imm_details:
        p = tf_imm.add_paragraph()
        p.text = it
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH
        p.space_after = Pt(1)

        p = tf_imm.add_paragraph()
        p.text = idesc
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(6)

    # ==========================================
    # SLIDE 14: KẾT QUẢ KIỂM THỬ TOÀN DIỆN
    # ==========================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14)
    add_header(s14, "Đảm Bảo Chất Lượng • Kiểm Thử", "Kết Quả Kiểm Thử Thực Tế: 30/30 Test Suites Đạt Chuẩn Tuyệt Đối")

    # 4 Cards of Metrics
    metrics = [
        ("30 / 30", "Test Suites Passed", "100% Bộ kiểm thử tự động Vitest bao gồm Unit, Integration, Concurrency Locks & AI Verification đạt kết quả Pass."),
        ("1,807", "Client Modules", "Vite build sản phẩm sạch bóng, 0 lỗi TypeScript, cấu trúc Responsive mượt mà trên cả Mobile, Tablet và Desktop."),
        ("100%", "Bảo Mật Dữ Liệu", "Mã hóa AES-256-GCM bảo vệ eKYC, phân quyền RBAC 4 vai trò, AuditLog tự động che mờ dữ liệu nhạy cảm [REDACTED]."),
        ("0.00s", "Xung Đột Đặt Trùng", "Hàng đợi Promise FIFO kết hợp MongoDB Atomic CAS loại bỏ hoàn toàn lỗi đặt trùng xe trong điều kiện tải cao.")
    ]

    card_mw = Inches(2.78)
    card_mh = Inches(5.3)
    card_mg = Inches(0.2)
    left_m = Inches(0.8)

    for mi, (m_val, m_title, m_desc) in enumerate(metrics):
        cx = left_m + mi * (card_mw + card_mg)
        border = ACCENT_PEACH if mi in [0, 3] else ACCENT_MINT
        add_card(s14, cx, Inches(1.45), card_mw, card_mh, border_color=border)

        tb = s14.shapes.add_textbox(cx + Inches(0.15), Inches(1.7), card_mw - Inches(0.3), card_mh - Inches(0.4))
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
    # SLIDE 15: KẾT LUẬN & HƯỚNG PHÁT TRIỂN
    # ==========================================
    s15 = prs.slides.add_slide(blank_layout)
    set_slide_background(s15)
    add_header(s15, "Tổng Kết • Hướng Phát Triển", "Kết Luận Dự Án & Định Hướng Mở Rộng Hệ Thống")

    add_card(s15, Inches(0.8), Inches(1.45), Inches(5.7), Inches(5.3), border_color=ACCENT_MINT)
    tb_c1 = s15.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(5.3), Inches(4.9))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True

    p = tf_c1.paragraphs[0]
    p.text = "CÁC KẾT QUẢ ĐẠT ĐƯỢC CỦA ĐỒ ÁN"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_MINT
    p.space_after = Pt(8)

    c_achievements = [
        ("• Hoàn thành trọn vẹn 100% mục tiêu SDS/RDS:", "Xây dựng thành công hệ sinh thái 22 modules nghiệp vụ, giải quyết trọn vẹn bài toán thuê xe đa trạm."),
        ("• Tiên phong ứng dụng AI điều phối thực tế:", "Kết hợp Dual-AI Engine giải quyết bài toán phân ca hóc búa, loại bỏ clopening và ca gãy phi lý."),
        ("• An toàn giao dịch & Pháp lý minh bạch:", "Thanh toán cọc 30% VNPay/VietQR, ký số hợp đồng song phương tại quầy kèm ảnh chụp 4 góc xe."),
        ("• Kiến trúc phần mềm chuẩn mực cao cấp:", "Modular Monolith phân lớp sạch, dễ bảo trì, mã nguồn TypeScript nghiêm ngặt, zero circular dependency.")
    ]
    for ct, cd in c_achievements:
        p = tf_c1.add_paragraph()
        p.text = ct
        p.font.name = 'Segoe UI'
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.space_after = Pt(1)

        p = tf_c1.add_paragraph()
        p.text = cd
        p.font.name = 'Segoe UI'
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)

    add_card(s15, Inches(6.8), Inches(1.45), Inches(5.733), Inches(5.3), border_color=ACCENT_PEACH)
    tb_c2 = s15.shapes.add_textbox(Inches(7.0), Inches(1.65), Inches(5.333), Inches(4.9))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True

    p = tf_c2.paragraphs[0]
    p.text = "HƯỚNG PHÁT TRIỂN TIẾP THEO & Q&A"
    p.font.name = 'Segoe UI'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ACCENT_PEACH
    p.space_after = Pt(8)

    c_futures = [
        ("• Tích hợp IoT Định Vị GPS Trên Xe:", "Lắp đặt hộp đen IoT theo dõi lộ trình thời gian thực, cảnh báo rung lắc và hỗ trợ tìm xe khẩn cấp."),
        ("• Mở rộng ứng dụng Mobile App Native:", "Phát triển ứng dụng iOS / Android (React Native) cho khách hàng quét mã QR nhận xe tự động tại trạm."),
        ("• Mở rộng mạng lưới trạm trên toàn quốc:", "Sẵn sàng tách các module fleet/booking thành microservices khi chuỗi đạt mốc 100+ chi nhánh."),
        ("• Kính mời Hội đồng Thầy Cô chấm đồ án:", "Nhóm xin chân thành cảm ơn và sẵn sàng lắng nghe ý kiến đóng góp, nhận xét từ Quý Thầy Cô!")
    ]
    for ft, fd in c_futures:
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

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    prs.save(output_path)
    print(f"Generated {len(prs.slides)} slides in PPTX deck at {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    create_deck()
