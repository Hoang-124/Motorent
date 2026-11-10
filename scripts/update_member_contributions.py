# -*- coding: utf-8 -*-
"""
Update all deliverables in d:\\Motorent\\docs with comprehensive Member Contribution Tables
(Bảng Đóng Góp Từng Thành Viên — Dự án / Code, Git, và Bộ Tài liệu Docx/Xlsx):
- Phạm Quốc Cả (CaPQ): Phụ trách phần SRS (Software Requirements Specification - Đặc tả yêu cầu phần mềm).
- Trương Quốc Bảo Hoàng (HoangTQB / Hoang-124 - Team Leader): Phụ trách toàn bộ các phần còn lại của bộ tài liệu
  (RDS Design & UI Specs, SDS Software Design Specification, Final Release Document, Project Tracking, Issues Report)
  cùng kiến trúc hệ thống, tích hợp Full-stack, Hợp đồng điện tử 2 bên, Giao nhận xe tận nơi, AI tối ưu lịch trực nhân viên,
  511 Automated Tests và Quản lý Git Repository (70+ commits).
"""
import os
import shutil
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
        '<w:right w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>'
        '</w:tblBorders>'
    )
    tblPr.append(borders)


def format_cell(cell, text, bold=False, size=9.5, color=(0, 0, 0), align=WD_ALIGN_PARAGRAPH.LEFT, bg=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
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
        format_cell(tbl.rows[0].cells[c_i], h, bold=True, size=9.5, color=(255, 255, 255), align=WD_ALIGN_PARAGRAPH.CENTER, bg=hdr_bg)
        if col_widths and c_i < len(col_widths):
            tbl.rows[0].cells[c_i].width = Inches(col_widths[c_i])
    for r_i, r_data in enumerate(rows, start=1):
        bg = "FFF2CC" if r_i == 1 else ("F9FAFB" if r_i % 2 == 0 else None)
        for c_i, val in enumerate(r_data):
            align = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 2, 7) else WD_ALIGN_PARAGRAPH.LEFT
            is_bold = (r_i == 1 and c_i in (1, 5, 6, 7)) or (c_i == 0)
            format_cell(tbl.rows[r_i].cells[c_i], val, bold=is_bold, size=9.0, align=align, bg=bg)
            if col_widths and c_i < len(col_widths):
                tbl.rows[r_i].cells[c_i].width = Inches(col_widths[c_i])
    return tbl


# ==============================================================================
# DATA: MEMBER CONTRIBUTIONS (PROJECT, GIT, DOCX/XLSX)
# ==============================================================================
MEMBER_SUMMARY_ROWS = [
    [
        "1",
        "Trương Quốc Bảo Hoàng\n(HoangTQB / Hoang-124)\n[Team Leader]",
        "Leader /\nFull-Stack &\nArchitect",
        "71 commits\n(876 files,\n+90,869 / -23,442 LOC)\nht20041975@gmail.com",
        "• Kiến trúc Modular Monolith (18 Models, 9 Modules, RBAC 4 vai trò, AuditLog).\n"
        "• Auth (JWT, OTP, Google OAuth2), eKYC AES-256-GCM.\n"
        "• Luồng Đặt xe, Giỏ xe đa phương tiện, Thanh toán VNPay HMAC-SHA512 & VietQR.\n"
        "• Hợp đồng điện tử pháp lý 2 bên (chữ ký Bên Thuê & Bên Cho Thuê + PDF Invoice).\n"
        "• Giao & Nhận xe tận nơi (Door-to-Door Delivery) theo địa chỉ tùy chọn.\n"
        "• AI tối ưu hóa xếp lịch phân ca nhân viên (Scoring 100đ, dự báo tải, chống Clopening).\n"
        "• Live Chat Socket.IO, Executive KPI Dashboard, 511/511 Automated Tests (46 suites), Quản lý Git/Release.",
        "Phụ trách toàn bộ các tài liệu còn lại:\n"
        "• MOTORENT_RDS_Final.docx (Tổng hợp, Chuẩn hóa 50 UC, Toàn bộ Mục III Thiết kế UI 50 màn hình, Truy vấn DB & Appendix MSG01–26)\n"
        "• MOTORENT_SDS_Final.docx (100% — Kiến trúc, ERD, Class Diagram, 50 Sequence Diagrams)\n"
        "• MOTORENT_Final_Release_Document.docx (100% — Gói bàn giao, Cài đặt & User Manual 27 mục)\n"
        "• MOTORENT_Project_Tracking.xlsx (100%)\n"
        "• MOTORENT_Issues_Report.xlsx (100% — 160 GitHub Issues)",
        "14 UCs chính\n+ Review/Fix\ntoàn bộ 50 UCs",
        "35%"
    ],
    [
        "2",
        "Phạm Quốc Cả\n(CaPQ / DELL)",
        "Business Analyst /\nBackend & SRS",
        "7 commits\n(82 files,\n+12,257 / -1,093 LOC)\nphamquocca0501@gmail.com",
        "• Phân tích nghiệp vụ và xây dựng đặc tả yêu cầu phần mềm (SRS).\n"
        "• Tham gia phát triển phân hệ Chi nhánh & Bản đồ GPS Haversine (UC-01, UC-13, UC-43, UC-44).\n"
        "• Quản lý nhân sự trạm, ca trực cơ bản & danh mục/khuyến mãi (UC-40, UC-41, UC-42, UC-47).",
        "Phụ trách phần SRS:\n"
        "• Biên soạn nội dung Đặc tả Yêu cầu Phần mềm (SRS — Software Requirements Specification: Actors, Use Cases & đặc tả chức năng ban đầu trong RDS).",
        "10 UCs\n(UC-01, 13,\n40..44, 47)",
        "20%"
    ],
    [
        "3",
        "Nguyễn Thái Dương\n(DuongNT / duongdeptrai)",
        "Full-Stack\nDeveloper",
        "29 commits\n(125 files,\n+13,288 / -581 LOC)\nduongntde180964@fpt.edu.vn",
        "• Tham gia phát triển giao diện & API luồng Đặt xe, Gia hạn thuê, Hủy đơn hoàn cọc theo BR-06 (UC-04, UC-14, UC-16, UC-17, UC-18, UC-19).\n"
        "• Nghiệp vụ Quầy Giao/Nhận xe (Counter Check-in 5 bước, Check-out trả xe liên trạm, Tính phí phạt trễ hạn/hư hỏng, Duyệt đơn & Hoàn cọc: UC-26..29, UC-36, UC-37).",
        "• Phối hợp cung cấp thông tin luồng nghiệp vụ Đặt xe & Quầy giao nhận; phần biên soạn tài liệu RDS/SDS/Release/Tracking do Hoàng thực hiện.",
        "12 UCs\n(UC-04, 14,\n16..19, 26..29,\n36, 37)",
        "18%"
    ],
    [
        "4",
        "Nguyễn Văn Tài / Đặng Vũ\n(TaiNV / TaiNguyen210305 /\nDang Vu)",
        "Full-Stack\nDeveloper",
        "14 commits\n(264 files,\n+30,410 / -1,906 LOC)\nKaitoraisen@gmail.com\nvuwin24442@gmail.com",
        "• Tham gia phát triển Danh mục Đội xe, Bộ lọc tìm kiếm & Chi tiết phương tiện 4 góc ảnh (UC-02, UC-03).\n"
        "• Quản lý đội xe trạm (Thêm/Sửa/Ngừng khai thác xe, Cấu hình giá thuê ngày/giờ/mùa cao điểm: UC-33, UC-34, UC-35).\n"
        "• Bảo dưỡng định kỳ theo ngưỡng ODO 3.000 km & Điều chuyển xe liên chi nhánh (UC-30, UC-38, UC-39).",
        "• Phối hợp cung cấp thông tin phân hệ Đội xe & Bảo dưỡng; phần biên soạn tài liệu RDS/SDS/Release/Tracking do Hoàng thực hiện.",
        "8 UCs\n(UC-02, 03, 30,\n33..35, 38, 39)",
        "15%"
    ],
    [
        "5",
        "Phạm Văn Tuyên\n(TuyenPV / Tuyen)",
        "Frontend &\nSupport Module",
        "4 commits\n(96 files,\n+12,576 / -2,795 LOC)\ntuyenpde181201@fpt.edu.vn",
        "• Tham gia phát triển Danh sách xe yêu thích Wishlist (UC-12), Đánh giá 1-5 sao sau chuyến đi (UC-20) & Khiếu nại dịch vụ (UC-21, UC-31).\n"
        "• Hệ thống Thông báo nhắc lịch, Tích điểm khách hàng thân thiết Loyalty, Mã giới thiệu & CMS Banner/Static Pages (UC-23, UC-24, UC-25, UC-49).",
        "• Phối hợp cung cấp thông tin phân hệ CSKH & Loyalty; phần biên soạn tài liệu RDS/SDS/Release/Tracking do Hoàng thực hiện.",
        "6 UCs\n(UC-12, 20, 21,\n23..25, 31, 49)",
        "12%"
    ],
]

DOC_ATTRIBUTION_ROWS = [
    [
        "1",
        "Phần SRS — Software Requirements Specification\n(Đặc tả Yêu cầu Phần mềm: Actors, Use Cases & Functional Requirements trong RDS)",
        "Phạm Quốc Cả (CaPQ)",
        "Trương Quốc Bảo Hoàng (HoangTQB) chuẩn hóa 50 UC & đồng bộ Release v1.2",
        "Hoàn thành 100%"
    ],
    [
        "2",
        "MOTORENT_RDS_Final.docx\n(Requirement & Design Specification — Phần Tổng hợp, Thiết kế UI 50 màn hình Mục III, Truy vấn DB, Appendix MSG01–MSG26)",
        "Trương Quốc Bảo Hoàng (HoangTQB)",
        "Phạm Quốc Cả (đóng góp phần SRS Mục I & II)",
        "Hoàn thành 100%\n(50 UCs & 50 UI Screens)"
    ],
    [
        "3",
        "MOTORENT_SDS_Final.docx\n(Software Design Specification — Kiến trúc Modular Monolith, ERD 18 bảng, Class Diagram, 50 Sequence Diagrams & DB Queries)",
        "Trương Quốc Bảo Hoàng (HoangTQB)",
        "Đội ngũ phát triển tham khảo triển khai",
        "Hoàn thành 100%\n(12 Packages, 50 Sequences)"
    ],
    [
        "4",
        "MOTORENT_Final_Release_Document.docx\n(Tài liệu Bàn giao Cuối kỳ — Deliverable Package, Installation Guide & User Manual 27 mục có ảnh chụp thực tế)",
        "Trương Quốc Bảo Hoàng (HoangTQB)",
        "—",
        "Hoàn thành 100%\n(27 mục hướng dẫn & ảnh thật)"
    ],
    [
        "5",
        "MOTORENT_Project_Tracking.xlsx\n(Bảng theo dõi tiến độ 50 chức năng qua 4 Iteration, Ma trận đóng góp thành viên & Effort Distribution)",
        "Trương Quốc Bảo Hoàng (HoangTQB)",
        "Cả, Dương, Tài, Tuyên cập nhật trạng thái UC",
        "Hoàn thành 100%\n(50/50 Done + Member Matrix)"
    ],
    [
        "6",
        "MOTORENT_Issues_Report.xlsx\n(Báo cáo 160 GitHub Issues #6–#165 theo dõi toàn bộ Task SRS/SDS/Code/Integration/Fix qua 4 Iteration)",
        "Trương Quốc Bảo Hoàng (HoangTQB)",
        "—",
        "Hoàn thành 100%\n(160/160 Issues Closed)"
    ],
]


# ==============================================================================
# 1. UPDATE MOTORENT_RDS_Final.docx & MOTORENT_SDS_Final.docx RECORD OF CHANGES
# ==============================================================================
def update_rds_and_sds_record_of_changes():
    # Update RDS Record of Changes (Table 0)
    if os.path.exists(RDS_PATH):
        doc = docx.Document(RDS_PATH)
        if doc.tables:
            t0 = doc.tables[0]
            # Keep header row, populate clean rows showing CaPQ (SRS) and HoangTQB (RDS Design, UI, DB, Final v1.2)
            roc_data = [
                ["V1.0", "26/09/2026", "A", "CaPQ\n(Phạm Quốc Cả)", "Initial drafting of Software Requirements Specification (SRS: Actors, Use Cases & Functional Requirements)."],
                ["V1.1", "18/10/2026", "M", "HoangTQB\n(Bảo Hoàng)", "Consolidated 50 core Use Cases (UC-01..UC-50), authored Section III Design Specifications, Database CRUD & Mongoose queries."],
                ["V1.2", "10/11/2026", "M", "HoangTQB\n(Bảo Hoàng)", "Completed full 50 UI Design screens from live project, Dual-Party E-Contract Signatures, Door-to-Door Delivery, AI Shift Scheduling Optimizer & MSG01–MSG26."],
            ]
            for r_idx, r_vals in enumerate(roc_data, start=1):
                if r_idx < len(t0.rows):
                    for c_idx, val in enumerate(r_vals):
                        t0.rows[r_idx].cells[c_idx].text = val
        doc.save(RDS_PATH)
        print("Updated Record of Changes in:", RDS_PATH)

    # Update SDS Record of Changes (Table 0)
    if os.path.exists(SDS_PATH):
        doc = docx.Document(SDS_PATH)
        if doc.tables:
            t0 = doc.tables[0]
            sds_roc = [
                ["26/09/2026", "A", "HoangTQB\n(Bảo Hoàng)", "Initial release of Software Design Specification (v1.0) aligned with MOTORENT Modular Monolith architecture."],
                ["18/10/2026", "M", "HoangTQB\n(Bảo Hoàng)", "Updated SDS to v1.1 covering 18 MongoDB collections, 9 Feature Modules, and 50 core Use Cases (UC-01..UC-50)."],
                ["10/11/2026", "M", "HoangTQB\n(Bảo Hoàng)", "Completed full Class Diagrams, 50 Sequence Diagrams, Dual-Party Contract Signature design, Door-to-Door Delivery & AI Shift Optimizer."],
            ]
            for r_idx, r_vals in enumerate(sds_roc, start=1):
                if r_idx < len(t0.rows):
                    for c_idx, val in enumerate(r_vals):
                        t0.rows[r_idx].cells[c_idx].text = val
        doc.save(SDS_PATH)
        print("Updated Record of Changes in:", SDS_PATH)


# ==============================================================================
# 2. UPDATE MOTORENT_Project_Tracking.xlsx WITH MEMBER CONTRIBUTIONS
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

    # Update Effort Distribution block on 'Project' sheet (around row 56+)
    ws_proj = wb["Project"]
    # Find row where "Effort Distribution" starts
    eff_row = None
    for r in range(1, ws_proj.max_row + 1):
        if str(ws_proj.cell(r, 1).value or "").strip() == "Effort Distribution":
            eff_row = r
            break
    if eff_row is None:
        eff_row = ws_proj.max_row + 2
    else:
        if ws_proj.max_row >= eff_row:
            ws_proj.delete_rows(eff_row, ws_proj.max_row - eff_row + 1)

    r_cur = eff_row
    ws_proj.cell(r_cur, 1, "Effort Distribution & Team Contribution Summary (Project, Git & Documentation)").font = font_title
    r_cur += 2

    eff_headers = [
        "No",
        "Full Name & Git Account",
        "Role in Project",
        "Effort (%)",
        "Git Commits & LOC",
        "Project / Code Contributions",
        "Documentation (Docx / Xlsx) Contributions"
    ]
    for c, h in enumerate(eff_headers, start=1):
        cell = ws_proj.cell(r_cur, c, h)
        cell.font = font_hdr_dark
        cell.fill = subhdr_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws_proj.row_dimensions[r_cur].height = 28
    r_cur += 1

    eff_rows_excel = [
        (
            1,
            "Trương Quốc Bảo Hoàng (HoangTQB / Hoang-124) — Leader",
            "Team Leader / Lead Full-Stack & Architect",
            0.35,
            "71 commits (+90,869 / -23,442 LOC)",
            "Kiến trúc Modular Monolith, Auth/OAuth2/eKYC, Đặt xe & VNPay, Hợp đồng điện tử 2 bên, Giao nhận tận nơi (Door-to-Door), AI tối ưu xếp lịch nhân viên, Live Chat, Admin KPI & 511 Tests",
            "Làm toàn bộ các tài liệu còn lại: RDS (Thiết kế UI 50 màn hình, DB, Appendix), SDS (100%), Final Release Document (100%), Project Tracking (100%), Issues Report (100%)"
        ),
        (
            2,
            "Phạm Quốc Cả (CaPQ / DELL)",
            "Business Analyst / Backend & SRS",
            0.20,
            "7 commits (+12,257 / -1,093 LOC)",
            "Phân hệ Chi nhánh & Bản đồ GPS Haversine (UC-01, 13, 43, 44), Quản lý nhân sự trạm, ca trực cơ bản & danh mục/voucher (UC-40..42, 47)",
            "Phụ trách biên soạn phần SRS (Software Requirements Specification — Đặc tả yêu cầu phần mềm: Actors & Use Cases)"
        ),
        (
            3,
            "Nguyễn Thái Dương (DuongNT)",
            "Full-Stack Developer",
            0.18,
            "29 commits (+13,288 / -581 LOC)",
            "Luồng Đặt xe, Giỏ xe, Gia hạn, Hủy đơn hoàn cọc BR-06 (UC-14, 16..19), Nghiệp vụ Quầy Check-in/Check-out liên trạm & Duyệt hoàn cọc (UC-26..29, 36, 37)",
            "Phối hợp cung cấp nghiệp vụ Đặt xe & Quầy giao nhận (Hoàng biên soạn tài liệu)"
        ),
        (
            4,
            "Nguyễn Văn Tài / Đặng Vũ (TaiNV / Dang Vu)",
            "Full-Stack Developer",
            0.15,
            "14 commits (+30,410 / -1,906 LOC)",
            "Danh mục & Bộ lọc Đội xe (UC-02, 03), Quản lý xe & giá thuê (UC-33..35), Bảo dưỡng ODO 3.000km & Điều chuyển xe liên trạm (UC-30, 38, 39)",
            "Phối hợp cung cấp nghiệp vụ Đội xe & Bảo dưỡng (Hoàng biên soạn tài liệu)"
        ),
        (
            5,
            "Phạm Văn Tuyên (TuyenPV)",
            "Frontend & Support Module",
            0.12,
            "4 commits (+12,576 / -2,795 LOC)",
            "Wishlist (UC-12), Đánh giá 5 sao & Khiếu nại (UC-20, 21, 31), Thông báo nhắc lịch, Tích điểm Loyalty, Referral & CMS Banner (UC-23..25, 49)",
            "Phối hợp cung cấp nghiệp vụ CSKH & Loyalty (Hoàng biên soạn tài liệu)"
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
            cell.alignment = Alignment(horizontal="center" if c in (1, 4) else "left", vertical="top", wrap_text=True)
        ws_proj.row_dimensions[r_cur].height = 48 if is_lead else 38
        r_cur += 1

    # Also create/replace dedicated sheet "Member_Contributions"
    if "Member_Contributions" in wb.sheetnames:
        del wb["Member_Contributions"]
    ws_mc = wb.create_sheet("Member_Contributions")

    ws_mc.cell(1, 1, "BẢNG ĐÓNG GÓP TỪNG THÀNH VIÊN (DỰ ÁN, GIT & TÀI LIỆU DOCX/XLSX) — GROUP 4 MOTORENT").font = font_title
    ws_mc.cell(2, 1, "Ghi chú phân công tài liệu: Phạm Quốc Cả phụ trách phần SRS; Trương Quốc Bảo Hoàng (Leader) phụ trách toàn bộ các tài liệu còn lại (RDS, SDS, Final Release, Tracking, Issues) & kiến trúc/tích hợp chính.").font = Font(name="Arial", size=10, italic=True, color="C00000")

    mc_headers = [
        "STT",
        "Thành viên & Tài khoản Git",
        "Vai trò",
        "Thống kê Git (Commits & LOC)",
        "Đóng góp trong Dự án & Mã nguồn (Codebase & Features)",
        "Đóng góp Tài liệu (SRS, RDS, SDS, Final Release, Excel)",
        "Số UC Phụ trách",
        "Tỷ lệ Đóng góp"
    ]
    for c, h in enumerate(mc_headers, start=1):
        cell = ws_mc.cell(4, c, h)
        cell.font = font_hdr_white
        cell.fill = header_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws_mc.row_dimensions[4].height = 30

    for idx, r_data in enumerate(MEMBER_SUMMARY_ROWS, start=5):
        is_lead = idx == 5
        for c, val in enumerate(r_data, start=1):
            cell = ws_mc.cell(idx, c, val)
            cell.font = font_bold if (is_lead and c in (1, 2, 6, 8)) else font_cell
            cell.border = border
            if is_lead:
                cell.fill = lead_fill
            cell.alignment = Alignment(horizontal="center" if c in (1, 3, 7, 8) else "left", vertical="top", wrap_text=True)
        ws_mc.row_dimensions[idx].height = 115 if is_lead else 65

    # Table 2 on Member_Contributions: Chi tiết đóng góp theo từng file tài liệu
    r2 = 12
    ws_mc.cell(r2, 1, "MA TRẬN PHÂN CÔNG & ĐÓNG GÓP CHI TIẾT BỘ TÀI LIỆU (DOCX & XLSX)").font = font_title
    r2 += 1
    doc_headers = ["STT", "Tên Tài liệu / Hạng mục Bàn giao", "Người Thực hiện Chính (Author / Owner)", "Người Phối hợp / Đóng góp", "Trạng thái Hoàn thành"]
    for c, h in enumerate(doc_headers, start=1):
        cell = ws_mc.cell(r2, c, h)
        cell.font = font_hdr_white
        cell.fill = header_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws_mc.row_dimensions[r2].height = 28

    for d_idx, d_row in enumerate(DOC_ATTRIBUTION_ROWS, start=r2 + 1):
        for c, val in enumerate(d_row, start=1):
            cell = ws_mc.cell(d_idx, c, val)
            cell.font = font_bold if c in (1, 3) else font_cell
            cell.border = border
            if "Bảo Hoàng" in str(d_row[2]):
                cell.fill = lead_fill
            cell.alignment = Alignment(horizontal="center" if c in (1, 5) else "left", vertical="center", wrap_text=True)
        ws_mc.row_dimensions[d_idx].height = 42

    mc_widths = [8, 30, 20, 28, 52, 52, 18, 16]
    for c, w in enumerate(mc_widths, start=1):
        ws_mc.column_dimensions[get_column_letter(c)].width = w

    wb.save(TRK_PATH)
    print("Updated Project Tracking with Member_Contributions:", TRK_PATH)


# ==============================================================================
# 3. CREATE STANDALONE DOCX & UPDATE FINAL RELEASE DOCUMENT DOCX
# ==============================================================================
def build_standalone_contribution_docx_and_update_release():
    # A. Create standalone MOTORENT_Bang_Dong_Gop_Thanh_Vien.docx
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.7)
        s.bottom_margin = Inches(0.7)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = p_title.add_run("BÁO CÁO ĐÓNG GÓP TỪNG THÀNH VIÊN TRONG DỰ ÁN MOTORENT\n(DỰ ÁN PHẦN MỀM, QUẢN LÝ GIT & BỘ TÀI LIỆU DOCX / XLSX)")
    r_t.bold = True
    r_t.font.name = "Arial"
    r_t.font.size = Pt(15)
    r_t.font.color.rgb = RGBColor(31, 78, 120)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_sub.add_run("Dự án: Hệ thống Quản lý Chuỗi Cho thuê Xe máy Đà Nẵng (MOTORENT — Group 4)\nRepository: https://github.com/Hoang-124/Motorent")
    r_s.italic = True
    r_s.font.name = "Arial"
    r_s.font.size = Pt(10.5)

    doc.add_heading("1. Tổng quan Phân công Tài liệu & Phát triển Hệ thống", level=1)
    p_ov = doc.add_paragraph()
    r_ov = p_ov.add_run(
        "• Phạm Quốc Cả (CaPQ): Phụ trách biên soạn phần SRS (Software Requirements Specification — Đặc tả yêu cầu phần mềm: xác định Actors, Use Cases và luồng nghiệp vụ ban đầu) và tham gia phát triển phân hệ Chi nhánh, Nhân sự & Danh mục.\n"
        "• Trương Quốc Bảo Hoàng (HoangTQB / Hoang-124 — Team Leader): Phụ trách thực hiện toàn bộ các phần tài liệu còn lại của dự án (bao gồm hoàn thiện RDS & Mục III Thiết kế UI 50 màn hình thực tế, toàn bộ tài liệu thiết kế kỹ thuật SDS, toàn bộ Final Release Document & User Manual, Project Tracking, Issues Report) đồng thời chịu trách nhiệm chính về Kiến trúc hệ thống, Phát triển Full-Stack cốt lõi, Hợp đồng điện tử 2 bên, Giao nhận xe tận nơi (Door-to-Door), AI tối ưu hóa lịch trực nhân viên, 511 bài kiểm thử tự động và Quản lý Git Repository (71 commits)."
    )
    r_ov.font.name = "Arial"
    r_ov.font.size = Pt(10)

    doc.add_heading("2. Bảng Đóng góp Tổng hợp Từng Thành viên (Code, Git & Docx/Xlsx)", level=1)
    headers_1 = [
        "STT",
        "Thành viên &\nGit Account",
        "Vai trò",
        "Đóng góp Git\n(Commits & LOC)",
        "Đóng góp trong Dự án (Codebase & Tính năng)",
        "Đóng góp Tài liệu\n(SRS, RDS, SDS, Release, Excel)",
        "Số UC",
        "Tỷ lệ"
    ]
    make_docx_table(doc, headers_1, MEMBER_SUMMARY_ROWS, col_widths=[0.4, 1.15, 0.8, 1.0, 1.85, 1.65, 0.65, 0.5])

    doc.add_paragraph()
    doc.add_heading("3. Bảng Phân công & Đóng góp Chi tiết theo Từng Tài liệu Bàn giao", level=1)
    headers_2 = [
        "STT",
        "Hạng mục Tài liệu (Docx / Xlsx)",
        "Người Thực hiện Chính",
        "Người Phối hợp",
        "Trạng thái"
    ]
    make_docx_table(doc, headers_2, DOC_ATTRIBUTION_ROWS, col_widths=[0.45, 2.55, 1.7, 1.4, 0.9])

    doc.save(CONTRIB_DOCX_PATH)
    print("Created standalone contribution report docx:", CONTRIB_DOCX_PATH)

    # B. Also append Section IV. Team Member Contributions into MOTORENT_Final_Release_Document.docx if not already present
    if os.path.exists(REL_PATH):
        rel_doc = docx.Document(REL_PATH)
        full_text = "\n".join(p.text for p in rel_doc.paragraphs)
        if "Team Member Contributions" not in full_text:
            rel_doc.add_page_break()
            rel_doc.add_heading("IV. Team Member Contributions (Project, Git & Documentation)", level=1)
            p_intro = rel_doc.add_paragraph()
            r_in = p_intro.add_run(
                "Bảng dưới đây tổng hợp chi tiết đóng góp của từng thành viên Nhóm 4 (MOTORENT) trên 3 phương diện: "
                "(1) Phát triển tính năng & mã nguồn dự án, (2) Lịch sử đóng góp Git thực tế, và (3) Biên soạn bộ tài liệu bàn giao "
                "(trong đó Phạm Quốc Cả phụ trách phần SRS; Trương Quốc Bảo Hoàng — Team Leader phụ trách toàn bộ các tài liệu còn lại gồm RDS UI/Design, SDS, Final Release Document, Project Tracking, Issues Report và tích hợp hệ thống)."
            )
            r_in.font.name = "Arial"
            r_in.font.size = Pt(10)

            rel_doc.add_heading("1. Member Contribution Matrix (Code, Git & Deliverables)", level=2)
            make_docx_table(rel_doc, headers_1, MEMBER_SUMMARY_ROWS, col_widths=[0.4, 1.1, 0.75, 0.95, 1.8, 1.6, 0.6, 0.45])

            rel_doc.add_paragraph()
            rel_doc.add_heading("2. Documentation Deliverables Attribution (SRS, RDS, SDS, Release & Excel)", level=2)
            make_docx_table(rel_doc, headers_2, DOC_ATTRIBUTION_ROWS, col_widths=[0.45, 2.45, 1.65, 1.35, 0.85])

            rel_doc.save(REL_PATH)
            print("Appended Section IV (Team Member Contributions) to:", REL_PATH)


# ==============================================================================
# 4. UPDATE d:\Motorent\docs\README.md
# ==============================================================================
def update_docs_readme():
    readme_content = """# Bộ Tài Liệu Chính Thức & Bảng Đóng Góp Thành Viên — Dự Án MOTORENT (Group 4)

Thư mục `docs/` chứa trọn bộ **6 tài liệu chuẩn hóa chính thức** của dự án **Hệ thống Quản lý Chuỗi Cho thuê Xe máy (MOTORENT)** kèm theo **Bảng Đóng Góp Từng Thành Viên** chi tiết trong dự án (Codebase, Git Repository và Bộ tài liệu `.docx` / `.xlsx`).

---

## I. Danh Mục Tài Liệu Bàn Giao (`docs/`)

| STT | Tên File | Mô tả Nội dung Chính | Người Phụ Trách Biên Soạn |
| :---: | :--- | :--- | :--- |
| **1** | [`MOTORENT_RDS_Final.docx`](./MOTORENT_RDS_Final.docx) | **Requirement & Design Specification (RDS v1.2)**: Đặc tả yêu cầu 50 Use Cases (`UC-01`..`UC-50`), Sơ đồ Use Case, Mục III Thiết kế giao diện 50 màn hình thực tế, Đặc tả trường UI, Truy vấn Mongoose & Phụ lục `MSG01`–`MSG26`. | **Phạm Quốc Cả** *(Phần SRS: Actors & Use Cases)*<br>**Trương Quốc Bảo Hoàng** *(Tổng hợp, Chuẩn hóa 50 UC, Toàn bộ Mục III Thiết kế UI 50 màn hình, DB Queries & Appendix)* |
| **2** | [`MOTORENT_SDS_Final.docx`](./MOTORENT_SDS_Final.docx) | **Software Design Specification (SDS v1.2)**: Đặc tả thiết kế kiến trúc kỹ thuật Modular Monolith (12 packages), Sơ đồ ERD 18 bảng MongoDB, Sơ đồ Lớp (Class Diagrams), và trọn bộ **50 Sequence Diagrams** (`1.1`..`9.8`). | **Trương Quốc Bảo Hoàng** *(100%)* |
| **3** | [`MOTORENT_Final_Release_Document.docx`](./MOTORENT_Final_Release_Document.docx) | **Final Release Document & User Manual**: Danh mục gói bàn giao, Hướng dẫn cài đặt môi trường, Cẩm nang hướng dẫn sử dụng 27 phân mục có ảnh chụp thực tế từ dự án đang chạy, và Bảng đóng góp thành viên (Mục IV). | **Trương Quốc Bảo Hoàng** *(100%)* |
| **4** | [`MOTORENT_Project_Tracking.xlsx`](./MOTORENT_Project_Tracking.xlsx) | **Project Tracking & Member Contributions**: Theo dõi tiến độ toàn bộ 50 chức năng qua 4 Iteration (`Project`, `Iter1`, `Iter2`, `Iter3`, `Iter4`), bảng `Effort Distribution` và sheet riêng **`Member_Contributions`**. | **Trương Quốc Bảo Hoàng** *(100%)* |
| **5** | [`MOTORENT_Issues_Report.xlsx`](./MOTORENT_Issues_Report.xlsx) | **GitHub Issues Report**: Danh sách **160 GitHub Issues thực tế** (`#6` đến `#165`) theo dõi toàn bộ công việc SRS, SDS, Code, Integration & Bugfix của cả nhóm qua 4 Iteration. | **Trương Quốc Bảo Hoàng** *(100%)* |
| **6** | [`MOTORENT_Bang_Dong_Gop_Thanh_Vien.docx`](./MOTORENT_Bang_Dong_Gop_Thanh_Vien.docx) | **Báo Cáo Đóng Góp Từng Thành Viên (Word)**: Tài liệu `.docx` tổng hợp chi tiết đóng góp của từng thành viên về Codebase, Git Commits/LOC và Tài liệu báo cáo. | **Trương Quốc Bảo Hoàng** *(100%)* |

---

## II. Bảng Đóng Góp Từng Thành Viên (Dự Án, Git & Tài Liệu Docx/Xlsx)

> **Nguyên tắc ghi nhận đóng góp tài liệu & dự án:**
> - **Phạm Quốc Cả (`CaPQ`)**: Đã thực hiện phần **SRS (Software Requirements Specification)** — phân tích Actors, Use Cases và đặc tả yêu cầu chức năng ban đầu.
> - **Trương Quốc Bảo Hoàng (`HoangTQB` / `Hoang-124` — Team Leader)**: Thực hiện **toàn bộ các phần còn lại**, bao gồm: toàn bộ kiến trúc & tích hợp hệ thống, các tính năng nâng cao (Hợp đồng điện tử pháp lý 2 bên, Giao nhận xe tận nơi Door-to-Door, AI tối ưu hóa xếp lịch nhân viên, Thanh toán VNPay/VietQR, 511 bài kiểm thử tự động), quản lý Git (`71 commits`), và biên soạn toàn bộ các tài liệu còn lại (`RDS UI/Design & DB`, `SDS`, `Final Release Document`, `Project Tracking`, `Issues Report`).

### 1. Ma Trận Tổng Hợp Đóng Góp Theo Thành Viên

| STT | Thành viên & Git Account | Vai trò | Thống kê Git (`main` & branches) | Đóng góp trong Dự án (Kiến trúc, Backend, Frontend & Testing) | Đóng góp Bộ Tài liệu (`.docx` & `.xlsx`) | Số UC Phụ trách | Tỷ lệ Đóng góp |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | **Trương Quốc Bảo Hoàng**<br>(`HoangTQB` / `Hoang-124`)<br>`ht20041975@gmail.com` | **Team Leader / Lead Full-Stack & Architect** | **71 commits**<br>`876 files`<br>`+90,869` / `-23,442` LOC<br>*(57.3% tổng commits)* | • Thiết kế kiến trúc **Modular Monolith** (`18 Mongoose Models`, `9 Modules`, `4-Role RBAC`, `AuditLog`).<br>• Xây dựng phân hệ **Auth & Security** (JWT, Email OTP, Google OAuth 2.0, eKYC AES-256-GCM).<br>• Xây dựng luồng **Đặt xe trung tâm, Giỏ xe đa phương tiện, Thanh toán cọc 30% VNPay HMAC-SHA512 & VietQR**.<br>• Triển khai **Hợp đồng điện tử pháp lý 2 bên** (Chữ ký số Bên Thuê & Bên Cho Thuê + xuất PDF hợp đồng song phương).<br>• Triển khai **Giao & Nhận xe tận nơi (Door-to-Door Delivery)** ngoài cửa hàng với tự động tính phí vận chuyển.<br>• Nghiên cứu & phát triển **AI Tối ưu hóa Xếp lịch Phân ca Nhân viên** (Multi-Factor Heuristic Scoring 100 điểm, dự báo nhu cầu nhận/trả xe, chống Clopening, cân bằng giờ công).<br>• Xây dựng **Live Chat Socket.IO**, **Executive KPI Dashboard**, viết **511/511 Automated Tests (46 test suites)**, rà soát & fix toàn bộ lỗi logic dự án. | **Thực hiện toàn bộ các phần tài liệu còn lại:**<br>• **`MOTORENT_RDS_Final.docx`**: Tổng hợp, chuẩn hóa 50 UC, biên soạn toàn bộ Mục III Thiết kế UI 50 màn hình thực tế, Database CRUD/Queries & Phụ lục `MSG01`–`MSG26`.<br>• **`MOTORENT_SDS_Final.docx`**: Biên soạn 100% (Kiến trúc, ERD 18 bảng, Class Diagrams, 50 Sequence Diagrams).<br>• **`MOTORENT_Final_Release_Document.docx`**: Biên soạn 100% (Deliverable Package, Installation Guide & 27 mục User Manual kèm ảnh chụp dự án đang chạy).<br>• **`MOTORENT_Project_Tracking.xlsx`**: Biên soạn 100%.<br>• **`MOTORENT_Issues_Report.xlsx`**: Biên soạn & đồng bộ 160 GitHub Issues (`#6`–`#165`). | **14 UCs chính**<br>+ Review, tích hợp & hoàn thiện toàn bộ **50/50 UCs** | **35%** |
| **2** | **Phạm Quốc Cả**<br>(`CaPQ` / `DELL`)<br>`phamquocca0501@gmail.com` | **Business Analyst / Backend & SRS** | **7 commits**<br>`82 files`<br>`+12,257` / `-1,093` LOC | • Phân tích yêu cầu nghiệp vụ hệ thống.<br>• Tham gia phát triển phân hệ **Chi nhánh & Bản đồ GPS Haversine** (`UC-01`, `UC-13`, `UC-43`, `UC-44`).<br>• Tham gia phát triển phân hệ **Quản lý nhân sự trạm, phân ca cơ bản, báo cáo trạm & cấu hình danh mục/voucher** (`UC-40`, `UC-41`, `UC-42`, `UC-47`). | **Phụ trách phần SRS:**<br>• Biên soạn nội dung **SRS (Software Requirements Specification)** — Đặc tả yêu cầu phần mềm (Actors, Use Cases & luồng chức năng ban đầu trong tài liệu RDS). | **10 UCs**<br>(`UC-01`, `13`, `40`..`44`, `47`) | **20%** |
| **3** | **Nguyễn Thái Dương**<br>(`DuongNT` / `duongdeptrai`)<br>`duongntde180964@fpt.edu.vn` | **Full-Stack Developer** | **29 commits**<br>`125 files`<br>`+13,288` / `-581` LOC | • Tham gia phát triển giao diện & API luồng **Đặt xe, Gia hạn thuê, Hủy đơn hoàn cọc theo BR-06, Lịch sử đơn & Hóa đơn PDF** (`UC-04`, `UC-14`, `UC-16`..`UC-19`).<br>• Tham gia phát triển nghiệp vụ **Quầy Giao/Nhận xe (Counter Desk)**: Check-in 5 bước, Check-out trả xe liên chi nhánh, Tính phí phạt trễ hạn/hư hỏng, Duyệt đơn & Hoàn cọc (`UC-26`..`UC-29`, `UC-36`, `UC-37`). | • Phối hợp cung cấp thông tin nghiệp vụ phân hệ Đặt xe & Quầy giao nhận *(phần biên soạn các file tài liệu RDS/SDS/Release/Tracking do Hoàng thực hiện)*. | **12 UCs**<br>(`UC-04`, `14`, `16`..`19`, `26`..`29`, `36`, `37`) | **18%** |
| **4** | **Nguyễn Văn Tài / Đặng Vũ**<br>(`TaiNV` / `TaiNguyen210305` / `Dang Vu`)<br>`Kaitoraisen@gmail.com`<br>`vuwin24442@gmail.com` | **Full-Stack Developer** | **14 commits**<br>`264 files`<br>`+30,410` / `-1,906` LOC | • Tham gia phát triển **Danh mục Đội xe, Bộ lọc tìm kiếm đa tiêu chí & Chi tiết xe 4 góc ảnh** (`UC-02`, `UC-03`).<br>• Quản lý đội xe chi nhánh: Thêm/Sửa/Ngừng khai thác xe, Cấu hình biểu giá ngày/giờ/mùa cao điểm (`UC-33`, `UC-34`, `UC-35`).<br>• Cảnh báo bảo dưỡng định kỳ theo **ODO 3.000 km** & Điều chuyển xe liên trạm (`UC-30`, `UC-38`, `UC-39`). | • Phối hợp cung cấp thông tin nghiệp vụ phân hệ Đội xe & Bảo dưỡng *(phần biên soạn các file tài liệu RDS/SDS/Release/Tracking do Hoàng thực hiện)*. | **8 UCs**<br>(`UC-02`, `03`, `30`, `33`..`35`, `38`, `39`) | **15%** |
| **5** | **Phạm Văn Tuyên**<br>(`TuyenPV` / `Tuyen`)<br>`tuyenpde181201@fpt.edu.vn` | **Frontend & Support Developer** | **4 commits**<br>`96 files`<br>`+12,576` / `-2,795` LOC | • Tham gia phát triển **Danh sách xe yêu thích (Wishlist)** (`UC-12`), **Đánh giá 1–5 sao** (`UC-20`) & **Khiếu nại dịch vụ** (`UC-21`, `UC-31`).<br>• Tham gia phát triển **Thông báo nhắc lịch, Tích điểm Loyalty, Mã giới thiệu bạn bè & CMS Banner/Static Pages** (`UC-23`, `UC-24`, `UC-25`, `UC-49`). | • Phối hợp cung cấp thông tin nghiệp vụ phân hệ CSKH & Loyalty *(phần biên soạn các file tài liệu RDS/SDS/Release/Tracking do Hoàng thực hiện)*. | **6 UCs**<br>(`UC-12`, `20`, `21`, `23`..`25`, `31`, `49`) | **12%** |
| **Tổng** | **5 Thành viên (Group 4)** | — | **125 commits** | **18 Models · 9 Modules · 50 Use Cases · 511 Automated Tests PASS** | **Trọn bộ 6 ফাইলের `.docx` & `.xlsx` chuẩn hóa 100%** | **50 / 50 UCs (100% Done)** | **100%** |

---

### 2. Bảng Phân Công Chi Tiết Theo Hạng Mục Công Việc (SRS vs. Các Phần Còn Lại)

| Hạng mục Công việc | Người Thực hiện Chính | Chi tiết Phạm vi Hoàn thành |
| :--- | :--- | :--- |
| **1. Đặc tả Yêu cầu Phần mềm (SRS)** | **Phạm Quốc Cả (`CaPQ`)** | Xây dựng danh sách Tác nhân (Actors), Sơ đồ Use Case tổng quát và mô tả đặc tả yêu cầu chức năng (SRS) cho các phân hệ. |
| **2. Thiết kế Giao diện, CSDL & Hoàn thiện RDS (`MOTORENT_RDS_Final.docx`)** | **Trương Quốc Bảo Hoàng (`HoangTQB`)** | Chuẩn hóa 50 Use Cases (`UC-01`..`UC-50`), chụp & nhúng **50 màn hình thực tế từ dự án đang chạy** vào Mục III (Design Specifications), viết toàn bộ bảng Field List, Database CRUD, Mongoose Queries và bảng thông báo `MSG01`–`MSG26`. |
| **3. Đặc tả Thiết kế Kỹ thuật (`MOTORENT_SDS_Final.docx`)** | **Trương Quốc Bảo Hoàng (`HoangTQB`)** | Thiết kế kiến trúc Modular Monolith 12 packages, vẽ ERD 18 bảng, Class Diagrams, đặc tả chi tiết lớp và vẽ trọn bộ **50 Sequence Diagrams** (`1.1`..`9.8`). |
| **4. Tài liệu Bàn giao & Hướng dẫn Sử dụng (`MOTORENT_Final_Release_Document.docx`)** | **Trương Quốc Bảo Hoàng (`HoangTQB`)** | Biên soạn trọn bộ Gói bàn giao (Deliverable Package), Hướng dẫn cài đặt (Installation Guides), và 27 mục Hướng dẫn sử dụng (User Manual) cho cả 5 vai trò kèm ảnh chụp thật 100%. |
| **5. Theo dõi Tiến độ & Báo cáo Issues (`MOTORENT_Project_Tracking.xlsx`, `MOTORENT_Issues_Report.xlsx`)** | **Trương Quốc Bảo Hoàng (`HoangTQB`)** | Lập bảng theo dõi 50 chức năng qua 4 Iteration (`Iter1`–`Iter4`), bảng phân bổ nỗ lực (`Effort Distribution`), sheet đóng góp thành viên (`Member_Contributions`), và quản lý 160 GitHub Issues (`#6`–`#165`). |
| **6. Kiến trúc Cốt lõi, Tính năng Nâng cao (Hợp đồng 2 bên, Giao xe tận nơi, AI Xếp lịch) & Kiểm thử (511 Tests)** | **Trương Quốc Bảo Hoàng (`HoangTQB`)** | Xây dựng khung Server/Client, bảo mật RBAC/eKYC, Hợp đồng điện tử có chữ ký của cả Bên Thuê và Bên Cho Thuê, Giao & Nhận xe tận nơi ngoài cửa hàng, Thuật toán AI tối ưu hóa xếp lịch nhân viên, kiểm thử tự động 46 test suites (511 tests PASS) và quản lý nhánh `main` trên GitHub. |
"""
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(readme_content)
    print("Updated docs README:", README_PATH)


if __name__ == "__main__":
    update_rds_and_sds_record_of_changes()
    update_project_tracking_excel()
    build_standalone_contribution_docx_and_update_release()
    update_docs_readme()
