import { apiRequest, ApiError } from "@/lib/api";

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface GoogleLoginPayload {
  id_token: string;
}

export interface GoogleLoginResponse extends LoginResponse {
  user: AuthUser;
}

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function signup(payload: SignupPayload) {
  return apiRequest<{ message: string }>("/auth/signup/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginWithGoogle(payload: GoogleLoginPayload) {
  return apiRequest<GoogleLoginResponse>("/auth/oauth/google/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string) {
  return apiRequest<AuthUser>("/auth/me/", {
    method: "GET",
    token,
  });
}

export async function signupAndLogin(payload: SignupPayload) {
  await signup(payload);
  const tokens = await login({
    email: payload.email,
    password: payload.password,
  });
  const user = await getCurrentUser(tokens.access);

  return { ...tokens, user };
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    const { data, message } = error;

    if (typeof data === "object" && data !== null) {
      const fieldErrors = Object.values(data)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string");

      if (fieldErrors.length > 0) {
        return fieldErrors.join(" ");
      }
    }

    return message || fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
