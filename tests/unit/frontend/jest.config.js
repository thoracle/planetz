/**
 * Jest configuration for frontend unit tests.
 * Tests core game logic without requiring browser environment.
 */

module.exports = {
  // Use jsdom for DOM-related tests
  testEnvironment: 'jsdom',

  // Root directory for tests
  rootDir: '../../../',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/unit/frontend/**/*.test.js'
  ],

  // Module path aliases matching frontend structure
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/static/js/$1',
    '^@core/(.*)$': '<rootDir>/frontend/static/js/core/$1',
    '^@ship/(.*)$': '<rootDir>/frontend/static/js/ship/$1',
    '^@ui/(.*)$': '<rootDir>/frontend/static/js/ui/$1'
  },

  // Transform ES6 modules with Babel
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Don't transform node_modules except specific packages
  transformIgnorePatterns: [
    '/node_modules/(?!(three)/)'
  ],

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/unit/frontend/setup.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'frontend/static/js/core/**/*.js',
    'frontend/static/js/ship/NFTCard.js',
    'frontend/static/js/ship/CardInventory.js',
    'frontend/static/js/ship/Ship.js',
    'frontend/static/js/ai/EnemyAI.js',
    'frontend/static/js/ai/AIStateMachine.js',
    'frontend/static/js/ai/ThreatAssessment.js',
    'frontend/static/js/ai/CombatBehavior.js',
    '!**/*.test.js'
  ],

  // Coverage thresholds per the refactor plan
  coverageThreshold: {
    'frontend/static/js/core/': {
      lines: 90,
      branches: 80,
      functions: 90
    }
  },

  // Verbose output
  verbose: true
};
