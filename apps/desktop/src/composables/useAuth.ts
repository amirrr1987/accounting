import { computed, ref } from "vue";
import { AuthUserSchema, type AuthUser } from "@hesabyar/shared";

const TOKEN_KEY = "hesabyar-access-token";
const USER_KEY = "hesabyar-auth-user";
const SESSION_KEY = "hesabyar-session-id";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const token = ref<string | null>(storageGet(TOKEN_KEY));
const sessionId = ref<string | null>(storageGet(SESSION_KEY));
const user = ref<AuthUser | null>(readUser());

function readUser(): AuthUser | null {
  const raw = storageGet(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = AuthUserSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(token.value));

  function setSession(
    accessToken: string,
    nextUser: AuthUser,
    nextSessionId: string,
  ): void {
    const userParsed = AuthUserSchema.parse(nextUser);
    token.value = accessToken;
    user.value = userParsed;
    sessionId.value = nextSessionId;
    storageSet(TOKEN_KEY, accessToken);
    storageSet(USER_KEY, JSON.stringify(userParsed));
    storageSet(SESSION_KEY, nextSessionId);
  }

  function clearSession(): void {
    token.value = null;
    user.value = null;
    sessionId.value = null;
    storageRemove(TOKEN_KEY);
    storageRemove(USER_KEY);
    storageRemove(SESSION_KEY);
  }

  function getToken(): string | null {
    return token.value;
  }

  return {
    token,
    sessionId,
    user,
    isAuthenticated,
    setSession,
    clearSession,
    getToken,
  };
}
