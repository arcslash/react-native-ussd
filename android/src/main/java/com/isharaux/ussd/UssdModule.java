package com.ussddial;

import android.widget.Toast;
import android.net.Uri;
import android.content.Intent;
import android.content.IntentFilter;
import android.telephony.TelephonyManager;
import android.telecom.TelecomManager;
import android.telephony.PhoneStateListener;
import android.telephony.SubscriptionManager;
import android.os.Handler;
import android.util.Log;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.CompletableFuture;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import javax.annotation.Nullable;

import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import com.ussddial.USSDService;

public class USSDDialModule extends ReactContextBaseJavaModule {
  private static ReactApplicationContext reactContext;
  private LocalBroadcastReceiver  mLocalBroadcastReceiver;

  private static final String DURATION_SHORT_KEY = "SHORT";
  private static final String DURATION_LONG_KEY = "LONG";

  public static String TAG = USSDDialModule.class.getName();

  USSDDialModule(ReactApplicationContext context) {
    super(context);
    reactContext = context;
  }

  @Override
  public String getName() {
    return "Ussd";
  }

   @Override
  public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put(DURATION_SHORT_KEY, Toast.LENGTH_SHORT);
    constants.put(DURATION_LONG_KEY, Toast.LENGTH_LONG);
    return constants;
  }


    private static class RequestExecutionException extends Exception {

        static String type = "ussd_plugin_ussd_execution_failure";
        String message;

        RequestExecutionException(String message) {
            this.message = message;
        }
    }

  @ReactMethod
  public void dial(String code) {
      Log.d(TAG, "Dialing code");  
      final CompletableFuture<String> c = new CompletableFuture<>();
      TelephonyManager.UssdResponseCallback callback =
              new TelephonyManager.UssdResponseCallback() {
                  @Override
                  public void onReceiveUssdResponse(
                          TelephonyManager telephonyManager, String request, CharSequence response) {                     
                      Log.d(TAG, response.toString());
                      String someData = response.toString();
                      WritableMap params = Arguments.createMap();
                      params.putString("ussdReply", someData);
                      sendEvent(reactContext, "ussdEvent", params);
                  }

                  @Override
                  public void onReceiveUssdResponseFailed(
                          TelephonyManager telephonyManager, String request, int failureCode) {
                            Log.e(TAG, "Code Dialing error"); 
                  }
              };
        Log.d(TAG, "calling Dialing code");
        TelephonyManager manager = (TelephonyManager) this.reactContext.getSystemService(Context.TELEPHONY_SERVICE);
        TelephonyManager simManager = manager.createForSubscriptionId(SubscriptionManager.getDefaultSubscriptionId());
        simManager.sendUssdRequest(code, callback, new Handler());

  }

  private void sendEvent(ReactContext reactContext,
                       String eventName,
                       @Nullable WritableMap params) {
  reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(eventName, params);
}


}
