import { api } from './api';

export function soportaPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// PushManager.subscribe pide la VAPID public key como Uint8Array, no como el
// base64url que devuelve la API — conversión estándar de la web push spec.
function base64UrlAUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (!soportaPush()) return null;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/** Pide permiso (si hace falta) y da de alta la suscripción en el backend. */
export async function activarPush(): Promise<'activado' | 'rechazado' | 'no_soportado'> {
  if (!soportaPush()) return 'no_soportado';

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return 'rechazado';

  const registration = await navigator.serviceWorker.register('/sw.js');
  const { publicKey } = await api.get<{ publicKey: string | null }>('/notificaciones/push/vapid-public-key');
  if (!publicKey) return 'no_soportado';

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlAUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  await api.post('/notificaciones/push/suscripcion', { endpoint: json.endpoint, keys: json.keys });
  return 'activado';
}

export async function desactivarPush(): Promise<void> {
  const subscription = await suscripcionActual();
  if (!subscription) return;
  await api.del('/notificaciones/push/suscripcion', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
