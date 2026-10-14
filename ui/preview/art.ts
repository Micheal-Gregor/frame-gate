/**
 * PREVIEW ONLY (Phase 5, Simulate 3): invented stand-in pictures and a stand-in clip. The library
 * owns no media; a take's image or a clip's video is the file a person brought in.
 */
export type Look = "mara" | "mara-off" | "reaction";

const svg = (body: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">${body}</svg>`)}`;

function scene(look: Look, n: number, motion: string): string {
  const hue = 28 + ((n * 37) % 24);
  const dx = ((n * 13) % 17) - 8;
  const wx = look === "reaction" ? 98 : 112;
  const jaw = look === "mara-off" ? 17 : 13;
  const cx = 70 + dx;
  return (
    `<rect width="160" height="100" fill="hsl(${hue},38%,42%)"/>` +
    `<rect x="${wx}" y="12" width="34" height="40" rx="2" fill="hsl(210,45%,${70 - (n % 3) * 6}%)" opacity=".85"/><path d="M${wx + 17} 12v40M${wx} 32h34" stroke="hsl(${hue},30%,28%)" stroke-width="2"/>` +
    `<g>${motion}<path d="M${cx - 34} 100 Q${cx} 64 ${cx + 34} 100Z" fill="#3f6b4a"/>` +
    `<ellipse cx="${cx}" cy="52" rx="${jaw}" ry="19" fill="hsl(24,48%,${66 - (n % 4) * 2}%)"/>` +
    `<path d="M${cx - 18} 50 Q${cx - 20} 26 ${cx} 28 Q${cx + 22} 26 ${cx + 19} 52 Q${cx + 12} 36 ${cx} 37 Q${cx - 10} 36 ${cx - 18} 50Z" fill="#2c1d17"/>` +
    `<circle cx="${cx - 5}" cy="51" r="1.6" fill="#1d1410"/><circle cx="${cx + 6}" cy="51" r="1.6" fill="#1d1410"/>` +
    (look === "reaction" ? `<path d="M${cx - 5} 62h10" stroke="#5b2f27" stroke-width="1.6"/>` : `<path d="M${cx - 5} 61q5 4 10 0" stroke="#5b2f27" stroke-width="1.6" fill="none"/>`) +
    `</g>`
  );
}

/** A still: one frame. */
export const still = (look: Look, n: number): string => svg(scene(look, n, ""));

/** A clip: the same frame, moving - Mara turns toward the window on a slow push-in (it loops). */
export const clip = (n: number): string =>
  svg(scene("mara", n, `<animateTransform attributeName="transform" type="translate" values="0 0; 9 -2; 0 0" dur="4s" repeatCount="indefinite"/>`));
