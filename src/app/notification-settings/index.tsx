// 빈 알림함의 "알림 설정 열기"로만 들어오는 root Stack 사본.
//
// 알림함(/notifications)은 root Stack 화면이라 거기서 /mypage/settings/
// notification으로 push하면 이미 아래에 떠 있는 (tabs)로 되돌아가면서 마이페이지
// 탭의 nested Stack을 그 한 화면으로 덮어쓴다. 그 Stack에는 index가 깔리지 않아
// 뒤로가기가 탭 밖(홈)으로 빠져나가고, 탭을 다시 눌러도 알림 설정이 남아 있어
// 마이페이지 첫 화면에 도달할 수 없게 된다.
//
// 그래서 이 경로에서는 같은 화면을 root Stack 위에 올린다 — 마이페이지 탭의
// Stack을 아예 건드리지 않고, 뒤로가기는 root Stack을 pop해 (tabs)의 홈으로
// 돌아간다(기존 QA 동작 유지). 설정 > 알림 설정은 그대로
// (tabs)/mypage/settings/notification을 쓴다. 화면 본체는 공유한다.
export { default } from "../(tabs)/mypage/settings/notification";
