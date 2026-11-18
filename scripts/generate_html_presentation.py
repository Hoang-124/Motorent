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
      padding: 1.8rem 3.5rem;
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

  <!-- MODAL ZOOM CHỨA ẢNH CHI TIẾT -->
  <div id="zoom-modal" onclick="closeZoomModal()">
    <div class="relative max-w-[92vw] max-h-[92vh] bg-[#161616] p-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center w-full px-3 py-1 mb-2 border-b border-white/10">
        <span id="zoom-title" class="text-sm font-bold text-[#FFC799]">Xem Chi Tiết Sơ Đồ</span>
        <button onclick="closeZoomModal()" class="text-white/60 hover:text-white px-2 py-0.5 rounded text-sm bg-white/10">Đóng (ESC)</button>
      </div>
      <img id="zoom-img" src="" alt="Zoomed Diagram" class="max-h-[82vh] max-w-[88vw] object-contain rounded-lg">
    </div>
  </div>

  <div id="presentation-container">

    <!-- SLIDE 1: COVER -->
    <section class="slide active justify-center items-center text-center">
      <div class="max-w-4xl space-y-6">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full tag-peach text-xs font-bold tracking-wider uppercase">
          FPT University • Đồ Án SWP391 • Fall 2026
        </div>
        <h1 class="text-6xl font-black tracking-tight text-white">
          MOTO<span class="text-[#FFC799]">RENT</span>
        </h1>
        <p class="text-2xl font-bold text-[#99FFE4]">
          Hệ Thống Cho Thuê Xe Máy Công Nghệ & Tự Động Hóa Vận Hành Đa Trạm
        </p>
        <p class="text-sm text-[#A0A0A0] max-w-2xl mx-auto leading-relaxed">
          Smart Multi-Branch Motorbike Rental Platform: eKYC số hóa không giữ giấy tờ gốc, ký số tại quầy, cọc trực tuyến 30%, điều phối đa trạm và Dual-AI Engine xếp ca trực công bằng.
        </p>
        <div class="pt-4 flex justify-center items-center gap-6 text-xs text-[#A0A0A0]">
          <span>Nhóm thực hiện: <strong>Group 4 (5 thành viên)</strong></span>
          <span>•</span>
          <span>Kiến trúc: <strong>Modular Monolith</strong></span>
          <span>•</span>
          <span>Động cơ AI: <strong>Rule-v2 + Gemini LLM</strong></span>
        </div>
      </div>
    </section>

    <!-- SLIDE 2: MỤC 1 - THÀNH VIÊN NHÓM (GROUP 4) -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 1 • Nhóm Thực Hiện</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Danh Sách Thành Viên Nhóm 4 & Phân Công Trách Nhiệm</h2>
      </div>
      <div class="grid grid-cols-5 gap-3 flex-1">
        <div class="card-dark p-3.5 flex flex-col justify-between border-[#FFC799]/40 bg-[#1a1714]">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono font-bold text-[#FFC799]">LEAD • 35%</span>
            </div>
            <h3 class="text-sm font-bold text-white">Trần Quang Bửu Hoàng</h3>
            <p class="text-xs text-[#FFC799] font-medium mt-0.5">Leader / Full-Stack</p>
            <div class="mt-2.5 space-y-1 text-[11px] text-[#A0A0A0]">
              <p>• Modular Monolith, RBAC & Audit Log.</p>
              <p>• Đặt xe, Giỏ xe, VNPay/VietQR, Hợp đồng ký số.</p>
              <p>• AI Phân ca (Gemini + Rule-v2), Giao xe tận nơi.</p>
              <p>• Tài liệu kỹ thuật RDS, SDS, Final Release.</p>
            </div>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Core System & AI</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono font-bold text-[#99FFE4]">BA • 20%</span>
            </div>
            <h3 class="text-sm font-bold text-white">Phạm Quốc Cả</h3>
            <p class="text-xs text-[#99FFE4] font-medium mt-0.5">BA / Backend</p>
            <div class="mt-2.5 space-y-1 text-[11px] text-[#A0A0A0]">
              <p>• Khảo sát phân tích nghiệp vụ, Đặc tả SRS.</p>
              <p>• Quản lý chi nhánh, tìm trạm gần nhất theo GPS.</p>
              <p>• Quản lý hồ sơ nhân sự trạm.</p>
              <p>• Danh mục khuyến mãi & mã giảm giá.</p>
            </div>
          </div>
          <span class="text-[10px] text-white/40 font-mono">SRS & Branch Module</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono font-bold text-[#70B4FF]">DEV • 18%</span>
            </div>
            <h3 class="text-sm font-bold text-white">Nguyễn Thái Dương</h3>
            <p class="text-xs text-[#70B4FF] font-medium mt-0.5">Full-Stack Developer</p>
            <div class="mt-2.5 space-y-1 text-[11px] text-[#A0A0A0]">
              <p>• Gia hạn thuê xe (thông báo đa kênh).</p>
              <p>• Hủy đơn theo điều khoản KHÔNG HOÀN TIỀN.</p>
              <p>• Nghiệp vụ quầy Check-in/Check-out (4 góc ảnh, ODO).</p>
              <p>• Ký biên bản bàn giao & Xuất hóa đơn PDF.</p>
            </div>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Counter Desk Operations</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono font-bold text-purple-400">DEV • 15%</span>
            </div>
            <h3 class="text-sm font-bold text-white">Nguyễn Hữu Tài</h3>
            <p class="text-xs text-purple-400 font-medium mt-0.5">Full-Stack Developer</p>
            <div class="mt-2.5 space-y-1 text-[11px] text-[#A0A0A0]">
              <p>• Danh mục đội xe, bộ lọc tìm kiếm & giá mùa vụ.</p>
              <p>• Cảnh báo bảo dưỡng ODO & chi phí sửa chữa.</p>
              <p>• Lệnh điều chuyển xe giữa các chi nhánh.</p>
              <p>• Theo dõi vòng đời xe thời gian thực.</p>
            </div>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Fleet & Maintenance</span>
        </div>

        <div class="card-dark p-3.5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono font-bold text-rose-400">DEV • 12%</span>
            </div>
            <h3 class="text-sm font-bold text-white">Phạm Tuyên</h3>
            <p class="text-xs text-rose-400 font-medium mt-0.5">Frontend Developer</p>
            <div class="mt-2.5 space-y-1 text-[11px] text-[#A0A0A0]">
              <p>• Xe yêu thích & Đánh giá/Phản hồi dịch vụ.</p>
              <p>• Gửi khiếu nại (Complaint) & tra cứu tiến độ.</p>
              <p>• Thông báo nhắc lịch, tích điểm đổi thưởng.</p>
              <p>• Quản lý banner slider & trang chính sách.</p>
            </div>
          </div>
          <span class="text-[10px] text-white/40 font-mono">Support & CMS</span>
        </div>
      </div>
    </section>

    <!-- SLIDE 3: MỤC 2 - PRODUCT BACKGROUND -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 2 • Bối Cảnh Sản Phẩm</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Product Background: Thực Trạng, Nỗi Đau & Giải Pháp Đột Phá</h2>
      </div>
      <div class="grid grid-cols-3 gap-4 flex-1">
        <div class="card-dark p-4 border-rose-500/30">
          <span class="text-xs font-bold uppercase text-rose-400 tracking-wider block mb-2">NỖI ĐAU KHÁCH HÀNG</span>
          <ul class="space-y-3 text-xs text-[#A0A0A0]">
            <li><strong class="text-white block">1. Giữ giấy tờ gốc:</strong> Bị giữ CCCD/Hộ chiếu gốc gây rủi ro thất lạc, bất tiện khi nhận phòng khách sạn hoặc bay.</li>
            <li><strong class="text-white block">2. Giá thiếu minh bạch:</strong> Bị ép giá mùa cao điểm; xe cũ kỹ, không được kiểm định chất lượng an toàn.</li>
            <li><strong class="text-white block">3. Bất tiện nhận/trả:</strong> Khó nhận/trả linh hoạt tại sân bay, bến xe hoặc giao tận khách sạn.</li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#FFC799]/30">
          <span class="text-xs font-bold uppercase text-[#FFC799] tracking-wider block mb-2">NỖI ĐAU CHỦ CƠ SỞ</span>
          <ul class="space-y-3 text-xs text-[#A0A0A0]">
            <li><strong class="text-white block">1. Quản lý sổ sách thủ công:</strong> Dễ thất thoát xe, tranh chấp khi va chạm không có ảnh hiện trạng.</li>
            <li><strong class="text-white block">2. Mất kiểm soát ODO:</strong> Không theo dõi chu kỳ km xe chạy để thay nhớt, bảo dưỡng định kỳ.</li>
            <li><strong class="text-white block">3. Điều phối nhân sự khó khăn:</strong> Biến động giờ cao điểm sáng/chiều, nhân viên phải đi giao xe tận nơi.</li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#99FFE4]/30 bg-[#131a19]">
          <span class="text-xs font-bold uppercase text-[#99FFE4] tracking-wider block mb-2">GIẢI PHÁP MOTORENT</span>
          <ul class="space-y-3 text-xs text-[#A0A0A0]">
            <li><strong class="text-white block">1. eKYC không giữ gốc:</strong> Quét CCCD/GPLX online, mã hóa AES-256-GCM bảo mật tuyệt đối.</li>
            <li><strong class="text-white block">2. Ký số tablet & Đa trạm:</strong> Hợp đồng song phương kèm 4 góc ảnh xe, cọc 30%, nhận/trả khác trạm.</li>
            <li><strong class="text-white block">3. AI Xếp ca tự động:</strong> Dual-AI Engine cân bằng công thái học, tiết kiệm 90% thời gian phân ca.</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- SLIDE 4: MỤC 3 - EXISTING SYSTEM -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 3 • Hiện Trạng Hệ Thống</span>
        <h2 class="text-2xl font-black text-white mt-0.5">So Sánh Năng Lực 8 Tiêu Chí Với Các Giải Pháp Hiện Hành</h2>
      </div>
      <div class="card-dark overflow-hidden flex-1">
        <table class="w-full text-left text-xs">
          <thead class="bg-white/5 border-b border-white/10 text-white font-bold">
            <tr>
              <th class="p-2.5">Tiêu Chí Nghiệp Vụ</th>
              <th class="p-2.5 text-white/60">Thuê Xe Truyền Thống</th>
              <th class="p-2.5 text-white/60">Nền Tảng Ô Tô (Mioto...)</th>
              <th class="p-2.5 text-[#FFC799] bg-[#FFC799]/10">Hệ Thống MOTORENT</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-[#A0A0A0]">
            <tr>
              <td class="p-2 font-semibold text-white">Xác thực danh tính</td>
              <td class="p-2">Giữ CCCD / Hộ chiếu gốc trực tiếp</td>
              <td class="p-2">Tải ảnh giấy tờ (ô tô)</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">eKYC mã hóa AES-256-GCM, không giữ gốc</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Hợp đồng thuê</td>
              <td class="p-2">Giấy viết tay 1 liên</td>
              <td class="p-2">Xác nhận đơn điện tử 1 chiều</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Ký số song phương tại quầy trên tablet</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Thanh toán & Cọc</td>
              <td class="p-2">Tiền mặt / Chuyển khoản lẻ</td>
              <td class="p-2">Thẻ tín dụng / Ví</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Cọc 30% VNPay/VietQR, tất toán 70% tại quầy</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Trả xe sớm</td>
              <td class="p-2">Tự thương lượng, dễ tranh cãi</td>
              <td class="p-2">Tùy chính sách chủ xe</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Quy chuẩn minh bạch: KHÔNG HOÀN TIỀN</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Giao xe tận nơi</td>
              <td class="p-2">Thỏa thuận ngoài qua điện thoại</td>
              <td class="p-2">Chủ xe tự thương lượng</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">Tự động tính phí 40.000 đ/chiều chuẩn hóa</td>
            </tr>
            <tr>
              <td class="p-2 font-semibold text-white">Quản lý đa trạm</td>
              <td class="p-2">1 cửa hàng đơn lẻ</td>
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
              <td class="p-2">Sổ sách / Excel thủ công</td>
              <td class="p-2">Không có</td>
              <td class="p-2 font-bold text-[#99FFE4] bg-[#FFC799]/5">AI Xếp ca tự động (Heuristic + Gemini LLM)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SLIDE 5: MỤC 4 - USE CASE DIAGRAM (CUSTOMER & GUEST) -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 4 • Sơ Đồ Use Case</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Sơ Đồ UML Use Case Khách Hàng (Customer & Guest)</h2>
        </div>
        <button onclick="openZoomModal('diagrams/usecase_customer.png', 'UML USE CASE KHÁCH HÀNG')" class="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-xs font-semibold">
          Phóng to sơ đồ UML
        </button>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <div class="col-span-4 card-dark p-3.5 space-y-2.5 overflow-y-auto">
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">Use Cases Khách Hàng (UC01-25)</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Khám phá & Đặt xe</h4>
            <p class="text-[10px] text-[#A0A0A0]">Xem danh mục xe, lọc trạm/giá, giao xe tận nơi (+40k), thanh toán cọc 30% VNPay/VietQR, hủy đơn.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">eKYC & Ký hợp đồng</h4>
            <p class="text-[10px] text-[#A0A0A0]">Tải ảnh GPLX/CCCD (mã hóa AES-256), ký hợp đồng điện tử tại quầy trên tablet, xác nhận 4 góc xe và ODO.</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Hậu mãi & Hỗ trợ</h4>
            <p class="text-[10px] text-[#A0A0A0]">Gia hạn thuê xe, gửi khiếu nại (kèm ảnh), đánh giá sao/review, Live Chat Socket.IO thời gian thực.</p>
          </div>
        </div>

        <div class="col-span-8 card-dark p-2 bg-white flex flex-col justify-center items-center rounded-xl overflow-hidden shadow-2xl">
          <img src="diagrams/usecase_customer.png" alt="Customer Use Case Diagram" class="max-h-[72vh] w-auto object-contain rounded">
        </div>
      </div>
    </section>

    <!-- SLIDE 6: MỤC 4 - USE CASE DIAGRAM (STAFF & MANAGER) -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 4 • Sơ Đồ Use Case</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Sơ Đồ UML Use Case Nội Bộ: Nhân Viên & Quản Lý</h2>
        </div>
        <div class="flex gap-2">
          <button onclick="openZoomModal('diagrams/usecase_staff.png', 'UML USE CASE NHÂN VIÊN')" class="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs">Phóng to Staff</button>
          <button onclick="openZoomModal('diagrams/usecase_manager.png', 'UML USE CASE QUẢN LÝ')" class="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs">Phóng to Manager</button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <div class="col-span-4 card-dark p-3.5 space-y-2.5 overflow-y-auto">
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">3 Vai Trò Nội Bộ (UC26-50)</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Nhân viên quầy (Staff)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Điểm danh ca, đăng ký lịch rảnh tiếng Việt NLP chat, bàn giao xe 4 góc kèm ODO, thu 70% tất toán, cứu hộ dọc đường.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Quản lý trạm (BranchManager)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Điều phối đội xe, tạo lệnh điều chuyển trạm (VehicleTransfer), duyệt bảo dưỡng ODO, kích hoạt AI xếp ca tuần.</p>
          </div>
          <div class="border-l-2 border-rose-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">Quản trị viên (SystemAdmin)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Quản lý trạm & bản đồ GPS, ma trận RBAC 4 vai trò, giám sát AuditLog bảo mật, quản lý CMS & KPI toàn chuỗi.</p>
          </div>
        </div>

        <div class="col-span-8 grid grid-rows-2 gap-2">
          <div class="card-dark p-1.5 bg-white flex justify-center items-center rounded-xl overflow-hidden">
            <img src="diagrams/usecase_staff.png" alt="Staff UC" class="max-h-[34vh] w-auto object-contain">
          </div>
          <div class="card-dark p-1.5 bg-white flex justify-center items-center rounded-xl overflow-hidden">
            <img src="diagrams/usecase_manager.png" alt="Manager UC" class="max-h-[34vh] w-auto object-contain">
          </div>
        </div>
      </div>
    </section>

    <!-- SLIDE 7: MỤC 5 - DATABASE ARCHITECTURE -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 5 • Cơ Sở Dữ Liệu</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Kiến Trúc CSDL MongoDB 24 Models & Sơ Đồ ERD Thực Thể</h2>
        </div>
        <button onclick="openZoomModal('diagrams/database_booking_erd.jpeg', 'SƠ ĐỒ ERD BOOKING')" class="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-xs font-semibold">
          Phóng to sơ đồ ERD
        </button>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <div class="col-span-4 card-dark p-3.5 space-y-2.5 overflow-y-auto">
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">5 Cụm Dữ Liệu (24 Models)</span>
          <div class="border-l-2 border-[#99FFE4] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">1. Định danh & Nhân sự (3)</h4>
            <p class="text-[10px] text-[#A0A0A0]">User (bcrypt, tokenVersion, eKYC AES-256), StaffSchedule, StaffAvailability.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">2. Đội xe & Chi nhánh (6)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Branch (GPS), Vehicle, Category, SeasonalPricingRule, VehicleTransfer, MaintenanceLog.</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">3. Thuê xe & Giao dịch (4)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Booking (chữ ký số, cọc 30%, tất toán 70%), Payment (VNPay/VietQR), Discount, BookingReminder.</p>
          </div>
          <div class="border-l-2 border-purple-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">4. Hỗ trợ & Tương tác (6)</h4>
            <p class="text-[10px] text-[#A0A0A0]">Complaint (Open->Closed), Feedback, Review, Wishlist, Conversation, Message (Socket.IO).</p>
          </div>
          <div class="border-l-2 border-rose-400 pl-2.5 py-0.5">
            <h4 class="font-bold text-white text-[11px]">5. Hệ thống & Nội dung (5)</h4>
            <p class="text-[10px] text-[#A0A0A0]">AuditLog (che [REDACTED]), Notification, Banner, StaticPage, SystemConfig.</p>
          </div>
        </div>

        <div class="col-span-8 card-dark p-2 bg-white flex flex-col justify-center items-center rounded-xl overflow-hidden shadow-2xl">
          <img src="diagrams/database_booking_erd.jpeg" alt="Database ERD Schema" class="max-h-[72vh] w-auto object-contain rounded">
        </div>
      </div>
    </section>

    <!-- SLIDE 8: MỤC 6 - PACKAGE DIAGRAM [TRỌNG TÂM 1] -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 6 • Sơ Đồ Package [Trọng Tâm 1]</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Kiến Trúc Modular Monolith: 3 Điểm Nhấn Cốt Lõi Với Hội Đồng</h2>
        </div>
        <button onclick="openZoomModal('diagrams/package_diagram.png', 'SƠ ĐỒ PACKAGE UML CHUẨN')" class="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-xs font-semibold">
          Phóng to sơ đồ Package
        </button>
      </div>

      <div class="grid grid-cols-12 gap-4 flex-1 text-xs">
        <div class="col-span-5 card-dark p-4 space-y-3 overflow-y-auto border-[#FFC799]/40">
          <span class="text-xs font-bold text-[#FFC799] uppercase tracking-wider block">3 Điểm Nhấn Kiến Trúc Nêu Bật</span>
          <div class="border-l-2 border-[#99FFE4] pl-3 py-1">
            <h4 class="font-bold text-white text-xs">1. Tính độc lập cao (22 Modules)</h4>
            <p class="text-[11px] text-[#A0A0A0] mt-1">Đóng gói khép kín Controller -> Service -> Routes. Không vòng lặp phụ thuộc (Zero Circular Dependency), dễ dàng tách thành Microservices khi mở rộng.</p>
          </div>
          <div class="border-l-2 border-[#FFC799] pl-3 py-1">
            <h4 class="font-bold text-white text-xs">2. Tầng bảo vệ tập trung (core/)</h4>
            <p class="text-[11px] text-[#A0A0A0] mt-1">Phễu bảo vệ bắt buộc: Giải mã JWT -> Kiểm tra thu hồi phiên tức thì (tokenVersion) -> Phân quyền RBAC 4 vai trò -> Ghi vết kiểm toán che secret AuditLog [REDACTED].</p>
          </div>
          <div class="border-l-2 border-blue-400 pl-3 py-1">
            <h4 class="font-bold text-white text-xs">3. An toàn đồng thời (Concurrency)</h4>
            <p class="text-[11px] text-[#A0A0A0] mt-1">resourceLock.ts (FIFO Promise queue + TTL lock) kết hợp withOptionalTransaction đảm bảo 2 khách không thể cùng đặt 1 chiếc xe cùng khung giờ.</p>
          </div>
        </div>

        <div class="col-span-7 card-dark p-2 bg-white flex flex-col justify-center items-center rounded-xl overflow-hidden shadow-2xl">
          <img src="diagrams/package_diagram.png" alt="Package Diagram" class="max-h-[72vh] w-auto object-contain rounded">
        </div>
      </div>
    </section>

    <!-- SLIDE 9: MỤC 7 - CÁCH APPLY AI [TRỌNG TÂM 2] -->
    <section class="slide justify-start">
      <div class="mb-2 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 7 • Ứng Dụng AI Vào Hệ Thống [Trọng Tâm 2]</span>
          <h2 class="text-2xl font-black text-white mt-0.5">Kiến Trúc Toàn Cảnh Dual-AI Engine & Quy Trình 5 Bước</h2>
        </div>
        <button onclick="openZoomModal('diagrams/ai_scheduling_architecture.png', 'KIẾN TRÚC TOÀN CẢNH DUAL-AI ENGINE')" class="bg-[#FFC799] hover:bg-[#ffb67a] text-black px-3 py-1 rounded text-xs font-bold shadow">
          Phóng to sơ đồ luồng AI
        </button>
      </div>

      <div class="card-dark p-2 flex-1 flex flex-col justify-center items-center overflow-hidden border-[#FFC799]/40">
        <img src="diagrams/ai_scheduling_architecture.png" alt="AI Scheduling Architecture" class="max-h-[75vh] w-auto object-contain rounded-lg">
      </div>
    </section>

    <!-- SLIDE 10: MỤC 7 - CHI TIẾT 4 THÀNH PHẦN KỸ THUẬT AI -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Mục 7 • 4 Điểm Cốt Lõi Của AI [Trọng Tâm 2]</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Hệ Thống AI Giải Quyết Bài Toán Phân Ca Như Thế Nào?</h2>
      </div>
      <div class="grid grid-cols-4 gap-3.5 flex-1 text-xs">
        <div class="card-dark p-4 border-blue-400/40 flex flex-col justify-between">
          <div>
            <span class="text-xs font-bold uppercase text-blue-400 block mb-2">1. ĐỌC HIỂU TIẾNG VIỆT</span>
            <div class="bg-white/5 p-2 rounded font-mono text-[11px] text-[#FFC799] mb-3">
              "t2 làm ca 1 2, t4 bận"
            </div>
            <ul class="space-y-2 text-[#A0A0A0] text-xs">
              <li>• Chat tự do tự nhiên như Zalo.</li>
              <li>• Tự nhận diện thứ, ca trực.</li>
              <li>• Tự động điền lịch, không nhập tay.</li>
            </ul>
          </div>
          <span class="text-[10px] text-blue-400 font-mono">NLP Tokenizer</span>
        </div>

        <div class="card-dark p-4 border-[#FFC799]/40 flex flex-col justify-between">
          <div>
            <span class="text-xs font-bold uppercase text-[#FFC799] block mb-2">2. XẾP CA KHOA HỌC</span>
            <ul class="space-y-2 text-[#A0A0A0] text-xs mt-3">
              <li>• Đếm lượng khách để xếp 1–3 người/ca.</li>
              <li>• Ưu tiên ca liền (làm 1 mạch về nghỉ).</li>
              <li>• <strong class="text-rose-400">CẤM ca kiệt sức:</strong> Tối 22h &rarr; Sáng 7h.</li>
              <li>• Chia đều giờ làm, đảm bảo công bằng.</li>
            </ul>
          </div>
          <span class="text-[10px] text-[#FFC799] font-mono">Heuristic Rule-v2</span>
        </div>

        <div class="card-dark p-4 border-[#99FFE4]/40 flex flex-col justify-between">
          <div>
            <span class="text-xs font-bold uppercase text-[#99FFE4] block mb-2">3. GEMINI AI TỐI ƯU</span>
            <ul class="space-y-2 text-[#A0A0A0] text-xs mt-3">
              <li>• Đóng vai trò như "Quản Lý Ảo".</li>
              <li>• Tính toán phương án xếp ca tối ưu nhất.</li>
              <li>• Giải thích lý do bằng tiếng Việt.</li>
              <li>• Tự động dự phòng khi mạng chậm.</li>
            </ul>
          </div>
          <span class="text-[10px] text-[#99FFE4] font-mono">Generative LLM</span>
        </div>

        <div class="card-dark p-4 border-rose-500/40 flex flex-col justify-between">
          <div>
            <span class="text-xs font-bold uppercase text-rose-400 block mb-2">4. BẢO TOÀN CHẤM CÔNG</span>
            <ul class="space-y-2 text-[#A0A0A0] text-xs mt-3">
              <li>• Chạy lại AI giữa tuần không mất dữ liệu.</li>
              <li>• <strong class="text-white">Giữ nguyên 100%</strong> ca quá khứ.</li>
              <li>• Giữ nguyên ca nhân viên đã điểm danh.</li>
              <li>• Chỉ xếp bù vào ca tương lai còn trống.</li>
            </ul>
          </div>
          <span class="text-[10px] text-rose-400 font-mono">Immutability</span>
        </div>
      </div>
    </section>

    <!-- SLIDE 11: ĐẢM BẢO CHẤT LƯỢNG -->
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
              100% bộ kiểm thử tự động Vitest gồm Unit, Integration, Concurrency Locks & AI Verification đạt kết quả Pass.
            </p>
          </div>
          <span class="text-[11px] text-[#FFC799] font-mono">30 Passed (100%)</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between border-[#99FFE4]/40 bg-[#141b1a]">
          <div>
            <span class="text-4xl font-black text-[#99FFE4]">1,807</span>
            <h3 class="text-sm font-bold text-white mt-2">Client Modules</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Vite build sản phẩm sạch bóng, 0 lỗi TypeScript, 0 lỗi linter, cấu trúc responsive mượt mà trên Mobile, Tablet và Desktop.
            </p>
          </div>
          <span class="text-[11px] text-[#99FFE4] font-mono">0 TS Errors</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between border-blue-400/40">
          <div>
            <span class="text-4xl font-black text-blue-400">100%</span>
            <h3 class="text-sm font-bold text-white mt-2">Bảo Mật Dữ Liệu</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Mã hóa AES-256-GCM bảo vệ eKYC, phân quyền RBAC 4 vai trò, AuditLog tự động che mờ toàn bộ bí mật [REDACTED].
            </p>
          </div>
          <span class="text-[11px] text-blue-400 font-mono">AES-256-GCM</span>
        </div>

        <div class="card-dark p-4 flex flex-col justify-between border-purple-400/40">
          <div>
            <span class="text-4xl font-black text-purple-400">0.00s</span>
            <h3 class="text-sm font-bold text-white mt-2">Xung Đột Đặt Trùng</h3>
            <p class="text-xs text-[#A0A0A0] mt-2 leading-relaxed">
              Hàng đợi Promise FIFO kết hợp MongoDB Atomic CAS loại bỏ hoàn toàn race condition đặt trùng xe trong điều kiện tải cao.
            </p>
          </div>
          <span class="text-[11px] text-purple-400 font-mono">FIFO Queue Lock</span>
        </div>
      </div>
    </section>

    <!-- SLIDE 12: TỔNG KẾT & Q&A -->
    <section class="slide justify-start">
      <div class="mb-3">
        <span class="text-xs font-bold uppercase tracking-widest text-[#FFC799]">Tổng Kết • Hướng Phát Triển</span>
        <h2 class="text-2xl font-black text-white mt-0.5">Kết Luận Đề Tài & Định Hướng Mở Rộng Tương Lai</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 flex-1 text-xs">
        <div class="card-dark p-4 border-[#99FFE4]/30">
          <span class="text-xs font-bold uppercase text-[#99FFE4] tracking-wider block mb-2">4 THÀNH TỰU ĐẠT ĐƯỢC</span>
          <ul class="space-y-2.5 text-[#A0A0A0]">
            <li><strong class="text-white">1. Hoàn thành 100% mục tiêu RDS/SDS:</strong> 22 modules nghiệp vụ hoạt động trơn tru.</li>
            <li><strong class="text-white">2. Đột phá AI ứng dụng thực chiến:</strong> Dual-AI Engine giải quyết triệt để clopening và ca gãy, bảo toàn chấm công.</li>
            <li><strong class="text-white">3. Pháp lý số hóa minh bạch:</strong> Cọc 30% VNPay/VietQR, ký số hợp đồng kèm ảnh 4 góc xe, không giữ giấy tờ gốc.</li>
            <li><strong class="text-white">4. Kiến trúc phần mềm chuẩn mực:</strong> Modular Monolith phân tầng sạch sẽ, an toàn đồng thời, 30/30 test suites pass.</li>
          </ul>
        </div>

        <div class="card-dark p-4 border-[#FFC799]/30">
          <span class="text-xs font-bold uppercase text-[#FFC799] tracking-wider block mb-2">HƯỚNG PHÁT TRIỂN & Q&A</span>
          <ul class="space-y-2.5 text-[#A0A0A0]">
            <li><strong class="text-white">1. IoT Hộp Đen GPS Trên Xe:</strong> Định vị thời gian thực, cảnh báo va chạm và cứu hộ khẩn cấp.</li>
            <li><strong class="text-white">2. Phát triển Mobile App Native:</strong> Ứng dụng di động quét mã QR nhận/trả xe tự động.</li>
            <li><strong class="text-white">3. Mở rộng chuỗi toàn quốc:</strong> Sẵn sàng tách thành Microservices khi đạt 100+ trạm.</li>
            <li><strong class="text-[#FFC799] text-sm block mt-3">Kính mời Ban Giám Khảo đặt câu hỏi cho Nhóm 4!</strong></li>
          </ul>
        </div>
      </div>
    </section>

  </div>

  <!-- NAVIGATION -->
  <footer class="fixed bottom-0 left-0 right-0 h-12 bg-[#111111] border-t border-white/10 px-6 flex justify-between items-center text-xs z-50">
    <div class="flex items-center gap-3">
      <span class="font-bold text-white tracking-wide">MOTORENT</span>
      <span class="text-white/40">|</span>
      <span class="text-white/60">Báo Cáo Đồ Án SWP391 — Group 4</span>
    </div>

    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="px-3 py-1 rounded bg-white/5 hover:bg-white/15 text-white transition font-semibold">&larr; Trước</button>
      <div id="slide-indicator" class="font-mono text-white/60 px-3 font-semibold">1 / 12</div>
      <button onclick="nextSlide()" class="px-3 py-1 rounded bg-[#FFC799] hover:bg-[#ffb67a] text-black transition font-bold">Tiếp &rarr;</button>
    </div>

    <div class="text-white/40 font-mono text-[11px]">
      Phím mũi tên &larr; &rarr; hoặc Space
    </div>
  </footer>

  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const indicator = document.getElementById('slide-indicator');

    function updateSlide() {
      slides.forEach((s, idx) => {
        if (idx === currentSlide) s.classList.add('active');
        else s.classList.remove('active');
      });
      indicator.textContent = (currentSlide + 1) + ' / ' + slides.length;
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) { currentSlide++; updateSlide(); }
    }
    function prevSlide() {
      if (currentSlide > 0) { currentSlide--; updateSlide(); }
    }

    document.addEventListener('keydown', (e) => {
      if (document.getElementById('zoom-modal').classList.contains('active')) {
        if (e.key === 'Escape') closeZoomModal();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
      else if (e.key === 'ArrowLeft') prevSlide();
    });

    function openZoomModal(imgSrc, title) {
      document.getElementById('zoom-img').src = imgSrc;
      document.getElementById('zoom-title').textContent = title;
      document.getElementById('zoom-modal').classList.add('active');
    }
    function closeZoomModal() {
      document.getElementById('zoom-modal').classList.remove('active');
    }
  </script>
</body>
</html>
"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Generated Condensed Presentation HTML at {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_presentation_html()
