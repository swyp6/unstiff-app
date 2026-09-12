import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// KeyboardAvoidingView는 Modal + 애니메이션 transform으로 겹겹이 싸인
// 바텀시트 구조에서는 패딩 계산이 씹혀서 못 미덥다 — 실제 키보드 높이를
// Keyboard API로 직접 추적해서 쓴다.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
