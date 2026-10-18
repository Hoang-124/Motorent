import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Star,
  Upload,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Camera,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import type { Review } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  vehicleName?: string;
  existingReview?: Review | null;
  onSuccess: () => void;
}

interface NewPhotoItem {
  file: File;
  previewUrl: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  vehicleName,
  existingReview,
  onSuccess,
}) => {
  const isEditMode = Boolean(existingReview);

  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');

  // Existing photos (for edit mode)
  const [existingPhotos, setExistingPhotos] = useState<string[]>(existingReview?.photos || []);

  // New selected photos
  const [newPhotos, setNewPhotos] = useState<NewPhotoItem[]>([]);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state on open / edit
  useEffect(() => {
    if (isOpen) {
      if (existingReview) {
        setRating(existingReview.rating || 5);
        setComment(existingReview.comment || '');
        setExistingPhotos(existingReview.photos || []);
      } else {
        setRating(5);
        setComment('');
        setExistingPhotos([]);
      }
      setNewPhotos([]);
      setErrorMsg('');
      setHoverRating(0);
    }
  }, [isOpen, existingReview]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [newPhotos]);

  if (!isOpen) return null;

  const totalPhotosCount = existingPhotos.length + newPhotos.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total limit
    if (totalPhotosCount + files.length > 5) {
      setErrorMsg(`Chỉ được tải lên tối đa 5 hình ảnh (hiện có ${totalPhotosCount} ảnh).`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validNewItems: NewPhotoItem[] = [];
    for (const file of files) {
      // Size check (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`Tệp "${file.name}" vượt quá dung lượng tối đa cho phép (5MB).`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Type check
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setErrorMsg(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      validNewItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setNewPhotos((prev) => [...prev, ...validNewItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExistingPhoto = (url: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p !== url));
  };

  const handleRemoveNewPhoto = (index: number) => {
    const item = newPhotos[index];
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setNewPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Rating is mandatory
    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg('Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao).');
      return;
    }

    // Comment max length check
    if (comment.length > 1000) {
      setErrorMsg('Nội dung đánh giá không được vượt quá 1000 ký tự.');
      return;
    }

    // Photo count check
    if (totalPhotosCount > 5) {
      setErrorMsg('Tối đa không quá 5 hình ảnh.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('rating', String(rating));
      formData.append('comment', comment.trim());

      // Append new photo files
      newPhotos.forEach((item) => {
        formData.append('photos', item.file);
      });

      if (isEditMode && existingReview) {
        // Send existing photos to keep
        formData.append('existingPhotos', JSON.stringify(existingPhotos));

        await api.patch(`/reviews/${existingReview._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        if (!bookingId) {
          setErrorMsg('Không tìm thấy mã đặt xe để đánh giá.');
          setSubmitting(false);
          return;
        }

        await api.post(`/bookings/${bookingId}/reviews`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const starLabels: Record<number, string> = {
    1: 'Rất không hài lòng',
    2: 'Chưa hài lòng',
    3: 'Tạm ổn',
    4: 'Hài lòng',
    5: 'Rất tuyệt vời',
  };

  const activeStarIndex = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161616] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFC799]/15 border border-[#FFC799]/30 flex items-center justify-center text-[#FFC799]">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F5F5]">
                {isEditMode ? 'Chỉnh sửa đánh giá' : 'Đánh giá chuyến đi'}
              </h2>
              {vehicleName && (
                <p className="text-xs text-[#A0A0A0] mt-0.5">{vehicleName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[2]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Star Rating Selector (Bắt buộc) */}
          <div className="space-y-2 text-center bg-[#101010] p-4 rounded-xl border border-white/[0.06]">
            <label className="block text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
              Mức độ hài lòng của bạn <span className="text-[#FFC799]">*</span>
            </label>

            <div className="flex items-center justify-center space-x-2 py-1">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = starVal <= activeStarIndex;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(starVal)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? 'fill-[#FFC799] text-[#FFC799]'
                          : 'fill-transparent text-[#404040] hover:text-[#A0A0A0]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-[#FFC799]">
              {starLabels[activeStarIndex] || 'Chọn số sao đánh giá'}
            </p>
          </div>

          {/* Comment with Character Count */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="review-comment" className="font-medium text-[#A0A0A0]">
                Nhận xét chi tiết (Tùy chọn)
              </label>
              <span
                className={`font-mono text-[11px] ${
                  comment.length > 900 ? 'text-[#FFC799]' : 'text-[#6E6E6E]'
                }`}
              >
                {comment.length} / 1000
              </span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về độ mượt của xe, mức tiêu hao nhiên liệu, thái độ nhân viên giao xe..."
              className="w-full bg-[#101010] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-[#F5F5F5] placeholder-[#6E6E6E] focus:outline-none focus:border-[#FFC799] transition-colors resize-none"
            />
          </div>

          {/* Photo Upload with Previews & Individual Delete */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-[#A0A0A0] flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 stroke-[2] text-[#FFC799]" />
                <span>Ảnh thực tế chuyến đi</span>
              </label>
              <span className="font-mono text-[11px] text-[#6E6E6E]">
                {totalPhotosCount} / 5 ảnh (Tối đa 5MB/ảnh)
              </span>
            </div>

            {/* Photo Previews Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {/* Existing Photos (Edit Mode) */}
              {existingPhotos.map((url, idx) => (
                <div
                  key={`existing-${idx}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#101010] border border-white/10 group"
                >
                  <img
                    src={url}
                    alt={`Existing photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingPhoto(url)}
                    className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-500 text-white rounded-md transition-colors cursor-pointer"
                    title="Xóa ảnh này"
                  >
                    <Trash2 className="w-3 h-3 stroke-[2]" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1 rounded text-white/80">
                    Cũ
                  </span>
                </div>
              ))}

              {/* Newly Selected Photos */}
              {newPhotos.map((item, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#101010] border border-white/10 group"
                >
                  <img
                    src={item.previewUrl}
                    alt={`New photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewPhoto(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-500 text-white rounded-md transition-colors cursor-pointer"
                    title="Xóa ảnh này"
                  >
                    <X className="w-3 h-3 stroke-[2]" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[9px] bg-[#FFC799]/80 text-[#101010] font-bold px-1 rounded">
                    Mới
                  </span>
                </div>
              ))}

              {/* Upload Button Tile (if < 5 photos) */}
              {totalPhotosCount < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-[#FFC799] bg-[#101010]/60 hover:bg-[#101010] transition-colors flex flex-col items-center justify-center p-2 text-center text-[#A0A0A0] hover:text-[#FFC799] cursor-pointer group"
                >
                  <Upload className="w-5 h-5 stroke-[2] mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium leading-tight">Thêm ảnh</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#FFC799] hover:bg-[#ffb67a] active:scale-95 text-[#101010] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{isEditMode ? 'Lưu thay đổi' : 'Gửi đánh giá'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
