import { EstadoDisponibilidad, EstadoLead, Rol, Temperatura, TipoCanal } from './enums';

export interface Tenant {
  id: string;
  nombre: string;
  marcas: string[];
  plan: string;
  fechaAlta: string;
}

export interface Usuario {
  id: string;
  tenantId: string;
  nombre: string;
  dni: string;
  telefono: string;
  sector: string;
  usuario: string;
  rol: Rol;
  estadoDisponibilidad: EstadoDisponibilidad;
  fechaAlta: string;
}

export interface Canal {
  id: string;
  tenantId: string;
  tipo: TipoCanal;
  activo: boolean;
}

export interface Lead {
  id: string;
  tenantId: string;
  telefono: string;
  nombre: string | null;
  canalOrigenId: string;
  fechaPrimerContacto: string;
  score: number;
  temperatura: Temperatura;
  estado: EstadoLead;
  vendedorAsignadoId: string | null;
  fechaAsignacion: string | null;
  timerVenceEn: string | null;
}

export interface LeadEvento {
  id: string;
  leadId: string;
  usuarioId: string;
  accion: string;
  detalle: string | null;
  timestamp: string;
}

export interface ScoringRegla {
  id: string;
  tenantId: string;
  campo: string;
  condicion: string;
  peso: number;
}

export interface Venta {
  id: string;
  leadId: string;
  vendedorId: string;
  auto: string;
  modelo: string;
  plan: string;
  cuota: number | null;
  monto: number;
  fecha: string;
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: string;
  payload: Record<string, unknown>;
  leido: boolean;
  timestamp: string;
}
