// getSimInfo.test.js
import Ussd from './index';
import { Platform } from 'react-native';
// Corrected path for mock import assuming getSimInfo.test.js is in the project root
import { mockUssdGetSimInfo } from './__mocks__/react-native';

jest.mock('react-native'); // Ensures we use the mock

describe('Ussd.getSimInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSimInfo - Android', () => {
    beforeAll(() => {
      Platform.OS = 'android';
    });

    test('should retrieve single SIM data successfully', async () => {
      const mockSimData = [{ subscriptionId: 1, slotIndex: 0, carrierName: 'NetA', countryIso: 'us', phoneNumber: '12345' }];
      mockUssdGetSimInfo.mockResolvedValueOnce(mockSimData);
      
      const result = await Ussd.getSimInfo();
      
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
      expect(result).toEqual(mockSimData);
    });

    test('should retrieve multi-SIM data successfully', async () => {
      const mockSimDataMulti = [
        { subscriptionId: 1, slotIndex: 0, carrierName: 'NetA', countryIso: 'us', phoneNumber: '123' },
        { subscriptionId: 2, slotIndex: 1, carrierName: 'NetB', countryIso: 'ca', phoneNumber: null }
      ];
      mockUssdGetSimInfo.mockResolvedValueOnce(mockSimDataMulti);
      
      const result = await Ussd.getSimInfo();
      
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
      expect(result).toEqual(mockSimDataMulti);
    });

    test('should reject on permission error', async () => {
      mockUssdGetSimInfo.mockRejectedValueOnce(new Error('Permission denied for getSimInfo'));
      
      await expect(Ussd.getSimInfo()).rejects.toThrow('Permission denied for getSimInfo');
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
    });

    test('should return empty array on older Android (API < 22)', async () => {
      mockUssdGetSimInfo.mockResolvedValueOnce([]); // Simulate native module returning empty array
      
      const result = await Ussd.getSimInfo();
      
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getSimInfo - iOS', () => {
    beforeAll(() => {
      Platform.OS = 'ios';
    });

    test('should retrieve single SIM representation successfully', async () => {
      const mockSimDataIOS = [{ slotIndex: 0, subscriptionId: 0, carrierName: 'NetC', countryIso: 'gb', mobileCountryCode: '234', mobileNetworkCode: '10', phoneNumber: null }];
      mockUssdGetSimInfo.mockResolvedValueOnce(mockSimDataIOS);
      
      const result = await Ussd.getSimInfo();
      
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
      expect(result).toEqual(mockSimDataIOS);
      result.forEach(sim => {
        expect(sim.phoneNumber).toBeNull();
      });
    });

    test('should retrieve multi-SIM representation successfully (iOS 12+)', async () => {
      const mockSimDataIOSMulti = [
        { slotIndex: 0, subscriptionId: 0, carrierName: 'NetC', countryIso: 'gb', mobileCountryCode: '234', mobileNetworkCode: '10', phoneNumber: null },
        { slotIndex: 1, subscriptionId: 1, carrierName: 'NetD', countryIso: 'de', mobileCountryCode: '262', mobileNetworkCode: '01', phoneNumber: null }
      ];
      mockUssdGetSimInfo.mockResolvedValueOnce(mockSimDataIOSMulti);
      
      const result = await Ussd.getSimInfo();
      
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
      expect(result).toEqual(mockSimDataIOSMulti);
      result.forEach(sim => {
        expect(sim.phoneNumber).toBeNull();
      });
    });

    test('should reject on native error', async () => {
      mockUssdGetSimInfo.mockRejectedValueOnce(new Error('iOS CoreTelephony error'));
      
      await expect(Ussd.getSimInfo()).rejects.toThrow('iOS CoreTelephony error');
      expect(mockUssdGetSimInfo).toHaveBeenCalled();
    });
  });
});
