import ExpoModulesCore
import KakaoMapsSDK
import UIKit

final class KakaoMapView: ExpoView, MapControllerDelegate {
  private var viewContainer: KMViewContainer?
  private var controller: KMController?
  private var isPrepared = false
  private var didAddMapView = false
  private var isObservingApplicationLifecycle = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
  }

  deinit {
    removeApplicationLifecycleObservers()
    controller?.pauseEngine()
    controller?.resetEngine()
  }

  override func layoutSubviews() {
    super.layoutSubviews()

    viewContainer?.frame = bounds
    startEngineIfPossible()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    if window != nil {
      addApplicationLifecycleObservers()
      startEngineIfPossible()
    } else {
      removeApplicationLifecycleObservers()
      stopEngine()
    }
  }

  func addViews() {
    guard !didAddMapView else {
      return
    }

    didAddMapView = true

    let position = MapPoint(longitude: 126.978365, latitude: 37.566691)
    let mapViewInfo = MapviewInfo(
      viewName: "mapview",
      viewInfoName: "map",
      defaultPosition: position,
      defaultLevel: 17
    )

    controller?.addView(mapViewInfo)
  }

  func authenticationFailed(_ errorCode: Int, desc: String) {
    print("[KakaoMap] authentication failed")
  }

  func addViewSucceeded(_ viewName: String, viewInfoName: String) {
    print("[KakaoMap] map view added")
  }

  func addViewFailed(_ viewName: String, viewInfoName: String) {
    print("[KakaoMap] add view failed")
  }

  func containerDidResized(_ size: CGSize) {
    guard let mapView = controller?.getView("mapview") as? KakaoMap else {
      return
    }

    mapView.viewRect = CGRect(origin: .zero, size: size)
  }

  private func startEngineIfPossible() {
    guard window != nil, bounds.width > 0, bounds.height > 0 else {
      return
    }

    if viewContainer == nil {
      let container = KMViewContainer(frame: bounds)
      container.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      addSubview(container)
      viewContainer = container
    }

    guard let viewContainer else {
      return
    }

    if controller == nil {
      controller = KMController(viewContainer: viewContainer)
      controller?.delegate = self
    }

    guard let controller else {
      return
    }

    if !isPrepared {
      isPrepared = controller.prepareEngine()

      if !isPrepared {
        print("[KakaoMap] engine preparation failed")
        return
      }
    }

    if UIApplication.shared.applicationState == .active, !controller.isEngineActive {
      controller.activateEngine()
    }
  }

  private func stopEngine() {
    if controller?.isEngineActive == true {
      controller?.pauseEngine()
    }

    if controller != nil {
      controller?.resetEngine()
      isPrepared = false
      didAddMapView = false
      controller = nil
      viewContainer?.removeFromSuperview()
      viewContainer = nil
    }
  }

  private func addApplicationLifecycleObservers() {
    guard !isObservingApplicationLifecycle else {
      return
    }

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationWillResignActive),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    isObservingApplicationLifecycle = true
  }

  private func removeApplicationLifecycleObservers() {
    guard isObservingApplicationLifecycle else {
      return
    }

    NotificationCenter.default.removeObserver(
      self,
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    NotificationCenter.default.removeObserver(
      self,
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    isObservingApplicationLifecycle = false
  }

  @objc private func applicationWillResignActive() {
    if controller?.isEngineActive == true {
      controller?.pauseEngine()
    }
  }

  @objc private func applicationDidBecomeActive() {
    startEngineIfPossible()
  }
}
