import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import type { Branch } from '../types';

interface BranchInteractiveMapProps {
  branches: Branch[];
  selectedBranchId?: string;
  onSelectBranch?: (branch: Branch) => void;
  userCoords?: { lat: number; lng: number } | null;
  onFindNearest?: () => void;
  isLocating?: boolean;
}

export const BranchInteractiveMap: React.FC<BranchInteractiveMapProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
  userCoords,
  onFindNearest,
  isLocating = false,
}) => {
  const [activeBranchId, setActiveBranchId] = useState<string>(
    selectedBranchId || (branches[0]?._id ?? '')
  );
  const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    if (selectedBranchId) {
      setActiveBranchId(selectedBranchId);
    }
  }, [selectedBranchId]);

  // Da Nang coordinate boundaries for normalization to SVG canvas (900 x 560)
  // Lat: ~15.98 to 16.15 (South to North)
  // Lng: ~108.12 to 108.30 (West to East)
  const minLat = 15.99;
  const maxLat = 16.14;
  const minLng = 108.14;
  const maxLng = 108.28;

  const latToY = (lat: number): number => {
    // Latitude decreases as Y increases
    const clamped = Math.max(minLat, Math.min(maxLat, lat));
    return 520 - ((clamped - minLat) / (maxLat - minLat)) * 460;
  };

  const lngToX = (lng: number): number => {
    // Longitude increases as X increases
    const clamped = Math.max(minLng, Math.min(maxLng, lng));
    return 60 + ((clamped - minLng) / (maxLng - minLng)) * 780;
  };

  const activeBranch = branches.find((b) => b._id === activeBranchId) || branches[0];

  const handleMarkerClick = (branch: Branch) => {
    setActiveBranchId(branch._id);
    if (onSelectBranch) {
      onSelectBranch(branch);
    }
  };

  return (
    <div className="relative bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Map HUD Bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 py-3 bg-gradient-to-b from-[#101010]/95 via-[#101010]/80 to-transparent flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-white/10 flex items-center space-x-1.5 text-xs text-[#FFC799]">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider uppercase text-[10px]">
              Bản đồ định vị GPS • Đà Nẵng
            </span>
          </div>
          <span className="text-xs text-[#A0A0A0] hidden sm:inline">
            ({branches.length} trạm phủ sóng toàn thành phố)
          </span>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          {onFindNearest && (
            <button
              type="button"
              onClick={onFindNearest}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-lg bg-[#FFC799] text-[#101010] text-xs font-semibold hover:bg-[#ffe2cc] transition-colors flex items-center space-x-1.5 shadow-md active:scale-95 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Đang định vị...' : 'Tìm trạm gần tôi nhất'}</span>
            </button>
          )}

          <div className="flex items-center bg-[#1A1A1A] border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
              className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] rounded transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
              className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] rounded transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] rounded transition-colors"
              title="Đặt lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Vector Canvas */}
      <div className="relative w-full overflow-hidden bg-[#0D0E12] pt-12 pb-4">
        <svg
          viewBox="0 0 900 560"
          className="w-full h-[380px] sm:h-[460px] md:h-[520px] select-none transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>

            {/* Sea Gradient */}
            <radialGradient id="oceanGlow" cx="70%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#0B192C" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0D0E12" stopOpacity="0" />
            </radialGradient>

            {/* Marker Glow */}
            <filter id="markerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="900" height="560" fill="url(#mapGrid)" />
          <rect width="900" height="560" fill="url(#oceanGlow)" />

          {/* Stylized Coastal Line & Geographic Landmasses of Da Nang */}
          {/* Da Nang Bay & Coastline */}
          <path
            d="M 60 50 Q 220 80 340 180 Q 420 220 450 140 Q 520 80 620 90 Q 720 120 740 220 Q 750 320 790 540 L 900 560 L 900 0 L 60 0 Z"
            fill="rgba(22, 38, 59, 0.25)"
            stroke="rgba(153, 255, 228, 0.12)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Son Tra Peninsula shape */}
          <path
            d="M 600 90 Q 690 60 760 110 Q 820 160 770 230 Q 730 250 670 200 Q 610 160 600 90 Z"
            fill="rgba(34, 197, 94, 0.08)"
            stroke="rgba(34, 197, 94, 0.25)"
            strokeWidth="1.2"
          />
          <text x="680" y="145" fill="rgba(153, 255, 228, 0.4)" fontSize="11" fontWeight="600" letterSpacing="1">
            BÁN ĐẢO SƠN TRÀ
          </text>

          {/* Han River (Sông Hàn) */}
          <path
            d="M 460 140 Q 470 240 465 310 Q 455 380 470 480 Q 480 540 485 560"
            fill="none"
            stroke="#1D3E5D"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 460 140 Q 470 240 465 310 Q 455 380 470 480 Q 480 540 485 560"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeOpacity="0.4"
          />
          <text x="475" y="270" fill="rgba(56, 189, 248, 0.5)" fontSize="9" fontWeight="600" letterSpacing="0.8" transform="rotate(78 475 270)">
            SÔNG HÀN
          </text>

          {/* Dragon Bridge & Han River Bridges */}
          <line x1="440" y1="315" x2="490" y2="310" stroke="#FFC799" strokeWidth="3" strokeOpacity="0.6" />
          <text x="500" y="314" fill="#FFC799" fontSize="9" fontWeight="bold">
            Cầu Rồng
          </text>

          <line x1="445" y1="230" x2="485" y2="230" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <text x="495" y="233" fill="rgba(255,255,255,0.4)" fontSize="8">
            Cầu Sông Hàn
          </text>

          {/* East Sea Annotation */}
          <text x="760" y="380" fill="rgba(153, 255, 228, 0.25)" fontSize="14" fontWeight="bold" letterSpacing="3">
            BIỂN ĐÔNG • MỸ KHÊ
          </text>

          {/* Da Nang International Airport Area */}
          <rect x="300" y="300" width="100" height="90" rx="8" fill="rgba(255, 199, 153, 0.05)" stroke="rgba(255, 199, 153, 0.15)" strokeDasharray="3 3" />
          <text x="312" y="335" fill="rgba(255, 199, 153, 0.5)" fontSize="9" fontWeight="bold">
            SÂN BAY ĐÀ NẴNG
          </text>

          {/* Connecting Transit Route between Stations */}
          {branches.length >= 2 && (
            <path
              d={`M ${lngToX(branches[0].location_lng || 108.199)} ${latToY(branches[0].location_lat || 16.054)} Q 460 320 ${lngToX(branches[1].location_lng || 108.245)} ${latToY(branches[1].location_lat || 16.059)}`}
              fill="none"
              stroke="#FFC799"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeOpacity="0.75"
            />
          )}

          {/* User Location Pulse if available */}
          {userCoords && (
            <g transform={`translate(${lngToX(userCoords.lng)}, ${latToY(userCoords.lat)})`}>
              <circle r="18" fill="rgba(59, 130, 246, 0.2)" className="animate-ping" />
              <circle r="8" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
              <text y="-14" textAnchor="middle" fill="#60A5FA" fontSize="10" fontWeight="bold">
                Vị trí của bạn
              </text>
            </g>
          )}

          {/* Branch Station Markers */}
          {branches.map((branch, index) => {
            const posX = lngToX(branch.location_lng || (index === 0 ? 108.199 : 108.245));
            const posY = latToY(branch.location_lat || (index === 0 ? 16.054 : 16.059));
            const isSelected = branch._id === activeBranchId;
            const isHovered = branch._id === hoveredBranchId;
            const isInactive = !branch.isActive;

            return (
              <g
                key={branch._id}
                transform={`translate(${posX}, ${posY})`}
                onClick={() => handleMarkerClick(branch)}
                onMouseEnter={() => setHoveredBranchId(branch._id)}
                onMouseLeave={() => setHoveredBranchId(null)}
                className="cursor-pointer"
              >
                {/* Large stable transparent hit area (zero jitter on hover/click) */}
                <circle r="36" fill="transparent" className="cursor-pointer" />

                {/* Aura pulse for active or hovered branch */}
                {(isSelected || isHovered) && !isInactive && (
                  <circle
                    r={isSelected ? 26 : 22}
                    fill={isSelected ? 'rgba(255, 199, 153, 0.25)' : 'rgba(255, 199, 153, 0.15)'}
                    className={isSelected ? 'animate-pulse' : ''}
                  />
                )}

                {/* Pin base background */}
                <circle
                  r={isSelected ? '16' : isHovered ? '15' : '13'}
                  fill={isInactive ? '#2A2A2A' : isSelected ? '#FFC799' : isHovered ? '#FFE0C8' : '#1E1E1E'}
                  stroke={isInactive ? '#555555' : isSelected ? '#FFFFFF' : isHovered ? '#FFFFFF' : '#FFC799'}
                  strokeWidth={isSelected ? '2.5' : isHovered ? '2.2' : '1.8'}
                  filter="url(#markerGlow)"
                  className="transition-all duration-150"
                />

                {/* Inner Icon / Lettering */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fill={isSelected || isHovered ? '#101010' : '#FFC799'}
                  fontSize={isSelected ? '10' : isHovered ? '9.5' : '9'}
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none select-none"
                >
                  {index + 1}
                </text>

                {/* Floating Tooltip Label */}
                <g
                  transform={`translate(0, ${isSelected ? -25 : isHovered ? -23 : -20})`}
                  className="pointer-events-none select-none transition-transform duration-150"
                >
                  <rect
                    x="-65"
                    y="-16"
                    width="130"
                    height="22"
                    rx="5"
                    fill={isSelected ? '#141414' : isHovered ? '#1F1F1F' : '#101010'}
                    stroke={isSelected ? '#FFC799' : isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.18)'}
                    strokeWidth={isSelected || isHovered ? '1.5' : '1'}
                  />
                  <text
                    textAnchor="middle"
                    dy="-3"
                    fill={isSelected ? '#FFC799' : isHovered ? '#FFFFFF' : '#F5F5F5'}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {branch.code} • {branch.name.slice(0, 14)}..
                  </text>
                </g>

                {/* Availability pill below pin */}
                <g transform="translate(0, 22)" className="pointer-events-none select-none">
                  <rect
                    x="-32"
                    y="0"
                    width="64"
                    height="16"
                    rx="4"
                    fill={isInactive ? '#333333' : isHovered ? '#1C1C1C' : '#161616'}
                    stroke={isInactive ? '#666' : isHovered ? 'rgba(153, 255, 228, 0.6)' : 'rgba(153, 255, 228, 0.3)'}
                    strokeWidth="0.8"
                  />
                  <text
                    textAnchor="middle"
                    dy="11"
                    fill={isInactive ? '#888888' : '#99FFE4'}
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {isInactive ? 'Tạm ngưng' : `${branch.availableVehiclesCount ?? 0} xe sẵn`}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Selected Station Floating Bottom Card */}
        {activeBranch && (
          <div className="mx-4 mt-2 mb-3 bg-[#181818]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#FFC799]/30 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#FFC799]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#101010] text-[#FFC799] border border-white/10">
                    {activeBranch.code}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-[#F5F5F5]">
                    {activeBranch.name}
                  </h4>
                  {!activeBranch.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                      Tạm ngưng
                    </span>
                  )}
                  {activeBranch.distanceKm !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#99FFE4]/20 text-[#99FFE4] font-semibold border border-[#99FFE4]/30">
                      Cách bạn ~{activeBranch.distanceKm} km
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#A0A0A0] mt-1 flex items-center space-x-1.5">
                  <span>{activeBranch.address}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#A0A0A0]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#FFC799]" />
                    <span>{activeBranch.hours_open} – {activeBranch.hours_close}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-[#FFC799]" />
                    <a href={`tel:${activeBranch.phone}`} className="hover:text-[#FFC799] hover:underline">
                      {activeBranch.phone}
                    </a>
                  </span>
                  <span className="flex items-center space-x-1 text-[#99FFE4] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{activeBranch.availableVehiclesCount ?? 0} xe khả dụng tại trạm</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${activeBranch.name} ${activeBranch.address} Đà Nẵng`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-[#242424] hover:bg-[#303030] border border-white/10 text-xs font-medium text-[#F5F5F5] inline-flex items-center space-x-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-[#FFC799]" />
                <span>Google Maps</span>
              </a>

              <a
                href={`/bikes?pickup=${activeBranch._id}`}
                className="px-4 py-2 rounded-lg bg-[#FFC799] hover:bg-[#ffe2cc] text-[#101010] text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors shadow"
              >
                <span>Xem xe tại trạm này</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
