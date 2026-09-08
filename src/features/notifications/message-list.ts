import type { PushMessageResponse } from "./types";

// Figma 3452:37071 — 섹션 사이 26, 섹션 제목과 첫 행 사이 10, 행 사이 8.
const SECTION_GAP = 26;
const SECTION_TITLE_GAP = 10;
const ROW_GAP = 8;

// 오늘 온 알림에 붙는 "오전 7:00" — 채팅 화면과 같은 Intl 포맷을 쓴다.
const TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
});

// sentAt은 timezone offset이 붙은 date-time 문자열이라 문자열 앞부분을 잘라
// 비교하면 안 된다 — Date로 파싱한 뒤 사용자의 local calendar date로 비교한다.
function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 오늘이면 "오전 7:00", 그 이전이면 "8월 24일".
export function formatSentAt(sentAt: string, now: Date) {
  const sent = new Date(sentAt);
  if (Number.isNaN(sent.getTime())) return "";
  if (isSameLocalDay(sent, now)) return TIME_FORMATTER.format(sent);
  return `${sent.getMonth() + 1}월 ${sent.getDate()}일`;
}

// 섹션 제목과 알림 카드를 하나의 FlatList로 흘려보내기 위한 항목. 간격은
// 리스트를 만들 때 계산해두고 렌더링에서는 marginTop으로만 쓴다.
export type NotificationListEntry =
  | { key: string; kind: "section"; spacingTop: number; title: string }
  | {
      key: string;
      kind: "message";
      message: PushMessageResponse;
      spacingTop: number;
      timeLabel: string;
    };

// 서버가 최신순으로 내려주므로 순서를 유지한 채 오늘/이전으로만 가른다.
export function buildNotificationListEntries(
  messages: PushMessageResponse[],
  now: Date,
): NotificationListEntry[] {
  const today: PushMessageResponse[] = [];
  const earlier: PushMessageResponse[] = [];

  for (const message of messages) {
    const sent = new Date(message.sentAt);
    const isToday = !Number.isNaN(sent.getTime()) && isSameLocalDay(sent, now);
    (isToday ? today : earlier).push(message);
  }

  const entries: NotificationListEntry[] = [];
  const groups = [
    { title: "오늘", messages: today },
    { title: "이전", messages: earlier },
  ] as const;

  for (const group of groups) {
    if (group.messages.length === 0) continue;

    entries.push({
      key: `section-${group.title}`,
      kind: "section",
      spacingTop: entries.length === 0 ? 0 : SECTION_GAP,
      title: group.title,
    });

    group.messages.forEach((message, index) => {
      entries.push({
        key: `message-${message.id}`,
        kind: "message",
        message,
        spacingTop: index === 0 ? SECTION_TITLE_GAP : ROW_GAP,
        timeLabel: formatSentAt(message.sentAt, now),
      });
    });
  }

  return entries;
}

// 다음 페이지를 이어 붙인다 — 이미 가진 id는 건너뛰어 중복 행이 생기지 않게 한다.
export function appendUniqueMessages(
  current: PushMessageResponse[],
  incoming: PushMessageResponse[],
) {
  const knownIds = new Set(current.map((message) => message.id));
  const added = incoming.filter((message) => !knownIds.has(message.id));
  return added.length === 0 ? current : [...current, ...added];
}
