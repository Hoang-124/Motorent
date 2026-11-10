# -*- coding: utf-8 -*-
"""
Populate 100% of Section II (all 50 Use Cases, 1.1..9.8) and Section III (all 50 Screens/Functions, 1.1..9.8)
in MOTORENT_RDS_Final.docx, and all 27 User Manual subsections (2.1..6.5) in MOTORENT_Final_Release_Document.docx
using the 29 real screenshots captured from the live running MOTORENT web app.
"""
import os
import zipfile
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import align_with_jobtrans_sample as align_mod

REAL_DIR = r"C:\Users\Hoàng\AppData\Local\Temp\motorent_real_screenshots"
RDS_PATH = r"d:\Motorent\docs\MOTORENT_RDS_Final.docx"
FINAL_REL_PATH = r"d:\Motorent\docs\MOTORENT_Final_Release_Document.docx"

# Extract FPT logo from RDS if needed
logo_temp_path = os.path.join(REAL_DIR, "fpt_logo.png")
if not os.path.exists(logo_temp_path):
    with zipfile.ZipFile(RDS_PATH, "r") as z:
        for name in z.namelist():
            if name.startswith("word/media/image1."):
                with open(logo_temp_path, "wb") as f:
                    f.write(z.read(name))
                break

FEATURES_META = [
    ("1", "Browse & Search", ["UC-01", "UC-02", "UC-03", "UC-04"]),
    ("2", "Authentication", ["UC-05", "UC-06", "UC-07", "UC-08"]),
    ("3", "Customer Profile & Account", ["UC-09", "UC-10", "UC-11"]),
    ("4", "Booking & Payment", ["UC-12", "UC-13", "UC-14", "UC-15", "UC-16", "UC-17", "UC-18", "UC-19"]),
    ("5", "Review, Complaint & Communication", ["UC-20", "UC-21", "UC-22"]),
    ("6", "Notifications & Loyalty", ["UC-23", "UC-24", "UC-25"]),
    ("7", "Counter Desk Operations", ["UC-26", "UC-27", "UC-28", "UC-29", "UC-30", "UC-31", "UC-32"]),
    ("8", "Fleet & Staff Management", ["UC-33", "UC-34", "UC-35", "UC-36", "UC-37", "UC-38", "UC-39", "UC-40", "UC-41", "UC-42"]),
    ("9", "System Administration", ["UC-43", "UC-44", "UC-45", "UC-46", "UC-47", "UC-48", "UC-49", "UC-50"]),
]

# Map each of the 50 UCs to its real screenshot, DB tables, Mongoose query, and UI fields
UC_ENRICHMENT = {
    "UC-01": ("s01_branches_map.png", "/branches", [("Branch", "R", "Query active Da Nang branches & GPS coordinates"), ("Vehicle", "R", "Aggregate available motorbike count per branch")],
              "const branches = await Branch.find({ isActive: true }).lean();\nconst counts = await Vehicle.aggregate([{ $match: { status: 'Available' } }, { $group: { _id: '$branchId', total: { $sum: 1 } } }]);",
              [("branchList", "Card List", "Displays branch name, code, address, hours, and available vehicle count"), ("gpsMap", "Leaflet Map", "Interactive map with markers and flyTo camera focus"), ("nearestBtn", "Button", "Triggers browser geolocation and Haversine sorting")]),
    "UC-02": ("s02_fleet_catalog.png", "/bikes", [("Vehicle", "R", "Filter motorbikes by branch, category, brand, price, and status"), ("Category", "R", "Load 5 standard vehicle categories")],
              "const vehicles = await Vehicle.find({ status: 'Available', branchId, category, dailyPrice: { $gte: minPrice, $lte: maxPrice } }).populate('branchId category').sort({ createdAt: -1 });",
              [("searchKeyword", "Text Input", "Filter by vehicle model or license plate (e.g., Vision, Air Blade, 43-C1)"), ("brandFilter", "Select Dropdown", "Filter by Honda, Yamaha, VinFast"), ("categoryPills", "Filter Pills", "Xe tay ga, Xe máy điện, Xe số, Xe 50cc, Xe côn tay"), ("branchPills", "Filter Pills", "Filter by Da Nang Airport or My Khe Beach station")]),
    "UC-03": ("s03_vehicle_detail.png", "/bikes/:vehicleId", [("Vehicle", "R", "Fetch motorbike specs, 4-angle images, and daily/hourly price"), ("Review", "R", "Load verified customer ratings & review comments")],
              "const vehicle = await Vehicle.findById(vehicleId).populate('branchId category');\nconst reviews = await Review.find({ vehicleId }).populate('userId', 'firstName lastName avatarUrl').sort({ createdAt: -1 });",
              [("angleGallery", "Image Switcher", "Switches between Side, 3/4 Front, and Rear vehicle photos"), ("specBadges", "Info Cards", "Displays transmission, fuel consumption, year, and ODO"), ("bookNowBtn", "Primary Button", "Navigates directly to /booking/:vehicleId"), ("addToCartBtn", "Secondary Button", "Adds motorbike to Multi-Vehicle Cart")]),
    "UC-04": ("s04_rental_policy.png", "/rental-policy", [("StaticPage", "R", "Fetch published rental terms, deposit rules, and BR-06 refund tiers")],
              "const policyPage = await StaticPage.findOne({ slug: 'terms', isPublished: true }).lean();",
              [("policySections", "Accordion / Content", "Displays 30% deposit rule, eKYC verification policy, and BR-06 refund tiers"), ("faqLinks", "Navigation Links", "Links to FAQ (/faq), Terms (/terms), and Privacy (/privacy)")]),
    "UC-05": ("s05_register.png", "/register", [("User", "C, R", "Check unique email/username and create new Customer record"), ("AuditLog", "C", "Log account registration event")],
              "const exists = await User.findOne({ $or: [{ email }, { username }] });\nconst user = await User.create({ username, email, firstName, lastName, phoneNumber, passwordHash, roles: 'Customer', emailVerificationOtp });",
              [("username", "Text Input", "Unique username (required)"), ("email", "Email Input", "Unique email address for OTP verification"), ("firstName / lastName", "Text Input", "Customer full name"), ("phoneNumber", "Tel Input", "10-digit Vietnamese phone number"), ("password", "Password Input", "Hashed with bcryptjs (10 salt rounds)")]),
    "UC-06": ("s07_login.png", "/login", [("User", "R, U", "Verify credentials or Google OAuth2 ID Token; update login counter"), ("AuditLog", "C", "Record authentication audit trail")],
              "const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash');\nconst isValid = await bcrypt.compare(password, user.passwordHash);",
              [("identifier", "Text Input", "Username or registered Email address"), ("password", "Password Input", "Account password with show/hide toggle"), ("loginBtn", "Submit Button", "Authenticates via POST /api/auth/login"), ("googleOAuthBtn", "GIS Button", "1-Click Google Identity Services OAuth 2.0 login")]),
    "UC-07": ("s08_forgot_password.png", "/forgot-password", [("User", "R, U", "Generate single-use password reset OTP/token with 1-hour expiry")],
              "const user = await User.findOne({ email });\nuser.resetPasswordToken = hashedOtp;\nuser.resetPasswordExpires = new Date(Date.now() + 3600000);\nawait user.save();",
              [("email", "Email Input", "Registered email address to receive recovery OTP"), ("sendOtpBtn", "Submit Button", "Triggers Nodemailer OTP dispatch"), ("newPassword", "Password Input", "New password on /reset-password screen")]),
    "UC-08": ("s07_login.png", "/logout", [("User", "U", "Increment tokenVersion to revoke active JWT token"), ("AuditLog", "C", "Record user logout event")],
              "await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });\nawait AuditLog.create({ userId: req.user.id, action: 'LOGOUT', entity: 'User' });",
              [("userMenuDropdown", "Header Menu", "Displays logged-in user avatar, role badge, and Logout button"), ("logoutBtn", "Action Button", "Clears JWT from storage, disconnects Socket.IO, and revokes token")]),
    "UC-09": ("s09_profile_info.png", "/profile (Tab 03)", [("User", "R, U", "Fetch and update personal profile details and avatar photo")],
              "const updated = await User.findByIdAndUpdate(req.user.id, { $set: { firstName, lastName, phoneNumber, dateOfBirth, avatarUrl } }, { new: true });",
              [("firstName / lastName", "Text Input", "Editable customer full name"), ("phoneNumber", "Tel Input", "Editable contact number"), ("avatarUpload", "File Upload", "Profile picture upload (JPEG/PNG/WebP <= 5MB)"), ("saveProfileBtn", "Submit Button", "Persists profile updates via PUT /api/auth/profile")]),
    "UC-10": ("s10_profile_ekyc.png", "/profile (Tab 04)", [("User", "U", "Store encrypted CCCD front/back, Driving License A1/A2, and portrait photo"), ("AuditLog", "C", "Record eKYC submission")],
              "await User.findByIdAndUpdate(req.user.id, { $set: { cccdNumber, cccdFrontUrl, cccdBackUrl, licenseFrontUrl, portraitUrl, identityStatus: 'Pending' } });",
              [("cccdNumber", "Text Input", "12-digit Citizen ID / Passport number"), ("cccdFront / cccdBack", "File Upload", "Front and back photos of CCCD"), ("drivingLicense", "File Upload", "A1/A2 Driving License image"), ("portraitPhoto", "File Upload", "Selfie portrait for facial verification")]),
    "UC-11": ("s11_change_password.png", "/profile (Tab 06)", [("User", "R, U", "Verify current password, hash new password, and rotate tokenVersion")],
              "const user = await User.findById(req.user.id).select('+passwordHash');\nuser.passwordHash = await bcrypt.hash(newPassword, 10);\nuser.tokenVersion += 1;\nawait user.save();",
              [("currentPassword", "Password Input", "Existing password for verification"), ("newPassword", "Password Input", "New password (>= 8 characters)"), ("confirmPassword", "Password Input", "Must match newPassword")]),
    "UC-12": ("s12_wishlist.png", "/wishlist", [("Wishlist", "C, R, D", "Add, list, or remove bookmarked motorbikes for the authenticated customer")],
              "const wishlist = await Wishlist.find({ userId: req.user.id }).populate({ path: 'vehicleId', populate: ['branchId', 'category'] });",
              [("wishlistGrid", "Vehicle Grid", "Displays saved motorbikes with live availability status"), ("removeBookmarkBtn", "Icon Button", "Removes motorbike from Wishlist"), ("quickBookBtn", "Button", "Opens booking wizard for the saved motorbike")]),
    "UC-13": ("s01_branches_map.png", "/branches", [("Branch", "R", "Retrieve branch coordinates and compute Haversine distance from user GPS")],
              "const branches = await Branch.find({ isActive: true }).lean();\n// Sorted by Haversine distance (R = 6371 km) from (lat, lng)",
              [("findNearestBtn", "Button", "Requests navigator.geolocation and sorts branches by km distance"), ("distanceBadge", "Badge", "Displays calculated distance in km from customer's location")]),
    "UC-14": ("s14_booking_wizard.png", "/booking/:vehicleId & /cart", [("Booking", "C, R", "Verify zero date-overlap conflicts and create single or multi-vehicle cart bookings"), ("Discount", "R, U", "Validate promo voucher and increment usedCount")],
              "const conflict = await Booking.findOne({ vehicleId, status: { $in: ['Pending', 'Confirmed', 'Ongoing'] }, pickupDateTime: { $lt: returnDateTime }, returnDateTime: { $gt: pickupDateTime } });\nconst booking = await Booking.create({ bookingCode, groupCode, userId, vehicleId, pickupBranchId, returnBranchId, pickupDateTime, returnDateTime, totalAmount, depositAmount });",
              [("pickupBranchId / returnBranchId", "Select Dropdown", "Supports cross-branch return at any Da Nang station (0 VND fee)"), ("pickupDateTime / returnDateTime", "DateTime Picker", "Rental schedule with real-time conflict check"), ("voucherCode", "Text Input", "Applies promo code (e.g., CHAOBANMOI, DANANGVIP)"), ("cartBatchCheckout", "Cart Drawer (/cart)", "Allows booking multiple motorbikes in one shared CART-XXE order")]),
    "UC-15": ("s14_booking_wizard.png", "/vnpay-return", [("Payment", "C, U", "Create payment record and verify VNPay HMAC-SHA512 IPN/Return signature"), ("Booking", "U", "Confirm single booking or all bookings in a Multi-Vehicle Cart group")],
              "const isValid = verifyVnPayChecksum(vnp_Params, process.env.VNP_HASHSECRET);\nawait Booking.updateMany({ $or: [{ bookingCode: txnRef }, { groupCode: txnRef }] }, { $set: { status: 'Confirmed', depositPaid: true } });",
              [("paymentMethod", "Radio Group", "30% Online Deposit via VNPay / VietQR and 70% Counter Settlement"), ("vnpayGatewayForm", "VNPay Sandbox", "NCB Test Card 9704198526191432198, OTP 123456"), ("returnStatusCard", "Status View", "Displays verified transaction reference and confirmed booking codes")]),
    "UC-16": ("s15_my_bookings.png", "/profile (Tab 01)", [("Booking", "R, U", "Cancel Pending/Confirmed order per BR-06 tiers or terminate Ongoing trip early"), ("Vehicle", "U", "Immediately release motorbike status back to Available")],
              "booking.status = 'Cancelled';\nbooking.cancellationReason = reason;\nbooking.refundAmount = calcRefundByBR06(booking.pickupDateTime, booking.depositAmount);\nawait booking.save();\nawait Vehicle.findByIdAndUpdate(booking.vehicleId, { $set: { status: 'Available' } });",
              [("cancelOrderBtn", "Danger Button", "Triggers cancellation modal on Pending, Confirmed, or Ongoing bookings"), ("cancellationReason", "Textarea", "Customer reason for cancellation or early return"), ("refundPreview", "Alert Box", "Shows automatic BR-06 refund tier (>24h: 100%, 12-24h: 50%, <12h: 0%)")]),
    "UC-17": ("s15_my_bookings.png", "/profile (Tab 01)", [("Booking", "R, U", "Check subsequent booking conflicts and extend returnDateTime for Ongoing trip")],
              "const conflict = await Booking.findOne({ _id: { $ne: bookingId }, vehicleId: booking.vehicleId, status: { $in: ['Pending', 'Confirmed', 'Ongoing'] }, pickupDateTime: { $lt: newReturnDate }, returnDateTime: { $gt: booking.returnDateTime } });\nbooking.returnDateTime = newReturnDate;\nbooking.totalAmount += extraFee;\nawait booking.save();",
              [("extendRentalBtn", "Action Button", "Opens extension date/time modal on Ongoing bookings"), ("newReturnDateTime", "DateTime Picker", "New requested return date/time"), ("extraFeeSummary", "Calculation Box", "Displays additional rental days/hours and fee")]),
    "UC-18": ("s15_my_bookings.png", "/profile (Tab 01)", [("Booking", "R", "List customer bookings filtered by status with 4-angle handover photos")],
              "const bookings = await Booking.find({ userId: req.user.id }).populate('vehicleId pickupBranchId returnBranchId').sort({ createdAt: -1 });",
              [("statusFilterTabs", "Tab Bar", "Tất cả đơn, Đang giữ xe / Đang thuê, Đã hoàn thành, Đã hủy"), ("contractSearch", "Search Input", "Search by booking code (e.g., MV-638774)"), ("checkInPhotosGrid", "4-Photo Gallery", "Displays 4 pre-rental and 4 return inspection photos")]),
    "UC-19": ("s15_my_bookings.png", "/booking-details/:id", [("Booking", "R", "Fetch full contract, vehicle, branch, and payment breakdown for PDF generation"), ("Payment", "R", "Include deposit and settlement transaction timestamps")],
              "const booking = await Booking.findById(id).populate('userId vehicleId pickupBranchId returnBranchId');\n// Stream PDF document via PDFKit with itemized rental & deposit table",
              [("downloadPdfBtn", "Button", "Downloads formatted PDF rental contract & receipt"), ("contractBreakdown", "Summary Panel", "Shows itemized daily price, voucher discount, 30% deposit, and 70% balance")]),
    "UC-20": ("s03_vehicle_detail.png", "/bikes/:vehicleId", [("Review", "C, R", "Create 1-5 star review for Completed booking and recalculate Vehicle.averageRating"), ("Vehicle", "U", "Update averageRating and reviewCount")],
              "const review = await Review.create({ bookingId, userId: req.user.id, vehicleId, rating, comment });\nconst stats = await Review.aggregate([{ $match: { vehicleId } }, { $group: { _id: '$vehicleId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);\nawait Vehicle.findByIdAndUpdate(vehicleId, { averageRating: stats[0].avg, reviewCount: stats[0].count });",
              [("starRatingSelector", "1-5 Stars", "Selects overall satisfaction rating"), ("reviewComment", "Textarea", "Detailed feedback on engine, brakes, and counter service"), ("submitReviewBtn", "Submit Button", "Posts verified review and updates vehicle rating")]),
    "UC-21": ("s17_complaints_customer.png", "/complaints", [("Complaint", "C, R", "Submit service/vehicle complaint linked to booking and track resolution status")],
              "const complaint = await Complaint.create({ userId: req.user.id, bookingId, branchId, title, description, severity, status: 'Open' });",
              [("bookingSelector", "Select Dropdown", "Links complaint to a specific rental contract"), ("complaintTitle / description", "Text & Textarea", "Describes vehicle or service issue"), ("statusBadge", "Status Pill", "Tracks Open -> In Progress -> Resolved state")]),
    "UC-22": ("s01_branches_map.png", "LiveChatWidget (Global)", [("Conversation", "C, R", "Find or create customer-branch chat room"), ("Message", "C, R", "Persist real-time Socket.IO chat messages")],
              "const msg = await Message.create({ conversationId, senderId: req.user.id, content, readBy: [req.user.id] });\nio.to(conversationId).emit('new_message', msg);",
              [("chatFloatingBtn", "Header / Floating Button", "Opens real-time Socket.IO Live Chat popover"), ("messageInput", "Text Input", "Sends instant message to branch counter staff")]),
    "UC-23": ("s15_my_bookings.png", "Header Notification Bell", [("Notification", "C, R, U", "Deliver real-time push notifications and mark as read"), ("BookingReminder", "C, U", "Cron job dispatches 24h/2h pickup & return email reminders")],
              "const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);\nawait Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });",
              [("notificationBell", "Header Icon + Badge", "Displays unread notification count in real time"), ("notificationDropdown", "Popover List", "Lists booking confirmations, eKYC approval, and return reminders")]),
    "UC-24": ("s16_loyalty_vouchers.png", "/profile (Tab 02)", [("User", "R, U", "Credit +1 point per 10,000 VND completed rental and deduct points on voucher redemption"), ("Discount", "C, R", "Issue personal discount voucher code")],
              "await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: earnedPoints } });",
              [("loyaltyPointsCard", "Metric Card", "Displays current loyalty points and membership tier"), ("redeemVoucherBtn", "Action Button", "Exchanges loyalty points for a discount code")]),
    "UC-25": ("s16_loyalty_vouchers.png", "/profile (Tab 02)", [("User", "R, U", "Generate unique referralCode and toggle promotional newsletter subscription")],
              "await User.findByIdAndUpdate(req.user.id, { $set: { newsletterSubscribed: isSubscribed } });",
              [("referralCodeBox", "Copyable Code", "Displays personal referral code for bonus points"), ("promoSubscriptionToggle", "Switch", "Enables/disables promotional email alerts")]),
    "UC-26": ("s18_staff_counter.png", "/counter", [("Booking", "R", "Query branch pickup & return queue filtered by status and search keyword")],
              "const queue = await Booking.find({ $or: [{ pickupBranchId: branchId }, { returnBranchId: branchId }], status: { $in: statusFilter } }).populate('userId vehicleId').sort({ pickupDateTime: 1 });",
              [("queueSearchInput", "Search Input", "Search by booking code (MV-xxxxxx), customer phone, or license plate"), ("queueStatusPills", "Filter Pills", "Tất cả (16), Chờ nhận (2), Đang thuê (1), Đã trả (4), Đã hủy (9)"), ("queueOrderCards", "Selectable List", "Loads selected booking into the right-hand Check-in / Check-out workspace")]),
    "UC-27": ("s18_staff_counter.png", "/counter (Tab 1 Check-in)", [("Booking", "U", "Record 5-point handover: eKYC check, 70% payment, 4 pre-rental photos, start ODO/fuel, e-signature"), ("Vehicle", "U", "Transition vehicle status to Rented")],
              "await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'Ongoing', startOdometer, startFuelLevel, checkInPhotos, customerSignatureUrl, actualPickupDateTime: new Date() } });\nawait Vehicle.findByIdAndUpdate(vehicleId, { $set: { status: 'Rented', odometer: startOdometer } });",
              [("collectCounterBalanceBtn", "Action Button", "Records 70% remaining balance collection at counter"), ("startOdometer / startFuel", "Number & Pill Selector", "Records starting ODO (km) and fuel level (100%, 75%, 50%, 25%)"), ("fourAngleCheckInPhotos", "4-Slot Upload", "Uploads Front, Rear, Left, Right photos before handover"), ("confirmCheckInBtn", "Submit Button", "Transitions contract to Ongoing")]),
    "UC-28": ("s18_staff_counter.png", "/counter (Tab 2 Check-out)", [("Booking", "U", "Complete vehicle return, record end ODO/fuel & 4 return photos, credit loyalty points"), ("Vehicle", "U", "Automatically relocate Vehicle.branchId to actual return branch and set Available")],
              "await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'Completed', endOdometer, endFuelLevel, checkOutPhotos, actualReturnBranchId, actualReturnDateTime: new Date() } });\nawait Vehicle.findByIdAndUpdate(vehicleId, { $set: { branchId: actualReturnBranchId, odometer: endOdometer, status: 'Available' } });",
              [("endOdometer / endFuel", "Number & Pill Selector", "Records ending ODO (km) and return fuel level"), ("fourAngleCheckOutPhotos", "4-Slot Upload", "Compares 4 return photos against pre-rental photos"), ("crossBranchSelector", "Branch Indicator", "Automatically relocates vehicle inventory to the return station"), ("confirmCheckOutBtn", "Submit Button", "Closes contract as Completed and awards loyalty points")]),
    "UC-29": ("s18_staff_counter.png", "/counter (Tab 2 Penalty)", [("Booking", "U", "Calculate late fee (30,000 VND/hr per BR-08) and record damage compensation fee"), ("Payment", "C", "Log penalty settlement transaction")],
              "const lateHours = Math.max(0, Math.ceil((actualReturn - scheduledReturn) / 3600000));\nconst lateFee = lateHours * 30000;\nawait Booking.findByIdAndUpdate(bookingId, { $set: { lateFee, damageFee, damageNotes, totalPenalty: lateFee + damageFee } });",
              [("lateFeeAutoCalc", "Read-only Field", "Auto-computes overdue hours x 30,000 VND/hr (BR-08)"), ("damageFeeInput", "Number Input", "Additional compensation for scratches or damaged parts"), ("incidentPhotos", "File Upload", "Evidence photos of vehicle damage")]),
    "UC-30": ("s22_manager_fleet_ops.png", "/manager/fleet-operations", [("MaintenanceLog", "C", "Create maintenance repair ticket with estimated cost and description"), ("Vehicle", "U", "Flag vehicle status as Maintenance to block new bookings")],
              "await MaintenanceLog.create({ vehicleId, branchId, reportedBy: req.user.id, reason, cost, odoAtMaintenance: vehicle.odometer, status: 'InProgress' });\nawait Vehicle.findByIdAndUpdate(vehicleId, { $set: { status: 'Maintenance', requiresMaintenance: true } });",
              [("vehicleSelector", "Select Dropdown", "Selects damaged or high-ODO motorbike"), ("maintenanceReason / cost", "Text & Number Input", "Describes repair items (oil change, brake pad, tire)"), ("flagMaintenanceBtn", "Submit Button", "Locks vehicle in Maintenance state")]),
    "UC-31": ("s19_staff_complaints.png", "/staff/complaints", [("Complaint", "R, U", "Inspect branch customer complaints, post staff resolution notes, and update status")],
              "await Complaint.findByIdAndUpdate(complaintId, { $set: { status: 'Resolved', resolutionNote, resolvedBy: req.user.id, resolvedAt: new Date() } });",
              [("complaintQueueTable", "Data Table", "Lists Open and In-Progress complaints for the branch"), ("resolutionNote", "Textarea", "Staff response and compensation explanation"), ("markResolvedBtn", "Submit Button", "Updates status to Resolved and notifies customer")]),
    "UC-32": ("s18_staff_counter.png", "Header Chat Trạm Console", [("Conversation", "R, U", "List active customer chat threads assigned to the branch"), ("Message", "C, R", "Send real-time staff reply via Socket.IO")],
              "const reply = await Message.create({ conversationId, senderId: req.user.id, senderRole: 'Staff', content });\nio.to(conversationId).emit('new_message', reply);",
              [("branchChatDrawer", "Header Button (Chat Trạm)", "Opens branch live support console with unread badge"), ("replyInput", "Text Input", "Sends instant response to customer")]),
    "UC-33": ("s21_manager_vehicles.png", "/manager/vehicles", [("Vehicle", "C", "Register new motorbike with unique license plate, category, daily/hourly price, and photos"), ("AuditLog", "C", "Log fleet addition")],
              "const vehicle = await Vehicle.create({ branchId, category, brand, vehicleModel, licensePlate, dailyPrice, hourlyPrice, transmissionType, fuelType, images, status: 'Available' });",
              [("brand / vehicleModel", "Text Input", "Brand (Honda, Yamaha, VinFast) and model name"), ("licensePlate", "Text Input", "Unique license plate (e.g., 43-C1 284.67)"), ("categorySelect", "Select Dropdown", "Assigns to 1 of 5 standard categories"), ("dailyPrice / hourlyPrice", "Number Input", "Rental rates in VND")]),
    "UC-34": ("s21_manager_vehicles.png", "/manager/vehicles", [("Vehicle", "U, D", "Update motorbike specs/photos or decommission (soft-delete) if no active bookings exist")],
              "const activeBooking = await Booking.findOne({ vehicleId, status: { $in: ['Pending', 'Confirmed', 'Ongoing'] } });\nif (activeBooking) throw new AppError('Cannot decommission vehicle with active bookings', 400);\nawait Vehicle.findByIdAndUpdate(vehicleId, { $set: { status: 'Decommissioned' } });",
              [("editVehicleModal", "Modal Form", "Edits existing motorbike specifications and image gallery"), ("statusSelect", "Select Dropdown", "Available, Maintenance, Decommissioned"), ("deleteVehicleBtn", "Danger Button", "Soft-deletes vehicle when no active bookings exist")]),
    "UC-35": ("s21_manager_vehicles.png", "/manager/vehicles", [("Vehicle", "U", "Update dailyPrice and hourlyPrice"), ("SeasonalPricingRule", "C, R, U", "Configure holiday/weekend peak multiplier rules")],
              "await Vehicle.findByIdAndUpdate(vehicleId, { $set: { dailyPrice, hourlyPrice } });\nawait SeasonalPricingRule.create({ name, startDate, endDate, multiplier, branchId });",
              [("dailyPriceInput", "Number Input", "Standard 24-hour rental rate (VND)"), ("hourlyPriceInput", "Number Input", "Hourly rental rate (VND)"), ("seasonalMultiplier", "Number Input", "Peak season rate multiplier (e.g., 1.2x)")]),
    "UC-36": ("s20_manager_dashboard.png", "/manager/dashboard", [("Booking", "R, U", "Review pending bookings, verify eKYC documents, and approve or reject with reason")],
              "await Booking.findByIdAndUpdate(bookingId, { $set: { status: decision, managerNote, reviewedBy: req.user.id } });",
              [("pendingBookingsList", "Queue Table", "Displays bookings awaiting manager verification"), ("approveBookingBtn", "Success Button", "Approves order and notifies customer"), ("rejectBookingBtn", "Danger Button", "Rejects order with mandatory reason and initiates refund")]),
    "UC-37": ("s20_manager_dashboard.png", "/manager/dashboard", [("Booking", "R, U", "Evaluate cancelled bookings with BR-06 refund eligibility and mark refund completed"), ("Payment", "C", "Record refund disbursement transaction")],
              "await Payment.create({ bookingId, userId: booking.userId, amount: booking.refundAmount, type: 'Refund', status: 'Completed', processedBy: req.user.id });\nawait Booking.findByIdAndUpdate(bookingId, { $set: { refundStatus: 'Refunded' } });",
              [("refundRequestsTable", "Data Table", "Lists cancelled orders eligible for 100% or 50% deposit refund"), ("confirmRefundBtn", "Action Button", "Confirms refund transfer and logs Payment record")]),
    "UC-38": ("s22_manager_fleet_ops.png", "/manager/fleet-operations", [("MaintenanceLog", "C, R, U", "Monitor >= 3,000 km ODO alerts (BR-10), schedule maintenance, and close completed logs"), ("Vehicle", "U", "Reset lastMaintenanceBucket and restore status to Available")],
              "const highOdoVehicles = await Vehicle.find({ branchId, $expr: { $gte: [{ $subtract: ['$odometer', '$lastMaintenanceBucket'] }, 3000] } });\nawait MaintenanceLog.findByIdAndUpdate(logId, { $set: { status: 'Completed', completedAt: new Date() } });",
              [("odoAlertBanner", "Warning Card", "Highlights motorbikes exceeding the 3,000 km maintenance interval"), ("quickScheduleModal", "1-Click Modal", "Creates preventive maintenance ticket directly from Fleet list"), ("completeMaintenanceBtn", "Action Button", "Restores motorbike to Available and updates ODO bucket")]),
    "UC-39": ("s22_manager_fleet_ops.png", "/manager/fleet-operations", [("VehicleTransfer", "C, R, U", "Create inter-branch transfer order, approve dispatch, and relocate Vehicle.branchId"), ("Vehicle", "U", "Update branchId to destination branch")],
              "const transfer = await VehicleTransfer.create({ vehicleId, fromBranchId, toBranchId, requestedBy: req.user.id, reason, status: 'Approved' });\nawait Vehicle.findByIdAndUpdate(vehicleId, { $set: { branchId: toBranchId } });",
              [("sourceBranch / destBranch", "Select Dropdown", "Selects origin and destination Da Nang branches"), ("transferVehiclesSelect", "Multi-Select", "Chooses motorbikes to relocate"), ("approveTransferBtn", "Submit Button", "Approves transfer and updates Vehicle.branchId")]),
    "UC-40": ("s22_manager_fleet_ops.png", "/manager/fleet-operations", [("User", "C, R, U", "Create, update, or lock Staff accounts scoped to the manager's branch")],
              "const staff = await User.create({ username, email, firstName, lastName, phoneNumber, passwordHash, roles: 'Staff', branchId: req.user.branchId, status: 'Active' });",
              [("staffForm", "Modal Form", "Provisions new Counter Staff account for the branch"), ("staffStatusToggle", "Action Button", "Activates or deactivates branch staff member")]),
    "UC-41": ("s22_manager_fleet_ops.png", "/manager/fleet-operations", [("StaffSchedule", "C, R, U", "Assign Morning/Afternoon/Evening shifts and record staff check-in/out attendance")],
              "const schedule = await StaffSchedule.create({ staffId, branchId, workDate, shiftType, startTime, endTime, attendanceStatus: 'Scheduled' });",
              [("shiftCalendarGrid", "Weekly Calendar", "Displays Morning (07:00-15:00) and Afternoon (15:00-22:30) shifts"), ("assignShiftModal", "Form Modal", "Assigns staff member to date and shift"), ("attendanceBadge", "Status Badge", "Tracks On-Time, Late (>15m), or Absent status")]),
    "UC-42": ("s23_manager_reports.png", "/reports", [("Booking", "R", "Aggregate branch revenue, completed trips, and fleet utilization"), ("Payment", "R", "Summarize deposit and settlement cashflows for Excel/PDF export")],
              "const revenue = await Booking.aggregate([{ $match: { pickupBranchId: branchId, status: 'Completed' } }, { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' }, trips: { $sum: 1 } } }]);",
              [("dateRangePicker", "Date Filter", "Filters report by day, month, or custom range"), ("exportExcelBtn", "Button", "Exports branch financial report via ExcelJS (.xlsx)"), ("exportPdfBtn", "Button", "Exports printable PDF revenue report via PDFKit")]),
    "UC-43": ("s24_admin_center.png", "/admin (Tab Chi nhánh)", [("Branch", "C, R", "Create new rental branch with unique code, address, GPS coordinates, and managerId"), ("AuditLog", "C", "Log branch creation")],
              "const branch = await Branch.create({ name, code, address, phone, email, location_lat, location_lng, hours_open, hours_close, managerId, isActive: true });",
              [("addBranchBtn", "Primary Button (+ Thêm Chi Nhánh Mới)", "Opens new branch creation modal"), ("branchCode / name", "Text Input", "Unique code (e.g., CN-DAD, CN-MK) and branch title"), ("gpsLat / gpsLng", "Number Input", "Latitude & Longitude for Leaflet GPS map")]),
    "UC-44": ("s24_admin_center.png", "/admin (Tab Chi nhánh)", [("Branch", "U", "Update branch details, operating hours, assigned manager, or deactivate branch")],
              "const activeRentals = await Booking.countDocuments({ pickupBranchId: branchId, status: 'Ongoing' });\nif (activeRentals > 0 && !isActive) throw new AppError('Branch has ongoing rentals', 400);\nawait Branch.findByIdAndUpdate(branchId, { $set: updatePayload });",
              [("branchFilterPills", "Filter Pills", "Tất cả (2), Đang hoạt động (2), Tạm dừng (0)"), ("editBranchBtn", "Action Button", "Updates branch address, hotline, GPS, or active state")]),
    "UC-45": ("s25_admin_users.png", "/admin (Tab Người dùng) & /rbac", [("User", "C, R, U", "List all users, provision Branch Managers, assign roles, and Ban/Unban accounts"), ("AuditLog", "C", "Record RBAC and account lock/unlock actions")],
              "await User.findByIdAndUpdate(targetUserId, { $set: { status: isBanned ? 'Banned' : 'Active', roles: newRole }, $inc: { tokenVersion: 1 } });",
              [("userRoleFilter", "Filter Tabs", "Filter by SystemAdmin, BranchManager, Staff, Customer"), ("banUnbanBtn", "Action Button", "Locks (Ban) or unlocks (Unban) user account and revokes active tokens"), ("assignRoleSelect", "Select Dropdown", "Updates user RBAC role and assigned branch")]),
    "UC-46": ("s28_admin_audit_log.png", "/audit", [("AuditLog", "R", "Search and inspect tamper-evident system security logs with sensitive field redaction")],
              "const logs = await AuditLog.find(filter).populate('userId', 'username email roles').sort({ createdAt: -1 }).limit(100);",
              [("auditFilterBar", "Search & Filter", "Filter by Actor, Action (CREATE/UPDATE/DELETE/LOGIN), Entity, and Date"), ("auditPayloadViewer", "JSON Diff Drawer", "Displays request metadata with passwordHash/token automatically redacted")]),
    "UC-47": ("s26_admin_categories.png", "/admin/categories & /admin (Tab Khuyến mãi)", [("Category", "C, R, U, D", "Manage 5 standard motorbike categories"), ("Discount", "C, R, U, D", "Create and manage promotional voucher codes")],
              "const category = await Category.create({ name, slug, description });\nconst discount = await Discount.create({ code, discountPercent, minBookingAmount, maxDiscountAmount, startDate, endDate, usageLimit, isActive: true });",
              [("categoryTable", "CRUD Table", "Manages Xe tay ga, Xe số, Xe côn tay, Xe 50cc, Xe máy điện"), ("voucherModal", "Form Modal", "Configures promo code, %, max discount, and validity dates")]),
    "UC-48": ("s24_admin_center.png", "/admin (Tab Chính sách & Đa ngôn ngữ)", [("StaticPage", "U", "Update global deposit %, BR-06 refund tiers, BR-08 late fee, and VI/EN locale dictionary")],
              "await StaticPage.findOneAndUpdate({ slug: 'system-config' }, { $set: { content: JSON.stringify(policyConfig), lastUpdatedBy: req.user.id } }, { upsert: true });",
              [("policyConfigForm", "Settings Panel", "Configures 30% deposit ratio, 3,000 km ODO threshold, and 30,000 VND/hr late fee"), ("localeSwitcher", "VI / EN Toggle", "Switches application interface between Vietnamese and English")]),
    "UC-49": ("s27_admin_banners_cms.png", "/admin/banners & /admin/pages", [("Banner", "C, R, U, D", "Manage homepage promotional banners and display order"), ("StaticPage", "C, R, U, D", "Edit rich-text FAQ, Terms, and Privacy pages")],
              "const banners = await Banner.find().sort({ order: 1 });\nawait StaticPage.findOneAndUpdate({ slug }, { $set: { title, content: sanitizeHtml(content), isPublished: true } });",
              [("bannerListTable", "Sortable List", "Manages hero banner title, subtitle, image URL, and active toggle"), ("tiptapRichEditor", "Rich Text Editor", "Edits HTML content for /faq, /terms, and /privacy")]),
    "UC-50": ("s24_admin_center.png", "/admin (Tab Đối soát & Thuế / Báo cáo)", [("Booking", "R", "Aggregate chain-wide revenue KPIs and branch comparison metrics"), ("Payment", "R", "Reconcile VNPay IPN transactions and export tax reports")],
              "const kpis = await Booking.aggregate([{ $match: { status: { $in: ['Confirmed', 'Ongoing', 'Completed'] } } }, { $group: { _id: '$pickupBranchId', revenue: { $sum: '$totalAmount' }, deposits: { $sum: '$depositAmount' }, count: { $sum: 1 } } }]);",
              [("chainKpiCards", "Executive KPI Row", "Displays total branches, fleet utilization, and chain revenue"), ("vnpayReconciliationTable", "Audit Table", "Cross-checks VNPay vnp_TxnRef payments against confirmed bookings")]),
}


def make_table(doc, headers, rows, col_widths=None, hdr_bg="1F4E78"):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    align_mod.set_table_borders(tbl)
    for c_i, h in enumerate(headers):
        align_mod.format_cell(tbl.rows[0].cells[c_i], h, bold=True, size=10, color=(255, 255, 255), align=WD_ALIGN_PARAGRAPH.CENTER, bg=hdr_bg)
        if col_widths and c_i < len(col_widths):
            tbl.rows[0].cells[c_i].width = Inches(col_widths[c_i])
    for r_i, r_data in enumerate(rows, start=1):
        bg = "F9FAFB" if r_i % 2 == 0 else None
        for c_i, val in enumerate(r_data):
            align = WD_ALIGN_PARAGRAPH.CENTER if (c_i == 0 and len(str(val)) <= 14) else WD_ALIGN_PARAGRAPH.LEFT
            align_mod.format_cell(tbl.rows[r_i].cells[c_i], val, bold=(c_i == 0 and len(headers) == 2), size=10, align=align, bg=bg)
            if col_widths and c_i < len(col_widths):
                tbl.rows[r_i].cells[c_i].width = Inches(col_widths[c_i])
    return tbl


def rebuild_full_50uc_rds():
    # Load existing RDS and preserve everything up to Section II and from Section IV onwards
    base_doc = docx.Document(RDS_PATH)

    # Create a fresh document by copying Section I from base_doc, or editing base_doc in place:
    # Let's build into a clean copy of base_doc where we remove the partial Section II & III elements
    # and insert the complete 50-UC Section II + 50-Screen Section III right before Section IV.Appendix!
    body = base_doc.element.body
    sec2_idx = None
    sec4_idx = None
    for idx, el in enumerate(body):
        if el.tag.endswith("p"):
            txt = "".join(el.itertext()).strip()
            if txt.startswith("II. Requirement Specifications") and sec2_idx is None:
                sec2_idx = idx
            elif txt.startswith("IV. Appendix") and sec4_idx is None:
                sec4_idx = idx

    print(f"Found Section II at body index {sec2_idx}, Section IV at {sec4_idx}")
    # Detach Section IV elements so we can append Section II & III cleanly and then re-attach Section IV
    sec4_elements = []
    sectPr = None
    for el in list(body)[sec4_idx:]:
        if el.tag.endswith("sectPr"):
            sectPr = el
        else:
            sec4_elements.append(el)
            body.remove(el)

    # Remove old partial Section II & III elements
    for el in list(body)[sec2_idx:]:
        if not el.tag.endswith("sectPr"):
            body.remove(el)

    # Build lookup of ITEMS by uc_id
    items_by_uc = {it[0]: it for it in align_mod.ITEMS}

    # ==========================================================================
    # APPEND COMPLETE SECTION II: REQUIREMENT SPECIFICATIONS (ALL 50 UCs)
    # ==========================================================================
    base_doc.add_heading("II. Requirement Specifications", level=1)
    align_mod.add_para(base_doc, "This section specifies the functional requirements and business rules for all 50 Use Cases (UC-01 to UC-50) organized across the 9 core features of MOTORENT, matching the Total Project Tracking and SDS numbering (1.1 to 9.8).")

    for f_num, f_name, uc_list in FEATURES_META:
        base_doc.add_heading(f"{f_num}. {f_name} Feature", level=2)
        for sub_idx, uc_id in enumerate(uc_list, start=1):
            item = items_by_uc[uc_id]
            _, screen_func, feature, actor, desc, in_charge, status, actual_iter, updated_iter, update_details, srs_ref, sds_ref, iter_note = item
            img_file, route_str, crud_rows, mongo_query, field_rows = UC_ENRICHMENT[uc_id]

            base_doc.add_heading(f"{sds_ref} {uc_id}_{screen_func}", level=3)
            align_mod.add_para(base_doc, "a. Functionalities", bold=True, size=11)

            spec_rows = [
                ["UC ID and Name:", f"{uc_id} — {screen_func}"],
                ["Created By:", f"{in_charge} (Group 4 — MOTORENT)          Iteration: {actual_iter.upper()}"],
                ["Primary Actor:", actor],
                ["Trigger:", f"Actor navigates to '{route_str}' or invokes the '{screen_func}' action on the MOTORENT interface."],
                ["Description:", desc],
                ["Preconditions:", f"PRE-1: System database and API server are online.\nPRE-2: Actor has required RBAC permission ({actor})."],
                ["Postconditions:", f"POST-1: {iter_note}.\nPOST-2: Database state and audit trail are persisted accurately."],
                ["Normal Flow:", (
                    f"1. Actor opens the '{screen_func}' screen at route '{route_str}'.\n"
                    f"2. System validates session/RBAC permissions and renders UI fields ({', '.join(f[0] for f in field_rows)}).\n"
                    f"3. Actor inputs or selects required parameters and submits the action.\n"
                    f"4. Backend Controller & Service validate business rules, execute Mongoose queries on ({', '.join(c[0] for c in crud_rows)}), and return JSON response.\n"
                    f"5. UI displays confirmation message and updates state in real time."
                )],
                ["Alternative Flows:", update_details if update_details else f"Actor may filter, reset inputs, or return to the previous screen without saving changes."],
                ["Exceptions:", "E1: Invalid input parameters or business rule violation -> System displays inline/toast message (MSG01–MSG26) and aborts transaction."],
                ["Priority:", "High (Mandatory Release v1.2)"],
                ["Business Rules:", "Enforces RBAC matrix, input sanitization, and applicable rules BR-01..BR-15 & MSG01..MSG26."],
            ]
            make_table(base_doc, ["Attribute", "Specification"], spec_rows, col_widths=[1.8, 4.7])

            align_mod.add_para(base_doc, "b. Business Rules", bold=True, size=11)
            br_rows = [
                [f"BR-{uc_id}-01", "RBAC & Input Validation", f"Only authorized actors ({actor}) can execute {screen_func}; all request payloads are validated via Zod/Mongoose schemas."],
                [f"BR-{uc_id}-02", "Domain Integrity & Audit", f"{iter_note}. System logs state changes and returns standardized messages (MSG01–MSG26)."],
            ]
            make_table(base_doc, ["ID", "Business Rule", "Business Rule Description"], br_rows, col_widths=[1.2, 1.8, 3.5])
            align_mod.add_para(base_doc, "", space_after=4)

    # ==========================================================================
    # APPEND COMPLETE SECTION III: DESIGN SPECIFICATIONS (ALL 50 SCREENS/UCs)
    # ==========================================================================
    base_doc.add_page_break()
    base_doc.add_heading("III. Design Specifications", level=1)
    align_mod.add_para(base_doc, "This section provides the complete UI Design (live screenshots captured from the running MOTORENT application), UI Field Specifications, Database Access CRUD tables, and Mongoose queries for all 50 functions (1.1 to 9.8).")

    for f_num, f_name, uc_list in FEATURES_META:
        base_doc.add_heading(f"{f_num}. {f_name}", level=2)
        for uc_id in uc_list:
            item = items_by_uc[uc_id]
            _, screen_func, feature, actor, desc, in_charge, status, actual_iter, updated_iter, update_details, srs_ref, sds_ref, iter_note = item
            img_file, route_str, crud_rows, mongo_query, field_rows = UC_ENRICHMENT[uc_id]
            img_full_path = os.path.join(REAL_DIR, img_file)

            base_doc.add_heading(f"{sds_ref} {screen_func} ({uc_id})", level=3)
            align_mod.add_para(base_doc, f"Route: {route_str}  |  Actors: {actor}  |  Related Use Case: {uc_id} ({screen_func}). {desc}")

            align_mod.add_para(base_doc, "UI Design", bold=True, size=11)
            if os.path.exists(img_full_path):
                p_img = base_doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.add_run().add_picture(img_full_path, width=Inches(5.85))
                align_mod.add_para(base_doc, f"Figure III.{sds_ref}: Live UI Screen for {screen_func} ({route_str})", italic=True, size=9.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)

            make_table(base_doc, ["Field Name", "Field Type", "Description"], [list(r) for r in field_rows], col_widths=[1.8, 1.4, 3.3])
            align_mod.add_para(base_doc, "Database Access", bold=True, size=11)
            make_table(base_doc, ["Table / Collection", "CRUD", "Description"], [list(r) for r in crud_rows], col_widths=[1.8, 0.9, 3.8])
            align_mod.add_para(base_doc, "Mongoose / Database Queries:", bold=True, size=10.5)
            align_mod.add_para(base_doc, mongo_query, size=9.5, space_after=8)

    # Re-attach Section IV. Appendix elements at the end
    base_doc.add_page_break()
    for el in sec4_elements:
        body.append(el)
    if sectPr is not None and sectPr not in body:
        body.append(sectPr)

    base_doc.save(RDS_PATH)
    print(f"Successfully rebuilt full 50-UC Section II & Section III in {RDS_PATH}")


def rebuild_full_27section_final_release_doc():
    doc = docx.Document()
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.95)
        section.right_margin = Inches(0.85)

    if os.path.exists(logo_temp_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.add_run().add_picture(logo_temp_path, width=Inches(2.3))

    align_mod.add_para(doc, "TRƯỜNG ĐẠI HỌC FPT", bold=True, size=14, color=(243, 112, 33), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=16)
    align_mod.add_para(doc, "MOTORENT - MOTORBIKE RENTAL CHAIN MANAGEMENT SYSTEM", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)
    align_mod.add_para(doc, "Final Release Document", bold=True, size=24, color=(31, 78, 120), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=14)
    align_mod.add_para(doc, "– Danang, November 2026 –", bold=True, italic=True, size=12, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24)
    doc.add_page_break()

    doc.add_heading("Table of Contents", level=1)
    toc_lines = [
        "I. Deliverable Package",
        "II. Installation Guides",
        "III. User Manual",
        "   1. Overview",
        "   2. User Manual Guide for Guest",
        "      2.1. Search & Filter Motorbike Fleet (UC-02)",
        "      2.2. View Branch Locations on Interactive GPS Map (UC-01, UC-13)",
        "      2.3. View Motorbike Details, Specs & Rental Policy (UC-03, UC-04)",
        "      2.4. Register New Account & Verify Email OTP (UC-05)",
        "   3. User Manual Guide for User (Common Account & Security)",
        "      3.1. Login by Email/Password & Login by Google OAuth 2.0 (UC-06, UC-08)",
        "      3.2. Forgot Password & Password Recovery Link/OTP (UC-07)",
        "      3.3. Change Account Password (UC-11)",
        "      3.4. View & Edit Personal Profile & Avatar (UC-09)",
        "      3.5. Submit eKYC Identity Verification — CCCD & Driving License (UC-10)",
        "   4. User Manual Guide for Customer (Booking, VNPay, Trip Management & Loyalty)",
        "      4.1. Bookmark Favorite Vehicles in Wishlist (UC-12)",
        "      4.2. Single Motorbike Booking Wizard (UC-14)",
        "      4.3. Multi-Vehicle Cart & Pay 30% Deposit via VNPay Sandbox (UC-14, UC-15)",
        "      4.4. Manage My Bookings, Extend Trip, Cancel Order & Download PDF (UC-16, UC-17, UC-18, UC-19)",
        "      4.5. Submit & Track Service Complaints (UC-21)",
        "      4.6. View Loyalty Points, Referral Code & Redeem Vouchers (UC-24, UC-25)",
        "   5. User Manual Guide for Staff (Counter Desk Operations)",
        "      5.1. Manage Branch Queue, 5-Point Check-in Handover & Cross-Branch Check-out (UC-26, UC-27, UC-28, UC-29)",
        "      5.2. Receive & Respond to Customer Complaints (UC-31, UC-32)",
        "   6. User Manual Guide for Branch Manager & System Admin",
        "      6.1. Monitor Branch Operations & Fleet KPI Dashboard (UC-36, UC-37)",
        "      6.2. Manage Branch Vehicles & Rental Pricing (UC-33, UC-34, UC-35)",
        "      6.3. Schedule ODO Maintenance & Inter-Branch Vehicle Transfers (UC-30, UC-38, UC-39)",
        "      6.4. Analyze Branch Financial Reports & Export Excel / PDF (UC-42)",
        "      6.5. System Admin — Manage Branches & Global System Configuration (UC-43, UC-44, UC-48, UC-50)",
        "      6.6. System Admin — Manage Users, Roles & Ban/Unban Accounts (UC-45)",
        "      6.7. System Admin — Manage Vehicle Categories & Homepage CMS Banners (UC-47, UC-49)",
        "      6.8. System Admin — Inspect Security Audit Logs & 4-Role RBAC Matrix (UC-45, UC-46)",
    ]
    for line in toc_lines:
        align_mod.add_para(doc, line, bold=not line.startswith(" "), size=10.5, space_after=2)
    doc.add_page_break()

    # I. Deliverable Package
    doc.add_heading("I. Deliverable Package", level=1)
    deliv_rows = [
        ["1", "Group4_MotoRent_DB_final (server/src/seeders/seed.ts)", "Database, including 18-collection Mongoose schema structures and seed data"],
        ["2", "Group4_MotoRent_RDS_final.docx (MOTORENT_RDS_Final.docx)", "Final RDS (Requirement & Design) Document covering all 50 UCs, 50 UI Screens, and MSG01–MSG26"],
        ["3", "Group4_MotoRent_SDS_final.docx (MOTORENT_SDS_Final.docx)", "Final SDS (Software Design Specification) Document with Package, ER, Class & 50 Sequence Diagrams"],
        ["4", "Group4_MotoRent_Project_Tracking.xlsx (MOTORENT_Project_Tracking.xlsx)",
         "Final status for all 50 application functions across Project, Iter1, Iter2, Iter3, Iter4 & Effort Distribution"],
        ["5", "Group4_MotoRent_Issues Report.xlsx (MOTORENT_Issues_Report.xlsx)", "Final GitHub issues tracking list of the whole project (160 live GitHub Issues #6–#165 across iter1–iter4)"],
    ]
    make_table(doc, ["No.", "File", "Notes"], deliv_rows, col_widths=[0.5, 2.6, 3.4])
    align_mod.add_para(doc, "Other related deliverables:", bold=True, size=11)
    align_mod.add_para(doc, "• Tagged source codes & GitHub Issues: https://github.com/Hoang-124/Motorent")

    # II. Installation Guides
    doc.add_heading("II. Installation Guides", level=1)
    align_mod.add_para(doc, "Set up Visual Studio Code, Git, Node.js (>= 20 LTS), and MongoDB Community Server >= 7.0:")
    align_mod.add_para(doc, "1. Clone repository from GitHub: git clone https://github.com/Hoang-124/Motorent.git")
    align_mod.add_para(doc, "2. Install backend & frontend dependencies: cd server && npm install && cd ../client && npm install")
    align_mod.add_para(doc, "3. Configure server/.env (MONGODB_URI, JWT_SECRET, VNP_TMNCODE, VNP_HASHSECRET, GOOGLE_CLIENT_ID) and client/.env (VITE_API_URL, VITE_GOOGLE_CLIENT_ID).")
    align_mod.add_para(doc, "4. Seed sample database: npm run seed")
    align_mod.add_para(doc, "5. Start backend & frontend servers: npm run dev (Backend on http://localhost:5000, Frontend on http://localhost:5173).")

    # III. User Manual (ALL 27 SUBSECTIONS POPULATED WITH REAL SCREENSHOTS)
    doc.add_heading("III. User Manual", level=1)
    doc.add_heading("1. Overview", level=2)
    align_mod.add_para(doc, "The MOTORENT platform digitizes motorbike rental chain operations across Da Nang City (Da Nang International Airport and My Khe Beach). It connects Guests, Customers, Counter Staff, Branch Managers, and System Administrators with online 30% VNPay deposits, multi-vehicle cart reservations, eKYC verification without holding original IDs, 5-point counter check-in, free cross-branch returns, and automated 3,000 km ODO maintenance alerts.")

    manual_sections = [
        ("2. User Manual Guide for Guest", [
            ("2.1. Search & Filter Motorbike Fleet (UC-02)", "s02_fleet_catalog.png", [
                "Step 1: Open http://localhost:5173/bikes ('Đội xe & Bảng giá') and use the top filter panel to filter by Keyword ('Tìm theo mẫu xe hoặc biển số'), Brand ('Hãng xe'), Daily Price range ('Giá ngày từ / Đến'), Vehicle Category ('Tất cả xe', 'Xe tay ga', 'Xe máy điện', 'Xe số', 'Xe 50cc', 'Xe côn tay'), or Pickup Station ('Tất cả trạm Đà Nẵng', 'Chi nhánh Sân Bay Quốc Tế Đà Nẵng', 'Chi nhánh Bãi Biển Mỹ Khê').",
                "Step 2: Inspect the matching motorbike cards showing availability badge ('Sẵn sàng tại trạm'), license plate, 3-angle photo switcher ('Góc ngang', 'Góc trước', 'Góc sau'), and click any motorbike card to view details.",
            ]),
            ("2.2. View Branch Locations on Interactive GPS Map (UC-01, UC-13)", "s01_branches_map.png", [
                "Step 1: Click [Chi nhánh] on the top navigation bar to open http://localhost:5173/branches.",
                "Step 2a: Toggle between [Danh sách trạm] and [Bản đồ tương tác GPS] to view station pins on the interactive map.",
                "Step 2b: Click [Tìm trạm gần tôi nhất] to sort stations by real-time Haversine GPS distance from your location.",
                "Step 3: Review station details, operating hours, hotline numbers, and live available motorbike counts for Trạm 01 CN-DAD (Sân Bay Quốc Tế Đà Nẵng) and Trạm 02 CN-MK (Bãi Biển Mỹ Khê).",
            ]),
            ("2.3. View Motorbike Details, Specs & Rental Policy (UC-03, UC-04)", "s03_vehicle_detail.png", [
                "Step 1: On the Vehicle Detail screen ('/bikes/:vehicleId'), switch between the 4-angle inspection photos and review verified customer ratings.",
                "Step 2: Inspect the daily rate ('Thuê theo ngày'), hourly rate ('Thuê theo giờ'), station address, ODO reading, fuel type, and transmission type.",
                "Step 3: Click [Chọn thời gian và đặt xe] to proceed to the Booking Wizard, or click [+ Thêm vào giỏ xe] to add the motorbike to the Multi-Vehicle Cart.",
            ]),
            ("2.4. Register New Account & Verify Email OTP (UC-05)", "s05_register.png", [
                "Step 1: Open http://localhost:5173/register and fill in Username ('Tên đăng nhập *'), Email ('Email *'), Last & Middle Name ('Họ và tên đệm'), First Name ('Tên'), Mobile Phone ('Số điện thoại di động'), Password ('Mật khẩu *'), and Confirm Password ('Xác nhận mật khẩu *').",
                "Step 2: Click [Đăng ký tài khoản] to receive a 6-digit OTP via email and activate your account.",
            ]),
        ]),
        ("3. User Manual Guide for User (Common Account & Security)", [
            ("3.1. Login by Email/Password & Login by Google OAuth 2.0 (UC-06, UC-08)", "s07_login.png", [
                "Step 1a: Open http://localhost:5173/login and enter your Username or Email ('Tên đăng nhập hoặc Email') and Password ('Mật khẩu').",
                "Step 1b: Click [Đăng nhập hệ thống] to sign in.",
                "Step 2: Alternatively, click [Đăng nhập bằng Google] for 1-click Google OAuth 2.0 authentication. To log out at any time, click your account badge in the top-right header and choose [Đăng xuất].",
            ]),
            ("3.2. Forgot Password & Password Recovery Link/OTP (UC-07)", "s08_forgot_password.png", [
                "Step 1: On the Login screen, click [Quên mật khẩu?] to open http://localhost:5173/forgot-password, enter your registered email address in 'Địa chỉ Email tài khoản', and click [Gửi liên kết khôi phục] to reset your password.",
            ]),
            ("3.3. Change Account Password (UC-11)", "s11_change_password.png", [
                "Step 1: Open http://localhost:5173/profile and click tab [06 Đổi mật khẩu].",
                "Step 2: In the 'Đổi mật khẩu bảo mật' form, enter your Current Password ('Mật khẩu hiện tại *'), New Password ('Mật khẩu mới *', minimum 8 characters), and Confirm New Password ('Xác nhận mật khẩu mới *'), then click [Cập nhật mật khẩu].",
            ]),
            ("3.4. View & Edit Personal Profile & Avatar (UC-09)", "s09_profile_info.png", [
                "Step 1: Open http://localhost:5173/profile and select tab [03 Thông tin cá nhân].",
                "Step 2: Update your Last Name ('Họ và tên đệm *'), First Name ('Tên *'), Contact Phone ('Số điện thoại liên hệ *'), CCCD/Passport ('Số CCCD (12 số) / Hộ chiếu'), Gender ('Giới tính'), or Date of Birth ('Ngày sinh'), and click [Lưu thông tin hồ sơ].",
            ]),
            ("3.5. Submit eKYC Identity Verification — CCCD & Driving License (UC-10)", "s10_profile_ekyc.png", [
                "Step 1: Open http://localhost:5173/profile and select tab [04 Định danh eKYC].",
                "Step 2: Upload the 4 required identity verification photos encrypted with AES-256-GCM: (1) '1. Mặt trước CCCD *', (2) '2. Mặt sau CCCD *', (3) '3. Giấy phép lái xe (A1/A2)', and (4) '4. Ảnh chân dung đối chiếu *', check the consent box, and submit for verification without surrendering your original physical ID card at the counter.",
            ]),
        ]),
        ("4. User Manual Guide for Customer (Booking, VNPay, Trip Management & Loyalty)", [
            ("4.1. Bookmark Favorite Vehicles in Wishlist (UC-12)", "s12_wishlist.png", [
                "Step 1: Click the heart icon on any motorbike card to save it, then click the Heart icon in the top navigation bar to open http://localhost:5173/wishlist ('Xe yêu thích của bạn').",
                "Step 2: Compare saved motorbikes, check their live status ('Sẵn sàng thuê') and daily rate ('80.000đ /ngày'), and click [Đặt xe] to book immediately or click the trash icon to remove an item.",
            ]),
            ("4.2. Single Motorbike Booking Wizard (UC-14)", "s14_booking_wizard.png", [
                "Step 1: Follow the 5-step Booking Wizard header on '/booking/:vehicleId' (01 Lịch trình -> 02 Khách hàng -> 03 Gói dịch vụ -> 04 Thanh toán QR -> 05 Biên lai & Mã xe).",
                "Step 2: Select Pickup Branch ('Chi nhánh nhận xe'), Return Branch ('Chi nhánh trả xe' — supports free 0 VND cross-branch return), Pickup Date/Time, and Return Date/Time.",
                "Step 3: Review the locked license plate badge, 3-angle vehicle preview, and itemized rental cost breakdown ('Bảng kê chi phí hợp đồng') on the right panel.",
            ]),
            ("4.3. Multi-Vehicle Cart & Pay 30% Deposit via VNPay Sandbox (UC-14, UC-15)", "s13_cart.png", [
                "Step 1: Click the Shopping Cart icon in the top navigation bar to open '/cart' ('Giỏ xe của bạn') when booking multiple motorbikes for a group.",
                "Step 2: Choose the shared Pickup/Return schedule and Return Station for the group, review the total rental fee ('Tổng tiền thuê') and 30% deposit required ('Tổng cọc 30% cần thanh toán'), and click [Tiếp tục: Thông tin & eKYC] to pay the 30% deposit via VNPay Sandbox using the test card below:",
            ]),
            ("4.4. Manage My Bookings, Extend Trip, Cancel Order & Download PDF (UC-16, UC-17, UC-18, UC-19)", "s15_my_bookings.png", [
                "Step 1: Open '/profile' and select tab [01 Chuyến xe của tôi] (or click [Chuyến của tôi] in the top bar).",
                "Step 2: Filter contracts by status ([Tất cả đơn], [Đang giữ xe / Đang thuê], [Đã hoàn thành], [Đã hủy]) or search by contract code ('Tìm mã hợp đồng...').",
                "Step 3: View the contract card (e.g., 'MV-638774'), inspect the 4 pre-rental handover photos ('4 góc xe trước khi bàn giao (Check-in)'), or execute trip actions: extend rental period, cancel order under BR-06 refund tiers, or download the PDF invoice.",
            ]),
            ("4.5. Submit & Track Service Complaints (UC-21)", "s17_complaints_customer.png", [
                "Step 1: Open http://localhost:5173/complaints ('Theo dõi khiếu nại & Hỗ trợ kỹ thuật') and click [+ Gửi khiếu nại mới] to report a vehicle, service, or payment issue linked to your booking.",
                "Step 2: Select any complaint in the left list (e.g., 'CMP-20261109-IFLH') to track the 4-stage resolution timeline (01 Tiếp nhận -> 02 Đang xử lý -> 03 Đã giải quyết -> 04 Đã đóng) and view branch feedback.",
            ]),
            ("4.6. View Loyalty Points, Referral Code & Redeem Vouchers (UC-24, UC-25)", "s16_loyalty_vouchers.png", [
                "Step 1: Open '/profile' and select tab [02 Ưu đãi & Điểm thưởng].",
                "Step 2: Check your accumulated Member Points ('Điểm thành viên' — 1 point per 10,000 VND completed rental), exchange points for discount vouchers in 'Đổi điểm thành Voucher', or copy your personal referral code ('Mã giới thiệu') in 'Mời bạn bè'.",
            ]),
        ]),
        ("5. User Manual Guide for Staff (Counter Desk Operations)", [
            ("5.1. Manage Branch Queue, 5-Point Check-in Handover & Cross-Branch Check-out (UC-26, UC-27, UC-28, UC-29)", "s18_staff_counter.png", [
                "Step 1: Log in as Counter Staff ('staff_dad') at http://localhost:5173/counter ('Bàn giao nhận xe tại quầy'). Use the left panel ('Hàng đợi chi nhánh') to search by booking code/phone/plate or filter by status ([Tất cả], [Chờ nhận], [Đang thuê], [Đã trả], [Đã hủy]).",
                "Step 2: Select a booking to open the right workspace ('Chi tiết hồ sơ giao nhận'). Click [Thu tiền tại quầy] to collect the remaining 70% balance, use tab [1. Check-in Bàn giao xe (Ongoing)] to verify eKYC and upload 4 pre-rental photos, or use tab [2. Check-out Thu hồi xe & Tất toán] to record return ODO, fuel level (100%/75%/50%/25%), 4 return photos, and late/damage fees.",
            ]),
            ("5.2. Receive & Respond to Customer Complaints (UC-31, UC-32)", "s19_staff_complaints.png", [
                "Step 1: Open http://localhost:5173/staff/complaints, select an open complaint from the queue, click [Tiếp nhận xử lý (InProgress)], enter the official response in 'Nhập nội dung phản hồi chính thức cho khách hàng', and click [Gửi phản hồi]. Staff can also click [Chat Trạm] in the top header to reply to customer live chat messages.",
            ]),
        ]),
        ("6. User Manual Guide for Branch Manager & System Admin", [
            ("6.1. Monitor Branch Operations & Fleet KPI Dashboard (UC-36, UC-37)", "s20_manager_dashboard.png", [
                "Step 1: Log in as Branch Manager ('manager_dad') and open [Tổng quan trạm] ('/manager/dashboard' — 'Nhịp vận hành đội xe').",
                "Step 2: Monitor real-time station KPIs ('Tổng số xe', 'Sẵn có, không cảnh báo', 'Tỷ lệ đang thuê', 'Xe đến hạn bảo trì'), fleet status distribution ('Phân bổ trạng thái'), and maintenance progress ('Tiến độ bảo trì').",
            ]),
            ("6.2. Manage Branch Vehicles & Rental Pricing (UC-33, UC-34, UC-35)", "s21_manager_vehicles.png", [
                "Step 1: Open [Quản lý xe & giá] at http://localhost:5173/manager/vehicles ('Quản Lý Xe & Biểu Giá Thuê'); click [Điều chuyển & Bảo dưỡng] in the top-right to jump to fleet maintenance/transfers.",
                "Step 2: Use the left form ('Thêm phương tiện mới') to register a motorbike with Brand, Model, License Plate, Category, Daily Price ('Giá thuê ngày'), and Hourly Price ('Giá thuê giờ').",
                "Step 3: Use the right fleet catalog ('Danh sách đội xe') to search, filter, edit specifications, or schedule maintenance.",
            ]),
            ("6.3. Schedule ODO Maintenance & Inter-Branch Vehicle Transfers (UC-30, UC-38, UC-39)", "s22_manager_fleet_ops.png", [
                "Step 1: Open http://localhost:5173/manager/fleet-operations ('Điều phối đội xe') to review summary cards ('Xe cần bảo trì', 'Phiếu bảo trì chưa hoàn tất', 'Lệnh & Nhật ký điều chuyển').",
                "Step 2: Inspect motorbikes flagged under 'Cảnh báo ODO' (e.g., '43-B1 100.11 — 12.000 km'), create or complete maintenance tickets in tab [01. Phiếu & Nhật ký bảo trì], or coordinate inter-branch vehicle transfers in tab [02. Điều chuyển & Nhật ký điều chuyển].",
            ]),
            ("6.4. Analyze Branch Financial Reports & Export Excel / PDF (UC-42)", "s23_manager_reports.png", [
                "Step 1: Open [Báo cáo] at http://localhost:5173/reports ('Báo Cáo Hoạt Động & Hiệu Suất Hệ Thống') and select a report tab ([Doanh thu ngày], [Doanh thu tháng], [Hiệu suất đội xe], [KPI Executive Dashboard], or [Dự báo nhu cầu xe]).",
                "Step 2: Click [Xuất Excel] or [Xuất PDF] in the top-right corner to download formatted financial reports.",
                "Step 3: Review net cashflow ('Dòng tiền thuần'), total inflow ('Tổng tiền vào'), refunds ('Tiền hoàn ra'), total orders ('Đơn phát sinh'), average order value ('Giá trị đơn TB'), and the daily revenue bar chart.",
            ]),
            ("6.5. System Admin — Manage Branches & Global System Configuration (UC-43, UC-44, UC-48, UC-50)", "s24_admin_center.png", [
                "Step 1: Log in as System Admin ('admin') at http://localhost:5173/admin ('Trung Tâm Điều Hành Motorent') and click [+ Thêm Chi Nhánh Mới] to create a new station.",
                "Step 2: Use the administrative tab bar to switch between [Chi nhánh], [Người dùng], [Khuyến mãi], [Chính sách & Cấu hình], [Đối soát & Thuế], [Báo cáo & Phân tích], [Đa ngôn ngữ], and [Bản đồ GPS].",
                "Step 3: Monitor chain-wide KPIs ('Tổng số chi nhánh', 'Trạm đang hoạt động', 'Quy mô đội xe tại trạm', 'Xe sẵn sàng cho thuê') and edit active branches.",
            ]),
            ("6.6. System Admin — Manage Users, Roles & Ban/Unban Accounts (UC-45)", "s25_admin_users.png", [
                "Step 1: In '/admin', click tab [Người dùng] to open the user management console.",
                "Step 2: Review user counters ('Tổng người dùng', 'Quản lý chi nhánh', 'Nhân viên trực quầy', 'Khách hàng', 'Tài khoản bị khóa'), filter by role/status/branch, click [+ Tạo Quản Lý / Nhân Sự] to provision staff/manager accounts, or click [Khóa tài khoản] to lock/unlock access.",
            ]),
            ("6.7. System Admin — Manage Vehicle Categories & Homepage CMS Banners (UC-47, UC-49)", "s26_admin_categories.png", [
                "Step 1: Open [Danh mục xe] ('/admin/categories') to add, edit, or delete the 5 standard motorbike categories ('Xe 50cc', 'Xe côn tay', 'Xe máy điện', 'Xe số', 'Xe tay ga'), and use '/admin/banners' & '/admin/pages' to manage homepage promotional banners and static CMS pages.",
            ]),
            ("6.8. System Admin — Inspect Security Audit Logs & 4-Role RBAC Matrix (UC-45, UC-46)", "s28_admin_audit_log.png", [
                "Step 1: Open [Nhật ký Audit] ('/audit' — 'Nhật ký Truy vết Hệ thống') to filter immutable CRUD & security logs by Actor, Entity, Action, Status, or Date and click [Chi tiết Changes] to inspect redacted JSON payloads; open [Ma trận quyền] ('/rbac') to review the 4-role authorization matrix.",
            ]),
        ]),
    ]

    fig_counter = 1
    for group_title, sub_items in manual_sections:
        doc.add_heading(group_title, level=2)
        for sub_title, img_name, steps in sub_items:
            doc.add_heading(sub_title, level=3)
            for st in steps:
                align_mod.add_para(doc, st)
            if "4.3." in sub_title:
                vnp_tbl = [
                    ["Ngân hàng", "NCB"],
                    ["Số thẻ Sandbox", "9704198526191432198"],
                    ["Tên chủ thẻ", "NGUYEN VAN A"],
                    ["Ngày phát hành", "07/15"],
                    ["Mật khẩu OTP", "123456"],
                ]
                make_table(doc, ["Trường thông tin VNPay Sandbox", "Giá trị Test chuẩn"], vnp_tbl, col_widths=[2.5, 4.0])
                align_mod.add_para(doc, "", space_after=4)
            img_p = os.path.join(REAL_DIR, img_name)
            align_mod.add_img_with_caption(doc, img_p, f"Figure 3.{fig_counter}: Live Project Screen — {sub_title}")
            fig_counter += 1

    doc.save(FINAL_REL_PATH)
    print(f"Successfully rebuilt full 27-subsection Final Release Document in {FINAL_REL_PATH}")


if __name__ == "__main__":
    rebuild_full_50uc_rds()
    rebuild_full_27section_final_release_doc()
    # Clean any temporary manual_steps folder if created
    ms_dir = r"d:\Motorent\docs\manual_steps"
    if os.path.exists(ms_dir):
        import shutil
        shutil.rmtree(ms_dir, ignore_errors=True)

