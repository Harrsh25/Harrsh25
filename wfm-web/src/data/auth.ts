// Demo-only sign-in. Everything stays in this browser; nothing is sent anywhere.
// localStorage keeps you signed in across reloads; where it's blocked (sandboxed
// previews), the in-memory copy keeps the session for as long as the page is open.
const KEY = "wfm-demo-user";
export type User = { name: string; email: string };

let memoryUser: User | null = null;

export const auth = {
  user(): User | null {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* storage unavailable */ }
    return memoryUser;
  },
  login(name: string, email: string) {
    memoryUser = { name, email };
    try { localStorage.setItem(KEY, JSON.stringify(memoryUser)); } catch { /* storage unavailable */ }
  },
  logout() {
    memoryUser = null;
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  },
  isLoggedIn() { return this.user() !== null; },
};
