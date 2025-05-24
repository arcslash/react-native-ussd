package com.isharaux.ussd

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import javax.annotation.Nullable


class UssdModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private val TAG = UssdModule::class.java.simpleName
        const val EVENT_USSD_MESSAGE_RECEIVED = "ussdMessageReceived" // For unsolicited or ongoing messages
        const val EVENT_USSD_ERROR = "ussdErrorEvent" // For errors in the USSD session
        const val EVENT_LEGACY_USSD = "ussdEvent" // Legacy event, can be deprecated if not used by JS

        // Error Codes for Promises
        const val E_SESSION_ACTIVE = "E_SESSION_ACTIVE"
        const val E_NO_SESSION = "E_NO_SESSION"
        const val E_TELEPHONY_NOT_AVAILABLE = "E_TELEPHONY_NOT_AVAILABLE"
        const val E_SECURITY_EXCEPTION = "E_SECURITY_EXCEPTION"
        const val E_USSD_FAILED = "E_USSD_FAILED"
        const val E_SESSION_CANCELLED = "E_SESSION_CANCELLED"
        const val E_UNKNOWN_ERROR = "E_UNKNOWN_ERROR"
    }

    private var currentSessionPromise: Promise? = null
    private var isSessionActive: Boolean = false
    private var activeTelephonyManager: TelephonyManager? = null
    private val mainHandler: Handler = Handler(Looper.getMainLooper())

    private val ussdResponseCallbackHandler = object : TelephonyManager.UssdResponseCallback() {
        override fun onReceiveUssdResponse(
            telephonyManager: TelephonyManager, // This is the TM that handled the response
            request: String,
            response: CharSequence
        ) {
            val responseString = response.toString()
            Log.d(TAG, "onReceiveUssdResponse: '$responseString' for request: '$request'")

            currentSessionPromise?.let {
                it.resolve(responseString)
                currentSessionPromise = null
            } ?: run {
                // No specific promise waiting, treat as an ongoing message or unsolicited
                Log.w(TAG, "Received USSD response but no active promise. Sending as general event.")
                val params = Arguments.createMap().apply {
                    putString("message", responseString)
                    putString("requestSent", request) // The original request that triggered this if available
                }
                sendEvent(EVENT_USSD_MESSAGE_RECEIVED, params)
            }
            // Important: isSessionActive remains true. JS layer decides if session ends.
        }

        override fun onReceiveUssdResponseFailed(
            telephonyManager: TelephonyManager,
            request: String,
            failureCode: Int
        ) {
            Log.e(TAG, "onReceiveUssdResponseFailed for request '$request'. Code: $failureCode")
            val errorMessage = "USSD request failed for '$request' with code: $failureCode"

            currentSessionPromise?.let {
                it.reject(E_USSD_FAILED, errorMessage, null) // Consider adding failureCode to error details map
                currentSessionPromise = null
            }

            isSessionActive = false
            activeTelephonyManager = null

            val params = Arguments.createMap().apply {
                putString("message", errorMessage)
                putInt("code", failureCode)
                putString("request", request)
            }
            sendEvent(EVENT_USSD_ERROR, params)
        }
    }

    override fun getName(): String = "Ussd"

    override fun getConstants(): Map<String, Any> {
        val constants = HashMap<String, Any>()
        constants["EVENT_USSD_MESSAGE_RECEIVED"] = EVENT_USSD_MESSAGE_RECEIVED
        constants["EVENT_USSD_ERROR"] = EVENT_USSD_ERROR
        constants["EVENT_LEGACY_USSD"] = EVENT_LEGACY_USSD // If JS still uses this
        return constants
    }

    @ReactMethod
    fun startSession(ussdCode: String, @Nullable subscriptionIdInput: Int?, promise: Promise) {
        Log.d(TAG, "Attempting to start USSD session with code: $ussdCode, subId: $subscriptionIdInput")
        if (isSessionActive) {
            promise.reject(E_SESSION_ACTIVE, "A USSD session is already active.")
            return
        }

        currentSessionPromise = promise // Store the promise for this operation

        try {
            val defaultTelephonyManager =
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager?

            if (defaultTelephonyManager == null) {
                promise.reject(E_TELEPHONY_NOT_AVAILABLE, "TelephonyManager not available.")
                return
            }
            
            var selectedTelephonyManager = defaultTelephonyManager

            if (subscriptionIdInput != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subscriptionId = subscriptionIdInput.toInt() // Ensure it's Int
                try {
                    val specificTm = defaultTelephonyManager.createForSubscriptionId(subscriptionId)
                    if (specificTm != null) {
                        selectedTelephonyManager = specificTm
                        Log.d(TAG, "Using TelephonyManager for subscription ID: $subscriptionId")
                    } else {
                        Log.w(TAG, "Failed to get TelephonyManager for subscription ID: $subscriptionId. Falling back to default.")
                        // Optionally, could reject promise here if specific SIM is strictly required.
                        // promise.reject(E_TELEPHONY_NOT_AVAILABLE, "Could not obtain TelephonyManager for specified SIM.")
                        // return
                    }
                } catch (e: SecurityException) {
                    Log.e(TAG, "SecurityException when creating TelephonyManager for subscription ID $subscriptionId: ${e.message}", e)
                    // Fallback to default or reject. For now, log and continue with default.
                    // Consider rejecting if strict SIM selection is required:
                    // promise.reject(E_SECURITY_EXCEPTION, "Permission denied for specific SIM selection.", e)
                    // return
                }
            }
            
            activeTelephonyManager = selectedTelephonyManager
            isSessionActive = true // Set active *before* sending request, to handle immediate failure/response

            Log.d(TAG, "Sending USSD request: $ussdCode via selected TelephonyManager.")
            activeTelephonyManager!!.sendUssdRequest(ussdCode, ussdResponseCallbackHandler, mainHandler)
            // The promise (currentSessionPromise) will be resolved/rejected by the callback handler.

        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException during USSD request initiation: ${se.message}", se)
            isSessionActive = false // Reset state
            activeTelephonyManager = null
            currentSessionPromise = null // Clear stored promise
            promise.reject(E_SECURITY_EXCEPTION, "Telephony permission denied. Is CALL_PHONE permission granted?", se)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting USSD session: ${e.message}", e)
            isSessionActive = false
            activeTelephonyManager = null
            currentSessionPromise = null
            promise.reject(E_UNKNOWN_ERROR, "Failed to start USSD session: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendMessage(message: String, promise: Promise) {
        Log.d(TAG, "Attempting to send message: $message")
        if (!isSessionActive || activeTelephonyManager == null) {
            promise.reject(E_NO_SESSION, "No active USSD session or TelephonyManager not available.")
            return
        }

        currentSessionPromise = promise // Store promise for this message

        try {
            Log.d(TAG, "Sending USSD message: $message via active TelephonyManager.")
            activeTelephonyManager!!.sendUssdRequest(message, ussdResponseCallbackHandler, mainHandler)
            // Promise resolved/rejected by callback handler.
        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException during USSD sendMessage: ${se.message}", se)
            // Don't necessarily kill the whole session here, but this message failed.
            currentSessionPromise = null
            promise.reject(E_SECURITY_EXCEPTION, "Telephony permission denied for sending message.", se)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending USSD message: ${e.message}", e)
            currentSessionPromise = null
            promise.reject(E_UNKNOWN_ERROR, "Failed to send USSD message: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cancelSession(promise: Promise) {
        Log.d(TAG, "Attempting to cancel USSD session.")
        currentSessionPromise?.let {
            // A pending operation exists, reject it as cancelled.
            it.reject(E_SESSION_CANCELLED, "USSD session cancelled by user.")
            currentSessionPromise = null
        }

        isSessionActive = false
        activeTelephonyManager = null 
        // No specific TelephonyManager API to cancel a USSD session, this is local state cleanup.
        Log.i(TAG, "USSD session state cleaned up.")
        promise.resolve(null)
    }
    
    @ReactMethod
    fun getSimInfo(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) {
            Log.w(TAG, "SubscriptionManager not available on API < 22 for getSimInfo.")
            promise.resolve(Arguments.createArray())
            return
        }

        try {
            val subscriptionManager =
                reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager?

            if (subscriptionManager == null) {
                Log.w(TAG, "SubscriptionManager service is null for getSimInfo.")
                promise.resolve(Arguments.createArray())
                return
            }
            
            val subInfoList: List<SubscriptionInfo>? = try {
                subscriptionManager.activeSubscriptionInfoList
            } catch (se: SecurityException) {
                Log.e(TAG, "SecurityException getting activeSubscriptionInfoList: ${se.message}", se)
                promise.reject("E_PERMISSION_DENIED_SIM_INFO", "Missing READ_PHONE_STATE for getSimInfo.", se)
                return
            }


            val simInfos = Arguments.createArray()
            if (subInfoList != null) {
                for (info in subInfoList) {
                    val simInfoMap = Arguments.createMap()
                    simInfoMap.putInt("subscriptionId", info.subscriptionId)
                    simInfoMap.putInt("slotIndex", info.simSlotIndex) // Typically 0-based
                    info.carrierName?.let { simInfoMap.putString("carrierName", it.toString()) }
                    info.countryIso?.let { simInfoMap.putString("countryIso", it.toString().uppercase()) }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        info.mccString?.let { simInfoMap.putString("mobileCountryCode", it) }
                        info.mncString?.let { simInfoMap.putString("mobileNetworkCode", it) }
                    } else {
                        simInfoMap.putString("mobileCountryCode", info.mcc.toString().takeIf { it != "0" })
                        simInfoMap.putString("mobileNetworkCode", info.mnc.toString().takeIf { it != "0" })
                    }
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) { // READ_PHONE_NUMBERS is API 23
                         try {
                            info.number?.let { simInfoMap.putString("phoneNumber", it) } ?: simInfoMap.putNull("phoneNumber")
                        } catch (se: SecurityException) {
                            Log.w(TAG, "Could not get phone number for sub ${info.subscriptionId} due to SecurityException: ${se.message}")
                            simInfoMap.putNull("phoneNumber") // Explicitly set to null on error
                        }
                    } else {
                         simInfoMap.putNull("phoneNumber") 
                    }
                    simInfos.pushMap(simInfoMap)
                }
            }
            promise.resolve(simInfos)
        } catch (e: Exception) { // Catch other potential exceptions during SIM info processing
            Log.e(TAG, "Failed to get SIM info: ${e.message}", e)
            promise.reject(E_UNKNOWN_ERROR, "Failed to get SIM info: ${e.message}", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } else {
            Log.w(TAG, "Attempted to send event '$eventName' without an active Catalyst instance.")
        }
    }
}
