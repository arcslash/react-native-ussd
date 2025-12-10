package com.isharaux.ussd

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SignalStrength
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.telephony.TelephonyManager.UssdResponseCallback
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import java.util.concurrent.ConcurrentHashMap

class UssdModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private val TAG = UssdModule::class.java.simpleName
        private const val DEFAULT_TIMEOUT_MS = 30000L
        private const val MAX_HISTORY_SIZE = 100
    }

    // Session state management
    private data class SessionInfo(
        val code: String,
        val subscriptionId: Int?,
        val startTime: Long,
        var isActive: Boolean = true,
        var waitingForInput: Boolean = false,
        var telephonyManager: TelephonyManager? = null
    )

    private val activeSessions = ConcurrentHashMap<Int, SessionInfo>()
    private var timeoutMs = DEFAULT_TIMEOUT_MS
    private var secureMode = false

    // History tracking
    private val history = mutableListOf<Map<String, Any>>()

    // Pending responses (for background handling)
    private val pendingResponses = mutableListOf<Map<String, Any>>()

    // Metrics tracking
    private var totalRequests = 0
    private var successfulRequests = 0
    private val responseTimes = mutableListOf<Long>()
    private val codeUsageCount = mutableMapOf<String, Int>()

    override fun getName(): String = "Ussd"

    override fun getConstants(): Map<String, Any> {
        return mapOf(
            "DEFAULT_TIMEOUT_MS" to DEFAULT_TIMEOUT_MS,
            "TELEPHONY_FAILURE_CODES" to mapOf(
                "UNKNOWN" to -1,
                "NO_SERVICE" to 1,
                "RADIO_OFF" to 2,
                "BUSY" to 3,
                "ERROR_IN_REQUEST" to 4
            )
        )
    }

    private class RequestExecutionException(message: String) : Exception(message) {
        companion object {
            const val type = "ussd_plugin_ussd_execution_failure"
        }
    }

    @ReactMethod
    fun dial(code: String, options: ReadableMap?, promise: Promise) {
        val subscriptionId = options?.getInt("subscriptionId")
        val timeout = options?.getInt("timeout")?.toLong() ?: timeoutMs
        val isSecure = options?.getBoolean("secureMode") ?: secureMode

        Log.d(TAG, "Dialing code: $code on subscription: $subscriptionId")

        val startTime = System.currentTimeMillis()
        totalRequests++

        // Track code usage
        codeUsageCount[code] = (codeUsageCount[code] ?: 0) + 1

        val callback = object : UssdResponseCallback() {
            override fun onReceiveUssdResponse(
                telephonyManager: TelephonyManager,
                request: String,
                response: CharSequence
            ) {
                val responseTime = System.currentTimeMillis() - startTime
                responseTimes.add(responseTime)
                successfulRequests++

                val responseStr = if (isSecure) "[SECURE - HIDDEN]" else response.toString()
                Log.d(TAG, "onReceiveUssdResponse: $responseStr")

                // Add to history
                addToHistory(code, response.toString(), subscriptionId, true, null)

                val params = Arguments.createMap().apply {
                    putString("ussdReply", response.toString())
                    putString("code", code)
                    subscriptionId?.let { putInt("subscriptionId", it) }
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }

                sendEvent("ussdEvent", params)

                // Update session state
                updateSessionState(subscriptionId ?: -1, false, false)
            }

            override fun onReceiveUssdResponseFailed(
                telephonyManager: TelephonyManager,
                request: String,
                failureCode: Int
            ) {
                Log.e(TAG, "onReceiveUssdResponseFailed: Error Code: $failureCode")

                // Add to history
                addToHistory(code, null, subscriptionId, false, "Failure code: $failureCode")

                val params = Arguments.createMap().apply {
                    putString("error", "USSD request failed with code: $failureCode")
                    putInt("failureCode", failureCode)
                    putString("code", code)
                    subscriptionId?.let { putInt("subscriptionId", it) }
                }
                sendEvent("ussdErrorEvent", params)

                // Update session state
                updateSessionState(subscriptionId ?: -1, false, false)
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
                }
            }

            // Track active session
            val sessionKey = subscriptionId ?: -1
            activeSessions[sessionKey] = SessionInfo(code, subscriptionId, startTime, true, false, telephonyManagerToUse)

            val mainHandler = Handler(Looper.getMainLooper())
            telephonyManagerToUse.sendUssdRequest(code, callback, mainHandler)

            // Send session state changed event
            sendSessionStateChangedEvent(sessionKey)

            promise.resolve(null)
            Log.d(TAG, "USSD request initiated for code: $code")

        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException during USSD request: ${e.message}", e)
            addToHistory(code, null, subscriptionId, false, "Permission error: ${e.message}")
            promise.reject("PERMISSION_ERROR", "Telephony permission denied. Is CALL_PHONE permission granted?", e)
        } catch (e: Exception) {
            Log.e(TAG, "USSD request failed: ${e.message}", e)
            addToHistory(code, null, subscriptionId, false, "Error: ${e.message}")
            promise.reject(RequestExecutionException.type, "USSD request failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendResponse(response: String, subscriptionId: Int?, promise: Promise) {
        Log.d(TAG, "Sending USSD response: $response for subscription: $subscriptionId")

        val sessionKey = subscriptionId ?: -1
        val session = activeSessions[sessionKey]

        if (session == null || !session.isActive) {
            promise.reject("NO_ACTIVE_SESSION", "No active USSD session found for this SIM")
            return
        }

        try {
            val telephonyManager = session.telephonyManager
            if (telephonyManager == null) {
                promise.reject("SESSION_ERROR", "TelephonyManager not available for active session")
                return
            }

            // Note: Android's sendUssdRequest with response is the same API
            // The response is sent through the same mechanism
            val callback = createCallbackForSession(session.code, subscriptionId)
            val mainHandler = Handler(Looper.getMainLooper())

            telephonyManager.sendUssdRequest(response, callback, mainHandler)
            session.waitingForInput = false

            promise.resolve(null)
            Log.d(TAG, "USSD response sent: $response")

        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException sending USSD response: ${e.message}", e)
            promise.reject("PERMISSION_ERROR", "Permission denied for USSD response", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send USSD response: ${e.message}", e)
            promise.reject("ERROR", "Failed to send USSD response: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cancelSession(subscriptionId: Int?, promise: Promise) {
        val sessionKey = subscriptionId ?: -1
        val session = activeSessions[sessionKey]

        if (session == null) {
            promise.reject("NO_ACTIVE_SESSION", "No active session to cancel")
            return
        }

        try {
            // Mark session as inactive
            session.isActive = false
            activeSessions.remove(sessionKey)

            // Send empty response to close the session
            session.telephonyManager?.let { tm ->
                val callback = createCallbackForSession(session.code, subscriptionId)
                val mainHandler = Handler(Looper.getMainLooper())
                // Send empty/cancel USSD code
                tm.sendUssdRequest("", callback, mainHandler)
            }

            sendSessionStateChangedEvent(sessionKey)

            promise.resolve(null)
            Log.d(TAG, "USSD session cancelled")

        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling session: ${e.message}", e)
            promise.reject("ERROR", "Failed to cancel session: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getSessionState(promise: Promise) {
        val states = Arguments.createArray()

        for ((key, session) in activeSessions) {
            if (session.isActive) {
                val stateMap = Arguments.createMap().apply {
                    putBoolean("isActive", session.isActive)
                    putString("code", session.code)
                    session.subscriptionId?.let { putInt("subscriptionId", it) }
                    putDouble("startTime", session.startTime.toDouble())
                    putBoolean("waitingForInput", session.waitingForInput)
                }
                states.pushMap(stateMap)
            }
        }

        promise.resolve(states)
    }

    @ReactMethod
    fun setTimeout(milliseconds: Int, promise: Promise) {
        timeoutMs = milliseconds.toLong()
        promise.resolve(null)
        Log.d(TAG, "USSD timeout set to: $milliseconds ms")
    }

    @ReactMethod
    fun isNetworkAvailable(promise: Promise) {
        try {
            val connectivityManager = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                val isAvailable = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
                promise.resolve(isAvailable)
            } else {
                @Suppress("DEPRECATION")
                val networkInfo = connectivityManager.activeNetworkInfo
                promise.resolve(networkInfo?.isConnected == true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking network availability: ${e.message}", e)
            promise.reject("ERROR", "Failed to check network: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getNetworkStatus(promise: Promise) {
        try {
            val telephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            val connectivityManager = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            val statusMap = Arguments.createMap()

            // Network availability
            val isAvailable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
            } else {
                @Suppress("DEPRECATION")
                connectivityManager.activeNetworkInfo?.isConnected == true
            }
            statusMap.putBoolean("isAvailable", isAvailable)

            // Network type
            val networkType = when (telephonyManager.networkType) {
                TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
                TelephonyManager.NETWORK_TYPE_NR -> "5G"
                TelephonyManager.NETWORK_TYPE_HSPAP,
                TelephonyManager.NETWORK_TYPE_HSPA,
                TelephonyManager.NETWORK_TYPE_HSDPA,
                TelephonyManager.NETWORK_TYPE_HSUPA -> "3G"
                TelephonyManager.NETWORK_TYPE_EDGE,
                TelephonyManager.NETWORK_TYPE_GPRS -> "2G"
                else -> "UNKNOWN"
            }
            statusMap.putString("networkType", networkType)

            // Roaming status
            statusMap.putBoolean("isRoaming", telephonyManager.isNetworkRoaming)

            promise.resolve(statusMap)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting network status: ${e.message}", e)
            promise.reject("ERROR", "Failed to get network status: ${e.message}", e)
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
            val telephonyManager =
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

            if (subscriptionManager == null) {
                Log.w(TAG, "SubscriptionManager service is null.")
                promise.resolve(Arguments.createArray())
                return
            }

            val subInfoList: List<SubscriptionInfo>? = subscriptionManager.activeSubscriptionInfoList
            val simInfos = Arguments.createArray()

            if (subInfoList != null) {
                for (info in subInfoList) {
                    val simInfoMap = Arguments.createMap()
                    simInfoMap.putInt("subscriptionId", info.subscriptionId)
                    simInfoMap.putInt("slotIndex", info.simSlotIndex)
                    info.carrierName?.let { simInfoMap.putString("carrierName", it.toString()) }
                    info.countryIso?.let { simInfoMap.putString("countryIso", it.toString()) }

                    // Add MCC and MNC
                    simInfoMap.putString("mobileCountryCode", info.mcc.toString())
                    simInfoMap.putString("mobileNetworkCode", info.mnc.toString())

                    // Phone number
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        try {
                            info.number?.let { simInfoMap.putString("phoneNumber", it) } ?: simInfoMap.putNull("phoneNumber")
                        } catch (se: SecurityException) {
                            Log.w(TAG, "Could not get phone number for subscription ${info.subscriptionId}")
                            simInfoMap.putNull("phoneNumber")
                        }
                    } else {
                        simInfoMap.putNull("phoneNumber")
                    }

                    // Check if default SIM for calls/data
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        val defaultVoiceSubId = SubscriptionManager.getDefaultVoiceSubscriptionId()
                        val defaultDataSubId = SubscriptionManager.getDefaultDataSubscriptionId()
                        simInfoMap.putBoolean("isDefaultForCalls", info.subscriptionId == defaultVoiceSubId)
                        simInfoMap.putBoolean("isDefaultForData", info.subscriptionId == defaultDataSubId)
                    }

                    // Roaming status
                    try {
                        val tm = telephonyManager.createForSubscriptionId(info.subscriptionId)
                        simInfoMap.putBoolean("isRoaming", tm.isNetworkRoaming)
                    } catch (e: Exception) {
                        simInfoMap.putBoolean("isRoaming", false)
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

    @ReactMethod
    fun getCarrierInfo(subscriptionId: Int?, promise: Promise) {
        try {
            val telephonyManager = if (subscriptionId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                (reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager)
                    .createForSubscriptionId(subscriptionId)
            } else {
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            }

            val carrierInfo = Arguments.createMap()
            carrierInfo.putString("name", telephonyManager.networkOperatorName ?: "Unknown")

            val operator = telephonyManager.networkOperator
            if (operator.length >= 5) {
                carrierInfo.putString("mcc", operator.substring(0, 3))
                carrierInfo.putString("mnc", operator.substring(3))
            }

            telephonyManager.networkCountryIso?.let {
                carrierInfo.putString("countryIso", it)
            }

            promise.resolve(carrierInfo)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting carrier info: ${e.message}", e)
            promise.reject("ERROR", "Failed to get carrier info: ${e.message}", e)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val permissions = Arguments.createMap()
        val missingPermissions = Arguments.createArray()

        val callPhone = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED
        permissions.putBoolean("callPhone", callPhone)
        if (!callPhone) missingPermissions.pushString(Manifest.permission.CALL_PHONE)

        val readPhoneState = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED
        permissions.putBoolean("readPhoneState", readPhoneState)
        if (!readPhoneState) missingPermissions.pushString(Manifest.permission.READ_PHONE_STATE)

        var readPhoneNumbers = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            readPhoneNumbers = ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.READ_PHONE_NUMBERS
            ) == PackageManager.PERMISSION_GRANTED
        }
        permissions.putBoolean("readPhoneNumbers", readPhoneNumbers)
        if (!readPhoneNumbers && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            missingPermissions.pushString(Manifest.permission.READ_PHONE_NUMBERS)
        }

        permissions.putBoolean("allGranted", callPhone && readPhoneState)
        permissions.putArray("missingPermissions", missingPermissions)

        promise.resolve(permissions)
    }

    @ReactMethod
    fun getDefaultSimForCalls(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val defaultSubId = SubscriptionManager.getDefaultVoiceSubscriptionId()
            if (defaultSubId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
                promise.resolve(defaultSubId)
            } else {
                promise.resolve(null)
            }
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getDefaultSimForData(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val defaultSubId = SubscriptionManager.getDefaultDataSubscriptionId()
            if (defaultSubId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
                promise.resolve(defaultSubId)
            } else {
                promise.resolve(null)
            }
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getHistory(limit: Int?, promise: Promise) {
        val maxLimit = limit ?: history.size
        val result = Arguments.createArray()

        val itemsToReturn = history.takeLast(maxLimit)
        for (item in itemsToReturn) {
            val historyMap = Arguments.createMap()
            item.forEach { (key, value) ->
                when (value) {
                    is String -> historyMap.putString(key, value)
                    is Boolean -> historyMap.putBoolean(key, value)
                    is Int -> historyMap.putInt(key, value)
                    is Long -> historyMap.putDouble(key, value.toDouble())
                    is Double -> historyMap.putDouble(key, value)
                    null -> historyMap.putNull(key)
                }
            }
            result.pushMap(historyMap)
        }

        promise.resolve(result)
    }

    @ReactMethod
    fun clearHistory(promise: Promise) {
        history.clear()
        promise.resolve(null)
        Log.d(TAG, "USSD history cleared")
    }

    @ReactMethod
    fun setSecureMode(enabled: Boolean, promise: Promise) {
        secureMode = enabled
        promise.resolve(null)
        Log.d(TAG, "Secure mode: $enabled")
    }

    @ReactMethod
    fun getPendingResponses(promise: Promise) {
        val result = Arguments.createArray()

        for (item in pendingResponses) {
            val responseMap = Arguments.createMap()
            item.forEach { (key, value) ->
                when (value) {
                    is String -> responseMap.putString(key, value)
                    is Int -> responseMap.putInt(key, value)
                    is Long -> responseMap.putDouble(key, value.toDouble())
                    is Double -> responseMap.putDouble(key, value)
                }
            }
            result.pushMap(responseMap)
        }

        pendingResponses.clear()
        promise.resolve(result)
    }

    @ReactMethod
    fun getMetrics(promise: Promise) {
        val metrics = Arguments.createMap()

        metrics.putInt("totalRequests", totalRequests)
        metrics.putInt("successfulRequests", successfulRequests)

        val successRate = if (totalRequests > 0) {
            successfulRequests.toDouble() / totalRequests.toDouble()
        } else {
            0.0
        }
        metrics.putDouble("successRate", successRate)

        val avgResponseTime = if (responseTimes.isNotEmpty()) {
            responseTimes.average()
        } else {
            0.0
        }
        metrics.putDouble("avgResponseTime", avgResponseTime)

        // Top codes
        val topCodes = Arguments.createArray()
        val sortedCodes = codeUsageCount.entries.sortedByDescending { it.value }.take(10)
        for ((code, count) in sortedCodes) {
            val codeMap = Arguments.createMap()
            codeMap.putString("code", code)
            codeMap.putInt("count", count)
            topCodes.pushMap(codeMap)
        }
        metrics.putArray("topCodes", topCodes)

        promise.resolve(metrics)
    }

    private fun createCallbackForSession(code: String, subscriptionId: Int?): UssdResponseCallback {
        val startTime = System.currentTimeMillis()

        return object : UssdResponseCallback() {
            override fun onReceiveUssdResponse(
                telephonyManager: TelephonyManager,
                request: String,
                response: CharSequence
            ) {
                val responseTime = System.currentTimeMillis() - startTime
                responseTimes.add(responseTime)
                successfulRequests++

                val responseStr = if (secureMode) "[SECURE - HIDDEN]" else response.toString()
                Log.d(TAG, "onReceiveUssdResponse: $responseStr")

                addToHistory(code, response.toString(), subscriptionId, true, null)

                val params = Arguments.createMap().apply {
                    putString("ussdReply", response.toString())
                    putString("code", code)
                    subscriptionId?.let { putInt("subscriptionId", it) }
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }

                sendEvent("ussdEvent", params)
                updateSessionState(subscriptionId ?: -1, false, false)
            }

            override fun onReceiveUssdResponseFailed(
                telephonyManager: TelephonyManager,
                request: String,
                failureCode: Int
            ) {
                Log.e(TAG, "onReceiveUssdResponseFailed: Error Code: $failureCode")

                addToHistory(code, null, subscriptionId, false, "Failure code: $failureCode")

                val params = Arguments.createMap().apply {
                    putString("error", "USSD request failed with code: $failureCode")
                    putInt("failureCode", failureCode)
                    putString("code", code)
                    subscriptionId?.let { putInt("subscriptionId", it) }
                }
                sendEvent("ussdErrorEvent", params)
                updateSessionState(subscriptionId ?: -1, false, false)
            }
        }
    }

    private fun updateSessionState(sessionKey: Int, isActive: Boolean, waitingForInput: Boolean) {
        activeSessions[sessionKey]?.let {
            it.isActive = isActive
            it.waitingForInput = waitingForInput
            if (!isActive) {
                activeSessions.remove(sessionKey)
            }
        }
        sendSessionStateChangedEvent(sessionKey)
    }

    private fun sendSessionStateChangedEvent(sessionKey: Int) {
        val session = activeSessions[sessionKey]
        val stateMap = Arguments.createMap()

        if (session != null) {
            stateMap.putBoolean("isActive", session.isActive)
            stateMap.putString("code", session.code)
            session.subscriptionId?.let { stateMap.putInt("subscriptionId", it) }
            stateMap.putDouble("startTime", session.startTime.toDouble())
            stateMap.putBoolean("waitingForInput", session.waitingForInput)
        } else {
            stateMap.putBoolean("isActive", false)
        }

        sendEvent("sessionStateChanged", stateMap)
    }

    private fun addToHistory(
        code: String,
        response: String?,
        subscriptionId: Int?,
        success: Boolean,
        error: String?
    ) {
        val entry = mutableMapOf<String, Any>(
            "code" to code,
            "timestamp" to System.currentTimeMillis(),
            "success" to success
        )

        response?.let { entry["response"] = it }
        subscriptionId?.let { entry["subscriptionId"] = it }
        error?.let { entry["error"] = it }

        history.add(entry)

        // Limit history size
        if (history.size > MAX_HISTORY_SIZE) {
            history.removeAt(0)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
