import os
from PIL import Image, ImageDraw, ImageFont

def generate_ai_architecture_diagram(output_path='docs/diagrams/ai_scheduling_architecture.png'):
    width = 2400
    height = 1350
    img = Image.new('RGB', (width, height), color='#0C0C0C')
    draw = ImageDraw.Draw(img)

    # Load fonts
    try:
        font_title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 44)
        font_subtitle = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 24)
        font_box_header = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 24)
        font_subhead = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
        font_body = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 19)
        font_body_bold = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 19)
        font_code = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 19)
        font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 16)
    except Exception:
        font_title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 44)
        font_subtitle = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
        font_box_header = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 24)
        font_subhead = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 20)
        font_body = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
        font_body_bold = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 19)
        font_code = ImageFont.truetype('C:/Windows/Fonts/couri.ttf', 19)
        font_badge = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 16)

    # Color Palette (Dark Mode + Peach & Mint Accents)
    COLOR_BG = '#0C0C0C'
    COLOR_CARD = '#161616'
    COLOR_CARD_BORDER = '#2A2A2A'
    COLOR_PEACH = '#FFC799'
    COLOR_MINT = '#99FFE4'
    COLOR_BLUE = '#70B4FF'
    COLOR_PURPLE = '#D1A3FF'
    COLOR_ROSE = '#FF7D8A'
    COLOR_TEXT_WHITE = '#FFFFFF'
    COLOR_TEXT_MUTED = '#A8A8A8'
    COLOR_GRID_BG = '#101010'

    # Background subtle grid pattern
    for x in range(0, width, 60):
        draw.line([(x, 0), (x, height)], fill='#141414', width=1)
    for y in range(0, height, 60):
        draw.line([(0, y), (width, y)], fill='#141414', width=1)

    # Top Header Banner
    draw.rectangle([80, 50, width - 80, 160], fill='#141414', outline='#FFC799', width=2)
    
    # Badge
    draw.rounded_rectangle([110, 68, 480, 100], radius=6, fill='#261E16', outline='#FFC799', width=1)
    draw.text((125, 74), "MOTORENT CORE INNOVATION • PHÂN HỆ AI", font=font_badge, fill=COLOR_PEACH)

    # Main Title
    draw.text((110, 108), "KIẾN TRÚC & LUỒNG XỬ LÝ HỆ THỐNG AI XẾP LỊCH TRỰC THÔNG MINH", font=font_title, fill=COLOR_TEXT_WHITE)

    # Helper function to draw rounded card with header
    def draw_card(x1, y1, x2, y2, step_num, step_title, accent_color):
        # Card background
        draw.rounded_rectangle([x1, y1, x2, y2], radius=16, fill=COLOR_CARD, outline=accent_color, width=2)
        # Header bar inside card
        draw.rounded_rectangle([x1, y1, x2, y1 + 65], radius=16, fill='#1E1E1E', outline=accent_color, width=1)
        draw.rectangle([x1, y1 + 50, x2, y1 + 65], fill='#1E1E1E') # flatten bottom of header
        draw.line([(x1, y1 + 65), (x2, y1 + 65)], fill=accent_color, width=2)

        # Step badge
        draw.rounded_rectangle([x1 + 18, y1 + 14, x1 + 120, y1 + 48], radius=6, fill='#2B2B2B', outline=accent_color, width=1)
        draw.text((x1 + 28, y1 + 20), f"BƯỚC {step_num}", font=font_badge, fill=accent_color)
        draw.text((x1 + 135, y1 + 18), step_title, font=font_box_header, fill=COLOR_TEXT_WHITE)

    # Helper to draw connecting arrow
    def draw_arrow(x1, y1, x2, y2, label=""):
        draw.line([(x1, y1), (x2, y2)], fill=COLOR_PEACH, width=4)
        # Arrowhead pointing to (x2, y2)
        if x2 > x1: # pointing right
            draw.polygon([(x2, y2), (x2 - 16, y2 - 10), (x2 - 16, y2 + 10)], fill=COLOR_PEACH)
        elif y2 > y1: # pointing down
            draw.polygon([(x2, y2), (x2 - 10, y2 - 16), (x2 + 10, y2 - 16)], fill=COLOR_PEACH)
        if label:
            draw.rounded_rectangle([((x1+x2)//2)-60, ((y1+y2)//2)-16, ((x1+x2)//2)+60, ((y1+y2)//2)+16], radius=4, fill='#181818', outline='#333333')
            draw.text((((x1+x2)//2)-50, ((y1+y2)//2)-10), label, font=font_badge, fill=COLOR_MINT)

    # ==========================================
    # COLUMN 1: INPUT & NLP PARSER (x: 80 -> 780)
    # ==========================================
    # Box 1: Input Sources
    draw_card(80, 190, 780, 680, 1, "DỮ LIỆU ĐẦU VÀO & NLP CHAT TIẾNG VIỆT", COLOR_MINT)
    
    # Content of Box 1
    cy = 275
    draw.text((105, cy), "1.1. Nhân viên gửi tin nhắn tự do (Web / Zalo style):", font=font_subhead, fill=COLOR_MINT)
    cy += 32
    # Code box for staff prompt
    draw.rounded_rectangle([105, cy, 755, cy + 80], radius=8, fill='#080808', outline='#333333', width=1)
    draw.text((120, cy + 12), '"t2 1 2, t3 sang chieu, t4 ban, t5 1 2 ban 3,', font=font_code, fill=COLOR_PEACH)
    draw.text((120, cy + 42), ' t7 ko lam ca 2, cn ca 1 ca 3"', font=font_code, fill=COLOR_PEACH)
    cy += 100

    draw.text((105, cy), "1.2. Bộ phân tích NLP tiếng Việt (Regex & Tokenizer):", font=font_subhead, fill=COLOR_TEXT_WHITE)
    cy += 32
    bullet_nlp = [
        ("• Chuẩn hóa thứ:", "t2, thu 2, mon -> Thứ 2 ... cn, chu nhat -> Chủ Nhật"),
        ("• Chuẩn hóa ca:", "1/sang -> Ca 1 (Sáng), 2/chieu -> Ca 2, 3/toi -> Ca 3"),
        ("• Xử lý phủ định:", '"bận ca 1", "ko làm 2", "nghỉ tối" -> Đánh dấu BẬN'),
        ("• Đồng bộ 2 chiều:", "Tự động phản ánh lên ma trận ô lưới đăng ký trên UI")
    ]
    for b_title, b_desc in bullet_nlp:
        draw.text((120, cy), b_title, font=font_body_bold, fill=COLOR_PEACH)
        draw.text((275, cy), b_desc, font=font_body, fill=COLOR_TEXT_MUTED)
        cy += 28

    cy += 15
    draw.text((105, cy), "1.3. Nhu cầu vận hành trạm từ hệ thống Booking:", font=font_subhead, fill=COLOR_TEXT_WHITE)
    cy += 30
    draw.text((120, cy), "• Số lượng đơn nhận xe (Pickup), trả xe (Return) theo từng khung giờ.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((120, cy), "• Lệnh giao xe tận nơi (Door-to-Door Delivery) làm hao hụt nhân sự tại trạm.", font=font_body, fill=COLOR_TEXT_MUTED)

    # Box 2: Slot Demand Scoring (Bottom of Col 1)
    draw_card(80, 720, 780, 1280, 2, "CÔNG THỨC TÍNH TẢI NHU CẦU CA TRỰC", COLOR_PEACH)
    
    cy = 805
    draw.text((105, cy), "2.1. Công thức DemandScore tải trọng từng ca:", font=font_subhead, fill=COLOR_PEACH)
    cy += 35
    # Formula box
    draw.rounded_rectangle([105, cy, 755, cy + 95], radius=8, fill='#201912', outline=COLOR_PEACH, width=1)
    draw.text((125, cy + 16), "DemandScore = (Pickups * 1.0) + (Returns * 1.0)", font=font_code, fill=COLOR_PEACH)
    draw.text((245, cy + 50), "+ (DoorDelivery * 0.8) + (WeekendBoost +1.5)", font=font_code, fill=COLOR_PEACH)
    cy += 120

    draw.text((105, cy), "2.2. Quy đổi định mức nhân sự tối ưu cho ca:", font=font_subhead, fill=COLOR_TEXT_WHITE)
    cy += 35
    slots = [
        ("DemandScore <= 3:", "Cần tối thiểu 1 nhân viên (Đảm bảo mở trạm & trực quầy)"),
        ("3 < Demand <= 8:", "Cần 2 nhân viên (1 tiếp khách quầy + 1 giao/nhận xe bãi)"),
        ("DemandScore > 8:", "Cần 3 nhân viên (Giờ cao điểm cuối tuần / Lễ tết đông đúc)")
    ]
    for s_con, s_desc in slots:
        draw.rounded_rectangle([105, cy, 300, cy + 34], radius=6, fill='#1A1A1A', outline='#444444')
        draw.text((120, cy + 6), s_con, font=font_code, fill=COLOR_MINT)
        draw.text((315, cy + 6), s_desc, font=font_body, fill=COLOR_TEXT_MUTED)
        cy += 44

    cy += 15
    draw.text((105, cy), "2.3. Khóa an toàn không bỏ trống ca (Zero Empty Shift):", font=font_subhead, fill=COLOR_ROSE)
    cy += 30
    draw.text((120, cy), "Mọi ca hoạt động bắt buộc có ít nhất 1 nhân viên; nếu toàn bộ nhân viên", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((120, cy), "bận, hệ thống kích hoạt cảnh báo cưỡng bức (Forced Allocation Flag).", font=font_body, fill=COLOR_TEXT_MUTED)

    # Arrow from Col 1 to Col 2
    draw_arrow(780, 435, 870, 435, "Lịch rảnh")
    draw_arrow(780, 990, 870, 990, "Định mức ca")

    # ==========================================
    # COLUMN 2: DUAL-AI ENGINE (x: 870 -> 1570)
    # ==========================================
    draw_card(870, 190, 1570, 1280, 3, "ĐỘNG CƠ KÉP DUAL-AI ENGINE (HYBRID SOLVER)", COLOR_PEACH)

    cy = 280
    # Engine A: Heuristic Rule-v2
    draw.rounded_rectangle([895, cy, 1545, cy + 460], radius=12, fill='#1C1814', outline=COLOR_PEACH, width=2)
    draw.rounded_rectangle([915, cy + 15, 1260, cy + 50], radius=6, fill='#2B2016', outline=COLOR_PEACH, width=1)
    draw.text((925, cy + 22), "ENGINE A: HEURISTIC SOLVER (RULE-v2)", font=font_subhead, fill=COLOR_PEACH)
    
    hy = cy + 65
    draw.text((920, hy), "• Ràng buộc cứng (Hard Constraints - 100% Tuân thủ):", font=font_body_bold, fill=COLOR_TEXT_WHITE)
    hy += 28
    draw.text((945, hy), "- Không làm việc quá 48 giờ/tuần (Bảo vệ sức khỏe theo Luật LĐ).", font=font_body, fill=COLOR_TEXT_MUTED)
    hy += 26
    draw.text((945, hy), "- Tối thiểu 1 ngày nghỉ trọn vẹn trong tuần (Min 1 Rest Day).", font=font_body, fill=COLOR_TEXT_MUTED)
    hy += 26
    draw.text((945, hy), "- Tuyệt đối không trùng ca cùng khung giờ (Zero Double-Booking).", font=font_body, fill=COLOR_TEXT_MUTED)
    hy += 35

    draw.text((920, hy), "• Trọng số tối ưu mềm (Soft Optimization Scoring):", font=font_body_bold, fill=COLOR_MINT)
    hy += 28
    heuristics = [
        ("Thưởng Ca Liền Kề (+30 điểm)", "Ưu tiên xếp Ca 1-2 (Sáng-Chiều) hoặc Ca 2-3 (Chiều-Tối) để nhân viên làm 1 mạch về nghỉ."),
        ("Phạt Nặng Ca Gãy (-85 điểm)", "Tránh xếp Ca 1 & Ca 3 (làm sáng, tối lên làm tiếp, nghỉ chiều). Chỉ dùng khi không còn ai."),
        ("Chống Clopening (-35 điểm)", "CẤM xếp Ca 3 tối hôm trước (22:00) rồi lại Ca 1 sáng hôm sau (07:00). Đảm bảo ngủ đủ 9 tiếng."),
        ("Cân Bằng Số Giờ Phân Bổ", "Thuật toán tham lam (Greedy) luôn ưu tiên nhân sự có tổng giờ tích lũy thấp nhất trong tuần.")
    ]
    for h_name, h_desc in heuristics:
        draw.rounded_rectangle([920, hy, 1210, hy + 26], radius=4, fill='#2A231C')
        draw.text((930, hy + 3), h_name, font=font_badge, fill=COLOR_PEACH)
        draw.text((920, hy + 30), h_desc, font=font_body, fill=COLOR_TEXT_MUTED)
        hy += 64

    # Engine B: Google Gemini LLM API
    cy = 765
    draw.rounded_rectangle([895, cy, 1545, cy + 475], radius=12, fill='#141B1C', outline=COLOR_MINT, width=2)
    draw.rounded_rectangle([915, cy + 15, 1260, cy + 50], radius=6, fill='#152B28', outline=COLOR_MINT, width=1)
    draw.text((925, cy + 22), "ENGINE B: GOOGLE GEMINI GENERATIVE AI", font=font_subhead, fill=COLOR_MINT)

    gy = cy + 65
    draw.text((920, gy), "• Chuỗi Fallback Mô Hình (High Availability Multi-Tier):", font=font_body_bold, fill=COLOR_TEXT_WHITE)
    gy += 30
    # Model pills
    draw.rounded_rectangle([930, gy, 1100, gy + 32], radius=6, fill='#1F2F2B', outline=COLOR_MINT)
    draw.text((945, gy + 6), "1. Gemini 2.5 Flash", font=font_badge, fill=COLOR_MINT)
    draw.text((1115, gy + 6), "-->", font=font_body_bold, fill=COLOR_PEACH)
    draw.rounded_rectangle([1155, gy, 1325, gy + 32], radius=6, fill='#1F2F2B', outline=COLOR_MINT)
    draw.text((1170, gy + 6), "2. Gemini 2.0 Flash", font=font_badge, fill=COLOR_MINT)
    draw.text((1340, gy + 6), "-->", font=font_body_bold, fill=COLOR_PEACH)
    draw.rounded_rectangle([1380, gy, 1530, gy + 32], radius=6, fill='#1F2F2B', outline=COLOR_MINT)
    draw.text((1395, gy + 6), "3. Gemini 1.5 Flash", font=font_badge, fill=COLOR_MINT)
    gy += 50

    draw.text((920, gy), "• Kỹ Thuật Structured Prompt Engineering:", font=font_body_bold, fill=COLOR_PEACH)
    gy += 28
    draw.text((945, gy), "- System Prompt: Chuyên gia trưởng phòng vận hành chuỗi xe máy.", font=font_body, fill=COLOR_TEXT_MUTED)
    gy += 26
    draw.text((945, gy), "- Input Context: Danh sách nhân viên, đăng ký rảnh/bận, lịch đã có.", font=font_body, fill=COLOR_TEXT_MUTED)
    gy += 26
    draw.text((945, gy), "- Strict JSON Schema: Trả về mảng ca kèm `confidenceScore` & `reason`.", font=font_body, fill=COLOR_TEXT_MUTED)
    gy += 35

    draw.text((920, gy), "• Mẫu Phản Hồi JSON Chuẩn Hóa:", font=font_body_bold, fill=COLOR_TEXT_WHITE)
    gy += 28
    draw.rounded_rectangle([920, gy, 1520, gy + 110], radius=8, fill='#080808', outline='#333333')
    draw.text((935, gy + 10), '{\n  "schedule": [{ "date": "2026-11-20", "shift": 1, "staffId": "...",\n                 "confidenceScore": 95, "isReluctant13": false }],\n  "reason": "Xếp Ca 1-2 liên tiếp để nhân viên nghỉ chiều tối thuận tiện."\n}', font=font_code, fill=COLOR_MINT)

    # Arrow from Col 2 to Col 3
    draw_arrow(1570, 735, 1660, 735, "Bản phân ca")

    # ==========================================
    # COLUMN 3: PREVIEW & PRESERVATION (x: 1660 -> 2320)
    # ==========================================
    # Box 4: Interactive Preview Grid
    draw_card(1660, 190, 2320, 720, 4, "BẢN XEM TRƯỚC TƯƠNG TÁC (PREVIEW GRID)", COLOR_BLUE)

    cy = 280
    draw.text((1685, cy), "4.1. Giao diện trực quan cho Quản lý chi nhánh:", font=font_subhead, fill=COLOR_BLUE)
    cy += 32
    draw.text((1705, cy), "• Hiển thị ma trận 7 ngày x 3 ca với mã màu trạng thái trực quan.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• Cờ màu xanh: Độ tin cậy cao (Ca liền kề, đúng nguyện vọng nhân viên).", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• Cờ màu cam: Ca gãy miễn cưỡng (Reluctant 1-3) do trạm quá thiếu người.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 38

    draw.text((1685, cy), "4.2. Can thiệp & Điều chỉnh thủ công (Human-in-the-loop):", font=font_subhead, fill=COLOR_TEXT_WHITE)
    cy += 32
    draw.text((1705, cy), "• Quản lý trạm có quyền đổi nhân sự trực tiếp trên ô lưới bằng 1 click.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "• Tự động tính toán lại tổng giờ làm việc của từng người ngay lập tức.", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 38

    draw.text((1685, cy), "4.3. Tiết kiệm chi phí & Không gọi AI lần 2 (Single Call):", font=font_subhead, fill=COLOR_PEACH)
    cy += 32
    draw.rounded_rectangle([1685, cy, 2295, cy + 85], radius=8, fill='#201B15', outline=COLOR_PEACH)
    draw.text((1705, cy + 14), "Khi quản lý bấm nút 'Áp Dụng Lịch', dữ liệu bản preview", font=font_body_bold, fill=COLOR_PEACH)
    draw.text((1705, cy + 44), "được ghi thẳng vào DB. KHÔNG gọi lại API AI (Tiết kiệm 100% token).", font=font_body, fill=COLOR_TEXT_WHITE)

    # Box 5: Historical Attendance Preservation (Bottom of Col 3)
    draw_card(1660, 760, 2320, 1280, 5, "BẢO TOÀN LỊCH SỬ ĐIỂM DANH (IMMUTABILITY)", COLOR_ROSE)

    cy = 845
    draw.text((1685, cy), "5.1. Vấn đề thực tế khi chạy lại AI giữa tuần:", font=font_subhead, fill=COLOR_ROSE)
    cy += 32
    draw.text((1705, cy), "Nếu nhân viên xin nghỉ gấp thứ 5, chạy lại AI cho cả tuần có thể xóa", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "mất dữ liệu chấm công thực tế của Thứ 2, Thứ 3, Thứ 4 đã diễn ra!", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 40

    draw.text((1685, cy), "5.2. Giải pháp cơ chế Khóa Bất Biến (Lock Immutable Shifts):", font=font_subhead, fill=COLOR_MINT)
    cy += 32
    # Rules list
    rules = [
        ("Ca trong quá khứ (< ngày hiện tại):", "KHÓA BẢO VỆ 100%, AI tuyệt đối không can thiệp"),
        ("Ca đã Check-in / Check-out:", "KHÓA BẢO VỆ 100%, bảo lưu lịch sử chấm công"),
        ("Chỉ xếp các ca tương lai chưa điểm danh:", "AI lấp đầy vào các slot còn trống tiếp theo")
    ]
    for r_title, r_desc in rules:
        draw.rounded_rectangle([1685, cy, 2295, cy + 34], radius=6, fill='#1B1E1C', outline='#354841')
        draw.text((1700, cy + 7), r_title, font=font_badge, fill=COLOR_MINT)
        draw.text((1990, cy + 7), r_desc, font=font_body, fill=COLOR_TEXT_MUTED)
        cy += 46

    cy += 15
    draw.text((1685, cy), "5.3. Cam kết toàn vẹn dữ liệu kế toán & tiền lương:", font=font_subhead, fill=COLOR_TEXT_WHITE)
    cy += 30
    draw.text((1705, cy), "Đảm bảo bảng lương và dữ liệu đối soát HR cuối tháng không bao giờ", font=font_body, fill=COLOR_TEXT_MUTED)
    cy += 26
    draw.text((1705, cy), "bị ghi đè hoặc sai lệch khi điều phối ca trực linh hoạt.", font=font_body, fill=COLOR_TEXT_MUTED)

    # Footer signature
    draw.line([(80, 1315), (width - 80, 1315)], fill='#252525', width=1)
    draw.text((80, 1322), "HỆ THỐNG QUẢN LÝ THUÊ XE MÁY ĐA TRẠM MOTORENT • DỰ ÁN SWP391 • FPT UNIVERSITY", font=font_badge, fill='#666666')
    draw.text((width - 430, 1322), "KIẾN TRÚC AI SCHEDULER CHUẨN HÓA 2026", font=font_badge, fill=COLOR_PEACH)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=95)
    print(f"Generated AI Architecture Diagram at {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_ai_architecture_diagram()
