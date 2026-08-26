import { NativeModule, requireNativeModule } from "expo";

declare class KakaoMapModule extends NativeModule<{}> {}

export default requireNativeModule<KakaoMapModule>("KakaoMap");
