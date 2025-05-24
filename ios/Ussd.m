#import "Ussd.h"

@implementation Ussd

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(dial:(NSString *)ussdCode)
{
  NSLog(@"USSD code received: %@", ussdCode);
  NSString *urlString = [NSString stringWithFormat:@"tel:%@", ussdCode];
  NSURL *url = [NSURL URLWithString:urlString];

  UIApplication *application = [UIApplication sharedApplication];

  if ([application canOpenURL:url]) {
    [application openURL:url options:@{} completionHandler:nil];
  } else {
    NSLog(@"Error: Cannot open URL for USSD code: %@", urlString);
    // Optionally, you could use the callback to send an error back to JS
    // For now, just logging is fine as per the plan.
  }
}

@end
