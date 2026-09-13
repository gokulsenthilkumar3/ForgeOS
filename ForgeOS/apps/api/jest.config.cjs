module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleNameMapper: { '^@forgeos/contracts$': '<rootDir>/../../packages/contracts/src/index.ts' },
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node'
};
