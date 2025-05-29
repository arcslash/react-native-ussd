module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true, // Added jest environment for test files
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended', // Use recommended React rules
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true, // Enable JSX parsing
    },
    ecmaVersion: 'latest', // Use modern ECMAScript features
    sourceType: 'module', // Allow use of imports
  },
  plugins: [
    'react',
  ],
  settings: {
    react: {
      version: 'detect', // Automatically detect React version
    },
  },
  rules: {
    // You can add or override rules here. For now, start with defaults.
    // Example: 'react/prop-types': 'off' // If you don't use prop-types
  },
  // Ignore specific files or directories
  ignorePatterns: ["node_modules/", "android/", "ios/", "build/", "dist/"],
};
