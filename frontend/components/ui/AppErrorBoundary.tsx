import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App runtime error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen w-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900 tracking-tight">Something went wrong</h1>
          <p className="mt-1 text-sm text-slate-600">The app hit a runtime error. Reload to continue.</p>
          {this.state.message ? (
            <p className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
              {this.state.message}
            </p>
          ) : null}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 h-9 px-3 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
