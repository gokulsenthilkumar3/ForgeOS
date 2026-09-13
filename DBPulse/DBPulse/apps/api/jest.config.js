module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@dbpulse/shared$': '<rootDir>/../../packages/shared/index.ts',
    '^@dbpulse/shared/(.*)$': '<rootDir>/../../packages/shared/$1',
    '^@dbpulse/diff-engine$': '<rootDir>/../../packages/diff-engine/index.ts',
    '^@dbpulse/connector-postgres$': '<rootDir>/../../packages/connectors/postgres/index.ts',
    '^@dbpulse/connector-mysql$': '<rootDir>/../../packages/connectors/mysql/index.ts',
  },
};
