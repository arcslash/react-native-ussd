# react-native-ussd
React Native Library to handle USSD calls.
The Android module is written in Kotlin and the iOS module is written in Swift.
Basic dialing support for iOS is available.

## Getting started

`$ npm install react-native-ussd --save`

### Installation
After installing with npm, React Native's auto-linking mechanism will handle linking the Android module.
For iOS, this library is distributed as a Swift Package. Add it to your application project using Xcode:
1. Go to File > Add Packages...
2. Enter the repository URL for this package.
3. Select the package and add it to your app's target.


## Usage
Following configurations need to be done before using in either of the platforms

### Android
**Minimum Android Version: 12 (API 31)**

Add permissions to Make calls in the Manifest

```xml
<manifest ...>
<uses-permission android:name="android.permission.CALL_PHONE"/>
<application...>
```
The library has been updated to use Kotlin and targets Android 12 (API 31) and newer. Ensure your project's Android configuration is compatible.

### IOS
**Minimum iOS Version: 14.0**
The iOS module is written in Swift and integrated using Swift Package Manager.

Basic USSD dialing is supported on iOS.
- Calling `Ussd.dial()` will open the native iOS dialer and pre-fill the USSD code. The user then needs to manually initiate the call.
- **Important Limitation:** iOS does not provide a way for applications to intercept or read the USSD responses. Therefore, the `ussdEventEmitter` (for `ussdEvent`) **will not work on iOS**. USSD responses cannot be captured by the application.
- No special permissions are typically required for this functionality on iOS.


### Dialing a USSD CODE


Ussd code can be dialled simply by calling dial method with required dialling number.
```javascript
import Ussd from 'react-native-ussd';

// Add USSD code you want to dial
Ussd.dial("*#456#");
```

A event listener should be initialized to listen for ussd replies from the dialling made using Ussd.dial()

```javascript
import Ussd, {ussdEventEmitter} from 'react-native-ussd';

// Add USSD code you want to dial
Ussd.dial("*#456#");


....
// in useEffect or in componentDidMount
// IMPORTANT: The ussdEventEmitter is Android-specific due to platform limitations.
// It will not fire any events on iOS as USSD responses cannot be intercepted.
this.eventListener = ussdEventEmitter.addListener('ussdEvent', (event) => {
       console.log(event.ussdReply) 
       let balance = event.ussdReply.split("is")[1].split(".Valid")[0];
       let date = event.ussdReply.split("until")[1].split(".")[0];
       this.setState({
        userBalance:balance,
        expiryDate:date
      })
       console.log(balance);
    });

....

//unregister the listener after using (probably in componentWillUnmount)
this.eventListener.remove();
....


```


Example Usecase

```javascript
import * as React from 'react';
import { Text, View, 
TouchableOpacity, PermissionsAndroid } from 'react-native';
import Ussd, {ussdEventEmitter} from 'react-native-ussd';


export default class App extends React.Component {
  state = {
    userBalance:0,
    expiryDate:''
  };


  async checkBalance(){
    let granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        'title': 'I need to make some calls',
        'message': 'Give me permission to make calls '
      }
    )
  
    if (granted) {
      console.log( "CAN Make Calls" );
      Ussd.dial('*#456#');
      
      console.log(this.state.userBalance);
    } 
    else {
      console.log( "CALL MAKING Permission Denied" );
    }
  }
  componentDidMount(){
    // IMPORTANT: The ussdEventEmitter is Android-specific due to platform limitations.
    // It will not fire any events on iOS as USSD responses cannot be intercepted.
    this.eventListener = ussdEventEmitter.addListener('ussdEvent', (event) => {
      // This callback will only be triggered on Android.
       console.log(event.ussdReply) 
       let balance = event.ussdReply.split("is")[1].split(".Valid")[0];
       let date = event.ussdReply.split("until")[1].split(".")[0];
       this.setState({
        userBalance:balance,
        expiryDate:date
      })
       console.log(balance);
    });
  }
  componentWillUnmount(){
    this.eventListener.remove();
  }
  render(){
    return (
      <View >
        <TouchableOpacity onPress={() => this.checkBalance()}>
        <Text>Check Balance</Text>
        </TouchableOpacity>
    <Text>Your Balance is: {this.state.userBalance}</Text>
    <Text>Expiry Date is: {this.state.expiryDate}</Text>       
        
      </View>
    );
  }
  
}
```
