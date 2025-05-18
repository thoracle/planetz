export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
    '^three/examples/jsm/(.*)$': '<rootDir>/node_modules/three/examples/jsm/$1',
    '^@/(.*)$': '<rootDir>/static/js/$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(three|@three)/)',
  ],
  setupFiles: ['<rootDir>/tests/setup.js'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/static/js/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'static/js/**/*.js',
    '!static/js/tests/**',
    '!**/node_modules/**'
  ]
}; 