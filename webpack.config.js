const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['nativewind', '@expo/vector-icons']
      }
    },
    argv
  );

  // Fix for expo-router path resolution
  config.resolve.alias = {
    ...config.resolve.alias,
    '../../../../../app': path.resolve(__dirname, 'app'),
    '../../../../app': path.resolve(__dirname, 'app'),
    '../../../app': path.resolve(__dirname, 'app'),
    '../../app': path.resolve(__dirname, 'app'),
    '../app': path.resolve(__dirname, 'app'),
  };

  // Ensure app directory is included
  config.resolve.modules = [
    ...(config.resolve.modules || []),
    path.resolve(__dirname)
  ];

  return config;
};