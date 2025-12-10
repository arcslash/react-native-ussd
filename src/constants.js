/**
 * USSD Error Codes
 */
export const UssdErrorCode = {
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_CODE: 'INVALID_CODE',
  NO_ACTIVE_SESSION: 'NO_ACTIVE_SESSION',
  SESSION_BUSY: 'SESSION_BUSY',
  SIM_NOT_FOUND: 'SIM_NOT_FOUND',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Android TelephonyManager failure codes
 * Reference: https://developer.android.com/reference/android/telephony/TelephonyManager.UssdResponseCallback
 */
export const TelephonyFailureCode = {
  UNKNOWN: -1,
  NO_SERVICE: 1,
  RADIO_OFF: 2,
  BUSY: 3,
  ERROR_IN_REQUEST: 4,
};

/**
 * Common USSD codes database organized by country and carrier
 */
export const USSD_CODES_DATABASE = {
  // Kenya
  KE: {
    Safaricom: {
      balanceCheck: '*144#',
      dataBundles: ['*544#', '*459#'],
      airtimeTopUp: '*141#',
      customerCare: '100',
      myNumber: '*200#',
      sambaMoneyBalance: '*234#',
      sambaMoney: '*234#',
    },
    Airtel: {
      balanceCheck: '*123#',
      dataBundles: ['*544#'],
      airtimeTopUp: '*141#',
      customerCare: '100',
      myNumber: '*121#',
    },
    Telkom: {
      balanceCheck: '*130#',
      dataBundles: ['*544#'],
      airtimeTopUp: '*141#',
      customerCare: '100',
    },
  },

  // United States
  US: {
    'T-Mobile': {
      balanceCheck: '#BAL#',
      customerCare: '611',
      myNumber: '#NUM#',
    },
    ATT: {
      balanceCheck: '*646#',
      customerCare: '611',
    },
    Verizon: {
      balanceCheck: '*DATA#',
      customerCare: '611',
    },
  },

  // India
  IN: {
    Airtel: {
      balanceCheck: '*121#',
      dataBundles: ['*121*11#'],
      airtimeTopUp: '*141#',
      customerCare: '121',
      myNumber: '*282#',
    },
    Jio: {
      balanceCheck: '*333#',
      dataBundles: ['*333#'],
      customerCare: '1991',
      myNumber: '*1#',
    },
    VI: {
      balanceCheck: '*141#',
      dataBundles: ['*121#'],
      customerCare: '199',
      myNumber: '*131#',
    },
  },

  // Nigeria
  NG: {
    MTN: {
      balanceCheck: '*556#',
      dataBundles: ['*131#'],
      airtimeTopUp: '*555#',
      customerCare: '180',
      myNumber: '*123#',
    },
    Glo: {
      balanceCheck: '*124#',
      dataBundles: ['*127#'],
      customerCare: '121',
      myNumber: '*135*8#',
    },
    Airtel: {
      balanceCheck: '*123#',
      dataBundles: ['*141#'],
      customerCare: '111',
      myNumber: '*121#',
    },
    '9mobile': {
      balanceCheck: '*232#',
      dataBundles: ['*229#'],
      customerCare: '200',
    },
  },

  // South Africa
  ZA: {
    Vodacom: {
      balanceCheck: '*135#',
      dataBundles: ['*135#'],
      customerCare: '082135',
      myNumber: '*135*501#',
    },
    MTN: {
      balanceCheck: '*141#',
      dataBundles: ['*141#'],
      customerCare: '083123',
      myNumber: '*123#',
    },
    'Cell C': {
      balanceCheck: '*147#',
      dataBundles: ['*147#'],
      customerCare: '135',
    },
  },

  // Ghana
  GH: {
    MTN: {
      balanceCheck: '*124#',
      dataBundles: ['*138#'],
      customerCare: '100',
      myNumber: '*156#',
    },
    Vodafone: {
      balanceCheck: '*130#',
      dataBundles: ['*585#'],
      customerCare: '200',
    },
    AirtelTigo: {
      balanceCheck: '*127#',
      dataBundles: ['*110#'],
      customerCare: '181',
    },
  },

  // United Kingdom
  GB: {
    EE: {
      balanceCheck: '*150#',
      customerCare: '150',
    },
    'O2': {
      balanceCheck: '*#10#',
      customerCare: '202',
    },
    Vodafone: {
      balanceCheck: '*#1345#',
      customerCare: '191',
    },
    Three: {
      balanceCheck: '*#1345#',
      customerCare: '333',
    },
  },

  // Uganda
  UG: {
    MTN: {
      balanceCheck: '*131#',
      dataBundles: ['*150#'],
      customerCare: '100',
      myNumber: '*156#',
    },
    Airtel: {
      balanceCheck: '*133#',
      dataBundles: ['*175#'],
      customerCare: '100',
    },
  },

  // Tanzania
  TZ: {
    Vodacom: {
      balanceCheck: '*100#',
      dataBundles: ['*149#'],
      customerCare: '100',
    },
    Airtel: {
      balanceCheck: '*144#',
      dataBundles: ['*150#'],
      customerCare: '111',
    },
    Tigo: {
      balanceCheck: '*100#',
      dataBundles: ['*150#'],
      customerCare: '123',
    },
  },

  // Egypt
  EG: {
    Vodafone: {
      balanceCheck: '*9#',
      customerCare: '888',
    },
    Orange: {
      balanceCheck: '#100#',
      customerCare: '110',
    },
    Etisalat: {
      balanceCheck: '*228#',
      customerCare: '101',
    },
  },

  // Pakistan
  PK: {
    Jazz: {
      balanceCheck: '*111#',
      dataBundles: ['*117#'],
      customerCare: '111',
    },
    Telenor: {
      balanceCheck: '*444#',
      dataBundles: ['*345#'],
      customerCare: '345',
    },
    Zong: {
      balanceCheck: '*222#',
      dataBundles: ['*6464#'],
      customerCare: '310',
    },
  },
};

/**
 * Permissions required for USSD operations (Android)
 */
export const REQUIRED_PERMISSIONS = {
  CALL_PHONE: 'android.permission.CALL_PHONE',
  READ_PHONE_STATE: 'android.permission.READ_PHONE_STATE',
  READ_PHONE_NUMBERS: 'android.permission.READ_PHONE_NUMBERS',
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  TIMEOUT_MS: 30000, // 30 seconds
  MAX_HISTORY_ENTRIES: 100,
  BATCH_DELAY_MS: 2000, // 2 seconds between batch requests
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
};

/**
 * Event names
 */
export const EVENTS = {
  USSD_EVENT: 'ussdEvent',
  USSD_ERROR_EVENT: 'ussdErrorEvent',
  SIM_STATE_CHANGED: 'simStateChanged',
  SESSION_STATE_CHANGED: 'sessionStateChanged',
};
