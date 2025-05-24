# react-native-ussd
React Native Library to handle USSD calls, with support for interactive sessions and SIM selection on Android.
The Android module is written in Kotlin and the iOS module is written in Swift.
Basic USSD initiation for iOS is available. Interactive USSD sessions, response handling, and SIM selection for dialing are Android-specific features.

## Getting started

`$ npm install react-native-ussd --save`

### Installation
After installing with npm, React Native's auto-linking mechanism will handle linking the Android module.
For iOS, this library is distributed as a Swift Package. Add it to your application project using Xcode:
1. Go to File > Add Packages...
2. Enter the repository URL for this package (`https://github.com/isharaux/react-native-ussd.git` or your fork).
3. Select the package and add it to your app's target.


## API Documentation

### `Ussd.getSimInfo(): Promise<SimInfo[]>`
Retrieves a list of available and active SIM cards on the device.

*   **Returns:** `Promise<SimInfo[]>` - A promise that resolves to an array of `SimInfo` objects.
*   **`SimInfo` Object Structure:**
    ```typescript
    interface SimInfo {
      slotIndex: number;         // 0-based logical index of the SIM slot.
      subscriptionId: number;    // Actual subscription ID on Android. On iOS, this is the same as slotIndex for consistency.
      carrierName?: string;      // Name of the network carrier (e.g., "Verizon", "T-Mobile").
      phoneNumber?: string;      // Phone number associated with the SIM.
                                 // Android: Requires READ_PHONE_NUMBERS, READ_SMS, or carrier privileges. May return null.
                                 // iOS: Generally not available; will be null.
      countryIso?: string;       // ISO country code for the SIM's network (e.g., "us", "gb").
      mobileCountryCode?: string; // Mobile Country Code (MCC) - Android only.
      mobileNetworkCode?: string; // Mobile Network Code (MNC) - Android only.
    }
    ```
*   **Permissions:**
    *   **Android:** Requires `android.permission.READ_PHONE_STATE`. To retrieve `phoneNumber`, additionally requires `android.permission.READ_PHONE_NUMBERS` or `android.permission.READ_SMS`, or carrier privileges.
    *   **iOS:** No special permissions are required for basic carrier details (name, ISO). `phoneNumber` is typically not accessible.

### `Ussd.startSession(ussdCode: string, options?: DialOptions): Promise<string>`
Starts a USSD session.

*   **Parameters:**
    *   `ussdCode: string` - The initial USSD code to dial (e.g., `"*123#"`).
    *   `options?: DialOptions` - Optional parameters for dialing, primarily `subscriptionId` for Android.
*   **`DialOptions` Interface:**
    ```typescript
    interface DialOptions {
      subscriptionId?: number; // (Android Only) The subscriptionId (from getSimInfo) of the SIM to use.
    }
    ```
*   **Platform-specific Behavior & Returns:**
    *   **Android:** Initiates an interactive USSD session. The promise resolves with the *first* message received from the network in response to the `ussdCode`. Subsequent messages from the network (if the session is multi-step) will be delivered via the `ussdMessageReceived` event. Rejects if the session cannot be started (e.g., permission issues, invalid code, or if another session is already active).
    *   **iOS:** Opens the native iOS Phone app with the `ussdCode` pre-filled. The user must manually initiate the call. The promise resolves with an empty string if the Phone app was successfully opened, or rejects if it failed to open (e.g., `tel:` scheme not supported). It **does not** return any USSD network response.
*   **Permissions:**
    *   **Android:** Requires `android.permission.CALL_PHONE`. If using `subscriptionId`, `android.permission.READ_PHONE_STATE` is also implicitly needed.
    *   **iOS:** No special permissions are required for opening `tel:` URLs.

### `Ussd.sendMessage(message: string): Promise<string>` (Android Only)
Sends a follow-up message/input into an active USSD session on Android. This is used for multi-step USSD interactions (e.g., sending a PIN or menu choice).

*   **This method is ANDROID ONLY.** Calling it on iOS will result in a rejected promise.
*   **Parameters:**
    *   `message: string` - The message or input to send to the network.
*   **Returns:** `Promise<string>` - A promise that resolves with the network's response to this specific `message`. Rejects if there's no active session, if the message fails to send, or if a network error occurs.
*   **Note:** The response will also typically trigger a `ussdMessageReceived` event.

### `Ussd.cancelSession(): Promise<void>`
Clears the active USSD session state on Android. On iOS, this is a no-op.

*   **Platform-specific Behavior & Returns:**
    *   **Android:** Attempts to clean up local session state. The promise resolves once cleanup is complete. Note that this does not guarantee immediate network session termination but rather signals the library to stop managing the current session. Any pending promises from `startSession` or `sendMessage` might be rejected.
    *   **iOS:** This is a no-op and the promise resolves immediately.
*   **Returns:** `Promise<void>`

### Event Listener: `ussdEventEmitter`
Listens for events from the native module related to USSD sessions. **Primarily for Android.**

*   `ussdEventEmitter.addListener('ussdMessageReceived', (event: { message: string, requestSent?: string }) => { ... });`
    *   **(Android Only)** Triggered when a USSD message is received from the network during an active session (after the initial response from `startSession` or any response from `sendMessage`).
    *   `event.message`: The string message received from the USSD session.
    *   `event.requestSent` (optional): The original request that prompted this message, if available/relevant.
*   `ussdEventEmitter.addListener('ussdErrorEvent', (event: { message: string, code?: string | number, request?: string }) => { ... });`
    *   **(Android Only)** Triggered when a USSD request fails during the session (e.g., `onReceiveUssdResponseFailed` from TelephonyManager) or if an error occurs in processing within the native module.
    *   `event.message`: A string describing the error.
    *   `event.code` (optional): The specific failure code (e.g., from Android TelephonyManager) or an error code string from the module.
    *   `event.request` (optional): The USSD code or message that was being processed when the error occurred.

**Important iOS Limitation:** iOS does not provide a way for applications to intercept or read USSD responses, nor manage interactive USSD sessions in-app. Therefore, the `ussdEventEmitter` **will not fire `ussdMessageReceived` or `ussdErrorEvent` on iOS**. The `startSession` promise on iOS only indicates if the call was initiated via the Phone app.

## Platform Specific Configurations

### Android
**Minimum Android Version: 12 (API 31)**

**Permissions:**
Add the following permissions to your `AndroidManifest.xml`:
```xml
<manifest ...>
    <!-- Required to make USSD calls and manage interactive sessions -->
    <uses-permission android:name="android.permission.CALL_PHONE"/>

    <!-- Required for Ussd.getSimInfo() to read SIM details and for selecting a specific SIM for dialing -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE"/>

    <!-- Optional: To access the phone number via Ussd.getSimInfo().
         Alternatively, READ_SMS or carrier privileges also grant this. -->
    <uses-permission android:name="android.permission.READ_PHONE_NUMBERS"/>
    
    <application ...>
        ...
    </application>
</manifest>
```
The library has been updated to use Kotlin and targets Android 12 (API 31) and newer. Ensure your project's Android configuration is compatible.

### iOS
**Minimum iOS Version: 14.0**
The iOS module is written in Swift and integrated using Swift Package Manager.

*   **Session Handling:** Calling `Ussd.startSession()` will open the native iOS Phone app and pre-fill the USSD code. The user then needs to manually initiate the call and interact with the USSD session within the Phone app. The `subscriptionId` in `DialOptions` is ignored. `Ussd.sendMessage()` and `Ussd.cancelSession()` are not applicable and will behave as described in their API documentation (reject or no-op).
*   **`getSimInfo()`:** This method will return available SIM information (carrier name, ISO code, etc.) but `phoneNumber` will typically be `null`. This information is for display or informational purposes; it cannot be used to programmatically select the SIM for dialing.
*   **USSD Responses/Events:** As stated, iOS does not provide USSD responses or session events to the application. `ussdEventEmitter` will not emit events.
*   **Permissions:** No special permissions are typically required for `tel:` URL dialing or basic SIM info on iOS.

## Example Usage (Interactive Session on Android)

```javascript
import Ussd, { ussdEventEmitter, SimInfo, DialOptions } from 'react-native-ussd';
import { PermissionsAndroid, Platform, AppState } from 'react-native'; // AppState for example cleanup

// --- State Management (Conceptual) ---
let currentSessionActive = false;
let listenersAttached = false;
let messageListener;
let errorListener;
// Note: 'ussdSessionEnded' is not a native event from this library. 
// Session end is determined by app logic or by 'ussdErrorEvent' indicating failure.

// --- Event Handlers (Android Specific) ---
function setupUssdListeners() {
  if (Platform.OS !== 'android' || listenersAttached) {
    return;
  }

  console.log('Setting up USSD event listeners...');
  
  messageListener = ussdEventEmitter.addListener('ussdMessageReceived', (event) => {
    console.log('USSD Message Received (event):', event.message);
    // App logic to display message and collect next input
    // Example: if (event.message.includes("Enter PIN:")) { collectPinAndSend(); }
    // Example: if (event.message.includes("Thank you")) { Ussd.cancelSession(); } 
    // Or: if (isFinalMessage(event.message)) { currentSessionActive = false; console.log("Session ended based on message content."); }
  });

  errorListener = ussdEventEmitter.addListener('ussdErrorEvent', (event) => {
    console.error('USSD Error Event:', event.message, 'Code:', event.code, 'Request:', event.request);
    currentSessionActive = false; // Session typically ends on error
  });

  listenersAttached = true;
}

function removeUssdListeners() {
  if (Platform.OS !== 'android' || !listenersAttached) {
    return;
  }
  console.log('Removing USSD event listeners...');
  messageListener?.remove();
  errorListener?.remove();
  listenersAttached = false;
}

// --- Core USSD Functions ---
async function startInteractiveUssd(initialCode: string, simSubscriptionId?: number) {
  // Ensure permissions (CALL_PHONE, READ_PHONE_STATE for specific SIM) are handled before calling
  // For brevity, permission requests are omitted here but are crucial for Android.

  if (Platform.OS === 'android') {
    if (currentSessionActive) {
      console.warn("A session is already active. Cancel it before starting a new one.");
      return;
    }
    setupUssdListeners(); // Ensure listeners are active before starting
    try {
      console.log(`Starting USSD session with code: ${initialCode}`);
      const firstResponse = await Ussd.startSession(initialCode, { subscriptionId: simSubscriptionId });
      currentSessionActive = true;
      console.log('First USSD Response (from promise):', firstResponse);
      // Display firstResponse. Subsequent messages will trigger 'ussdMessageReceived'.
      // If firstResponse is already the final message, your app logic might call Ussd.cancelSession()
      // or simply set currentSessionActive = false if no further interaction is needed.
    } catch (error) {
      console.error('Failed to start USSD session:', error);
      currentSessionActive = false; // Ensure state is reset on failure to start
      removeUssdListeners(); // Clean up if start failed
    }
  } else if (Platform.OS === 'ios') {
    try {
      // On iOS, startSession just opens the dialer. No in-app message handling.
      await Ussd.startSession(initialCode); 
      console.log('iOS Dialer opened for USSD. User handles interaction in Phone app.');
    } catch (error) {
      console.error('Failed to open dialer on iOS:', error);
    }
  }
}

async function sendUssdReply(reply: string) {
  if (Platform.OS === 'android') {
    if (!currentSessionActive) {
      console.warn("No active USSD session to send a reply to.");
      return;
    }
    try {
      console.log(`Sending USSD reply: ${reply}`);
      // The promise from sendMessage resolves with the network's immediate response.
      // The 'ussdMessageReceived' event will also fire with this same response.
      // Handle the response either via the promise or the event, not typically both, to avoid duplication.
      const networkResponse = await Ussd.sendMessage(reply);
      console.log('Network response to reply (from promise):', networkResponse); 
    } catch (error) {
      console.error('Failed to send USSD message:', error);
      // 'ussdErrorEvent' might also fire from native side if the failure is reported there.
      // Consider session state based on error type. Some errors might be recoverable.
      // For critical errors, you might do: currentSessionActive = false;
    }
  } else {
    console.warn("sendMessage is not supported on iOS.");
  }
}

async function endUssdSession() {
  if (Platform.OS === 'android') {
    if (!currentSessionActive && !listenersAttached) { // also check listeners in case session never started but listeners were added
      console.log("No active session or listeners to clean up.");
      // return; // Or proceed to remove listeners if they might exist
    }
    try {
      if (currentSessionActive) { // Only call cancel if a session was thought to be active
         await Ussd.cancelSession();
         console.log('USSD session cancelled by app (Android).');
      }
    } catch (error) {
      console.error('Error cancelling USSD session (Android):', error);
    } finally {
      currentSessionActive = false;
      removeUssdListeners(); // Always try to remove listeners
    }
  } else {
     console.log("cancelSession is a no-op on iOS; listeners are not used for iOS USSD.");
     // No native state to clear for iOS in this library.
  }
}

// --- Example Lifecycle Integration (Conceptual) ---
// In your React component:
// useEffect(() => {
//   // Assuming you want listeners active while component is mounted and app is foregrounded
//   if (Platform.OS === 'android') {
//     setupUssdListeners();
//     const subscription = AppState.addEventListener('change', nextAppState => {
//       if (nextAppState === 'active') {
//         setupUssdListeners(); // Re-attach if app comes to foreground
//       } else if (nextAppState.match(/inactive|background/)) {
//         // Consider if session should be auto-cancelled or listeners removed
//         // endUssdSession(); // Example: auto-cancel on background
//         removeUssdListeners(); // Or just remove listeners
//       }
//     });
//     return () => {
//       subscription.remove();
//       endUssdSession(); // Clean up session and listeners on unmount
//     };
//   }
// }, []);

// --- Calling the functions (e.g., from UI buttons) ---
// getSimInfo().then(sims => console.log(sims));
// startInteractiveUssd("*123#");
// sendUssdReply("1");
// endUssdSession();
```
