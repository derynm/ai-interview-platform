import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  // Fill the viewport when wrapping the whole app; stay inline when wrapping one page.
  fullScreen?: boolean;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className={
            this.props.fullScreen === false
              ? "flex items-center justify-center p-8"
              : "min-h-screen flex items-center justify-center p-8"
          }
        >
          <div className="text-center space-y-3">
            <p className="font-medium">Something went wrong.</p>
            <p className="text-sm text-muted-foreground">
              Please refresh the page. If the problem persists, contact support.
            </p>
            <button
              className="text-sm text-primary underline"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
