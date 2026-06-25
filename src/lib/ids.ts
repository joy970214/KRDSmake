// 고유 id 생성. 브라우저·Node 22 모두 crypto.randomUUID 지원.
export function newId(): string {
  return crypto.randomUUID();
}
