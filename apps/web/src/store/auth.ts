import { create } from 'zustand';
import { LoginResponse } from '@crm/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  usuario: LoginResponse['usuario'] | null;
  setSesion: (data: LoginResponse) => void;
  logout: () => void;
}

// TODO(seguridad, sección 10): localStorage es legible por cualquier script
// que corra en la página (riesgo de robo de token vía XSS). Evaluar mover a
// cookie httpOnly + SameSite antes de producción.
const STORAGE_KEY = 'crm_auth';

function cargarInicial(): Pick<AuthState, 'accessToken' | 'refreshToken' | 'usuario'> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { accessToken: null, refreshToken: null, usuario: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { accessToken: null, refreshToken: null, usuario: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...cargarInicial(),
  setSesion: (data) => {
    const sesion = { accessToken: data.accessToken, refreshToken: data.refreshToken, usuario: data.usuario };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    set(sesion);
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, usuario: null });
  },
}));
