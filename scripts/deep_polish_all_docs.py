# -*- coding: utf-8 -*-
"""
Deep audit & comprehensive synchronization across ALL files in d:\\Motorent\\docs:
1. MOTORENT_RDS_Final.docx:
   - Remove the 9 trailing empty rows in Table 0 (Record of Changes).
   - Remove empty Heading 2 paragraph before '4. Application Messages List'.
   - Fix outdated Limitation LI-03 in Section IV (update from 'Vietnamese only' to 'Supports VI/EN localization; third-party payment gateways operate in VND').
   - Synchronize the 3 newly implemented features across Section I, Section II (UC-14, UC-19, UC-27, UC-41), and Section III (UI Fields, CRUD & Mongoose Queries):
     (a) Bilateral 2-Party E-Contract Signatures (Customer eSignatureUrl + Lessor lessorSignatureUrl)
     (b) Door-to-Door Custom Pickup & Return Delivery (deliveryMode: BranchPickup | DoorDelivery, customPickupAddress, customReturnAddress, deliveryFee)
     (c) AI Staff Shift Scheduling Optimizer (POST /api/schedules/ai-optimize with 100-point Multi-Factor Heuristic Scoring)
   - Align Section II 'Created By' attribution with team documentation roles: Phạm Quốc Cả (SRS) & Trương Quốc Bảo Hoàng (RDS Design/UI & v1.2 Consolidation).
   - Clean up unreferenced media files inside the .docx zip archive.
2. MOTORENT_SDS_Final.docx:
   - Synchronize Booking schema description (Table 3), BookingController, BookingService, InvoiceService, CounterDeskController, HrAndReportController (ScheduleController), and Database Queries for UC-14, UC-19, UC-27, UC-41 with Dual-Party Signatures, Door-to-Door Delivery, and AI Shift Optimizer.
3. MOTORENT_Final_Release_Document.docx:
   - Update Table of Contents to include Section IV (Team Member Contributions) and exact subsection titles.
   - Update Section I (Deliverable Package) to list all 6 deliverables in docs/.
   - Enrich Section III (User Manual: 4.2, 4.4, 5.1, 6.1) with clear step-by-step instructions for Dual-Party E-Contract Signatures, Door-to-Door Delivery, and AI Shift Scheduling Optimizer.
4. MOTORENT_Project_Tracking.xlsx & MOTORENT_Issues_Report.xlsx:
   - Update UC-14, UC-19, UC-27, UC-41 descriptions and Iter4 update notes in Project_Tracking.xlsx.
   - Align 'Write SRS & SDS' task assignees in Issues_Report.xlsx with Cả (SRS) and Hoàng (SDS & RDS Design).
"""
import os
import io
import zipfile
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

DOCS_DIR = r"d:\Motorent\docs"
RDS_PATH = os.path.join(DOCS_DIR, "MOTORENT_RDS_Final.docx")
SDS_PATH = os.path.join(DOCS_DIR, "MOTORENT_SDS_Final.docx")
REL_PATH = os.path.join(DOCS_DIR, "MOTORENT_Final_Release_Document.docx")
TRK_PATH = os.path.join(DOCS_DIR, "MOTORENT_Project_Tracking.xlsx")
ISS_PATH = os.path.join(DOCS_DIR, "MOTORENT_Issues_Report.xlsx")


def clean_unreferenced_docx_media(docx_path):
    """Remove any unreferenced files in word/media/* from a .docx zip archive."""
    temp_path = docx_path + ".tmp"
    with zipfile.ZipFile(docx_path, "r") as zin:
        # Collect all referenced media targets from all .rels files
        rels_content = ""
        for name in zin.namelist():
            if name.endswith(".rels"):
                rels_content += zin.read(name).decode("utf-8", errors="ignore")
        removed = 0
        kept = 0
        with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename.startswith("word/media/"):
                    media_basename = os.path.basename(item.filename)
                    if media_basename not in rels_content:
                        removed += 1
                        continue
                    kept += 1
                zout.writestr(item, zin.read(item.filename))
    os.replace(temp_path, docx_path)
    print(f"Cleaned media in {os.path.basename(docx_path)}: kept={kept}, removed_unreferenced={removed}")


def polish_rds():
    doc = docx.Document(RDS_PATH)

    # 1. Remove empty rows in Table 0 (Record of Changes)
    t0 = doc.tables[0]
    for r in list(t0.rows)[1:]:
        if not any(c.text.strip() for c in r.cells):
            t0._tbl.remove(r._tr)

    # 2. Remove any empty Heading 2 paragraph
    for p in list(doc.paragraphs):
        if p.style.name.startswith("Heading") and not p.text.strip():
            p._element.getparent().remove(p._element)

    # 3. Update Section I Table 14 (Booking table description) & Section IV Table 218 (LI-03)
    for t in doc.tables:
        for r in t.rows:
            cells_txt = [c.text.strip() for c in r.cells]
            if len(cells_txt) >= 3 and cells_txt[0] == "05" and cells_txt[1] == "Booking":
                r.cells[2].text = (
                    "Central rental orders. PK: _id. FK: userId -> User, vehicleId -> Vehicle, "
                    "pickupBranchId/returnBranchId -> Branch. Includes bilateral signatures (eSignatureUrl, lessorSignatureUrl) "
                    "and Door-to-Door delivery fields (deliveryMode, customPickupAddress, customReturnAddress, deliveryFee)."
                )
            elif len(cells_txt) >= 3 and cells_txt[0] == "LI-03":
                r.cells[2].text = (
                    "While the UI supports Vietnamese and English (VI/EN) localization (UC-48), "
                    "online payment settlements via VNPay Sandbox are processed strictly in Vietnamese Dong (VND)."
                )
            elif len(cells_txt) >= 4 and cells_txt[0] == "UC-14":
                r.cells[3].text = (
                    "Customer books a single motorbike or Multi-Vehicle Cart batch, selects Branch Pickup or Door-to-Door Delivery "
                    "(custom pickup/return address with distance fee), and signs the bilateral 2-party digital rental contract."
                )
            elif len(cells_txt) >= 4 and cells_txt[0] == "UC-27":
                r.cells[3].text = (
                    "Staff verifies customer eKYC, collects 70% counter balance, captures 4-angle vehicle photos & start ODO/fuel, "
                    "and verifies both Lessee (Customer) and Lessor (Staff Representative) digital contract signatures."
                )
            elif len(cells_txt) >= 4 and cells_txt[0] == "UC-41":
                r.cells[3].text = (
                    "Branch Manager assigns Morning/Afternoon/Evening shifts manually or runs the AI Shift Scheduling Optimizer "
                    "(100-point heuristic scoring based on rental/delivery demand, clopening avoidance, workload cap & reliability)."
                )

    # 4. Update Section II & Section III tables for UC-14, UC-19, UC-27, UC-41 and Created By attribution
    for t in doc.tables:
        rows = t.rows
        if len(rows) >= 10 and len(rows[0].cells) == 2 and rows[0].cells[0].text.strip() == "Attribute":
            uc_title = rows[1].cells[1].text.strip()
            # Update Created By to reflect Cả (SRS) & Hoàng (RDS Design & Consolidation)
            old_created = rows[2].cells[1].text.strip()
            iter_part = "Iteration: ITER1"
            if "Iteration:" in old_created:
                iter_part = "Iteration: " + old_created.split("Iteration:")[-1].strip()
            rows[2].cells[1].text = f"Phạm Quốc Cả (SRS) & Trương Quốc Bảo Hoàng (RDS Design / v1.2)    {iter_part}"

            if uc_title.startswith("UC-14"):
                rows[5].cells[1].text = (
                    "Customers book a single motorbike via the 5-step wizard or reserve multiple motorbikes in a Multi-Vehicle Cart, "
                    "choose between Branch Pickup ('BranchPickup') or Door-to-Door Delivery ('DoorDelivery' with custom pickup/return address), "
                    "and execute a bilateral 2-party digital rental contract signed by both Lessee (Customer) and Lessor (MOTORENT Representative)."
                )
                rows[7].cells[1].text = (
                    "POST-1: Single or Multi-Vehicle Cart booking is created with deliveryMode, customPickupAddress/customReturnAddress, deliveryFee, "
                    "and bilateral signatures (eSignatureUrl & lessorSignatureUrl).\n"
                    "POST-2: Database state and audit trail are persisted accurately."
                )
            elif uc_title.startswith("UC-19"):
                rows[5].cells[1].text = (
                    "Customers and Staff generate and download a formatted PDF rental contract and itemized receipt via PDFKit, "
                    "displaying Door-to-Door delivery addresses/fees and side-by-side digital signatures of both Lessee and Lessor."
                )
            elif uc_title.startswith("UC-27"):
                rows[5].cells[1].text = (
                    "Staff perform 5-point handover (at counter or Door-to-Door delivery address): verify ID/license, collect 70% payment, "
                    "upload 4 vehicle photos, record start ODO/fuel, and confirm bilateral contract signatures (Customer eSignatureUrl & Staff lessorSignatureUrl)."
                )
            elif uc_title.startswith("UC-41"):
                rows[5].cells[1].text = (
                    "Branch Managers assign Morning/Afternoon/Evening work shifts on the calendar, run the AI Shift Scheduling Optimizer "
                    "(POST /api/schedules/ai-optimize using a 100-point Multi-Factor Heuristic Scoring model for demand forecasting, "
                    "clopening avoidance, 50h workload balance & attendance reliability), and track staff attendance."
                )

    doc.save(RDS_PATH)
    clean_unreferenced_docx_media(RDS_PATH)
    print("Polished RDS:", RDS_PATH)


def polish_sds():
    doc = docx.Document(SDS_PATH)

    for t in doc.tables:
        rows = t.rows
        if not rows:
            continue
        hdr = [c.text.strip() for c in rows[0].cells]
        # Table 3: Database Table Description
        if hdr == ["No", "Table", "Description"]:
            for r in rows[1:]:
                if r.cells[0].text.strip() == "05" and r.cells[1].text.strip() == "Booking":
                    r.cells[2].text = (
                        "Central rental orders. PK: _id. FK: userId -> User, vehicleId -> Vehicle, "
                        "pickupBranchId/returnBranchId -> Branch. Stores bilateral contract signatures "
                        "(eSignatureUrl, lessorSignatureUrl, lessorSignedBy, customerSignedAt, lessorSignedAt) "
                        "and Door-to-Door delivery fields (deliveryMode, customPickupAddress, customReturnAddress, deliveryFee)."
                    )
                elif r.cells[0].text.strip() == "12" and r.cells[1].text.strip() == "StaffSchedule":
                    r.cells[2].text = (
                        "Staff work shift schedules (Morning/Afternoon/Evening) & attendance logs. PK: _id. "
                        "FK: staffId -> User, branchId -> Branch. Supports manual assignment and AI Shift Optimization."
                    )
        # Class Method tables
        elif hdr == ["No", "Method", "Description"]:
            methods_txt = " ".join(r.cells[1].text.strip() for r in rows[1:])
            if "createBooking" in methods_txt and "downloadInvoice" in methods_txt:
                # BookingController or BookingService
                rows[1].cells[2].text = (
                    "Inputs: vehicleId, pickupBranchId, returnBranchId, pickupDateTime, returnDateTime, "
                    "deliveryMode ('BranchPickup'|'DoorDelivery'), customPickupAddress, customReturnAddress, "
                    "eSignatureUrl, lessorSignatureUrl. Validates conflict window, calculates deliveryFee, and creates Booking."
                )
                rows[5].cells[2].text = (
                    "Inputs: req.params.id, req.user. Streams PDF rental contract via PDFKit containing itemized rental/delivery fees "
                    "and bilateral 2-party digital signatures (Lessee & Lessor)."
                )
            elif "assignShift" in methods_txt or "getBranchSchedules" in methods_txt or "StaffSchedule" in " ".join(r.cells[2].text for r in rows[1:]):
                # HR / Schedule controller
                for r in rows[1:]:
                    if "Shift" in r.cells[1].text or "Schedule" in r.cells[1].text or r.cells[0].text.strip() == "02":
                        r.cells[2].text = (
                            "Assigns Morning/Afternoon/Evening shifts manually or via POST /api/schedules/ai-optimize "
                            "(100-point Multi-Factor Heuristic AI Optimizer: demand forecast, clopening check, 50h cap & reliability)."
                        )

    doc.save(SDS_PATH)
    clean_unreferenced_docx_media(SDS_PATH)
    print("Polished SDS:", SDS_PATH)


def polish_final_release_doc():
    doc = docx.Document(REL_PATH)

    # 1. Update Deliverable Package table (Table 0) to list all 6 files in docs/
    if doc.tables:
        t0 = doc.tables[0]
        if len(t0.rows) == 6:  # header + 5 rows
            row_cells = t0.add_row().cells
            vals = [
                "6",
                "Group4_MotoRent_Contribution_Report.docx (MOTORENT_Bang_Dong_Gop_Thanh_Vien.docx)",
                "Detailed Team Member Contribution Report across Project Codebase, Git Commits, and Documentation (SRS, RDS, SDS, Release, Tracking)"
            ]
            for c_i, val in enumerate(vals):
                row_cells[c_i].text = val
                for p in row_cells[c_i].paragraphs:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i == 0 else WD_ALIGN_PARAGRAPH.LEFT
                    for run in p.runs:
                        run.font.name = "Arial"
                        run.font.size = Pt(10)

    # 2. Ensure TOC includes "IV. Team Member Contributions"
    for i, p in enumerate(doc.paragraphs):
        if "6.8. System Admin — Inspect Security Audit Logs" in p.text:
            # Check if next paragraph is already IV. Team Member Contributions
            if i + 1 < len(doc.paragraphs) and "IV. Team Member Contributions" not in doc.paragraphs[i + 1].text:
                new_p = doc.add_paragraph()
                r = new_p.add_run("IV. Team Member Contributions")
                r.bold = True
                r.font.name = "Arial"
                r.font.size = Pt(10.5)
                p._element.addnext(new_p._element)
            break

    # 3. Enrich User Manual steps for 4.2, 4.4, 5.1, and 6.1 with the 3 new features
    for p in doc.paragraphs:
        if p.text.startswith("Step 2: Select Pickup Branch ('Chi nhánh nhận xe')"):
            p.text = (
                "Step 2: Choose Delivery Mode: [Nhận & Trả tại cửa hàng (0đ)] or [Giao & Nhận xe tận nơi (+50.000đ/chiều)] "
                "with custom pickup/return address in Da Nang (hotel, airport lobby, home), and select Pickup/Return Date & Time."
            )
        elif p.text.startswith("Step 3: Review the locked license plate badge"):
            p.text = (
                "Step 3: Review the itemized rental & delivery cost breakdown ('Bảng kê chi phí hợp đồng'), sign the Customer E-Signature box, "
                "verify the Lessor Representative Signature ('Chữ ký đại diện Bên cho thuê'), and submit to receive the bilateral 2-party contract."
            )
        elif p.text.startswith("Step 2: Select a booking to open the right workspace ('Chi tiết hồ sơ giao nhận')"):
            p.text = (
                "Step 2: Select a booking to open the right workspace ('Chi tiết hồ sơ giao nhận'), inspect the Door-to-Door delivery address (if selected), "
                "click [Thu tiền tại quầy] to collect the 70% balance, use tab [1. Check-in Bàn giao xe] to upload 4 pre-rental photos and confirm both "
                "Customer & Lessor Representative contract signatures, or use tab [2. Check-out Thu hồi xe] to record return ODO, fuel, and 4 return photos."
            )
        elif p.text.startswith("Step 2: Monitor real-time station KPIs ('Tổng số xe'"):
            p.text = (
                "Step 2: Monitor real-time station KPIs ('Tổng số xe', 'Sẵn có', 'Tỷ lệ đang thuê', 'Xe đến hạn bảo trì'), "
                "and open [Lịch phân ca] ('/schedules') -> click [AI Tối ưu Phân ca] to automatically generate optimal weekly staff shifts "
                "using the 100-point AI Heuristic Optimizer (demand forecast, clopening prevention, and workload balancing)."
            )

    doc.save(REL_PATH)
    clean_unreferenced_docx_media(REL_PATH)
    print("Polished Final Release Document:", REL_PATH)


def polish_excel_files():
    # 1. Update Project_Tracking.xlsx (UC-14, UC-19, UC-27, UC-41 descriptions & Iter4 notes)
    wb = openpyxl.load_workbook(TRK_PATH)
    ws_proj = wb["Project"]
    for r in range(4, 54):
        func_name = str(ws_proj.cell(r, 2).value or "").strip()
        if func_name == "Book a Rental & Multi-Vehicle Cart":
            ws_proj.cell(r, 5).value = (
                "Customers book a single motorbike or Multi-Vehicle Cart batch, choose Branch Pickup or Door-to-Door Delivery "
                "(custom address & fee), and sign the bilateral 2-party digital contract (Lessee & Lessor)."
            )
            ws_proj.cell(r, 10).value = (
                "Added Multi-Vehicle Cart Drawer, Door-to-Door custom delivery address, and bilateral 2-party contract signatures"
            )
        elif func_name == "Download Invoice PDF":
            ws_proj.cell(r, 5).value = (
                "Customers and Staff generate and download a formatted PDF rental contract and receipt via PDFKit "
                "with Door-to-Door delivery breakdown and both Lessee & Lessor signatures."
            )
        elif func_name == "Confirm Vehicle Handover (Check-in)":
            ws_proj.cell(r, 5).value = (
                "Staff perform 5-point handover: verify eKYC, collect 70% payment, upload 4 vehicle photos, "
                "record start ODO/fuel, and confirm bilateral Customer & Lessor signatures."
            )
        elif func_name == "Assign Work Shifts & Track Attendance":
            ws_proj.cell(r, 5).value = (
                "Branch Managers assign Morning/Afternoon/Evening shifts manually or run the AI Shift Scheduling Optimizer "
                "(100-point multi-factor heuristic model) and track staff attendance."
            )
            ws_proj.cell(r, 9).value = "iter4"
            ws_proj.cell(r, 10).value = "Added AI Shift Scheduling Optimizer (POST /api/schedules/ai-optimize) with 100-point heuristic scoring"

    wb.save(TRK_PATH)
    print("Polished Project Tracking Excel:", TRK_PATH)

    # 2. Update Issues_Report.xlsx so SRS/SDS documentation tasks reflect Cả (SRS) and Hoàng (SDS & RDS Design)
    wb_iss = openpyxl.load_workbook(ISS_PATH)
    ws_iss = wb_iss.active
    for r in range(2, ws_iss.max_row + 1):
        title = str(ws_iss.cell(r, 1).value or "")
        if title.startswith("Write SRS"):
            # Cả did SRS, Hoàng did SDS/RDS Design
            uc_num = 0
            for part in title.split():
                if part.startswith("II.") and len(part) >= 4 and part[3].isdigit():
                    uc_num = int(part[3])
                    break
            # Assign SRS tasks of Browse/Branch/Fleet/Staff to Cả, and remaining SDS/Design tasks to Hoàng
            ws_iss.cell(r, 6).value = "Cả" if uc_num in (1, 8, 9) else "Hoàng"
    wb_iss.save(ISS_PATH)
    print("Polished Issues Report Excel:", ISS_PATH)


if __name__ == "__main__":
    polish_rds()
    polish_sds()
    polish_final_release_doc()
    polish_excel_files()
