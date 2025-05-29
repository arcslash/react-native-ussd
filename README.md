# react-native-ussd
React Native Library to handle USSD calls, with support for SIM selection on Android.
The Android module is written in Kotlin and the iOS module is written in Swift.
Basic dialing support for iOS is available. USSD response handling and SIM selection for dialing are Android-specific features.

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

### `Ussd.dial(ussdCode: string, options?: DialOptions): Promise<void>`
Initiates a USSD call.

*   **Parameters:**
    *   `ussdCode: string` - The USSD code to dial (e.g., `"*123#"`).
    *   `options?: DialOptions` - Optional parameters for dialing.
*   **`DialOptions` Interface:**
    ```typescript
    interface DialOptions {
      subscriptionId?: number; // The subscriptionId (obtained from getSimInfo) of the SIM to use for dialing.
    }
    ```
*   **Platform-specific Behavior:**
    *   **Android:** If `subscriptionId` is provided, the library attempts to send the USSD request via the specified SIM. If not provided or invalid, it uses the default SIM or system-defined behavior. The promise resolves upon successful initiation of the USSD request or rejects if initiation fails (e.g., permission issues). USSD responses are delivered via events.
    *   **iOS:** The `subscriptionId` parameter is **ignored**. iOS does not allow programmatic selection of the SIM for dialing `tel:` URLs; the OS or user controls this. The promise resolves if the `tel:` URL is successfully passed to the OS, or rejects if it cannot be opened.
*   **Returns:** `Promise<void>` - A promise that resolves if the USSD dial process was successfully initiated, or rejects if there was an error before dialing (e.g., invalid URL, permissions). Note that this does not indicate the success or failure of the USSD session itself.
*   **Permissions:**
    *   **Android:** Requires `android.permission.CALL_PHONE`. If using `subscriptionId` obtained from `getSimInfo`, `android.permission.READ_PHONE_STATE` is also implicitly needed.
    *   **iOS:** No special permissions are required for opening `tel:` URLs, but the app must be able to make calls.

### Event Listener: `ussdEventEmitter`
Listens for USSD responses or errors from the native module. **Primarily for Android.**

*   `ussdEventEmitter.addListener('ussdEvent', (event: { ussdReply: string }) => { ... });`
    *   Triggered on Android when a USSD response is received.
    *   `event.ussdReply`: The string response from the USSD session.
*   `ussdEventEmitter.addListener('ussdErrorEvent', (event: { error: string, failureCode?: number }) => { ... });`
    *   Triggered on Android when a USSD request fails during the session or if an error occurs in processing.
    *   `event.error`: A string describing the error.
    *   `event.failureCode` (optional): The specific failure code from the Android TelephonyManager, if available.

**Important iOS Limitation:** iOS does not provide a way for applications to intercept or read USSD responses. Therefore, the `ussdEventEmitter` **will not fire `ussdEvent` or `ussdErrorEvent` related to USSD session results on iOS**. The `dial` promise on iOS only indicates if the call was initiated, not the outcome of the USSD session.

## Platform Specific Configurations

### Android
**Minimum Android Version: 12 (API 31)**

**Permissions:**
Add the following permissions to your `AndroidManifest.xml`:
```xml
<manifest ...>
    <!-- Required to make USSD calls -->
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

*   **Dialing:** Calling `Ussd.dial()` will open the native iOS dialer and pre-fill the USSD code. The user then needs to manually initiate the call. The `subscriptionId` in `DialOptions` is ignored.
*   **`getSimInfo()`:** This method will return available SIM information (carrier name, ISO code, etc.) but `phoneNumber` will typically be `null`. This information is for display or informational purposes; it cannot be used to programmatically select the SIM for dialing.
*   **USSD Responses:** As stated, iOS does not provide USSD responses to the application. `ussdEventEmitter` will not emit events for USSD session results.
*   **Permissions:** No special permissions are typically required for `tel:` URL dialing or basic SIM info on iOS.

## Example Usage

```javascript
import Ussd, { ussdEventEmitter, SimInfo, DialOptions } from 'react-native-ussd';
import { PermissionsAndroid, Platform } from 'react-native';

// --- Getting SIM Info ---
async function displaySimInfo() {
  try {
    // On Android, you might want to request READ_PHONE_STATE first
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'SIM Info Permission',
          message: 'This app needs access to your phone state to read SIM information.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('READ_PHONE_STATE permission denied');
        return;
      }
    }

    const sims: SimInfo[] = await Ussd.getSimInfo();
    if (sims.length > 0) {
      console.log('Available SIMs:', sims);
      // Example: Store this info, allow user to pick a SIM for Android dialing
      // For instance, to use the first SIM for dialing on Android:
      // const selectedSubscriptionId = sims[0].subscriptionId;
      // await dialWithSim("*123#", selectedSubscriptionId);
    } else {
      console.log('No SIMs found or accessible.');
    }
  } catch (error) {
    console.error('Error getting SIM info:', error);
  }
}

// --- Dialing with a specific SIM (Android primarily) ---
async function dialWithSim(ussd: string, selectedSubscriptionId?: number) {
  // On Android, ensure CALL_PHONE permission
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: 'Call Permission',
        message: 'This app needs to make calls to run USSD codes.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('CALL_PHONE permission denied');
      return;
    }
  }

  const options: DialOptions = {};
  if (selectedSubscriptionId !== undefined && Platform.OS === 'android') {
    // Only apply subscriptionId on Android
    options.subscriptionId = selectedSubscriptionId;
  }

  try {
    await Ussd.dial(ussd, options); // Pass options, even if empty
    console.log(`USSD dial initiated for ${ussd} with options:`, options);
  } catch (error) {
    console.error('Error dialing USSD:', error);
  }
}

// --- Listening to USSD events (Android specific for USSD results) ---
// It's good practice to add listeners early, e.g., in a top-level component's mount effect.

// Listener for successful USSD replies (Android only)
const ussdEventListener = ussdEventEmitter.addListener('ussdEvent', (event) => {
  console.log('USSD Event (ussdEvent):', event.ussdReply);
  // Example: Parse event.ussdReply
  // let balance = event.ussdReply.split("is")[1].split(".Valid")[0];
  // let date = event.ussdReply.split("until")[1].split(".")[0];
});

// Listener for USSD errors during the session (Android only)
const ussdErrorEventListener = ussdEventEmitter.addListener('ussdErrorEvent', (event) => {
  console.error('USSD Error Event (ussdErrorEvent):', event.error);
  if (event.failureCode !== undefined) {
    console.error('Failure Code:', event.failureCode);
  }
});

// --- Example Function Calls ---
// Make sure to call these functions where appropriate in your app logic.
// For example, in a button press handler:

// To display SIM info:
// displaySimInfo();

// To dial with default/system-chosen SIM:
// dialWithSim("*123#");

// To dial with a specific SIM on Android (e.g., first SIM found):
// async function dialWithFirstSim() {
//   const sims = await Ussd.getSimInfo();
//   if (sims.length > 0 && Platform.OS === 'android') {
//     dialWithSim("*123#", sims[0].subscriptionId);
//   } else if (Platform.OS === 'ios') {
//     dialWithSim("*123#"); // On iOS, subscriptionId is ignored
//   } else {
//     console.log("No SIMs available or not on Android for specific SIM dialing.");
//   }
// }
// dialWithFirstSim();


// --- Cleanup ---
// Remember to remove listeners when they are no longer needed, e.g., in componentWillUnmount or useEffect cleanup.
// Example (if listeners were set up in a class component):
// componentWillUnmount() {
//   ussdEventListener.remove();
//   ussdErrorEventListener.remove();
// }
// For functional components with useEffect:
// useEffect(() => {
//   // ... listeners added here
//   return () => {
//     ussdEventListener.remove();
//     ussdErrorEventListener.remove();
//   };
// }, []);

```
The previous example can beadapted. The core functionalities `Ussd.dial`, `Ussd.getSimInfo`, and `ussdEventEmitter` are the building blocks.

## Running Tests

This project uses [Jest](https://jestjs.io/) as its testing framework. The tests cover the core functionalities of the library for both Android and iOS platforms by mocking native module interactions.

To run all tests, execute the following command from the project root:

```bash
npm test
```

To run tests for a specific file, you can use:

```bash
npm test <fileNameToTest>
```
For example, to run only the tests for the `dial` functionality:
```bash
npm test dial.test.js
```

Ensure you have installed the project dependencies (`npm install`) before running the tests.

## CI/CD Pipeline

This project uses GitHub Actions to automate linting, testing, and publishing to npm.

**Workflow:**

*   **Trigger:** The workflow automatically runs on every push to the `master` branch.
*   **Jobs:**
    1.  `lint-test`:
        *   Checks out the code.
        *   Sets up Node.js.
        *   Installs dependencies (`npm install`).
        *   Runs the linter (`npm run lint:js`).
        *   Runs tests (`npm test`).
    2.  `publish-npm`:
        *   Depends on the successful completion of the `lint-test` job.
        *   Checks out the code.
        *   Sets up Node.js and configures it for npm publishing.
        *   Installs dependencies (`npm install`).
        *   Publishes the package to npm (`npm publish`).

**NPM Publishing:**

For automatic publishing to npm to work, a secret named `NPM_TOKEN` must be configured in the GitHub repository settings. This token should be an npm access token with permission to publish the package.
