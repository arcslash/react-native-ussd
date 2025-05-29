module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo-.*|@expo/.*|react-navigation-tabs|static-container|@sentry/react-native)/)',
  ],
};
