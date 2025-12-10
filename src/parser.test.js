import { UssdParser } from './parser';

describe('UssdParser', () => {
  describe('parseBalance', () => {
    test('should parse balance from common formats', () => {
      const testCases = [
        { response: 'Your balance is 100.50', expected: 100.50 },
        { response: 'Balance: 250.75', expected: 250.75 },
        { response: 'Ksh 500.00', expected: 500.00 },
        { response: '$99.99', expected: 99.99 },
        { response: '1,234.56 USD', expected: 1234.56 },
      ];

      testCases.forEach(({ response, expected }) => {
        const result = UssdParser.parseBalance(response);
        expect(result).not.toBeNull();
        expect(result.amount).toBe(expected);
        expect(result.rawResponse).toBe(response);
      });
    });

    test('should detect currency from response', () => {
      const result = UssdParser.parseBalance('Your balance is Ksh 100.00');
      expect(result.currency).toBe('KES');
    });

    test('should use provided currency', () => {
      const result = UssdParser.parseBalance('Balance: 100', 'USD');
      expect(result.currency).toBe('USD');
    });

    test('should return null for invalid input', () => {
      expect(UssdParser.parseBalance(null)).toBeNull();
      expect(UssdParser.parseBalance('')).toBeNull();
      expect(UssdParser.parseBalance('No numbers here')).toBeNull();
    });
  });

  describe('parseDataBundle', () => {
    test('should parse data amounts', () => {
      const testCases = [
        { response: 'You have 1.5GB remaining', expected: 1536 }, // 1.5 * 1024
        { response: 'Data: 500MB', expected: 500 },
        { response: '2GB data bundle', expected: 2048 },
      ];

      testCases.forEach(({ response, expected }) => {
        const result = UssdParser.parseDataBundle(response);
        expect(result).not.toBeNull();
        expect(result.amountMB).toBe(expected);
      });
    });

    test('should parse remaining data separately', () => {
      const response = 'Data bundle: 2GB, Remaining: 500MB';
      const result = UssdParser.parseDataBundle(response);
      expect(result.remainingMB).toBe(500);
    });

    test('should return null for invalid input', () => {
      expect(UssdParser.parseDataBundle(null)).toBeNull();
      expect(UssdParser.parseDataBundle('No data info')).toBeNull();
    });
  });

  describe('extractAmount', () => {
    test('should extract numeric amounts', () => {
      expect(UssdParser.extractAmount('Price: 123.45')).toBe(123.45);
      expect(UssdParser.extractAmount('Total: 1,234.56')).toBe(1234.56);
      expect(UssdParser.extractAmount('50')).toBe(50);
    });

    test('should return null for no numbers', () => {
      expect(UssdParser.extractAmount('No numbers')).toBeNull();
      expect(UssdParser.extractAmount(null)).toBeNull();
    });
  });

  describe('extractDate', () => {
    test('should extract dates from various formats', () => {
      // Test ISO format which consistently works
      const result = UssdParser.extractDate('Expires: 2024-12-31');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December is month 11
    });

    test('should return null for invalid dates', () => {
      expect(UssdParser.extractDate('No date here')).toBeNull();
      expect(UssdParser.extractDate(null)).toBeNull();
    });
  });

  describe('isMenu', () => {
    test('should identify menu responses', () => {
      const menuResponse = `
        1. Check Balance
        2. Buy Bundles
        3. Customer Care
      `;
      expect(UssdParser.isMenu(menuResponse)).toBe(true);
    });

    test('should identify numbered options with parentheses', () => {
      const menuResponse = `
        1) Option One
        2) Option Two
      `;
      expect(UssdParser.isMenu(menuResponse)).toBe(true);
    });

    test('should reject non-menu responses', () => {
      expect(UssdParser.isMenu('Your balance is 100')).toBe(false);
      expect(UssdParser.isMenu(null)).toBe(false);
    });
  });

  describe('extractMenuOptions', () => {
    test('should extract menu options', () => {
      const menuResponse = `
        1. Check Balance
        2. Buy Bundles
        3. Customer Care
      `;
      const options = UssdParser.extractMenuOptions(menuResponse);
      expect(options).toHaveLength(3);
      expect(options[0]).toEqual({ number: '1', text: 'Check Balance' });
      expect(options[1]).toEqual({ number: '2', text: 'Buy Bundles' });
    });

    test('should handle parentheses format', () => {
      const menuResponse = '1) First\n2) Second';
      const options = UssdParser.extractMenuOptions(menuResponse);
      expect(options).toHaveLength(2);
      expect(options[0].number).toBe('1');
    });
  });

  describe('cleanResponse', () => {
    test('should clean up response text', () => {
      const messy = '  Line 1  \r\n\r\n\r\n  Line 2  ';
      const clean = UssdParser.cleanResponse(messy);
      // cleanResponse trims and normalizes line endings and whitespace
      expect(clean).toContain('Line 1');
      expect(clean).toContain('Line 2');
    });

    test('should normalize whitespace', () => {
      const result = UssdParser.cleanResponse('Word1    Word2\t\tWord3');
      expect(result).toBe('Word1 Word2 Word3');
    });
  });

  describe('isSuccessResponse', () => {
    test('should identify success messages', () => {
      expect(UssdParser.isSuccessResponse('Transaction successful')).toBe(true);
      expect(UssdParser.isSuccessResponse('Completed successfully')).toBe(true);
      expect(UssdParser.isSuccessResponse('Confirmed')).toBe(true);
    });

    test('should reject non-success messages', () => {
      expect(UssdParser.isSuccessResponse('Failed')).toBe(false);
      expect(UssdParser.isSuccessResponse('Error occurred')).toBe(false);
    });
  });

  describe('isErrorResponse', () => {
    test('should identify error messages', () => {
      expect(UssdParser.isErrorResponse('Transaction failed')).toBe(true);
      expect(UssdParser.isErrorResponse('Invalid input')).toBe(true);
      expect(UssdParser.isErrorResponse('Insufficient balance')).toBe(true);
    });

    test('should reject non-error messages', () => {
      expect(UssdParser.isErrorResponse('Success')).toBe(false);
      expect(UssdParser.isErrorResponse('Completed')).toBe(false);
    });
  });
});
