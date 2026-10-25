import React, { useEffect, useState } from 'react';
import { RefreshCw, FileCheck2 } from 'lucide-react';
import { api } from '../services/api';

interface SecureEkycImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  versionKey?: string;
  emptyText?: string;
}

const normalizeProtectedApiPath = (rawUrl: string): string | null => {
  const cleanNoQuery = rawUrl.split('?')[0];
  const idx = cleanNoQuery.indexOf('/auth/ekyc/document/');
  if (idx !== -1) {
    return cleanNoQuery.slice(idx);
  }
  return null;
};

/**
 * Securely loads private eKYC identity images over Authorization: Bearer header
 * into an ephemeral revocable Blob URL so JWT tokens never leak in URL query strings,
 * browser history, Referer headers, or proxy access logs.
 */
export const SecureEkycImage: React.FC<SecureEkycImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  style,
  versionKey = '',
  emptyText = 'Chưa có ảnh',
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    if (!src) {
      setResolvedUrl(null);
      setFailed(false);
      setLoading(false);
      return;
    }

    const protectedPath = normalizeProtectedApiPath(src);
    if (!protectedPath) {
      setResolvedUrl(src);
      setFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);

    api
      .get(protectedPath, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        const blob: Blob = res.data;
        if (!blob || blob.size === 0) {
          setFailed(true);
          setResolvedUrl(null);
          return;
        }
        createdBlobUrl = URL.createObjectURL(blob);
        setResolvedUrl(createdBlobUrl);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setResolvedUrl(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [src, versionKey]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-[#FFC799] animate-spin" />
      </div>
    );
  }

  if (!resolvedUrl || failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 space-y-1">
        <FileCheck2 className="w-6 h-6 text-[#6E6E6E]" />
        <span className="text-[11px] text-[#6E6E6E]">{emptyText}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      style={style}
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
