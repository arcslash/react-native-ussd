/**
 * USSD response parsing utilities
 */
export const UssdParser = {
  /**
   * Parse balance information from USSD response
   * @param {string} response - USSD response text
   * @param {string} [currency] - Optional currency code
   * @returns {{amount: number, currency?: string, expiryDate?: Date, rawResponse: string} | null}
   */
  parseBalance(response, currency) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    // Common balance patterns
    const patterns = [
      // "Your balance is 100.50" or "Balance: 100.50"
      /balance[:\s]+(?:is\s+)?[\$£€KSh\s]*([0-9,]+\.?[0-9]*)/i,
      // "Ksh 100.50" or "$100.50"
      /(?:Ksh|KES|USD|GBP|EUR|NGN|ZAR|UGX|TZS)[\s]*([0-9,]+\.?[0-9]*)/i,
      // Standalone number with currency symbol
      /[\$£€][\s]*([0-9,]+\.?[0-9]*)/,
      // Number followed by currency
      /([0-9,]+\.?[0-9]*)[\s]*(?:Ksh|KES|USD|GBP|EUR|NGN|ZAR|bob|birr)/i,
    ];

    let amount = null;
    let detectedCurrency = currency;

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        // Remove commas and parse
        amount = parseFloat(match[1].replace(/,/g, ''));

        // Try to detect currency from the match
        if (!detectedCurrency) {
          const currencyMatch = response.match(/(Ksh|KES|USD|GBP|EUR|NGN|ZAR|UGX|TZS|[\$£€])/i);
          if (currencyMatch) {
            const currMap = {
              'Ksh': 'KES',
              'KES': 'KES',
              '$': 'USD',
              '£': 'GBP',
              '€': 'EUR',
              'NGN': 'NGN',
              'ZAR': 'ZAR',
              'UGX': 'UGX',
              'TZS': 'TZS',
            };
            detectedCurrency = currMap[currencyMatch[1]] || currencyMatch[1];
          }
        }
        break;
      }
    }

    if (amount === null) {
      return null;
    }

    // Try to extract expiry date
    const expiryDate = this.extractDate(response);

    return {
      amount,
      currency: detectedCurrency,
      expiryDate,
      rawResponse: response,
    };
  },

  /**
   * Parse data bundle information
   * @param {string} response - USSD response text
   * @returns {{amountMB: number, remainingMB?: number, expiryDate?: Date, rawResponse: string} | null}
   */
  parseDataBundle(response) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    // Patterns for data amounts
    const patterns = [
      // "1.5GB", "500MB"
      /([0-9.]+)\s*(GB|MB|TB)/i,
      // "Data: 1.5 GB"
      /data[:\s]+([0-9.]+)\s*(GB|MB|TB)/i,
      // "Remaining: 500 MB"
      /remaining[:\s]+([0-9.]+)\s*(GB|MB|TB)/i,
    ];

    let amountMB = null;

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        let value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        // Convert to MB
        if (unit === 'GB') {
          value *= 1024;
        } else if (unit === 'TB') {
          value *= 1024 * 1024;
        }

        amountMB = value;
        break;
      }
    }

    if (amountMB === null) {
      return null;
    }

    // Try to find "remaining" separately
    const remainingMatch = response.match(/remaining[:\s]+([0-9.]+)\s*(GB|MB)/i);
    let remainingMB;
    if (remainingMatch) {
      remainingMB = parseFloat(remainingMatch[1]);
      if (remainingMatch[2].toUpperCase() === 'GB') {
        remainingMB *= 1024;
      }
    }

    const expiryDate = this.extractDate(response);

    return {
      amountMB,
      remainingMB,
      expiryDate,
      rawResponse: response,
    };
  },

  /**
   * Extract numeric amount from response
   * @param {string} response - USSD response text
   * @returns {number | null}
   */
  extractAmount(response) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    // Look for numbers (including decimals and commas)
    const match = response.match(/([0-9,]+\.?[0-9]*)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }

    return null;
  },

  /**
   * Extract date from response
   * @param {string} response - USSD response text
   * @returns {Date | null}
   */
  extractDate(response) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    // Common date patterns
    const patterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
      // YYYY-MM-DD
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
      // "31st Dec 2024", "31 December 2024"
      /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      // "Dec 31, 2024"
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        try {
          // Try to parse the matched date
          let dateStr;
          if (pattern.source.includes('Jan|Feb')) {
            // Month name format
            dateStr = match[0];
          } else if (match[1].length === 4) {
            // YYYY-MM-DD
            dateStr = `${match[1]}-${match[2]}-${match[3]}`;
          } else {
            // DD/MM/YYYY
            dateStr = `${match[3]}-${match[2]}-${match[1]}`;
          }

          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (e) {
          // Continue to next pattern
          continue;
        }
      }
    }

    // Look for "expires" or "valid until" keywords
    const expiryMatch = response.match(/(?:expires?|valid\s+until|expiry)[:\s]+(.+?)(?:\.|$)/i);
    if (expiryMatch) {
      const date = new Date(expiryMatch[1]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  },

  /**
   * Check if response is a menu (has options)
   * @param {string} response - USSD response text
   * @returns {boolean}
   */
  isMenu(response) {
    if (!response || typeof response !== 'string') {
      return false;
    }

    // Look for numbered options like "1. Option" or "1) Option"
    const menuPattern = /^\s*\d+[\.)]\s*.+$/m;
    return menuPattern.test(response);
  },

  /**
   * Extract menu options from response
   * @param {string} response - USSD response text
   * @returns {string[]} Array of menu options
   */
  extractMenuOptions(response) {
    if (!response || typeof response !== 'string') {
      return [];
    }

    const options = [];
    const lines = response.split('\n');

    for (const line of lines) {
      // Match lines like "1. Option" or "1) Option"
      const match = line.match(/^\s*(\d+)[\.)]\s*(.+)$/);
      if (match) {
        options.push({
          number: match[1],
          text: match[2].trim(),
        });
      }
    }

    return options;
  },

  /**
   * Clean up USSD response text
   * Removes excessive whitespace, special characters
   * @param {string} response - USSD response text
   * @returns {string} Cleaned response
   */
  cleanResponse(response) {
    if (!response || typeof response !== 'string') {
      return '';
    }

    return response
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Normalize whitespace
      .trim();
  },

  /**
   * Check if response indicates success
   * @param {string} response - USSD response text
   * @returns {boolean}
   */
  isSuccessResponse(response) {
    if (!response || typeof response !== 'string') {
      return false;
    }

    const successKeywords = [
      'success',
      'successful',
      'completed',
      'done',
      'confirmed',
      'approved',
      'accepted',
    ];

    const lowerResponse = response.toLowerCase();
    return successKeywords.some(keyword => lowerResponse.includes(keyword));
  },

  /**
   * Check if response indicates error
   * @param {string} response - USSD response text
   * @returns {boolean}
   */
  isErrorResponse(response) {
    if (!response || typeof response !== 'string') {
      return false;
    }

    const errorKeywords = [
      'error',
      'failed',
      'failure',
      'invalid',
      'declined',
      'rejected',
      'insufficient',
      'unable',
      'cannot',
    ];

    const lowerResponse = response.toLowerCase();
    return errorKeywords.some(keyword => lowerResponse.includes(keyword));
  },
};

export default UssdParser;
