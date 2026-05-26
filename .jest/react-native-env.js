'use strict';

// Custom test environment that uses the main jest-environment-node (30.x)
// to avoid version mismatch with jest-runtime when @react-native/jest-preset
// bundles its own older jest-environment-node (29.x).
const { TestEnvironment: NodeEnv } = require('jest-environment-node');

module.exports = class ReactNativeEnv extends NodeEnv {
  customExportConditions = ['require', 'react-native'];
};
