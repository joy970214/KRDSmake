import type { Device } from "./types";

// iframe 미리보기 폭(px). pc=null=가변(CSS max-width:1200px).
// KRDS 브레이크포인트: small 360~ / medium 768~ / large 1024~.
export const DEVICE_WIDTH: Record<Device, number | null> = {
  pc: null,
  tablet: 768,
  mobile: 360,
};
