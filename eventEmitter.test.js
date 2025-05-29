// eventEmitter.test.js
import { ussdEventEmitter } from './index';
import { NativeEventEmitter } from 'react-native'; // To verify instance type
// Import the mock controls and helpers using a namespace import
import * as ReactNativeMock from './__mocks__/react-native'; 

jest.mock('react-native');

describe('ussdEventEmitter Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the shared listener store in the mock before each test
    ReactNativeMock.clearAllEventListeners(); 
  });

  afterEach(() => {
    // Optional: could also clear listeners here if not done in beforeEach,
    // but beforeEach is generally preferred for a clean state.
  });

  it('should be an instance of NativeEventEmitter', () => {
    expect(ussdEventEmitter).toBeInstanceOf(NativeEventEmitter);
  });

  it('should add a listener and receive an event', () => {
    const mockListener = jest.fn();
    // ussdEventEmitter.addListener calls the addListener method on the NativeEventEmitter mock instance.
    // The mock for NativeEventEmitter's addListener is ReactNativeMock.uniqueMockAddListenerForTest.
    const subscription = ussdEventEmitter.addListener('testEvent', mockListener);

    // Check if the mock addListener (used by the NativeEventEmitter instance) was called
    expect(ReactNativeMock.uniqueMockAddListenerForTest).toHaveBeenCalledWith('testEvent', mockListener);

    // Simulate an event emission using the mock's emit
    ReactNativeMock.mockUssdEventEmitter.emit('testEvent', { data: 'testData' });

    // Expect mockListener to have been called with the event data
    expect(mockListener).toHaveBeenCalledWith({ data: 'testData' });

    // Clean up the listener
    subscription.remove();
  });

  it('should remove a listener and not receive events after removal', () => {
    const mockListenerForRemove = jest.fn();
    const subscriptionToRemove = ussdEventEmitter.addListener('anotherEvent', mockListenerForRemove);

    // Spy on the specific remove method of this subscription
    const specificRemoveMock = jest.spyOn(subscriptionToRemove, 'remove');

    // Call remove on the subscription
    subscriptionToRemove.remove();

    // Expect the subscription's remove method to have been called
    expect(specificRemoveMock).toHaveBeenCalled();
    
    // Simulate an event emission
    ReactNativeMock.mockUssdEventEmitter.emit('anotherEvent', { data: 'someData' });

    // Expect mockListenerForRemove *not* to have been called
    expect(mockListenerForRemove).not.toHaveBeenCalled();
  });

  it('should ensure listeners for different events do not interfere', () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();

    const subA = ussdEventEmitter.addListener('eventA', listenerA);
    const subB = ussdEventEmitter.addListener('eventB', listenerB);

    // Emit eventA
    ReactNativeMock.mockUssdEventEmitter.emit('eventA', { message: 'Hello A' });
    expect(listenerA).toHaveBeenCalledWith({ message: 'Hello A' });
    expect(listenerB).not.toHaveBeenCalled();

    // Emit eventB
    ReactNativeMock.mockUssdEventEmitter.emit('eventB', { message: 'Hello B' });
    expect(listenerB).toHaveBeenCalledWith({ message: 'Hello B' });
    // listenerA should still have been called only once (from the previous emit)
    expect(listenerA).toHaveBeenCalledTimes(1); 

    // Clean up
    subA.remove();
    subB.remove();
  });
});
