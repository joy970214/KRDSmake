// 레지스트리 공용 헬퍼

// HTML 특수문자 이스케이프 (익스포트 문자열 안전)
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 속성값 이스케이프(따옴표 컨텍스트)
export function attr(value: unknown): string {
  return escapeHtml(value);
}

// 공식 컴포넌트 썸네일 경로 (manifest 번호 기준)
export function thumb(n: number): string {
  const nn = String(n).padStart(2, "0");
  return `/krds-thumbnails/img/img_guide_component_${nn}.png`;
}

// Vue/React 익스포트는 2차(설계 §9.2). 타입에는 존재, 호출 시 명확히 실패.
export function pending2x(framework: "vue" | "react"): never {
  throw new Error(`${framework} 익스포트는 2차에서 구현 예정 (설계 §9.2)`);
}
