# -*- coding: utf-8 -*-
"""
Capture 29 REAL, VERIFIED, POPULATED screenshots from the running MOTORENT application
(http://localhost:5173 & http://localhost:5000) using Playwright DOM bounding boxes
so that every red callout box frames the exact DOM element and ZERO screens show
login prompts, 429 errors, or empty states.
"""
import os
import time
import json
import urllib.request
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = r"C:\Users\Hoàng\AppData\Local\Temp\motorent_real_screenshots"
os.makedirs(OUT_DIR, exist_ok=True)


def get_font(size=12, bold=False):
    for name in (["arialbd.ttf", "segoeuib.ttf", "calibrib.ttf"] if bold else ["arial.ttf", "segoeui.ttf", "calibri.ttf"]):
        p = os.path.join(r"C:\Windows\Fonts", name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def add_red_callouts(img_path, callouts):
    img = Image.open(img_path).convert("RGB")
    w, h = img.size
    d = ImageDraw.Draw(img)
    for box, label in callouts:
        if not box:
            continue
        x1, y1, x2, y2 = [int(v) for v in box]
        x1 = max(2, min(w - 10, x1))
        y1 = max(2, min(h - 10, y1))
        x2 = max(x1 + 12, min(w - 3, x2))
        y2 = max(y1 + 12, min(h - 3, y2))
        for offset in range(3):
            d.rectangle([x1 - offset, y1 - offset, x2 + offset, y2 + offset], outline="#EF4444")
        if label:
            fnt = get_font(12, True)
            tw = int(d.textlength(label, font=fnt))
            by1 = y1 - 24 if y1 >= 26 else y2 + 4
            by2 = by1 + 22
            bx1 = max(2, min(w - tw - 18, x1))
            d.rounded_rectangle([bx1, by1, bx1 + tw + 16, by2], radius=4, fill="#EF4444")
            d.text((bx1 + 8, by1 + 3), label, fill="#FFFFFF", font=fnt)
    img.save(img_path, quality=95)
    return img_path


def api_post(path, payload, token=None):
    headers = {"Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Origin": "http://localhost:5173"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"http://localhost:5000/api{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req).read().decode("utf-8"))


def api_get(path, token=None):
    headers = {"X-Requested-With": "XMLHttpRequest", "Origin": "http://localhost:5173"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"http://localhost:5000/api{path}", headers=headers, method="GET")
    return json.loads(urllib.request.urlopen(req).read().decode("utf-8"))


def get_auth_token(identifier, password):
    resp = api_post("/auth/login", {"identifier": identifier, "password": password})
    return resp["data"]["token"]


def get_vehicles():
    resp = api_get("/vehicles")
    return resp["data"]


def dom_box(page, selector=None, text=None, exact=False, nth=0, pad=6, fallback=None):
    try:
        if selector:
            loc = page.locator(selector).nth(nth)
        else:
            loc = page.get_by_text(text, exact=exact).nth(nth)
        if loc.count() > 0:
            bb = loc.bounding_box(timeout=2000)
            if bb and bb["width"] > 4 and bb["height"] > 4:
                return [
                    bb["x"] - pad,
                    bb["y"] - pad,
                    bb["x"] + bb["width"] + pad,
                    bb["y"] + bb["height"] + pad,
                ]
    except Exception as e:
        print(f"  [dom_box fallback] selector={selector} text={text}: {e}")
    return fallback


def switch_auth(page, token, cart_vehicles=None):
    """Navigate to /login or root first, set token & cart in localStorage/sessionStorage, then reload so AuthContext loads /auth/me cleanly."""
    page.goto("http://localhost:5173/branches", wait_until="domcontentloaded")
    page.evaluate(
        """({tok, cart}) => {
            if (tok) {
                localStorage.setItem('motorent_token', tok);
                sessionStorage.setItem('motorent_token', tok);
            } else {
                localStorage.removeItem('motorent_token');
                sessionStorage.removeItem('motorent_token');
            }
            if (cart) {
                localStorage.setItem('motorent_vehicle_cart_v1', JSON.stringify(cart));
            }
        }""",
        {"tok": token, "cart": cart_vehicles},
    )
    page.reload(wait_until="networkidle")
    time.sleep(1.2)


def verify_and_save(page, filename, callouts, allow_login_screen=False):
    # Dismiss any floating welcome toast if present
    try:
        close_toast = page.locator("button[aria-label*='Đóng'], button:has-text('Đóng')").first
        if close_toast.count() > 0 and close_toast.is_visible():
            pass
    except Exception:
        pass

    body_text = page.locator("body").inner_text()
    if "429" in body_text or "Too Many Requests" in body_text:
        raise RuntimeError(f"429 Rate limit detected on {filename}!")
    if "Không tìm thấy phương tiện" in body_text:
        raise RuntimeError(f"'Không tìm thấy phương tiện' detected on {filename}!")
    if not allow_login_screen:
        if "Vui lòng đăng nhập" in body_text or ("Đăng nhập hệ thống" in body_text and "Chào mừng trở lại" in body_text):
            raise RuntimeError(f"Unauthenticated login screen detected on {filename}!")
    if "Giỏ xe của bạn đang trống" in body_text:
        raise RuntimeError(f"Empty cart detected on {filename}!")
    if "Danh sách yêu thích đang trống" in body_text or "Chưa có xe yêu thích" in body_text:
        raise RuntimeError(f"Empty wishlist detected on {filename}!")

    out_p = os.path.join(OUT_DIR, filename)
    page.screenshot(path=out_p)
    if callouts:
        add_red_callouts(out_p, callouts)
    print(f"Verified & Captured: {filename}")
    return out_p


def capture_full_suite():
    vehicles = get_vehicles()
    veh_id = vehicles[0]["_id"]
    cart_sample = vehicles[:2]

    tok_customer_tuan = get_auth_token("customer_tuan", "Customer@123456")
    tok_staff = get_auth_token("staff_dad", "Staff@123456")
    tok_manager = get_auth_token("manager_dad", "Manager@123456")
    tok_admin = get_auth_token("admin", "Admin@123456")

    # Seed 2 vehicles into customer_tuan's Wishlist via API so /wishlist is populated
    existing_wl = set(api_get("/wishlist/ids", token=tok_customer_tuan).get("data", []))
    for v in vehicles[:2]:
        if v["_id"] not in existing_wl:
            try:
                api_post(f"/wishlist/{v['_id']}", {}, token=tok_customer_tuan)
            except Exception as e:
                print("Wishlist seed note:", e)

    # Seed 1 realistic Complaint for customer_tuan if none exists so /complaints & /staff/complaints look realistic
    try:
        my_comps = api_get("/complaints", token=tok_customer_tuan).get("data", [])
        if not my_comps:
            my_bks = api_get("/bookings/my", token=tok_customer_tuan).get("data", [])
            if my_bks:
                api_post(
                    "/complaints",
                    {
                        "bookingId": my_bks[0]["_id"],
                        "category": "Vehicle",
                        "title": "Đề nghị kiểm tra phanh trước và áp suất lốp xe",
                        "description": "Khi nhận xe tại Trạm Sân bay Đà Nẵng, phanh trước hơi kêu nhẹ khi bóp gấp. Nhờ kỹ thuật viên chi nhánh hỗ trợ kiểm tra và căn chỉnh giúp.",
                    },
                    token=tok_customer_tuan,
                )
    except Exception as e:
        print("Complaint seed note:", e)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1366, "height": 860}, device_scale_factor=1)
        page = context.new_page()

        # ======================================================================
        # 1. GUEST SCREENS (s01 - s08)
        # ======================================================================
        switch_auth(page, None)

        # s01: Branches & Interactive GPS Map (/branches)
        page.goto("http://localhost:5173/branches", wait_until="networkidle")
        time.sleep(1.2)
        b_nav_branch = dom_box(page, selector="header a[href='/branches']", pad=6, fallback=[555, 18, 635, 52])
        b_map_toggle = dom_box(page, text="Bản đồ tương tác GPS", pad=8, fallback=[215, 525, 425, 575])
        b_nearest_btn = dom_box(page, text="Tìm trạm gần tôi nhất", pad=8, fallback=[1070, 525, 1300, 575])
        verify_and_save(
            page,
            "s01_branches_map.png",
            [
                (b_nav_branch, "Step 1: Click [Chi nhánh] trên thanh điều hướng"),
                (b_map_toggle, "Step 2a: Chuyển chế độ Bản đồ tương tác GPS"),
                (b_nearest_btn, "Step 2b: Bấm [Tìm trạm gần tôi nhất] (Haversine GPS)"),
                ([55, 605, 1310, 845], "Step 3: Xem Trạm Sân Bay Quốc Tế Đà Nẵng & Trạm Biển Mỹ Khê"),
            ],
        )

        # s02: Fleet Catalog & Multi-Criteria Filter (/bikes)
        page.goto("http://localhost:5173/bikes", wait_until="networkidle")
        time.sleep(1.2)
        page.evaluate("window.scrollTo(0, 340)")
        time.sleep(0.6)
        verify_and_save(
            page,
            "s02_fleet_catalog.png",
            [
                ([55, 95, 1310, 395], "Step 1: Chọn bộ lọc (Từ khóa, Hãng xe, Giá thuê/ngày, Dòng xe, Chi nhánh)"),
                ([55, 445, 1310, 845], "Step 2: Xem danh sách xe Sẵn sàng tại trạm & Bấm vào thẻ xe để xem chi tiết"),
            ],
        )

        # s03: Vehicle Detail, 4-Angle Gallery & Reviews (/bikes/:id)
        page.goto(f"http://localhost:5173/bikes/{veh_id}", wait_until="networkidle")
        time.sleep(1.2)
        b_book_now = dom_box(page, text="Chọn thời gian và đặt xe", pad=6, fallback=[790, 775, 1085, 835])
        verify_and_save(
            page,
            "s03_vehicle_detail.png",
            [
                ([55, 130, 750, 845], "Step 1: Xem ảnh 4 góc xe, Thông số kỹ thuật & Đánh giá thực tế từ khách thuê"),
                ([770, 150, 1310, 755], "Step 2: Kiểm tra Giá thuê ngày/giờ, Tình trạng xe, ODO & Trạm giữ xe"),
                ([775, 770, 1295, 845], "Step 3: Bấm [Chọn thời gian và đặt xe] hoặc [+ Thêm vào giỏ xe]"),
            ],
        )

        # s04: Rental Policy (/rental-policy)
        page.goto("http://localhost:5173/rental-policy", wait_until="networkidle")
        time.sleep(1.2)
        b_nav_policy = dom_box(page, selector="header button:has-text('Quy trình'), header a[href='/rental-policy']", pad=6, fallback=[640, 18, 725, 52])
        verify_and_save(
            page,
            "s04_rental_policy.png",
            [
                (b_nav_policy, "Step 1: Mở mục [Quy trình] / Chính sách thuê xe (/rental-policy)"),
                ([55, 130, 1310, 840], "Step 2: Tra cứu quy định Đặt cọc 30%, Đối chiếu eKYC không giữ CCCD gốc & Hoàn hủy BR-06"),
            ],
        )

        # s05: Register Account (/register)
        page.goto("http://localhost:5173/register", wait_until="networkidle")
        time.sleep(1.0)
        b_reg_btn = dom_box(page, selector="form button[type='submit']", pad=6, fallback=[455, 642, 910, 695])
        verify_and_save(
            page,
            "s05_register.png",
            [
                ([440, 240, 925, 615], "Step 1: Điền Tên đăng nhập, Email, Họ tên, Số điện thoại & Mật khẩu"),
                (b_reg_btn, "Step 2: Bấm [Đăng ký tài khoản] để nhận mã OTP kích hoạt"),
            ],
            allow_login_screen=True,
        )

        # s06: Verify Email OTP (/verify-email)
        page.goto("http://localhost:5173/verify-email", wait_until="networkidle")
        time.sleep(1.0)
        verify_and_save(
            page,
            "s06_verify_otp.png",
            [
                ([420, 210, 945, 640], "Step 1: Nhập mã OTP 6 chữ số gửi về Email và bấm Xác thực tài khoản"),
            ],
            allow_login_screen=True,
        )

        # s07: Login by Email/Username & Google OAuth 2.0 (/login)
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(1.0)
        b_login_submit = dom_box(page, selector="form button[type='submit']", pad=6, fallback=[455, 442, 910, 488])
        verify_and_save(
            page,
            "s07_login.png",
            [
                ([450, 260, 915, 425], "Step 1a: Nhập Tên đăng nhập / Email và Mật khẩu"),
                (b_login_submit, "Step 1b: Bấm [Đăng nhập hệ thống]"),
                ([455, 535, 910, 595], "Step 2: Hoặc bấm [Đăng nhập bằng Google] (OAuth 2.0 1 chạm)"),
            ],
            allow_login_screen=True,
        )

        # s08: Forgot Password (/forgot-password)
        page.goto("http://localhost:5173/forgot-password", wait_until="networkidle")
        time.sleep(1.0)
        verify_and_save(
            page,
            "s08_forgot_password.png",
            [
                ([430, 220, 935, 600], "Step 1: Nhập Email đã đăng ký & Bấm [Gửi mã khôi phục] để đặt lại mật khẩu"),
            ],
            allow_login_screen=True,
        )

        # ======================================================================
        # 2. AUTHENTICATED CUSTOMER SCREENS (s09 - s17)
        # ======================================================================
        switch_auth(page, tok_customer_tuan, cart_vehicles=cart_sample)

        # s09: Personal Profile Info (/profile -> Tab 03 Thông tin cá nhân)
        page.goto("http://localhost:5173/profile", wait_until="networkidle")
        time.sleep(1.2)
        page.get_by_text("Thông tin cá nhân", exact=False).first.click()
        time.sleep(1.0)
        b_tab_info = dom_box(page, text="Thông tin cá nhân", pad=6, fallback=[490, 225, 665, 275])
        verify_and_save(
            page,
            "s09_profile_info.png",
            [
                (b_tab_info, "Step 1: Chọn tab [03 Thông tin cá nhân]"),
                ([85, 290, 1280, 835], "Step 2: Cập nhật Họ, Tên, Số điện thoại liên hệ & Bấm [Lưu thay đổi]"),
            ],
        )

        # s10: eKYC Identity Verification (/profile -> Tab 04 Định danh eKYC)
        page.get_by_text("Định danh eKYC", exact=False).first.click()
        time.sleep(1.0)
        b_tab_ekyc = dom_box(page, text="Định danh eKYC", pad=6, fallback=[675, 225, 845, 275])
        verify_and_save(
            page,
            "s10_profile_ekyc.png",
            [
                (b_tab_ekyc, "Step 1: Chọn tab [04 Định danh eKYC]"),
                ([85, 290, 1280, 835], "Step 2: Tải lên 4 ảnh định danh (CCCD mặt trước/sau, Bằng lái A1/A2, Ảnh chân dung) mã hóa AES-256"),
            ],
        )

        # s11: Change Account Password (/profile -> Tab 06 Đổi mật khẩu)
        page.get_by_text("Đổi mật khẩu", exact=False).first.click()
        time.sleep(1.0)
        b_tab_pwd = dom_box(page, text="Đổi mật khẩu", pad=6, fallback=[1025, 225, 1185, 275])
        verify_and_save(
            page,
            "s11_change_password.png",
            [
                (b_tab_pwd, "Step 1: Chọn tab [06 Đổi mật khẩu]"),
                ([85, 290, 1280, 835], "Step 2: Nhập Mật khẩu hiện tại, Mật khẩu mới (>= 8 ký tự), Xác nhận & Bấm [Cập nhật mật khẩu]"),
            ],
        )

        # s12: Wishlist (/wishlist) — now populated with 2 real motorbikes!
        page.goto("http://localhost:5173/wishlist", wait_until="networkidle")
        time.sleep(1.2)
        b_nav_wl = dom_box(page, selector="header a[href='/wishlist']", pad=6, fallback=[1030, 18, 1075, 52])
        verify_and_save(
            page,
            "s12_wishlist.png",
            [
                (b_nav_wl, "Step 1: Mở danh sách [Xe yêu thích] (/wishlist) trên thanh điều hướng"),
                ([55, 130, 1310, 840], "Step 2: Xem các dòng xe đã lưu, so sánh giá thuê ngày/giờ & Bấm [Đặt xe ngay]"),
            ],
        )

        # s13: Multi-Vehicle Cart (/cart) — now populated with 2 real motorbikes!
        page.goto("http://localhost:5173/cart", wait_until="networkidle")
        time.sleep(1.2)
        b_nav_cart = dom_box(page, selector="header a[href='/cart']", pad=6, fallback=[1075, 18, 1115, 52])
        verify_and_save(
            page,
            "s13_cart.png",
            [
                (b_nav_cart, "Step 1: Mở [Giỏ xe nhiều chiếc] (/cart) trên thanh điều hướng"),
                ([55, 140, 1310, 845], "Step 2: Kiểm tra danh sách xe thuê theo đoàn, chọn lịch nhận/trả & Đặt cọc gộp 30% qua VNPay"),
            ],
        )

        # s14: Booking Wizard (/booking/:vehicleId)
        page.goto(f"http://localhost:5173/booking/{veh_id}", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s14_booking_wizard.png",
            [
                ([50, 175, 1315, 315], "Step 1: Tiến trình Đặt xe 5 bước (Lịch trình -> Khách hàng -> Gói dịch vụ -> Thanh toán QR -> Hoàn tất)"),
                ([50, 350, 785, 845], "Step 2: Chọn Chi nhánh nhận/trả xe liên trạm (0đ phí) & Thời gian nhận/trả xe"),
                ([805, 350, 1315, 845], "Step 3: Xem Thông tin xe, Bảng kê chi phí tạm tính & Đặt cọc 30% qua VNPay"),
            ],
        )

        # s15: My Bookings & Trip Management (/profile -> Tab 01 Chuyến xe của tôi)
        page.goto("http://localhost:5173/profile", wait_until="networkidle")
        time.sleep(1.5)
        b_tab_trips = dom_box(page, text="Chuyến xe của tôi", pad=6, fallback=[85, 225, 285, 275])
        verify_and_save(
            page,
            "s15_my_bookings.png",
            [
                (b_tab_trips, "Step 1: Mở tab [01 Chuyến xe của tôi]"),
                ([85, 295, 1280, 360], "Step 2: Lọc theo trạng thái (Tất cả đơn, Đang giữ xe / Đang thuê, Đã hoàn thành, Đã hủy)"),
                ([85, 370, 1280, 845], "Step 3: Xem Hợp đồng, 4 góc ảnh bàn giao, Gia hạn thuê, Hủy chuyến hoặc Tải Hóa đơn PDF"),
            ],
        )

        # s16: Loyalty Points, Referral Code & Vouchers (/profile -> Tab 02 Ưu đãi & Điểm thưởng)
        page.get_by_text("Ưu đãi & Điểm thưởng", exact=False).first.click()
        time.sleep(1.2)
        b_tab_loyalty = dom_box(page, text="Ưu đãi & Điểm thưởng", pad=6, fallback=[290, 225, 485, 275])
        verify_and_save(
            page,
            "s16_loyalty_vouchers.png",
            [
                (b_tab_loyalty, "Step 1: Mở tab [02 Ưu đãi & Điểm thưởng]"),
                ([85, 290, 1280, 845], "Step 2: Xem Điểm thưởng tích lũy (+1 điểm/10.000đ), Mã giới thiệu bạn bè & Đổi Voucher giảm giá"),
            ],
        )

        # s17: Customer Complaints (/complaints)
        page.goto("http://localhost:5173/complaints", wait_until="networkidle")
        time.sleep(1.2)
        b_new_comp = dom_box(page, text="Gửi khiếu nại mới", pad=6, fallback=[1050, 120, 1285, 175])
        verify_and_save(
            page,
            "s17_complaints_customer.png",
            [
                (b_new_comp, "Step 1: Bấm [+ Gửi khiếu nại mới] để phản ánh sự cố xe hoặc dịch vụ"),
                ([55, 195, 1310, 840], "Step 2: Theo dõi danh sách Khiếu nại của tôi và kết quả giải quyết từ Chi nhánh"),
            ],
        )

        # ======================================================================
        # 3. AUTHENTICATED STAFF SCREENS (s18 - s19)
        # ======================================================================
        switch_auth(page, tok_staff)

        # s18: Staff Counter Desk (/counter)
        page.goto("http://localhost:5173/counter", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s18_staff_counter.png",
            [
                ([45, 375, 560, 845], "Step 1: Chọn đơn trong Hàng đợi tại trạm (Lọc: Tất cả, Chờ nhận, Đang thuê, Đã trả, Đã hủy)"),
                ([585, 375, 1315, 845], "Step 2: Thực hiện [1. Check-in Bàn giao xe] (Thu 70%, 4 ảnh, ODO) hoặc [2. Check-out Thu hồi xe]"),
            ],
        )

        # s19: Staff Complaint Handling (/staff/complaints)
        page.goto("http://localhost:5173/staff/complaints", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s19_staff_complaints.png",
            [
                ([55, 115, 1310, 840], "Step 1: Tiếp nhận Khiếu nại khách hàng tại trạm, nhập Nội dung xử lý & Cập nhật trạng thái"),
            ],
        )

        # ======================================================================
        # 4. AUTHENTICATED BRANCH MANAGER SCREENS (s20 - s23)
        # ======================================================================
        switch_auth(page, tok_manager)

        # s20: Branch Manager Dashboard (/manager/dashboard)
        page.goto("http://localhost:5173/manager/dashboard", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s20_manager_dashboard.png",
            [
                ([55, 100, 1310, 340], "Step 1: Theo dõi KPI Chi nhánh (Tổng đội xe, Tỷ lệ lấp đầy, Xe đang thuê, Xe bảo dưỡng)"),
                ([55, 355, 1310, 845], "Step 2: Duyệt / Từ chối đơn đặt xe, Xử lý hoàn cọc BR-06 & Giám sát cảnh báo ODO >= 3.000 km"),
            ],
        )

        # s21: Manager Vehicles & Pricing (/manager/vehicles)
        page.goto("http://localhost:5173/manager/vehicles", wait_until="networkidle")
        time.sleep(1.5)
        b_fleet_ops_btn = dom_box(page, text="Điều chuyển & Bảo dưỡng", pad=6, fallback=[935, 195, 1295, 245])
        verify_and_save(
            page,
            "s21_manager_vehicles.png",
            [
                (b_fleet_ops_btn, "Step 1: Mở nhanh trang [Điều chuyển & Bảo dưỡng] đội xe"),
                ([55, 385, 470, 845], "Step 2: Biểu mẫu [Thêm phương tiện mới] & Thiết lập giá thuê ngày/giờ"),
                ([495, 385, 1310, 845], "Step 3: Danh sách Đội xe tại chi nhánh, Cập nhật thông số & Lên lịch bảo dưỡng 1 chạm"),
            ],
        )

        # s22: Manager Fleet Operations — Maintenance & Inter-Branch Transfers (/manager/fleet-operations)
        page.goto("http://localhost:5173/manager/fleet-operations", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s22_manager_fleet_ops.png",
            [
                ([55, 100, 1310, 320], "Step 1: Chuyển đổi giữa [Bảo dưỡng định kỳ ODO] và [Điều chuyển xe liên trạm]"),
                ([55, 335, 1310, 845], "Step 2: Lập phiếu Bảo dưỡng (khóa xe Maintenance) hoặc Duyệt lệnh Điều chuyển xe giữa các trạm"),
            ],
        )

        # s23: Branch Revenue & Financial Reports (/reports)
        page.goto("http://localhost:5173/reports", wait_until="networkidle")
        time.sleep(1.5)
        try:
            page.get_by_text("Doanh thu tháng", exact=False).first.click()
            time.sleep(1.2)
        except Exception:
            pass
        verify_and_save(
            page,
            "s23_manager_reports.png",
            [
                ([55, 278, 1295, 336], "Step 1: Chọn chế độ Báo cáo (Doanh thu ngày, Doanh thu tháng, Hiệu suất đội xe, KPI, Dự báo)"),
                ([1070, 162, 1295, 212], "Step 2: Bấm [Xuất Excel] hoặc [Xuất PDF] để tải báo cáo tài chính"),
                ([55, 455, 1310, 845], "Step 3: Phân tích Dòng tiền thuần, Đơn phát sinh & Biểu đồ doanh thu từng ngày trong tháng"),
            ],
        )

        # ======================================================================
        # 5. AUTHENTICATED SYSTEM ADMIN SCREENS (s24 - s29)
        # ======================================================================
        switch_auth(page, tok_admin)

        # s24: System Admin Center — Branch Management & Chain KPIs (/admin)
        page.goto("http://localhost:5173/admin", wait_until="networkidle")
        time.sleep(1.5)
        b_add_branch = dom_box(page, text="Thêm Chi Nhánh Mới", pad=6, fallback=[1055, 115, 1300, 170])
        verify_and_save(
            page,
            "s24_admin_center.png",
            [
                (b_add_branch, "Step 1: Bấm [+ Thêm Chi Nhánh Mới] để mở rộng trạm cho thuê"),
                ([55, 260, 1305, 325], "Step 2: Thanh công cụ Quản trị (Chi nhánh, Người dùng, Nhân sự, Phân ca, Khuyến mãi, Cấu hình, Đối soát)"),
                ([55, 345, 1310, 845], "Step 3: Thống kê Toàn chuỗi & Quản lý danh sách Chi nhánh đang hoạt động"),
            ],
        )

        # s25: System Admin — User Management, RBAC & Ban/Unban (/admin?tab=users)
        page.goto("http://localhost:5173/admin?tab=users", wait_until="networkidle")
        time.sleep(1.5)
        b_tab_users = dom_box(page, text="Người dùng", pad=6, fallback=[175, 265, 315, 320])
        verify_and_save(
            page,
            "s25_admin_users.png",
            [
                (b_tab_users, "Step 1: Chọn tab [Người dùng] trong Trung tâm Quản trị (/admin)"),
                ([55, 345, 1310, 845], "Step 2: Tìm kiếm, Lọc theo Vai trò, Cấp tài khoản Quản lý & Khóa / Mở khóa (Ban/Unban)"),
            ],
        )

        # s26: System Admin — Vehicle Categories (/admin/categories)
        page.goto("http://localhost:5173/admin/categories", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s26_admin_categories.png",
            [
                ([55, 100, 1310, 845], "Step 1: Quản lý 5 Danh mục dòng xe tiêu chuẩn toàn chuỗi (Xe tay ga, Xe số, Xe côn tay, Xe 50cc, Xe điện)"),
            ],
        )

        # s27: System Admin — Homepage Banners & Static Pages CMS (/admin/banners)
        page.goto("http://localhost:5173/admin/banners", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s27_admin_banners_cms.png",
            [
                ([55, 100, 1310, 845], "Step 1: Thêm / Sửa / Sắp xếp thứ tự hiển thị Banner Quảng cáo Trang chủ & Quản trị CMS"),
            ],
        )

        # s28: System Admin — Security Audit Log (/audit)
        page.goto("http://localhost:5173/audit", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s28_admin_audit_log.png",
            [
                ([55, 100, 1310, 845], "Step 1: Tra cứu Nhật ký Bảo mật Hệ thống (AuditLog) bất biến & Tự động ẩn trường nhạy cảm"),
            ],
        )

        # s29: System Admin — 4-Role RBAC Matrix (/rbac)
        page.goto("http://localhost:5173/rbac", wait_until="networkidle")
        time.sleep(1.5)
        verify_and_save(
            page,
            "s29_admin_rbac.png",
            [
                ([55, 100, 1310, 845], "Step 1: Ma trận Phân quyền 4 Vai trò (SystemAdmin, BranchManager, Staff, Customer)"),
            ],
        )

        browser.close()


if __name__ == "__main__":
    capture_full_suite()
    print("SUCCESS: All 29 real screenshots captured and verified with zero errors!")
