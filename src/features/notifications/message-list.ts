import type { PushMessageResponse } from "./types";

// Figma 3502:47594 — 섹션 사이 26, 섹션 제목과 첫 행 사이 10, 행 사이 8.
const SECTION_GAP = 26;
const SECTION_TITLE_GAP = 10;
const ROW_GAP = 8;

// 섹션 헤더가 날짜를 표기하므로 행의 시각 열에는 시각만 넣는다
// (Figma "Row / 알림" 컴포넌트 설명).
const TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
});

// sentAt은 timezone offset이 붙은 date-time 문자열이라 문자열 앞부분을 잘라
// 비교하면 안 된다 — Date로 파싱한 뒤 사용자의 local calendar date로 다룬다.
function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// 행의 시각 열: "오전 7:00".
export function formatSentTime(sentAt: string) {
  const sent = new Date(sentAt);
  if (Number.isNaN(sent.getTime())) return "";
  return TIME_FORMATTER.format(sent);
}

// 섹션 제목: 오늘이면 "오늘", 그 외에는 "8월 24일".
function formatSectionTitle(sent: Date, now: Date) {
  if (toLocalDateKey(sent) === toLocalDateKey(now)) return "오늘";
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

// 서버가 최신순으로 내려주므로 순서를 유지한 채 local 날짜가 바뀌는 지점에서만
// 섹션을 끊는다 — 오늘 / 8월 24일 / 8월 1일 …
export function buildNotificationListEntries(
  messages: PushMessageResponse[],
  now: Date,
): NotificationListEntry[] {
  const entries: NotificationListEntry[] = [];
  let currentDateKey: string | null = null;
  let isFirstInSection = false;
  // 같은 날짜 사이에 sentAt을 해석할 수 없는 항목이 끼면 같은 dateKey 섹션이
  // 다시 열릴 수 있어, 섹션 key에는 등장 순서를 함께 넣어 항상 유일하게 한다.
  let sectionIndex = 0;

  for (const message of messages) {
    const sent = new Date(message.sentAt);
    const isValidDate = !Number.isNaN(sent.getTime());
    const dateKey = isValidDate ? toLocalDateKey(sent) : "unknown";

    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey;
      isFirstInSection = true;
      // sentAt을 해석할 수 없을 때는 날짜 제목을 지어내지 않고 행만 잇는다.
      if (isValidDate) {
        entries.push({
          key: `section-${dateKey}-${sectionIndex}`,
          kind: "section",
          spacingTop: entries.length === 0 ? 0 : SECTION_GAP,
          title: formatSectionTitle(sent, now),
        });
        sectionIndex += 1;
      }
    }

    let spacingTop = ROW_GAP;
    if (entries.length === 0) {
      spacingTop = 0;
    } else if (isFirstInSection) {
      spacingTop = isValidDate ? SECTION_TITLE_GAP : SECTION_GAP;
    }

    entries.push({
      key: `message-${message.id}`,
      kind: "message",
      message,
      spacingTop,
      timeLabel: formatSentTime(message.sentAt),
    });
    isFirstInSection = false;
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
