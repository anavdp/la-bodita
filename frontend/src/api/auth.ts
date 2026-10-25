import { apiUrl, request } from "./client";
import type { SignedInUser } from "./types";

interface SignedInUserPayload {
  email: string;
  display_name: string;
}

/** Who this browser is signed in as; rejects with a 401 ApiError when no one is. */
export async function getSignedInUser(): Promise<SignedInUser> {
  const payload = await request<SignedInUserPayload>("/api/auth/me");
  return { email: payload.email, displayName: payload.display_name };
}

export function signOut(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

/** Where the login button sends the browser: the API takes it on to Google and back. */
export function googleSignInUrl(): string {
  return apiUrl("/api/auth/google/start");
}
