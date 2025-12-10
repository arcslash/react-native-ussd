import { USSD_CODES_DATABASE } from './constants';

/**
 * Custom codes added by users
 */
const customCodes = {};

/**
 * Pre-defined USSD codes library
 */
export const UssdCodes = {
  /**
   * Get balance check code for a carrier
   * @param {string} carrier - Carrier name (e.g., "Safaricom", "MTN")
   * @param {string} [country] - Optional ISO country code (e.g., "KE", "NG")
   * @returns {string | null} USSD code or null if not found
   */
  getBalanceCheck(carrier, country) {
    return this._getCode(carrier, 'balanceCheck', country);
  },

  /**
   * Get data bundle codes for a carrier
   * @param {string} carrier - Carrier name
   * @param {string} [country] - Optional ISO country code
   * @returns {string[] | null} Array of USSD codes or null if not found
   */
  getDataBundles(carrier, country) {
    const code = this._getCode(carrier, 'dataBundles', country);
    if (code) {
      return Array.isArray(code) ? code : [code];
    }
    return null;
  },

  /**
   * Get airtime top-up code
   * @param {string} carrier - Carrier name
   * @param {string} [country] - Optional ISO country code
   * @returns {string | null} USSD code or null if not found
   */
  getAirtimeTopUp(carrier, country) {
    return this._getCode(carrier, 'airtimeTopUp', country);
  },

  /**
   * Get customer care code
   * @param {string} carrier - Carrier name
   * @param {string} [country] - Optional ISO country code
   * @returns {string | null} USSD code or null if not found
   */
  getCustomerCare(carrier, country) {
    return this._getCode(carrier, 'customerCare', country);
  },

  /**
   * Get "my number" code
   * @param {string} carrier - Carrier name
   * @param {string} [country] - Optional ISO country code
   * @returns {string | null} USSD code or null if not found
   */
  getMyNumber(carrier, country) {
    return this._getCode(carrier, 'myNumber', country);
  },

  /**
   * Get all known codes for a carrier
   * @param {string} carrier - Carrier name
   * @param {string} [country] - Optional ISO country code
   * @returns {Object | null} Object with all codes or null if carrier not found
   */
  getAllCodes(carrier, country) {
    const normalizedCarrier = this._normalizeCarrierName(carrier);

    // Check custom codes first
    if (country && customCodes[country] && customCodes[country][normalizedCarrier]) {
      return { ...customCodes[country][normalizedCarrier] };
    }

    // Search in database
    if (country && USSD_CODES_DATABASE[country]) {
      const carrierData = USSD_CODES_DATABASE[country][normalizedCarrier];
      if (carrierData) {
        return { ...carrierData };
      }
    }

    // Search across all countries if country not specified
    if (!country) {
      for (const countryCode of Object.keys(USSD_CODES_DATABASE)) {
        const carrierData = USSD_CODES_DATABASE[countryCode][normalizedCarrier];
        if (carrierData) {
          return { ...carrierData };
        }
      }
    }

    return null;
  },

  /**
   * Add custom code to library
   * @param {string} carrier - Carrier name
   * @param {string} codeType - Type of code (e.g., 'balanceCheck', 'dataBundles')
   * @param {string | string[]} code - USSD code(s)
   * @param {string} [country='CUSTOM'] - ISO country code
   */
  addCustomCode(carrier, codeType, code, country = 'CUSTOM') {
    const normalizedCarrier = this._normalizeCarrierName(carrier);

    if (!customCodes[country]) {
      customCodes[country] = {};
    }

    if (!customCodes[country][normalizedCarrier]) {
      customCodes[country][normalizedCarrier] = {};
    }

    customCodes[country][normalizedCarrier][codeType] = code;
  },

  /**
   * Get all available carriers
   * @param {string} [country] - Optional ISO country code
   * @returns {string[]} Array of carrier names
   */
  getAvailableCarriers(country) {
    const carriers = new Set();

    if (country && USSD_CODES_DATABASE[country]) {
      Object.keys(USSD_CODES_DATABASE[country]).forEach(carrier => carriers.add(carrier));
    } else {
      // Get all carriers across all countries
      Object.values(USSD_CODES_DATABASE).forEach(countryData => {
        Object.keys(countryData).forEach(carrier => carriers.add(carrier));
      });
    }

    // Add custom carriers
    if (country && customCodes[country]) {
      Object.keys(customCodes[country]).forEach(carrier => carriers.add(carrier));
    } else if (!country) {
      Object.values(customCodes).forEach(countryData => {
        Object.keys(countryData).forEach(carrier => carriers.add(carrier));
      });
    }

    return Array.from(carriers).sort();
  },

  /**
   * Get all available countries
   * @returns {string[]} Array of ISO country codes
   */
  getAvailableCountries() {
    const countries = new Set([
      ...Object.keys(USSD_CODES_DATABASE),
      ...Object.keys(customCodes),
    ]);
    return Array.from(countries).sort();
  },

  /**
   * Search for codes by carrier name (fuzzy match)
   * @param {string} query - Search query
   * @param {string} [country] - Optional ISO country code
   * @returns {Array<{carrier: string, country: string, codes: Object}>}
   */
  searchCarrier(query, country) {
    const results = [];
    const normalizedQuery = query.toLowerCase();

    const searchIn = country
      ? { [country]: USSD_CODES_DATABASE[country] }
      : USSD_CODES_DATABASE;

    for (const [countryCode, carriers] of Object.entries(searchIn)) {
      if (!carriers) continue;

      for (const [carrierName, codes] of Object.entries(carriers)) {
        if (carrierName.toLowerCase().includes(normalizedQuery)) {
          results.push({
            carrier: carrierName,
            country: countryCode,
            codes: { ...codes },
          });
        }
      }
    }

    return results;
  },

  /**
   * Internal method to get a specific code
   * @private
   */
  _getCode(carrier, codeType, country) {
    const normalizedCarrier = this._normalizeCarrierName(carrier);

    // Check custom codes first
    if (country && customCodes[country] && customCodes[country][normalizedCarrier]) {
      const code = customCodes[country][normalizedCarrier][codeType];
      if (code !== undefined) {
        return code;
      }
    }

    // Search in database
    if (country && USSD_CODES_DATABASE[country]) {
      const carrierData = USSD_CODES_DATABASE[country][normalizedCarrier];
      if (carrierData && carrierData[codeType] !== undefined) {
        return carrierData[codeType];
      }
    }

    // Search across all countries if country not specified
    if (!country) {
      for (const countryCode of Object.keys(USSD_CODES_DATABASE)) {
        const carrierData = USSD_CODES_DATABASE[countryCode][normalizedCarrier];
        if (carrierData && carrierData[codeType] !== undefined) {
          return carrierData[codeType];
        }
      }

      // Check custom codes
      for (const countryCode of Object.keys(customCodes)) {
        const carrierData = customCodes[countryCode][normalizedCarrier];
        if (carrierData && carrierData[codeType] !== undefined) {
          return carrierData[codeType];
        }
      }
    }

    return null;
  },

  /**
   * Normalize carrier name for consistent lookup
   * @private
   */
  _normalizeCarrierName(carrier) {
    // Simple normalization - can be enhanced
    const normalized = carrier.trim();

    // Handle common variations
    const variations = {
      'att': 'ATT',
      'at&t': 'ATT',
      't-mobile': 'T-Mobile',
      'tmobile': 'T-Mobile',
      'cellc': 'Cell C',
      'cell-c': 'Cell C',
      'airteltigo': 'AirtelTigo',
      'airtel-tigo': 'AirtelTigo',
      'vodacom': 'Vodacom',
      'mtn': 'MTN',
    };

    return variations[normalized.toLowerCase()] || normalized;
  },

  /**
   * Clear all custom codes
   */
  clearCustomCodes() {
    for (const country in customCodes) {
      delete customCodes[country];
    }
  },

  /**
   * Export custom codes (for persistence)
   * @returns {Object}
   */
  exportCustomCodes() {
    return JSON.parse(JSON.stringify(customCodes));
  },

  /**
   * Import custom codes (from persistence)
   * @param {Object} codes - Custom codes object
   */
  importCustomCodes(codes) {
    Object.assign(customCodes, codes);
  },
};

export default UssdCodes;
