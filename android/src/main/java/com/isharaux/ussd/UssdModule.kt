package com.isharaux.ussd

import android.Manifest
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.telephony.TelephonyManager.UssdResponseCallback
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class UssdModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private val TAG = UssdModule::class.java.simpleName
    }

    override fun getName(): String = "Ussd"

    // getConstants is not strictly needed for this change, but keeping it for completeness
    override fun getConstants(): Map<String, Any> = emptyMap()

    // RequestExecutionException might not be used directly by the new methods, keeping for now
    private class RequestExecutionException(message: String) : Exception(message) {
        companion object {
            const val type = "ussd_plugin_ussd_execution_failure"
        }
    }

    @ReactMethod
    fun dial(code: String, subscriptionId: Int?, promise: Promise) {
        Log.d(TAG, "Dialing code: $code on subscription: $subscriptionId")

        val callback = object : UssdResponseCallback() {
            override fun onReceiveUssdResponse(
                telephonyManager: TelephonyManager,
                request: String,
                response: CharSequence
            ) {
                Log.d(TAG, "onReceiveUssdResponse: $response")
                val params = Arguments.createMap().apply {
                    putString("ussdReply", response.toString())
                }
                sendEvent("ussdEvent", params)
                // Note: The original promise for dial is for *initiating* the call.
                // USSD responses are asynchronous and handled by events.
            }

            override fun onReceiveUssdResponseFailed(
                telephonyManager: TelephonyManager,
                request: String,
                failureCode: Int
            ) {
                Log.e(TAG, "onReceiveUssdResponseFailed: Error Code: $failureCode")
                // This indicates a failure in the USSD session itself, after initiation.
                // An event could be sent here too if needed, e.g., for specific failure types.
                // The original promise for dial is for *initiating* the call.
                val params = Arguments.createMap().apply {
                    putString("ussdError", "USSD request failed with code: $failureCode")
                    putInt("failureCode", failureCode)
                }
                sendEvent("ussdErrorEvent", params) // Sending a specific error event
            }
        }

        try {
            val defaultTelephonyManager =
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            
            var telephonyManagerToUse: TelephonyManager = defaultTelephonyManager

            if (subscriptionId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                try {
                    val specificTm = defaultTelephonyManager.createForSubscriptionId(subscriptionId)
                    if (specificTm != null) {
                        telephonyManagerToUse = specificTm
                        Log.d(TAG, "Using TelephonyManager for subscription ID: $subscriptionId")
                    } else {
                        Log.w(TAG, "Failed to get TelephonyManager for subscription ID: $subscriptionId. Falling back to default.")
                    }
                } catch (e: SecurityException) {
                    Log.e(TAG, "SecurityException when creating TelephonyManager for subscription ID: $subscriptionId. ${e.message}", e)
                    // Fallback to default or reject promise if strict SIM selection is required
                    // For now, falling back to default as per example.
                    // promise.reject("PERMISSION_ERROR", "Missing permission for specific SIM selection", e)
                    // return
                }
            }
            
            val mainHandler = Handler(Looper.getMainLooper())
            telephonyManagerToUse.sendUssdRequest(code, callback, mainHandler)
            promise.resolve(null) // Successfully initiated the USSD request
            Log.d(TAG, "USSD request initiated for code: $code")

        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException during USSD request: ${e.message}", e)
            promise.reject("PERMISSION_ERROR", "Telephony permission denied. Is CALL_PHONE permission granted?", e)
        } catch (e: Exception) {
            Log.e(TAG, "USSD request failed: ${e.message}", e)
            promise.reject(RequestExecutionException.type, "USSD request failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getSimInfo(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            Log.w(TAG, "SubscriptionManager not available on API < 22")
            promise.resolve(Arguments.createArray())
            return
        }

        try {
            val subscriptionManager =
                reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager?

            if (subscriptionManager == null) {
                Log.w(TAG, "SubscriptionManager service is null.")
                promise.resolve(Arguments.createArray())
                return
            }

            // READ_PHONE_STATE permission is required for getActiveSubscriptionInfoList.
            // The app is responsible for requesting this permission.
            // A SecurityException will be thrown by the system if permission is missing.
            val subInfoList: List<SubscriptionInfo>? = subscriptionManager.activeSubscriptionInfoList

            val simInfos = Arguments.createArray()
            if (subInfoList != null) {
                for (info in subInfoList) {
                    val simInfoMap = Arguments.createMap()
                    simInfoMap.putInt("subscriptionId", info.subscriptionId)
                    simInfoMap.putInt("slotIndex", info.simSlotIndex)
                    info.carrierName?.let { simInfoMap.putString("carrierName", it.toString()) }
                    info.countryIso?.let { simInfoMap.putString("countryIso", it.toString()) }
                    
                    // Getting phone number requires READ_PHONE_NUMBERS (API 23+), READ_SMS, or carrier privileges.
                    // Handle SecurityException if attempting to get number without sufficient permission.
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) { // READ_PHONE_NUMBERS is API 23
                         try {
                            // Check for permission explicitly if desired, or rely on try-catch.
                            // For example, using ContextCompat.checkSelfPermission for READ_PHONE_NUMBERS
                            info.number?.let { simInfoMap.putString("phoneNumber", it) } ?: simInfoMap.putNull("phoneNumber")
                        } catch (se: SecurityException) {
                            Log.w(TAG, "Could not get phone number for subscription ${info.subscriptionId} due to SecurityException: ${se.message}")
                            simInfoMap.putNull("phoneNumber")
                        }
                    } else {
                         simInfoMap.putNull("phoneNumber") // Not attempting on older APIs or if number is null
                    }
                    simInfos.pushMap(simInfoMap)
                }
            }
            promise.resolve(simInfos)
        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException in getSimInfo: ${se.message}", se)
            promise.reject("PERMISSION_ERROR", "Missing READ_PHONE_STATE or related permission for getSimInfo.", se)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get SIM info: ${e.message}", e)
            promise.reject("ERROR", "Failed to get SIM info: ${e.message}", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
