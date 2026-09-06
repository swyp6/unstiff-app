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
