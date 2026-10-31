import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  LocateFixed,
  Move
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
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  }>({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });
  const hasDraggedRef = useRef<boolean>(false);

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

  // Center smoothly on specific SVG coordinates (svgX, svgY)
  const centerOnSvgCoords = (svgX: number, svgY: number, targetZoom: number = 1.45) => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : 900;
    const height = container ? container.clientHeight : 520;
    const scaleRatio = Math.min(width / 900, height / 560);

    const targetPanX = (450 - svgX) * scaleRatio * targetZoom;
    const targetPanY = (280 - svgY) * scaleRatio * targetZoom;

    const maxPanX = (width * 0.85) * targetZoom;
    const maxPanY = (height * 0.85) * targetZoom;

    setZoomLevel(targetZoom);
    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, targetPanX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, targetPanY)),
    });
  };

  // When selectedBranchId changes from props, update and smoothly center
  useEffect(() => {
    if (selectedBranchId) {
      setActiveBranchId(selectedBranchId);
      const branch = branches.find((b) => b._id === selectedBranchId);
      if (branch && branch.location_lng && branch.location_lat) {
        const posX = lngToX(branch.location_lng);
        const posY = latToY(branch.location_lat);
        centerOnSvgCoords(posX, posY, Math.max(zoomLevel, 1.35));
      }
    }
  }, [selectedBranchId]);

  // When userCoords becomes available or updates, glide directly to user's location
  useEffect(() => {
    if (userCoords && userCoords.lat && userCoords.lng) {
      const userX = lngToX(userCoords.lng);
      const userY = latToY(userCoords.lat);
      centerOnSvgCoords(userX, userY, 1.45);
    }
  }, [userCoords?.lat, userCoords?.lng]);

  const activeBranch = branches.find((b) => b._id === activeBranchId) || branches[0];

  const handleMarkerClick = (branch: Branch) => {
    if (hasDraggedRef.current) return;
    setActiveBranchId(branch._id);
    if (onSelectBranch) {
      onSelectBranch(branch);
    }
    const posX = lngToX(branch.location_lng || 108.2);
    const posY = latToY(branch.location_lat || 16.06);
    centerOnSvgCoords(posX, posY, Math.max(zoomLevel, 1.4));
  };

  // Dedicated Focus on User GPS button
  const handleFocusUserLocation = () => {
    if (userCoords && userCoords.lat && userCoords.lng) {
      const userX = lngToX(userCoords.lng);
      const userY = latToY(userCoords.lat);
      centerOnSvgCoords(userX, userY, 1.5);
    } else if (onFindNearest) {
      onFindNearest();
    }
  };

  // Zoom controls with proportional pan scaling
  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const next = Math.min(2.5, +(prev + 0.25).toFixed(2));
      const factor = next / prev;
      setPanOffset((p) => ({ x: p.x * factor, y: p.y * factor }));
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(0.85, +(prev - 0.25).toFixed(2));
      if (next <= 1.0) {
        setPanOffset({ x: 0, y: 0 });
        return 1;
      }
      const factor = next / prev;
      setPanOffset((p) => ({ x: p.x * factor, y: p.y * factor }));
      return next;
    });
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasDraggedRef.current = true;
    }

    const container = containerRef.current;
    const w = container ? container.clientWidth : 900;
    const h = container ? container.clientHeight : 520;
    const maxPanX = (w * 0.85) * zoomLevel;
    const maxPanY = (h * 0.85) * zoomLevel;

    const nextX = dragStartRef.current.initialPanX + dx;
    const nextY = dragStartRef.current.initialPanY + dy;

    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
    });
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    hasDraggedRef.current = false;
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.startX;
    const dy = touch.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasDraggedRef.current = true;
    }

    const container = containerRef.current;
    const w = container ? container.clientWidth : 900;
    const h = container ? container.clientHeight : 520;
    const maxPanX = (w * 0.85) * zoomLevel;
    const maxPanY = (h * 0.85) * zoomLevel;

    const nextX = dragStartRef.current.initialPanX + dx;
    const nextY = dragStartRef.current.initialPanY + dy;

    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
    });
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  return (
    <div className="relative bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Map HUD Bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 py-3 bg-gradient-to-b from-[#101010]/95 via-[#101010]/85 to-transparent flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-white/10 flex items-center space-x-1.5 text-xs text-[#FFC799]">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider uppercase text-[10px]">
              Bản đồ định vị GPS • Đà Nẵng
            </span>
          </div>

          {userCoords && (
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Đã xác định vị trí của bạn</span>
            </div>
          )}

          {zoomLevel > 1 && (
            <div className="hidden md:inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-[#A0A0A0]">
              <Move className="w-3 h-3 text-[#FFC799]" />
              <span>Kéo để di chuyển bản đồ</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Locate Button / Focus GPS */}
          <button
            type="button"
            onClick={handleFocusUserLocation}
            disabled={isLocating}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 ${
              userCoords
                ? 'bg-[#1D3E5D]/90 border-[#38BDF8]/60 text-[#38BDF8] hover:bg-[#254d73]'
                : 'bg-[#1F1F1F] border-white/10 text-[#A0A0A0] hover:text-[#F5F5F5]'
            }`}
            title={userCoords ? 'Phóng to và căn giữa vị trí của bạn' : 'Bật định vị GPS'}
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {userCoords ? 'Vị trí của tôi' : 'Bật GPS của tôi'}
            </span>
          </button>

          {/* Find Nearest Station button */}
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

          {/* Zoom & Pan Controls */}
          <div className="flex items-center bg-[#1A1A1A] border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] rounded transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-[#FFC799]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] rounded transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] rounded transition-colors"
              title="Đặt lại góc nhìn trung tâm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Draggable Vector Canvas Area */}
      <div className="relative w-full overflow-hidden bg-[#0D0E12] pt-14 pb-4">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative w-full overflow-hidden select-none touch-none ${
            isDragging ? 'cursor-grabbing' : zoomLevel > 1 ? 'cursor-grab' : 'cursor-default'
          }`}
        >
          <svg
            viewBox="0 0 900 560"
            className="w-full h-[380px] sm:h-[460px] md:h-[520px] select-none"
            style={{
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
            }}
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
                strokeOpacity="0.6"
              />
            )}

            {/* User to Active Branch Direct Vector Line */}
            {userCoords && activeBranch && (
              <line
                x1={lngToX(userCoords.lng)}
                y1={latToY(userCoords.lat)}
                x2={lngToX(activeBranch.location_lng || 108.2)}
                y2={latToY(activeBranch.location_lat || 16.06)}
                stroke="#38BDF8"
                strokeWidth="1.8"
                strokeDasharray="5 3"
                strokeOpacity="0.8"
              />
            )}

            {/* User Location Radar Pulse */}
            {userCoords && (
              <g
                transform={`translate(${lngToX(userCoords.lng)}, ${latToY(userCoords.lat)})`}
                className="pointer-events-none select-none"
              >
                <circle r="26" fill="rgba(56, 189, 248, 0.12)" className="animate-ping" />
                <circle r="14" fill="rgba(56, 189, 248, 0.25)" />
                <circle r="7" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2.5" />
                <g transform="translate(0, -18)">
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="18"
                    rx="4"
                    fill="#0B192C"
                    stroke="#38BDF8"
                    strokeWidth="1"
                  />
                  <text
                    y="1"
                    textAnchor="middle"
                    fill="#99FFE4"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    Vị trí của bạn
                  </text>
                </g>
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
                  {/* Large stable transparent hit area */}
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
        </div>

        {/* Selected Station Floating Bottom Card */}
        {activeBranch && (
          <div className="mx-4 mt-3 mb-2 bg-[#181818]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
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
