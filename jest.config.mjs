import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const coreHostBabel = join(root, 'packages/core-host/babel.config.cjs');

export default {
  projects: [
    {
      displayName: 'bridge',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/bridge/test/**/*.test.ts']
    },
    {
      displayName: 'core-host',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/core-host/test/**/*.test.js'],
      transform: {'\\.js$': ['babel-jest', {configFile: coreHostBabel}]},
      transformIgnorePatterns: []
    }
  ]
};
