import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const UssdModule = NativeModules.Ussd; // Renaming for clarity if preferred

// Ensure UssdModule is defined. If not, provide a mock for non-native environments or throw error.
if (!UssdModule) {
  console.warn("Native module 'Ussd' not found. Features will not work.");
  // Fallback or mock implementation can be provided here if desired for non-native testing
}

export const ussdEventEmitter = UssdModule ? new NativeEventEmitter(UssdModule) : null;

// Re-export constants for event names if they are exposed by native module's getConstants()
// Example: export const USSDEvents = UssdModule ? UssdModule.getConstants() : {};
// For now, assume event names are used as strings directly as per README.

export interface SimInfo {
  slotIndex: number;
  subscriptionId?: number; // Android: actual ID. iOS: same as slotIndex for consistency.
  carrierName?: string;
  phoneNumber?: string; 
  countryIso?: string;
  mobileCountryCode?: string; // Android specific
  mobileNetworkCode?: string; // Android specific
}

export interface DialOptions {
  /**
   * (Android Only) The subscriptionId from SimInfo to use for sending the USSD code.
   * On iOS, this is ignored by the OS for SIM selection during dialing.
   */
  subscriptionId?: number;
}

/**
 * Retrieves information about available and active SIM cards on the device.
 * @returns A Promise that resolves with an array of SimInfo objects.
 */
export async function getSimInfo(): Promise<SimInfo[]> {
  if (UssdModule && UssdModule.getSimInfo) {
    return UssdModule.getSimInfo();
  }
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    console.warn('getSimInfo is not supported on this platform.');
  }
  return Promise.resolve([]);
}

/**
 * Starts a USSD session.
 * On Android, this initiates an interactive session. The promise resolves with the first network response.
 * Subsequent responses are delivered via the 'ussdMessageReceived' or 'ussdErrorEvent' events on `ussdEventEmitter`.
 * On iOS, this opens the Phone app with the USSD code. Interactive sessions are handled by the Phone app.
 * The promise resolves after attempting to open the dialer, not with a network response from the USSD service.
 *
 * @param ussdCode The initial USSD code (e.g., "*123#").
 * @param options Optional parameters, including `subscriptionId` for SIM selection (Android only).
 * @returns Promise<string> - Android: First network response. iOS: Resolves with an empty string if dialer is successfully opened, rejects otherwise.
 */
export async function startSession(ussdCode: string, options?: DialOptions): Promise<string> {
  if (!UssdModule || !UssdModule.startSession) {
    return Promise.reject(new Error("Ussd.startSession native method not available."));
  }
  // Pass null for subscriptionId if options or options.subscriptionId is undefined.
  // The native module handles the nullable Integer/NSNumber.
  return UssdModule.startSession(ussdCode, options?.subscriptionId ?? null);
}

/**
 * Sends a message/reply into an active USSD session.
 * THIS IS ANDROID ONLY. It allows sending subsequent input after a session has been started.
 * On iOS, this function will reject the promise as interactive USSD sessions are not manageable in-app.
 *
 * @param message The message/input to send (e.g., PIN, menu choice).
 * @returns Promise<string> - The network's response to this message.
 */
export async function sendMessage(message: string): Promise<string> {
  if (Platform.OS === 'ios') {
    return Promise.reject(new Error("Interactive USSD messaging (sendMessage) is not supported on iOS."));
  }
  if (!UssdModule || !UssdModule.sendMessage) {
    return Promise.reject(new Error("Ussd.sendMessage native method not available."));
  }
  return UssdModule.sendMessage(message);
}

/**
 * Attempts to cancel the active USSD session locally (Android) or is a no-op (iOS).
 * On Android, this clears local session state. Actual network session termination may vary.
 *
 * @returns Promise<void>
 */
export async function cancelSession(): Promise<void> {
  if (Platform.OS === 'ios') {
    return Promise.resolve(); // No-op on iOS
  }
  if (!UssdModule || !UssdModule.cancelSession) {
    return Promise.reject(new Error("Ussd.cancelSession native method not available."));
  }
  return UssdModule.cancelSession();
}

// Default export
export default {
  getSimInfo,
  startSession,
  sendMessage,
  cancelSession,
  // ussdEventEmitter should be imported directly by apps: 
  // import { ussdEventEmitter } from 'react-native-ussd';
};

// It's good practice to also export types for event payloads if they are complex,
// matching what's documented in README.md. For example:
// export type { UssdSessionEvent, UssdErrorEvent, UssdSessionEndedEvent }; // (if defined elsewhere)
