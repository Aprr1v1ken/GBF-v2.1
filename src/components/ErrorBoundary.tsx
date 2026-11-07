import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.warn('[ErrorBoundary] Terjadi kesalahan visual tertangkap:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 text-center shadow-xl backdrop-blur-md">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">
              {this.props.fallbackTitle || 'Tampilan Sementara Belum Siap'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Terjadi kendala pemuatan visual atau jaringan. Anda dapat menyegarkan modul ini dengan tombol di bawah.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Modul</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
