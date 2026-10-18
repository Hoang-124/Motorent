import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  ChevronDown,
  Check,
  Clock,
  Phone,
  Plane,
  Compass,
} from 'lucide-react';
import type { Branch } from '../types';

interface BranchSelectProps {
  label?: React.ReactNode;
  branches: Branch[];
  value: string;
  onChange: (branchId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  helperText?: string;
}

export const BranchSelect: React.FC<BranchSelectProps> = ({
  label,
  branches,
  value,
  onChange,
  disabled = false,
  compact = false,
  helperText,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const selectedBranch =
    branches.find((b) => b._id === value) || branches[0] || null;

  const isAirportBranch = (name: string) =>
    name.toLowerCase().includes('sân bay') || name.toLowerCase().includes('airport');

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      {label && <div>{label}</div>}

      {/* Custom Vesper Trigger Card */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`w-full flex items-center justify-between text-left rounded-xl border transition-all ${
          compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
        } ${
          disabled
            ? 'bg-[#0A0A0A]/60 border-white/[0.06] opacity-65 cursor-not-allowed'
            : open
            ? 'bg-[#1E1E1E] border-[#FFC799] shadow-[0_0_0_3px_rgba(255,199,153,0.15)] cursor-pointer'
            : 'bg-[#0A0A0A] border-white/12 hover:border-[#FFC799]/50 hover:bg-[#141414] cursor-pointer'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0 pr-2">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              open
                ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                : 'bg-[#FFC799]/12 text-[#FFC799] border-[#FFC799]/25'
            }`}
          >
            {selectedBranch && isAirportBranch(selectedBranch.name) ? (
              <Plane className="w-4 h-4" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-[13px] font-bold text-[#F5F5F5] truncate">
                {selectedBranch ? selectedBranch.name : 'Đang tải chi nhánh...'}
              </span>
            </div>
            {selectedBranch && (
              <div className="flex items-center space-x-2 text-[11px] text-[#A0A0A0] mt-0.5 truncate">
                <span className="truncate">
                  {helperText || selectedBranch.address}
                </span>
              </div>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#A0A0A0] shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-[#FFC799]' : ''
          }`}
        />
      </button>

      {/* Operating hours subtle footer under trigger when not compact */}
      {!compact && selectedBranch && (
        <div className="flex items-center justify-between text-[11px] text-[#6E6E6E] px-1">
          <span className="truncate">{selectedBranch.address}</span>
          <span className="font-mono text-[#A0A0A0] shrink-0 ml-2">
            {selectedBranch.hours_open || '07:00'} – {selectedBranch.hours_close || '22:30'}
          </span>
        </div>
      )}

      {/* Custom Vesper Dropdown Popover */}
      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 p-2.5 rounded-2xl bg-[#161616] border border-[#FFC799]/35 shadow-[0_24px_48px_rgba(0,0,0,0.94)] animate-in fade-in zoom-in-95 duration-150 space-y-2">
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0]">
              Hệ thống trạm giao nhận Đà Nẵng ({branches.length})
            </span>
            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-[#99FFE4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#99FFE4]" />
              <span>Hỗ trợ trả liên trạm 0đ</span>
            </span>
          </div>

          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
            {branches.map((branch) => {
              const isSelected = branch._id === (selectedBranch?._id || value);
              const airport = isAirportBranch(branch.name);

              return (
                <button
                  key={branch._id}
                  type="button"
                  onClick={() => {
                    onChange(branch._id);
                    setOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-start justify-between gap-3 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#FFC799]/14 border-[#FFC799]/55 shadow-sm'
                      : 'bg-[#101010]/80 border-white/[0.06] hover:bg-[#1E1E1E] hover:border-[#FFC799]/30'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                          : 'bg-[#1E1E1E] text-[#A0A0A0] border-white/10'
                      }`}
                    >
                      {airport ? (
                        <Plane className="w-4 h-4" />
                      ) : (
                        <Compass className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs sm:text-[13px] font-bold truncate ${
                            isSelected ? 'text-[#FFC799]' : 'text-[#F5F5F5]'
                          }`}
                        >
                          {branch.name}
                        </span>
                        {branch.code && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-white/[0.06] text-[#A0A0A0] shrink-0">
                            {branch.code}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#A0A0A0] leading-snug">
                        {branch.address}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[10px] text-[#6E6E6E] font-mono">
                        <span className="inline-flex items-center space-x-1 text-[#99FFE4]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {branch.hours_open || '07:00'} – {branch.hours_close || '22:30'}
                          </span>
                        </span>
                        {branch.phone && (
                          <span className="inline-flex items-center space-x-1 text-[#A0A0A0]">
                            <Phone className="w-3 h-3" />
                            <span>{branch.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1 border ${
                      isSelected
                        ? 'bg-[#FFC799] text-[#101010] border-[#FFC799]'
                        : 'border-white/15 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
