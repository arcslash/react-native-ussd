import { NativeModules, NativeEventEmitter } from 'react-native';

const { Ussd } = NativeModules;


export const ussdEventEmitter = new NativeEventEmitter(Ussd);  
   


export default Ussd;
