// eslint.config.js
import globals from "globals";
import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
// If you were using react-native specific plugins, they would be imported here.
// For example: import pluginReactNative from "eslint-plugin-react-native";

export default [
  {
    ignores: [
      "android/**",
      "ios/**",
      "node_modules/**",
      ".github/**",
      // Add other ignored files or directories if necessary
    ]
  },
  js.configs.recommended, // ESLint recommended rules
  {
    // Configuration for React files (typically .js, .jsx)
    files: ["**/*.{js,jsx}"],
    plugins: {
      react: pluginReact
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser, // Includes browser globals like `window`, `document`
        ...globals.es2021,  // Includes ES2021 globals
        ...globals.node,    // Includes Node.js globals
        ...globals.jest,    // Includes Jest globals
        // Add any other specific globals your project uses, e.g., for React Native
        "__DEV__": "readonly" // Common React Native global
      }
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      "react/prop-types": "off", // Example: disabling prop-types rule
      "react/react-in-jsx-scope": "off" // Often not needed with modern React/JSX transform
      // Add other custom rules here
    },
    settings: {
      react: {
        version: "detect" // Automatically detect React version
      }
    }
  }
  // If you have TypeScript, you'd add configurations for it here too.
];
