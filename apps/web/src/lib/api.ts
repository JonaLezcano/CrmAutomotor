import { useAuthStore } from '../store/auth';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Evita que dos 401 simultáneos disparen dos refresh en paralelo: todos los
// que lleguen mientras uno está en curso esperan la misma promesa.
let refrescoEnCurso: Promise<string | null> | null = null;

async function refrescarAccessToken(): Promise<string | null> {
  if (refrescoEnCurso) return refrescoEnCurso;

  refrescoEnCurso = (async () => {
    try {
      // El refresh token viaja solo en la cookie httpOnly (nunca en JS) —
      // credentials:'include' es lo que hace que el browser la mande sola.
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;

      const { accessToken } = await res.json();
      useAuthStore.getState().setAccessToken(accessToken);
      return accessToken as string;
    } catch {
      return null;
    }
  })();

  try {
    return await refrescoEnCurso;
  } finally {
    refrescoEnCurso = null;
  }
}

async function parsearBody<T>(res: Response): Promise<T> {
  // Nest devuelve 200 (no 204) con body vacío cuando un handler no retorna
  // nada — no alcanza con chequear el status code, hay que mirar si vino
  // contenido de verdad antes de parsear como JSON.
  const texto = await res.text();
  if (!texto) return undefined as T;
  return JSON.parse(texto);
}

async function request<T>(path: string, options: RequestInit = {}, esReintento = false): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  // Access token vencido (dura 15min, sección 2): un solo reintento
  // transparente con el refresh token antes de resignarse a desloguear.
  if (res.status === 401 && !esReintento) {
    const nuevoToken = await refrescarAccessToken();
    if (nuevoToken) return request<T>(path, options, true);
    useAuthStore.getState().logout();
  } else if (res.status === 401) {
    useAuthStore.getState().logout();
  }

  if (!res.ok) {
    // El ValidationPipe del backend puede mandar varios errores a la vez
    // (uno por campo) como array de strings, no solo uno.
    const body = await parsearBody<{ message?: string | string[] }>(res).catch(() => ({ message: undefined }));
    const mensaje = Array.isArray(body.message) ? body.message.join(' — ') : body.message;
    throw new ApiError(res.status, mensaje ?? res.statusText);
  }

  return parsearBody<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body: JSON.stringify(body) }),
};
