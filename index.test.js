import UssdExport, { ussdEventEmitter } from './index'; // Adjust path if your test file is not in root
import { NativeModules, NativeEventEmitter } from 'react-native';

// Ensure Jest uses our mock
jest.mock('react-native');

describe('Library Exports (index.js)', () => {
  it('should export NativeModules.Ussd as the default export', () => {
    expect(UssdExport).toBe(NativeModules.Ussd);
  });

  it('should export ussdEventEmitter as an instance of NativeEventEmitter', () => {
    expect(ussdEventEmitter).toBeInstanceOf(NativeEventEmitter);
  });

  it('should instantiate NativeEventEmitter with NativeModules.Ussd', () => {
    expect(NativeEventEmitter).toHaveBeenCalledWith(NativeModules.Ussd);
  });
});
