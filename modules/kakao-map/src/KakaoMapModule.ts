import { NativeModule, requireNativeModule } from "expo";

declare class KakaoMapModule extends NativeModule<{}> {
  initialize(): Promise<boolean>;
}

export default requireNativeModule<KakaoMapModule>("KakaoMap");
