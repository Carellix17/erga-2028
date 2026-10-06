import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full bg-warning/15 border-b border-warning/40 px-4 py-2 text-center text-sm text-foreground">
      Nell'anteprima tutti i pagamenti sono in modalità test.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Scopri di più
      </a>
    </div>
  );
}
