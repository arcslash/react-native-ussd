import { UssdErrorCode } from './constants';

/**
 * USSD code validation utilities
 */
export const UssdValidator = {
  /**
   * Validate a USSD code format
   * Valid formats:
   * - *123# (standard)
   * - *123*456# (with parameters)
   * - #123# (alternative format)
   * - *#123# (query format)
   *
   * @param {string} code - USSD code to validate
   * @returns {{isValid: boolean, error?: string, formattedCode?: string}}
   */
  validateCode(code) {
    if (!code || typeof code !== 'string') {
      return {
        isValid: false,
        error: 'USSD code must be a non-empty string',
      };
    }

    const trimmedCode = code.trim();

    if (trimmedCode.length === 0) {
      return {
        isValid: false,
        error: 'USSD code cannot be empty',
      };
    }

    // USSD codes typically start with * or # and end with #
    const ussdPattern = /^[*#][\d*#]+#?$/;

    if (!ussdPattern.test(trimmedCode)) {
      return {
        isValid: false,
        error: 'Invalid USSD code format. Must start with * or # and contain only digits, *, and #',
      };
    }

    // Most USSD codes should end with #
    let formattedCode = trimmedCode;
    if (!trimmedCode.endsWith('#')) {
      formattedCode = trimmedCode + '#';
    }

    // Check for reasonable length (most USSD codes are between 3-20 characters)
    if (formattedCode.length < 3 || formattedCode.length > 30) {
      return {
        isValid: false,
        error: 'USSD code length must be between 3 and 30 characters',
      };
    }

    return {
      isValid: true,
      formattedCode,
    };
  },

  /**
   * Check if code is valid (simple boolean check)
   * @param {string} code - USSD code to validate
   * @returns {boolean}
   */
  isValid(code) {
    return this.validateCode(code).isValid;
  },

  /**
   * Sanitize and format USSD code
   * @param {string} code - USSD code to format
   * @returns {string} Formatted USSD code
   * @throws {Error} If code is invalid
   */
  formatCode(code) {
    const result = this.validateCode(code);
    if (!result.isValid) {
      throw new Error(result.error || 'Invalid USSD code');
    }
    return result.formattedCode;
  },

  /**
   * Check if code is a balance check code
   * @param {string} code - USSD code to check
   * @returns {boolean}
   */
  isBalanceCheck(code) {
    const balancePatterns = [
      /\*1[0-9]{2}#/, // Common pattern like *144#, *123#
      /\*[0-9]{3}#/,  // *556#
      /#BAL#/i,       // T-Mobile style
      /\*#10#/,       // O2 UK
    ];
    return balancePatterns.some(pattern => pattern.test(code));
  },

  /**
   * Extract parameters from parameterized USSD code
   * Example: *123*456*789# -> ['456', '789']
   * @param {string} code - USSD code
   * @returns {string[]} Array of parameters
   */
  extractParameters(code) {
    const parts = code.replace(/^[*#]/, '').replace(/#$/, '').split('*');
    return parts.slice(1); // First part is the main code
  },
};

export default UssdValidator;
