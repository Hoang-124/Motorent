# -*- coding: utf-8 -*-
"""
Update Member Contribution Tables in d:\\Motorent\\docs with a clean, concise format:
- NO UC-xx codes, NO long filenames in the contribution descriptions.
- Concise, clear summary of each member's contribution across:
  1. Dự án (Code / Chức năng)
  2. Git
  3. Tài liệu (Cả làm SRS, Hoàng làm toàn bộ các phần tài liệu còn lại: RDS, SDS, Final Release, Project Tracking, Issues Report)
"""
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

DOCS_DIR = r"d:\Motorent\docs"
RDS_PATH = os.path.join(DOCS_DIR, "MOTORENT_RDS_Final.docx")
SDS_PATH = os.path.join(DOCS_DIR, "MOTORENT_SDS_Final.docx")
REL_PATH = os.path.join(DOCS_DIR, "MOTORENT_Final_Release_Document.docx")
TRK_PATH = os.path.join(DOCS_DIR, "MOTORENT_Project_Tracking.xlsx")
CONTRIB_DOCX_PATH = os.path.join(DOCS_DIR, "MOTORENT_Bang_Dong_Gop_Thanh_Vien.docx")
README_PATH = os.path.join(DOCS_DIR, "README.md")


def set_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        '<w:top w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>'
        '<w:left w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>'
        '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>'
        '<w:right w:val="single" w:space="0" w:sz="6" w:color="BFBFBF"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '</w:tblBorders>'
    )
    tblPr.append(borders)


def format_cell(cell, text, bold=False, size=10, color=(0, 0, 0), align=WD_ALIGN_PARAGRAPH.LEFT, bg=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(str(text))
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor(*color)
    if bg:
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{bg}"/>')
        cell._tc.get_or_add_tcPr().append(shading)


def make_docx_table(doc, headers, rows, col_widths=None, hdr_bg="1F4E78"):
    tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl)
    for c_i, h in enumerate(headers):
        format_cell(tbl.rows[0].cells[c_i], h, bold=True, size=10, color=(255, 255, 255), align=WD_ALIGN_PARAGRAPH.CENTER, bg=hdr_bg)
        if col_widths and c_i < len(col_widths):
            tbl.rows[0].cells[c_i].width = Inches(col_widths[c_i])
    for r_i, r_data in enumerate(rows, start=1):
        bg = "FFF2CC" if r_i == 1 else ("F9FAFB" if r_i % 2 == 0 else None)
        for c_i, val in enumerate(r_data):
            align = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 2, 6) else WD_ALIGN_PARAGRAPH.LEFT
            is_bold = (r_i == 1 and c_i in (1, 5, 6)) or (c_i == 0)
            format_cell(tbl.rows[r_i].cells[c_i], val, bold=is_bold, size=9.5, align=align, bg=bg)
            if col_widths and c_i < len(col_widths):
                tbl.rows[r_i].cells[c_i].width = Inches(col_widths[c_i])
    return tbl


# ==============================================================================
# CONCISE DATA: MEMBER CONTRIBUTIONS (NO UC-xx, NO FILENAMES)
# ==============================================================================
MEMBER_SUMMARY_ROWS = [
    [
        "1",
        "Trương Quốc Bảo Hoàng\n(Leader)",
        "Team Leader /\nFull-Stack",
        "71 commits\n(Quản lý nhánh main,\nreview & merge code)",
        "• Thiết kế kiến trúc hệ thống, phân quyền RBAC & nhật ký bảo mật.\n"
        "• Đăng ký/Đăng nhập, Google OAuth2, xác thực eKYC.\n"
        "• Luồng đặt xe, giỏ xe, thanh toán VNPay & VietQR.\n"
        "• Hợp đồng điện tử 2 bên (chữ ký người thuê & bên cho thuê).\n"
        "• Giao nhận xe tận nơi ngoài cửa hàng.\n"
        "• AI tối ưu hóa xếp lịch phân ca nhân viên.\n"
        "• Live Chat, Thống kê báo cáo Admin, kiểm thử & fix lỗi toàn dự án.",
        "Làm toàn bộ các phần tài liệu còn lại:\n"
        "• Thiết kế hệ thống & giao diện (RDS, SDS)\n"
        "• Tài liệu bàn giao & Hướng dẫn sử dụng (Final Release)\n"
        "• Bảng theo dõi tiến độ & Issues (Project Tracking, Issues Report)",
        "35%"
    ],
    [
        "2",
        "Phạm Quốc Cả",
        "Business Analyst /\nBackend",
        "7 commits",
        "• Phân tích yêu cầu nghiệp vụ hệ thống.\n"
        "• Quản lý chi nhánh & tìm kiếm trạm theo bản đồ GPS.\n"
        "• Quản lý nhân sự trạm, ca trực cơ bản & danh mục khuyến mãi.",
        "Phụ trách làm phần Đặc tả yêu cầu phần mềm (SRS).",
        "20%"
    ],
    [
        "3",
        "Nguyễn Thái Dương",
        "Full-Stack\nDeveloper",
        "29 commits",
        "• Chức năng đặt xe, gia hạn thuê, hủy đơn & hoàn cọc.\n"
        "• Nghiệp vụ quầy giao/nhận xe (Check-in, Check-out trả xe liên trạm, tính phí phạt) & xuất hóa đơn PDF.",
        "Phối hợp cung cấp nghiệp vụ (Hoàng biên soạn tài liệu).",
        "18%"
    ],
    [
        "4",
        "Nguyễn Văn Tài /\nĐặng Vũ",
        "Full-Stack\nDeveloper",
        "14 commits",
        "• Danh mục đội xe, bộ lọc tìm kiếm & chi tiết xe.\n"
        "• Quản lý xe, cấu hình giá thuê, cảnh báo bảo dưỡng theo ODO & điều chuyển xe giữa các trạm.",
        "Phối hợp cung cấp nghiệp vụ (Hoàng biên soạn tài liệu).",
        "15%"
    ],
    [
        "5",
        "Phạm Văn Tuyên",
        "Frontend\nDeveloper",
        "4 commits",
        "• Danh sách xe yêu thích, đánh giá sao & gửi khiếu nại.\n"
        "• Thông báo nhắc lịch, tích điểm đổi thưởng & quản lý banner/trang tĩnh.",
        "Phối hợp cung cấp nghiệp vụ (Hoàng biên soạn tài liệu).",
        "12%"
    ],
]

DOC_ATTRIBUTION_ROWS = [
    ["1", "Đặc tả yêu cầu phần mềm (SRS)", "Phạm Quốc Cả", "Hoàn thành 100%"],
    ["2", "Đặc tả yêu cầu & Thiết kế giao diện (RDS)", "Trương Quốc Bảo Hoàng (tổng hợp & làm toàn bộ phần thiết kế UI, CSDL)\nPhạm Quốc Cả (phần SRS)", "Hoàn thành 100%"],
    ["3", "Đặc tả thiết kế kỹ thuật (SDS)", "Trương Quốc Bảo Hoàng", "Hoàn thành 100%"],
    ["4", "Tài liệu bàn giao & Hướng dẫn sử dụng (Final Release)", "Trương Quốc Bảo Hoàng", "Hoàn thành 100%"],
    ["5", "Bảng theo dõi tiến độ dự án (Project Tracking)", "Trương Quốc Bảo Hoàng", "Hoàn thành 100%"],
    ["6", "Báo cáo quản lý công việc & lỗi (Issues Report)", "Trương Quốc Bảo Hoàng", "Hoàn thành 100%"],
]


# ==============================================================================
# 1. UPDATE MOTORENT_Project_Tracking.xlsx
# ==============================================================================
def update_project_tracking_excel():
    wb = openpyxl.load_workbook(TRK_PATH)
    thin = Side(border_style="thin", color="BFBFBF")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    subhdr_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    lead_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")

    font_title = Font(name="Arial", size=13, bold=True, color="1F4E78")
    font_hdr_white = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    font_hdr_dark = Font(name="Arial", size=10, bold=True, color="000000")
    font_cell = Font(name="Arial", size=10, bold=False, color="000000")
    font_bold = Font(name="Arial", size=10, bold=True, color="000000")

    ws_proj = wb["Project"]
    eff_row = None
    for r in range(1, ws_proj.max_row + 1):
        val_str = str(ws_proj.cell(r, 1).value or "").strip()
        if val_str.startswith("Effort Distribution"):
            eff_row = r
            break
    if eff_row is None:
        eff_row = ws_proj.max_row + 2
    else:
        ws_proj.delete_rows(eff_row, ws_proj.max_row - eff_row + 1)

    r_cur = eff_row
    ws_proj.cell(r_cur, 1, "Effort Distribution & Member Contributions").font = font_title
    r_cur += 2

    eff_headers = [
        "STT",
        "Thành viên",
        "Vai trò",
        "Tỷ lệ đóng góp",
        "Đóng góp Git",
        "Đóng góp trong Dự án (Code)",
        "Đóng góp Tài liệu (Docx / Excel)"
    ]
    for c, h in enumerate(eff_headers, start=1):
        cell = ws_proj.cell(r_cur, c, h)
        cell.font = font_hdr_dark
        cell.fill = subhdr_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws_proj.row_dimensions[r_cur].height = 26
    r_cur += 1

    eff_rows_excel = [
        (
            1,
            "Trương Quốc Bảo Hoàng (Leader)",
            "Team Leader / Full-Stack",
            0.35,
            "71 commits (Quản lý Git, merge & fix lỗi)",
            "Kiến trúc hệ thống, Auth/OAuth2/eKYC, Đặt xe & VNPay, Hợp đồng điện tử 2 bên, Giao nhận xe tận nơi, AI tối ưu xếp lịch nhân viên, Live Chat, Admin & Kiểm thử toàn dự án",
            "Làm toàn bộ các phần tài liệu còn lại (RDS, SDS, Final Release, Project Tracking, Issues Report)"
        ),
        (
            2,
            "Phạm Quốc Cả",
            "Business Analyst / Backend",
            0.20,
            "7 commits",
            "Quản lý chi nhánh, bản đồ GPS, quản lý nhân sự trạm, ca trực cơ bản & danh mục khuyến mãi",
            "Làm phần Đặc tả yêu cầu phần mềm (SRS)"
        ),
        (
            3,
            "Nguyễn Thái Dương",
            "Full-Stack Developer",
            0.18,
            "29 commits",
            "Đặt xe, gia hạn, hủy đơn hoàn cọc, nghiệp vụ quầy Check-in/Check-out trả xe liên trạm & xuất hóa đơn PDF",
            "Phối hợp cung cấp nghiệp vụ (Hoàng biên soạn tài liệu)"
        ),
        (
            4,
            "Nguyễn Văn Tài / Đặng Vũ",
            "Full-Stack Developer",
            0.15,
            "14 commits",
            "Danh mục & bộ lọc đội xe, quản lý xe, cấu hình giá thuê, bảo dưỡng ODO & điều chuyển xe",
            "Phối hợp cung cấp nghiệp vụ (Hoàng biên soạn tài liệu)"
        ),
        (
            5,
            "Phạm Văn Tuyên",
            "Frontend Developer",
            0.12,
            "4 commits",
            "Xe yêu thích, đánh giá sao, khiếu nại, thông báo nhắc lịch, tích điểm thưởng & banner/trang tĩnh",
            "Phối hợp cung cấp nghiệp vụ (Hoàng biên soạn tài liệu)"
        ),
    ]

    for row_tuple in eff_rows_excel:
        is_lead = row_tuple[0] == 1
        for c, val in enumerate(row_tuple, start=1):
            cell = ws_proj.cell(r_cur, c, val)
            cell.font = font_bold if is_lead else font_cell
            cell.border = border
            if is_lead:
                cell.fill = lead_fill
            if c == 4:
                cell.number_format = "0%"
            cell.alignment = Alignment(horizontal="center" if c in (1, 4) else "left", vertical="center", wrap_text=True)
        ws_proj.row_dimensions[r_cur].height = 42 if is_lead else 32
        r_cur += 1

    # Sheet Member_Contributions
    if "Member_Contributions" in wb.sheetnames:
        del wb["Member_Contributions"]
    ws_mc = wb.create_sheet("Member_Contributions")

    ws_mc.cell(1, 1, "BẢNG ĐÓNG GÓP TỪNG THÀNH VIÊN (DỰ ÁN, GIT & TÀI LIỆU)").font = font_title
    ws_mc.cell(2, 1, "Phân công tài liệu: Phạm Quốc Cả làm SRS; Trương Quốc Bảo Hoàng (Leader) làm toàn bộ các phần tài liệu còn lại & tích hợp chính.").font = Font(name="Arial", size=10, italic=True, color="C00000")

    mc_headers = [
        "STT",
        "Thành viên",
        "Vai trò",
        "Đóng góp Git",
        "Đóng góp trong Dự án (Code & Chức năng)",
        "Đóng góp Tài liệu",
        "Tỷ lệ"
    ]
    for c, h in enumerate(mc_headers, start=1):
        cell = ws_mc.cell(4, c, h)
        cell.font = font_hdr_white
        cell.fill = header_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws_mc.row_dimensions[4].height = 28

    for idx, r_data in enumerate(MEMBER_SUMMARY_ROWS, start=5):
        is_lead = idx == 5
        for c, val in enumerate(r_data, start=1):
            cell = ws_mc.cell(idx, c, val)
            cell.font = font_bold if (is_lead and c in (1, 2, 6, 7)) else font_cell
            cell.border = border
            if is_lead:
                cell.fill = lead_fill
            cell.alignment = Alignment(horizontal="center" if c in (1, 3, 4, 7) else "left", vertical="center", wrap_text=True)
        ws_mc.row_dimensions[idx].height = 95 if is_lead else 48

    r2 = 12
    ws_mc.cell(r2, 1, "PHÂN CÔNG BỘ TÀI LIỆU DỰ ÁN").font = font_title
    r2 += 1
    doc_headers = ["STT", "Hạng mục Tài liệu", "Người Thực hiện", "Trạng thái"]
    for c, h in enumerate(doc_headers, start=1):
        cell = ws_mc.cell(r2, c, h)
        cell.font = font_hdr_white
        cell.fill = header_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws_mc.row_dimensions[r2].height = 26

    for d_idx, d_row in enumerate(DOC_ATTRIBUTION_ROWS, start=r2 + 1):
        for c, val in enumerate(d_row, start=1):
            cell = ws_mc.cell(d_idx, c, val)
            cell.font = font_bold if c in (1, 3) else font_cell
            cell.border = border
            if "Bảo Hoàng" in str(d_row[2]):
                cell.fill = lead_fill
            cell.alignment = Alignment(horizontal="center" if c in (1, 4) else "left", vertical="center", wrap_text=True)
        ws_mc.row_dimensions[d_idx].height = 30

    mc_widths = [8, 28, 20, 24, 52, 46, 14]
    for c, w in enumerate(mc_widths, start=1):
        ws_mc.column_dimensions[get_column_letter(c)].width = w

    wb.save(TRK_PATH)
    print("Updated concise Project Tracking:", TRK_PATH)


# ==============================================================================
# 2. UPDATE DOCX FILES (STANDALONE & FINAL RELEASE)
# ==============================================================================
def update_docx_contributions():
    headers_1 = [
        "STT",
        "Thành viên",
        "Vai trò",
        "Đóng góp Git",
        "Đóng góp trong Dự án (Code & Chức năng)",
        "Đóng góp Tài liệu",
        "Tỷ lệ"
    ]
    headers_2 = [
        "STT",
        "Hạng mục Tài liệu",
        "Người Thực hiện",
        "Trạng thái"
    ]

    # A. Standalone MOTORENT_Bang_Dong_Gop_Thanh_Vien.docx
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = p_title.add_run("BẢNG ĐÓNG GÓP TỪNG THÀNH VIÊN — DỰ ÁN MOTORENT")
    r_t.bold = True
    r_t.font.name = "Arial"
    r_t.font.size = Pt(15)
    r_t.font.color.rgb = RGBColor(31, 78, 120)

    doc.add_heading("1. Bảng Đóng góp Tổng hợp (Dự án, Git & Tài liệu)", level=1)
    make_docx_table(doc, headers_1, MEMBER_SUMMARY_ROWS, col_widths=[0.45, 1.25, 0.9, 1.0, 2.1, 1.65, 0.55])

    doc.add_paragraph()
    doc.add_heading("2. Phân công Thực hiện Bộ Tài liệu", level=1)
    make_docx_table(doc, headers_2, DOC_ATTRIBUTION_ROWS, col_widths=[0.5, 2.8, 2.5, 1.2])

    doc.save(CONTRIB_DOCX_PATH)
    print("Updated concise standalone docx:", CONTRIB_DOCX_PATH)

    # B. Update Section IV in MOTORENT_Final_Release_Document.docx
    if os.path.exists(REL_PATH):
        rel_doc = docx.Document(REL_PATH)
        body = rel_doc.element.body
        sec4_idx = None
        for idx, el in enumerate(body):
            if el.tag.endswith("p"):
                txt = "".join(el.itertext()).strip()
                if txt.startswith("IV. Team Member Contributions"):
                    sec4_idx = idx
                    break
        if sec4_idx is not None:
            # Remove previous page break right before sec4_idx if present, and remove from sec4_idx onwards
            for el in list(body)[sec4_idx:]:
                if not el.tag.endswith("sectPr"):
                    body.remove(el)
        else:
            rel_doc.add_page_break()

        rel_doc.add_heading("IV. Team Member Contributions", level=1)
        make_docx_table(rel_doc, headers_1, MEMBER_SUMMARY_ROWS, col_widths=[0.45, 1.2, 0.85, 0.95, 2.05, 1.6, 0.55])
        rel_doc.add_paragraph()
        make_docx_table(rel_doc, headers_2, DOC_ATTRIBUTION_ROWS, col_widths=[0.5, 2.7, 2.4, 1.1])
        rel_doc.save(REL_PATH)
        print("Updated concise Section IV in:", REL_PATH)


# ==============================================================================
# 3. UPDATE d:\Motorent\docs\README.md (CONCISE, CLEAN)
# ==============================================================================
def update_docs_readme():
    readme_content = """# Bảng Đóng Góp Từng Thành Viên — Dự Án MOTORENT (Group 4)

## 1. Bảng Đóng Góp Tổng Hợp (Dự Án, Git & Tài Liệu)

| STT | Thành viên | Vai trò | Đóng góp Git | Đóng góp trong Dự án (Code & Chức năng) | Đóng góp Tài liệu | Tỷ lệ |
| :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| **1** | **Trương Quốc Bảo Hoàng**<br>*(Leader)* | **Team Leader / Full-Stack** | **71 commits**<br>*(Quản lý nhánh `main`, review & merge code)* | • Thiết kế kiến trúc hệ thống, phân quyền RBAC & nhật ký bảo mật.<br>• Đăng ký/Đăng nhập, Google OAuth2, xác thực eKYC.<br>• Luồng đặt xe, giỏ xe, thanh toán VNPay & VietQR.<br>• Hợp đồng điện tử 2 bên (chữ ký người thuê & bên cho thuê).<br>• Giao nhận xe tận nơi ngoài cửa hàng.<br>• AI tối ưu hóa xếp lịch phân ca nhân viên.<br>• Live Chat, thống kê báo cáo Admin, kiểm thử & fix lỗi toàn dự án. | **Làm toàn bộ các phần tài liệu còn lại:**<br>• Thiết kế hệ thống & giao diện (RDS, SDS)<br>• Tài liệu bàn giao & Hướng dẫn sử dụng (Final Release)<br>• Bảng theo dõi tiến độ & Issues (Project Tracking, Issues Report) | **35%** |
| **2** | **Phạm Quốc Cả** | **Business Analyst / Backend** | **7 commits** | • Phân tích yêu cầu nghiệp vụ hệ thống.<br>• Quản lý chi nhánh & tìm kiếm trạm theo bản đồ GPS.<br>• Quản lý nhân sự trạm, ca trực cơ bản & danh mục khuyến mãi. | **Phụ trách làm phần Đặc tả yêu cầu phần mềm (SRS).** | **20%** |
| **3** | **Nguyễn Thái Dương** | **Full-Stack Developer** | **29 commits** | • Chức năng đặt xe, gia hạn thuê, hủy đơn & hoàn cọc.<br>• Nghiệp vụ quầy giao/nhận xe (Check-in, Check-out trả xe liên trạm, tính phí phạt) & xuất hóa đơn PDF. | Phối hợp cung cấp nghiệp vụ *(Hoàng biên soạn tài liệu)*. | **18%** |
| **4** | **Nguyễn Văn Tài / Đặng Vũ** | **Full-Stack Developer** | **14 commits** | • Danh mục đội xe, bộ lọc tìm kiếm & chi tiết xe.<br>• Quản lý xe, cấu hình giá thuê, cảnh báo bảo dưỡng theo ODO & điều chuyển xe giữa các trạm. | Phối hợp cung cấp nghiệp vụ *(Hoàng biên soạn tài liệu)*. | **15%** |
| **5** | **Phạm Văn Tuyên** | **Frontend Developer** | **4 commits** | • Danh sách xe yêu thích, đánh giá sao & gửi khiếu nại.<br>• Thông báo nhắc lịch, tích điểm đổi thưởng & quản lý banner/trang tĩnh. | Phối hợp cung cấp nghiệp vụ *(Hoàng biên soạn tài liệu)*. | **12%** |
| **Tổng** | **5 Thành viên** | — | **125 commits** | **Hoàn thành 100% chức năng & kiểm thử tự động** | **Hoàn thành 100% bộ tài liệu** | **100%** |

---

## 2. Phân Công Bộ Tài Liệu

| STT | Hạng mục Tài liệu | Người Thực hiện | Trạng thái |
| :---: | :--- | :--- | :---: |
| **1** | **Đặc tả yêu cầu phần mềm (SRS)** | **Phạm Quốc Cả** | Hoàn thành 100% |
| **2** | **Đặc tả yêu cầu & Thiết kế giao diện (RDS)** | **Trương Quốc Bảo Hoàng** *(tổng hợp & làm toàn bộ phần thiết kế UI, CSDL)*<br>**Phạm Quốc Cả** *(phần SRS)* | Hoàn thành 100% |
| **3** | **Đặc tả thiết kế kỹ thuật (SDS)** | **Trương Quốc Bảo Hoàng** | Hoàn thành 100% |
| **4** | **Tài liệu bàn giao & Hướng dẫn sử dụng (Final Release)** | **Trương Quốc Bảo Hoàng** | Hoàn thành 100% |
| **5** | **Bảng theo dõi tiến độ dự án (Project Tracking)** | **Trương Quốc Bảo Hoàng** | Hoàn thành 100% |
| **6** | **Báo cáo quản lý công việc & lỗi (Issues Report)** | **Trương Quốc Bảo Hoàng** | Hoàn thành 100% |
"""
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(readme_content)
    print("Updated concise README:", README_PATH)


if __name__ == "__main__":
    update_project_tracking_excel()
    update_docx_contributions()
    update_docs_readme()
