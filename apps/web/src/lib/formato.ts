// Los montos de Decimal(12,2) de Postgres llegan del backend como STRING en
// el JSON (Prisma.Decimal serializa a texto, no a number) — `.toLocaleString()`
// sobre un string no formatea nada, solo devuelve el string tal cual. Por eso
// hay que pasar siempre por Number() antes de formatear.
export function formatearMonto(valor: number | string): string {
  return new Intl.NumberFormat('es-AR').format(Number(valor));
}
