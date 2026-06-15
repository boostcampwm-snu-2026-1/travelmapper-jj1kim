// 비용 계산 유틸.

/** 인당 비용. 참여자 수가 0 이하이면 NaN/Infinity 대신 0을 반환한다. */
export function perPerson(totalCost: number, participantCount: number): number {
  if (!Number.isFinite(totalCost) || participantCount <= 0) return 0;
  return Math.floor(totalCost / participantCount);
}
