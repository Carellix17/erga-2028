Add a dark mode toggle in Profile settings that persists to the cloud and applies a `.dark` class to `<html>`.

### What already exists
- `index.css` has a complete `.dark` color scheme with all M3 tokens.
- `tailwind.config.ts` has `darkMode: ["class"]` configured.
- `useUserData("key", defaultValue)` hook provides cloud-backed KV storage (no localStorage per project rules).
- `ProfileView` is the settings page where the toggle will live.

### Changes

1. **Create `src/contexts/ThemeContext.tsx`**
   - Reads/writes preference via `useUserData<"light" | "dark">("theme", "light")`.
   - Applies/removes the `dark` class on `document.documentElement` in a `useEffect`.
   - Updates the PWA `<meta name="theme-color">` to match the active scheme.
   - Exposes `{ theme, setTheme, isLoaded }`.

2. **Wrap app in `ThemeProvider`**
   - Add `ThemeProvider` around the existing tree in `App.tsx`.

3. **Add toggle in `ProfileView`**
   - Add a new "Aspetto" card section with a row: label + `Switch` from `@/components/ui/switch`.
   - Label: "Modalità scura".
   - Switch is disabled until `isLoaded` to avoid flickering.
   - On toggle, call `setTheme(prev => prev === "light" ? "dark" : "light")`.

4. **Behavior**
   - First paint is always light (no FOUC since data is async).
   - Once `useUserData` resolves, the saved theme is applied immediately.
   - Change is optimistic (React Query) and synced to the backend automatically via `useUserData`.

No database migrations needed — `user_data` table already exists for KV storage.