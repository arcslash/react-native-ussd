## 🚀 Major Feature Update

This PR adds extensive new functionality to the react-native-ussd library with full TypeScript support and comprehensive testing.

## ✨ Core Features

### Interactive & Session Management
- ✅ `sendResponse()` - Multi-step USSD sessions (Android)
- ✅ `cancelSession()` - Abort active sessions
- ✅ `getSessionState()` - Track session status
- ✅ `setTimeout()` - Configurable timeouts

### Network & Connectivity
- ✅ `isNetworkAvailable()` - Network availability check
- ✅ `getNetworkStatus()` - Detailed network info (2G/3G/4G/5G, roaming)
- ✅ `getCarrierInfo()` - Carrier/operator detection

### Permission & SIM Management
- ✅ `checkPermissions()` - Permission status check
- ✅ `requestPermissions()` - Request required permissions
- ✅ `getDefaultSimForCalls()` - Default call SIM
- ✅ `getDefaultSimForData()` - Default data SIM
- ✅ Enhanced `getSimInfo()` with MCC/MNC, default SIM detection, roaming status

### History & Analytics
- ✅ `getHistory()` - Request history with timestamps
- ✅ `clearHistory()` - Clear history
- ✅ `getMetrics()` - Usage analytics (success rate, avg response time, top codes)
- ✅ `getPendingResponses()` - Background response handling
- ✅ `setSecureMode()` - Hide sensitive responses in logs

### JavaScript Utilities
- ✅ `dialWithRetry()` - Automatic retry with exponential backoff
- ✅ `dialBatch()` - Execute multiple USSD requests sequentially
- ✅ `addResponseMiddleware()` - Transform responses
- ✅ `UssdValidator` - Code validation utilities
- ✅ `UssdParser` - Parse balance, data bundles, dates, menus
- ✅ `UssdCodes` - Pre-defined codes for 50+ carriers across 10+ countries

## 📦 What's Included

### New Files
- `index.d.ts` - Complete TypeScript definitions
- `src/constants.js` - Error codes & USSD codes database (10+ countries)
- `src/validator.js` - USSD code validation
- `src/parser.js` - Response parsing utilities
- `src/ussdCodes.js` - Carrier codes library
- `src/*.test.js` - Comprehensive unit tests

### Native Improvements

**Android (UssdModule.kt):**
- 15+ new @ReactMethod implementations
- Session state tracking with ConcurrentHashMap
- History tracking (max 100 entries)
- Metrics collection
- Enhanced SIM info with MCC/MNC, defaults, roaming

**iOS (Ussd.swift):**
- Stub implementations for API consistency
- Network status using NWPathMonitor
- Enhanced carrier information

## ✅ Testing

- **78 unit tests** - All passing ✅
- **100% ESLint clean** ✅
- Test coverage for all utilities
- Edge case handling

## 📊 Statistics

- **+3,054 lines** of new code
- **14 files changed**
- **7 new source files**
- **0 breaking changes** - Fully backward compatible

## 🔧 Package Updates

- Added TypeScript types field
- 18 keywords for better discoverability
- Fixed author email typo
- Added test scripts (coverage, watch)
- Updated description

## 🎯 Breaking Changes

None - this is fully backward compatible.

## 📝 Migration Guide

No migration needed! All existing code continues to work. New features are opt-in.

```javascript
import Ussd, { UssdValidator, UssdParser, UssdCodes } from 'react-native-ussd';

// Validate USSD code before dialing
const validation = UssdValidator.validateCode('*123#');
if (validation.isValid) {
  await Ussd.dial(validation.formattedCode);
}

// Parse balance from response
const balanceInfo = UssdParser.parseBalance(response);
console.log(`Balance: ${balanceInfo.amount} ${balanceInfo.currency}`);

// Get carrier-specific codes
const balanceCode = UssdCodes.getBalanceCheck('Safaricom', 'KE');
await Ussd.dial(balanceCode);
```

## 🔍 Review Checklist

- [x] All tests passing
- [x] ESLint clean
- [x] TypeScript definitions complete
- [x] Backward compatible
- [x] Documentation inline
- [x] No security issues

## 📚 Related Issues

Closes any issues related to:
- TypeScript support
- USSD code validation
- Response parsing
- Multi-step USSD sessions
- Carrier detection
- Usage analytics

Ready for review and merge! 🎉
