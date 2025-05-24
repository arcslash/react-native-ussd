import Foundation
import UIKit // Required for UIApplication
import CoreTelephony // For CTTelephonyNetworkInfo

@objc(Ussd)
class Ussd: NSObject, RCTBridgeModule {

  @objc
  static func moduleName() -> String! {
    return "Ussd"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    // UI operations (opening URL) are dispatched to main queue.
    // If setup itself doesn't need main queue, can be false.
    // For UIApplication.shared, true is safer.
    return true 
  }

  @objc(dial:subscriptionId:resolver:rejecter:)
  func dial(ussdCode: String, subscriptionId: NSNumber?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // subscriptionId is ignored for dialing on iOS as SIM selection is handled by the OS.
    print("USSD code received: \(ussdCode), subscriptionId (ignored): \(subscriptionId?.stringValue ?? "nil")")

    let formattedUssd = ussdCode.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? ussdCode
    guard let url = URL(string: "tel:\(formattedUssd)") else {
      reject("ERROR_INVALID_URL", "Could not create URL for USSD code: \(ussdCode)", nil)
      return
    }

    DispatchQueue.main.async {
      if UIApplication.shared.canOpenURL(url) {
        UIApplication.shared.open(url, options: [:]) { success in
          if success {
            print("Successfully opened URL: \(url.absoluteString)")
            resolve(nil) // Successfully initiated the call
          } else {
            print("Failed to open URL: \(url.absoluteString)")
            reject("ERROR_CANNOT_OPEN_URL", "Could not open dialer for USSD code, openURL returned false.", nil)
          }
        }
      } else {
        print("Cannot open URL (canOpenURL failed): \(url.absoluteString)")
        reject("ERROR_CANNOT_OPEN_URL", "Cannot open tel: URL scheme (dialer not available or permission issue).", nil)
      }
    }
  }

  @objc(getSimInfo:rejecter:)
  func getSimInfo(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let networkInfo = CTTelephonyNetworkInfo()
      var simInfos: [[String: Any?]] = [] // Using Any? for values to allow nil for phoneNumber
      var slotIndexCounter = 0

      if #available(iOS 12.0, *) {
          // serviceSubscriberCellularProviders provides a dictionary of [String: CTCarrier]
          // The keys are persistent per-carrier identifiers.
          if let providers = networkInfo.serviceSubscriberCellularProviders {
              if providers.isEmpty && networkInfo.subscriberCellularProvider != nil {
                  // Sometimes on dual-sim phones, providers can be empty but the older API has info.
                  // This typically happens if one SIM is disabled or if there are provisioning issues.
                  // Fallback to subscriberCellularProvider if providers is empty but the old API has data.
                  if let carrier = networkInfo.subscriberCellularProvider, carrier.carrierName != nil {
                      var simData: [String: Any?] = [:]
                      simData["slotIndex"] = 0
                      simData["subscriptionId"] = 0 // Using slotIndex as subscriptionId for iOS
                      simData["carrierName"] = carrier.carrierName
                      simData["countryIso"] = carrier.isoCountryCode
                      simData["mobileCountryCode"] = carrier.mobileCountryCode
                      simData["mobileNetworkCode"] = carrier.mobileNetworkCode
                      simData["phoneNumber"] = nil // Phone number not available
                      simInfos.append(simData)
                  }
              } else {
                  for (_, carrier) in providers { // Key is a unique ID for the service, value is CTCarrier
                      if carrier.carrierName == nil && carrier.isoCountryCode == nil {
                          // Skip entries that seem to be empty or represent no service
                          continue
                      }
                      var simData: [String: Any?] = [:]
                      simData["slotIndex"] = slotIndexCounter
                      simData["subscriptionId"] = slotIndexCounter // Using slotIndex as subscriptionId for iOS
                      simData["carrierName"] = carrier.carrierName
                      simData["countryIso"] = carrier.isoCountryCode
                      simData["mobileCountryCode"] = carrier.mobileCountryCode
                      simData["mobileNetworkCode"] = carrier.mobileNetworkCode
                      simData["phoneNumber"] = nil // Phone number not available
                      simInfos.append(simData)
                      slotIndexCounter += 1
                  }
              }
          }
      } else {
          // Fallback for iOS versions older than 12.0 (single SIM or primary SIM)
          if let carrier = networkInfo.subscriberCellularProvider, carrier.carrierName != nil {
              var simData: [String: Any?] = [:]
              simData["slotIndex"] = 0
              simData["subscriptionId"] = 0 // Using slotIndex as subscriptionId for iOS
              simData["carrierName"] = carrier.carrierName
              simData["countryIso"] = carrier.isoCountryCode
              simData["mobileCountryCode"] = carrier.mobileCountryCode
              simData["mobileNetworkCode"] = carrier.mobileNetworkCode
              simData["phoneNumber"] = nil // Phone number not available
              simInfos.append(simData)
          }
      }
      resolve(simInfos)
  }

  // Retaining event emitter placeholders as their removal was not explicitly requested.
  @objc(supportedEvents)
  func supportedEvents() -> [String]! {
    // If UssdEventEmitter is used in JS, these methods are required.
    // Events like ussdEvent/ussdErrorEvent are sent from Android.
    // iOS doesn't get USSD results back in-app, so it might not send these.
    // However, keeping for consistency if JS side expects them.
    return ["ussdEvent", "ussdErrorEvent"] // Matching Android events
  }

  @objc(startObserving)
  func startObserving() {
    // No-op for iOS as it doesn't emit USSD response events.
  }

  @objc(stopObserving)
  func stopObserving() {
    // No-op for iOS.
  }
}
