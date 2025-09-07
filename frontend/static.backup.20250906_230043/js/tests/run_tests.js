const { exec } = require('child_process');
const path = require('path');

// Start the backend server
console.log('Starting backend server...');
const serverProcess = exec('cd backend && python3 app.py', (error, stdout, stderr) => {
    if (error) {
        console.error('Error starting server:', error);
        return;
    }
    console.log('Server output:', stdout);
    if (stderr) console.error('Server errors:', stderr);
});

// Wait for server to start
setTimeout(() => {
    console.log('Running tests...');
    
    // Run Jest tests
    const testProcess = exec('jest universe_consistency.test.js --config jest.config.js', {
        cwd: path.join(__dirname)
    }, (error, stdout, stderr) => {
        if (error) {
            console.error('Test error:', error);
            serverProcess.kill();
            process.exit(1);
        }
        console.log('Test output:', stdout);
        if (stderr) console.error('Test errors:', stderr);
        
        // Kill the server after tests
        serverProcess.kill();
        process.exit(0);
    });
}, 2000); // Wait 2 seconds for server to start 