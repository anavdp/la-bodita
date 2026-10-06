/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the API lives; empty means the same address as the app. */
  readonly VITE_API_URL?: string;
  /** The public address guests open their RSVP links on. */
  readonly VITE_PUBLIC_URL?: string;
}
