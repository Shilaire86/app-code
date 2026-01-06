const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force transpilation of zustand and other ESM packages
config.transformer.getTransformOptions = async () => ({
    transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
    },
});

module.exports = config;
