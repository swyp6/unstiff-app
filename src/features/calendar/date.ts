// 서버 CalendarDay.date가 "YYYY-MM-DD" 로컬 날짜 문자열이므로, UTC 변환이
// 섞이는 toISOString() 대신 로컬 필드로 같은 포맷의 키를 만들어 그대로 비교한다.
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 로컬 자정 기준으로 days만큼 더한 날짜 — Date 생성자가 월/일 넘침을 알아서
// 정규화하므로 월말·연말·DST를 따로 다루지 않아도 되고, toISOString처럼 UTC로
// 바뀌어 한국 시간 자정 부근에 날짜가 어긋나는 일도 없다.
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
