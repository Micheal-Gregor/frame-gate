/**
 * PREVIEW ONLY (Phase 5, Simulate 2): invented stand-in images. The library owns no media; the
 * app would keep each take's image in its own store, keyed by the take. These drawings stand in
 * for the images a person brings in - nothing here is engine data.
 */
export type Look = "mara" | "mara-off" | "wide" | "reaction";

const svg = (body: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">${body}</svg>`)}`;

/** A kitchen frame with Mara in it, varied by take so no two look alike. */
export function still(look: Look, seed: number): string {
  const hue = 28 + ((seed * 37) % 24);
  const dx = ((seed * 13) % 17) - 8;
  const wall = `<rect width="160" height="100" fill="hsl(${hue},38%,${look === "wide" ? 30 : 42}%)"/>`;
  const window = `<rect x="${look === "reaction" ? 98 : 112}" y="12" width="34" height="40" rx="2" fill="hsl(210,45%,${70 - (seed % 3) * 6}%)" opacity=".85"/><path d="M${look === "reaction" ? 115 : 129} 12v40M${look === "reaction" ? 98 : 112} 32h34" stroke="hsl(${hue},30%,28%)" stroke-width="2"/>`;
  if (look === "wide") {
    return svg(`${wall}${window}<rect x="0" y="70" width="160" height="30" fill="hsl(${hue},25%,22%)"/><rect x="20" y="58" width="70" height="14" fill="hsl(${hue},18%,62%)"/><circle cx="${58 + dx}" cy="44" r="6" fill="#3a2a22"/><rect x="${52 + dx}" y="50" width="12" height="20" rx="4" fill="#3f6b4a"/>`);
  }
  const jaw = look === "mara-off" ? 17 : 13;
  const cx = 70 + dx;
  return svg(
    `${wall}${window}` +
      `<path d="M${cx - 34} 100 Q${cx} 64 ${cx + 34} 100Z" fill="#3f6b4a"/>` +
      `<ellipse cx="${cx}" cy="52" rx="${jaw}" ry="19" fill="hsl(24,48%,${66 - (seed % 4) * 2}%)"/>` +
      `<path d="M${cx - 18} 50 Q${cx - 20} 26 ${cx} 28 Q${cx + 22} 26 ${cx + 19} 52 Q${cx + 12} 36 ${cx} 37 Q${cx - 10} 36 ${cx - 18} 50Z" fill="#2c1d17"/>` +
      `<circle cx="${cx - 5}" cy="51" r="1.6" fill="#1d1410"/><circle cx="${cx + 6}" cy="51" r="1.6" fill="#1d1410"/>` +
      (look === "reaction" ? `<path d="M${cx - 5} 62h10" stroke="#5b2f27" stroke-width="1.6"/>` : `<path d="M${cx - 5} 61q5 4 10 0" stroke="#5b2f27" stroke-width="1.6" fill="none"/>`),
  );
}
