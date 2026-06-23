const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// withNativeWind compiles global.css at build time so Tailwind classes
// are available without a separate PostCSS build step.
module.exports = withNativeWind(config, { input: './global.css' });
