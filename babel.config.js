module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource makes NativeWind inject className support into every
      // React Native component without needing explicit cssInterop calls.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    // react-native-reanimated plugin must always be listed last
    plugins: ['react-native-reanimated/plugin'],
  };
};
