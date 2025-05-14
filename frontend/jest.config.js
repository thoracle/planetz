module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(three)/)',
  ],
  setupFiles: ['<rootDir>/tests/setup.js'],
}; 