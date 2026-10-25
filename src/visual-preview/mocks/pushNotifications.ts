export function usePushNotifications() {
  return { supported: false, permission: "denied", subscribe: async () => {} };
}
