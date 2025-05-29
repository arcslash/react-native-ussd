// __mocks__/react-native.js

// Shared store for listeners
const eventListeners = {};

// Mock for emitting events - this is mockUssdEventEmitter.emit
const mockEmit = jest.fn((eventName, eventData) => {
  if (eventListeners[eventName]) {
    eventListeners[eventName].forEach(listener => listener(eventData));
  }
});

// This is the function that will be assigned to NativeEventEmitter instances' addListener method
const mockAddListenerImplementation = jest.fn((eventName, callback) => {
  if (!eventListeners[eventName]) {
    eventListeners[eventName] = [];
  }
  eventListeners[eventName].push(callback);
  
  const subscription = {
    remove: jest.fn(() => {
      eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
      if (eventListeners[eventName].length === 0) {
        delete eventListeners[eventName];
      }
    }),
  };
  return subscription;
});

// This is the function that will be assigned to NativeEventEmitter instances' removeListeners method
const mockRemoveListenersImplementation = jest.fn((countOrEventName) => {
  // Simplified mock - actual implementation might vary based on RN behavior
  if (typeof countOrEventName === 'string' && eventListeners[countOrEventName]) {
    delete eventListeners[countOrEventName];
  } else if (typeof countOrEventName === 'number') {
    // A more complex mock might remove N listeners or clear specific event types
    // For now, this is a placeholder.
  }
});


const NativeEventEmitter = jest.fn().mockImplementation(function(nativeModule) {
  this.addListener = mockAddListenerImplementation; // Use the implementation
  this.removeListeners = mockRemoveListenersImplementation; // Use the implementation
  return this;
});

// Mock for Ussd Native Module
const mockDial = jest.fn();
const mockGetSimInfo = jest.fn();

const Ussd = {
  dial: mockDial,
  getSimInfo: mockGetSimInfo,
  getConstants: () => ({}),
};

const NativeModules = {
  Ussd: Ussd,
};

const Platform = {
  OS: 'ios', 
  select: jest.fn(selector => selector[Platform.OS]),
};
// Ensure re-assignment is captured if OS changes in tests
Platform.select = jest.fn(selector => selector[Platform.OS]); 

export {
  NativeModules,
  NativeEventEmitter, 
  Platform,
  // Renaming the export for clarity in testing
  mockAddListenerImplementation as uniqueMockAddListenerForTest, 
  mockRemoveListenersImplementation as mockRemoveListeners,
};

// Helper for controlling event emissions in tests
export const mockUssdEventEmitter = { 
  emit: mockEmit,
};

// Helper to clear all listeners between tests
export const clearAllEventListeners = () => {
  for (const key in eventListeners) {
    delete eventListeners[key];
  }
};

// Export other mocks if they exist and are needed by tests directly
export const mockUssdDial = mockDial;
export const mockUssdGetSimInfo = mockGetSimInfo;
