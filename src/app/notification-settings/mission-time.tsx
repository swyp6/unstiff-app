// 위 index.tsx와 같은 이유로 필요한 root Stack 사본. 알림 설정의 "미션 수신
// 시간" 행이 여기로 오지 않고 /mypage/settings/mission-time으로 가면, 이 흐름이
// 피하려던 마이페이지 탭 Stack 덮어쓰기가 그대로 다시 일어난다.
export { default } from "../(tabs)/mypage/settings/mission-time";
