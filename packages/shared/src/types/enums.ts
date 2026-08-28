// Enums espejo de los constraints de la base (ver arquitectura-crm-concesionarias.md, sección 4).
// Nombres de miembro en minúscula a propósito: son iguales a los enums nativos
// que genera Prisma desde schema.prisma, así que un valor devuelto por Prisma
// (ej. lead.estado) es directamente comparable/asignable sin mapear casing.

export enum Rol {
  VENDEDOR = 'vendedor',
  SUPERVISOR = 'supervisor',
  CEO = 'ceo',
}

export enum EstadoDisponibilidad {
  disponible = 'disponible',
  en_salon = 'en_salon',
  en_llamada = 'en_llamada',
  offline = 'offline',
}

export enum TipoCanal {
  instagram = 'instagram',
  whatsapp = 'whatsapp',
  web = 'web',
}

export enum Temperatura {
  caliente = 'caliente',
  tibio = 'tibio',
  frio = 'frio',
}

export enum EstadoLead {
  en_bolsa = 'en_bolsa',
  asignado = 'asignado',
  contactado = 'contactado',
  vendido = 'vendido',
  perdido = 'perdido',
}
