// Converts between the server's "HH:mm:ss" offerTime string and the
// 12-hour {meridiem, hour12, minute} shape the wheel picker UI works with.
// Seconds are always normalized to "00" — the picker has no UI for them.
export type Meridiem = "AM" | "PM";

export type OfferTimeParts = {
  meridiem: Meridiem;
  hour12: number; // 1-12
  minute: number; // 0-59
};

export function parseOfferTime(offerTime: string): OfferTimeParts {
  const [hourStr, minuteStr] = offerTime.split(":");
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr);
  const meridiem: Meridiem = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { meridiem, hour12, minute };
}

export function formatOfferTime({
  meridiem,
  hour12,
  minute,
}: OfferTimeParts): string {
  const hour24 = (hour12 % 12) + (meridiem === "PM" ? 12 : 0);
  const hh = String(hour24).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

export function formatOfferTimeLabel(offerTime: string): string {
  const { meridiem, hour12, minute } = parseOfferTime(offerTime);
  const meridiemLabel = meridiem === "AM" ? "오전" : "오후";
  return `${meridiemLabel} ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// 오늘의 미션 카드가 아직 제공 전(NOT_OFFERED)일 때 보여주는 "오전 10시에
// 도착해요" 문구. offerTime이 없으면(서버 응답에 값이 안 실려 있는 경우)
// parseOfferTime이 예외를 던져 위 카드 표시 전체가 조용히 실패하니, 빈
// 문자열로 방어해 최소한 나머지 값은 정상 표시되게 한다.
export function formatOfferArrivalLabel(offerTime?: string | null): string {
  if (!offerTime) return "";
  const { meridiem, hour12, minute } = parseOfferTime(offerTime);
  const meridiemLabel = meridiem === "AM" ? "오전" : "오후";
  const minuteLabel = minute > 0 ? ` ${minute}분` : "";
  return `${meridiemLabel} ${hour12}시${minuteLabel}에 도착해요`;
}
