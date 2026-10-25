export function useAuth() {
  return {
    isAuthenticated: true,
    currentUser: "visual-fixture-user",
    currentEmail: "visual@example.invalid",
    isLoading: false,
    isGoogleUser: false,
    session: null,
    authError: null,
    logout: async () => {},
  };
}
