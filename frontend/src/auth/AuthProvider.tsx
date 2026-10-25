import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { getSignedInUser, signOut as endSession, updateDisplayName } from "../api/auth";
import { onUnauthorized } from "../api/client";
import type { SignedInUser } from "../api/types";

export type AuthStatus = "checking" | "signedIn" | "signedOut";

export interface AuthContextValue {
  status: AuthStatus;
  user: SignedInUser | null;
  signOut: () => Promise<void>;
  /** Renames the signed-in user everywhere the planner shows them. */
  saveDisplayName: (displayName: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Who is signed in to the planner. Asks the API once on load, and goes back to
 * signed out whenever any call answers 401, so an expired session lands on the
 * login page instead of a screen of errors.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: SignedInUser | null }>({
    status: "checking",
    user: null,
  });

  useEffect(() => {
    let active = true;
    getSignedInUser()
      .then((user) => active && setState({ status: "signedIn", user }))
      // A 401, or an API that cannot be reached: either way the planner stays closed.
      .catch(() => active && setState({ status: "signedOut", user: null }));
    const stopListening = onUnauthorized(() => setState({ status: "signedOut", user: null }));
    return () => {
      active = false;
      stopListening();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await endSession();
    } finally {
      setState({ status: "signedOut", user: null });
    }
  }, []);

  const saveDisplayName = useCallback(async (displayName: string) => {
    const user = await updateDisplayName(displayName);
    setState({ status: "signedIn", user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signOut, saveDisplayName }),
    [state, signOut, saveDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return value;
}

/** The planner's routes: shown only to a signed-in user, everyone else goes to the login page. */
export function RequireSignIn() {
  const { status } = useAuth();
  if (status === "checking") {
    return <div className="min-h-screen bg-cream" />;
  }
  return status === "signedIn" ? <Outlet /> : <Navigate to="/login" replace />;
}
