import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** Conecta y se une a la sala del tenant del usuario (ver notificaciones.gateway.ts → handleJoin). */
export function conectarSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io({ path: '/socket.io' });
  socket.on('connect', () => socket?.emit('join', accessToken));
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}
