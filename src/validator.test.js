import { UssdValidator } from './validator';

describe('UssdValidator', () => {
  describe('validateCode', () => {
    test('should validate correct USSD codes', () => {
      const validCodes = ['*123#', '*144#', '#100#', '*123*456#', '*#06#'];

      validCodes.forEach((code) => {
        const result = UssdValidator.validateCode(code);
        expect(result.isValid).toBe(true);
        expect(result.formattedCode).toBeDefined();
      });
    });

    test('should add missing # to the end', () => {
      const result = UssdValidator.validateCode('*123');
      expect(result.isValid).toBe(true);
      expect(result.formattedCode).toBe('*123#');
    });

    test('should reject invalid codes', () => {
      const invalidCodes = [
        '',
        '   ',
        '123',
        'abc',
        '*' + '1'.repeat(50) + '#', // Too long
      ];

      invalidCodes.forEach((code) => {
        const result = UssdValidator.validateCode(code);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should reject null or undefined', () => {
      expect(UssdValidator.validateCode(null).isValid).toBe(false);
      expect(UssdValidator.validateCode(undefined).isValid).toBe(false);
    });

    test('should trim whitespace', () => {
      const result = UssdValidator.validateCode('  *123#  ');
      expect(result.isValid).toBe(true);
      expect(result.formattedCode).toBe('*123#');
    });
  });

  describe('isValid', () => {
    test('should return boolean', () => {
      expect(UssdValidator.isValid('*123#')).toBe(true);
      expect(UssdValidator.isValid('invalid')).toBe(false);
    });
  });

  describe('formatCode', () => {
    test('should format valid code', () => {
      expect(UssdValidator.formatCode('*123')).toBe('*123#');
      expect(UssdValidator.formatCode('*123#')).toBe('*123#');
    });

    test('should throw error for invalid code', () => {
      expect(() => UssdValidator.formatCode('invalid')).toThrow();
    });
  });

  describe('isBalanceCheck', () => {
    test('should identify balance check codes', () => {
      expect(UssdValidator.isBalanceCheck('*144#')).toBe(true);
      expect(UssdValidator.isBalanceCheck('*123#')).toBe(true);
      expect(UssdValidator.isBalanceCheck('#BAL#')).toBe(true);
      expect(UssdValidator.isBalanceCheck('*#10#')).toBe(true);
    });
  });

  describe('extractParameters', () => {
    test('should extract parameters from parameterized code', () => {
      expect(UssdValidator.extractParameters('*123*456*789#')).toEqual(['456', '789']);
      expect(UssdValidator.extractParameters('*123*456#')).toEqual(['456']);
      expect(UssdValidator.extractParameters('*123#')).toEqual([]);
    });
  });
});
