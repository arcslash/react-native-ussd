# react-native-ussd
React Native Library to handle functions related to USSD.
## Getting started

`$ npm install react-native-ussd --save`

### Mostly automatic installation

`$ react-native link react-native-ussd`


## Usage
Following configurations need to be done before using in either of the platforms

### Android

Add permissions to Make calls in the App

```xml
<manifest ...>
<uses-permission android:name="android.permission.CALL_PHONE"/>
<application...>
```


### IOS

### Dialing a USSD CODE
```javascript
import Ussd from 'react-native-ussd';

// TODO: What to do with the module?
Ussd.dial("*#456#");
```


```javascript
import Ussd from 'react-native-ussd';

// TODO: What to do with the module?
Ussd;
```
# react-native-ussd
