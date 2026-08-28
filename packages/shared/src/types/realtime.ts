import { Lead } from './entities';

// Nombres de evento del gateway de sockets (ver sección 7). Compartidos entre
// apps/api (emisor) y apps/web (listener) para que no se desincronicen los strings.
export enum SocketEvent {
  LEAD_NUEVO = 'lead:nuevo',
  LEAD_LIBERADO = 'lead:liberado',
  LEAD_ASIGNADO = 'lead:asignado',
}

export interface LeadNuevoPayload {
  lead: Lead;
}

export interface LeadLiberadoPayload {
  lead: Lead;
  motivo: 'timeout' | 'sin_contacto';
}

export interface LeadAsignadoPayload {
  lead: Lead;
  vendedorId: string;
  automatico: boolean;
}
