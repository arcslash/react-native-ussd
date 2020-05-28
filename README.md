# react-native-ussd
React Native Library to handle USSD.

TODO: Need to implement functionalities for IOS, Currently only work for Android
## Getting started

`$ npm install react-native-ussd --save`

### Mostly automatic installation

`$ react-native link react-native-ussd`


## Usage
Following configurations need to be done before using in either of the platforms

### Android

Add permissions to Make calls in the Manifest

```xml
<manifest ...>
<uses-permission android:name="android.permission.CALL_PHONE"/>
<application...>
```
In addtion App must be enabled in the accessibility settings
Settings > Accessibility > Select the App and enable Accessibility

### IOS
[ TODO]

....

### Dialing a USSD CODE
```javascript
import Ussd from 'react-native-ussd';

// Add USSD code you want to dial
Ussd.dial("*#456#");
```
Example Usecase

```javascript
import * as React from 'react';
import Ussd from 'react-native-ussd';
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
      console.log( "Permission Granted" );
      Ussd.dial('*#456#');      
      console.log(this.state.userBalance);
    } 
    else {
      console.log( "Permission Denied" );
    }
  }
  componentDidMount(){
    const eventEmitter = new NativeEventEmitter(NativeModules.USSDDial);
    this.eventListener = eventEmitter.addListener('USSDEvents', (event) => {
       console.log(event.ussdmessage) 
       let balance = event.ussdmessage.split("is")[1].split(".Valid")[0];
       let date = event.ussdmessage.split("until")[1].split(".")[0];
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
