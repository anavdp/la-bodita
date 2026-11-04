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

/** Renames the signed-in user. Only the name: the email is their Google sign-in. */
export async function updateDisplayName(displayName: string): Promise<SignedInUser> {
  const payload = await request<SignedInUserPayload>("/api/auth/me", {
    method: "PATCH",
    body: { display_name: displayName },
  });
  return { email: payload.email, displayName: payload.display_name };
}

export function signOut(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

/** Where the login button sends the browser: the API takes it on to Google and back. */
export function googleSignInUrl(): string {
  return apiUrl("/api/auth/google/start");
}

export interface PhoneKeyStatus {
  /** When the share Shortcut's key was made, or null while there is none. */
  createdAt: string | null;
}

export async function getPhoneKey(): Promise<PhoneKeyStatus> {
  const payload = await request<{ created_at: string | null }>("/api/auth/phone-key");
  return { createdAt: payload.created_at };
}

/** A new key for the iPhone share Shortcut, shown this once; the old one stops working. */
export async function makePhoneKey(): Promise<string> {
  const payload = await request<{ key: string }>("/api/auth/phone-key", { method: "POST" });
  return payload.key;
}

export function removePhoneKey(): Promise<void> {
  return request<void>("/api/auth/phone-key", { method: "DELETE" });
}
