import React, { useRef } from 'react';
import { PenTool, RotateCcw } from 'lucide-react';

interface ContractSignaturePadProps {
  value: string;
  onChange: (dataUri: string) => void;
  label?: string;
  helperText?: string;
}

export const ContractSignaturePad: React.FC<ContractSignaturePadProps> = ({
  value,
  onChange,
  label = 'Chữ ký điện tử xác nhận hợp đồng của Bên thuê (Bên B)',
  helperText = 'Ký trực tiếp bằng chuột hoặc màn hình cảm ứng để lưu vào hợp đồng điện tử song phương.',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const getCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCoords(e, canvas);
    ctx.strokeStyle = '#FFC799';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    isDrawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange('');
  };

  return (
    <div className="p-4 rounded-2xl bg-[#101010] border border-white/10 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-1.5">
            <PenTool className="w-3.5 h-3.5 text-[#FFC799]" />
            <span>{label}</span>
          </span>
          <p className="text-[11px] text-[#A0A0A0] mt-0.5">{helperText}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#FF8080] hover:underline cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Ký lại</span>
          </button>
        )}
      </div>

      <div className="relative rounded-xl border border-dashed border-white/15 bg-[#141414] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={520}
          height={140}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-32 touch-none cursor-crosshair"
        />
        {!value && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-[#6E6E6E]">
            Ký tên xác nhận của người đại diện thuê xe tại đây (Tùy chọn ký trước hoặc ký tại quầy khi bàn giao)
          </div>
        )}
      </div>
    </div>
  );
};
