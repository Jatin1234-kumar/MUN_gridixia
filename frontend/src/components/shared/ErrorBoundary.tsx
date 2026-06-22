import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="glass-card max-w-md rounded-2xl border border-white/[0.08] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            {this.state.error && (
              <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 font-mono text-xs text-muted-foreground">
                {this.state.error.message}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RefreshCcw size={13} />
                Try Again
              </Button>
              <Button size="sm" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
