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
this.eventListener = ussdEventEmitter.addListener('ussdEvent', (event) => {
       console.log(event.ussdReply) 
       let balance = event.ussdmessage.split("is")[1].split(".Valid")[0];
       let date = event.ussdmessage.split("until")[1].split(".")[0];
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
import { Text, View, TouchableOpacity, PermissionsAndroid } from 'react-native';
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
