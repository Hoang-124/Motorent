import os

def generate_presentation_html(output_path='docs/MOTORENT_SWP391_Presentation.html'):
    html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOTORENT - Báo Cáo Bảo Vệ Đồ Án SWP391 - FPT University</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #0c0c0c;
      color: #f5f5f5;
      overflow: hidden;
    }
    .slide {
      display: none;
      height: 100vh;
      width: 100vw;
      padding: 2rem 3.5rem;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.25s ease-in-out;
    }
    .slide.active {
      display: flex;
      flex-direction: column;
      opacity: 1;
    }
    .card-dark {
      background: #161616;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
    }
    .card-highlight {
      background: #1c1814;
      border: 1px solid rgba(255, 199, 153, 0.4);
      border-radius: 1rem;
    }
    .tag-peach {
      color: #FFC799;
      background: rgba(255, 199, 153, 0.12);
      border: 1px solid rgba(255, 199, 153, 0.25);
    }
    .tag-mint {
      color: #99FFE4;
      background: rgba(153, 255, 228, 0.12);
      border: 1px solid rgba(153, 255, 228, 0.25);
    }
    .tag-blue {
      color: #70B4FF;
      background: rgba(112, 180, 255, 0.12);
      border: 1px solid rgba(112, 180, 255, 0.25);
    }
    .tag-purple {
      color: #D1A3FF;
      background: rgba(209, 163, 255, 0.12);
      border: 1px solid rgba(209, 163, 255, 0.25);
    }
    .tag-rose {
      color: #FF7D8A;
      background: rgba(255, 125, 138, 0.12);
      border: 1px solid rgba(255, 125, 138, 0.25);
    }
    .tab-btn {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .tab-btn.active {
      background: #FFC799;
      color: #0c0c0c;
      font-weight: 700;
      border-color: #FFC799;
    }
    .tab-btn-mint.active {
      background: #99FFE4;
      color: #0c0c0c;
      font-weight: 700;
      border-color: #99FFE4;
    }
    /* Modal Zoom */
    #zoom-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    }
    #zoom-modal.active {
      display: flex;
    }
  </style>
</head>
<body class="select-none">

  <!-- SVG DEFINITIONS / ICONS -->
  <svg style="display: none;">
    <defs>
      <!-- Icon Bike -->
      <g id="icon-bike">
        <circle cx="5.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="18.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 6H5m7 11.5 3.5-7h3.5m-3.5 0 2-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- Icon Brain / AI -->
      <g id="icon-ai">
        <path d="M12 2a4 4 0 0 0-4 4c0 .7.2 1.4.5 2C6.6 8.6 5 10.6 5 13a6 6 0 0 0 4.5 5.8v1.2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1.2A6 6 0 0 0 19 13c0-2.4-1.6-4.4-3.5-5 .3-.6.5-1.3.5-2a4 4 0 0 0-4-4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 13h6m-3-3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </g>
      <!-- Icon Database -->
      <g id="icon-db">
        <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3m18 7c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" fill="none" stroke="currentColor" stroke-width="2"/>
      </g>
      <!-- Icon Package -->
      <g id="icon-package">
        <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="m21 16-9 5-9-5V8l9-5 9 5v8zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </g>
      <!-- Icon Shield Check -->
      <g id="icon-shield">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- Icon Users -->
      <g id="icon-users">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2"/>
      </g>
      <!-- Icon Check -->
      <g id="icon-check">
        <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- Icon Arrows -->
      <g id="icon-arrow-right">
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <polyline points="12 5 19 12 12 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </defs>
  </svg>

  <!-- MODAL ZOOM CHỨA ẢNH CHI TIẾT -->
  <div id="zoom-modal" onclick="closeZoomModal()">
    <div class="relative max-w-[92vw] max-h-[92vh] bg-[#161616] p-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center w-full px-3 py-1 mb-2 border-b border-white/10">
        <span id="zoom-title" class="text-sm font-bold text-[#FFC799]">Xem Chi Tiết Sơ Đồ UML</span>
        <button onclick="closeZoomModal()" class="text-white/60 hover:text-white px-2 py-0.5 rounded text-sm bg-white/10">Đóng (ESC)</button>
      </div>
      <img id="zoom-img" src="" alt="Zoomed Diagram" class="max-h-[82vh] max-w-[88vw] object-contain rounded-lg">
    </div>
  </div>

  <div id="presentation-container">

    <!-- ========================================== -->
    <!-- SLIDE 1: COVER -->
    <!-- ========================================== -->
    <section class="slide active justify-center items-center text-center">
      <div class="max-w-4xl space-y-6">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full tag-peach text-xs font-bold tracking-wider uppercase">
          <svg class="w-4 h-4"><use href="#icon-shield"/></svg>
          Trường Đại Học FPT • Báo Cáo Bảo Vệ Đồ Án SWP391 • Fall 2026
        </div>
        <h1 class="text-6xl font-black tracking-tight text-white">
          MOTO<span class="text-[#FFC799]">RENT</span>
        </h1>
        <p class="text-2xl font-bold text-[#99FFE4]">
          Nền Tảng Quản Lý Cho Thuê Xe Máy Đa Trạm & Tối Ưu Phân Ca AI
        </p>
        <p class="text-sm text-[#A0A0A0] max-w-2xl mx-auto leading-relaxed">
          Hệ sinh thái số hóa quy trình thuê xe máy toàn diện: Đặt cọc trực tuyến 30% VNPay/VietQR, Hợp đồng ký số tại quầy, Định danh eKYC mã hóa AES-256-GCM, Cảnh báo ODO bảo dưỡng tự động và Động cơ AI Dual-Engine xếp ca thông minh.
        </p>
        <div class="pt-6 flex justify-center items-center gap-6 text-xs text-[#A0A0A0]">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-[#FFC799]"><use href="#icon-users"/></svg>
            Nhóm thực hiện: <strong>5 Thành viên</strong>
          </span>
          <span>•</span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-[#99FFE4]"><use href="#icon-package"/></svg>
            Kiến trúc: <strong>Modular Monolith</strong>
          </span>
          <span>•</span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-[#70B4FF]"><use href="#icon-ai"/></svg>
            Công nghệ AI: <strong>Gemini 2.5 + Rule-v2</strong>
          </span>
        </div>
        <div class="pt-4 text-[11px] text-white/40">
          Nhấn phím <kbd class="px-2 py-0.5 bg-white/10 rounded">Phím Tiếp &rarr;</kbd> hoặc <kbd class="px-2 py-0.5 bg-white/10 rounded">Space</kbd> để chuyển slide
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 2: AGENDA (7 MỤC WHITEBOARD) -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-4">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Nội Dung Báo Cáo</span>
        <h2 class="text-3xl font-black text-white mt-1">Lộ Trình Báo Cáo Đồ Án SWP391 (7 Mục Cốt Lõi)</h2>
      </div>
      <div class="grid grid-cols-7 gap-3 flex-1 items-stretch">
        <div class="card-dark p-3.5 flex flex-col justify-between border-white/10">
          <div>
            <span class="text-xl font-black text-[#FFC799]">01</span>
            <h3 class="text-sm font-bold text-white mt-2">Thành Viên</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">Tên đề tài & phân công 5 thành viên trong nhóm.</p>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Section 1</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between border-white/10">
          <div>
            <span class="text-xl font-black text-[#99FFE4]">02</span>
            <h3 class="text-sm font-bold text-white mt-2">Product Background</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">Bối cảnh thị trường & bài toán nhức nhối.</p>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Section 2</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between border-white/10">
          <div>
            <span class="text-xl font-black text-[#70B4FF]">03</span>
            <h3 class="text-sm font-bold text-white mt-2">Existing System</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">Khảo sát & bảng so sánh 8 tiêu chí năng lực.</p>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Section 3</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between border-white/10">
          <div>
            <span class="text-xl font-black text-[#D1A3FF]">04</span>
            <h3 class="text-sm font-bold text-white mt-2">UC Diagram</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">Sơ đồ UML Use Case 4 tác nhân chính.</p>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Section 4</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between border-white/10">
          <div>
            <span class="text-xl font-black text-[#FF7D8A]">05</span>
            <h3 class="text-sm font-bold text-white mt-2">Database</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">24 Mongoose Models & sơ đồ ERD thực thể.</p>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Section 5</span>
        </div>

        <div class="card-highlight p-3.5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xl font-black text-[#FFC799]">06</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#FFC799]/20 text-[#FFC799] font-bold">TRỌNG TÂM 1</span>
            </div>
            <h3 class="text-sm font-bold text-[#FFC799] mt-2">Package Diagram</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">Kiến trúc Modular Monolith & vòng đời xử lý an toàn.</p>
          </div>
          <span class="text-[10px] text-[#FFC799] font-mono">Section 6</span>
        </div>

        <div class="card-highlight p-3.5 flex flex-col justify-between border-[#99FFE4]/40 bg-[#141b1a]">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xl font-black text-[#99FFE4]">07</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#99FFE4]/20 text-[#99FFE4] font-bold">TRỌNG TÂM 2</span>
            </div>
            <h3 class="text-sm font-bold text-[#99FFE4] mt-2">Cách Apply AI</h3>
            <p class="text-[11px] text-[#A0A0A0] mt-1.5">Dual-AI Engine, NLP tiếng Việt & bảo toàn điểm danh.</p>
          </div>
          <span class="text-[10px] text-[#99FFE4] font-mono">Section 7</span>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 3: MỤC 1 - THÀNH VIÊN NHÓM -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 1 • Nhóm Thực Hiện</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Danh Sách Thành Viên & Phân Công Nhiệm Vụ</h2>
      </div>
      <div class="grid grid-cols-5 gap-3.5 flex-1">
        <div class="card-dark p-4 flex flex-col justify-between border-[#FFC799]/40 bg-[#1a1714]">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold text-[#FFC799]">01 • LEAD</span>
              <span class="px-2 py-0.5 text-[10px] rounded-full tag-peach font-bold">Fullstack</span>
            </div>
            <h3 class="text-base font-bold text-white">Võ Đặng Hoàng Long</h3>
            <p class="text-xs text-[#FFC799] font-medium mt-0.5">Trưởng Nhóm Dự Án</p>
            <div class="mt-3 space-y-1.5 text-xs text-[#A0A0A0]">
              <p>• Thiết kế kiến trúc Modular Monolith & Core Middlewares.</p>
              <p>• Luồng Booking trung tâm, cọc 30% VNPay/VietQR, tất toán 70%.</p>
              <p>• Concurrency Resource Lock & Tích hợp AI Dual-Engine phân ca.</p>
            </div>
          </div>
          <span class="text-[11px] text-white/40">100% Core Engine & Locks</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold text-[#99FFE4]">02</span>
              <span class="px-2 py-0.5 text-[10px] rounded-full tag-mint font-bold">Backend</span>
            </div>
            <h3 class="text-base font-bold text-white">Nguyễn Đức Thịnh</h3>
            <p class="text-xs text-[#99FFE4] font-medium mt-0.5">Backend Developer</p>
            <div class="mt-3 space-y-1.5 text-xs text-[#A0A0A0]">
              <p>• Phân hệ quản lý đội xe (Fleet) & danh mục xe máy.</p>
              <p>• Điều chuyển xe giữa các trạm (VehicleTransfer).</p>
              <p>• Theo dõi ODO cảnh báo bảo dưỡng kỹ thuật.</p>
            </div>
          </div>
          <span class="text-[11px] text-white/40">Fleet & Maintenance</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold text-[#70B4FF]">03</span>
              <span class="px-2 py-0.5 text-[10px] rounded-full tag-blue font-bold">Frontend</span>
            </div>
            <h3 class="text-base font-bold text-white">Nguyễn Trung Hiếu</h3>
            <p class="text-xs text-[#70B4FF] font-medium mt-0.5">Frontend Lead</p>
            <div class="mt-3 space-y-1.5 text-xs text-[#A0A0A0]">
              <p>• Giao diện Web Khách hàng (React 19, Tailwind, Lucide SVG).</p>
              <p>• Web quầy tiếp tân cho nhân viên (Staff Counter Desk).</p>
              <p>• Bản xem trước phân ca trực quan & tương tác lịch trực.</p>
            </div>
          </div>
          <span class="text-[11px] text-white/40">Client & Staff UI</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold text-[#D1A3FF]">04</span>
              <span class="px-2 py-0.5 text-[10px] rounded-full tag-purple font-bold">QA & DB</span>
            </div>
            <h3 class="text-base font-bold text-white">Đỗ Gia Bảo</h3>
            <p class="text-xs text-[#D1A3FF] font-medium mt-0.5">Database & Test Eng</p>
            <div class="mt-3 space-y-1.5 text-xs text-[#A0A0A0]">
              <p>• Xây dựng 24 Mongoose Data Models & Indexes tối ưu.</p>
              <p>• Bộ kiểm thử 30/30 Vitest suites đạt 100% pass.</p>
              <p>• Bảo mật eKYC mã hóa AES-256-GCM.</p>
            </div>
          </div>
          <span class="text-[11px] text-white/40">Database & Automated Testing</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold text-[#FF7D8A]">05</span>
              <span class="px-2 py-0.5 text-[10px] rounded-full tag-rose font-bold">BA & Comms</span>
            </div>
            <h3 class="text-base font-bold text-white">Trần Minh Quân</h3>
            <p class="text-xs text-[#FF7D8A] font-medium mt-0.5">BA & Customer Support</p>
            <div class="mt-3 space-y-1.5 text-xs text-[#A0A0A0]">
              <p>• Tài liệu hóa yêu cầu nghiệp vụ RDS & SDS.</p>
              <p>• Phân hệ Khiếu nại (Complaint) & Đánh giá (Feedback).</p>
              <p>• Kênh Live Chat Socket.IO thời gian thực.</p>
            </div>
          </div>
          <span class="text-[11px] text-white/40">RDS/SDS & Support Module</span>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 4: MỤC 2 - PRODUCT BACKGROUND -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 2 • Bối Cảnh Sản Phẩm</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Product Background: Thực Trạng Thị Trường & Đột Phá MOTORENT</h2>
      </div>
      <div class="grid grid-cols-3 gap-4 flex-1">
        <div class="card-dark p-4 border-rose-500/30">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-rose-400">Thực Trạng & Điểm Đau (Pain Points)</span>
          </div>
          <ul class="space-y-3 text-xs text-[#A0A0A0]">
            <li>
              <strong class="text-white block mb-0.5">1. Giữ giấy tờ gốc tiềm ẩn rủi ro:</strong>
              Khách du lịch bị giữ CCCD/Hộ chiếu gốc, mất khả năng làm thủ tục khách sạn hoặc chuyến bay khẩn cấp.
            </li>
            <li>
              <strong class="text-white block mb-0.5">2. Hợp đồng giấy viết tay lỏng lẻo:</strong>
              Dễ tranh chấp khi xe có vết trầy xước từ trước do không có biên bản chụp ảnh 4 góc xe minh bạch.
            </li>
            <li>
              <strong class="text-white block mb-0.5">3. Quản lý phân tán, thiếu liên kết trạm:</strong>
              Cửa hàng thuê xe hoạt động đơn lẻ, khách không thể thuê xe ở trạm này và trả ở trạm khác.
            </li>
            <li>
              <strong class="text-white block mb-0.5">4. Phân ca trực nhân sự kiệt sức:</strong>
              Xếp ca tay dẫn đến tình trạng clopening (tối làm muộn, sáng trực sớm) và bất công giữa nhân sự.
            </li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#99FFE4]/30 bg-[#131a19]">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-[#99FFE4]"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-[#99FFE4]">Giải Pháp Đột Phá MOTORENT</span>
          </div>
          <ul class="space-y-3 text-xs text-[#A0A0A0]">
            <li>
              <strong class="text-white block mb-0.5">1. eKYC xác thực số AES-256-GCM:</strong>
              Khách quét và tải ảnh CCCD/GPLX trực tuyến, đối soát nhanh tại quầy, KHÔNG GIỮ GIẤY TỜ GỐC.
            </li>
            <li>
              <strong class="text-white block mb-0.5">2. Ký số hợp đồng tại quầy kèm ảnh 4 góc:</strong>
              Ghi nhận mức xăng, ODO thực tế, chụp ảnh 4 góc xe, khách hàng ký số song phương trên tablet.
            </li>
            <li>
              <strong class="text-white block mb-0.5">3. Mạng lưới trạm đa điểm & Đặt cọc 30%:</strong>
              Khách cọc 30% VNPay/VietQR giữ xe, 70% tất toán khi nhận xe, hỗ trợ trả khác trạm linh hoạt.
            </li>
            <li>
              <strong class="text-white block mb-0.5">4. AI Dual-Engine xếp ca tự động:</strong>
              Kết hợp Heuristic Rule-v2 và Gemini LLM giải quyết bài toán tải ca công bằng, loại bỏ clopening.
            </li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#FFC799]/30">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-[#FFC799]"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-[#FFC799]">Mục Tiêu & Tác Động Vận Hành</span>
          </div>
          <ul class="space-y-3 text-xs text-[#A0A0A0]">
            <li>
              <strong class="text-white block mb-0.5">1. Minh bạch hóa du lịch số:</strong>
              Quy chuẩn hóa toàn bộ chính sách thuê xe, không phát sinh phụ phí ẩn, nâng cao uy tín ngành du lịch.
            </li>
            <li>
              <strong class="text-white block mb-0.5">2. Tự động hóa cảnh báo bảo dưỡng ODO:</strong>
              Xe đạt ngưỡng km quy định sẽ tự động khóa vào lịch bảo dưỡng, đảm bảo an toàn tuyệt đối cho khách thuê.
            </li>
            <li>
              <strong class="text-white block mb-0.5">3. Tiết kiệm 90% thời gian phân ca:</strong>
              Quản lý trạm không còn phải xếp ca thủ công hàng giờ mỗi tuần; chỉ 1 click là có lịch trực chuẩn xác.
            </li>
            <li>
              <strong class="text-white block mb-0.5">4. Kiến trúc Modular Monolith mở rộng:</strong>
              Hệ thống độc lập 22 modules, sẵn sàng nâng cấp thành Microservices khi quy mô đạt 100+ trạm.
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 5: MỤC 3 - EXISTING SYSTEM -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 3 • Hiện Trạng Hệ Thống</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Khảo Sát Hệ Thống Hiện Có & Bảng So Sánh Năng Lực 8 Tiêu Chí</h2>
      </div>
      <div class="card-dark overflow-hidden flex-1">
        <table class="w-full text-left text-xs">
          <thead class="bg-white/5 border-b border-white/10 text-white font-bold">
            <tr>
              <th class="p-2.5">Tiêu Chí Nghiệp Vụ</th>
              <th class="p-2.5 text-white/60">Thuê Xe Máy Truyền Thống</th>
              <th class="p-2.5 text-white/60">Nền Tảng Thuê Ô Tô (Mioto)</th>
              <th class="p-2.5 text-[#FFC799] bg-[#FFC799]/10">Hệ Thống MOTORENT</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-[#A0A0A0]">
            <tr>
              <td class="p-2 font-semibold text-white">Xác thực danh tính</td>
              <td class="p-2">Giữ CCCD / Hộ chiếu gốc trực tiếp</td>
              <td class="p-2">Tải ảnh giấy tờ (chủ xe tự duyệt)</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">eKYC mã hóa AES-256-GCM, không giữ gốc</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Hợp đồng thuê xe</td>
              <td class="p-2">Viết tay giấy 1 liên, dễ thất lạc</td>
              <td class="p-2">Xác nhận đơn điện tử 1 chiều</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Ký số song phương tại quầy trên tablet kèm 4 góc ảnh</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Thanh toán & Đặt cọc</td>
              <td class="p-2">Tiền mặt / Chuyển khoản lẻ</td>
              <td class="p-2">Giữ cọc thẻ tín dụng phức tạp</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Cọc 30% VNPay/VietQR, 70% tất toán khi nhận xe</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Chính sách trả xe sớm</td>
              <td class="p-2">Tự thỏa thuận, hay cãi cọ</td>
              <td class="p-2">Tùy từng chủ xe riêng lẻ</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Quy chuẩn minh bạch: KHÔNG HOÀN TIỀN</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Giao xe tận nơi</td>
              <td class="p-2">Thương lượng ngoài qua điện thoại</td>
              <td class="p-2">Chủ xe tự thỏa thuận</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Tự động tính phí 40.000 đ/chiều chuẩn hóa</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Mạng lưới đa trạm</td>
              <td class="p-2">1 cửa hàng cố định, không trả khác trạm</td>
              <td class="p-2">Cá nhân phân tán, không có trạm</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Mạng lưới trạm, trả khác trạm, điều chuyển xe</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Bảo dưỡng kỹ thuật</td>
              <td class="p-2">Cảm tính, hỏng đâu sửa đó</td>
              <td class="p-2">Chủ xe tự theo dõi</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Cảnh báo ODO tự động, khóa xe bảo dưỡng</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Xếp ca nhân sự</td>
              <td class="p-2">Ghi chép sổ sách / Excel thủ công</td>
              <td class="p-2">Không có</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">AI Tối ưu hóa phân ca (Gemini + Heuristic)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 6: MỤC 4 - USE CASE DIAGRAM (UML CHUẨN) -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 4 • Sơ Đồ Use Case</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Sơ Đồ UML Use Case Diagram 4 Tác Nhân Chính</h2>
        </div>
        <!-- Tab Buttons for UC Diagrams -->
        <div class="flex items-center gap-1.5 bg-[#161616] p-1 rounded-lg border border-white/10 text-xs">
          <button onclick="switchUcTab('customer')" id="uc-btn-customer" class="tab-btn active px-3 py-1 rounded-md">1. Khách Hàng (Customer)</button>
          <button onclick="switchUcTab('staff')" id="uc-btn-staff" class="tab-btn px-3 py-1 rounded-md">2. Nhân Viên (Staff)</button>
          <button onclick="switchUcTab('manager')" id="uc-btn-manager" class="tab-btn px-3 py-1 rounded-md">3. Quản Lý (Manager)</button>
          <button onclick="switchUcTab('admin')" id="uc-btn-admin" class="tab-btn px-3 py-1 rounded-md">4. Quản Trị (Admin)</button>
          <button onclick="switchUcTab('guest')" id="uc-btn-guest" class="tab-btn px-3 py-1 rounded-md">5. Khách Vãng Lai (Guest)</button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <!-- Left: Dynamic Actor Details based on Tab -->
        <div class="col-span-4 card-dark p-3.5 space-y-2.5 overflow-y-auto" id="uc-text-panel">
          <!-- Populated by JS -->
        </div>

        <!-- Right: Authentic UML Diagram with Zoom Button -->
        <div class="col-span-8 card-dark p-2 bg-white flex flex-col justify-center items-center rounded-xl overflow-hidden shadow-2xl relative">
          <button onclick="openCurrentUcZoom()" class="absolute top-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shadow">
            Phóng to sơ đồ UML
          </button>
          <img id="uc-diagram-img" src="diagrams/usecase_customer.png" alt="UML Use Case Diagram" class="max-h-[72vh] w-auto object-contain rounded">
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 7: MỤC 5 - DATABASE & ERD DIAGRAMS -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 5 • Cơ Sở Dữ Liệu</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Kiến Trúc CSDL MongoDB (24 Models) & Sơ Đồ ERD Thực Thể</h2>
        </div>
        <!-- Tab Buttons for ERD Diagrams -->
        <div class="flex items-center gap-1.5 bg-[#161616] p-1 rounded-lg border border-white/10 text-xs">
          <button onclick="switchErdTab('booking')" id="erd-btn-booking" class="tab-btn active px-2.5 py-1 rounded-md">Đặt Xe & Hợp Đồng</button>
          <button onclick="switchErdTab('fleet')" id="erd-btn-fleet" class="tab-btn px-2.5 py-1 rounded-md">Đội Xe & Điều Chuyển</button>
          <button onclick="switchErdTab('support')" id="erd-btn-support" class="tab-btn px-2.5 py-1 rounded-md">Hỗ Trợ & Khiếu Nại</button>
          <button onclick="switchErdTab('auth')" id="erd-btn-auth" class="tab-btn px-2.5 py-1 rounded-md">Định Danh & eKYC</button>
          <button onclick="switchErdTab('branch')" id="erd-btn-branch" class="tab-btn px-2.5 py-1 rounded-md">Chi Nhánh & GPS</button>
          <button onclick="switchErdTab('hr')" id="erd-btn-hr" class="tab-btn px-2.5 py-1 rounded-md">Nhân Sự & Ca Trực</button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <!-- Left: Database Models Breakdown -->
        <div class="col-span-4 card-dark p-3.5 space-y-2.5 overflow-y-auto" id="erd-text-panel">
          <!-- Populated by JS -->
        </div>

        <!-- Right: Authentic ERD Diagram Image -->
        <div class="col-span-8 card-dark p-2 bg-white flex flex-col justify-center items-center rounded-xl overflow-hidden shadow-2xl relative">
          <button onclick="openCurrentErdZoom()" class="absolute top-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shadow">
            Phóng to sơ đồ ERD
          </button>
          <img id="erd-diagram-img" src="diagrams/database_booking_erd.jpeg" alt="Database ERD Schema" class="max-h-[72vh] w-auto object-contain rounded">
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 8: MỤC 6 - PACKAGE DIAGRAM [TRỌNG TÂM 1] -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 6 • Sơ Đồ Package [Trọng Tâm 1]</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Sơ Đồ Package Diagram Kiến Trúc Modular Monolith Chuẩn Hóa</h2>
        </div>
        <div class="flex items-center gap-1.5 bg-[#161616] p-1 rounded-lg border border-white/10 text-xs">
          <button onclick="switchPkgTab('uml')" id="pkg-btn-uml" class="tab-btn active px-3 py-1 rounded-md">Sơ Đồ Package UML</button>
          <button onclick="switchPkgTab('arch')" id="pkg-btn-arch" class="tab-btn px-3 py-1 rounded-md">Kiến Trúc 4 Tầng & Request Lifecycle</button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <div class="col-span-4 card-dark p-3.5 space-y-2.5 overflow-y-auto border-[#FFC799]/40">
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">Cấu Trúc Các Gói (Packages)</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">1. routes/index (Entry Layer)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Đầu mối phân phối API duy nhất, gắn tiền tố /api, định tuyến vào 22 feature modules độc lập.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">2. 22 Feature Modules (Domain Layer)</h4>
            <p class="text-[10px] text-[#A0A0A0]">auth, branch, vehicle, booking, fleet, hr, support, cms... Mỗi module khép kín Controller -> Service -> Routes.</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">3. core/ (Protection & Concurrency Layer)</h4>
            <p class="text-[10px] text-[#A0A0A0]">authMiddleware, rbacMiddleware (4 vai trò), auditMiddleware (che [REDACTED]), uploadMiddleware, và Hàng đợi Khóa Tài Nguyên Promise FIFO.</p>
          </div>
          <div class="border-l-2 border-purple-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">4. models/ & config/ (Foundation Layer)</h4>
            <p class="text-[10px] text-[#A0A0A0]">24 Mongoose Data Models, Index hợp chất, kết nối MongoDB Cluster, VNPay SDK, Mailer, Cron Jobs.</p>
          </div>
          <div class="border-l-2 border-emerald-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Nguyên Tắc Bất Biến</h4>
            <p class="text-[10px] text-[#99FFE4]">Low Coupling, High Cohesion, Zero Circular Dependency giữa các module, an toàn tuyệt đối khi chịu tải cao.</p>
          </div>
        </div>

        <div class="col-span-8 card-dark p-2 bg-white flex flex-col justify-center items-center rounded-xl overflow-hidden shadow-2xl relative">
          <button onclick="openCurrentPkgZoom()" class="absolute top-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shadow">
            Phóng to sơ đồ Package
          </button>
          <img id="pkg-diagram-img" src="diagrams/package_diagram.png" alt="Package Diagram" class="max-h-[72vh] w-auto object-contain rounded">
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 9: MỤC 6 - CHI TIẾT REQUEST FLOW & LOCK ENGINE -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 6 • Vòng Đời Xử Lý [Trọng Tâm 1]</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Vòng Đời Xử Lý Yêu Cầu & Cơ Chế Khóa Tài Nguyên An Toàn (Concurrency)</h2>
      </div>
      <div class="grid grid-cols-4 gap-3 flex-1 text-xs">
        <div class="card-dark p-3.5">
          <span class="text-xs font-mono font-bold text-[#FFC799]">Bước 1 & 2</span>
          <h3 class="text-sm font-bold text-white mt-1">HTTP Request & Auth</h3>
          <p class="mt-2 text-[#A0A0A0]">Client gửi request kèm Bearer JWT. `authMiddleware` giải mã JWT và kiểm tra `tokenVersion` trong DB để hủy phiên tức thì khi tài khoản bị khóa hoặc đổi mật khẩu.</p>
        </div>
        <div class="card-dark p-3.5">
          <span class="text-xs font-mono font-bold text-[#FFC799]">Bước 3 & 4</span>
          <h3 class="text-sm font-bold text-white mt-1">RBAC & Audit Logger</h3>
          <p class="mt-2 text-[#A0A0A0]">`rbacMiddleware` so khớp 4 vai trò qua `PERMISSION_MATRIX`. `auditMiddleware` chặn bắt phương thức nhạy cảm, lọc che bí mật (`[REDACTED]`) và ghi nhật ký.</p>
        </div>
        <div class="card-highlight p-3.5">
          <span class="text-xs font-mono font-bold text-[#FFC799]">Bước 5 & 6 [Cốt lõi]</span>
          <h3 class="text-sm font-bold text-[#FFC799] mt-1">Controller & Lock</h3>
          <p class="mt-2 text-[#A0A0A0]">Controller validate DTO. Gọi `acquireVehicleLock` (Hàng đợi FIFO Promise + TTL lock) và `withOptionalTransaction` chống xung đột đặt trùng xe khi tải cao.</p>
        </div>
        <div class="card-dark p-3.5">
          <span class="text-xs font-mono font-bold text-[#FFC799]">Bước 7</span>
          <h3 class="text-sm font-bold text-white mt-1">Mongoose & Sockets</h3>
          <p class="mt-2 text-[#A0A0A0]">Service tương tác Mongoose Model qua CAS atomic (`findOneAndUpdate`), đồng thời phát sự kiện Socket.IO cập nhật tức thì trạng thái đến các Client.</p>
        </div>
      </div>
      <div class="card-dark p-3 mt-3 text-xs text-[#99FFE4] flex items-center justify-between border-[#99FFE4]/30">
        <span>Đặc tính kiến trúc cốt lõi: <strong>Low Coupling, High Cohesion, Zero Circular Dependency, An toàn 100% trong môi trường đồng thời cao.</strong></span>
        <span class="font-mono text-[#FFC799]">Zero Double Booking Guaranteed</span>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 10: MỤC 7 - CÁCH APPLY AI VÀO HỆ THỐNG [TRỌNG TÂM 2] -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 7 • Ứng Dụng AI Vào Hệ Thống [Trọng Tâm 2]</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Kiến Trúc & Quy Trình Hệ Thống AI Xếp Lịch Trực Thông Minh (Dual-AI Engine)</h2>
        </div>
        <button onclick="openAiZoom()" class="bg-[#FFC799] hover:bg-[#ffb67a] text-black px-3 py-1 rounded text-xs font-bold shadow flex items-center gap-1">
          Phóng to sơ đồ luồng AI
        </button>
      </div>

      <!-- High-res full AI architecture diagram image -->
      <div class="card-dark p-2 flex-1 flex flex-col justify-center items-center overflow-hidden border-[#FFC799]/40 relative">
        <img id="ai-diagram-img" src="diagrams/ai_scheduling_architecture.png" alt="AI Scheduling Architecture" class="max-h-[75vh] w-auto object-contain rounded-lg">
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 11: MỤC 7 - THUẬT TOÁN HEURISTIC & GEMINI -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 7 • Chi Tiết Thuật Toán Phân Ca [Trọng Tâm 2]</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Thuật Toán MOTORENT-Rule-v2 & Kỹ Thuật Structured Prompt Gemini</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 flex-1 text-xs">
        <div class="card-dark p-4 border-[#FFC799]/30">
          <span class="text-xs font-bold uppercase text-[#FFC799] tracking-wider block">ĐỘNG CƠ HEURISTIC SOLVER (RULE-v2)</span>
          <ul class="mt-2.5 space-y-2.5 text-[#A0A0A0]">
            <li>
              <strong class="text-white">1. Công thức DemandScore tải ca:</strong>
              <div class="font-mono text-[#99FFE4] bg-white/5 p-1.5 rounded mt-1">DemandScore = Pickup*1.0 + Return*1.0 + DoorDelivery*0.8 + WeekendBoost (+1.5)</div>
              Tự động tính ra số nhân sự cần thiết từ 1 đến 3 người/ca dựa trên dữ liệu đặt xe thực tế.
            </li>
            <li>
              <strong class="text-white">2. Thưởng Ca Liền Kề (+30 điểm):</strong>
              Ưu tiên xếp Ca 1 & 2 (Sáng-Chiều) hoặc Ca 2 & 3 (Chiều-Tối) để nhân viên làm một mạch nghỉ trọn vẹn.
            </li>
            <li>
              <strong class="text-white">3. Phạt Nặng Ca Gãy Phi Lý (-85 điểm):</strong>
              Tránh xếp Ca 1 & 3 (làm sáng, tối lại lên làm). Chỉ miễn cưỡng chọn khi trạm không còn ai khác.
            </li>
            <li>
              <strong class="text-white">4. Chống Kiệt Sức Clopening (-35 điểm):</strong>
              Cấm xếp Ca 3 tối hôm trước (22:00) rồi lại Ca 1 sáng hôm sau (07:00). Đảm bảo ngủ đủ 9 tiếng.
            </li>
            <li>
              <strong class="text-white">5. Cân Bằng Công Bằng Giờ Làm:</strong>
              Thuật toán tham lam (Greedy) luôn ưu tiên nhân sự có số giờ tích lũy thấp nhất trong tuần.
            </li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#99FFE4]/30">
          <span class="text-xs font-bold uppercase text-[#99FFE4] tracking-wider block">KỸ THUẬT PROMPT GOOGLE GEMINI AI</span>
          <ul class="mt-2.5 space-y-2.5 text-[#A0A0A0]">
            <li>
              <strong class="text-white">1. Chuỗi Mô Hình Fallback Đa Tầng:</strong>
              Tự động chuyển đổi mượt mà: `gemini-2.5-flash` &rarr; `gemini-2.0-flash` &rarr; `gemini-1.5-flash`.
            </li>
            <li>
              <strong class="text-white">2. Structured Prompt Engineering:</strong>
              System prompt định vị chuyên gia điều phối vận hành chuỗi xe máy. Nạp đầy đủ context: danh sách nhân viên, đăng ký rảnh/bận, ca đã có, slot thiếu.
            </li>
            <li>
              <strong class="text-white">3. Strict JSON Schema Validation:</strong>
              Bắt buộc mô hình trả về JSON gồm `confidenceScore`, cờ `isConsecutive`, `isReluctant13` và trường `reason` giải thích chi tiết tiếng Việt.
            </li>
            <li>
              <strong class="text-white">4. Tái Sử Dụng Bản Xem Trước (Single-Call):</strong>
              Frontend lưu bản preview trên State; khi quản lý bấm "Áp Dụng Lịch", dữ liệu ghi thẳng vào DB, KHÔNG gọi lại AI lần 2 (tiết kiệm 100% token).
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 12: MỤC 7 - NLP TIẾNG VIỆT & BẢO TOÀN DỮ LIỆU -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 7 • NLP Tiếng Việt & Dữ Liệu [Trọng Tâm 2]</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Phân Tích Cú Pháp Tiếng Việt & Cơ Chế Khóa Bất Biến Bảo Toàn Điểm Danh</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 flex-1 text-xs">
        <div class="card-dark p-4 border-[#99FFE4]/30">
          <span class="text-xs font-bold uppercase text-[#99FFE4] tracking-wider block">BỘ PHÂN TÍCH NLP TIẾNG VIỆT TỰ NHIÊN</span>
          <p class="text-white mt-1.5">Hỗ trợ nhân viên nhắn tin đăng ký ca tự do như chat Zalo:</p>
          <div class="font-mono text-[#FFC799] bg-white/5 p-2 rounded mt-2">
            "t2 1 2, t3 sang chieu, t4 ban, t5 1 2 ban 3, t7 ko lam ca 2, cn off"
          </div>
          <ul class="mt-3 space-y-2 text-[#A0A0A0]">
            <li>• <strong class="text-white">Chuẩn hóa thứ</strong>: t2, thứ 2, thu 2, mon &rarr; Thứ 2 ... cn, chu nhat &rarr; Chủ Nhật.</li>
            <li>• <strong class="text-white">Chuẩn hóa ca</strong>: 1/sang &rarr; Ca 1 (Sáng), 2/chieu &rarr; Ca 2 (Chiều), 3/toi &rarr; Ca 3 (Tối).</li>
            <li>• <strong class="text-white">Xử lý phủ định</strong>: "bận ca 1", "ko làm ca 2", "nghỉ sáng" &rarr; đánh dấu bận đúng ca đó.</li>
            <li>• <strong class="text-white">Đồng bộ 2 chiều</strong>: Cập nhật trực tiếp lên ma trận ô lưới trên UI cho nhân viên xem lại.</li>
          </ul>
        </div>

        <div class="card-dark p-4 border-rose-500/30">
          <span class="text-xs font-bold uppercase text-rose-400 tracking-wider block">BẢO TOÀN LỊCH SỬ CHẤM CÔNG (IMMUTABILITY)</span>
          <p class="text-white mt-1.5">Vấn đề thực tế khi chạy lại AI giữa tuần:</p>
          <div class="bg-rose-950/30 border border-rose-500/30 p-2 rounded mt-2 text-rose-200">
            Nếu nhân viên xin nghỉ gấp thứ 5, chạy lại AI cho cả tuần có nguy cơ ghi đè hoặc xóa mất ca thứ 2, thứ 3, thứ 4 đã diễn ra!
          </div>
          <ul class="mt-3 space-y-2 text-[#A0A0A0]">
            <li>• <strong class="text-white">Khóa ca quá khứ:</strong> Mọi ca có ngày nhỏ hơn hiện tại được KHÓA BẢO VỆ 100%, AI không được can thiệp.</li>
            <li>• <strong class="text-white">Khóa ca đã điểm danh:</strong> Ca đã có Check-in/Check-out được bảo lưu tuyệt đối làm căn cứ tính lương.</li>
            <li>• <strong class="text-white">Chỉ xếp ca tương lai:</strong> AI chỉ tự động quét và lấp đầy các slot còn trống tiếp theo trong tuần.</li>
            <li>• <strong class="text-white">Toàn vẹn số liệu:</strong> Đảm bảo đối soát HR và bảng lương cuối tháng chính xác 100%.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 13: KẾT QUẢ KIỂM THỬ TOÀN DIỆN -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Đảm Bảo Chất Lượng • Kiểm Thử</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Kết Quả Kiểm Thử Thực Tế: 30/30 Test Suites Đạt Chuẩn Tuyệt Đối</h2>
      </div>
      <div class="grid grid-cols-4 gap-4 flex-1">
        <div class="card-dark p-4 flex flex-col justify-between border-[#FFC799]/40 bg-[#1c1814]">
          <div>
            <span class="text-4xl font-black text-[#FFC799]">30 / 30</span>
            <h3 class="text-sm font-bold text-white mt-2">Test Suites Passed</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              100% bộ kiểm thử tự động Vitest bao gồm Unit Tests, Integration Tests, Concurrency Locks & AI Verification đều pass thành công.
            </p>
          </div>
          <span class="text-[11px] text-[#FFC799] font-mono">30 Passed (100%)</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between border-[#99FFE4]/40 bg-[#141b1a]">
          <div>
            <span class="text-4xl font-black text-[#99FFE4]">1,807</span>
            <h3 class="text-sm font-bold text-white mt-2">Client Modules</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Vite build sản phẩm sạch bóng, 0 lỗi TypeScript, 0 lỗi linter, thời gian build nhanh, cấu trúc responsive mượt mà trên mọi thiết bị.
            </p>
          </div>
          <span class="text-[11px] text-[#99FFE4] font-mono">0 TS Errors</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between border-blue-400/40">
          <div>
            <span class="text-4xl font-black text-blue-400">100%</span>
            <h3 class="text-sm font-bold text-white mt-2">Bảo Mật Dữ Liệu</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Mã hóa AES-256-GCM bảo vệ ảnh GPLX/CCCD (eKYC), phân quyền RBAC 4 vai trò nghiêm ngặt, AuditLog che mờ toàn bộ bí mật [REDACTED].
            </p>
          </div>
          <span class="text-[11px] text-blue-400 font-mono">AES-256-GCM</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between border-purple-400/40">
          <div>
            <span class="text-4xl font-black text-purple-400">0.00s</span>
            <h3 class="text-sm font-bold text-white mt-2">Xung Đột Đặt Trùng</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Hàng đợi Promise FIFO kết hợp MongoDB Atomic CAS loại bỏ hoàn toàn tình trạng race condition đặt trùng xe trong điều kiện chịu tải cao.
            </p>
          </div>
          <span class="text-[11px] text-purple-400 font-mono">FIFO Queue Lock</span>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- SLIDE 14: KẾT LUẬN & Q&A -->
    <!-- ========================================== -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Tổng Kết • Hướng Phát Triển</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Kết Luận Đề Tài & Định Hướng Mở Rộng Tương Lai</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 flex-1 text-xs">
        <div class="card-dark p-4 border-[#99FFE4]/30">
          <span class="text-xs font-bold uppercase text-[#99FFE4] tracking-wider block">CÁC KẾT QUẢ ĐẠT ĐƯỢC CỦA ĐỒ ÁN</span>
          <ul class="mt-3 space-y-2.5 text-[#A0A0A0]">
            <li>
              <strong class="text-white">1. Hoàn thành 100% mục tiêu SDS/RDS:</strong>
              Xây dựng thành công hệ sinh thái 22 modules nghiệp vụ, giải quyết trọn vẹn bài toán vận hành thuê xe máy đa trạm.
            </li>
            <li>
              <strong class="text-white">2. Tiên phong ứng dụng AI điều phối thực tế:</strong>
              Kết hợp Dual-AI Engine giải quyết bài toán phân ca hóc búa, loại bỏ 100% clopening và ca gãy phi lý.
            </li>
            <li>
              <strong class="text-white">3. An toàn giao dịch & Pháp lý minh bạch:</strong>
              Cọc 30% VNPay/VietQR, ký số hợp đồng song phương tại quầy kèm ảnh chụp 4 góc xe rõ ràng.
            </li>
            <li>
              <strong class="text-white">4. Kiến trúc phần mềm chuẩn mực cao cấp:</strong>
              Modular Monolith phân lớp sạch, dễ bảo trì, mã nguồn TypeScript nghiêm ngặt, zero circular dependency.
            </li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#FFC799]/30">
          <span class="text-xs font-bold uppercase text-[#FFC799] tracking-wider block">HƯỚNG PHÁT TRIỂN TIẾP THEO & Q&A</span>
          <ul class="mt-3 space-y-2.5 text-[#A0A0A0]">
            <li>
              <strong class="text-white">1. Tích hợp IoT Định Vị GPS Trên Xe:</strong>
              Lắp đặt hộp đen IoT theo dõi lộ trình thời gian thực, cảnh báo rung lắc và hỗ trợ tìm xe khẩn cấp.
            </li>
            <li>
              <strong class="text-white">2. Mở rộng ứng dụng Mobile Native (React Native):</strong>
              Phát triển app mobile cho khách hàng quét mã QR nhận xe tự động tại trạm không cần nhân viên.
            </li>
            <li>
              <strong class="text-white">3. Sẵn sàng mở rộng thành Microservices:</strong>
              Khi hệ thống đạt mốc 100+ chi nhánh trên toàn quốc, sẵn sàng tách các module fleet/booking độc lập.
            </li>
            <li>
              <strong class="text-[#FFC799] text-sm block mt-4">Kính mời Quý Thầy Cô đặt câu hỏi cho nhóm!</strong>
              <span class="text-[#A0A0A0] block mt-1">Nhóm xin chân thành cảm ơn Hội đồng Giám khảo SWP391 FPT University.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

  </div>

  <!-- BOTTOM NAVIGATION BAR -->
  <footer class="fixed bottom-0 left-0 right-0 h-14 bg-[#111111] border-t border-white/10 px-6 flex justify-between items-center text-xs z-50">
    <div class="flex items-center gap-3">
      <span class="font-bold text-white tracking-wide">MOTORENT</span>
      <span class="text-white/40">|</span>
      <span class="text-white/60">Báo Cáo Bảo Vệ Đồ Án SWP391</span>
    </div>

    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="px-3 py-1.5 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition flex items-center gap-1 font-semibold">
        &larr; Slide Trước
      </button>
      <div id="slide-indicator" class="font-mono text-white/60 px-3 font-semibold">
        1 / 14
      </div>
      <button onclick="nextSlide()" class="px-3 py-1.5 rounded bg-[#FFC799] hover:bg-[#ffb67a] text-black transition flex items-center gap-1 font-bold">
        Slide Tiếp &rarr;
      </button>
    </div>

    <div class="flex items-center gap-3 text-white/40 font-mono text-[11px]">
      <span>[Phím Mũi Tên Trái / Phải]</span>
      <span>•</span>
      <button onclick="toggleFullScreen()" class="hover:text-white transition">Toàn Màn Hình (F)</button>
    </div>
  </footer>

  <script>
    // Data for Use Case tabs
    const ucData = {
      customer: {
        title: "TÁC NHÂN: KHÁCH HÀNG (CUSTOMER)",
        img: "diagrams/usecase_customer.png",
        content: `
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">Use Cases Khách Hàng (UC-08 .. UC-25)</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Đặt xe & Thanh toán</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-08: Chọn xe, thời gian thuê, địa điểm nhận/trả.<br>UC-09: Tùy chọn giao xe tận nơi (+40k/chiều).<br>UC-10: Áp dụng mã giảm giá voucher.<br>UC-11: Thanh toán cọc 30% VNPay / VietQR.<br>UC-12: Hủy đơn thuê xe (Hoàn cọc theo chính sách).</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">eKYC & Hợp đồng nhận xe</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-15: Tải ảnh GPLX/CCCD (mã hóa AES-256-GCM).<br>UC-16: Xác thực danh tính trực tuyến.<br>UC-17: Ký số biên bản bàn giao xe tại quầy.<br>UC-18: Xác nhận mức xăng, ODO và 4 góc ảnh xe.</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Hậu mãi, Tương tác & Khiếu nại</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-20: Yêu cầu gia hạn thời gian thuê xe.<br>UC-21: Gửi đánh giá sao & review xe.<br>UC-22: Gửi khiếu nại (Complaint kèm ảnh bằng chứng).<br>UC-23: Live Chat hỗ trợ Socket.IO.<br>UC-25: Tích điểm loyalty đổi ưu đãi.</p>
          </div>
        `
      },
      staff: {
        title: "TÁC NHÂN: NHÂN VIÊN QUẦY (STAFF)",
        img: "diagrams/usecase_staff.png",
        content: `
          <span class="text-xs font-bold text-[#99FFE4] uppercase tracking-wider block">Use Cases Nhân Viên (UC-26 .. UC-32)</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Bàn giao xe & Check-in Quầy</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-26: Kiểm tra đơn đặt cọc và hồ sơ eKYC khách hàng.<br>UC-27: Chụp 4 góc ảnh hiện trạng xe, kiểm tra ODO và mức xăng.<br>UC-28: Hướng dẫn khách ký số hợp đồng trên tablet.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Trả xe, Tất toán & Xử lý sự cố</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-29: Kiểm tra xe khi trả, tính phụ phí (trễ giờ, thiếu xăng, trầy xước).<br>UC-30: Thu 70% tất toán và xuất hóa đơn điện tử.<br>UC-31: Tiếp nhận và xử lý sự cố cứu hộ dọc đường khẩn cấp.</p>
          </div>
          <div class="border-l-2 border-purple-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Chấm công & Đăng ký ca trực</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-32: Điểm danh vào/ra ca trực hàng ngày.<br>Đăng ký lịch rảnh tiếng Việt tự nhiên qua NLP chat.</p>
          </div>
        `
      },
      manager: {
        title: "TÁC NHÂN: QUẢN LÝ TRẠM (BRANCH MANAGER)",
        img: "diagrams/usecase_manager.png",
        content: `
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">Use Cases Quản Lý (UC-33 .. UC-42)</span>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Quản lý đội xe & Điều chuyển</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-33: Theo dõi trạng thái đội xe thời gian thực.<br>UC-34: Khởi tạo lệnh điều chuyển xe giữa các trạm (VehicleTransfer).<br>UC-35: Duyệt và xác nhận tiếp nhận xe điều chuyển.</p>
          </div>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Bảo dưỡng xe định kỳ theo ODO</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-36: Nhận cảnh báo xe vượt ngưỡng km bảo dưỡng.<br>UC-37: Phê duyệt đưa xe vào xưởng và lưu MaintenanceLog.</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Phân ca trực thông minh bằng AI</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-39: Kích hoạt thuật toán AI Dual-Engine xếp ca tuần.<br>UC-40: Xem trước bảng phân ca và điều chỉnh thủ công.<br>UC-41: Bấm "Áp Dụng" lưu trực tiếp DB (Bảo toàn điểm danh).</p>
          </div>
        `
      },
      admin: {
        title: "TÁC NHÂN: QUẢN TRỊ VIÊN (SYSTEM ADMIN)",
        img: "diagrams/usecase_admin.png",
        content: `
          <span class="text-xs font-bold text-rose-400 uppercase tracking-wider block">Use Cases Quản Trị Viên (UC-43 .. UC-50)</span>
          <div class="border-l-2 border-rose-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Quản trị hệ thống & Ma trận RBAC</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-43: Quản lý danh sách tài khoản và phân quyền 4 vai trò.<br>UC-44: Khóa/mở khóa tài khoản (Tự động tăng tokenVersion để hủy phiên).</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Mạng lưới chi nhánh & Bảng giá</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-45: Thiết lập danh mục xe, giá thuê ngày/giờ và phụ phí lễ tết.<br>UC-46: Quản lý danh sách trạm chi nhánh và tọa độ GPS.</p>
          </div>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Bảo mật AuditLog & CMS</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-48: Giám sát nhật ký bảo mật AuditLog (tự động che [REDACTED]).<br>UC-49: Quản lý banner khuyến mãi và trang tĩnh điều khoản CMS.<br>UC-50: Báo cáo KPI tài chính và hiệu suất toàn chuỗi.</p>
          </div>
        `
      },
      guest: {
        title: "TÁC NHÂN: KHÁCH VÃNG LAI (GUEST)",
        img: "diagrams/usecase_guest.png",
        content: `
          <span class="text-xs font-bold text-[#70B4FF] uppercase tracking-wider block">Use Cases Khách Vãng Lai (UC-01 .. UC-07)</span>
          <div class="border-l-2 border-[#70B4FF] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Khám phá & Tìm kiếm xe</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-01: Xem danh mục các dòng xe máy (Tay ga, Xe số, Côn tay).<br>UC-02: Lọc xe theo trạm, mức giá và tình trạng sẵn sàng.<br>UC-03: Xem chi tiết thông số kỹ thuật xe và ảnh 4 góc.</p>
          </div>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Mạng lưới chi nhánh & Đăng ký</h4>
            <p class="text-[10px] text-[#A0A0A0]">UC-04: Xem bản đồ vị trí các trạm chi nhánh.<br>UC-05: Đăng ký tài khoản khách hàng mới.<br>UC-06: Đăng nhập vào hệ thống.<br>UC-07: Quên mật khẩu & xác thực OTP qua Email.</p>
          </div>
        `
      }
    };

    // Data for Database ERD tabs
    const erdData = {
      booking: {
        title: "SƠ ĐỒ ERD: ĐẶT XE & THANH TOÁN (BOOKING & PAYMENT)",
        img: "diagrams/database_booking_erd.jpeg",
        content: `
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">Phân Hệ Booking & Thanh Toán</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Booking Model (Cốt lõi)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Lưu trữ hợp đồng thuê xe, thời gian thuê, trạm nhận/trả, cọc 30%, 70% tất toán, chữ ký song phương và ảnh chụp 4 góc xe.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Payment Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Giao dịch thanh toán cổng VNPay / VietQR, mã giao dịch ngân hàng, trạng thái Paid/Refunded, kiểm tra đối soát.</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Discount & BookingReminder</h4>
            <p class="text-[10px] text-[#A0A0A0]">Mã voucher giảm giá theo %, điều kiện tối thiểu, và bộ đếm tự động gửi SMS nhắc lịch nhận/trả xe qua Cron job.</p>
          </div>
        `
      },
      fleet: {
        title: "SƠ ĐỒ ERD: ĐỘI XE, ĐIỀU CHUYỂN & BẢO DƯỠNG (FLEET)",
        img: "diagrams/database_fleet_erd.jpeg",
        content: `
          <span class="text-xs font-bold text-[#99FFE4] uppercase tracking-wider block">Phân Hệ Đội Xe & Điều Chuyển</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Vehicle & Category Models</h4>
            <p class="text-[10px] text-[#A0A0A0]">Thông tin chi tiết xe máy, biển số, ODO hiện tại, trạng thái (Available, Rented, Maintenance, Transferring), liên kết danh mục xe.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">VehicleTransfer Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Lệnh điều phối xe giữa trạm xuất phát và trạm đích. Tự động chuyển trạm sở hữu xe khi nhận thành công.</p>
          </div>
          <div class="border-l-2 border-purple-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">MaintenanceLog Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Lưu nhật ký bảo dưỡng, mốc km thay nhớt, chi phí sửa chữa và ngày bàn giao xe trở lại hoạt động.</p>
          </div>
        `
      },
      support: {
        title: "SƠ ĐỒ ERD: HỖ TRỢ, KHIẾU NẠI & GIAO TIẾP",
        img: "diagrams/database_support_erd.jpeg",
        content: `
          <span class="text-xs font-bold text-blue-400 uppercase tracking-wider block">Phân Hệ Hỗ Trợ Khách Hàng</span>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Complaint Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Khiếu nại ràng buộc trực tiếp theo BookingId, chống khiếu nại ảo. Trạng thái Open -> InProgress -> Resolved -> Closed.</p>
          </div>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Feedback & Review Models</h4>
            <p class="text-[10px] text-[#A0A0A0]">Khách hàng đánh giá số sao (1-5) và bình luận trải nghiệm thuê xe sau khi hoàn tất đơn hàng.</p>
          </div>
          <div class="border-l-2 border-purple-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Conversation & Message Models</h4>
            <p class="text-[10px] text-[#A0A0A0]">Hệ thống phòng chat trực tuyến thời gian thực giữa Khách hàng và Nhân viên hỗ trợ qua Socket.IO.</p>
          </div>
        `
      },
      auth: {
        title: "SƠ ĐỒ ERD: ĐỊNH DANH NGƯỜI DÙNG & eKYC (AUTH)",
        img: "diagrams/database_auth_erd.jpeg",
        content: `
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">Phân Hệ Xác Thực & Bảo Mật</span>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">User Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Mật khẩu mã hóa Bcrypt, tokenVersion vô hiệu hóa JWT lập tức khi đổi mật khẩu/khóa tài khoản, phân quyền 4 vai trò.</p>
          </div>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">eKYC Verification Fields</h4>
            <p class="text-[10px] text-[#A0A0A0]">Mã hóa đối xứng AES-256-GCM bảo vệ ảnh chụp 2 mặt CCCD và Giấy phép lái xe (GPLX A1/A2), bảo mật tuyệt đối.</p>
          </div>
        `
      },
      branch: {
        title: "SƠ ĐỒ ERD: MẠNG LƯỚI TRẠM CHI NHÁNH & GPS",
        img: "diagrams/database_branch_erd.jpeg",
        content: `
          <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Phân Hệ Chi Nhánh & Bản Đồ</span>
          <div class="border-l-2 border-emerald-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Branch Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Tọa độ GPS (Latitude, Longitude), địa chỉ chi nhánh, giờ mở cửa/đóng cửa và sức chứa tối đa của bãi xe.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Công thức Haversine</h4>
            <p class="text-[10px] text-[#A0A0A0]">Tự động tính khoảng cách thực tế giữa vị trí khách hàng và trạm chi nhánh gần nhất để gợi ý nhận xe.</p>
          </div>
        `
      },
      hr: {
        title: "SƠ ĐỒ ERD: NHÂN SỰ & CA TRỰC (HR SCHEDULER)",
        img: "diagrams/database_hr_erd.jpeg",
        content: `
          <span class="text-xs font-bold text-purple-400 uppercase tracking-wider block">Phân Hệ Nhân Sự & Phân Ca</span>
          <div class="border-l-2 border-purple-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">StaffSchedule Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Lưu lịch trực theo ngày, ca 1/2/3, nhân viên được phân công, trạng thái điểm danh (Check-in, Check-out).</p>
          </div>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">StaffAvailability Model</h4>
            <p class="text-[10px] text-[#A0A0A0]">Nguyện vọng đăng ký rảnh/bận của nhân viên trong tuần, tự động đồng bộ từ tin nhắn chat NLP tiếng Việt.</p>
          </div>
        `
      }
    };

    // Slide navigation state
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const indicator = document.getElementById('slide-indicator');

    function updateSlide() {
      slides.forEach((s, idx) => {
        if (idx === currentSlide) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
      indicator.textContent = (currentSlide + 1) + ' / ' + slides.length;
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        updateSlide();
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateSlide();
      }
    }

    document.addEventListener('keydown', (e) => {
      if (document.getElementById('zoom-modal').classList.contains('active')) {
        if (e.key === 'Escape') closeZoomModal();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullScreen();
      }
    });

    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    // Modal Zoom Functions
    function openZoomModal(imgSrc, title) {
      const modal = document.getElementById('zoom-modal');
      const img = document.getElementById('zoom-img');
      const tit = document.getElementById('zoom-title');
      img.src = imgSrc;
      tit.textContent = title;
      modal.classList.add('active');
    }

    function closeZoomModal() {
      document.getElementById('zoom-modal').classList.remove('active');
    }

    // Tab Switchers
    let currentUcRole = 'customer';
    function switchUcTab(role) {
      currentUcRole = role;
      document.querySelectorAll('#uc-btn-customer, #uc-btn-staff, #uc-btn-manager, #uc-btn-admin, #uc-btn-guest').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById('uc-btn-' + role).classList.add('active');

      const data = ucData[role];
      document.getElementById('uc-diagram-img').src = data.img;
      document.getElementById('uc-text-panel').innerHTML = data.content;
    }

    function openCurrentUcZoom() {
      const data = ucData[currentUcRole];
      openZoomModal(data.img, data.title);
    }

    let currentErdKey = 'booking';
    function switchErdTab(key) {
      currentErdKey = key;
      document.querySelectorAll('#erd-btn-booking, #erd-btn-fleet, #erd-btn-support, #erd-btn-auth, #erd-btn-branch, #erd-btn-hr').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById('erd-btn-' + key).classList.add('active');

      const data = erdData[key];
      document.getElementById('erd-diagram-img').src = data.img;
      document.getElementById('erd-text-panel').innerHTML = data.content;
    }

    function openCurrentErdZoom() {
      const data = erdData[currentErdKey];
      openZoomModal(data.img, data.title);
    }

    let currentPkgTab = 'uml';
    function switchPkgTab(tab) {
      currentPkgTab = tab;
      document.querySelectorAll('#pkg-btn-uml, #pkg-btn-arch').forEach(b => b.classList.remove('active'));
      document.getElementById('pkg-btn-' + tab).classList.add('active');

      if (tab === 'uml') {
        document.getElementById('pkg-diagram-img').src = 'diagrams/package_diagram.png';
      } else {
        document.getElementById('pkg-diagram-img').src = 'diagrams/modular_monolith_architecture.png';
      }
    }

    function openCurrentPkgZoom() {
      if (currentPkgTab === 'uml') {
        openZoomModal('diagrams/package_diagram.png', 'SƠ ĐỒ PACKAGE UML CHUẨN HOÁ');
      } else {
        openZoomModal('diagrams/modular_monolith_architecture.png', 'KIẾN TRÚC MODULAR MONOLITH & VÒNG ĐỜI XỬ LÝ AN TOÀN');
      }
    }

    function openAiZoom() {
      openZoomModal('diagrams/ai_scheduling_architecture.png', 'KIẾN TRÚC & LUỒNG XỬ LÝ HỆ THỐNG AI XẾP LỊCH TRỰC THÔNG MINH');
    }

    // Initialize Default Tabs
    switchUcTab('customer');
    switchErdTab('booking');
  </script>
</body>
</html>
"""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Generated Interactive Presentation HTML at {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_presentation_html()
