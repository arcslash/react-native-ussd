package com.isharaux.ussd

import android.content.Context
import android.os.Handler
import android.os.Looper
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

    override fun getConstants(): Map<String, Any> = emptyMap()

    private class RequestExecutionException(message: String) : Exception(message) {
        companion object {
            const val type = "ussd_plugin_ussd_execution_failure"
        }
    }

    @ReactMethod
    fun dial(code: String) {
        Log.d(TAG, "Dialing code")

        val callback = object : UssdResponseCallback() {
            override fun onReceiveUssdResponse(
                telephonyManager: TelephonyManager,
                request: String,
                response: CharSequence
            ) {
                Log.d(TAG, response.toString())
                val params = Arguments.createMap().apply {
                    putString("ussdReply", response.toString())
                }
                sendEvent("ussdEvent", params)
            }

            override fun onReceiveUssdResponseFailed(
                telephonyManager: TelephonyManager,
                request: String,
                failureCode: Int
            ) {
                Log.e(TAG, "Code Dialing error: $failureCode")
            }
        }

        try {
            val manager =
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            val simManager =
                manager.createForSubscriptionId(SubscriptionManager.getDefaultSubscriptionId())
            simManager.sendUssdRequest(code, callback, Handler(Looper.getMainLooper()))
        } catch (e: Exception) {
            Log.e(TAG, "USSD request failed: ${e.message}", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
