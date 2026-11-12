import { Component, type ReactNode } from 'react';
import { detectLang, translate } from '../i18n';

/** Last-resort error screen, so a bug never leaves a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('PerfectEye crashed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const lang = detectLang(typeof navigator !== 'undefined' ? navigator.languages ?? [] : []);
    return (
      <div className="crash" role="alert">
        <p>{translate(lang, 'error.generic')}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>
          {translate(lang, 'error.reload')}
        </button>
      </div>
    );
  }
}
