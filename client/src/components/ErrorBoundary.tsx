import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MOTORENT ErrorBoundary] Caught runtime exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#101010] flex items-center justify-center px-4 py-16 text-[#F5F5F5]">
          <div className="max-w-md w-full bg-[#161616] border border-white/10 rounded-2xl p-7 text-center shadow-2xl space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FFC799]/15 border border-[#FFC799]/30 text-[#FFC799] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#F5F5F5]">
                Đã có sự cố hiển thị / Render Error
              </h2>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">
                Hệ thống ghi nhận sự cố tạm thời khi nạp giao diện. Vui lòng bấm tải lại hoặc quay về trang chủ.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 rounded-xl bg-[#101010] border border-white/5 font-mono text-[11px] text-[#FF8080] text-left overflow-x-auto max-h-28">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FFC799] hover:bg-[#FFD6B3] text-[#101010] font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
