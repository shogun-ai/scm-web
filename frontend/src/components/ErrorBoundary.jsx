import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#041621] flex items-center justify-center">
          <div className="text-center sc-glass-panel p-8 rounded-2xl max-w-md">
            <p className="text-white/70 mb-4">Хуудас ачаалахад алдаа гарлаа.</p>
            <button
              onClick={() => window.location.reload()}
              className="sc-primary-button px-6 py-2 rounded-lg text-sm"
            >
              Дахин ачаалах
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
