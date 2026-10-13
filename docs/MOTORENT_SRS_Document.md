# Requirement & Design Specification
## MOTORENT - Motorbike Rental Chain Management System
### Version: 1.0

---

**Da Nang, September 2025**

---

## Record of Changes

| Version | Date | A* | In charge | Change Description |
|:---:|:---:|:---:|:---|:---|
| V1.0 | 25/9 | A | HoangBH | Initial document creation |
| | | | | |

*A - Added, M - Modified, D - Deleted

---

## Contents

- I. Overview
  - 1. User Requirements (Actors, Use Cases)
  - 2. Overall Functionalities (Screens Flow, Screen Descriptions, Screen Authorization, Non-UI Functions)
  - 3. System High Level Design (Database Design, Code Packages)
- II. Requirement Specifications
  - 1. Authentication Feature (Login, Register, Forgot Password)
  - 2. Customer Feature (Book a Rental, Cancel Order, Write Review)
  - 3. Staff Feature (Confirm Handover, Confirm Return)
  - 4. Branch Manager Feature (Add Vehicle, Approve Order, Assign Shifts)
  - 5. System Admin Feature (Add Branch, Manage Discounts, Manage Banners)
- III. Design Specifications
  - 1. System Access (Login, Register)
  - 2. Booking Management (Create Booking, Order Details)
  - 3. Counter Desk (Check-in, Check-out)
  - 4. Admin Dashboard
- IV. Appendix

---

# I. Overview

## 1. User Requirements

### 1.1 Actors

| # | Actor | Description |
|:---:|:---|:---|
| 1 | **Guest** | An unauthenticated visitor who can browse the system's public pages: view branch information, browse the motorbike fleet with filters and sorting, read rental policies, and register/login to gain access to booking features. |
| 2 | **Customer** | A registered and authenticated user who can book motorbikes, manage personal profiles (including eKYC identity verification), track order status, make payments (VNPay deposit 30% / counter payment 70%), write reviews, submit complaints, and participate in the loyalty program. Inherits all Guest capabilities. |
| 3 | **Staff** | A branch employee responsible for on-site counter operations: performing vehicle Check-in (verifying customer ID/license, photographing vehicle condition, recording odometer) and Check-out (comparing vehicle condition, calculating late/damage fees), updating vehicle status, creating maintenance tickets, and responding to customer chat. Inherits all Guest capabilities. |
| 4 | **Branch Manager** | A branch-level administrator who manages the vehicle fleet (add/edit/remove vehicles, set pricing), approves/rejects rental orders and refund requests, oversees vehicle transfers between branches, manages staff accounts and work shift schedules, handles complaint escalation, and generates branch-level revenue and utilization reports. Inherits all Staff capabilities. |
| 5 | ** Admin** | The top-level administrator who manages the entire chain: creates/edits branches, manages Branch Manager accounts, configures RBAC permissions, manages vehicle categories and system-wide discount codes, administers CMS content (banners, static pages), views audit logs, generates chain-wide KPI dashboards and financial reports, and configures system policies (cancellation, deposit, loyalty). Inherits all Branch Manager capabilities. |

### 1.2 Use Cases

#### a. Diagram(s)

The Use Case diagrams are organized across 2 pages:
- **Page 1**: Detailed diagrams per actor with include/extend relationships
- **Page 2**: System-wide overview showing all actor generalizations

Actor GeneralizatiSystemon hierarchy:
```
Guest <-- Customer
Guest <-- Staff <-- Branch Manager <-- System Admin
```

*(Refer to the Use Case diagram file: docs/motorent_usecase_diagram.json for the full draw.io source)*

#### b. Descriptions

**Feature 1: Browse & Search (Guest)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-01 | Browse Branches | View branch list | Guest views the list of all active branches with address, phone, operating hours, and available vehicle count |
| UC-02 | Browse Branches | View branches on map | Guest views branch locations displayed on an interactive map with GPS markers |
| UC-03 | Browse Fleet | View motorbike list | Guest views the full fleet catalog with photos, pricing, and availability indicators |
| UC-04 | Browse Fleet | Filter by branch | Guest filters the vehicle list to show only vehicles belonging to a specific branch |
| UC-05 | Browse Fleet | Filter by vehicle type | Guest filters vehicles by category (Scooter, Manual, Semi-Auto, Electric) |
| UC-06 | Browse Fleet | Filter by price range | Guest filters vehicles within a specified daily price range (VND) |
| UC-07 | Browse Fleet | Filter by availability | Guest filters to show only vehicles currently available for rental |
| UC-08 | Browse Fleet | Filter by manufacturer | Guest filters vehicles by brand (Honda, Yamaha, VinFast, etc.) |
| UC-09 | Browse Fleet | Sort by price | Guest sorts the vehicle list by daily rental price (ascending/descending) |
| UC-10 | Browse Fleet | Sort by rating | Guest sorts the vehicle list by average customer rating |
| UC-11 | Browse Fleet | Search by keyword | Guest searches vehicles using keywords matching model name, brand, or license plate |
| UC-12 | Browse Fleet | View vehicle details | Guest views detailed information of a specific vehicle including specifications, images, and pricing |
| UC-13 | Browse Fleet | View reviews & comments | Guest reads customer reviews and ratings for a specific vehicle |
| UC-14 | Rental Policy | View rental policy | Guest views the rental terms, cancellation policy, deposit rules, and insurance information |

**Feature 2: Authentication (Guest)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-15 | Authentication | Register account | Guest creates a new account with username, email, and password. System sends verification email. <<include>> Verify email on registration |
| UC-16 | Authentication | Login with email/password | Guest authenticates using registered email and password credentials |
| UC-17 | Authentication | Login with Google | Guest authenticates using Google OAuth2.0. If no account exists, system auto-creates one. <<extend>> Register account |
| UC-18 | Authentication | Forgot password | Guest requests a password reset link sent to registered email address |

**Feature 3: Customer Profile & Account (Customer)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-19 | Profile Management | View personal information | Customer views their profile details, identity verification status, and loyalty points balance |
| UC-20 | Profile Management | Update personal information | Customer updates first name, last name, phone number, gender, and date of birth |
| UC-21 | Profile Management | Upload profile photo | Customer uploads or changes their avatar image |
| UC-22 | Profile Management | Upload ID/license for verification (eKYC) | Customer uploads photos of CCCD/CMND and driving license for identity verification |
| UC-23 | Profile Management | Change password | Customer changes their current password by providing old password and new password |
| UC-24 | Authentication | Logout | Customer logs out of the system and is redirected to the home page |

**Feature 4: Booking & Payment (Customer)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-25 | Wishlist | Add vehicle to wishlist | Customer saves a vehicle to their favorites list for quick access later |
| UC-26 | Wishlist | Remove vehicle from wishlist | Customer removes a vehicle from their favorites list |
| UC-27 | Search | Search vehicles by GPS location | Customer finds available vehicles at branches nearest to their current GPS location |
| UC-28 | Booking | Book a rental | Customer creates a rental order by selecting vehicle, pickup/return branches, dates, and payment method. <<include>> View estimated total cost, <<include>> Sign e-contract. <<extend>> Select one-way rental, <<extend>> Apply discount code |
| UC-29 | Payment | Pay deposit online | Customer pays 30% deposit via VNPay/banking to confirm the booking |
| UC-30 | Payment | Pay full amount online | Customer pays the full rental amount online before pickup |
| UC-31 | Payment | Pay at counter | Customer pays the remaining 70% in cash or banking at the branch counter during vehicle pickup |
| UC-32 | Order Management | Cancel rental order | Customer cancels a pending/approved booking with a cancellation reason |
| UC-33 | Order Management | Request refund | Customer requests a refund for a cancelled booking that has been paid |
| UC-34 | Order Management | Extend rental period | Customer requests to extend the return date/time for an ongoing rental |
| UC-35 | Order Management | View rental history | Customer views a list of all their past and current rental orders |
| UC-36 | Order Management | View order details | Customer views detailed information of a specific booking including pricing breakdown, status timeline, and vehicle info |
| UC-37 | Order Management | Track order status real-time | Customer monitors the current status of their active booking in real-time via Socket.IO updates |
| UC-38 | Invoice | Download invoice PDF | Customer downloads a PDF invoice/receipt for a completed booking |

**Feature 5: Review, Complaint & Communication (Customer)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-39 | Reviews | Write review with photos | Customer writes a review with 1-5 star rating, text comment, and optional photo attachments for a completed booking |
| UC-40 | Reviews | Edit review | Customer modifies their previously submitted review content or rating |
| UC-41 | Reviews | Delete review | Customer removes their previously submitted review |
| UC-42 | Complaints | Submit complaint/report issue | Customer files a complaint about a booking or branch experience with subject, description, and priority |
| UC-43 | Complaints | Track complaint status | Customer monitors the resolution progress of their submitted complaint |
| UC-44 | Communication | Live chat with staff | Customer initiates a real-time chat conversation with branch staff via Socket.IO |

**Feature 6: Notifications & Loyalty (Customer)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-45 | Notifications | Receive push notifications | Customer receives in-app notifications for booking status changes, promotions, and reminders |
| UC-46 | Notifications | Receive email notifications | Customer receives email notifications for booking confirmations, reminders, and system updates |
| UC-47 | Notifications | Receive SMS notifications | Customer receives SMS reminders before pickup and return dates |
| UC-48 | Loyalty Program | Earn loyalty points | Customer automatically earns loyalty points upon completing a rental (1 point per 10,000 VND) |
| UC-49 | Loyalty Program | Redeem points for voucher | Customer exchanges accumulated loyalty points for discount vouchers |
| UC-50 | Referral | Refer friends for rewards | Customer shares their unique referral code; both referrer and referee earn bonus points |
| UC-51 | Marketing | Subscribe to promotions | Customer opts in to receive promotional emails and special offers |

**Feature 7: Counter Desk Operations (Staff)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-52 | Authentication | Login to system | Staff logs into the system with assigned credentials to access the Counter Desk |
| UC-53 | Authentication | Logout | Staff logs out from the Counter Desk workstation |
| UC-54 | Order Management | View branch order list | Staff views all booking orders assigned to their branch, filtered by status |
| UC-55 | Order Management | View order details | Staff views detailed booking information including customer profile, vehicle, and payment status |
| UC-56 | Check-in | Confirm vehicle handover | Staff performs vehicle handover process. <<include>> Verify customer ID/license, <<include>> Photo vehicle before handover |
| UC-57 | Check-out | Confirm vehicle return | Staff processes vehicle return. <<include>> Photo vehicle on return, <<include>> Compare vehicle condition |
| UC-58 | Incident | Record damage/incident | Staff documents any vehicle damage discovered during return inspection with photos and description |
| UC-59 | Penalty | Calculate penalty fee | Staff calculates late return fee (30,000 VND/hour) and/or damage compensation fee |
| UC-60 | Penalty | Collect penalty at counter | Staff collects penalty payment from customer at the branch counter |
| UC-61 | Vehicle Status | Update vehicle to rented | Staff changes vehicle status to "Rented" upon successful handover |
| UC-62 | Vehicle Status | Update vehicle to available | Staff changes vehicle status back to "Available" after successful return and inspection |
| UC-63 | Vehicle Status | Update vehicle to maintenance | Staff flags a vehicle for maintenance, changing its status to "Maintenance" |
| UC-64 | Maintenance | Create maintenance ticket | Staff creates a new maintenance log entry with type (Scheduled/Repair/Inspection), description, and ODO reading |
| UC-65 | Complaints | Handle branch complaint | Staff reviews and responds to complaints assigned to their branch |
| UC-66 | Communication | Reply to support chat | Staff responds to customer live chat messages via the staff chat interface |

**Feature 8: Fleet & Staff Management (Branch Manager)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-67 | Fleet Management | Add new vehicle to branch | Branch Manager registers a new motorbike to their branch fleet with all specifications and photos |
| UC-68 | Fleet Management | Edit vehicle information | Branch Manager updates vehicle details (model, pricing, images, specifications) |
| UC-69 | Fleet Management | Remove vehicle from branch | Branch Manager soft-deletes a vehicle from the active fleet (marks isDeleted=true) |
| UC-70 | Pricing | Set daily rental price | Branch Manager sets or updates the daily rental rate for a specific vehicle |
| UC-71 | Pricing | Set hourly rental price | Branch Manager sets or updates the hourly rental rate for a specific vehicle |
| UC-72 | Pricing | Set dynamic seasonal pricing | Branch Manager configures special pricing rules for peak seasons or holidays |
| UC-73 | Order Approval | Approve rental order | Branch Manager reviews and approves a pending booking request |
| UC-74 | Order Approval | Reject order with reason | Branch Manager rejects a booking request with a documented reason |
| UC-75 | Refund Management | Approve refund request | Branch Manager approves a customer's refund request and initiates the refund process |
| UC-76 | Refund Management | Reject refund with reason | Branch Manager denies a refund request with a documented reason |
| UC-77 | Maintenance | Schedule periodic maintenance | Branch Manager creates scheduled maintenance entries for vehicles based on ODO thresholds |
| UC-78 | Maintenance | View maintenance history | Branch Manager reviews the complete maintenance log for any vehicle in their branch |
| UC-79 | Vehicle Transfer | Request vehicle transfer in | Branch Manager requests to receive a vehicle from another branch |
| UC-80 | Vehicle Transfer | Approve vehicle transfer out | Branch Manager approves a request to transfer a vehicle from their branch to another |
| UC-81 | Staff Management | Add staff account | Branch Manager creates a new Staff user account assigned to their branch |
| UC-82 | Staff Management | Edit staff information | Branch Manager updates staff account details |
| UC-83 | Staff Management | Delete staff account | Branch Manager deactivates or removes a staff account |
| UC-84 | Staff Management | Assign work shifts | Branch Manager creates shift schedule entries for staff members |
| UC-85 | Complaints | Handle/resolve complaints | Branch Manager escalates or resolves customer complaints with resolution notes |
| UC-86 | Reports | Daily revenue report | Branch Manager generates a daily revenue summary for their branch |
| UC-87 | Reports | Monthly revenue report | Branch Manager generates monthly revenue reports with trend analysis |
| UC-88 | Reports | Quarterly/yearly revenue report | Branch Manager generates quarterly and annual revenue reports |
| UC-89 | Reports | Export report to Excel/PDF | Branch Manager exports report data to Excel spreadsheet or PDF document |
| UC-90 | Reports | Vehicle breakdown frequency report | Branch Manager views statistics on vehicle maintenance and repair frequency |
| UC-91 | Reports | Vehicle utilization rate report | Branch Manager views fleet utilization metrics (rented days vs. available days) |
| UC-92 | Reports | Average rating statistics | Branch Manager views average customer ratings per vehicle and per branch |

**Feature 9: System Administration (System Admin)**

| ID | Feature | Use Case | Use Case Description |
|:---:|:---|:---|:---|
| UC-93 | Branch Management | Add new branch | System Admin creates a new branch with name, code, address, GPS coordinates, operating hours, and assigns a manager |
| UC-94 | Branch Management | Edit branch information | System Admin updates branch details including address, hours, and manager assignment |
| UC-95 | Branch Management | Disable/remove branch | System Admin deactivates a branch (sets isActive=false), preventing new bookings |
| UC-96 | Account Management | Add Branch Manager account | System Admin creates a new BranchManager user account |
| UC-97 | Account Management | Edit Branch Manager account | System Admin updates Branch Manager account details and branch assignment |
| UC-98 | Account Management | Delete Branch Manager account | System Admin deactivates or removes a Branch Manager account |
| UC-99 | Access Control | Configure RBAC permissions | System Admin manages role-based access control rules for the 4 system roles |
| UC-100 | Access Control | Lock violating account | System Admin suspends a user account that has accumulated too many violations (strikes) |
| UC-101 | Access Control | Unlock account | System Admin reactivates a previously suspended user account |
| UC-102 | Audit | View audit log | System Admin reviews the system audit trail showing all sensitive create/update/delete actions |
| UC-103 | Chain Reports | Chain-wide revenue report | System Admin generates consolidated revenue reports across all branches |
| UC-104 | Chain Reports | Compare branch performance | System Admin views comparative metrics between branches (revenue, utilization, ratings) |
| UC-105 | Chain Reports | View KPI dashboard | System Admin views the executive KPI dashboard with key performance indicators |
| UC-106 | Forecasting | Forecast seasonal rental demand | System Admin views demand forecasting analytics based on historical booking data |
| UC-107 | Category Management | Add new vehicle type | System Admin creates a new vehicle category (e.g., Electric Scooter) |
| UC-108 | Category Management | Edit vehicle type | System Admin updates vehicle category name, slug, or description |
| UC-109 | Category Management | Delete vehicle type | System Admin removes an unused vehicle category |
| UC-110 | Promotion Management | Create system-wide discount code | System Admin creates a new discount voucher with type (Percentage/FixedAmount), value, validity period, and usage limit |
| UC-111 | Promotion Management | Edit discount code | System Admin updates discount voucher details |
| UC-112 | Promotion Management | Disable discount code | System Admin deactivates an active discount code |
| UC-113 | System Configuration | Configure cancellation/refund policy | System Admin sets the cancellation window, refund percentage rules, and late fee rates |
| UC-114 | System Configuration | Configure default deposit amount | System Admin sets the default deposit percentage (currently 30%) |
| UC-115 | System Configuration | Configure loyalty program | System Admin configures point earning rates, redemption thresholds, and voucher values |
| UC-116 | CMS | Add promotional banner | System Admin creates a new homepage banner with title, image, link URL, and display order |
| UC-117 | CMS | Edit promotional banner | System Admin updates banner content or display settings |
| UC-118 | CMS | Delete promotional banner | System Admin removes a banner from the homepage rotation |
| UC-119 | CMS | Manage static pages (FAQ, terms) | System Admin creates or edits static content pages (About, Terms of Service, FAQ, Privacy Policy) |
| UC-120 | Finance | Reconcile payment transactions | System Admin reviews and reconciles VNPay payment records against booking records |
| UC-121 | Finance | Export tax/financial report | System Admin exports financial statements and tax reports for accounting purposes |
| UC-122 | Localization | Manage multi-language support | System Admin configures language settings and translations for the system interface |

---

## 2. Overall Functionalities

### 2.1 Screens Flow

```
=====================================================================
                    PUBLIC SCREENS (Guest)
=====================================================================

  [Home Page] ---- [Fleet Page] ---- [Vehicle Detail]
       |                |                    |
       |                |              [Reviews List]
       |                |
       |---- [Branches Page] ---- [Branch Map View]
       |
       |---- [Rental Policy Page]
       |
       |---- (Login Modal) ---- (Forgot Password Modal)
       |
       +---- (Register Modal) ---- (Email Verification)

=====================================================================
                 CUSTOMER SCREENS (Authenticated)
=====================================================================

  [My Profile] ---- (Edit Profile Modal)
       |
       |---- [eKYC Upload Page]
       |
       |---- [My Bookings] ---- [Booking Detail] ---- [Track Status]
       |                              |
       |                        (Cancel Modal)
       |                        (Extend Modal)
       |                        (Invoice PDF)
       |
       |---- [My Wishlist]
       |
       |---- [My Reviews] ---- (Write Review Modal)
       |
       |---- [My Complaints] ---- (New Complaint Modal)
       |
       |---- [Notifications]
       |
       |---- [Loyalty Dashboard] ---- (Redeem Points Modal)
       |
       +---- [Live Chat Window]

  (Booking Modal) ---- (Payment Gateway - VNPay)
       |
       +---- (E-Contract Signing Modal)

=====================================================================
                  STAFF SCREENS (Counter Desk)
=====================================================================

  [Counter Desk] ---- [Order Queue]
       |                    |
       |              [Order Detail Panel]
       |                    |
       |              (Check-in Form) -- Vehicle Photo Upload
       |                    |             ID Verification
       |                    |             ODO Recording
       |                    |
       |              (Check-out Form) -- Condition Compare
       |                    |              Damage Report
       |                    |              Penalty Calculator
       |
       |---- [Maintenance Tickets]
       |
       +---- [Staff Chat Console]

=====================================================================
                   BRANCH MANAGER SCREENS
=====================================================================

  [Manager Dashboard] ---- [Fleet Management] -- (Add Vehicle Form)
       |                         |                (Edit Vehicle)
       |                         |
       |---- [Order Approvals] -- (Approve/Reject Modal)
       |
       |---- [Refund Requests] -- (Approve/Reject Refund Modal)
       |
       |---- [Vehicle Transfers] -- (Request Transfer Modal)
       |
       |---- [Staff Management] -- (Add Staff Modal)
       |          |
       |          +-- [Shift Schedule Calendar]
       |
       |---- [Maintenance Log]
       |
       |---- [Complaint Handling]
       |
       +---- [Reports Dashboard]
                   |-- Daily/Monthly/Quarterly Revenue
                   |-- Vehicle Utilization Rate
                   |-- Breakdown Frequency
                   +-- (Export Excel/PDF)

=====================================================================
                    SYSTEM ADMIN SCREENS
=====================================================================

  [Admin Dashboard / KPI] ---- [Branch Management]
       |                             |-- (Add Branch Form)
       |                             +-- (Edit Branch Form)
       |
       |---- [Account Management] -- (Add Manager Modal)
       |          |
       |          +-- [RBAC Configuration]
       |
       |---- [Category Management] -- (Add/Edit Category Modal)
       |
       |---- [Discount Management] -- (Add/Edit Discount Modal)
       |
       |---- [CMS Manager]
       |          |-- [Banner Management]
       |          +-- [Static Pages Editor]
       |
       |---- [Audit Log Viewer]
       |
       |---- [System Configuration]
       |          |-- Cancellation/Refund Policy
       |          |-- Deposit Settings
       |          +-- Loyalty Program Settings
       |
       |---- [Chain-wide Reports]
       |          |-- Revenue Comparison
       |          |-- Branch Performance
       |          +-- Demand Forecasting
       |
       +---- [Finance & Tax Reports]
```

### 2.2 Screen Descriptions

| # | Feature | Screen | Description |
|:---:|:---|:---|:---|
| 1 | Browse | Home Page | Landing page with hero banner slider, booking widget, featured vehicles, and branch highlights |
| 2 | Browse | Fleet Page | Full vehicle catalog with multi-dimensional filters (branch, type, price, availability, brand) and sorting options |
| 3 | Browse | Vehicle Detail | Detailed vehicle page showing photos gallery, specs, pricing, availability calendar, and customer reviews |
| 4 | Browse | Branches Page | List of all active branches with address, phone, hours, vehicle count, and map view toggle |
| 5 | Browse | Rental Policy Page | Static page displaying rental terms, cancellation rules, deposit policy, and insurance information |
| 6 | Auth | Login Modal | Pop-up modal for email/password login with Google OAuth option, forgot password link, and register link |
| 7 | Auth | Register Modal | Pop-up modal for new account creation with username, email, password, and terms acceptance |
| 8 | Auth | Forgot Password Modal | Pop-up modal for requesting password reset email |
| 9 | Customer | My Profile | User profile page with personal info display, avatar, eKYC status badge, and loyalty points balance |
| 10 | Customer | eKYC Upload Page | Form for uploading CCCD/CMND front/back and driving license photos for identity verification |
| 11 | Customer | My Bookings | List of customer's booking orders with status tabs (All/Pending/Active/Completed/Cancelled) |
| 12 | Customer | Booking Detail | Detailed view of a specific booking with status timeline, pricing breakdown, vehicle info, and action buttons |
| 13 | Customer | Booking Modal | Pop-up workflow for creating a new rental order: select dates, branch, vehicle, payment method, and sign e-contract |
| 14 | Customer | Live Chat Window | Real-time chat interface for communicating with branch staff via Socket.IO |
| 15 | Customer | My Wishlist | Grid view of customer's saved/favorited vehicles |
| 16 | Customer | My Reviews | List of reviews written by the customer with edit/delete actions |
| 17 | Customer | My Complaints | List of submitted complaints with status tracking |
| 18 | Customer | Loyalty Dashboard | Loyalty points balance, earning history, and voucher redemption interface |
| 19 | Customer | Notifications | Chronological list of in-app notifications with read/unread status |
| 20 | Staff | Counter Desk | Primary staff workspace showing today's orders queue with Check-in and Check-out action panels |
| 21 | Staff | Check-in Form | Multi-step form: verify customer ID, photograph vehicle (4 angles), record ODO, confirm handover |
| 22 | Staff | Check-out Form | Multi-step form: photograph return vehicle, compare before/after condition, record damage, calculate penalties |
| 23 | Staff | Maintenance Tickets | List and creation form for vehicle maintenance log entries |
| 24 | Staff | Staff Chat Console | Staff-side chat interface for responding to customer messages |
| 25 | Manager | Manager Dashboard | Branch overview with today's bookings count, revenue, fleet status, and pending approvals |
| 26 | Manager | Fleet Management | Vehicle CRUD list with add/edit/remove actions and pricing management |
| 27 | Manager | Order Approvals | Queue of pending booking orders with approve/reject actions and customer details |
| 28 | Manager | Refund Requests | Queue of refund requests with approve/reject actions |
| 29 | Manager | Vehicle Transfers | List of transfer requests (incoming/outgoing) with approval workflow |
| 30 | Manager | Staff Management | Staff account CRUD list with branch assignment |
| 31 | Manager | Shift Schedule Calendar | Calendar view for assigning and viewing staff work shifts |
| 32 | Manager | Reports Dashboard | Branch-level analytics with revenue charts, utilization metrics, and export options |
| 33 | Admin | Admin KPI Dashboard | Chain-wide executive dashboard with revenue trends, branch comparison, and demand forecasting |
| 34 | Admin | Branch Management | Branch CRUD list with manager assignment and activation toggle |
| 35 | Admin | Account Management | Manager account CRUD list with RBAC configuration |
| 36 | Admin | Category Management | Vehicle type CRUD list (Scooter, Manual, Semi-Auto, Electric) |
| 37 | Admin | Discount Management | Discount code CRUD list with voucher configuration |
| 38 | Admin | CMS Manager - Banners | Banner CRUD list with image upload, ordering, and activation toggle |
| 39 | Admin | CMS Manager - Static Pages | Rich text editor for FAQ, Terms of Service, Privacy Policy pages |
| 40 | Admin | Audit Log Viewer | Searchable, filterable audit trail of all system actions |
| 41 | Admin | System Configuration | Settings panels for cancellation policy, deposit %, and loyalty program rules |
| 42 | Admin | Finance Reports | Financial reports with VNPay reconciliation and tax export |

### 2.3 Screen Authorization

| Screen | Guest | Customer | Staff | Branch Manager | System Admin |
|:---|:---:|:---:|:---:|:---:|:---:|
| Home Page | X | X | X | X | X |
| Fleet Page | X | X | X | X | X |
| Vehicle Detail | X | X | X | X | X |
| Branches Page | X | X | X | X | X |
| Rental Policy Page | X | X | X | X | X |
| Login/Register Modal | X | | | | |
| My Profile | | X | X | X | X |
|   - View Own Data | | X | X | X | X |
|   - Update Own Data | | X | X | X | X |
| eKYC Upload | | X | | | |
| Booking Modal | | X | | | |
| My Bookings | | X | | | |
|   - View Own Orders | | X | | | |
|   - Cancel Own Order | | X | | | |
|   - Request Refund | | X | | | |
| Booking Detail | | X | X | X | X |
| Live Chat | | X | | | |
| My Wishlist | | X | | | |
| My Reviews | | X | | | |
|   - Write Review | | X | | | |
|   - Edit Own Review | | X | | | |
|   - Delete Own Review | | X | | | |
| My Complaints | | X | | | |
| Loyalty Dashboard | | X | | | |
| Notifications | | X | X | X | X |
| Counter Desk | | | X | X | X |
|   - Check-in | | | X | X | X |
|   - Check-out | | | X | X | X |
|   - Record Damage | | | X | X | X |
| Maintenance Tickets | | | X | X | X |
| Staff Chat Console | | | X | X | X |
| Manager Dashboard | | | | X | X |
| Fleet Management | | | | X | X |
|   - Add Vehicle | | | | X | X |
|   - Edit Vehicle | | | | X | X |
|   - Remove Vehicle | | | | X | X |
|   - Set Pricing | | | | X | X |
| Order Approvals | | | | X | X |
| Refund Requests | | | | X | X |
| Vehicle Transfers | | | | X | X |
| Staff Management | | | | X | X |
| Shift Schedule | | | | X | X |
| Complaint Handling | | | | X | X |
| Reports Dashboard | | | | X | X |
|   - Export Reports | | | | X | X |
| Admin KPI Dashboard | | | | | X |
| Branch Management | | | | | X |
| Account Management | | | | | X |
| RBAC Configuration | | | | | X |
| Category Management | | | | | X |
| Discount Management | | | | | X |
| CMS Manager | | | | | X |
| Audit Log Viewer | | | | | X |
| System Configuration | | | | | X |
| Finance Reports | | | | | X |

### 2.4 Non-UI Functions

| # | Feature | System Function | Description |
|:---:|:---|:---|:---|
| 1 | Authentication | JWT Token Management | Issues access tokens (24h expiry), validates tokens on every authenticated API request via authMiddleware |
| 2 | Authentication | Email Verification Service | Sends verification email with unique token link upon user registration using Nodemailer |
| 3 | Authentication | Password Reset Service | Generates time-limited reset token and sends password reset email |
| 4 | Payment | VNPay IPN Handler | Receives Instant Payment Notification callbacks from VNPay gateway to confirm deposit payments |
| 5 | Booking | Availability Checker | Validates vehicle availability by checking for overlapping bookings before order creation |
| 6 | Booking | Booking Code Generator | Generates unique booking codes in format MV-XXXXXX upon order creation |
| 7 | Booking | Late Fee Calculator | Calculates late return fee at 30,000 VND/hour based on (actualReturnDateTime - returnDateTime) |
| 8 | Booking | Loyalty Points Calculator | Awards loyalty points upon booking completion at rate of 1 point per 10,000 VND spent |
| 9 | Notification | Booking Reminder Scheduler | Cron job that sends SMS/Email reminders 24h before pickup and 2h before return |
| 10 | Notification | Real-time Status Push | Socket.IO event emitter that broadcasts booking status changes to connected customers |
| 11 | Fleet | ODO Maintenance Alert | Checks vehicle odometer readings and flags requiresMaintenance when exceeding service intervals |
| 12 | Audit | Audit Logger Middleware | Automatically logs all sensitive create/update/delete operations to AuditLog collection |
| 13 | Chat | Socket.IO Chat Server | WebSocket server handling real-time message delivery between customers and staff |
| 14 | Data | Database Seeder | Automated script that generates test data (branches, vehicles, users, bookings) for development |

---

## 3. System High Level Design

### 3.1 Database Design

#### a. Database Schema

The system uses **MongoDB** with **Mongoose ODM**, consisting of **18 collections** organized in 4 groups:

**Total: 18 Tables, 33 Foreign Key Relationships (31 Many-to-One + 2 One-to-One)**

*(Refer to docs/dbml/ for detailed DBML files per module)*

**Group 1 - CORE (Blue):** Branch, User, Category, Vehicle, Booking
**Group 2 - OPERATIONS (Amber):** VehicleTransfer, MaintenanceLog, Complaint, AuditLog, StaffSchedule
**Group 3 - SUPPORT (Green):** Discount, Feedback, Notification, BookingReminder
**Group 4 - CMS & CHAT (Purple):** Banner, StaticPage, Conversation, Message

#### b. Table Descriptions

| No | Table | Description |
|:---:|:---|:---|
| 01 | **Branch** | Stores branch office information for the motorbike rental chain in Da Nang. PK: `_id`. FK: `managerId` -> User (1:1). |
| 02 | **User** | System users across 4 RBAC roles (SystemAdmin, BranchManager, Staff, Customer). PK: `_id`. FK: `branchId` -> Branch. |
| 03 | **Category** | Vehicle type classifications (Scooter, Manual, Semi-Auto, Electric). PK: `_id`. |
| 04 | **Vehicle** | Individual motorbikes in the fleet with specs, pricing, and status. PK: `_id`. FK: `branchId` -> Branch, `category` -> Category. |
| 05 | **Booking** | Rental orders with full lifecycle (Pending->Approved->Confirmed->Ongoing->Completed). PK: `_id`. FK: `userId` -> User, `vehicleId` -> Vehicle, `pickupBranchId` -> Branch, `returnBranchId` -> Branch, `discountId` -> Discount, `approvedBy` -> User. |
| 06 | **VehicleTransfer** | Inter-branch vehicle transfer requests and approvals. PK: `_id`. FK: `vehicleId` -> Vehicle, `fromBranchId` -> Branch, `toBranchId` -> Branch, `requestedBy` -> User, `approvedBy` -> User. |
| 07 | **MaintenanceLog** | Vehicle maintenance and repair history records. PK: `_id`. FK: `vehicleId` -> Vehicle, `branchId` -> Branch, `performedBy` -> User. |
| 08 | **Complaint** | Customer complaints and issue reports. PK: `_id`. FK: `customerId` -> User, `bookingId` -> Booking, `branchId` -> Branch, `resolvedBy` -> User. |
| 09 | **AuditLog** | System audit trail for sensitive operations. PK: `_id`. FK: `userId` -> User. |
| 10 | **StaffSchedule** | Staff work shift assignments and attendance tracking. PK: `_id`. FK: `staffId` -> User, `branchId` -> Branch, `assignedBy` -> User. |
| 11 | **Discount** | Promotional discount codes and vouchers. PK: `_id`. |
| 12 | **Feedback** | Customer reviews and ratings (1 per booking, 1:1). PK: `_id`. FK: `userId` -> User, `vehicleId` -> Vehicle, `bookingId` -> Booking (unique 1:1), `respondedBy` -> User. |
| 13 | **Notification** | In-app push notifications. PK: `_id`. FK: `userId` -> User. |
| 14 | **BookingReminder** | Scheduled SMS/Email reminders for bookings. PK: `_id`. FK: `bookingId` -> Booking. |
| 15 | **Banner** | Homepage promotional banners for CMS. PK: `_id`. |
| 16 | **StaticPage** | Content-managed static pages (FAQ, Terms, Policy). PK: `_id`. FK: `updatedBy` -> User. |
| 17 | **Conversation** | Live chat conversation sessions. PK: `_id`. |
| 18 | **Message** | Individual chat messages within conversations. PK: `_id`. FK: `conversationId` -> Conversation, `senderId` -> User. |

### 3.2 Code Packages

| No | Package | Description |
|:---:|:---|:---|
| 01 | `client/pages/` | React page components mapped to routes via React Router v6 |
| 02 | `client/components/` | Reusable UI components (Navbar, Footer, Cards, Modals, Counter Desk panels) |
| 03 | `client/services/` | Axios HTTP client wrappers for backend API communication |
| 04 | `client/types/` | TypeScript interfaces matching backend Mongoose models |
| 05 | `client/context/` | React Context providers for authentication state and Socket.IO connection |
| 06 | `server/config/` | Environment variables, MongoDB connection, VNPay configuration, Nodemailer setup |
| 07 | `server/core/` | Express middleware layer: JWT authentication, RBAC authorization, audit logging, file upload (Multer), error handling |
| 08 | `server/models/` | 18 Mongoose schema definitions with TypeScript interfaces and indexes |
| 09 | `server/modules/auth/` | Authentication module: registration, login (email + Google OAuth), email verification, password reset |
| 10 | `server/modules/branch/` | Branch management module: CRUD operations, nearest branch GPS search |
| 11 | `server/modules/vehicle/` | Vehicle management module: fleet CRUD, pricing, ODO maintenance alerts |
| 12 | `server/modules/booking/` | Booking module: order creation, availability check, VNPay deposit, check-in/check-out workflow |
| 13 | `server/modules/fleet/` | Fleet operations module: vehicle transfers, maintenance log management |
| 14 | `server/modules/hr/` | HR module: staff schedule management, shift attendance tracking |
| 15 | `server/modules/support/` | Support module: feedback/reviews, complaints, booking reminders |
| 16 | `server/modules/cms/` | CMS module: banner management, static page editor, Socket.IO chat |
| 17 | `server/routes/` | Central route aggregator mounting all module routes under /api prefix |
| 18 | `server/seeders/` | Test data generator for development and demo purposes |

---

# II. Requirement Specifications

## 1. Authentication Feature

### 1.1 UC-16_Login System

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-16 Login with email/password |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Guest |
| **Secondary Actors** | None |
| **Trigger** | User clicks Login button from the Navbar, or User accesses an authenticated feature (booking, profile, etc.) |
| **Description** | As a guest, I want to log into the system with my email and password so that I can access authenticated features such as booking motorbikes and managing my profile. |
| **Preconditions** | PRE-1: User account has been registered. PRE-2: User's email has been verified (isEmailVerified = true). |
| **Postconditions** | POST-1: User is authenticated and receives a JWT access token. POST-2: System tracked successful login into the AuditLog. POST-3: User is redirected to the Home Page or the previously requested page. |

**Normal Flow: 16.0 Login with Email/Password**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Guest | Clicks "Login" button on the Navbar |
| 2 | System | Displays the Login Modal with email field, password field, Login button, Google Login option, Forgot Password link, and Register link |
| 3 | Guest | Enters email address and password |
| 4 | Guest | Clicks "Login" button |
| 5 | System | Validates email format and password is not empty (see 16.0.E1) |
| 6 | System | Queries User table to verify email and password hash using bcrypt comparison (see 16.0.E2) |
| 7 | System | Checks user account status (see 16.0.E3, 16.0.E4) |
| 8 | System | Generates JWT access token with user ID, roles, and branchId |
| 9 | System | Stores token in localStorage and sets Authorization header for subsequent API requests |
| 10 | System | Logs successful login to AuditLog with action "USER_LOGIN", IP address, and timestamp |
| 11 | System | Closes Login Modal and redirects to Home Page (or previous calling page if any) |

**Alternative Flows:**

**16.1 Login with Google**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Guest | Clicks "Login with Google" button |
| 2 | System | Redirects to Google OAuth2.0 consent screen |
| 3 | Guest | Selects Google account and grants permissions |
| 4 | Google | Validates user credentials and redirects back to system with authorization code |
| 5 | System | Exchanges code for Google profile (email, name, googleId, avatar) |
| 6 | System | Checks if user with this googleId exists. If not, auto-creates a new User account with role "Customer" and status "Active" |
| 7 | | Return to step 8 of normal flow |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 16.0.E1 | Invalid input format (empty email or password) | System shows field-level validation errors. User corrects input. |
| 16.0.E2 | Incorrect email or password | System displays "Email or password is incorrect" error message. User retries or clicks "Forgot Password?" to go to UC-18. |
| 16.0.E3 | Account not verified (isEmailVerified = false) | System displays "Please verify your email before logging in" with a "Resend Verification" button. |
| 16.0.E4 | Account suspended (status = "Suspended") | System displays "Your account has been suspended. Please contact support." Login denied. |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~500 times/day (peak during morning 7-9 AM and evening 5-7 PM) |
| **Business Rules** | FR1, FR2, FR3 |
| **Assumptions** | AS-1: User has a stable internet connection. AS-2: Google OAuth service is available. |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| FR1 | Password Encoding | User's password must be encoded with bcrypt hashing (salt rounds = 10) before storage |
| FR2 | Invalid Login | User cannot be authenticated if: (a) email/password combination is incorrect, (b) account email is not verified, (c) account status is "Suspended" |
| FR3 | Account Locking | If a user inputs wrong login credentials 6 times continuously, their account is automatically suspended for 30 minutes |

---

### 1.2 UC-15_Register Account

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-15 Register account |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Guest |
| **Secondary Actors** | Email Service (Nodemailer) |
| **Trigger** | User clicks "Register" link from the Login Modal or Navbar |
| **Description** | As a guest, I want to register a new account so that I can book motorbikes and access personalized features. |
| **Preconditions** | PRE-1: User does not already have an account with the same email or username. |
| **Postconditions** | POST-1: New User record is created with status "Active" and isEmailVerified = false. POST-2: Verification email is sent to the registered email address. POST-3: Unique referral code is generated for the user. |

**Normal Flow: 15.0 Register Account**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Guest | Clicks "Register" link |
| 2 | System | Displays the Register Modal with username, email, password, confirm password fields, terms checkbox, and Register button |
| 3 | Guest | Fills in username, email, password, confirms password, and accepts terms |
| 4 | Guest | Clicks "Register" button |
| 5 | System | Validates all fields (see 15.0.E1, 15.0.E2, 15.0.E3) |
| 6 | System | Hashes password with bcrypt (salt=10), generates emailVerificationToken and referralCode |
| 7 | System | Creates new User record in database |
| 8 | System | Sends verification email with unique token link to the provided email address <<include>> Verify email on registration |
| 9 | System | Displays success message: "Registration successful! Please check your email to verify your account." |
| 10 | System | Closes Register Modal |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 15.0.E1 | Username or email already exists | System displays "Username/Email is already taken" error |
| 15.0.E2 | Password too weak (< 6 characters) | System displays password strength requirements |
| 15.0.E3 | Passwords don't match | System displays "Passwords do not match" error |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~50 new registrations/day |
| **Business Rules** | FR1, FR4 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| FR4 | Email Verification | Users must verify their email within 24 hours, otherwise the verification token expires and they must request a new one |

---

## 2. Customer Feature

### 2.1 UC-28_Book a Rental

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-28 Book a rental |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Customer |
| **Secondary Actors** | VNPay Payment Gateway |
| **Trigger** | Customer clicks "Book Now" on a vehicle card or from the Vehicle Detail page |
| **Description** | As a customer, I want to book a motorbike rental by selecting pickup/return branches, dates, and payment method so that I can reserve a specific vehicle for my trip. |
| **Preconditions** | PRE-1: Customer is logged in. PRE-2: Customer's identity is verified (identityStatus = "Verified"). PRE-3: Selected vehicle status is "Available". |
| **Postconditions** | POST-1: New Booking record created with status "Pending" and unique bookingCode. POST-2: Vehicle availability is temporarily held. POST-3: If online payment selected, deposit of 30% is collected via VNPay. POST-4: Confirmation email sent to customer. |

**Normal Flow: 28.0 Book a Single Vehicle**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Customer | Clicks "Book Now" on a vehicle |
| 2 | System | Opens the Booking Modal showing vehicle details and booking form |
| 3 | Customer | Selects pickup branch (default: vehicle's current branch) |
| 4 | Customer | Selects return branch (default: same as pickup) (see 28.1) |
| 5 | Customer | Selects pickup date/time and return date/time |
| 6 | System | Validates date range (minimum 1 day, pickup must be in future) (see 28.0.E1) |
| 7 | System | Checks vehicle availability for selected date range (see 28.0.E2) |
| 8 | System | Calculates and displays estimated total cost <<include>> View estimated total cost: (dailyPrice x days) - discount + applicable fees |
| 9 | Customer | Optionally enters a discount code (see 28.2) |
| 10 | Customer | Selects payment method: "Banking" (VNPay) or "Cash" (pay at counter) |
| 11 | Customer | Reviews booking summary and clicks "Confirm Booking" |
| 12 | System | Displays e-contract with rental terms <<include>> Sign e-contract |
| 13 | Customer | Signs the e-contract digitally |
| 14 | System | Creates Booking record with status "Pending", generates bookingCode (MV-XXXXXX) |
| 15 | System | If payment method is "Banking": redirects to VNPay payment page for 30% deposit |
| 16 | VNPay | Processes payment and sends IPN callback to system |
| 17 | System | Updates depositAmount, sets status to "Confirmed" if payment successful (see 28.0.E3) |
| 18 | System | Sends booking confirmation email to customer with bookingCode and details |
| 19 | System | Creates BookingReminder entries for pickup (24h before) and return (2h before) |

**Alternative Flows:**

**28.1 Select One-way Rental**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Customer | Selects a different branch for return than pickup (e.g., pickup at Airport, return at My Khe Beach) |
| 2 | System | Marks booking as one-way rental (pickupBranchId != returnBranchId) |
| 3 | | Return to step 5 of normal flow |

**28.2 Apply Discount Code**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Customer | Enters a voucher code in the discount field |
| 2 | System | Validates voucher code: checks existence, active status, date validity, and usage limit (see 28.2.E1) |
| 3 | System | Applies discount (Percentage or FixedAmount) and recalculates total |
| 4 | | Return to step 10 of normal flow |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 28.0.E1 | Invalid date range (past date, return before pickup, or < 1 day) | System highlights invalid fields with error message |
| 28.0.E2 | Vehicle not available for selected dates (overlapping booking exists) | System displays "This vehicle is not available for the selected dates" and suggests alternative dates or vehicles |
| 28.0.E3 | Payment failed or cancelled at VNPay | Booking status remains "Pending". System notifies customer to retry payment within 30 minutes or booking will be auto-cancelled |
| 28.2.E1 | Invalid or expired discount code | System displays "Discount code is invalid or expired" error |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~100 bookings/day, peak between 8-10 AM |
| **Business Rules** | BR-01, BR-02, BR-03, BR-04, BR-05 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| BR-01 | Deposit Amount | Default deposit is 30% of totalAmount, paid online via VNPay. Remaining 70% is paid at counter during pickup |
| BR-02 | Booking Overlap Prevention | A vehicle cannot be booked by multiple customers for overlapping date ranges. System must check: NOT (newPickup < existingReturn AND newReturn > existingPickup) |
| BR-03 | Minimum Rental Period | Minimum rental period is 1 day (24 hours) |
| BR-04 | Booking Code Format | Booking codes follow format MV-XXXXXX where X is alphanumeric uppercase |
| BR-05 | eKYC Required | Customer must have identityStatus = "Verified" before creating a booking. Unverified customers are prompted to upload documents first |

---

### 2.2 UC-32_Cancel Rental Order

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-32 Cancel rental order |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Customer |
| **Secondary Actors** | None |
| **Trigger** | Customer clicks "Cancel Order" button from Booking Detail page |
| **Description** | As a customer, I want to cancel a pending or approved booking so that I can change my travel plans. |
| **Preconditions** | PRE-1: Customer is logged in. PRE-2: Booking status is "Pending" or "Approved" (not yet checked-in). |
| **Postconditions** | POST-1: Booking status is updated to "Cancelled". POST-2: Vehicle becomes available again. POST-3: If deposit was paid, a refund request is automatically created. |

**Normal Flow: 32.0 Cancel Rental Order**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Customer | Opens Booking Detail page and clicks "Cancel Order" |
| 2 | System | Displays cancellation confirmation dialog with reason text field |
| 3 | Customer | Enters cancellation reason and confirms |
| 4 | System | Validates booking status allows cancellation (see 32.0.E1) |
| 5 | System | Updates booking status to "Cancelled", stores cancelReason |
| 6 | System | Changes vehicle status back to "Available" |
| 7 | System | If isPaid = true: automatically initiates refund request (<<extend>> Request refund) |
| 8 | System | Sends cancellation confirmation email to customer |
| 9 | System | Logs action to AuditLog |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 32.0.E1 | Booking is already "Ongoing", "Completed", or "Cancelled" | System displays "This booking cannot be cancelled in its current status" |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~10-15 cancellations/day |
| **Business Rules** | BR-06 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| BR-06 | Cancellation Policy | Free cancellation if > 24 hours before pickup time. 50% deposit forfeited if cancelled within 24 hours of pickup. No cancellation allowed after vehicle handover (status = "Ongoing") |

---

## 3. Staff Feature

### 3.1 UC-56_Confirm Vehicle Handover (Check-in)

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-56 Confirm vehicle handover |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Staff |
| **Secondary Actors** | Customer (present at counter) |
| **Trigger** | Customer arrives at branch for scheduled pickup. Staff selects the booking from the Counter Desk order queue. |
| **Description** | As a staff member, I want to process the vehicle handover by verifying customer identity, photographing the vehicle condition, and recording the odometer so that the rental can officially begin. |
| **Preconditions** | PRE-1: Staff is logged in and assigned to the branch. PRE-2: Booking status is "Approved" or "Confirmed". PRE-3: Customer is physically present at the branch counter. |
| **Postconditions** | POST-1: Booking status updated to "Ongoing". POST-2: Vehicle status updated to "Rented". POST-3: startOdometer, startFuelLevel, and checkinImages are recorded. POST-4: Check-in timestamp is logged. |

**Normal Flow: 56.0 Vehicle Handover**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Staff | Selects the booking from Counter Desk queue (status "Approved"/"Confirmed") |
| 2 | System | Displays booking details with customer profile, vehicle info, and Check-in panel |
| 3 | Staff | Verifies customer's physical CCCD/CMND against uploaded eKYC photos <<include>> Verify customer ID/license |
| 4 | Staff | Confirms identity match by checking the verification checkbox |
| 5 | Staff | Collects remaining 70% payment if deposit was paid online, or full payment if paying at counter |
| 6 | Staff | Walks to the vehicle and photographs it from 4 angles (front, back, left, right) <<include>> Photo vehicle before handover |
| 7 | System | Uploads and stores photos in checkinImages array |
| 8 | Staff | Records current odometer reading in startOdometer field |
| 9 | Staff | Records current fuel level in startFuelLevel field |
| 10 | Staff | Clicks "Complete Check-in" button |
| 11 | System | Updates booking: status to "Ongoing", isPaid to true, records all check-in data |
| 12 | System | Updates vehicle: status to "Rented" |
| 13 | System | Sends real-time notification to customer via Socket.IO: "Your rental has started!" |
| 14 | System | Logs action to AuditLog: "BOOKING_CHECKIN" |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 56.0.E1 | Customer ID does not match eKYC records | Staff rejects handover. Booking remains in current status. Staff notes the discrepancy. |
| 56.0.E2 | Customer has not completed remaining payment | Staff cannot complete Check-in until payment is collected. |
| 56.0.E3 | Vehicle has mechanical issue discovered during pre-handover inspection | Staff marks vehicle as "Maintenance", cancels/reschedules booking, offers alternative vehicle. |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~80-100 handovers/day across all branches |
| **Business Rules** | BR-07, BR-08 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| BR-07 | 5-Point Safety Check | Staff must verify: (1) Customer CCCD matches eKYC, (2) Customer has valid driving license, (3) Vehicle condition is documented with photos, (4) Odometer is recorded, (5) Fuel level is recorded |
| BR-08 | Complimentary Package | Each rental includes 2 certified helmets, 2 raincoats, and 1 phone mount holder at no extra charge |

---

### 3.2 UC-57_Confirm Vehicle Return (Check-out)

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-57 Confirm vehicle return |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Staff |
| **Secondary Actors** | Customer (present at counter) |
| **Trigger** | Customer returns to branch with the rented vehicle. Staff selects the booking from Counter Desk. |
| **Description** | As a staff member, I want to process the vehicle return by photographing current condition, comparing with check-in photos, calculating any penalties, and completing the rental. |
| **Preconditions** | PRE-1: Staff is logged in. PRE-2: Booking status is "Ongoing". |
| **Postconditions** | POST-1: Booking status updated to "Completed". POST-2: Vehicle status updated to "Available". POST-3: endOdometer, endFuelLevel, and checkoutImages are recorded. POST-4: Any late fees or damage fees are calculated and recorded. POST-5: Loyalty points are awarded. |

**Normal Flow: 57.0 Vehicle Return**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Staff | Selects the active booking from Counter Desk (status "Ongoing") |
| 2 | System | Displays booking details with check-in photos, original ODO, and Check-out panel |
| 3 | Staff | Photographs the returned vehicle from 4 angles <<include>> Photo vehicle on return |
| 4 | System | Displays side-by-side comparison: check-in photos vs check-out photos <<include>> Compare vehicle condition |
| 5 | Staff | Records endOdometer and endFuelLevel |
| 6 | System | Calculates if return is late: actualReturnDateTime vs returnDateTime |
| 7 | System | If late: calculates lateFee = ceil(lateHours) x 30,000 VND |
| 8 | Staff | If damage detected: records damage details (see 57.1) |
| 9 | Staff | Clicks "Complete Check-out" button |
| 10 | System | Updates booking: status to "Completed", records actualReturnDateTime, lateFee, damageFee |
| 11 | System | Calculates and awards loyaltyPointsEarned = floor(totalAmount / 10,000) |
| 12 | System | Updates User.loyaltyPoints += loyaltyPointsEarned |
| 13 | System | Updates vehicle: status to "Available", odometer to endOdometer |
| 14 | System | Sends notification to customer: "Your rental is complete! You earned X loyalty points." |
| 15 | System | Logs action to AuditLog: "BOOKING_CHECKOUT" |

**Alternative Flows:**

**57.1 Damage Detected**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Staff | Notices damage during photo comparison, clicks "Report Damage" |
| 2 | System | Opens damage report form <<extend>> Record damage/incident |
| 3 | Staff | Describes damage, uploads close-up photos |
| 4 | System | Calculates damage fee based on damage type <<extend>> Calculate penalty fee |
| 5 | Staff | Collects damage fee from customer at counter |
| 6 | | Return to step 9 of normal flow |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~80-100 returns/day |
| **Business Rules** | BR-09, BR-10 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| BR-09 | Late Return Fee | Late fee is charged at 30,000 VND per hour (rounded up). Calculated as: ceil((actualReturn - scheduledReturn) / 1 hour) x 30,000 |
| BR-10 | Loyalty Points | Points earned = floor(totalAmount / 10,000). 1 point per 10,000 VND spent. Points are added only upon booking completion (status = "Completed"). |

---

## 4. Branch Manager Feature

### 4.1 UC-67_Add New Vehicle

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-67 Add new vehicle to branch |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Branch Manager |
| **Secondary Actors** | None |
| **Trigger** | Branch Manager clicks "Add Vehicle" from Fleet Management screen |
| **Description** | As a branch manager, I want to register a new motorbike to my branch fleet so that customers can see and book it. |
| **Preconditions** | PRE-1: Manager is logged in with BranchManager role. PRE-2: At least one Category exists in the system. |
| **Postconditions** | POST-1: New Vehicle record created with status "Available". POST-2: Vehicle is visible on the Fleet Page. POST-3: Action logged to AuditLog. |

**Normal Flow: 67.0 Add New Vehicle**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Manager | Clicks "Add Vehicle" button on Fleet Management page |
| 2 | System | Displays Add Vehicle form with fields: brand, vehicleModel, licensePlate, category, transmissionType, fuelType, yearManufactured, dailyPrice, hourlyPrice, odometer, images upload |
| 3 | Manager | Fills in all required fields and uploads vehicle photos (minimum 1, maximum 10) |
| 4 | Manager | Clicks "Save" button |
| 5 | System | Validates all required fields (see 67.0.E1, 67.0.E2) |
| 6 | System | Creates Vehicle record with branchId = manager's branch, status = "Available", isDeleted = false |
| 7 | System | Logs action to AuditLog: "CREATE_VEHICLE" |
| 8 | System | Displays success message and redirects to Fleet Management list |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 67.0.E1 | License plate already exists | System displays "This license plate is already registered in the system" |
| 67.0.E2 | Required fields missing | System highlights empty required fields with validation errors |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~5-10 new vehicles/month |
| **Business Rules** | BR-11 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| BR-11 | License Plate Uniqueness | Each vehicle must have a globally unique license plate across all branches. No two vehicles can share the same plate. |

---

### 4.2 UC-73_Approve Rental Order

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-73 Approve rental order |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | Branch Manager |
| **Secondary Actors** | None |
| **Trigger** | Manager sees pending booking in Order Approvals queue |
| **Description** | As a branch manager, I want to review and approve pending booking requests so that customers can proceed with their rental. |
| **Preconditions** | PRE-1: Manager is logged in. PRE-2: Booking status is "Pending". PRE-3: Booking is for a vehicle at manager's branch. |
| **Postconditions** | POST-1: Booking status updated to "Approved". POST-2: approvedBy field set to manager's userId. POST-3: Customer notified of approval. |

**Normal Flow: 73.0 Approve Order**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Manager | Opens Order Approvals page and selects a pending booking |
| 2 | System | Displays booking details: customer info, vehicle, dates, payment status |
| 3 | Manager | Reviews customer's eKYC verification status and booking details |
| 4 | Manager | Clicks "Approve" button |
| 5 | System | Updates booking: status to "Approved", approvedBy to manager's userId |
| 6 | System | Sends push notification and email to customer: "Your booking MV-XXXXXX has been approved!" |
| 7 | System | Logs action to AuditLog: "APPROVE_BOOKING" |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~80-100 approvals/day |
| **Business Rules** | BR-12 |

#### b. Business Rules

| ID | Business Rule | Business Rule Description |
|:---|:---|:---|
| BR-12 | Approval Scope | Branch Manager can only approve/reject bookings for vehicles belonging to their assigned branch |

---

## 5. System Admin Feature

### 5.1 UC-93_Add New Branch

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-93 Add new branch |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | System Admin |
| **Secondary Actors** | None |
| **Trigger** | Admin clicks "Add Branch" from Branch Management screen |
| **Description** | As a system administrator, I want to create a new branch location so that the rental chain can expand its service coverage. |
| **Preconditions** | PRE-1: Admin is logged in with SystemAdmin role. |
| **Postconditions** | POST-1: New Branch record created with isActive = true. POST-2: Branch appears in the public branches list. POST-3: Action logged to AuditLog. |

**Normal Flow: 93.0 Add New Branch**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Admin | Clicks "Add Branch" button |
| 2 | System | Displays Add Branch form: name, code, address, phone, email, GPS coordinates (lng/lat), hours_open, hours_close, description, managerId selection |
| 3 | Admin | Fills in branch details. Selects or creates a Branch Manager account for the branch. |
| 4 | Admin | Clicks "Save" |
| 5 | System | Validates required fields and branch code uniqueness (see 93.0.E1) |
| 6 | System | Creates Branch record with isActive = true |
| 7 | System | If manager selected: updates manager's branchId and verifies their role is "BranchManager" |
| 8 | System | Logs action to AuditLog: "CREATE_BRANCH" |
| 9 | System | Displays success message |

**Exceptions:**

| Code | Exception | Handling |
|:---|:---|:---|
| 93.0.E1 | Branch code already exists | System displays "Branch code must be unique" error |

| Field | Value |
|:---|:---|
| **Priority** | Must Have |
| **Frequency of Use** | ~1-2 new branches/year |

---

### 5.2 UC-116_Manage Promotional Banners

#### a. Functional Description

| Field | Description |
|:---|:---|
| **UC ID and Name** | UC-116 Add promotional banner |
| **Created By** | HoangBH |
| **Date Created** | 25/Sep/2025 |
| **Primary Actor** | System Admin |
| **Secondary Actors** | None |
| **Trigger** | Admin opens CMS Manager - Banners page |
| **Description** | As a system administrator, I want to manage homepage promotional banners to advertise seasonal offers and special promotions to visitors. |
| **Preconditions** | PRE-1: Admin is logged in with SystemAdmin role. |
| **Postconditions** | POST-1: Banner record created/updated. POST-2: Homepage reflects banner changes immediately. |

**Normal Flow: 116.0 Add Banner**

| Step | Actor/System | Action |
|:---:|:---:|:---|
| 1 | Admin | Opens CMS Manager - Banners page |
| 2 | System | Displays list of current banners with title, image preview, position, and active status |
| 3 | Admin | Clicks "Add New Banner" |
| 4 | System | Displays banner form: title, image upload, link URL, position (display order), isActive toggle |
| 5 | Admin | Fills in banner details and uploads image |
| 6 | Admin | Clicks "Save" |
| 7 | System | Creates Banner record |
| 8 | System | Homepage banner slider is updated |

| Field | Value |
|:---|:---|
| **Priority** | Should Have |
| **Frequency of Use** | ~2-3 banner updates/month |

---

# III. Design Specifications

## 1. System Access

### 1.1 User Login

This screen allows users to be authenticated to access system screens/functionalities.

**Related use cases:** UC-16_Login with email/password, UC-17_Login with Google

#### UI Design

| Field Name | Field Type | Description |
|:---|:---|:---|
| **Email*** | Text Box (String, 100) | User inputs valid email address for logging in. Validated for email format. |
| **Password*** | Password Box (String, 50) | User inputs password. Masked input with show/hide toggle. |
| **Login** | Button | Authenticates user with provided email and password. Disabled until both fields are filled. |
| **Login with Google** | Button | Initiates Google OAuth2.0 flow. Redirects to Google consent screen. |
| **Forgot Password?** | Hyperlink | Redirects to UC-18 Forgot Password Modal |
| **Don't have an account? Register** | Hyperlink | Opens Register Modal for UC-15 |

#### Database Access

| Table | CRUD | Description |
|:---|:---:|:---|
| User | R | Verify email and passwordHash using bcrypt.compare() |
| User | R | Retrieve user profile (roles, branchId, status, identityStatus) for JWT payload |
| AuditLog | C | Log successful login with action "USER_LOGIN", userId, ipAddress |

#### SQL Commands (Mongoose equivalent)

```javascript
// 1. Verify email and retrieve user
const user = await User.findOne({ email: loginEmail, status: { $ne: 'Suspended' } })
  .select('_id username email passwordHash roles branchId status isEmailVerified');

// 2. Compare password
const isMatch = await bcrypt.compare(inputPassword, user.passwordHash);

// 3. Log successful login
await AuditLog.create({
  userId: user._id,
  action: 'USER_LOGIN',
  entityType: 'User',
  entityId: user._id,
  ipAddress: req.ip,
});
```

---

## 2. Booking Management

### 2.1 Create Booking Modal

This modal allows customers to create a new rental booking.

**Related use cases:** UC-28_Book a rental

#### UI Design

| Field Name | Field Type | Description |
|:---|:---|:---|
| **Vehicle Info** | Display Only | Shows selected vehicle: image, model, brand, licensePlate, dailyPrice |
| **Pickup Branch*** | Combo Box (Single Choice) | Dropdown of active branches. Default: vehicle's current branch |
| **Return Branch*** | Combo Box (Single Choice) | Dropdown of active branches. Default: same as pickup. Changing this enables one-way rental |
| **Pickup Date/Time*** | DateTime Picker | Must be in the future. Default: tomorrow 08:00 |
| **Return Date/Time*** | DateTime Picker | Must be after pickup. Minimum 1 day rental |
| **Rental Duration** | Display Only (Auto) | Calculated: returnDateTime - pickupDateTime in days/hours |
| **Discount Code** | Text Box (String, 20) | Optional voucher code. "Apply" button validates and shows discount |
| **Payment Method*** | Radio Group | Options: "VNPay Banking" (default) or "Cash at Counter" |
| **Price Breakdown** | Display Only | Subtotal, discount, deposit (30%), remaining (70%), total |
| **Confirm Booking** | Button | Creates booking and proceeds to payment if Banking selected |

#### Database Access

| Table | CRUD | Description |
|:---|:---:|:---|
| Vehicle | R | Retrieve vehicle details and current branchId |
| Booking | R | Check for overlapping bookings on the same vehicleId |
| Discount | R | Validate discount code if provided |
| Booking | C | Create new booking record |
| BookingReminder | C | Create pickup and return reminder entries |
| Notification | C | Create booking confirmation notification for customer |

#### SQL Commands (Mongoose equivalent)

```javascript
// 1. Check vehicle availability (no overlapping bookings)
const conflicts = await Booking.find({
  vehicleId: selectedVehicleId,
  status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
  $nor: [
    { returnDateTime: { $lte: newPickupDateTime } },
    { pickupDateTime: { $gte: newReturnDateTime } },
  ],
});

// 2. Validate discount code
const discount = await Discount.findOne({
  voucherCode: inputCode,
  isActive: true,
  startDate: { $lte: new Date() },
  endDate: { $gte: new Date() },
  $expr: { $lt: ['$usedCount', '$usageLimit'] },
});

// 3. Create booking
const booking = await Booking.create({
  bookingCode: generateBookingCode(), // MV-XXXXXX
  userId, vehicleId, pickupBranchId, returnBranchId,
  pickupDateTime, returnDateTime,
  totalAmount, depositAmount: totalAmount * 0.3,
  remainingAmount: totalAmount * 0.7,
  discountId: discount?._id,
  discountAmount: calculatedDiscount,
  status: 'Pending',
  paymentMethod,
});
```

---

## 3. Counter Desk

### 3.1 Check-in Form

This panel is part of the Counter Desk workspace and allows staff to process vehicle handovers.

**Related use cases:** UC-56_Confirm vehicle handover

#### UI Design

| Field Name | Field Type | Description |
|:---|:---|:---|
| **Booking Info** | Display Only | bookingCode, customer name, phone, vehicle model, pickup/return dates |
| **Customer ID Match** | Checkbox | Staff confirms customer's physical CCCD matches eKYC upload |
| **License Match** | Checkbox | Staff confirms customer's physical GPLX matches upload |
| **Vehicle Photos*** | File Upload (4x) | Front, Back, Left, Right vehicle photos. Minimum 4 required |
| **Start Odometer*** | Number Input (Int) | Current vehicle ODO reading in km |
| **Start Fuel Level*** | Combo Box | Options: "100%", "75%", "50%", "25%" |
| **Complete Check-in** | Button | Finalizes handover. Disabled until all checkboxes and required fields are filled |

#### Database Access

| Table | CRUD | Description |
|:---|:---:|:---|
| Booking | RU | Read booking details, update status to "Ongoing", set checkinImages, startOdometer, startFuelLevel, isPaid |
| Vehicle | U | Update status to "Rented" |
| AuditLog | C | Log "BOOKING_CHECKIN" action |
| Notification | C | Send "Rental started" notification to customer |

### 3.2 Check-out Form

This panel allows staff to process vehicle returns.

**Related use cases:** UC-57_Confirm vehicle return

#### UI Design

| Field Name | Field Type | Description |
|:---|:---|:---|
| **Booking Info** | Display Only | bookingCode, customer name, vehicle model, scheduled return date/time |
| **Check-in Photos** | Display Only (Gallery) | Side-by-side display of 4 check-in photos for comparison |
| **Vehicle Photos*** | File Upload (4x) | Front, Back, Left, Right return condition photos |
| **End Odometer*** | Number Input (Int) | Current vehicle ODO reading in km. Must be >= startOdometer |
| **End Fuel Level*** | Combo Box | Options: "100%", "75%", "50%", "25%" |
| **Late Fee** | Display Only (Auto) | Auto-calculated if actual return > scheduled return. Shows hours late and fee amount |
| **Report Damage** | Button | Opens damage report form if damage detected |
| **Damage Fee** | Number Input (Float) | Manual input for damage compensation amount |
| **Complete Check-out** | Button | Finalizes return. Calculates total penalties and awards loyalty points |

#### Database Access

| Table | CRUD | Description |
|:---|:---:|:---|
| Booking | RU | Read booking details, update status to "Completed", set checkoutImages, endOdometer, endFuelLevel, actualReturnDateTime, lateFee, damageFee, loyaltyPointsEarned |
| Vehicle | U | Update status to "Available", update odometer |
| User | U | Add loyaltyPointsEarned to User.loyaltyPoints |
| AuditLog | C | Log "BOOKING_CHECKOUT" action |
| Notification | C | Send "Rental complete" notification with points earned |

---

# IV. Appendix

## 1. Assumptions & Dependencies

| ID | Type | Description |
|:---|:---:|:---|
| AS-1 | Assumption | The system operates primarily for Da Nang city with 2 initial branches (Airport and My Khe Beach) |
| AS-2 | Assumption | All customers have smartphones capable of accessing the web application |
| AS-3 | Assumption | Staff at branch counters have desktop/tablet devices with camera access for vehicle photography |
| AS-4 | Assumption | Internet connectivity is reliable at all branch locations |
| AS-5 | Assumption | Peak rental demand occurs during tourist seasons (April-August) and holidays (Tet, 30/4, 2/9) |
| DE-1 | Dependency | VNPay payment gateway is available and configured for processing deposits |
| DE-2 | Dependency | Google OAuth2.0 API is available for social login functionality |
| DE-3 | Dependency | Nodemailer SMTP service is configured for sending transactional emails |
| DE-4 | Dependency | MongoDB Atlas or local MongoDB server is provisioned and accessible |

## 2. Limitations & Exclusions

| ID | Description |
|:---|:---|
| LI-1 | The system does not support real-time GPS tracking of rented vehicles |
| LI-2 | Insurance claim processing is handled offline, not through the system |
| LI-3 | The system does not integrate with government vehicle registration databases |
| LI-4 | Multi-currency payment is not supported; all transactions are in VND |
| LI-5 | Mobile native app (iOS/Android) is not included in V1.0; the system is web-only responsive |
| LI-6 | AI-based demand forecasting in V1.0 uses simple trend analysis, not ML models |

## 3. Business Rules (Summary)

| ID | Category | Rule Definition |
|:---|:---|:---|
| BR-01 | Payment | Default deposit is 30% of total amount, paid online. Remaining 70% paid at counter during pickup. |
| BR-02 | Booking | A vehicle cannot have overlapping bookings. System prevents double-booking. |
| BR-03 | Booking | Minimum rental period is 1 day (24 hours). |
| BR-04 | Booking | Booking codes follow format MV-XXXXXX (uppercase alphanumeric). |
| BR-05 | Identity | Customer must complete eKYC verification (identityStatus = "Verified") before booking. |
| BR-06 | Cancellation | Free cancellation > 24h before pickup. 50% deposit forfeited if < 24h. No cancellation after handover. |
| BR-07 | Operations | Staff must complete 5-point safety check during vehicle handover (ID, license, photos, ODO, fuel). |
| BR-08 | Operations | Each rental includes complimentary package: 2 helmets, 2 raincoats, 1 phone mount. |
| BR-09 | Penalty | Late return fee: 30,000 VND per hour (rounded up to nearest hour). |
| BR-10 | Loyalty | Points earned: 1 point per 10,000 VND spent. Awarded only upon rental completion. |
| BR-11 | Fleet | Vehicle license plates must be globally unique across all branches. |
| BR-12 | Authorization | Branch Manager can only manage vehicles and bookings within their assigned branch. |
| FR-01 | Security | Passwords encoded with bcrypt (10 salt rounds). |
| FR-02 | Security | Account suspended after 6 consecutive failed login attempts (30 minutes lockout). |
| FR-03 | Security | JWT access tokens expire after 24 hours. |
| FR-04 | Verification | Email verification tokens expire after 24 hours. |
