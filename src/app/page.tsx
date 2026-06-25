import { AppRoot } from "../components/AppRoot";

// 단일 라우트(/)에서 에디터가 동작 — 설계 §2. 에디터 전체는 클라이언트 전용.
export default function Home() {
  return <AppRoot />;
}
