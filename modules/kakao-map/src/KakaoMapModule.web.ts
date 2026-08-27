import { registerWebModule, NativeModule } from "expo";

// KakaoMapModule is not available on the web platform.
class KakaoMapModule extends NativeModule<{}> {}

export default registerWebModule(KakaoMapModule, "KakaoMapModule");
