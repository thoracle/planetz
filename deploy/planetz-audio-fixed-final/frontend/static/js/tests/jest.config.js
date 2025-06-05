module.exports = {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
    },
    moduleNameMapper: {
        '^three$': '<rootDir>/node_modules/three/build/three.module.js',
        '^@/(.*)$': '<rootDir>/static/js/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/static/js/tests/**/*.test.js'
    ],
    transformIgnorePatterns: [
        '/node_modules/(?!three|@three)'
    ],
    verbose: true
}; 