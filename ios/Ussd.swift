import Foundation
import UIKit
import CoreTelephony
import Network

@objc(Ussd)
class Ussd: NSObject, RCTBridgeModule {

  @objc
  static func moduleName() -> String! {
    return "Ussd"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func constantsToExport() -> [AnyHashable : Any]! {
    return [
      "DEFAULT_TIMEOUT_MS": 30000,
      "TELEPHONY_FAILURE_CODES": [
        "UNKNOWN": -1,
        "NO_SERVICE": 1,
        "RADIO_OFF": 2,
        "BUSY": 3,
        "ERROR_IN_REQUEST": 4
      ]
    ]
  }

  @objc(dial:options:resolver:rejecter:)
  func dial(ussdCode: String, options: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Options are parsed but subscriptionId is ignored on iOS
    print("USSD code received: \(ussdCode), options: \(String(describing: options))")

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
            resolve(nil)
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

  @objc(sendResponse:subscriptionId:resolver:rejecter:)
  func sendResponse(response: String, subscriptionId: NSNumber?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Interactive USSD not supported on iOS
    reject("NOT_SUPPORTED", "Interactive USSD (sendResponse) is not supported on iOS", nil)
  }

  @objc(cancelSession:resolver:rejecter:)
  func cancelSession(subscriptionId: NSNumber?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Session cancellation not supported on iOS
    reject("NOT_SUPPORTED", "USSD session cancellation is not supported on iOS", nil)
  }

  @objc(getSessionState:rejecter:)
  func getSessionState(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // iOS doesn't track USSD sessions
    resolve([])
  }

  @objc(setTimeout:resolver:rejecter:)
  func setTimeout(milliseconds: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Timeout not applicable on iOS
    resolve(nil)
  }

  @objc(isNetworkAvailable:rejecter:)
  func isNetworkAvailable(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    if #available(iOS 12.0, *) {
      let monitor = NWPathMonitor()
      let queue = DispatchQueue.global(qos: .background)
      monitor.pathUpdateHandler = { path in
        resolve(path.status == .satisfied)
        monitor.cancel()
      }
      monitor.start(queue: queue)
    } else {
      // Fallback for older iOS versions
      let networkInfo = CTTelephonyNetworkInfo()
      let isAvailable = networkInfo.subscriberCellularProvider != nil
      resolve(isAvailable)
    }
  }

  @objc(getNetworkStatus:rejecter:)
  func getNetworkStatus(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let networkInfo = CTTelephonyNetworkInfo()
    var statusDict: [String: Any] = [:]

    if #available(iOS 12.0, *) {
      let monitor = NWPathMonitor()
      let queue = DispatchQueue.global(qos: .background)
      monitor.pathUpdateHandler = { path in
        statusDict["isAvailable"] = path.status == .satisfied

        // Network type detection (simplified)
        if path.usesInterfaceType(.cellular) {
          if let radioTech = networkInfo.serviceCurrentRadioAccessTechnology?.values.first {
            switch radioTech {
            case CTRadioAccessTechnologyLTE:
              statusDict["networkType"] = "LTE"
            case CTRadioAccessTechnologyNR, CTRadioAccessTechnologyNRNSA:
              statusDict["networkType"] = "5G"
            default:
              statusDict["networkType"] = "3G"
            }
          } else {
            statusDict["networkType"] = "UNKNOWN"
          }
        } else {
          statusDict["networkType"] = "UNKNOWN"
        }

        statusDict["isRoaming"] = false // Difficult to detect on iOS

        resolve(statusDict)
        monitor.cancel()
      }
      monitor.start(queue: queue)
    } else {
      statusDict["isAvailable"] = networkInfo.subscriberCellularProvider != nil
      statusDict["networkType"] = "UNKNOWN"
      statusDict["isRoaming"] = false
      resolve(statusDict)
    }
  }

  @objc(getSimInfo:rejecter:)
  func getSimInfo(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let networkInfo = CTTelephonyNetworkInfo()
      var simInfos: [[String: Any?]] = []
      var slotIndexCounter = 0

      if #available(iOS 12.0, *) {
          if let providers = networkInfo.serviceSubscriberCellularProviders {
              if providers.isEmpty && networkInfo.subscriberCellularProvider != nil {
                  if let carrier = networkInfo.subscriberCellularProvider, carrier.carrierName != nil {
                      var simData: [String: Any?] = [:]
                      simData["slotIndex"] = 0
                      simData["subscriptionId"] = 0
                      simData["carrierName"] = carrier.carrierName
                      simData["countryIso"] = carrier.isoCountryCode
                      simData["mobileCountryCode"] = carrier.mobileCountryCode
                      simData["mobileNetworkCode"] = carrier.mobileNetworkCode
                      simData["phoneNumber"] = nil
                      simData["isDefaultForCalls"] = true // Assume first SIM is default
                      simData["isDefaultForData"] = true
                      simData["isRoaming"] = false
                      simInfos.append(simData)
                  }
              } else {
                  for (_, carrier) in providers {
                      if carrier.carrierName == nil && carrier.isoCountryCode == nil {
                          continue
                      }
                      var simData: [String: Any?] = [:]
                      simData["slotIndex"] = slotIndexCounter
                      simData["subscriptionId"] = slotIndexCounter
                      simData["carrierName"] = carrier.carrierName
                      simData["countryIso"] = carrier.isoCountryCode
                      simData["mobileCountryCode"] = carrier.mobileCountryCode
                      simData["mobileNetworkCode"] = carrier.mobileNetworkCode
                      simData["phoneNumber"] = nil
                      simData["isDefaultForCalls"] = slotIndexCounter == 0
                      simData["isDefaultForData"] = slotIndexCounter == 0
                      simData["isRoaming"] = false
                      simInfos.append(simData)
                      slotIndexCounter += 1
                  }
              }
          }
      } else {
          if let carrier = networkInfo.subscriberCellularProvider, carrier.carrierName != nil {
              var simData: [String: Any?] = [:]
              simData["slotIndex"] = 0
              simData["subscriptionId"] = 0
              simData["carrierName"] = carrier.carrierName
              simData["countryIso"] = carrier.isoCountryCode
              simData["mobileCountryCode"] = carrier.mobileCountryCode
              simData["mobileNetworkCode"] = carrier.mobileNetworkCode
              simData["phoneNumber"] = nil
              simData["isDefaultForCalls"] = true
              simData["isDefaultForData"] = true
              simData["isRoaming"] = false
              simInfos.append(simData)
          }
      }
      resolve(simInfos)
  }

  @objc(getCarrierInfo:resolver:rejecter:)
  func getCarrierInfo(subscriptionId: NSNumber?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let networkInfo = CTTelephonyNetworkInfo()
    var carrierInfo: [String: Any] = [:]

    if #available(iOS 12.0, *) {
      if let providers = networkInfo.serviceSubscriberCellularProviders {
        // Get first carrier or specific if index provided
        if let firstCarrier = providers.values.first {
          carrierInfo["name"] = firstCarrier.carrierName ?? "Unknown"
          carrierInfo["mcc"] = firstCarrier.mobileCountryCode ?? ""
          carrierInfo["mnc"] = firstCarrier.mobileNetworkCode ?? ""
          carrierInfo["countryIso"] = firstCarrier.isoCountryCode ?? ""
        }
      }
    } else {
      if let carrier = networkInfo.subscriberCellularProvider {
        carrierInfo["name"] = carrier.carrierName ?? "Unknown"
        carrierInfo["mcc"] = carrier.mobileCountryCode ?? ""
        carrierInfo["mnc"] = carrier.mobileNetworkCode ?? ""
        carrierInfo["countryIso"] = carrier.isoCountryCode ?? ""
      }
    }

    if carrierInfo.isEmpty {
      carrierInfo["name"] = "Unknown"
      carrierInfo["mcc"] = ""
      carrierInfo["mnc"] = ""
      carrierInfo["countryIso"] = ""
    }

    resolve(carrierInfo)
  }

  @objc(checkPermissions:rejecter:)
  func checkPermissions(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // iOS doesn't require special permissions for USSD/tel URLs
    let permissions: [String: Any] = [
      "callPhone": true,
      "readPhoneState": true,
      "readPhoneNumbers": false,
      "allGranted": true,
      "missingPermissions": []
    ]
    resolve(permissions)
  }

  @objc(requestPermissions:rejecter:)
  func requestPermissions(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // No permissions to request on iOS
    resolve(true)
  }

  @objc(getDefaultSimForCalls:rejecter:)
  func getDefaultSimForCalls(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // iOS doesn't expose default SIM selection
    resolve(nil)
  }

  @objc(getDefaultSimForData:rejecter:)
  func getDefaultSimForData(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // iOS doesn't expose default SIM selection
    resolve(nil)
  }

  @objc(getHistory:resolver:rejecter:)
  func getHistory(limit: NSNumber?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // History tracking not implemented on iOS
    resolve([])
  }

  @objc(clearHistory:rejecter:)
  func clearHistory(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // History tracking not implemented on iOS
    resolve(nil)
  }

  @objc(setSecureMode:resolver:rejecter:)
  func setSecureMode(enabled: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Secure mode not applicable on iOS (no logging)
    resolve(nil)
  }

  @objc(getPendingResponses:rejecter:)
  func getPendingResponses(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Pending responses not applicable on iOS
    resolve([])
  }

  @objc(getMetrics:rejecter:)
  func getMetrics(resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Metrics tracking not implemented on iOS
    let metrics: [String: Any] = [
      "totalRequests": 0,
      "successfulRequests": 0,
      "successRate": 0.0,
      "avgResponseTime": 0.0,
      "topCodes": []
    ]
    resolve(metrics)
  }

  @objc(supportedEvents)
  func supportedEvents() -> [String]! {
    return ["ussdEvent", "ussdErrorEvent", "simStateChanged", "sessionStateChanged"]
  }

  @objc(startObserving)
  func startObserving() {
    // No-op for iOS
  }

  @objc(stopObserving)
  func stopObserving() {
    // No-op for iOS
  }
}
