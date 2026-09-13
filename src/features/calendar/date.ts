// 서버 CalendarDay.date가 "YYYY-MM-DD" 로컬 날짜 문자열이므로, UTC 변환이
// 섞이는 toISOString() 대신 로컬 필드로 같은 포맷의 키를 만들어 그대로 비교한다.
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
