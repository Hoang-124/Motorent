/**
 * Utility to apply an anti-fraud security watermark onto eKYC identity documents
 * in compliance with Vietnamese Personal Data Protection Decree 13/2023/ND-CP
 * and Ministry of Public Security (C06) fraud prevention recommendations.
 */

export interface WatermarkOptions {
  date?: Date;
  rentalService?: string;
  customNote?: string;
  maxDimension?: number;
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
          const rawWidth = img.naturalWidth || img.width;
          const rawHeight = img.naturalHeight || img.height;
          const maxDim = options?.maxDimension || 1280;
          const scale = Math.max(rawWidth, rawHeight) > maxDim ? maxDim / Math.max(rawWidth, rawHeight) : 1;
          const width = Math.max(1, Math.round(rawWidth * scale));
          const height = Math.max(1, Math.round(rawHeight * scale));

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

          // 3. Configure ultra-dense, high-contrast post-approval security watermark
          const fontSize = Math.max(11, Math.floor(width / 56));
          ctx.font = `800 ${fontSize}px "Segoe UI", Roboto, Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const maxTextWidth = Math.max(
            ctx.measureText(line1).width,
            ctx.measureText(line2).width,
            ctx.measureText(line3).width
          );

          // Secondary cross-diagonal (+25 deg) security mesh to eliminate any blank gaps
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate((25 * Math.PI) / 180);
          const microFontSize = Math.max(9, Math.floor(fontSize * 0.72));
          ctx.font = `700 ${microFontSize}px "Segoe UI", Roboto, Arial, sans-serif`;
          const microText = `MOTORENT • CHỈ DÙNG THUÊ XE • ${dateStr} • CẤM VAY VỐN • `;
          const microWidth = Math.max(120, ctx.measureText(microText).width);
          const microStepY = fontSize * 2.6;
          for (let my = -height * 1.6; my <= height * 1.6; my += microStepY) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1;
            ctx.moveTo(-width * 1.6, my - microFontSize * 0.75);
            ctx.lineTo(width * 1.6, my - microFontSize * 0.75);
            ctx.stroke();

            for (let mx = -width * 1.6; mx <= width * 1.6; mx += microWidth) {
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
              ctx.lineWidth = 2;
              ctx.strokeText(microText, mx, my);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
              ctx.fillText(microText, mx, my);
            }
          }
          ctx.restore();

          // 4. Primary dense staggered diagonal (-25 deg) watermark blocks packed tightly
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate((-25 * Math.PI) / 180);
          ctx.font = `800 ${fontSize}px "Segoe UI", Roboto, Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const stepX = maxTextWidth + fontSize * 1.15;
          const stepY = fontSize * 3.45;

          let rowIndex = 0;
          for (let y = -height * 1.6; y <= height * 1.6; y += stepY) {
            const xOffset = (rowIndex % 2 === 1) ? stepX * 0.5 : 0;
            rowIndex++;

            // Continuous security ribbon background across the entire row
            const bandHeight = fontSize * 3.05;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
            ctx.fillRect(-width * 1.8, y - bandHeight / 2, width * 3.6, bandHeight);

            // Top & bottom security rule lines on every ribbon
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-width * 1.8, y - bandHeight / 2);
            ctx.lineTo(width * 1.8, y - bandHeight / 2);
            ctx.moveTo(-width * 1.8, y + bandHeight / 2);
            ctx.lineTo(width * 1.8, y + bandHeight / 2);
            ctx.stroke();

            for (let x = -width * 1.6; x <= width * 1.6; x += stepX) {
              ctx.save();
              ctx.translate(x + xOffset, y);

              // Crisp dark stroke around letters
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
              ctx.lineWidth = Math.max(2, fontSize * 0.14);
              ctx.strokeText(line1, 0, -fontSize * 1.05);
              ctx.strokeText(line2, 0, 0);
              ctx.strokeText(line3, 0, fontSize * 1.05);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
              ctx.fillText(line1, 0, -fontSize * 1.05);

              ctx.fillStyle = 'rgba(52, 211, 153, 0.88)'; // emerald accent for Motorent date
              ctx.fillText(line2, 0, 0);

              ctx.fillStyle = 'rgba(251, 191, 36, 0.88)'; // amber warning for no-loan clause
              ctx.fillText(line3, 0, fontSize * 1.05);

              ctx.restore();
            }
          }

          ctx.restore();

          // 5. Export compressed WebP (0.82 quality) with JPEG fallback
          const baseName = file.name.replace(/\.[^/.]+$/, '') || 'ekyc_doc';
          canvas.toBlob(
            (webpBlob) => {
              if (webpBlob && webpBlob.type === 'image/webp') {
                resolve(
                  new File([webpBlob], `${baseName}.webp`, {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  })
                );
                return;
              }
              canvas.toBlob(
                (jpegBlob) => {
                  if (!jpegBlob) {
                    return resolve(file);
                  }
                  resolve(
                    new File([jpegBlob], `${baseName}.jpg`, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    })
                  );
                },
                'image/jpeg',
                0.85
              );
            },
            'image/webp',
            0.82
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

/**
 * Stage 1 (Pre-review): Compress and normalize eKYC image to WebP (max 1280px)
 * WITHOUT drawing any watermark, so reviewers can clearly inspect face & ID numbers.
 */
export const compressEkycImage = async (file: File, maxDimension = 1280): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File không phải là hình ảnh hợp lệ.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const rawWidth = img.naturalWidth || img.width;
          const rawHeight = img.naturalHeight || img.height;
          const scale = Math.max(rawWidth, rawHeight) > maxDimension ? maxDimension / Math.max(rawWidth, rawHeight) : 1;
          const width = Math.max(1, Math.round(rawWidth * scale));
          const height = Math.max(1, Math.round(rawHeight * scale));

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const baseName = file.name.replace(/\.[^/.]+$/, '') || 'ekyc_clean';
          canvas.toBlob(
            (webpBlob) => {
              if (webpBlob && webpBlob.type === 'image/webp') {
                resolve(
                  new File([webpBlob], `${baseName}.webp`, {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  })
                );
                return;
              }
              canvas.toBlob(
                (jpegBlob) => {
                  if (!jpegBlob) return resolve(file);
                  resolve(
                    new File([jpegBlob], `${baseName}.jpg`, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    })
                  );
                },
                'image/jpeg',
                0.88
              );
            },
            'image/webp',
            0.86
          );
        } catch {
          resolve(file);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Stage 2 (Post-Approval): Fetch an existing unwatermarked eKYC document from protected URL
 * and seal it with the anti-fraud watermark.
 */
export const watermarkImageFromUrl = async (
  url: string,
  filename: string,
  options?: WatermarkOptions
): Promise<File | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawFile = new File([blob], filename, {
      type: blob.type || 'image/webp',
      lastModified: Date.now(),
    });
    return await applyEkycWatermark(rawFile, options);
  } catch (err) {
    console.error('Không thể tải ảnh để đóng dấu bảo mật sau duyệt:', err);
    return null;
  }
};

