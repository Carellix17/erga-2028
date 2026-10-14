export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 74" aria-hidden="true" className={className}>
      <path d="M6 6h46L40 20H6z" fill="hsl(var(--on-ink))" />
      <path d="M6 26h46L40 40H6z" fill="hsl(var(--on-ink))" />
      <path d="M6 46h46L40 60H6z" fill="hsl(var(--on-ink))" />
      <path d="M24 61l8 11 8-11H24z" fill="hsl(var(--marketing-red))" />
    </svg>
  );
}
