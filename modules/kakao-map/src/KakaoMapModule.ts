import { NativeModule, requireNativeModule } from "expo";

declare class KakaoMapModule extends NativeModule<{}> {
  initialize(): Promise<void>;
}

export default requireNativeModule<KakaoMapModule>("KakaoMap");
