export const AUTH_TOKEN_KEYS = ["auth_jwt", "jwt", "accessToken", "token", "authToken"] as const;
export const AUTH_TOKEN_UPDATED_EVENT = "auth-token-updated";
export const AUTH_REFRESH_TOKEN_KEYS = ["auth_refresh_token", "refreshToken", "refresh"] as const;
export const AUTH_USER_STORAGE_KEY = "auth_user";

export interface AuthStatus {
  isLoggedIn: boolean;
  token: string | null;
  expiresAt: number | null;
}

export interface StoredAuthUser {
  email: string;
  name: string;
  role: string;
}

const isBrowser = typeof window !== "undefined";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function getJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function getStoredJwtToken(): string | null {
  if (!isBrowser) {
    return null;
  }

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of AUTH_TOKEN_KEYS) {
      const token = storage.getItem(key);
      if (token) {
        return token;
      }
    }
  }

  return null;
}

export function getStoredRefreshToken(): string | null {
  if (!isBrowser) {
    return null;
  }

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of AUTH_REFRESH_TOKEN_KEYS) {
      const token = storage.getItem(key);
      if (token) {
        return token;
      }
    }
  }

  return null;
}

export function getStoredAuthUser(): StoredAuthUser | null {
  if (!isBrowser) {
    return null;
  }

  for (const storage of [sessionStorage, localStorage]) {
    const value = storage.getItem(AUTH_USER_STORAGE_KEY);
    if (!value) {
      continue;
    }

    try {
      return JSON.parse(value) as StoredAuthUser;
    } catch {
      storage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }

  return null;
}

export function isJwtValid(token: string | null): boolean {
  if (!token) {
    return false;
  }

  const exp = getJwtExp(token);
  if (exp === null) {
    return token.split(".").length === 3;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp > nowInSeconds;
}

export function getAuthStatus(): AuthStatus {
  const token = getStoredJwtToken();
  const expiresAt = token ? getJwtExp(token) : null;

  return {
    isLoggedIn: isJwtValid(token),
    token,
    expiresAt,
  };
}

function notifyAuthChanged() {
  if (!isBrowser) {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATED_EVENT));
}

export function setStoredJwtToken(token: string, key: (typeof AUTH_TOKEN_KEYS)[number] = "auth_jwt") {
  if (!isBrowser) {
    return;
  }

  localStorage.setItem(key, token);
  notifyAuthChanged();
}

export function setStoredAuthSession({
  accessToken,
  refreshToken,
  user,
  persist = true,
}: {
  accessToken: string;
  refreshToken?: string | null;
  user?: StoredAuthUser | null;
  persist?: boolean;
}) {
  if (!isBrowser) {
    return;
  }

  const targetStorage = persist ? localStorage : sessionStorage;
  const otherStorage = persist ? sessionStorage : localStorage;

  for (const key of AUTH_TOKEN_KEYS) {
    targetStorage.removeItem(key);
    otherStorage.removeItem(key);
  }

  for (const key of AUTH_REFRESH_TOKEN_KEYS) {
    targetStorage.removeItem(key);
    otherStorage.removeItem(key);
  }

  targetStorage.setItem("auth_jwt", accessToken);

  if (refreshToken) {
    targetStorage.setItem("auth_refresh_token", refreshToken);
  }

  if (user) {
    targetStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    targetStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  otherStorage.removeItem(AUTH_USER_STORAGE_KEY);

  notifyAuthChanged();
}

export function clearStoredJwtToken() {
  if (!isBrowser) {
    return;
  }

  for (const storage of [sessionStorage, localStorage]) {
    for (const key of AUTH_TOKEN_KEYS) {
      storage.removeItem(key);
    }

    for (const key of AUTH_REFRESH_TOKEN_KEYS) {
      storage.removeItem(key);
    }

    storage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  notifyAuthChanged();
}

export function addAuthStatusListener(listener: () => void) {
  if (!isBrowser) {
    return () => {};
  }

  window.addEventListener("storage", listener);
  window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, listener);
  };
}
