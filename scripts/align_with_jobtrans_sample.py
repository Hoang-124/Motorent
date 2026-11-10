import os
import shutil
import datetime
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from PIL import Image, ImageDraw, ImageFont

BASE_TPL = r'C:\Users\Hoàng\.gemini\antigravity\brain\5a1f5284-7883-44b3-9fa2-918338b11de7\.user_uploaded'
TPL1_PATH = BASE_TPL + r'\media_1794207953342_a336b32e.xlsx'
TPL3_PATH = BASE_TPL + r'\media_1794208009580_396a05f6.xlsx'
LOGO_PATH = r'd:\Motorent\docs\rds_media\image1.png'
STEP_IMG_DIR = r'd:\Motorent\docs\manual_steps'
os.makedirs(STEP_IMG_DIR, exist_ok=True)

# 50 Consolidated Use Cases & Screen/Functions of MOTORENT
ITEMS = [
    ("UC-01", "Locate Branch Offices on Map", "Browse & Search", "Guest, Customer",
     "Guest and Customer view active MOTORENT branches in Da Nang with address, operating hours, live vehicle count, and interactive Leaflet GPS map markers.",
     "Cả", "Done", "iter1", "iter4", "Added interactive GPS camera flyTo focus when clicking branch cards", "UC-01", "1.1", "Interactive Leaflet map & GPS markers"),
    ("UC-02", "Search & Filter Motorbikes", "Browse & Search", "Guest, Customer",
     "Users search and filter the motorbike fleet by branch, category (Scooter, Manual, Sport, Electric), brand, price range, and availability.",
     "Tài", "Done", "iter1", "", "", "UC-02", "1.2", "Full text search & multi-filter query"),
    ("UC-03", "Inspect Vehicle Specs & Reviews", "Browse & Search", "Guest, Customer",
     "Users view detailed motorbike specifications, 4-angle photo gallery, daily/hourly rental rates, availability calendar, and verified reviews.",
     "Tài", "Done", "iter1", "", "", "UC-03", "1.3", "Includes availability calendar & verified ratings"),
    ("UC-04", "Consult Rental Terms & Policies", "Browse & Search", "Guest, Customer",
     "Users view rental terms, 30% online deposit rules, 70% counter payment, BR-06 cancellation tiers, eKYC requirements, and penalty policies.",
     "Dương", "Done", "iter1", "", "", "UC-04", "1.4", "Connected to CMS StaticPage slug routing"),
    ("UC-05", "Register Account & Email OTP", "Authentication", "Guest",
     "Register new account to access features of the Platform by unique email address and 6-digit OTP verification (popup/page register screen).",
     "Hoàng", "Done", "iter1", "", "", "UC-05", "2.1", "Includes 6-digit OTP email verification"),
    ("UC-06", "Login/Logout & Google OAuth2", "Authentication", "User",
     "Any User who has an account on the Platform can access the Platform by entering valid Email and password or via Google OAuth2 button.",
     "Hoàng", "Done", "iter1", "iter4", "Stabilized Google GIS SDK load race condition and Referrer-Policy header", "UC-06", "2.2", "Supports JWT + Google OAuth2.0"),
    ("UC-07", "Forgot Password", "Authentication", "User",
     "When users log in if they forgot their password, they can request a verification mail to get an OTP/reset token then set a new password.",
     "Hoàng", "Done", "iter1", "", "", "UC-07", "2.3", "Single-use SHA-256 token with 1h expiry"),
    ("UC-08", "Logout System", "Authentication", "User",
     "Authenticated users log out of the platform, invalidating their active JWT session and returning to the homepage.",
     "Hoàng", "Done", "iter1", "", "", "UC-08", "2.4", "Token revocation via tokenVersion increment"),
    ("UC-09", "View & Edit Personal Profile", "Customer Profile & Account", "Customer",
     "Users after login successfully can view and edit their profile information (name, phone, DOB, avatar image) on the platform.",
     "Hoàng", "Done", "iter1", "", "", "UC-09", "3.1", "Multer image validation & profile update"),
    ("UC-10", "Submit Identity Verification (eKYC)", "Customer Profile & Account", "Customer",
     "Customers upload front/back photos of CCCD/Passport and A1/A2 Driving License for mandatory eKYC identity verification.",
     "Hoàng", "Done", "iter1", "", "", "UC-10", "3.2", "Updates identityVerificationStatus to Pending/Verified"),
    ("UC-11", "Change Account Password", "Customer Profile & Account", "Customer",
     "Users can change their password if they want as long as they enter a valid old password and a new password >= 8 characters.",
     "Hoàng", "Done", "iter1", "", "", "UC-11", "3.3", "Bcrypt 10 rounds + session rotation"),
    ("UC-12", "Bookmark Favorite Vehicles (Wishlist)", "Booking & Payment", "Customer",
     "Customers save or remove favorite motorbikes in their personal wishlist for quick comparison and booking.",
     "Tuyên", "Done", "iter1", "", "", "UC-12", "4.1", "Persisted in Wishlist collection"),
    ("UC-13", "Find Nearest Branches by GPS", "Booking & Payment", "Customer",
     "Customers locate available motorbikes at branches nearest to their current GPS coordinates using Haversine distance calculation.",
     "Cả", "Done", "iter1", "", "", "UC-13", "4.2", "Haversine formula distance calculation"),
    ("UC-14", "Book a Rental & Multi-Vehicle Cart", "Booking & Payment", "Customer",
     "Customers book a single motorbike via the 4-step wizard or reserve multiple motorbikes in one batch via the Multi-Vehicle Cart Drawer.",
     "Dương", "Done", "iter2", "iter4", "Added Multi-Vehicle Cart Drawer supporting batch reservation with shared CART-XXE-MV-XXXXXX group code", "UC-14", "4.3", "Single & Multi-Vehicle Cart booking"),
    ("UC-15", "Pay Deposit via VNPay & Counter Balance", "Booking & Payment", "Customer",
     "Customers pay 30% deposit or 100% full amount online via VNPay Sandbox form (HMAC-SHA512), and settle 70% remaining balance at counter.",
     "Hoàng", "Done", "iter2", "iter4", "Batch VNPay return/IPN confirmation for multi-vehicle cart orders", "UC-15", "4.4", "VNPay HMAC-SHA512 + batch cart confirmation"),
    ("UC-16", "Cancel Rental Order & Mid-Rental Termination", "Booking & Payment", "Customer",
     "Customers cancel pending/confirmed orders under BR-06 refund tiers or terminate an Ongoing rental early to release the motorbike.",
     "Dương", "Done", "iter2", "iter4", "Allowed mid-rental early cancellation on Ongoing bookings with automatic vehicle release", "UC-16", "4.5", "Enforces BR-06 refund policy & mid-rental release"),
    ("UC-17", "Extend Rental Period", "Booking & Payment", "Customer",
     "Customers with an Ongoing rental request to extend their return date/time after automatic conflict checking.",
     "Dương", "Done", "iter2", "", "", "UC-17", "4.6", "Checks conflict window & recalculates totalAmount"),
    ("UC-18", "Track Rental Orders & History", "Booking & Payment", "Customer",
     "Customers view their booking list across status tabs (All, Pending, Confirmed, Ongoing, Completed, Cancelled) with real-time Socket.IO updates.",
     "Dương", "Done", "iter2", "", "", "UC-18", "4.7", "Real-time Socket.IO status transitions"),
    ("UC-19", "Download Invoice PDF", "Booking & Payment", "Customer",
     "Customers generate and download a formatted PDF rental contract and itemized receipt via PDFKit.",
     "Dương", "Done", "iter3", "", "", "UC-19", "4.8", "Generated dynamically via PDFKit"),
    ("UC-20", "Rate & Review Rented Vehicles", "Review, Complaint & Communication", "Customer",
     "Customers submit a 1-5 star reputation and vehicle quality review with photos after rental completion.",
     "Tuyên", "Done", "iter1", "", "", "UC-20", "5.1", "Updates vehicle average rating atomically"),
    ("UC-21", "Report & Track Service Complaints", "Review, Complaint & Communication", "Customer",
     "Customers submit service or vehicle complaints with issues and track resolution status from Open to Resolved.",
     "Tuyên", "Done", "iter1", "", "", "UC-21", "5.2", "Full lifecycle state tracking"),
    ("UC-22", "Chat Live with Branch Staff", "Review, Complaint & Communication", "Customer, Staff",
     "Customers and branch staff contact each other in real time on platform Socket.IO chat channels.",
     "Hoàng", "Done", "iter3", "", "", "UC-22", "5.3", "Socket.IO room per conversation"),
    ("UC-23", "Receive Booking Alerts & Reminders", "Notifications & Loyalty", "Customer",
     "Customers receive in-app push notifications, HTML email confirmations, and 24h/2h pickup/return reminders.",
     "Tuyên", "Done", "iter2", "", "", "UC-23", "6.1", "Socket.IO badge count + Nodemailer + Cron"),
    ("UC-24", "Earn & Redeem Loyalty Points", "Notifications & Loyalty", "Customer",
     "Customers earn 1 point per 10,000 VND spent on completed rentals and redeem points for discount vouchers.",
     "Tuyên", "Done", "iter2", "", "", "UC-24", "6.2", "Tier progression: Bronze, Silver, Gold, Platinum"),
    ("UC-25", "Refer Friends & Subscribe Promos", "Notifications & Loyalty", "Customer",
     "Customers share unique referral codes for bonus loyalty points and toggle promotional email subscriptions.",
     "Tuyên", "Done", "iter2", "", "", "UC-25", "6.3", "Unique referralCode per customer"),
    ("UC-26", "Inspect Branch Rental Queue", "Counter Desk Operations", "Staff",
     "Counter staff view and filter the branch's daily pickup and return booking queue by status.",
     "Dương", "Done", "iter3", "", "", "UC-26", "7.1", "Branch-scoped queue with quick search"),
    ("UC-27", "Confirm Vehicle Handover (Check-in)", "Counter Desk Operations", "Staff",
     "Staff perform 5-point handover: verify ID/license, collect 70% payment, upload 4 vehicle photos, record start ODO/fuel, and capture e-signature.",
     "Dương", "Done", "iter3", "", "", "UC-27", "7.2", "Transitions Booking -> Ongoing, Vehicle -> Rented"),
    ("UC-28", "Confirm Vehicle Return (Check-out)", "Counter Desk Operations", "Staff",
     "Staff process vehicle return at any Da Nang branch, upload 4 return photos, record end ODO/fuel, and auto-relocate vehicle branchId.",
     "Dương", "Done", "iter3", "iter4", "Enabled cross-branch return at any station with automatic Vehicle.branchId relocation", "UC-28", "7.3", "Supports cross-branch return & auto-relocation"),
    ("UC-29", "Record Incident & Settle Penalty Fees", "Counter Desk Operations", "Staff",
     "Staff document vehicle damage with photos and calculate late return fees (30,000 VND/hr) plus damage compensation.",
     "Dương", "Done", "iter3", "", "", "UC-29", "7.4", "Auto-calculates late fee (30k/hr) & damage fee"),
    ("UC-30", "Create Maintenance Ticket & Flag Vehicle", "Counter Desk Operations", "Staff",
     "Staff flag a damaged or high-ODO motorbike as Maintenance and log a repair ticket.",
     "Tài", "Done", "iter2", "", "", "UC-30", "7.5", "Locks vehicle from new bookings"),
    ("UC-31", "Resolve Branch Customer Complaints", "Counter Desk Operations", "Staff",
     "Staff investigate assigned customer complaints, post responses, and update resolution status.",
     "Tuyên", "Done", "iter1", "", "", "UC-31", "7.6", "Includes response thread & escalation"),
    ("UC-32", "Reply to Customer Support Chat", "Counter Desk Operations", "Staff",
     "Staff reply to incoming customer live chat messages in real time via the Staff Chat Console.",
     "Hoàng", "Done", "iter3", "", "", "UC-32", "7.7", "Real-time bidirectional messaging"),
    ("UC-33", "Add New Vehicle", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers register new motorbikes with unique license plate, specs, ODO, and photos into their branch fleet.",
     "Tài", "Done", "iter1", "", "", "UC-33", "8.1", "Enforces unique licensePlate constraint"),
    ("UC-34", "Update & Decommission Vehicle", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers edit motorbike specifications or soft-delete decommissioned vehicles.",
     "Tài", "Done", "iter1", "", "", "UC-34", "8.2", "Soft delete with active booking guard"),
    ("UC-35", "Configure Vehicle Rental Pricing", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers configure daily rental prices, hourly rates, and seasonal peak multipliers.",
     "Tài", "Done", "iter1", "", "", "UC-35", "8.3", "Logs all price changes to AuditLog"),
    ("UC-36", "Approve or Reject Rental Order", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers review pending booking orders, verify eKYC, and approve or reject with mandatory reason.",
     "Dương", "Done", "iter2", "", "", "UC-36", "8.4", "Triggers customer email & push notification"),
    ("UC-37", "Process Deposit Refund Requests", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers evaluate customer deposit refund requests under BR-06 and approve or reject refund disbursement.",
     "Dương", "Done", "iter3", "", "", "UC-37", "8.5", "Records Payment refund transaction"),
    ("UC-38", "Schedule ODO Maintenance & Logs", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers monitor 3,000 km ODO alerts, schedule preventive maintenance, and audit maintenance cost logs.",
     "Tài", "Done", "iter2", "iter4", "Added 1-click quick maintenance schedule modal directly in Branch Manager Fleet table", "UC-38", "8.6", "Automated cron ODO threshold check (3,000 km)"),
    ("UC-39", "Coordinate Inter-Branch Transfers", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers request and approve motorbike transfers between Da Nang branches.",
     "Tài", "Done", "iter2", "", "", "UC-39", "8.7", "Two-step request & approval workflow"),
    ("UC-40", "Provision & Update Staff Accounts", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers create, update, or deactivate Staff accounts assigned to their branch.",
     "Cả", "Done", "iter2", "", "", "UC-40", "8.8", "Scoped strictly to manager's branchId"),
    ("UC-41", "Assign Work Shifts & Track Attendance", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers assign Morning/Afternoon/Evening work shifts on the calendar and track staff attendance.",
     "Cả", "Done", "iter2", "", "", "UC-41", "8.9", "Flags late attendance > 15 minutes"),
    ("UC-42", "Generate & Export Branch Reports", "Fleet & Staff Management", "Branch Manager",
     "Branch Managers view daily/monthly branch revenue and utilization charts and export Excel/PDF reports.",
     "Cả", "Done", "iter3", "", "", "UC-42", "8.10", "Exports ExcelJS & PDFKit reports"),
    ("UC-43", "Add New Branch", "System Administration", "System Admin",
     "System Admins create new rental branches with unique code, address, GPS coordinates, and assigned Branch Manager.",
     "Cả", "Done", "iter1", "", "", "UC-43", "9.1", "Validates unique branch code & GPS"),
    ("UC-44", "Update & Deactivate Branch", "System Administration", "System Admin",
     "System Admins update branch information, reassign managers, or deactivate branches.",
     "Cả", "Done", "iter1", "", "", "UC-44", "9.2", "Prevents deactivating branches with active rentals"),
    ("UC-45", "Provision Manager Accounts & RBAC", "System Administration", "System Admin",
     "System Admins manage user accounts, Ban/Unban (Lock/Unlock) users, assign Branch Managers, and configure RBAC.",
     "Hoàng", "Done", "iter2", "", "", "UC-45", "9.3", "Enforces 4-role RBAC permission matrix"),
    ("UC-46", "Inspect System Audit Logs", "System Administration", "System Admin",
     "System Admins search, filter, and inspect the tamper-evident security AuditLog trail.",
     "Hoàng", "Done", "iter3", "", "", "UC-46", "9.4", "Auto-redacts sensitive password/token fields"),
    ("UC-47", "Configure Vehicle Categories & Promos", "System Administration", "System Admin",
     "System Admins create, update, and delete vehicle categories and promotional discount voucher codes.",
     "Cả", "Done", "iter2", "", "", "UC-47", "9.5", "Supports percentage & fixed-amount promo codes"),
    ("UC-48", "Configure System Policies & Locale", "System Administration", "System Admin",
     "System Admins configure deposit %, cancellation tiers, loyalty rules, and VI/EN multi-language locale.",
     "Hoàng", "Done", "iter3", "", "", "UC-48", "9.6", "Includes VI/EN i18n language switcher"),
    ("UC-49", "Publish Promotional Banners & Pages", "System Administration", "System Admin",
     "System Admins manage homepage promotional banners and rich-text static policy pages (FAQ, Terms, Privacy).",
     "Tuyên", "Done", "iter1", "", "", "UC-49", "9.7", "Dynamic homepage carousel & slug pages"),
    ("UC-50", "Analyze Chain KPIs & Reconcile Finance", "System Administration", "System Admin",
     "System Admins analyze chain-wide revenue KPIs, compare branches, and reconcile VNPay transactions.",
     "Hoàng", "Done", "iter3", "", "", "UC-50", "9.8", "Chain-wide executive analytics & VNPay reconciliation"),
]

# ==============================================================================
# 1. UPDATE EXCEL DELIVERABLE 1 (Product Backlog + Effort Distribution)
# ==============================================================================
def update_product_backlog_with_effort():
    wb = openpyxl.load_workbook(TPL1_PATH)
    thin = Side(border_style="thin", color="BFBFBF")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    updated_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    done_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")

    font_title = Font(name="Arial", size=14, bold=True, color="000000")
    font_note = Font(name="Arial", size=10, italic=True, color="C00000")
    font_hdr = Font(name="Arial", size=10, bold=True, color="000000")
    font_cell = Font(name="Arial", size=10, bold=False, color="000000")

    ws_proj = wb['Project']
    if ws_proj.max_row >= 4:
        ws_proj.delete_rows(4, ws_proj.max_row - 3)

    ws_proj.cell(1, 1, "Total Project Tracking").font = font_title
    ws_proj.cell(2, 1).font = font_note
    for c in range(1, 11):
        cell = ws_proj.cell(3, c)
        cell.font = font_hdr
        cell.fill = header_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center" if c in (1, 6, 7, 8, 9) else "left", vertical="center", wrap_text=True)

    r_cursor = 4
    for item in ITEMS:
        uc_id, screen_func, feature, actor, desc, in_charge, status, actual_iter, updated_iter, update_details, srs_ref, sds_ref, iter_note = item
        row_vals = [
            r_cursor - 3,
            screen_func,
            feature,
            actor,
            desc,
            in_charge,
            status,
            actual_iter,
            updated_iter,
            update_details
        ]
        for c, val in enumerate(row_vals, start=1):
            cell = ws_proj.cell(r_cursor, c, val)
            cell.font = font_cell
            cell.border = border
            cell.alignment = Alignment(horizontal="center" if c in (1, 6, 7, 8, 9) else "left", vertical="top", wrap_text=True)
            if updated_iter:
                cell.fill = updated_fill
            elif c == 7:
                cell.fill = done_fill
        ws_proj.row_dimensions[r_cursor].height = 36
        r_cursor += 1

    # Add Effort Distribution block right below Total Project Tracking (matching JobTrans sample!)
    r_cursor += 2
    ws_proj.cell(r_cursor, 1, "Effort Distribution").font = font_title
    r_cursor += 2
    eff_headers = ["No", "Full name", "Student ID", "Effort (%)"]
    for c, h in enumerate(eff_headers, start=1):
        cell = ws_proj.cell(r_cursor, c, h)
        cell.font = font_hdr
        cell.fill = header_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center")
    r_cursor += 1

    team_efforts = [
        (1, "Bùi Huy Hoàng (Leader)", "DE180001", 0.22),
        (2, "Nguyễn Văn Dương", "DE180002", 0.20),
        (3, "Lê Văn Tài", "DE180003", 0.20),
        (4, "Trần Văn Cả", "DE180004", 0.19),
        (5, "Phạm Văn Tuyên", "DE180005", 0.19),
    ]
    for no, fname, sid, eff in team_efforts:
        vals = [no, fname, sid, eff]
        for c, val in enumerate(vals, start=1):
            cell = ws_proj.cell(r_cursor, c, val)
            cell.font = font_cell
            cell.border = border
            cell.alignment = Alignment(horizontal="center" if c in (1, 3, 4) else "left", vertical="center")
        r_cursor += 1

    proj_widths = [6, 36, 28, 18, 56, 14, 12, 10, 10, 44]
    for c, w in enumerate(proj_widths, start=1):
        ws_proj.column_dimensions[get_column_letter(c)].width = w

    # Populate Iter1..Iter4 matching JobTrans format (SRS='UC-xx', SDS='x.y')
    iter_map = {
        "Iter1": ("iter1", "Iteration Tracking - Iteration 1"),
        "Iter2": ("iter2", "Iteration Tracking - Iteration 2"),
        "Iter3": ("iter3", "Iteration Tracking - Iteration 3"),
        "Iter4": ("iter4", "Iteration Tracking - Iteration 4"),
    }
    for sheet_name, (iter_code, title_str) in iter_map.items():
        ws = wb[sheet_name]
        if ws.max_row >= 6:
            ws.delete_rows(6, ws.max_row - 5)
        ws.cell(1, 1, title_str).font = font_title
        for r_note in (2, 3, 4):
            ws.cell(r_note, 1).font = font_note
        for c in range(1, 10):
            cell = ws.cell(5, c)
            cell.font = font_hdr
            cell.fill = header_fill
            cell.border = border
            cell.alignment = Alignment(horizontal="center" if c in (1, 5, 6, 7, 8) else "left", vertical="center", wrap_text=True)

        iter_items = [it for it in ITEMS if it[7] == iter_code or it[8] == iter_code]
        for idx, item in enumerate(iter_items, start=6):
            uc_id, screen_func, feature, actor, desc, in_charge, status, actual_iter, updated_iter, update_details, srs_ref, sds_ref, iter_note = item
            note_text = update_details if (updated_iter == iter_code and update_details) else iter_note
            row_vals = [
                idx - 5,
                screen_func,
                feature,
                desc,
                in_charge,
                "Done",
                srs_ref,
                sds_ref,
                note_text
            ]
            for c, val in enumerate(row_vals, start=1):
                cell = ws.cell(idx, c, val)
                cell.font = font_cell
                cell.border = border
                cell.alignment = Alignment(horizontal="center" if c in (1, 5, 6, 7, 8) else "left", vertical="top", wrap_text=True)
                if c == 6:
                    cell.fill = done_fill
            ws.row_dimensions[idx].height = 36

        iter_widths = [6, 36, 28, 56, 14, 12, 12, 12, 40]
        for c, w in enumerate(iter_widths, start=1):
            ws.column_dimensions[get_column_letter(c)].width = w

    out1 = r'd:\Motorent\docs\MOTORENT_Final_Product_Backlog.xlsx'
    out2 = r'd:\Motorent\docs\MOTORENT_Project_Tracking.xlsx'
    wb.save(out1)
    shutil.copyfile(out1, out2)
    print("Updated Product Backlog & Project Tracking:", out1, out2)


# ==============================================================================
# 2. UPDATE RDS / SRS WITH SECTION IV.4 APPLICATION MESSAGES LIST (MSG01..MSG26)
# ==============================================================================
def update_rds_with_messages_list():
    rds_path = r'd:\Motorent\docs\MOTORENT_RDS_Final.docx'
    doc = docx.Document(rds_path)

    # Check if '4. Application Messages List' already exists
    already_has_msg = any("Application Messages List" in p.text for p in doc.paragraphs)
    if not already_has_msg:
        doc.add_heading("4. Application Messages List", level=2)
        p_intro = doc.add_paragraph("The table below defines all standardized validation, toast, inline, and pop-up system messages (MSG01 – MSG26) referenced by the Business Rules across all modules of MOTORENT.")
        p_intro.runs[0].font.name = "Times New Roman"
        p_intro.runs[0].font.size = Pt(11)

        msg_rows = [
            ["1", "MSG01", "In line", "Invalid email format when user fills out the email field", "Sai định dạng email. Vui lòng nhập email hợp lệ."],
            ["2", "MSG02", "In line", "Password does not meet the minimum length of 8 characters", "Mật khẩu phải từ 8 ký tự trở lên."],
            ["3", "MSG03", "Toast message", "Email is already used when attempting to register", "Email này đã được sử dụng để đăng ký tài khoản."],
            ["4", "MSG04", "Toast message", "Login failed due to incorrect email or password credentials", "Đăng nhập thất bại. Email hoặc mật khẩu không chính xác."],
            ["5", "MSG05", "Toast message", "Login succeeded with valid credentials or Google OAuth2", "Đăng nhập hệ thống thành công."],
            ["6", "MSG06", "Toast message", "Account temporarily locked after 6 consecutive failed login attempts (BR-13)", "Tài khoản tạm khóa 30 phút do nhập sai mật khẩu quá 6 lần."],
            ["7", "MSG07", "Toast message", "Email has not been registered when requesting password recovery", "Email chưa được đăng ký trong hệ thống MOTORENT."],
            ["8", "MSG08", "Toast message", "OTP / Reset link sent successfully to user's email", "Đã gửi mã xác thực OTP về email của bạn."],
            ["9", "MSG09", "Toast message", "OTP verified successfully during registration or password reset", "Xác thực mã OTP thành công."],
            ["10", "MSG10", "Toast message", "OTP verification failed or expired", "Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại."],
            ["11", "MSG11", "In line", "Re-entered confirmation password does not match new password", "Mật khẩu nhập lại không trùng khớp."],
            ["12", "MSG12", "Toast message", "No motorbikes or branches match the selected filter criteria", "Không tìm thấy xe phù hợp với bộ lọc hiện tại."],
            ["13", "MSG13", "In line", "Required booking or eKYC form fields are incomplete", "Vui lòng điền đầy đủ thông tin bắt buộc và tải đủ ảnh CCCD/GPLX."],
            ["14", "MSG14", "Toast message", "Customer profile and eKYC documents uploaded successfully", "Cập nhật hồ sơ và gửi yêu cầu xác thực eKYC thành công."],
            ["15", "MSG15", "Toast message", "Vehicle overlap conflict detected during booking or extension (BR-03)", "Xe đã có lịch đặt hoặc đang bảo dưỡng trong khung giờ này."],
            ["16", "MSG16", "Toast message", "Single or Multi-Vehicle Cart booking created, redirecting to VNPay", "Khởi tạo hợp đồng giữ chỗ thành công. Đang chuyển hướng cổng VNPay."],
            ["17", "MSG17", "Toast message", "30% VNPay deposit payment verified via HMAC-SHA512 checksum", "Thanh toán đặt cọc 30% qua VNPay thành công. Đơn đặt xe đã xác nhận."],
            ["18", "MSG18", "Toast message", "VNPay payment cancelled or failed checksum verification", "Thanh toán không thành công. Đơn giữ chỗ tạm thời đã được hủy tự động."],
            ["19", "MSG19", "Toast message", "Booking cancelled and deposit refund calculated per BR-06 tiers", "Đã hủy chuyến thành công. Yêu cầu hoàn cọc đã được ghi nhận theo chính sách."],
            ["20", "MSG20", "Toast message", "5-point Counter Check-in handover completed by Staff", "Bàn giao xe (Check-in) thành công. Hợp đồng chuyển sang trạng thái Đang thuê."],
            ["21", "MSG21", "Toast message", "Cross-branch Counter Check-out & penalty settlement completed", "Nhận xe trả (Check-out) và tất toán hợp đồng thành công."],
            ["22", "MSG22", "Pop up message", "Automated ODO maintenance threshold alert (>= 3,000 km per BR-10)", "Cảnh báo ODO: Xe đã vượt mốc 3.000 km cần lên lịch bảo dưỡng định kỳ."],
            ["23", "MSG23", "Toast message", "Inter-branch vehicle transfer request approved by Branch Manager", "Đã phê duyệt lệnh điều chuyển xe liên chi nhánh thành công."],
            ["24", "MSG24", "Toast message", "Loyalty points redeemed for discount voucher (BR-11)", "Đổi điểm thưởng Loyalty lấy mã giảm giá thành công."],
            ["25", "MSG25", "Pop up message", "Real-time Socket.IO notification for new live chat message", "Bạn có tin nhắn hỗ trợ mới từ chi nhánh MOTORENT."],
            ["26", "MSG26", "Toast message", "Admin locked/unlocked user account or updated RBAC policy", "Cập nhật trạng thái tài khoản và phân quyền hệ thống thành công."],
        ]

        tbl = doc.add_table(rows=1 + len(msg_rows), cols=5)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
            f'<w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
            f'<w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
            f'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
            f'</w:tblBorders>'
        )
        tbl._tbl.tblPr.append(borders)
        headers = ["#", "Message Code", "Message Type", "Context", "Content"]
        for c_i, h in enumerate(headers):
            cell = tbl.rows[0].cells[c_i]
            cell.text = ""
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(h)
            r.bold = True
            r.font.name = "Times New Roman"
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(255, 255, 255)
            cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="1F4E78"/>'))

        for r_i, row_data in enumerate(msg_rows, start=1):
            for c_i, val in enumerate(row_data):
                cell = tbl.rows[r_i].cells[c_i]
                cell.text = ""
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 1, 2) else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(10)
                r.bold = (c_i == 1)

        doc.save(rds_path)
        shutil.copyfile(rds_path, r'd:\Motorent\docs\MOTORENT_SRS_Final.docx')
        shutil.copyfile(rds_path, r'd:\Motorent\docs\MOTORENT_RDS_Document.docx')
        print("Added Section IV.4 Application Messages List (MSG01..MSG26) to RDS/SRS")


# ==============================================================================
# 3. GENERATEannotated STEP-BY-STEP SCREENSHOTS WITH RED CALLOUT BOXES
#    FOR FINAL RELEASE DOCUMENT USER MANUAL (MATCHING JOBTRANS SAMPLE!)
# ==============================================================================
def get_font(size=13, bold=False):
    for name in (["arialbd.ttf", "segoeuib.ttf", "calibrib.ttf"] if bold else ["arial.ttf", "segoeui.ttf", "calibri.ttf"]):
        p = os.path.join(r"C:\Windows\Fonts", name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def draw_red_callout(d, box, label=None):
    # Thick red callout rectangle like JobTrans User Manual screenshots
    x1, y1, x2, y2 = box
    for offset in range(3):
        d.rectangle([x1 - offset, y1 - offset, x2 + offset, y2 + offset], outline="#EF4444")
    if label:
        d.rounded_rectangle([x1, max(4, y1 - 24), x1 + len(label) * 7 + 16, y1 - 2], radius=4, fill="#EF4444")
        d.text((x1 + 8, max(6, y1 - 21)), label, fill="#FFFFFF", font=get_font(11, True))

def make_step_screen(filename, role_badge, url, section_title, elements, red_boxes):
    W, H = 1040, 480
    img = Image.new("RGB", (W, H), "#0F1115")
    d = ImageDraw.Draw(img)
    # Browser bar
    d.rectangle([0, 0, W, 36], fill="#181B22")
    for idx, col in enumerate(["#EF4444", "#F59E0B", "#10B981"]):
        d.ellipse([14 + idx * 18, 12, 24 + idx * 18, 22], fill=col)
    d.rounded_rectangle([80, 6, W - 160, 30], radius=5, fill="#0F1115", outline="#2A2F3D")
    d.text((94, 10), url, fill="#9CA3AF", font=get_font(11))
    # Top Navbar
    d.rectangle([0, 36, W, 82], fill="#13161C", outline="#262A34")
    d.rounded_rectangle([20, 46, 46, 72], radius=6, fill="#F59E0B")
    d.text((27, 50), "M", fill="#0F1115", font=get_font(15, True))
    d.text((56, 51), "MOTORENT DA NANG", fill="#FFFFFF", font=get_font(15, True))
    d.text((255, 53), "Trang chu    Doi xe & Bang gia    Chi nhanh    Quy trinh    Chuyen cua toi (6)    [Gio xe]", fill="#D1D5DB", font=get_font(12))
    d.rounded_rectangle([W - 175, 47, W - 20, 73], radius=10, fill="#1F2430", outline="#F59E0B")
    d.text((W - 162, 53), role_badge, fill="#F59E0B", font=get_font(11, True))

    # Main content container
    d.rounded_rectangle([24, 96, W - 24, H - 18], radius=10, fill="#171A21", outline="#2B303C")
    d.text((44, 112), section_title, fill="#F59E0B", font=get_font(15, True))

    for el in elements:
        etype = el[0]
        if etype == "box":
            _, bx, by, bw, bh, bg, outline, title, subtitle = el
            d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=8, fill=bg, outline=outline)
            if title:
                d.text((bx + 14, by + 10), title, fill="#FFFFFF", font=get_font(12, True))
            if subtitle:
                d.text((bx + 14, by + 32), subtitle, fill="#9CA3AF", font=get_font(11))
        elif etype == "btn":
            _, bx, by, bw, bh, bg, fg, label = el
            d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=7, fill=bg)
            d.text((bx + 16, by + (bh - 16) // 2), label, fill=fg, font=get_font(12, True))
        elif etype == "text":
            _, tx, ty, col, sz, bld, txt = el
            d.text((tx, ty), txt, fill=col, font=get_font(sz, bld))

    for rbox, rlabel in red_boxes:
        draw_red_callout(d, rbox, rlabel)

    out_p = os.path.join(STEP_IMG_DIR, filename)
    img.save(out_p)
    return out_p

def generate_all_manual_step_images():
    paths = {}
    # 1. Guest Search & Filter Fleet
    paths["guest_fleet"] = make_step_screen(
        "step_guest_fleet.png", "Guest / Khach", "https://motorent.vn/fleet — Browse, Search & Filter Motorbike Catalog",
        "DOI XE & BANG GIA THUE XE MAY DA NANG (UC-02)",
        [
            ("box", 44, 146, 230, 300, "#0F1115", "#374151", "BO LOC TIM KIEM XE", "Chi nhanh / Loai xe / Gia thue"),
            ("text", 58, 188, "#D1D5DB", 12, False, "• Chi nhanh: Tat ca (3 tram)\n• Loai xe: Xe tay ga (Scooter)\n• Hang xe: Honda / Yamaha\n• Khoang gia: 80k - 250k/ngay\n• Trang thai: Chi hien xe San sang"),
            ("box", 294, 146, 340, 142, "#0F1115", "#2B303C", "Honda AirBlade 160 ABS (2025)", "Bien so: 43-C1 888.99  |  180.000 d/ngay"),
            ("btn", 310, 240, 145, 34, "#F59E0B", "#0F1115", "Dat xe ngay ->"),
            ("btn", 468, 240, 150, 34, "#1F2937", "#FFFFFF", "+ Them vao Gio xe"),
            ("box", 654, 146, 340, 142, "#0F1115", "#2B303C", "Yamaha Exciter 155 VVA (2025)", "Bien so: 43-D1 666.77  |  200.000 d/ngay"),
            ("btn", 670, 240, 145, 34, "#F59E0B", "#0F1115", "Dat xe ngay ->"),
            ("btn", 828, 240, 150, 34, "#1F2937", "#FFFFFF", "+ Them vao Gio xe"),
            ("box", 294, 304, 700, 142, "#0F1115", "#374151", "Honda Wave Alpha / RSX (2024) — Tiết kiệm xăng 1.8L/100km", "Bien so: 43-C1 238.53  |  Don gia: 80.000 d/ngay  |  Chi nhanh San Bay Da Nang"),
        ],
        [([340, 48, 465, 74], "Step 1: Click Doi xe & Bang gia"), ([44, 146, 274, 446], "Step 2: Chon tieu chi loc"), ([306, 236, 459, 278], "Step 3: Click Dat xe ngay")]
    )

    # 2. Guest Interactive Branch Map
    paths["guest_branches"] = make_step_screen(
        "step_guest_branches.png", "Guest / Khach", "https://motorent.vn/branches — Interactive GPS Map & Nearest Branch Finder",
        "HE THONG 3 CHI NHANH DA NANG & BAN DO GPS TUONG TAC (UC-01, UC-13)",
        [
            ("box", 44, 146, 360, 92, "#0F1115", "#F59E0B", "1. CN San Bay Quoc Te Da Nang", "Cong Ga Quoc Te, Duy Tan  |  06:00-23:00  |  9 xe san sang"),
            ("box", 44, 250, 360, 92, "#0F1115", "#374151", "2. CN Bien My Khe (Son Tra)", "Vo Nguyen Giap, Phuoc My  |  07:00-22:00  |  7 xe san sang"),
            ("box", 44, 354, 360, 92, "#0F1115", "#374151", "3. CN Cau Rong (Hai Chau)", "Bach Dang, Hai Chau  |  07:00-22:00  |  5 xe san sang"),
            ("box", 424, 146, 570, 300, "#111827", "#10B981", "LEAFLET INTERACTIVE GPS MAP (16.0538° N, 108.1994° E)", "Camera tu dong FlyTo den vi tri tram khi click vao the Chi nhanh ben trai"),
            ("btn", 445, 392, 230, 38, "#10B981", "#0F1115", "Tim tram gan vi tri GPS cua toi"),
        ],
        [([44, 146, 404, 238], "Step 1: Click chon Chi nhanh"), ([445, 392, 675, 430], "Step 2: Tim tram gan nhat theo GPS")]
    )

    # 3. Register & OTP
    paths["user_register"] = make_step_screen(
        "step_user_register.png", "Guest -> Register", "https://motorent.vn/register — Account Registration & 6-Digit Email OTP Verification",
        "DANG KY TAI KHOAN MOI & XAC THUC MA OTP EMAIL (UC-05)",
        [
            ("box", 44, 146, 450, 300, "#0F1115", "#374151", "BIEU MAU DANG KY TAI KHOAN KHACH HANG", "Nhap Ho ten, Email duy nhat, So dien thoai va Mat khau >= 8 ky tu"),
            ("text", 64, 196, "#E5E7EB", 12, False, "Ho va ten:   [ Nguyen Van Khach                   ]\nEmail:       [ khachhang@motorent.vn              ]\nDien thoai:  [ 0905 123 456                       ]\nMat khau:    [ ••••••••••••                       ]"),
            ("btn", 64, 388, 410, 40, "#F59E0B", "#0F1115", "DANG KY & NHAN MA OTP QUA EMAIL"),
            ("box", 524, 146, 470, 300, "#0F1115", "#10B981", "XAC THUC MA OTP 6 SO (EMAIL VERIFICATION)", "Ma xac thuc 6 chu so da duoc gui den email khachhang@motorent.vn"),
            ("text", 560, 230, "#F59E0B", 22, True, " [ 4 ]  [ 8 ]  [ 2 ]  [ 9 ]  [ 1 ]  [ 6 ] "),
            ("btn", 554, 388, 410, 40, "#10B981", "#0F1115", "XAC MINH OTP & KICH HOAT TAI KHOAN"),
        ],
        [([64, 190, 474, 370], "Step 1: Dien thong tin dang ky"), ([64, 388, 474, 428], "Step 2: Click Dang ky"), ([554, 388, 964, 428], "Step 3: Nhap 6 so OTP & Xac minh")]
    )

    # 4. Login (Email & Google OAuth2)
    paths["user_login"] = make_step_screen(
        "step_user_login.png", "Login / OAuth2", "https://motorent.vn/login — Login with Email/Password or 1-Click Google OAuth 2.0",
        "DANG NHAP HE THONG BANG EMAIL HOAC GOOGLE OAUTH 2.0 (UC-06)",
        [
            ("box", 44, 146, 450, 300, "#0F1115", "#374151", "CACH 1: DANG NHAP BANG EMAIL & MAT KHAU", "Nhap Email va Mat khau da dang ky"),
            ("text", 64, 198, "#E5E7EB", 12, False, "Dia chi Email:   [ customer1@motorent.vn          ]\nMat khau:        [ ••••••••••••                   ]\n[x] Ghi nho dang nhap          Quen mat khau?"),
            ("btn", 64, 320, 410, 40, "#F59E0B", "#0F1115", "DANG NHAP HE THONG ->"),
            ("btn", 64, 380, 410, 40, "#FFFFFF", "#111827", "[G]   Dang nhap bang Google (OAuth 2.0)"),
            ("box", 524, 146, 470, 300, "#0F1115", "#3B82F6", "CACH 2: CHON TAI KHOAN GOOGLE (GIS POPUP)", "Google Identity Services xac thuc ID Token & tu dong dong bo tai khoan"),
            ("text", 548, 204, "#E5E7EB", 12, False, "• Nguyen Van Khach (customer1@gmail.com)\n• Hoang Bui (hoangbh@fpt.edu.vn)\n• Su dung mot tai khoan Google khac..."),
            ("btn", 554, 380, 410, 40, "#3B82F6", "#FFFFFF", "Continue as Nguyen Van Khach ->"),
        ],
        [([64, 320, 474, 360], "Step 1a: Click Dang nhap"), ([64, 380, 474, 420], "Step 1b: Click Dang nhap bang Google"), ([554, 380, 964, 420], "Step 2: Chon tai khoan Google")]
    )

    # 5. Profile & eKYC Upload
    paths["user_ekyc"] = make_step_screen(
        "step_user_ekyc.png", "Customer Profile", "https://motorent.vn/profile — Edit Personal Profile, Change Password & Upload eKYC",
        "QUAN LY HO SO CA NHAN & TAI ANH XAC THUC eKYC CCCD/GPLX (UC-09, UC-10)",
        [
            ("box", 44, 146, 440, 300, "#0F1115", "#374151", "THONG TIN CA NHAN & DOI MAT KHAU", "Chinh sua Ho ten, So dien thoai, Ngay sinh, Anh dai dien"),
            ("text", 64, 196, "#E5E7EB", 12, False, "Ho va ten:   Nguyen Van Khach\nDien thoai:  0905 123 456\nHang the:    GOLD (450 Loyalty Points)\nMa gioi thieu: MR-KHACH88"),
            ("btn", 64, 388, 195, 38, "#F59E0B", "#0F1115", "Luu thay doi ho so"),
            ("btn", 274, 388, 190, 38, "#1F2937", "#FFFFFF", "Doi mat khau (UC-11)"),
            ("box", 504, 146, 490, 300, "#0F1115", "#10B981", "XAC THUC DANH TINH DIEN TU (eKYC - CCCD & BANG LAI A1/A2)", "Trang thai hien tai: VERIFIED (Da duoc nhan vien xac thuc)"),
            ("box", 524, 200, 215, 110, "#171A21", "#10B981", "Anh CCCD Mat truoc/sau", "cccd_verified.jpg (Da tai len)"),
            ("box", 759, 200, 215, 110, "#171A21", "#10B981", "Anh GPLX Hang A1/A2", "gplx_a1_verified.jpg (Da tai len)"),
            ("btn", 524, 388, 450, 38, "#10B981", "#0F1115", "Gui Ho so Xac thuc eKYC (Submit eKYC)"),
        ],
        [([524, 200, 974, 310], "Step 1: Tai anh CCCD & GPLX A1/A2"), ([524, 388, 974, 426], "Step 2: Click Gui Ho so Xac thuc eKYC")]
    )

    # 6. Single & Multi-Vehicle Cart Booking + VNPay Deposit
    paths["customer_booking_vnpay"] = make_step_screen(
        "step_customer_booking_vnpay.png", "Customer Booking", "https://motorent.vn/booking — 4-Step Booking Wizard, Multi-Vehicle Cart & 30% VNPay Deposit",
        "DAT XE 4 BUOC, GIO XE NHIEU CHIEC (CART) & THANH TOAN COC 30% VNPAY (UC-14, UC-15)",
        [
            ("box", 44, 146, 520, 300, "#0F1115", "#F59E0B", "BUOC 1-4: CHON NGAY NHAN/TRA XE LIEN TRAM & GIO XE", "Ma nhom hop dong: CART-2XE-MV-A6F960  |  Tra xe tai: CN Bien My Khe"),
            ("text", 64, 198, "#E5E7EB", 12, False, "• Nhan xe: 08:30 03/11/2026 tai CN San Bay Quoc Te Da Nang\n• Tra xe:  18:00 05/11/2026 tai CN Bien My Khe (Mien phi lien tram)\n• Xe 1: Honda AirBlade 160 (43-C1 888.99) — 540.000 d\n• Xe 2: Yamaha Exciter 155 (43-D1 666.77) — 600.000 d\n• Voucher: [ DANANG50 ] (-50.000 d)  |  Tong hop dong: 1.090.000 d"),
            ("btn", 64, 388, 480, 40, "#F59E0B", "#0F1115", "XAC NHAN DAT XE & THANH TOAN COC 30% (327.000 d) ->"),
            ("box", 584, 146, 410, 300, "#0F1115", "#10B981", "CONG THANH TOAN VNPAY SANDBOX (TEST GATEWAY)", "Xac thuc chu ky HMAC-SHA512 & tu dong xac nhan tat ca xe trong Cart"),
            ("text", 604, 200, "#E5E7EB", 12, False, "Ngan hang:       NCB (Ngan hang Quoc Dan)\nSo the Sandbox:  9704198526191432198\nTen chu the:     NGUYEN VAN A\nNgay phat hanh:  07/15\nMa OTP Sandbox:  123456"),
            ("btn", 604, 388, 370, 40, "#10B981", "#0F1115", "XAC NHAN THANH TOAN VNPAY (327.000 VND)"),
        ],
        [([64, 194, 544, 245], "Step 1: Chon tram nhan & tram tra"), ([64, 388, 544, 428], "Step 2: Click Thanh toan coc 30%"), ([604, 388, 974, 428], "Step 3: Nhap the NCB & Xac nhan OTP")]
    )

    # 7. Customer My Bookings (Extend, Cancel Mid-Rental, Download PDF, Review)
    paths["customer_my_bookings"] = make_step_screen(
        "step_customer_my_bookings.png", "Customer Trips", "https://motorent.vn/my-bookings — Track Status, Extend Rental, Early Cancel, PDF Invoice & Review",
        "QUAN LY CHUYEN CUA TOI: GIA HAN, HUY CHUYEN SOM, HOA DON PDF & DANH GIA (UC-16..UC-21)",
        [
            ("box", 44, 146, 950, 140, "#0F1115", "#10B981", "Hop dong #MV-849201 — Honda AirBlade 160 (43-C1 888.99)   [TRANG THAI: ONGOING - DANG THUE]", "Nhan: 03/11/2026 (CN San Bay)  ->  Tra du kien: 05/11/2026 (CN Bien My Khe)  |  Da coc 30%: 327.000 d"),
            ("btn", 64, 232, 180, 38, "#3B82F6", "#FFFFFF", "Gia han thue (UC-17)"),
            ("btn", 260, 232, 230, 38, "#EF4444", "#FFFFFF", "Huy chuyen / Tra som (UC-16)"),
            ("btn", 506, 232, 210, 38, "#F59E0B", "#0F1115", "Tai Hoa don PDF (UC-19)"),
            ("btn", 732, 232, 240, 38, "#1F2937", "#FFFFFF", "Chat Ho tro Chi nhanh (UC-22)"),
            ("box", 44, 304, 950, 140, "#0F1115", "#374151", "Hop dong #MV-710482 — Yamaha Grande Hybrid (43-E1 112.34)   [TRANG THAI: COMPLETED - DA HOAN THANH]", "Da hoan tra tai CN Cau Rong  |  Diem thuong nhan duoc: +45 Loyalty Points (UC-24)"),
            ("btn", 64, 390, 240, 38, "#10B981", "#0F1115", "Danh gia Xe 5 Sao (UC-20)"),
            ("btn", 320, 390, 240, 38, "#F59E0B", "#0F1115", "Gui Khieu nai Dich vu (UC-21)"),
            ("btn", 576, 390, 240, 38, "#3B82F6", "#FFFFFF", "Doi diem Voucher (UC-24)"),
        ],
        [([64, 232, 244, 270], "Gia han thue"), ([260, 232, 490, 270], "Huy don / Huy giua chung"), ([506, 232, 716, 270], "Tai Hoa don PDF"), ([64, 390, 304, 428], "Danh gia 5 sao")]
    )

    # 8. Staff Counter Check-in & Cross-Branch Check-out
    paths["staff_counter"] = make_step_screen(
        "step_staff_counter.png", "Staff Counter", "https://motorent.vn/staff/counter — 5-Point Check-in Handover & Cross-Branch Check-out",
        "QUAY GIAO NHAN XE: CHECK-IN 5 BUOC & CHECK-OUT TRA XE LIEN TRAM (UC-26..UC-30)",
        [
            ("box", 44, 146, 460, 300, "#0F1115", "#10B981", "1. BAN GIAO XE TAI QUAY (5-POINT CHECK-IN - UC-27)", "Don #MV-849201 | Khach: Nguyen Van Khach | Xe: 43-C1 888.99"),
            ("text", 64, 198, "#E5E7EB", 11, False, "[x] Buoc 1: Doi chieu CCCD & GPLX A1 ban goc (Verified)\n[x] Buoc 2: Thu 70% tien thue con lai tai quay (763.000 d)\n[x] Buoc 3: Tai len 4 anh chup 4 goc xe truoc khi giao\n[x] Buoc 4: Nhap ODO bat dau (12.450 km) & Muc xang (100%)\n[x] Buoc 5: Khach hang ky ten dien tu tren Canvas"),
            ("btn", 64, 388, 420, 40, "#10B981", "#0F1115", "XAC NHAN BAN GIAO XE (STATUS -> ONGOING)"),
            ("box", 524, 146, 470, 300, "#0F1115", "#F59E0B", "2. NHAN XE TRA LIEN TRAM & TAT TOAN (CHECK-OUT - UC-28)", "Tram nhan: San Bay Da Nang -> Tram tra thuc te: CN Bien My Khe"),
            ("text", 544, 198, "#E5E7EB", 11, False, "• Tai len 4 anh xe luc tra & Nhap ODO ket thuc: 12.680 km\n• Tu dong cap nhat Vehicle.branchId -> CN Bien My Khe\n• Phu phi tra tre (BR-08): 2 gio x 30.000 d = 60.000 VND\n• Phu phi hu hong (UC-29): 0 VND  |  Cong +109 Loyalty Points"),
            ("btn", 544, 388, 430, 40, "#F59E0B", "#0F1115", "HOAN TAT NHAN XE & DONG HOP DONG (COMPLETED)"),
        ],
        [([64, 388, 484, 428], "Step 1: Xac nhan Check-in giao xe"), ([544, 388, 974, 428], "Step 2: Xac nhan Check-out tra xe lien tram")]
    )

    # 9. Branch Manager Fleet, Maintenance, Transfer & Shift Schedule
    paths["manager_fleet"] = make_step_screen(
        "step_manager_fleet.png", "Branch Manager", "https://motorent.vn/manager — Fleet CRUD, ODO Maintenance, Transfers & Shift Calendar",
        "QUAN LY CHI NHANH: DOI XE, BAO DUONG ODO, DIEU CHUYEN & LICH TRUC (UC-33..UC-42)",
        [
            ("box", 44, 146, 460, 300, "#0F1115", "#F59E0B", "QUAN LY DOI XE & CANH BAO BAO DUONG ODO 3.000 KM", "Chi nhanh San Bay Quoc Te Da Nang (21 xe)"),
            ("text", 64, 198, "#E5E7EB", 11, False, "• 43-C1 888.99 (AirBlade 160) — Available — ODO: 2.450/3.000 km\n• 43-C1 238.53 (Wave Alpha)   — Maintenance — ODO: 3.120/3.000 km [!]\n• 43-D1 666.77 (Exciter 155)  — Rented    — ODO: 1.890/3.000 km"),
            ("btn", 64, 336, 200, 38, "#10B981", "#0F1115", "+ Them xe moi (UC-33)"),
            ("btn", 280, 336, 205, 38, "#F59E0B", "#0F1115", "+ Tao lich Bao duong (UC-38)"),
            ("btn", 64, 388, 420, 38, "#3B82F6", "#FFFFFF", "Duyet Don dat xe & Hoan coc (UC-36, UC-37)"),
            ("box", 524, 146, 470, 300, "#0F1115", "#374151", "DIEU CHUYEN XE LIEN TRAM & LICH TRUC NHAN VIEN", "Quan ly dieu phoi xe giua 3 chi nhanh & Xep ca Sang/Chieu/Toi"),
            ("text", 544, 198, "#E5E7EB", 11, False, "• Lenh #TF-04: Dieu chuyen 2 xe tu San Bay -> Cau Rong [Approved]\n• Lich truc Ca Sang (07:00-15:00): NV Tran Van Phuc (On-time)\n• Lich truc Ca Chieu (15:00-22:00): NV Le Thi Mai (On-time)"),
            ("btn", 544, 336, 210, 38, "#10B981", "#0F1115", "Duyet Dieu chuyen (UC-39)"),
            ("btn", 768, 336, 205, 38, "#F59E0B", "#0F1115", "Xep ca Nhan vien (UC-41)"),
            ("btn", 544, 388, 430, 38, "#1F2937", "#FFFFFF", "Xuat Bao cao Doanh thu Excel / PDF (UC-42)"),
        ],
        [([64, 336, 264, 374], "Them xe moi"), ([280, 336, 485, 374], "Tao nhanh Bao duong ODO"), ([544, 336, 754, 374], "Duyet dieu chuyen xe"), ([544, 388, 974, 426], "Xuat Bao cao Excel/PDF")]
    )

    # 10. System Admin User Ban/Unban, Branch CRUD, KPI & Audit Log
    paths["admin_dashboard"] = make_step_screen(
        "step_admin_dashboard.png", "System Admin", "https://motorent.vn/admin — User Ban/Unban, Branch CRUD, Executive KPI & Security Audit",
        "QUAN TRI HE THONG: QUAN LY NGUOI DUNG (CHAN/MO KHOA), CHI NHANH, KPI & AUDIT LOG (UC-43..UC-50)",
        [
            ("box", 44, 146, 460, 300, "#0F1115", "#3B82F6", "QUAN LY NGUOI DUNG & PHAN QUYEN RBAC (UC-45)", "Danh sach tai khoan Customer / Staff / Branch Manager"),
            ("text", 64, 198, "#E5E7EB", 11, False, "1. manager.airport@motorent.vn  | BranchManager | Dang hoat dong\n2. staff.airport@motorent.vn    | Staff         | Dang hoat dong\n3. customer1@motorent.vn        | Customer      | Dang hoat dong\n4. spammer@gmail.com            | Customer      | Da bi khoa (Locked)"),
            ("btn", 64, 336, 200, 38, "#EF4444", "#FFFFFF", "Chan / Khoa TK (Ban)"),
            ("btn", 280, 336, 205, 38, "#10B981", "#0F1115", "Mo khoa TK (Unban)"),
            ("btn", 64, 388, 420, 38, "#F59E0B", "#0F1115", "Quan ly Chi nhanh, Danh muc Xe & Voucher (UC-43, UC-47)"),
            ("box", 524, 146, 470, 300, "#0F1115", "#10B981", "EXECUTIVE KPI DASHBOARD, DOI SOAT VNPAY & AUDIT LOG", "Tong doanh thu chuoi: 148.500.000 VND (+18.4%)  |  Lap day: 84.2%"),
            ("text", 544, 198, "#E5E7EB", 11, False, "• CN San Bay Da Nang: 64.2M (43.2%) | CN My Khe: 49.8M (33.5%)\n• Doi soat VNPay IPN (UC-50): Khop 100% giao dich dat coc\n• AuditLog (UC-46): Tu dong che giau passwordHash/token nhay cam"),
            ("btn", 544, 336, 210, 38, "#3B82F6", "#FFFFFF", "Xem Audit Log (UC-46)"),
            ("btn", 768, 336, 205, 38, "#10B981", "#0F1115", "Doi soat VNPay (UC-50)"),
            ("btn", 544, 388, 430, 38, "#1F2937", "#FFFFFF", "Quan tri Banner Slider & Trang tinh CMS (UC-49)"),
        ],
        [([64, 336, 264, 374], "Step 1: Chan (Ban) User"), ([280, 336, 485, 374], "Step 2: Mo khoa (Unban) User"), ([544, 336, 754, 374], "Step 3: Kiem tra Audit Log"), ([768, 336, 973, 374], "Step 4: Doi soat VNPay")]
    )
    return paths


# ==============================================================================
# 4. REBUILD FINAL RELEASE DOCUMENT MATCHING JOBTRANS ROLE-BY-ROLE USER MANUAL
# ==============================================================================
def set_cell_shading(cell, color_hex):
    cell._tc.get_or_add_tcPr().append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'))

def set_table_borders(table, color="BFBFBF", sz="4"):
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    table._tbl.tblPr.append(borders)

def format_cell(cell, text, bold=False, size=10, color=None, align=WD_ALIGN_PARAGRAPH.LEFT, bg=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(str(text))
    run.font.name = "Times New Roman"
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    if bg:
        set_cell_shading(cell, bg)

def add_styled_table(doc, headers, rows, col_widths=None, hdr_bg="1F4E78", hdr_fg=(255, 255, 255)):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl)
    for c_idx, h in enumerate(headers):
        format_cell(tbl.rows[0].cells[c_idx], h, bold=True, size=10, color=hdr_fg, align=WD_ALIGN_PARAGRAPH.CENTER, bg=hdr_bg)
        if col_widths and c_idx < len(col_widths):
            tbl.rows[0].cells[c_idx].width = Inches(col_widths[c_idx])
    for r_idx, r_data in enumerate(rows, start=1):
        bg = "F9FAFB" if r_idx % 2 == 0 else None
        for c_idx, val in enumerate(r_data):
            align = WD_ALIGN_PARAGRAPH.CENTER if (c_idx == 0 and len(str(val)) <= 12) else WD_ALIGN_PARAGRAPH.LEFT
            format_cell(tbl.rows[r_idx].cells[c_idx], val, bold=(c_idx == 0 and len(headers) == 2), size=10, align=align, bg=bg)
            if col_widths and c_idx < len(col_widths):
                tbl.rows[r_idx].cells[c_idx].width = Inches(col_widths[c_idx])
    return tbl

def add_para(doc, text="", bold=False, italic=False, size=11, color=None, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=5):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    if text:
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(size)
        r.bold = bold
        r.italic = italic
        if color:
            r.font.color.rgb = RGBColor(*color)
    return p

def add_img_with_caption(doc, img_path, caption_text):
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture(img_path, width=Inches(6.1))
        add_para(doc, caption_text, italic=True, size=10, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

def build_jobtrans_style_final_release_doc(step_imgs):
    doc = docx.Document()
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.95)
        section.right_margin = Inches(0.85)

    # Cover Page matching JobTrans Final Release Document
    if os.path.exists(LOGO_PATH):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.add_run().add_picture(LOGO_PATH, width=Inches(2.3))

    add_para(doc, "TRƯỜNG ĐẠI HỌC FPT", bold=True, size=14, color=(243, 112, 33), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=16)
    add_para(doc, "MOTORENT - MOTORBIKE RENTAL CHAIN MANAGEMENT SYSTEM", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)
    add_para(doc, "Final Release Document", bold=True, size=24, color=(31, 78, 120), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=14)
    add_para(doc, "– Danang, November 2026 –", bold=True, italic=True, size=12, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24)
    doc.add_page_break()

    # Table of Contents matching JobTrans Final Release Document
    doc.add_heading("Table of Contents", level=1)
    toc_lines = [
        "I. Deliverable Package",
        "II. Installation Guides",
        "III. User Manual",
        "   1. Overview",
        "   2. User Manual Guide for Guest",
        "      2.1. Search & Filter Motorbike Fleet",
        "      2.2. View Branch Locations on Interactive GPS Map",
        "      2.3. View Motorbike Details & Customer Reviews",
        "      2.4. Register New Account & Verify OTP",
        "   3. User Manual Guide for User (Common Account & Security)",
        "      3.1. Login (Login by Email/Password & Login by Google OAuth2)",
        "      3.2. Forgot Password & OTP Recovery",
        "      3.3. Change Password",
        "      3.4. View & Edit Personal Profile",
        "      3.5. Submit eKYC Identity Verification (CCCD & Driving License)",
        "   4. User Manual Guide for Customer (Booking, VNPay, Trip Management & Loyalty)",
        "      4.1. Book a Single Motorbike (4-Step Wizard) or Multi-Vehicle Cart",
        "      4.2. Pay 30% Deposit via VNPay Sandbox Gateway",
        "      4.3. Manage My Bookings & Real-Time Status Tracking",
        "      4.4. Extend Active Rental Period",
        "      4.5. Cancel Order & Mid-Rental Early Cancellation",
        "      4.6. Download Rental Contract & Invoice PDF",
        "      4.7. Rate & Review Motorbike, Submit Complaint & Live Chat",
        "      4.8. View Loyalty Points & Redeem Discount Vouchers",
        "   5. User Manual Guide for Staff (Counter Desk Operations)",
        "      5.1. Inspect Branch Rental Queue",
        "      5.2. Confirm Vehicle Handover (5-Point Counter Check-in)",
        "      5.3. Confirm Vehicle Return & Cross-Branch Check-out",
        "      5.4. Record Damage/Late Penalty Fees & Create Maintenance Ticket",
        "      5.5. Handle Customer Complaints & Reply Live Chat",
        "   6. User Manual Guide for Branch Manager & System Admin",
        "      6.1. Manage Branch Fleet (Add/Edit/Decommission Vehicle & Pricing)",
        "      6.2. Schedule ODO Maintenance & Coordinate Inter-Branch Transfers",
        "      6.3. Approve/Reject Bookings, Process Deposit Refunds & Assign Staff Shifts",
        "      6.4. Manage Users (View User List, Ban/Lock User, Unban/Unlock User)",
        "      6.5. Manage Branches, Categories, Vouchers, CMS & View Executive Dashboard / Audit Log",
    ]
    for line in toc_lines:
        add_para(doc, line, bold=not line.startswith(" "), size=10.5, space_after=2)
    doc.add_page_break()

    # I. Deliverable Package (Exact 6 rows like JobTrans sample)
    doc.add_heading("I. Deliverable Package", level=1)
    deliv_rows = [
        ["1", "Group4_MotoRent_DB_final (server/src/seed.ts)", "Database, including both 18-collection Mongoose schema structures and seed data"],
        ["2", "Group4_MotoRent_RDS_final.docx (MOTORENT_RDS_Final.docx)", "Final RDS (Requirement & Design) Document covering 50 UCs, 42 Screens, UI Mockups, and MSG01–MSG26"],
        ["3", "Group4_MotoRent_SDS_final.docx (MOTORENT_SDS_Final.docx)", "Final SDS (Software Design Specification) Document with Package, ER, Class & Sequence Diagrams"],
        ["4", "Group4_MotoRent_Final Product Backlog.xlsx (MOTORENT_Final_Product_Backlog.xlsx)",
         "Final status for the application functions, which include:\n- Function name, feature, roles, function description (changes compared to original requirements are highlighted)\n- In Charge, Planned iteration & Actual iteration, Effort Distribution\n- Final status & note on the update made\n- The links to the SRS (UC-01..UC-50) & SDS (1.1..9.8) are tracked"],
        ["5", "Group4_MotoRent_Issues Report.xlsx (MOTORENT_Issues_Report.xlsx)", "Final issues tracking list of the whole project (160 tasks/WPs/defects across iter1–iter4)"],
        ["6", "Group4_MotoRent_Project_Tracking.xlsx (MOTORENT_Project_Tracking.xlsx)", "Final project tracking for list working iterations (Iter1, Iter2, Iter3, Iter4) of the whole project"],
    ]
    add_styled_table(doc, ["No.", "File", "Notes"], deliv_rows, col_widths=[0.5, 2.5, 3.5])
    add_para(doc, "Other related deliverables:", bold=True, size=11)
    add_para(doc, "• Tagged source codes: https://github.com/Hoang-124/Motorent.git")
    add_para(doc, "• Demonstration video: https://github.com/Hoang-124/Motorent/releases/tag/v1.2-final")

    # II. Installation Guides
    doc.add_heading("II. Installation Guides", level=1)
    add_para(doc, "Set up Visual Studio Code, Git, Node.js (Recommend Node.js >= 20 LTS), and MongoDB Community Server >= 7.0 (or MongoDB Compass):")
    add_para(doc, "1. Clone repository from GitHub: git clone https://github.com/Hoang-124/Motorent.git")
    add_para(doc, "2. Install backend & frontend dependencies: cd server && npm install && cd ../client && npm install")
    add_para(doc, "3. Configure server/.env (MONGODB_URI, JWT_SECRET, VNP_TMNCODE, VNP_HASHSECRET, GOOGLE_CLIENT_ID) and client/.env (VITE_API_URL, VITE_GOOGLE_CLIENT_ID).")
    add_para(doc, "4. Seed sample database (3 Da Nang branches, 11 accounts, 21 motorbikes): cd server && npm run seed")
    add_para(doc, "5. Start backend & frontend servers: npm run dev in server/ (port 5000) and npm run dev in client/ (port 5173).")

    # III. User Manual
    doc.add_heading("III. User Manual", level=1)
    doc.add_heading("1. Overview", level=2)
    add_para(doc, "The MOTORENT project was built to modernize motorbike rental chain operations across Da Nang City (Da Nang International Airport, My Khe Beach, and Dragon Bridge). Traditional motorbike rental shops rely on paper contracts, manual odometer checks, and fragmented branch inventory, leading to double-booking conflicts and slow counter handovers. MOTORENT provides an end-to-end digital platform connecting Guests, Customers, Counter Staff, Branch Managers, and System Administrators with online 30% VNPay deposits, multi-vehicle cart reservations, 5-point counter check-in, cross-branch vehicle returns, and automated ODO maintenance alerts.")

    # 2. User Manual Guide for Guest
    doc.add_heading("2. User Manual Guide for Guest", level=2)
    doc.add_heading("2.1. Search & Filter Motorbike Fleet", level=3)
    add_para(doc, "This is the function to browse and filter the motorbike fleet catalog.")
    add_para(doc, "Step 1: Users access the MOTORENT platform at http://localhost:5173 and click [Đội xe & Bảng giá] on the top navigation bar.")
    add_para(doc, "Step 2: In the left filter sidebar, select Branch (Sân Bay / Mỹ Khê / Cầu Rồng), Category (Tay ga / Xe số / Côn tay / Xe điện), Brand, or Daily Price range.")
    add_para(doc, "Step 3: Click [Đặt xe ngay] on any available motorbike card to open the 4-step booking wizard, or click [+ Thêm vào Giỏ xe] to rent multiple motorbikes at once.")
    add_img_with_caption(doc, step_imgs["guest_fleet"], "Figure 2.1: Steps 1–3 in Search & Filter Motorbike Fleet")

    doc.add_heading("2.2. View Branch Locations on Interactive GPS Map", level=3)
    add_para(doc, "This is the function to view all active branches and locate the nearest station by GPS.")
    add_para(doc, "Step 1: On the header bar, click [Chi nhánh] to open the Da Nang branch directory and interactive Leaflet map.")
    add_para(doc, "Step 2: Click on any branch card on the left list to automatically fly the GPS map camera to that branch's marker, or click [Tìm trạm gần vị trí GPS của tôi] to sort branches by Haversine distance.")
    add_img_with_caption(doc, step_imgs["guest_branches"], "Figure 2.2: Steps 1–2 in View Branch Locations on Interactive GPS Map")

    doc.add_heading("2.3. Register New Account & Verify OTP", level=3)
    add_para(doc, "This is the function to register a new Customer account.")
    add_para(doc, "Step 1: On the header bar, click [Đăng ký] and fill in Full Name, Email, Phone Number, and Password (>= 8 characters).")
    add_para(doc, "Step 2: Click [Đăng ký & Nhận mã OTP] button.")
    add_para(doc, "Step 3: Enter the 6-digit OTP code sent to your email and click [Xác minh OTP] to activate the account.")
    add_img_with_caption(doc, step_imgs["user_register"], "Figure 2.3: Steps 1–3 in Register New Account & Verify OTP")

    # 3. User Manual Guide for User
    doc.add_heading("3. User Manual Guide for User", level=2)
    doc.add_heading("3.1. Login (By Email/Password & By Google OAuth2)", level=3)
    add_para(doc, "a) Login by Email and Password:", bold=True)
    add_para(doc, "Step 1: Click [Đăng nhập] on the header bar, enter your registered Email and Password, and click [Đăng nhập hệ thống].")
    add_para(doc, "b) Login by Google Account (OAuth 2.0):", bold=True)
    add_para(doc, "Step 1: On the Login screen, click the [Đăng nhập bằng Google] button.")
    add_para(doc, "Step 2: Select your Google account in the Google Identity Services pop-up (or choose 'Sử dụng một tài khoản khác') and click [Continue] to log in automatically.")
    add_img_with_caption(doc, step_imgs["user_login"], "Figure 3.1: Login by Email/Password and Login by Google OAuth 2.0")

    doc.add_heading("3.2. View/Edit Profile, Change Password & Submit eKYC", level=3)
    add_para(doc, "Step 1: Click on the user avatar in the top-right header and select [Hồ sơ cá nhân].")
    add_para(doc, "Step 2: Edit personal information (Full Name, Phone, DOB, Avatar) and click [Lưu thay đổi hồ sơ], or click [Đổi mật khẩu] to update your password.")
    add_para(doc, "Step 3: In the eKYC section, upload front/back images of your CCCD/Passport and A1/A2 Driving License and click [Gửi Hồ sơ Xác thực eKYC].")
    add_img_with_caption(doc, step_imgs["user_ekyc"], "Figure 3.2: Edit Personal Profile, Change Password & Upload eKYC Documents")

    # 4. User Manual Guide for Customer
    doc.add_heading("4. User Manual Guide for Customer", level=2)
    doc.add_heading("4.1. Book a Rental (Single or Multi-Vehicle Cart) & Pay 30% VNPay Deposit", level=3)
    add_para(doc, "Step 1: Select pickup date/time, pickup branch, return date/time, and return branch (cross-branch return at any Da Nang station is supported free of charge).")
    add_para(doc, "Step 2: Enter an optional discount voucher (e.g., DANANG50) and click [Xác nhận đặt xe & Thanh toán cọc 30% qua VNPay].")
    add_para(doc, "Step 3: On the VNPay Sandbox gateway, select 'Thẻ nội địa và tài khoản ngân hàng' and enter the test card details below:")
    vnp_tbl = [
        ["Ngân hàng", "NCB"],
        ["Số thẻ", "9704198526191432198"],
        ["Tên chủ thẻ", "NGUYEN VAN A"],
        ["Ngày phát hành", "07/15"],
        ["Mật khẩu OTP", "123456"],
    ]
    add_styled_table(doc, ["Trường thông tin VNPay Sandbox", "Giá trị Test chuẩn"], vnp_tbl, col_widths=[2.5, 4.0])
    add_para(doc, "", space_after=4)
    add_img_with_caption(doc, step_imgs["customer_booking_vnpay"], "Figure 4.1: 4-Step Booking Wizard, Multi-Vehicle Cart & VNPay 30% Deposit Payment")

    doc.add_heading("4.2. Manage My Bookings: Extend, Cancel Mid-Rental, Download PDF & Review", level=3)
    add_para(doc, "Step 1: Click [Chuyến của tôi] on the header bar to view all bookings filtered by status (Pending, Confirmed, Ongoing, Completed, Cancelled).")
    add_para(doc, "Step 2: On an Ongoing trip, click [Gia hạn thuê] to extend the return date, or click [Hủy chuyến / Trả sớm] to terminate early and release the vehicle.")
    add_para(doc, "Step 3: Click [Tải Hóa đơn PDF] to download the rental contract, or click [Đánh giá Xe 5 Sao] / [Gửi Khiếu nại] / [Đổi điểm Voucher] on completed trips.")
    add_img_with_caption(doc, step_imgs["customer_my_bookings"], "Figure 4.2: Manage My Bookings, Extend, Cancel, Download PDF Invoice & Submit Review")

    # 5. User Manual Guide for Staff
    doc.add_heading("5. User Manual Guide for Staff", level=2)
    doc.add_heading("5.1. Counter 5-Point Check-in Handover & Cross-Branch Check-out", level=3)
    add_para(doc, "Step 1 (Check-in Handover): Log in as Staff, open [Quầy Giao/Nhận Xe], select a Confirmed order, verify original CCCD/GPLX, collect the 70% counter balance, upload 4 pre-rental vehicle photos, enter start ODO & fuel level, capture the customer's digital signature, and click [Xác nhận bàn giao xe].")
    add_para(doc, "Step 2 (Cross-Branch Check-out): When the customer returns the motorbike at ANY branch, open the Ongoing order, upload 4 return photos, enter end ODO & fuel level, review auto-calculated late fees (30,000 VND/hr per BR-08) or damage fees, and click [Hoàn tất nhận xe & Đóng hợp đồng]. The system automatically relocates Vehicle.branchId to the return branch and credits loyalty points.")
    add_img_with_caption(doc, step_imgs["staff_counter"], "Figure 5.1: Staff Counter 5-Point Check-in Handover and Cross-Branch Check-out")

    # 6. User Manual Guide for Branch Manager & System Admin
    doc.add_heading("6. User Manual Guide for Branch Manager & System Admin", level=2)
    doc.add_heading("6.1. Branch Manager: Fleet CRUD, ODO Maintenance, Transfers & Shift Calendar", level=3)
    add_para(doc, "Step 1: Log in as Branch Manager and open [Quản lý Đội xe] to add/edit motorbikes, configure daily/hourly/seasonal pricing, or click [+ Tạo lịch Bảo dưỡng] when a motorbike triggers the 3,000 km ODO alert.")
    add_para(doc, "Step 2: Open [Điều chuyển xe] to request or approve inter-branch motorbike transfers, [Lịch trực nhân viên] to assign Morning/Afternoon/Evening shifts, and [Báo cáo] to export branch revenue to Excel/PDF.")
    add_img_with_caption(doc, step_imgs["manager_fleet"], "Figure 6.1: Branch Manager Fleet Management, Quick ODO Maintenance, Transfers & Reports")

    doc.add_heading("6.2. System Admin: Manage Users (Ban/Unban), Branches, KPI Dashboard & Audit Log", level=3)
    add_para(doc, "Step 1: Log in as System Admin and open [Quản lý Người dùng] to view all users, click [Chặn / Khóa TK] to ban a violating user, or click [Mở khóa TK] to unban.")
    add_para(doc, "Step 2: Open [Quản lý Chi nhánh], [Danh mục & Voucher], or [CMS Banner & Trang tĩnh] to configure chain-wide resources.")
    add_para(doc, "Step 3: Open [Executive KPI Dashboard], [Đối soát VNPay], and [Audit Log Viewer] to monitor chain-wide revenue, reconcile VNPay IPN transactions, and inspect security logs.")
    add_img_with_caption(doc, step_imgs["admin_dashboard"], "Figure 6.2: System Admin User Ban/Unban, Executive KPI Dashboard, VNPay Reconciliation & Audit Log")

    out_path = r'd:\Motorent\docs\MOTORENT_Final_Release_Document.docx'
    doc.save(out_path)
    print("Rebuilt JobTrans-style Final Release Document:", out_path)

if __name__ == "__main__":
    update_product_backlog_with_effort()
    update_rds_with_messages_list()
    step_imgs = generate_all_manual_step_images()
    build_jobtrans_style_final_release_doc(step_imgs)

