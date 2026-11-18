import sys
import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # blank layout

    # Colors
    BG_DARK = RGBColor(16, 16, 16)       # #101010
    CARD_BG = RGBColor(24, 24, 24)       # #181818
    CARD_BORDER = RGBColor(46, 46, 46)   # #2E2E2E
    ACCENT_PEACH = RGBColor(255, 199, 153) # #FFC799
    ACCENT_MINT = RGBColor(153, 255, 228)  # #99FFE4
    TEXT_WHITE = RGBColor(245, 245, 245)  # #F5F5F5
    TEXT_MUTED = RGBColor(160, 160, 160)  # #A0A0A0
    ACCENT_BLUE = RGBColor(140, 190, 255)

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, section_tag, title_text):
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.35))
        tf = tag_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = section_tag.upper()
        p.font.name = 'Calibri'
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.6))
        tf2 = title_box.text_frame
        tf2.word_wrap = True
        tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
        p2 = tf2.paragraphs[0]
        p2.text = title_text
        p2.font.name = 'Calibri'
        p2.font.size = Pt(24)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_WHITE

    def add_card(slide, left, top, width, height, title=None, subtitle=None, border_color=CARD_BORDER, bg_color=CARD_BG):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)

        if title or subtitle:
            tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.4))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
            if title:
                p = tf.paragraphs[0]
                p.text = title
                p.font.name = 'Calibri'
                p.font.size = Pt(14)
                p.font.bold = True
                p.font.color.rgb = ACCENT_PEACH
                p.space_after = Pt(4)
            if subtitle:
                p2 = tf.add_paragraph()
                p2.text = subtitle
                p2.font.name = 'Calibri'
                p2.font.size = Pt(10.5)
                p2.font.color.rgb = TEXT_MUTED
            return tf
        return card

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.3), Inches(3.5))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p0 = tf.paragraphs[0]
    p0.text = "SWP391 • BÁO CÁO DỰ ÁN PHẦN MỀM TỐT NGHIỆP"
    p0.font.name = 'Calibri'
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = ACCENT_MINT
    p0.space_after = Pt(12)

    p1 = tf.add_paragraph()
    p1.text = "MOTORENT"
    p1.font.name = 'Arial'
    p1.font.size = Pt(48)
    p1.font.bold = True
    p1.font.color.rgb = ACCENT_PEACH
    p1.space_after = Pt(8)

    p2 = tf.add_paragraph()
    p2.text = "Hệ Thống Cho Thuê Xe Máy Công Nghệ & Tự Động Hóa Vận Hành Đa Trạm"
    p2.font.name = 'Calibri'
    p2.font.size = Pt(20)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_after = Pt(24)

    p3 = tf.add_paragraph()
    p3.text = "Xác thực eKYC • Hợp đồng ký số song phương • Giao xe tận nơi • AI tối ưu hóa ca trực kép"
    p3.font.name = 'Calibri'
    p3.font.size = Pt(13)
    p3.font.color.rgb = TEXT_MUTED

    add_card(s1, Inches(1.0), Inches(5.6), Inches(11.3), Inches(1.1), border_color=CARD_BORDER)
    tb_b = s1.shapes.add_textbox(Inches(1.3), Inches(5.75), Inches(10.7), Inches(0.8))
    tf_b = tb_b.text_frame
    tf_b.word_wrap = True
    p_b1 = tf_b.paragraphs[0]
    p_b1.text = "NHÓM THỰC HIỆN: GROUP 4 | GIÁO VIÊN HƯỚNG DẪN: GV. NGUYỄN VĂN A"
    p_b1.font.name = 'Calibri'
    p_b1.font.size = Pt(11)
    p_b1.font.bold = True
    p_b1.font.color.rgb = ACCENT_PEACH
    p_b1.space_after = Pt(4)

    p_b2 = tf_b.add_paragraph()
    p_b2.text = "Trần Quang Bửu Hoàng (Leader) • Phạm Quốc Cả • Nguyễn Thái Dương • Nguyễn Hữu Tài • Phạm Tuyên"
    p_b2.font.name = 'Calibri'
    p_b2.font.size = Pt(13)
    p_b2.font.bold = True
    p_b2.font.color.rgb = TEXT_WHITE

    # ==========================================
    # SLIDE 2: AGENDA (7 MỤC)
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Dàn ý báo cáo", "7 Hạng Mục Trình Bày Dự Án SWP391")

    agenda_items = [
        ("01", "Tên đề tài & Thành viên nhóm", "Giới thiệu đề tài, phân công trách nhiệm & vai trò 5 thành viên."),
        ("02", "Product Background", "Bối cảnh du lịch Đà Nẵng, nỗi đau khách hàng & bài toán kinh doanh."),
        ("03", "Existing System", "Khảo sát hệ thống hiện có, nhược điểm mô hình cũ & khoảng trống thị trường."),
        ("04", "Use Case Diagram", "Sơ đồ Use Case tổng quan theo 4 tác nhân: Khách hàng, Nhân viên, Quản lý, Admin."),
        ("05", "Database Architecture", "Kiến trúc CSDL MongoDB với 24 models chuẩn hóa theo 5 cụm nghiệp vụ."),
        ("06", "Package Diagram [Trọng tâm]", "Kiến trúc Modular Monolith: Client SPA, Core Middleware, 22 Modules, Sockets."),
        ("07", "Ứng dụng AI vào hệ thống [Trọng tâm]", "Dual-AI Engine: Heuristic Rule-v2 kết hợp Gemini LLM API & NLP Tiếng Việt.")
    ]

    col_w = Inches(5.6)
    row_h = Inches(1.05)
    for idx, (num, title, desc) in enumerate(agenda_items):
        is_highlight = idx in [5, 6]
        border_col = ACCENT_PEACH if is_highlight else CARD_BORDER
        bg_col = RGBColor(32, 28, 24) if is_highlight else CARD_BG

        if idx < 4:
            x = Inches(0.8)
            y = Inches(1.5 + idx * 1.25)
        else:
            x = Inches(6.8)
            y = Inches(1.5 + (idx - 4) * 1.25)

        add_card(s2, x, y, col_w, row_h, border_color=border_col, bg_color=bg_col)
        tb_item = s2.shapes.add_textbox(x + Inches(0.25), y + Inches(0.12), col_w - Inches(0.5), row_h - Inches(0.24))
        tf_item = tb_item.text_frame
        tf_item.word_wrap = True
        tf_item.margin_left = tf_item.margin_top = tf_item.margin_right = tf_item.margin_bottom = 0

        p = tf_item.paragraphs[0]
        p.text = f"{num}. {title}"
        p.font.name = 'Calibri'
        p.font.size = Pt(13.5)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if is_highlight else TEXT_WHITE
        p.space_after = Pt(2)

        p_desc = tf_item.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = 'Calibri'
        p_desc.font.size = Pt(10)
        p_desc.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 3: MỤC 1 - THÀNH VIÊN
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Mục 1 • Nhóm thực hiện", "Thông Tin Thành Viên & Bảng Phân Công Đóng Góp (Group 4)")

    members = [
        ("Trần Quang Bửu Hoàng", "Team Leader / Full-Stack", "35%", 
         ["Kiến trúc Modular Monolith, phân quyền RBAC & Audit Log",
          "Luồng Đặt xe, Giỏ xe, Cổng VNPay & VietQR, Hợp đồng ký số song phương",
          "AI Tối ưu hóa phân ca trực (Gemini & Heuristic Solver) & Giao xe Door-to-Door",
          "Biên soạn tài liệu kỹ thuật RDS, SDS, Final Release, Issues Report"]),
        ("Phạm Quốc Cả", "Business Analyst / Backend", "20%",
         ["Phân tích nghiệp vụ & phụ trách biên soạn Đặc tả SRS",
          "Quản lý chi nhánh & tìm kiếm trạm gần nhất theo GPS",
          "Quản lý hồ sơ nhân sự trạm & ca trực cơ bản",
          "Danh mục khuyến mãi & quản lý mã giảm giá"]),
        ("Nguyễn Thái Dương", "Full-Stack Developer", "18%",
         ["Đặt xe, gia hạn hợp đồng (thông báo đa kênh Nhân viên/Admin)",
          "Hủy đơn theo điều khoản KHÔNG HOÀN TIỀN",
          "Nghiệp vụ quầy Check-in/Check-out, kiểm tra xe & phạt quá giờ",
          "Ký biên bản bàn giao xe & xuất hóa đơn điện tử PDF"]),
        ("Nguyễn Hữu Tài", "Full-Stack Developer", "15%",
         ["Danh mục đội xe, bộ lọc tìm kiếm & trang chi tiết xe",
          "Cấu hình giá thuê linh hoạt & quy tắc giá mùa vụ",
          "Cảnh báo bảo dưỡng theo hạn mức ODO & ghi nhận chi phí sửa chữa",
          "Lệnh điều chuyển xe giữa các chi nhánh"]),
        ("Phạm Tuyên", "Frontend Developer", "12%",
         ["Giao diện danh sách xe yêu thích & đánh giá sao phản hồi",
          "Hệ thống gửi khiếu nại & tra cứu tiến độ xử lý",
          "Thông báo lịch hẹn & tích điểm đổi voucher",
          "Quản lý nội dung banner slider & trang chính sách"])
    ]

    w_card = Inches(2.25)
    for idx, (name, role, pct, tasks) in enumerate(members):
        x = Inches(0.8 + idx * 2.4)
        y = Inches(1.5)
        h = Inches(5.3)

        add_card(s3, x, y, w_card, h, border_color=ACCENT_PEACH if idx == 0 else CARD_BORDER)
        tb_m = s3.shapes.add_textbox(x + Inches(0.18), y + Inches(0.18), w_card - Inches(0.36), h - Inches(0.36))
        tf_m = tb_m.text_frame
        tf_m.word_wrap = True
        tf_m.margin_left = tf_m.margin_top = tf_m.margin_right = tf_m.margin_bottom = 0

        p_name = tf_m.paragraphs[0]
        p_name.text = name
        p_name.font.name = 'Calibri'
        p_name.font.size = Pt(13)
        p_name.font.bold = True
        p_name.font.color.rgb = ACCENT_PEACH if idx == 0 else TEXT_WHITE
        p_name.space_after = Pt(2)

        p_role = tf_m.add_paragraph()
        p_role.text = role
        p_role.font.name = 'Calibri'
        p_role.font.size = Pt(10)
        p_role.font.color.rgb = ACCENT_MINT
        p_role.space_after = Pt(4)

        p_pct = tf_m.add_paragraph()
        p_pct.text = f"Đóng góp: {pct}"
        p_pct.font.name = 'Calibri'
        p_pct.font.size = Pt(11)
        p_pct.font.bold = True
        p_pct.font.color.rgb = ACCENT_PEACH
        p_pct.space_after = Pt(8)

        for t in tasks:
            pt = tf_m.add_paragraph()
            pt.text = f"• {t}"
            pt.font.name = 'Calibri'
            pt.font.size = Pt(9.5)
            pt.font.color.rgb = TEXT_MUTED
            pt.space_after = Pt(3)

    # ==========================================
    # SLIDE 4: MỤC 2 - PRODUCT BACKGROUND
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Mục 2 • Bối cảnh sản phẩm", "Bối Cảnh Thị Trường, Nỗi Đau & Tầm Nhìn MOTORENT")

    cols_data = [
        ("BỐI CẢNH THỊ TRƯỜNG ĐÀ NẴNG", 
         "Nhu cầu thuê xe máy du lịch cực kỳ lớn:",
         ["Đà Nẵng đón hơn 7-8 triệu lượt khách du lịch mỗi năm.",
          "Địa hình du lịch phân tán (Sơn Trà, Ngũ Hành Sơn, Bà Nà, Hội An) khiến xe máy là phương tiện số 1.",
          "Khách có nhu cầu linh hoạt: thuê tại sân bay, trả tại bãi biển, nhận xe tận khách sạn.",
          "Mô hình cho thuê vẫn mang tính thủ công, thiếu quy chuẩn đồng bộ."]),
        ("NỖI ĐAU THỰC TẾ (PAIN POINTS)",
         "Những rào cản lớn trong dịch vụ hiện tại:",
         ["Khách hàng: Giữ giấy tờ gốc (CCCD, GPLX) gây rủi ro mất mát, giá không minh bạch, xe cũ dễ hỏng.",
          "Chủ cơ sở: Thất thoát xe, quản lý hợp đồng giấy cồng kềnh, không kiểm soát được chu kỳ bảo dưỡng ODO.",
          "Vận hành trạm: Thiếu công cụ xếp ca trực nhân viên theo lượng khách giao/nhận xe.",
          "Hợp đồng tranh chấp: Thiếu biên bản hiện trạng xe và chữ ký số xác thực hai bên."]),
        ("TẦM NHÌN & GIẢI PHÁP MOTORENT",
         "Nền tảng công nghệ số hóa toàn diện:",
         ["Định danh eKYC điện tử: Mã hóa bảo mật AES-256-GCM, không cần giữ giấy tờ gốc của khách.",
          "Hợp đồng ký số song phương: Khách & Nhân viên ký trực tiếp trên màn hình cảm ứng.",
          "Mô hình đa trạm: Thuê trạm A trả trạm B, điều chuyển xe linh hoạt, hỗ trợ giao xe tận nơi.",
          "Tự động hóa thông minh: Cảnh báo bảo dưỡng ODO, AI tối ưu hóa ca trực nhân sự."])
    ]

    for idx, (title, subtitle, bullets) in enumerate(cols_data):
        x = Inches(0.8 + idx * 4.0)
        y = Inches(1.5)
        w = Inches(3.7)
        h = Inches(5.3)

        add_card(s4, x, y, w, h, border_color=ACCENT_PEACH if idx == 2 else CARD_BORDER)
        tb_c = s4.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), w - Inches(0.5), h - Inches(0.4))
        tf_c = tb_c.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0

        p_t = tf_c.paragraphs[0]
        p_t.text = title
        p_t.font.name = 'Calibri'
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = ACCENT_PEACH if idx == 2 else ACCENT_MINT
        p_t.space_after = Pt(4)

        p_sub = tf_c.add_paragraph()
        p_sub.text = subtitle
        p_sub.font.name = 'Calibri'
        p_sub.font.size = Pt(11)
        p_sub.font.bold = True
        p_sub.font.color.rgb = TEXT_WHITE
        p_sub.space_after = Pt(10)

        for b in bullets:
            pb = tf_c.add_paragraph()
            pb.text = f"• {b}"
            pb.font.name = 'Calibri'
            pb.font.size = Pt(10)
            pb.font.color.rgb = TEXT_MUTED
            pb.space_after = Pt(6)

    # ==========================================
    # SLIDE 5: MỤC 3 - EXISTING SYSTEM
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Mục 3 • Hiện trạng hệ thống", "Khảo Sát Hệ Thống Hiện Có & Bảng So Sánh Năng Lực")

    rows = [
        ("Xác thực khách hàng", "Giữ CCCD / Bằng lái gốc", "Chụp ảnh giấy tờ (ô tô)", "eKYC mã hóa AES-256-GCM, không giữ gốc"),
        ("Hợp đồng thuê xe", "Hợp đồng giấy viết tay", "Hợp đồng xác nhận 1 chiều", "Ký số song phương tại quầy (Khách & NV)"),
        ("Hình thức thanh toán", "Tiền mặt / Chuyển khoản lẻ", "Thẻ tín dụng / Ví điện tử", "Cọc 30% VNPay / VietQR, 70% tất toán"),
        ("Chính sách trả xe sớm", "Tranh cãi hoàn tiền thủ công", "Hoàn phí theo chính sách chủ xe", "Điều khoản KHÔNG HOÀN TIỀN minh bạch"),
        ("Giao xe tận nơi", "Tự thỏa thuận qua điện thoại", "Chủ xe tự thương lượng", "Tự động tính phí 40k/chiều theo loại hình"),
        ("Quản lý đội xe đa trạm", "Không có (1 cửa hàng cố định)", "Phân tán theo từng cá nhân", "Đa trạm, điều chuyển liên trạm, trả khác trạm"),
        ("Bảo dưỡng xe định kỳ", "Ước lượng cảm tính", "Chủ xe tự theo dõi", "Cảnh báo ODO tự động, khóa xe bảo dưỡng"),
        ("Phân ca nhân viên", "Xếp lịch thủ công bằng giấy/Excel", "Không áp dụng", "AI Tối ưu hóa phân ca (Gemini & Heuristic)")
    ]

    x = Inches(0.8)
    y = Inches(1.5)
    w = Inches(11.7)
    h = Inches(5.3)

    table_shape = s5.shapes.add_table(len(rows) + 1, 4, x, y, w, h)
    table = table_shape.table
    table.columns[0].width = Inches(2.7)
    table.columns[1].width = Inches(2.9)
    table.columns[2].width = Inches(2.9)
    table.columns[3].width = Inches(3.2)

    headers = ["Tiêu Chí So Sánh", "Thuê Xe Truyền Thống", "App Thuê Xe Khác", "Hệ Thống MOTORENT"]
    for col_idx, h_text in enumerate(headers):
        cell = table.cell(0, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor(38, 38, 38)
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.name = 'Calibri'
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if col_idx == 3 else TEXT_WHITE
        p.alignment = PP_ALIGN.CENTER

    for row_idx, r_data in enumerate(rows):
        for col_idx, val in enumerate(r_data):
            cell = table.cell(row_idx + 1, col_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(28, 25, 20) if col_idx == 3 else CARD_BG
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.name = 'Calibri'
            p.font.size = Pt(10)
            if col_idx == 3:
                p.font.bold = True
                p.font.color.rgb = ACCENT_MINT
            elif col_idx == 0:
                p.font.bold = True
                p.font.color.rgb = TEXT_WHITE
            else:
                p.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 6: MỤC 4 - USE CASE DIAGRAM (KÈM HÌNH ẢNH)
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Mục 4 • Sơ đồ Use Case", "Sơ Đồ Use Case Diagram & Luồng Nghiệp Vụ Người Dùng")

    # Left card: Summary of 4 actors
    add_card(s6, Inches(0.8), Inches(1.5), Inches(4.3), Inches(5.3))
    tb_u = s6.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(3.9), Inches(4.9))
    tf_u = tb_u.text_frame
    tf_u.word_wrap = True
    tf_u.margin_left = tf_u.margin_top = tf_u.margin_right = tf_u.margin_bottom = 0

    p_ut = tf_u.paragraphs[0]
    p_ut.text = "4 TÁC NHÂN CHÍNH (ACTORS)"
    p_ut.font.name = 'Calibri'
    p_ut.font.size = Pt(13)
    p_ut.font.bold = True
    p_ut.font.color.rgb = ACCENT_PEACH
    p_ut.space_after = Pt(8)

    actor_summaries = [
        ("Khách Hàng (Customer):", "Đăng ký, eKYC trực tuyến, Đặt xe đơn/giỏ xe, Thanh toán VNPay/VietQR, Ký hợp đồng nhận xe, Gia hạn, Khiếu nại, Review."),
        ("Nhân Viên Quầy (Staff):", "Điểm danh vào/ra ca, Đăng ký lịch rảnh tiếng Việt, Bàn làm việc tại quầy, Ký biên bản bàn giao xe, Thu 70% tất toán, Live Chat."),
        ("Quản Lý Trạm (BranchManager):", "Quản lý đội xe, Lệnh điều chuyển xe giữa các trạm, Duyệt xe bảo dưỡng, Chạy AI xếp lịch ca trực tuần, Đối soát tài chính."),
        ("Quản Trị Viên (SystemAdmin):", "Quản lý mạng lưới trạm & GPS, Phân quyền ma trận RBAC, Giám sát AuditLog, Báo cáo KPI chuỗi, Cấu hình CMS & Cron Jobs.")
    ]

    for a_t, a_d in actor_summaries:
        pa = tf_u.add_paragraph()
        pa.text = a_t
        pa.font.name = 'Calibri'
        pa.font.size = Pt(11)
        pa.font.bold = True
        pa.font.color.rgb = ACCENT_MINT
        pa.space_after = Pt(1)

        pad = tf_u.add_paragraph()
        pad.text = a_d
        pad.font.name = 'Calibri'
        pad.font.size = Pt(9.5)
        pad.font.color.rgb = TEXT_MUTED
        pad.space_after = Pt(6)

    # Right: Use Case Overview Diagram Image
    uc_img_path = 'docs/diagrams/usecase_overview_flow.jpeg'
    if os.path.exists(uc_img_path):
        # White backing card for clean contrast
        card_img = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.3), Inches(1.5), Inches(7.2), Inches(5.3))
        card_img.fill.solid()
        card_img.fill.fore_color.rgb = RGBColor(255, 255, 255)
        card_img.line.color.rgb = CARD_BORDER
        card_img.line.width = Pt(1)
        s6.shapes.add_picture(uc_img_path, Inches(5.4), Inches(1.6), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 7: MỤC 5 - DATABASE (KÈM HÌNH ẢNH ERD)
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Mục 5 • Cơ sở dữ liệu", "Kiến Trúc CSDL MongoDB (24 Collections) & Sơ Đồ ERD")

    # Left: 24 collections description
    add_card(s7, Inches(0.8), Inches(1.5), Inches(4.3), Inches(5.3))
    tb_db = s7.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(3.9), Inches(4.9))
    tf_db = tb_db.text_frame
    tf_db.word_wrap = True
    tf_db.margin_left = tf_db.margin_top = tf_db.margin_right = tf_db.margin_bottom = 0

    p_dbt = tf_db.paragraphs[0]
    p_dbt.text = "5 CỤM DỮ LIỆU NGHIỆP VỤ (24 MODELS)"
    p_dbt.font.name = 'Calibri'
    p_dbt.font.size = Pt(13)
    p_dbt.font.bold = True
    p_dbt.font.color.rgb = ACCENT_PEACH
    p_dbt.space_after = Pt(8)

    db_bullets = [
        ("1. Định danh & Phân ca (3):", "User (bcrypt, tokenVersion, eKYC AES-256), StaffSchedule, StaffAvailability."),
        ("2. Đội xe & Chi nhánh (6):", "Branch (GPS Leaflet), Vehicle, Category, SeasonalPricingRule, VehicleTransfer, MaintenanceLog."),
        ("3. Thuê xe & Giao dịch (4):", "Booking (chữ ký song phương, cọc 30%, tất toán 70%), Payment (VNPay/VietQR), Discount, BookingReminder."),
        ("4. Hỗ trợ & Khách hàng (6):", "Complaint (Open->Closed), Feedback, Review, Wishlist, Conversation, Message (Socket.IO)."),
        ("5. Hệ thống & CMS (5):", "AuditLog (che secret [REDACTED]), Notification, Banner, StaticPage, SystemConfig.")
    ]

    for d_h, d_b in db_bullets:
        pd = tf_db.add_paragraph()
        pd.text = d_h
        pd.font.name = 'Calibri'
        pd.font.size = Pt(11)
        pd.font.bold = True
        pd.font.color.rgb = ACCENT_MINT
        pd.space_after = Pt(1)

        pdb = tf_db.add_paragraph()
        pdb.text = d_b
        pdb.font.name = 'Calibri'
        pdb.font.size = Pt(9.5)
        pdb.font.color.rgb = TEXT_MUTED
        pdb.space_after = Pt(6)

    # Right: ERD Diagram Image
    db_img_path = 'docs/diagrams/database_booking_erd.jpeg'
    if os.path.exists(db_img_path):
        card_db_img = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.3), Inches(1.5), Inches(7.2), Inches(5.3))
        card_db_img.fill.solid()
        card_db_img.fill.fore_color.rgb = RGBColor(255, 255, 255)
        card_db_img.line.color.rgb = CARD_BORDER
        card_db_img.line.width = Pt(1)
        s7.shapes.add_picture(db_img_path, Inches(5.4), Inches(1.6), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 8: MỤC 6 - PACKAGE DIAGRAM (KÈM HÌNH ẢNH TRỌNG TÂM)
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Mục 6 • Sơ đồ Package [Trọng tâm]", "Sơ Đồ Package Diagram Kiến Trúc Modular Monolith")

    # Left: Package structure explanation
    add_card(s8, Inches(0.8), Inches(1.5), Inches(4.3), Inches(5.3), border_color=ACCENT_PEACH)
    tb_pkg = s8.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(3.9), Inches(4.9))
    tf_pkg = tb_pkg.text_frame
    tf_pkg.word_wrap = True
    tf_pkg.margin_left = tf_pkg.margin_top = tf_pkg.margin_right = tf_pkg.margin_bottom = 0

    p_pkt = tf_pkg.paragraphs[0]
    p_pkt.text = "KIẾN TRÚC MODULAR MONOLITH"
    p_pkt.font.name = 'Calibri'
    p_pkt.font.size = Pt(13)
    p_pkt.font.bold = True
    p_pkt.font.color.rgb = ACCENT_PEACH
    p_pkt.space_after = Pt(8)

    pkg_desc = [
        ("Tầng Giao Diện (Client SPA):", "React 18 + Vite + Tailwind CSS, 25+ Pages, 40+ Components, Axios Interceptors tự động đính kèm Bearer Token."),
        ("Bộ Định Tuyến (routes/index):", "Đầu mối phân phối API duy nhất, gắn tiền tố /api, định tuyến vào 22 Feature Modules con."),
        ("22 Feature Modules Độc Lập:", "Mỗi module sở hữu khép kín Controller -> Service -> Routes (auth, branch, vehicle, booking, fleet, hr, support, cms...)."),
        ("Tầng Bảo Vệ Tập Trung (core/):", "authMiddleware, rbacMiddleware (4 vai trò), auditMiddleware (che bí mật), resourceLock (chống trùng lịch)."),
        ("Hạ Tầng & Dữ Liệu (models/ & config/):", "24 Mongoose Data Models kết nối MongoDB Cluster, VNPay SDK, Google Gemini API.")
    ]

    for p_h, p_d in pkg_desc:
        pp = tf_pkg.add_paragraph()
        pp.text = p_h
        pp.font.name = 'Calibri'
        pp.font.size = Pt(11)
        pp.font.bold = True
        pp.font.color.rgb = ACCENT_MINT
        pp.space_after = Pt(1)

        ppd = tf_pkg.add_paragraph()
        ppd.text = p_d
        ppd.font.name = 'Calibri'
        ppd.font.size = Pt(9.5)
        ppd.font.color.rgb = TEXT_MUTED
        ppd.space_after = Pt(5)

    # Right: Package Diagram Image
    pkg_img_path = 'docs/diagrams/package_diagram.png'
    if os.path.exists(pkg_img_path):
        card_pkg_img = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.3), Inches(1.5), Inches(7.2), Inches(5.3))
        card_pkg_img.fill.solid()
        card_pkg_img.fill.fore_color.rgb = RGBColor(255, 255, 255)
        card_pkg_img.line.color.rgb = ACCENT_PEACH
        card_pkg_img.line.width = Pt(1.5)
        s8.shapes.add_picture(pkg_img_path, Inches(5.4), Inches(1.6), Inches(7.0), Inches(5.1))

    # ==========================================
    # SLIDE 9: MỤC 6 - CHI TIẾT PACKAGE & REQUEST FLOW
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "Mục 6 • Vòng đời xử lý [Trọng tâm]", "Vòng Đời Xử Lý Yêu Cầu & Cơ Chế Khóa Tài Nguyên An Toàn")

    flow_boxes = [
        ("1. HTTP REQUEST", "Client gửi Request kèm JWT Bearer Token (HTTPS REST / WebSocket)."),
        ("2. AUTH MIDDLEWARE", "Giải mã JWT, kiểm tra `tokenVersion` trong DB để hủy phiên tức thì khi bị khóa."),
        ("3. RBAC MIDDLEWARE", "So khớp quyền trong `PERMISSION_MATRIX` theo 4 vai trò (Customer/Staff/Manager/Admin)."),
        ("4. AUDIT LOGGER", "Tự động che dữ liệu nhạy cảm (`geminiApiKey`, `password`, `secret`) & ghi `AuditLog`."),
        ("5. MODULE CONTROLLER", "Validate DTO request, trích xuất parameters, gọi tầng Service xử lý nghiệp vụ."),
        ("6. SERVICE & LOCK", "Sử dụng `acquireVehicleLock` & `withOptionalTransaction` chống xung đột lịch đặt/xe."),
        ("7. MONGOOSE MODEL", "Tương tác CSDL MongoDB, cập nhật atomic CAS (`findOneAndUpdate`), sinh Socket Event.")
    ]

    for idx, (title, desc) in enumerate(flow_boxes):
        if idx < 4:
            x = Inches(0.8 + idx * 2.95)
            y = Inches(1.5)
            w = Inches(2.8)
            h = Inches(2.5)
        else:
            x = Inches(0.8 + (idx - 4) * 3.95)
            y = Inches(4.3)
            w = Inches(3.8)
            h = Inches(2.5)

        add_card(s9, x, y, w, h, border_color=ACCENT_PEACH if idx in [2, 5] else CARD_BORDER)
        tb_f = s9.shapes.add_textbox(x + Inches(0.2), y + Inches(0.2), w - Inches(0.4), h - Inches(0.4))
        tf_f = tb_f.text_frame
        tf_f.word_wrap = True
        tf_f.margin_left = tf_f.margin_top = tf_f.margin_right = tf_f.margin_bottom = 0

        p = tf_f.paragraphs[0]
        p.text = title
        p.font.name = 'Calibri'
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if idx in [2, 5] else ACCENT_MINT
        p.space_after = Pt(6)

        pd = tf_f.add_paragraph()
        pd.text = desc
        pd.font.name = 'Calibri'
        pd.font.size = Pt(10)
        pd.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 10: MỤC 7 - CÁCH APPLY AI
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Mục 7 • Ứng dụng AI [Trọng tâm]", "Bài Toán Tối Ưu Hóa Phân Ca Trực Nhân Viên Bằng AI")

    ai_overview_cols = [
        ("VẤN ĐỀ VẬN HÀNH THỰC TẾ",
         "Nhu cầu giao/nhận xe biến động phức tạp:",
         ["Tại mỗi trạm, khách nhận/trả xe phân bố không đều (cao điểm 07:00-09:00 sáng và 17:00-19:00 tối).",
          "Phát sinh dịch vụ giao nhận xe tận nơi (Door-to-Door Delivery) đòi hỏi nhân viên phải rời trạm di chuyển.",
          "Xếp lịch bằng tay dễ dẫn đến: nhân viên làm việc quá tải, ca gãy gây mệt mỏi, thiếu hụt người vào giờ vàng."]),
        ("MÔ HÌNH DUAL-AI ENGINE",
         "Kiến trúc kết hợp 2 động cơ xếp lịch:",
         ["Động cơ 1 - Google Gemini LLM API: Sử dụng mô hình ngôn ngữ lớn để phân tích văn bản đăng ký và giải bài toán tối ưu tổ hợp.",
          "Động cơ 2 - Local Heuristic Solver (`MOTORENT-Rule-v2`): Bộ quy tắc thuật toán toán học chạy trực tiếp tại server.",
          "Fail-safe 100%: Tự động chuyển đổi mượt mà sang Heuristic nếu mất mạng hoặc hết quota Gemini."]),
        ("LỢI ÍCH MANG LẠI CHO HỆ THỐNG",
         "Hiệu quả đo lường rõ rệt:",
         ["Giảm 95% thời gian xếp lịch tuần của Quản lý trạm (từ 2 giờ xuống còn 3 giây).",
          "Cân bằng tải công bằng tuyệt đối giữa các nhân viên dựa trên chỉ số Jain's Fairness Index.",
          "Loại bỏ 100% tình trạng ca kíp kiệt sức (Clopening - tối làm sáng trực) và giảm tối đa ca gãy (Ca 1 & 3)."])
    ]

    for idx, (title, subtitle, bullets) in enumerate(ai_overview_cols):
        x = Inches(0.8 + idx * 4.0)
        y = Inches(1.5)
        w = Inches(3.7)
        h = Inches(5.3)

        add_card(s10, x, y, w, h, border_color=ACCENT_PEACH if idx == 1 else CARD_BORDER)
        tb_ai = s10.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), w - Inches(0.5), h - Inches(0.4))
        tf_ai = tb_ai.text_frame
        tf_ai.word_wrap = True
        tf_ai.margin_left = tf_ai.margin_top = tf_ai.margin_right = tf_ai.margin_bottom = 0

        p = tf_ai.paragraphs[0]
        p.text = title
        p.font.name = 'Calibri'
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if idx == 1 else ACCENT_MINT
        p.space_after = Pt(4)

        ps = tf_ai.add_paragraph()
        ps.text = subtitle
        ps.font.name = 'Calibri'
        ps.font.size = Pt(11)
        ps.font.bold = True
        ps.font.color.rgb = TEXT_WHITE
        ps.space_after = Pt(10)

        for b in bullets:
            pb = tf_ai.add_paragraph()
            pb.text = f"• {b}"
            pb.font.name = 'Calibri'
            pb.font.size = Pt(10)
            pb.font.color.rgb = TEXT_MUTED
            pb.space_after = Pt(6)

    # ==========================================
    # SLIDE 11: MỤC 7 - THUẬT TOÁN HEURISTIC & GEMINI PROMPT
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "Mục 7 • Chi tiết thuật toán [Trọng tâm]", "Bộ Quy Tắc MOTORENT-Rule-v2 & Kỹ Thuật Prompt Gemini")

    col_rules = [
        ("QUY TẮC THUẬT TOÁN HEURISTIC (RULE-v2)",
         [("1. Đánh giá nhu cầu tải ca", "DemandScore = Pickup*1.0 + Return*1.0 + DoorDelivery*0.8 + WeekendBoost. Tự động xác định số lượng nhân sự cần thiết từ 1 đến 3 người."),
          ("2. Ưu tiên Ca liền kề", "Nếu làm 2 ca/ngày, bắt buộc xếp 2 ca liền nhau: Ca 1 & 2 (Sáng-Chiều) hoặc Ca 2 & 3 (Chiều-Tối) (+30 điểm)."),
          ("3. Phạt nặng Ca gãy (Ca 1 & 3)", "Xếp Ca 1 (Sáng) rồi Ca 3 (Tối) nghỉ chiều gây bất tiện, bị phạt -85 điểm và chỉ chọn khi không còn ai khác."),
          ("4. Chống kiệt sức (Clopening)", "Cấm xếp Ca 3 (Tối kết thúc 22:00) hôm trước rồi lại Ca 1 (Sáng bắt đầu 07:00) hôm sau (-35 điểm)."),
          ("5. Chỉ số công bằng Jain's Index", "Cân bằng tổng số giờ làm việc giữa toàn bộ nhân viên, tích hợp tỷ lệ điểm danh uy tín 30 ngày Laplace.")]),
        ("KỸ THUẬT PROMPT GOOGLE GEMINI",
         [("Mô hình AI sử dụng", "Hỗ trợ chuỗi mô hình fallback: gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash."),
          ("Cấu trúc Prompt", "Định dạng JSON có cấu trúc (system prompt chuyên gia điều phối), cung cấp danh sách nhân viên, tin nhắn đăng ký, ca đã có, slot thiếu."),
          ("Ràng buộc đầu ra nghiêm ngặt", "Yêu cầu trả về JSON chuẩn gồm `confidenceScore`, `reason` giải thích chi tiết tiếng Việt và các cờ `isConsecutive`, `isReluctant13`."),
          ("Tái sử dụng bản xem trước", "Frontend lưu bản kiến nghị xem trước (`precomputedRecommendations`), bấm 'Áp dụng' lưu ngay vào DB mà không gọi lại AI lần 2."),
          ("Timeout & Bảo vệ hạn ngạch", "Giới hạn thời gian gọi API 15s (AbortSignal.timeout), tự động lọc bỏ key mẫu `your_gemini_api_key_here`.")])
    ]

    for idx, (title, items) in enumerate(col_rules):
        x = Inches(0.8 + idx * 6.0)
        y = Inches(1.5)
        w = Inches(5.7)
        h = Inches(5.3)

        add_card(s11, x, y, w, h, border_color=ACCENT_PEACH if idx == 0 else ACCENT_MINT)
        tb_r = s11.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), w - Inches(0.5), h - Inches(0.4))
        tf_r = tb_r.text_frame
        tf_r.word_wrap = True
        tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0

        p = tf_r.paragraphs[0]
        p.text = title
        p.font.name = 'Calibri'
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = ACCENT_PEACH if idx == 0 else ACCENT_MINT
        p.space_after = Pt(8)

        for h_sub, b_desc in items:
            p_sub = tf_r.add_paragraph()
            p_sub.text = h_sub
            p_sub.font.name = 'Calibri'
            p_sub.font.size = Pt(11)
            p_sub.font.bold = True
            p_sub.font.color.rgb = TEXT_WHITE
            p_sub.space_after = Pt(1)

            pd = tf_r.add_paragraph()
            pd.text = b_desc
            pd.font.name = 'Calibri'
            pd.font.size = Pt(9.5)
            pd.font.color.rgb = TEXT_MUTED
            pd.space_after = Pt(6)

    # ==========================================
    # SLIDE 12: MỤC 7 - NLP TIẾNG VIỆT & BẢO TOÀN DỮ LIỆU
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)
    add_header(s12, "Mục 7 • Xử lý ngôn ngữ tự nhiên [Trọng tâm]", "Phân Tích Cú Pháp Tiếng Việt & Bảo Toàn Lịch Sử Điểm Danh")

    nlp_cards = [
        ("BỘ PHÂN TÍCH TIN NHẮN ĐĂNG KÝ TIẾNG VIỆT",
         "Hỗ trợ ngôn ngữ tự nhiên và viết tắt linh hoạt:",
         ["Nhân viên gửi tin nhắn: 't2 1 2, t3 sang chieu, t4 ban, t5 1 2 ban 3, t7 ko lam ca 2, cn off'.",
          "Bộ phân tích (Regex + NLP Tokenizer) bóc tách ngày: t2..cn, thứ hai..chủ nhật, mon..sun.",
          "Nhận diện ca làm việc: 1 / sang -> Ca 1 (Sáng), 2 / chieu -> Ca 2 (Chiều), 3 / toi -> Ca 3 (Tối).",
          "Xử lý chuẩn xác câu phủ định: 'bận ca 1', 'ko làm ca 2', 'nghỉ sáng' -> tự động đánh dấu bận đúng ca đó.",
          "Đồng bộ hai chiều: Cập nhật trực tiếp lên ma trận ô lưới lịch trên màn hình cho nhân viên chỉnh sửa."]),
        ("CƠ CHẾ BẢO TOÀN LỊCH SỬ CHẤM CÔNG (PRESERVE SHIFTS)",
         "An toàn dữ liệu tuyệt đối khi tối ưu hóa giữa tuần:",
         ["Khi quản lý chạy xếp lịch AI giữa tuần với tùy chọn ghi đè (`overwriteExisting: true`):",
          "Hàm `shouldPreserveShiftOnOverwrite` bảo vệ toàn bộ ca thuộc các ngày đã trôi qua.",
          "Bảo toàn 100% các ca đã có giờ chấm công (`checkInTime` / `checkOutTime`) hoặc trạng thái Present, Absent, OnLeave.",
          "Lệnh xóa chỉ tác động trên các ca tương lai chưa điểm danh (`status: Assigned / Scheduled` và `shiftDate >= hôm nay`).",
          "Bộ đếm giờ của nhân viên được tính toán chuẩn xác, không bị đếm đè hay mất dữ liệu đã làm."])
    ]

    for idx, (title, subtitle, bullets) in enumerate(nlp_cards):
        x = Inches(0.8 + idx * 6.0)
        y = Inches(1.5)
        w = Inches(5.7)
        h = Inches(5.3)

        add_card(s12, x, y, w, h, border_color=ACCENT_MINT if idx == 0 else ACCENT_PEACH)
        tb_nlp = s12.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), w - Inches(0.5), h - Inches(0.4))
        tf_nlp = tb_nlp.text_frame
        tf_nlp.word_wrap = True
        tf_nlp.margin_left = tf_nlp.margin_top = tf_nlp.margin_right = tf_nlp.margin_bottom = 0

        p = tf_nlp.paragraphs[0]
        p.text = title
        p.font.name = 'Calibri'
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = ACCENT_MINT if idx == 0 else ACCENT_PEACH
        p.space_after = Pt(4)

        ps = tf_nlp.add_paragraph()
        ps.text = subtitle
        ps.font.name = 'Calibri'
        ps.font.size = Pt(11)
        ps.font.bold = True
        ps.font.color.rgb = TEXT_WHITE
        ps.space_after = Pt(10)

        for b in bullets:
            pb = tf_nlp.add_paragraph()
            pb.text = f"• {b}"
            pb.font.name = 'Calibri'
            pb.font.size = Pt(10)
            pb.font.color.rgb = TEXT_MUTED
            pb.space_after = Pt(6)

    # ==========================================
    # SLIDE 13: KẾT QUẢ KIỂM THỬ
    # ==========================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13)
    add_header(s13, "Nghiệm thu kỹ thuật", "Kết Quả Kiểm Thử Tự Động & Tiêu Chuẩn Chất Lượng Mã Nguồn")

    kpi_cards = [
        ("30 / 30", "VITEST AUTOMATED TESTS", "100% test suites vượt qua trong 4.9s: Đặt xe, Phân quyền RBAC, Hợp đồng ký số, AI Xếp ca, NLP tiếng Việt."),
        ("0 ERRORS", "TYPESCRIPT TYPECHECK", "Toàn bộ Backend (server) và Frontend (client) biên dịch sạch sẽ, không có bất kỳ lỗi cú pháp nào."),
        ("0 'ANY'", "STRICT TYPESCRIPT", "Tuân thủ tiêu chuẩn lập trình chặt chẽ, loại bỏ hoàn toàn 117 kiểu `any` lỏng lẻo trên cả client và server."),
        ("0 EMOJI", "STRICT VECTOR SVG ONLY", "100% biểu tượng trên toàn hệ thống sử dụng Lucide React và Inline SVG vector chuyên nghiệp, không emoji.")
    ]

    for idx, (stat, label, desc) in enumerate(kpi_cards):
        x = Inches(0.8 + idx * 2.95)
        y = Inches(1.5)
        w = Inches(2.8)
        h = Inches(5.3)

        add_card(s13, x, y, w, h, border_color=ACCENT_PEACH if idx == 0 else CARD_BORDER)
        tb_k = s13.shapes.add_textbox(x + Inches(0.2), y + Inches(0.25), w - Inches(0.4), h - Inches(0.5))
        tf_k = tb_k.text_frame
        tf_k.word_wrap = True
        tf_k.margin_left = tf_k.margin_top = tf_k.margin_right = tf_k.margin_bottom = 0

        p_stat = tf_k.paragraphs[0]
        p_stat.text = stat
        p_stat.font.name = 'Arial'
        p_stat.font.size = Pt(28)
        p_stat.font.bold = True
        p_stat.font.color.rgb = ACCENT_PEACH if idx == 0 else ACCENT_MINT
        p_stat.space_after = Pt(6)

        p_lbl = tf_k.add_paragraph()
        p_lbl.text = label
        p_lbl.font.name = 'Calibri'
        p_lbl.font.size = Pt(11)
        p_lbl.font.bold = True
        p_lbl.font.color.rgb = TEXT_WHITE
        p_lbl.space_after = Pt(12)

        p_d = tf_k.add_paragraph()
        p_d.text = desc
        p_d.font.name = 'Calibri'
        p_d.font.size = Pt(10)
        p_d.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 14: KẾT LUẬN & Q&A
    # ==========================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14)

    tb_end = s14.shapes.add_textbox(Inches(1.5), Inches(2.0), Inches(10.3), Inches(3.5))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True

    p_e0 = tf_end.paragraphs[0]
    p_e0.text = "TỔNG KẾT & PHẦN HỎI ĐÁP"
    p_e0.font.name = 'Calibri'
    p_e0.font.size = Pt(16)
    p_e0.font.bold = True
    p_e0.font.color.rgb = ACCENT_MINT
    p_e0.space_after = Pt(10)

    p_e1 = tf_end.add_paragraph()
    p_e1.text = "CẢM ƠN THẦY CÔ & HỘI ĐỒNG ĐÃ LẮNG NGHE"
    p_e1.font.name = 'Arial'
    p_e1.font.size = Pt(36)
    p_e1.font.bold = True
    p_e1.font.color.rgb = ACCENT_PEACH
    p_e1.space_after = Pt(16)

    p_e2 = tf_end.add_paragraph()
    p_e2.text = "MOTORENT đã sẵn sàng chuyển sang phần DEMO TRỰC TIẾP hệ thống thực tế trên trình duyệt."
    p_e2.font.name = 'Calibri'
    p_e2.font.size = Pt(18)
    p_e2.font.color.rgb = TEXT_WHITE
    p_e2.space_after = Pt(20)

    p_e3 = tf_end.add_paragraph()
    p_e3.text = "Mời Quý Thầy Cô đặt câu hỏi cho Nhóm 4 (Group 4) • SWP391"
    p_e3.font.name = 'Calibri'
    p_e3.font.size = Pt(14)
    p_e3.font.color.rgb = TEXT_MUTED

    prs.save(output_path)
    print(f"Presentation updated with images and saved to {output_path}")

if __name__ == '__main__':
    out = os.path.join(r"d:\Motorent\docs", "MOTORENT_SWP391_Slide_Trinh_Bay.pptx")
    create_deck(out)
