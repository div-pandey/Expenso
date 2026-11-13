import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error caught by Expenso ErrorBoundary:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetCache = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-card text-center space-y-5 animate-pop-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-subtle">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                An unexpected interface or network error occurred during this session. Your balances and data remain safe.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-warm-100 rounded-xl border border-warm-200 text-[11px] font-mono text-charcoal-700 text-left overflow-x-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-action-primary flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-700 hover:bg-brand-800 shadow-card flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="btn-action-secondary py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-charcoal-700 border border-warm-300 hover:bg-warm-100 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-charcoal-500" />
                <span>Reset Cache</span>
              </button>
            </div>

            <p className="text-[11px] text-charcoal-400">
              Expenso · Paise-locked zero circular debt ledger
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
