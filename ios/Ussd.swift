import Foundation
import UIKit // Required for UIApplication

@objc(Ussd)
class Ussd: NSObject, RCTBridgeModule {

  @objc
  static func moduleName() -> String! {
    return "Ussd"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true // Or false depending on whether UI operations are involved directly at init
  }

  @objc(dial:)
  func dial(ussdCode: String) -> Void {
    print("USSD code received: \(ussdCode)")
    guard let url = URL(string: "tel:\(ussdCode.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? "")") else {
      print("Error: Could not create URL from ussdCode: \(ussdCode)")
      return
    }

    DispatchQueue.main.async { // Ensure UI operations are on the main thread
      if UIApplication.shared.canOpenURL(url) {
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
      } else {
        print("Error: Cannot open URL for USSD code: \(url.absoluteString)")
        // Consider sending an event/callback to JS about the failure
      }
    }
  }

  // Needed for NativeEventEmitter, even if not used directly in this module's Swift code yet.
  // If UssdEventEmitter is used in JS, these methods are required.
  @objc(supportedEvents)
  func supportedEvents() -> [String]! {
    return ["ussdEvent"] // Example: match event name from Android side or JS usage
  }

  // Placeholder for startObserving (required if supportedEvents returns non-empty)
  @objc(startObserving)
  func startObserving() {
    // Usually, you would set up listeners here if this module were to emit events.
    // For now, it can be empty if events are only sent from JS to native.
  }

  // Placeholder for stopObserving (required if supportedEvents returns non-empty)
  @objc(stopObserving)
  func stopObserving() {
    // Clean up listeners
  }
}
