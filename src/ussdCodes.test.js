import { UssdCodes } from './ussdCodes';

describe('UssdCodes', () => {
  beforeEach(() => {
    // Clear custom codes before each test
    UssdCodes.clearCustomCodes();
  });

  describe('getBalanceCheck', () => {
    test('should get balance check code for known carriers', () => {
      expect(UssdCodes.getBalanceCheck('Safaricom', 'KE')).toBe('*144#');
      expect(UssdCodes.getBalanceCheck('MTN', 'NG')).toBe('*556#');
      expect(UssdCodes.getBalanceCheck('Airtel', 'IN')).toBe('*121#');
    });

    test('should return null for unknown carriers', () => {
      expect(UssdCodes.getBalanceCheck('UnknownCarrier', 'XX')).toBeNull();
    });

    test('should find carrier without country code', () => {
      expect(UssdCodes.getBalanceCheck('Safaricom')).toBe('*144#');
    });
  });

  describe('getDataBundles', () => {
    test('should get data bundle codes', () => {
      const codes = UssdCodes.getDataBundles('Safaricom', 'KE');
      expect(Array.isArray(codes)).toBe(true);
      expect(codes).toContain('*544#');
    });

    test('should return array even for single code', () => {
      const codes = UssdCodes.getDataBundles('Airtel', 'KE');
      expect(Array.isArray(codes)).toBe(true);
    });

    test('should return null for carrier without data codes', () => {
      const codes = UssdCodes.getDataBundles('T-Mobile', 'US');
      expect(codes).toBeNull();
    });
  });

  describe('getAirtimeTopUp', () => {
    test('should get airtime top-up codes', () => {
      expect(UssdCodes.getAirtimeTopUp('Safaricom', 'KE')).toBe('*141#');
      expect(UssdCodes.getAirtimeTopUp('MTN', 'NG')).toBe('*555#');
    });
  });

  describe('getCustomerCare', () => {
    test('should get customer care codes', () => {
      expect(UssdCodes.getCustomerCare('Safaricom', 'KE')).toBe('100');
      expect(UssdCodes.getCustomerCare('MTN', 'NG')).toBe('180');
    });
  });

  describe('getMyNumber', () => {
    test('should get "my number" codes', () => {
      expect(UssdCodes.getMyNumber('Safaricom', 'KE')).toBe('*200#');
      expect(UssdCodes.getMyNumber('MTN', 'NG')).toBe('*123#');
    });
  });

  describe('getAllCodes', () => {
    test('should get all codes for a carrier', () => {
      const codes = UssdCodes.getAllCodes('Safaricom', 'KE');
      expect(codes).toBeDefined();
      expect(codes.balanceCheck).toBe('*144#');
      expect(codes.customerCare).toBe('100');
      expect(Array.isArray(codes.dataBundles)).toBe(true);
    });

    test('should return null for unknown carrier', () => {
      expect(UssdCodes.getAllCodes('Unknown', 'XX')).toBeNull();
    });
  });

  describe('addCustomCode', () => {
    test('should add custom code', () => {
      UssdCodes.addCustomCode('MyCarrier', 'balanceCheck', '*999#', 'XX');
      expect(UssdCodes.getBalanceCheck('MyCarrier', 'XX')).toBe('*999#');
    });

    test('should override default codes with custom codes', () => {
      UssdCodes.addCustomCode('Safaricom', 'balanceCheck', '*999#', 'KE');
      expect(UssdCodes.getBalanceCheck('Safaricom', 'KE')).toBe('*999#');
    });
  });

  describe('getAvailableCarriers', () => {
    test('should list available carriers for a country', () => {
      const carriers = UssdCodes.getAvailableCarriers('KE');
      expect(carriers).toContain('Safaricom');
      expect(carriers).toContain('Airtel');
      expect(carriers).toContain('Telkom');
    });

    test('should list all carriers when no country specified', () => {
      const carriers = UssdCodes.getAvailableCarriers();
      expect(carriers.length).toBeGreaterThan(10);
    });

    test('should sort carriers alphabetically', () => {
      const carriers = UssdCodes.getAvailableCarriers('KE');
      const sorted = [...carriers].sort();
      expect(carriers).toEqual(sorted);
    });
  });

  describe('getAvailableCountries', () => {
    test('should list available countries', () => {
      const countries = UssdCodes.getAvailableCountries();
      expect(countries).toContain('KE');
      expect(countries).toContain('NG');
      expect(countries).toContain('US');
    });

    test('should be sorted', () => {
      const countries = UssdCodes.getAvailableCountries();
      const sorted = [...countries].sort();
      expect(countries).toEqual(sorted);
    });
  });

  describe('searchCarrier', () => {
    test('should find carriers by search query', () => {
      const results = UssdCodes.searchCarrier('mtn');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].carrier).toBe('MTN');
    });

    test('should search within specific country', () => {
      const results = UssdCodes.searchCarrier('airtel', 'KE');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].country).toBe('KE');
    });

    test('should handle partial matches', () => {
      const results = UssdCodes.searchCarrier('saf');
      expect(results.some(r => r.carrier === 'Safaricom')).toBe(true);
    });
  });

  describe('exportCustomCodes and importCustomCodes', () => {
    test('should export and import custom codes', () => {
      UssdCodes.addCustomCode('TestCarrier', 'balanceCheck', '*777#', 'TEST');
      const exported = UssdCodes.exportCustomCodes();

      UssdCodes.clearCustomCodes();
      expect(UssdCodes.getBalanceCheck('TestCarrier', 'TEST')).toBeNull();

      UssdCodes.importCustomCodes(exported);
      expect(UssdCodes.getBalanceCheck('TestCarrier', 'TEST')).toBe('*777#');
    });
  });

  describe('carrier name normalization', () => {
    test('should normalize common carrier name variations', () => {
      expect(UssdCodes.getBalanceCheck('t-mobile', 'US')).toBe('#BAL#');
      expect(UssdCodes.getBalanceCheck('T-Mobile', 'US')).toBe('#BAL#');
      expect(UssdCodes.getBalanceCheck('tmobile', 'US')).toBe('#BAL#');
    });
  });
});
