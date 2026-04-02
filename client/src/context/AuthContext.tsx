/**
 * src/context/AuthContext.tsx
 * Global auth state — provides token + username to the whole app.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAuth, loadAuth, saveAuth } from '../api/client';

interface AuthState {
  token: string | null;
  username: string | null;
  isLoading: boolean;
  signIn: (token: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  username: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    loadAuth().then((auth) => {
      if (auth) {
        setToken(auth.token);
        setUsername(auth.username);
      }
      setIsLoading(false);
    });
  }, []);

  const signIn = async (newToken: string, newUsername: string) => {
    await saveAuth(newToken, newUsername);
    setToken(newToken);
    setUsername(newUsername);
  };

  const signOut = async () => {
    await clearAuth();
    setToken(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
