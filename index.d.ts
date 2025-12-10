declare module 'react-native-ussd' {
  import { EmitterSubscription } from 'react-native';

  // ==================== Types & Interfaces ====================

  /**
   * SIM card information
   */
  export interface SimInfo {
    /** 0-based logical index of the SIM slot */
    slotIndex: number;
    /** Subscription ID (Android) or same as slotIndex (iOS) */
    subscriptionId: number;
    /** Name of the network carrier (e.g., "Verizon", "T-Mobile") */
    carrierName?: string;
    /** Phone number associated with the SIM (may be null) */
    phoneNumber?: string;
    /** ISO country code for the SIM's network (e.g., "us", "gb") */
    countryIso?: string;
    /** Mobile Country Code (MCC) */
    mobileCountryCode?: string;
    /** Mobile Network Code (MNC) */
    mobileNetworkCode?: string;
    /** Whether this is the default SIM for calls (Android only) */
    isDefaultForCalls?: boolean;
    /** Whether this is the default SIM for data (Android only) */
    isDefaultForData?: boolean;
    /** Whether the device is currently roaming on this SIM */
    isRoaming?: boolean;
  }

  /**
   * Options for dialing USSD codes
   */
  export interface DialOptions {
    /** The subscriptionId of the SIM to use for dialing (Android only) */
    subscriptionId?: number;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Enable secure mode (prevents logging of response) */
    secureMode?: boolean;
  }

  /**
   * USSD session state
   */
  export interface SessionState {
    /** Whether a USSD session is currently active */
    isActive: boolean;
    /** The USSD code of the active session */
    code?: string;
    /** The subscription ID of the active session */
    subscriptionId?: number;
    /** Timestamp when session started */
    startTime?: number;
    /** Whether the session is waiting for user input */
    waitingForInput?: boolean;
  }

  /**
   * USSD event data
   */
  export interface UssdEvent {
    /** The USSD response text */
    ussdReply: string;
    /** The USSD code that was dialed */
    code?: string;
    /** The subscription ID used */
    subscriptionId?: number;
    /** Timestamp of the response */
    timestamp?: number;
  }

  /**
   * USSD error event data
   */
  export interface UssdErrorEvent {
    /** Error message */
    error: string;
    /** Platform-specific failure code */
    failureCode?: number;
    /** The USSD code that failed */
    code?: string;
    /** The subscription ID used */
    subscriptionId?: number;
  }

  /**
   * Permission status
   */
  export interface PermissionStatus {
    /** Whether CALL_PHONE permission is granted (Android) */
    callPhone: boolean;
    /** Whether READ_PHONE_STATE permission is granted (Android) */
    readPhoneState: boolean;
    /** Whether READ_PHONE_NUMBERS permission is granted (Android) */
    readPhoneNumbers: boolean;
    /** Whether all required permissions are granted */
    allGranted: boolean;
    /** List of missing permissions */
    missingPermissions: string[];
  }

  /**
   * Carrier information
   */
  export interface CarrierInfo {
    /** Carrier name */
    name: string;
    /** Mobile Country Code */
    mcc: string;
    /** Mobile Network Code */
    mnc: string;
    /** Whether this is an MVNO (Mobile Virtual Network Operator) */
    isMvno?: boolean;
    /** Parent carrier name if MVNO */
    parentCarrier?: string;
    /** ISO country code */
    countryIso: string;
  }

  /**
   * Network status information
   */
  export interface NetworkStatus {
    /** Whether network is available */
    isAvailable: boolean;
    /** Network type (e.g., "LTE", "3G", "5G") */
    networkType?: string;
    /** Whether device is roaming */
    isRoaming: boolean;
    /** Signal strength (0-4, or -1 if unknown) */
    signalStrength?: number;
  }

  /**
   * USSD code validation result
   */
  export interface ValidationResult {
    /** Whether the USSD code is valid */
    isValid: boolean;
    /** Error message if invalid */
    error?: string;
    /** Sanitized/formatted code if valid */
    formattedCode?: string;
  }

  /**
   * USSD history entry
   */
  export interface UssdHistoryEntry {
    /** USSD code that was dialed */
    code: string;
    /** Timestamp of the request */
    timestamp: number;
    /** Response received (if any) */
    response?: string;
    /** Subscription ID used */
    subscriptionId?: number;
    /** Whether the request was successful */
    success: boolean;
    /** Error message if failed */
    error?: string;
  }

  /**
   * Balance information parsed from USSD response
   */
  export interface BalanceInfo {
    /** Account balance amount */
    amount: number;
    /** Currency code (e.g., "USD", "KES") */
    currency?: string;
    /** Expiry date if available */
    expiryDate?: Date;
    /** Raw response text */
    rawResponse: string;
  }

  /**
   * Data bundle information
   */
  export interface DataInfo {
    /** Data amount in MB */
    amountMB: number;
    /** Remaining data in MB */
    remainingMB?: number;
    /** Expiry date */
    expiryDate?: Date;
    /** Raw response text */
    rawResponse: string;
  }

  /**
   * Retry configuration
   */
  export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxAttempts: number;
    /** Delay between retries in milliseconds */
    delayMs: number;
    /** Use exponential backoff */
    exponentialBackoff?: boolean;
    /** Retry only on specific error types */
    retryOnErrors?: string[];
  }

  /**
   * Batch USSD request
   */
  export interface UssdRequest {
    /** USSD code to dial */
    code: string;
    /** Options for this request */
    options?: DialOptions;
  }

  /**
   * Batch operation result
   */
  export interface BatchResult {
    /** The original request */
    request: UssdRequest;
    /** Whether the request was successful */
    success: boolean;
    /** Response if successful */
    response?: string;
    /** Error if failed */
    error?: string;
  }

  /**
   * USSD metrics/analytics
   */
  export interface UssdMetrics {
    /** Total number of USSD requests made */
    totalRequests: number;
    /** Number of successful requests */
    successfulRequests: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Average response time in milliseconds */
    avgResponseTime: number;
    /** Most frequently used USSD codes */
    topCodes: Array<{ code: string; count: number }>;
  }

  /**
   * Response middleware function type
   */
  export type ResponseMiddleware = (
    response: string,
    code: string,
    subscriptionId?: number
  ) => string | Promise<string>;

  // ==================== Error Codes ====================

  /**
   * USSD error codes
   */
  export enum UssdErrorCode {
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',
    INVALID_CODE = 'INVALID_CODE',
    NO_ACTIVE_SESSION = 'NO_ACTIVE_SESSION',
    SESSION_BUSY = 'SESSION_BUSY',
    SIM_NOT_FOUND = 'SIM_NOT_FOUND',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  }

  /**
   * Telephony Manager failure codes (Android)
   */
  export enum TelephonyFailureCode {
    UNKNOWN = -1,
    NO_SERVICE = 1,
    RADIO_OFF = 2,
    BUSY = 3,
    ERROR_IN_REQUEST = 4,
  }

  // ==================== Main Ussd Module ====================

  /**
   * Main USSD module interface
   */
  export interface UssdModule {
    /**
     * Get information about available SIM cards
     */
    getSimInfo(): Promise<SimInfo[]>;

    /**
     * Dial a USSD code
     */
    dial(ussdCode: string, options?: DialOptions): Promise<void>;

    /**
     * Send a response to an interactive USSD session (Android only)
     */
    sendResponse(response: string, subscriptionId?: number): Promise<void>;

    /**
     * Cancel an active USSD session
     */
    cancelSession(subscriptionId?: number): Promise<void>;

    /**
     * Get the current session state
     */
    getSessionState(): Promise<SessionState>;

    /**
     * Set USSD response timeout in milliseconds
     */
    setTimeout(milliseconds: number): Promise<void>;

    /**
     * Check if network is available
     */
    isNetworkAvailable(): Promise<boolean>;

    /**
     * Get detailed network status
     */
    getNetworkStatus(): Promise<NetworkStatus>;

    /**
     * Get carrier information for a specific SIM
     */
    getCarrierInfo(subscriptionId?: number): Promise<CarrierInfo>;

    /**
     * Check permissions status
     */
    checkPermissions(): Promise<PermissionStatus>;

    /**
     * Request required permissions (Android only)
     */
    requestPermissions(): Promise<boolean>;

    /**
     * Get default SIM for calls
     */
    getDefaultSimForCalls(): Promise<number | null>;

    /**
     * Get default SIM for data
     */
    getDefaultSimForData(): Promise<number | null>;

    /**
     * Get USSD request history
     */
    getHistory(limit?: number): Promise<UssdHistoryEntry[]>;

    /**
     * Clear USSD request history
     */
    clearHistory(): Promise<void>;

    /**
     * Enable or disable secure mode
     */
    setSecureMode(enabled: boolean): Promise<void>;

    /**
     * Get pending USSD responses (when app was backgrounded)
     */
    getPendingResponses(): Promise<UssdEvent[]>;

    /**
     * Get USSD usage metrics
     */
    getMetrics(): Promise<UssdMetrics>;

    /**
     * Add response middleware
     */
    addResponseMiddleware(middleware: ResponseMiddleware): void;

    /**
     * Remove response middleware
     */
    removeResponseMiddleware(middleware: ResponseMiddleware): void;

    /**
     * Clear all response middleware
     */
    clearResponseMiddleware(): void;

    /**
     * Dial with retry on failure
     */
    dialWithRetry(
      code: string,
      options?: DialOptions,
      retryConfig?: RetryConfig
    ): Promise<void>;

    /**
     * Execute multiple USSD requests in sequence
     */
    dialBatch(requests: UssdRequest[], delayBetweenMs?: number): Promise<BatchResult[]>;
  }

  // ==================== Utilities ====================

  /**
   * USSD code validation utilities
   */
  export namespace UssdValidator {
    /**
     * Validate a USSD code format
     */
    function validateCode(code: string): ValidationResult;

    /**
     * Check if code is valid (simple boolean check)
     */
    function isValid(code: string): boolean;

    /**
     * Sanitize and format USSD code
     */
    function formatCode(code: string): string;
  }

  /**
   * USSD response parsing utilities
   */
  export namespace UssdParser {
    /**
     * Parse balance information from USSD response
     */
    function parseBalance(response: string, currency?: string): BalanceInfo | null;

    /**
     * Parse data bundle information
     */
    function parseDataBundle(response: string): DataInfo | null;

    /**
     * Extract numeric amount from response
     */
    function extractAmount(response: string): number | null;

    /**
     * Extract date from response
     */
    function extractDate(response: string): Date | null;

    /**
     * Check if response is a menu (has options)
     */
    function isMenu(response: string): boolean;

    /**
     * Extract menu options from response
     */
    function extractMenuOptions(response: string): string[];
  }

  /**
   * Pre-defined USSD codes library
   */
  export namespace UssdCodes {
    /**
     * Get balance check code for a carrier
     */
    function getBalanceCheck(carrier: string, country?: string): string | null;

    /**
     * Get data bundle codes for a carrier
     */
    function getDataBundles(carrier: string, country?: string): string[] | null;

    /**
     * Get airtime top-up code
     */
    function getAirtimeTopUp(carrier: string, country?: string): string | null;

    /**
     * Get customer care code
     */
    function getCustomerCare(carrier: string, country?: string): string | null;

    /**
     * Get all known codes for a carrier
     */
    function getAllCodes(carrier: string, country?: string): Record<string, string> | null;

    /**
     * Add custom code to library
     */
    function addCustomCode(
      carrier: string,
      codeType: string,
      code: string,
      country?: string
    ): void;
  }

  // ==================== Event Emitter ====================

  /**
   * USSD event emitter for listening to USSD events
   */
  export interface UssdEventEmitter {
    /**
     * Add listener for USSD response events
     */
    addListener(
      eventType: 'ussdEvent',
      listener: (event: UssdEvent) => void
    ): EmitterSubscription;

    /**
     * Add listener for USSD error events
     */
    addListener(
      eventType: 'ussdErrorEvent',
      listener: (event: UssdErrorEvent) => void
    ): EmitterSubscription;

    /**
     * Add listener for SIM state changes
     */
    addListener(
      eventType: 'simStateChanged',
      listener: (sims: SimInfo[]) => void
    ): EmitterSubscription;

    /**
     * Add listener for session state changes
     */
    addListener(
      eventType: 'sessionStateChanged',
      listener: (state: SessionState) => void
    ): EmitterSubscription;

    /**
     * Remove all listeners for an event type
     */
    removeAllListeners(eventType: string): void;

    /**
     * Remove specific listener
     */
    removeListener(eventType: string, listener: Function): void;
  }

  // ==================== Exports ====================

  const Ussd: UssdModule;
  export const ussdEventEmitter: UssdEventEmitter;

  export default Ussd;
}
