// 고유 id 생성.
// 주의: crypto.randomUUID()는 "보안 컨텍스트"(HTTPS/localhost)에서만 제공된다.
// HTTP + 외부 IP로 접속하면 undefined → 여기서 getRandomValues 폴백으로 UUIDv4 생성.
export function newId(): string {
  const c: Crypto | undefined = globalThis.crypto;

  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }

  if (typeof c?.getRandomValues === "function") {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }

  // 최후 폴백(crypto 자체가 없는 환경)
  return `id-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}
