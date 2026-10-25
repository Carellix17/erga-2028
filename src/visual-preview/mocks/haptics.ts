export function useHaptics() {
  const noop = () => {};
  return {
    trigger: noop,
    triggerLight: noop,
    triggerMedium: noop,
    triggerSuccess: noop,
    triggerWarning: noop,
    triggerError: noop,
  };
}
