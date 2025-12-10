import { NativeModules, NativeEventEmitter } from 'react-native';
import { UssdValidator } from './src/validator';
import { UssdParser } from './src/parser';
import { UssdCodes } from './src/ussdCodes';
import { UssdErrorCode, DEFAULT_CONFIG, EVENTS } from './src/constants';

const { Ussd: NativeUssd } = NativeModules;

// Create event emitter
export const ussdEventEmitter = new NativeEventEmitter(NativeUssd);

// Response middleware storage
const responseMiddleware = [];

// Enhanced Ussd module with JavaScript wrappers
const Ussd = {
  // Native methods (pass-through)
  getSimInfo: () => NativeUssd.getSimInfo(),
  sendResponse: (response, subscriptionId) => NativeUssd.sendResponse(response, subscriptionId),
  cancelSession: (subscriptionId) => NativeUssd.cancelSession(subscriptionId),
  getSessionState: () => NativeUssd.getSessionState(),
  setTimeout: (milliseconds) => NativeUssd.setTimeout(milliseconds),
  isNetworkAvailable: () => NativeUssd.isNetworkAvailable(),
  getNetworkStatus: () => NativeUssd.getNetworkStatus(),
  getCarrierInfo: (subscriptionId) => NativeUssd.getCarrierInfo(subscriptionId),
  checkPermissions: () => NativeUssd.checkPermissions(),
  requestPermissions: () => NativeUssd.requestPermissions(),
  getDefaultSimForCalls: () => NativeUssd.getDefaultSimForCalls(),
  getDefaultSimForData: () => NativeUssd.getDefaultSimForData(),
  getHistory: (limit) => NativeUssd.getHistory(limit),
  clearHistory: () => NativeUssd.clearHistory(),
  setSecureMode: (enabled) => NativeUssd.setSecureMode(enabled),
  getPendingResponses: () => NativeUssd.getPendingResponses(),
  getMetrics: () => NativeUssd.getMetrics(),

  /**
   * Dial a USSD code with options
   * @param {string} ussdCode - The USSD code to dial
   * @param {Object} options - Options for dialing
   * @returns {Promise<void>}
   */
  async dial(ussdCode, options = {}) {
    // Validate code
    const validation = UssdValidator.validateCode(ussdCode);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const formattedCode = validation.formattedCode;

    // Call native dial with options
    return NativeUssd.dial(formattedCode, options);
  },

  /**
   * Dial with automatic retry on failure
   * @param {string} code - USSD code to dial
   * @param {Object} options - Dial options
   * @param {Object} retryConfig - Retry configuration
   * @returns {Promise<void>}
   */
  async dialWithRetry(code, options = {}, retryConfig = {}) {
    const {
      maxAttempts = DEFAULT_CONFIG.DEFAULT_RETRY_ATTEMPTS,
      delayMs = DEFAULT_CONFIG.DEFAULT_RETRY_DELAY_MS,
      exponentialBackoff = true,
      retryOnErrors = ['NETWORK_ERROR', 'TIMEOUT', 'SESSION_BUSY'],
    } = retryConfig;

    let lastError;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.dial(code, options);
        return; // Success
      } catch (error) {
        lastError = error;

        // Check if we should retry this error
        const shouldRetry =
          attempt < maxAttempts &&
          (retryOnErrors.includes(error.code) || retryOnErrors.includes(error.message));

        if (!shouldRetry) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, currentDelay));

        // Increase delay for next attempt if exponential backoff
        if (exponentialBackoff) {
          currentDelay *= 2;
        }

        console.log(`USSD retry attempt ${attempt}/${maxAttempts} for code: ${code}`);
      }
    }

    throw lastError;
  },

  /**
   * Execute multiple USSD requests in sequence
   * @param {Array} requests - Array of {code, options} objects
   * @param {number} delayBetweenMs - Delay between requests in milliseconds
   * @returns {Promise<Array>} Array of results
   */
  async dialBatch(requests, delayBetweenMs = DEFAULT_CONFIG.BATCH_DELAY_MS) {
    const results = [];

    for (let i = 0; i < requests.length; i++) {
      const { code, options } = requests[i];

      try {
        await this.dial(code, options);
        results.push({
          request: requests[i],
          success: true,
          response: null, // Response comes via events
        });
      } catch (error) {
        results.push({
          request: requests[i],
          success: false,
          error: error.message || error.toString(),
        });
      }

      // Wait before next request (except for last one)
      if (i < requests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
      }
    }

    return results;
  },

  /**
   * Add response middleware
   * @param {Function} middleware - Middleware function
   */
  addResponseMiddleware(middleware) {
    if (typeof middleware === 'function') {
      responseMiddleware.push(middleware);
    } else {
      throw new Error('Middleware must be a function');
    }
  },

  /**
   * Remove response middleware
   * @param {Function} middleware - Middleware function to remove
   */
  removeResponseMiddleware(middleware) {
    const index = responseMiddleware.indexOf(middleware);
    if (index > -1) {
      responseMiddleware.splice(index, 1);
    }
  },

  /**
   * Clear all response middleware
   */
  clearResponseMiddleware() {
    responseMiddleware.length = 0;
  },
};

// Apply middleware to USSD responses
ussdEventEmitter.addListener(EVENTS.USSD_EVENT, async (event) => {
  if (responseMiddleware.length > 0) {
    let processedResponse = event.ussdReply;

    for (const middleware of responseMiddleware) {
      try {
        processedResponse = await middleware(
          processedResponse,
          event.code,
          event.subscriptionId
        );
      } catch (error) {
        console.error('Error in USSD response middleware:', error);
      }
    }

    // Emit processed response if changed
    if (processedResponse !== event.ussdReply) {
      event.ussdReply = processedResponse;
    }
  }
});

// Export everything
export {
  UssdValidator,
  UssdParser,
  UssdCodes,
  UssdErrorCode,
  EVENTS,
};

export default Ussd;
