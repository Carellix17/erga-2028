import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * "Paracadute" dell'app: se un componente esplode durante il rendering,
 * invece del temuto SCHERMO BIANCO mostra questa pagina di cortesia
 * con due vie d'uscita (riprova / ricarica).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary catturato:", error, info.componentStack);
  }

  private handleRetry = () => this.setState({ hasError: false });
  private handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="title-medium font-display font-semibold">Ops, qualcosa è andato storto</h1>
          <p className="body-medium text-muted-foreground">
            Niente panico: i tuoi dati sono al sicuro. Prova a ripartire da qui.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={this.handleRetry}
            className="h-11 px-5 rounded-full bg-surface-container-high text-sm font-medium hover:bg-surface-container-highest transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Riprova
          </button>
          <button
            onClick={this.handleReload}
            className="h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium shadow-level-1 hover:opacity-90 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Ricarica la pagina
          </button>
        </div>
      </div>
    );
  }
}
