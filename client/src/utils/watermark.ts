/**
 * Utility to apply an anti-fraud security watermark onto eKYC identity documents
 * in compliance with Vietnamese Personal Data Protection Decree 13/2023/ND-CP
 * and Ministry of Public Security (C06) fraud prevention recommendations.
 */

export interface WatermarkOptions {
  date?: Date;
  rentalService?: string;
  customNote?: string;
}

export const applyEkycWatermark = async (file: File, options?: WatermarkOptions): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File không phải là hình ảnh hợp lệ.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file); // fallback to original if 2d context unavailable
          }

          // 1. Draw base photo
          ctx.drawImage(img, 0, 0, width, height);

          // 2. Prepare date and watermark text
          const targetDate = options?.date || new Date();
          const day = String(targetDate.getDate()).padStart(2, '0');
          const month = String(targetDate.getMonth() + 1).padStart(2, '0');
          const year = targetDate.getFullYear();
          const dateStr = `${day}/${month}/${year}`;

          const serviceName = options?.rentalService || 'MOTORENT VIỆT NAM';
          const line1 = `CHỈ DÙNG XÁC THỰC THUÊ XE ${serviceName}`;
          const line2 = `NGÀY ${dateStr} - NGHỊ ĐỊNH 13/2023/NĐ-CP`;
          const line3 = `KHÔNG CÓ GIÁ TRỊ VAY VỐN HOẶC MỞ TÀI KHOẢN`;

          // 3. Configure watermark typography & style
          const fontSize = Math.max(16, Math.floor(width / 26));
          ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // 4. Draw repeating diagonal watermark lattice
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate((-28 * Math.PI) / 180); // 28 degree tilt

          const stepY = fontSize * 4.5;
          const stepX = width * 0.8;

          // Draw multiple lines spanning across the entire canvas
          for (let y = -height * 1.2; y <= height * 1.2; y += stepY) {
            for (let x = -width * 1.2; x <= width * 1.2; x += stepX) {
              ctx.save();
              ctx.translate(x, y);

              // Background pill / shadow for high legibility on any card surface
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.fillRect(-width * 0.38, -fontSize * 1.6, width * 0.76, fontSize * 3.4);

              // Text outline & fill
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.lineWidth = Math.max(2, Math.floor(fontSize / 8));
              ctx.strokeText(line1, 0, -fontSize * 0.8);
              ctx.strokeText(line2, 0, fontSize * 0.2);
              ctx.strokeText(line3, 0, fontSize * 1.1);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillText(line1, 0, -fontSize * 0.8);

              ctx.fillStyle = 'rgba(249, 115, 22, 0.95)'; // orange accent for Motorent date
              ctx.fillText(line2, 0, fontSize * 0.2);

              ctx.fillStyle = 'rgba(251, 191, 36, 0.95)'; // amber warning for no-loan clause
              ctx.fillText(line3, 0, fontSize * 1.1);

              ctx.restore();
            }
          }

          ctx.restore();

          // 5. Export back to File object
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }
              const watermarkedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(watermarkedFile);
            },
            'image/jpeg',
            0.92
          );
        } catch (err) {
          console.error('Lỗi khi đóng watermark chống giả mạo:', err);
          resolve(file); // fail safe: keep file
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};
