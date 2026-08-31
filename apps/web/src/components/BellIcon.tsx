// SVG propio en vez del emoji 🔔: el emoji no hereda `color` (currentColor),
// así que ignoraba el estilo "secundario" del botón (fondo transparente,
// texto tenue que se aclara al hover) — en Windows encima se renderiza con
// un cuerpo dorado sólido que rompe la paleta neutra del resto de la app.
export function BellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5a5 5 0 0 0-5 5v2.6c0 .8-.32 1.57-.88 2.14L3 13.5h14l-1.12-1.26A3 3 0 0 1 15 10.1V7.5a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
