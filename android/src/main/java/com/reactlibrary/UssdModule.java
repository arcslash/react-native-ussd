package com.reactlibrary;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;


import android.net.Uri;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.util.Map;
import java.util.HashMap;
import javax.annotation.Nullable;
import com.reactlibrary.UssdService;

public class UssdModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private LocalBroadcastReceiver  mLocalBroadcastReceiver;

    public UssdModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.mLocalBroadcastReceiver = new LocalBroadcastReceiver();
        LocalBroadcastManager localBroadcastManager = LocalBroadcastManager.getInstance(reactContext);
        localBroadcastManager.registerReceiver(mLocalBroadcastReceiver, new IntentFilter("ussd-event"));
    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {
        reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(eventName, params);
}

    @Override
    public String getName() {
        return "Ussd";
    }

    @ReactMethod
    public void sampleMethod(String stringArgument, int numberArgument, Callback callback) {
        // TODO: Implement some actually useful functionality
        callback.invoke("Received numberArgument: " + numberArgument + " stringArgument: " + stringArgument);
    }

    @ReactMethod
    public void dial(String code) {
        Intent callIntent = new Intent(Intent.ACTION_CALL, ussdToCallableUri(code));
        callIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(callIntent);
    }

    public class LocalBroadcastReceiver extends BroadcastReceiver {
         @Override
         public void onReceive(Context context, Intent intent) {
               String someData = intent.getStringExtra("ussd-data");
               WritableMap params = Arguments.createMap();
               params.putString("ussdmessage", someData);
               sendEvent(reactContext, "USSDEvents", params);
         }
   }

   private Uri ussdToCallableUri(String ussd) {
        String uriString = "";
        if(!ussd.startsWith("tel:")){
            uriString += "tel:";
        }       

        for(char c : ussd.toCharArray()) {
            if(c == '#'){
                uriString += Uri.encode("#");
            }else{
                uriString += c;
            }            
        }
        return Uri.parse(uriString);
    }
}