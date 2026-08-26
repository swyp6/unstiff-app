import ExpoModulesCore
import KakaoMapsSDK

public class KakaoMapModule: Module {
  private static var isInitialized = false

  public func definition() -> ModuleDefinition {
    Name("KakaoMap")

    AsyncFunction("initialize") { () throws -> Bool in
      if KakaoMapModule.isInitialized {
        return true
      }

      guard
        let appKey = Bundle.main.object(forInfoDictionaryKey: "KakaoNativeAppKey") as? String,
        !appKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      else {
        throw Exception(
          name: "KakaoMapInitializationError",
          description: "KakaoNativeAppKey is missing or empty in the app's Info.plist."
        )
      }

      SDKInitializer.InitSDK(appKey: appKey)
      KakaoMapModule.isInitialized = true
      return true
    }.runOnQueue(.main)

    View(KakaoMapView.self) {
      Prop("latitude") { (view: KakaoMapView, latitude: Double) in
        view.latitude = latitude
      }

      Prop("longitude") { (view: KakaoMapView, longitude: Double) in
        view.longitude = longitude
      }

      Prop("level", 17) { (view: KakaoMapView, level: Int) in
        view.level = level
      }

      OnViewDidUpdateProps { (view: KakaoMapView) in
        view.applyProps()
      }
    }
  }
}
