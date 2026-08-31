import { create } from 'zustand';
import { LoginResponse } from '@crm/shared';

interface AuthState {
  accessToken: string | null;
  usuario: LoginResponse['usuario'] | null;
  setSesion: (data: LoginResponse) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

// El refresh token vive en una cookie httpOnly (ver auth.controller.ts) —
// nunca pasa por acá, así que un XSS no puede robarlo leyendo localStorage.
// El access token (vida corta, 15min) queda solo en memoria: se resuelve al
// vuelo con un refresh silencioso (api.ts) la primera vez que hace falta
// después de recargar la página, en vez de persistirse.
const STORAGE_KEY = 'crm_auth_usuario';

function cargarUsuarioInicial(): LoginResponse['usuario'] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  usuario: cargarUsuarioInicial(),
  setSesion: (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.usuario));
    set({ accessToken: data.accessToken, usuario: data.usuario });
  },
  // Usado por el refresh automático (api.ts) cuando el access token vence.
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, usuario: null });
  },
}));
