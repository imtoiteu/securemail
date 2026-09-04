export default {
  projects: [
    {
      displayName: 'bridge',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/bridge/test/**/*.test.ts']
    }
  ]
};
