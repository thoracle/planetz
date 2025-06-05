/**
 * Basic Test - Verify Testing Infrastructure
 * Simple test to confirm Jest setup is working
 */

describe('Testing Infrastructure', () => {
    test('Jest is working correctly', () => {
        expect(1 + 1).toBe(2);
    });

    test('Global test utilities are available', () => {
        expect(global.testUtils).toBeDefined();
        expect(global.testUtils.createMockShip).toBeDefined();
        expect(global.testUtils.createMockCard).toBeDefined();
    });

    test('Three.js mocks are working', () => {
        expect(global.THREE).toBeDefined();
        expect(global.THREE.Scene).toBeDefined();
        expect(global.THREE.Vector3).toBeDefined();
    });

    test('Mock ship creation works', () => {
        const mockShip = global.testUtils.createMockShip();
        
        expect(mockShip).toBeDefined();
        expect(mockShip.id).toBe('test-ship-1');
        expect(mockShip.name).toBe('Test Ship');
        expect(mockShip.type).toBe('scout');
        expect(mockShip.totalSlots).toBe(15);
    });

    test('Mock card creation works', () => {
        const mockCard = global.testUtils.createMockCard();
        
        expect(mockCard).toBeDefined();
        expect(mockCard.id).toBe('test-card-1');
        expect(mockCard.name).toBe('Test Card');
        expect(mockCard.type).toBe('weapon');
        expect(mockCard.level).toBe(1);
    });

    test('Mock Three.js objects work', () => {
        const scene = new global.THREE.Scene();
        const vector = new global.THREE.Vector3(1, 2, 3);
        
        expect(scene).toBeDefined();
        expect(scene.add).toBeDefined();
        expect(vector.x).toBe(1);
        expect(vector.y).toBe(2);
        expect(vector.z).toBe(3);
    });

    test('Performance measurement works', () => {
        const start = performance.now();
        
        // Simulate some work
        for (let i = 0; i < 1000; i++) {
            Math.sqrt(i);
        }
        
        const end = performance.now();
        const duration = end - start;
        
        expect(duration).toBeGreaterThan(0);
        expect(typeof duration).toBe('number');
    });

    test('Audio mocks are available', () => {
        expect(global.Audio).toBeDefined();
        
        const audio = new global.Audio();
        expect(audio.play).toBeDefined();
        expect(audio.pause).toBeDefined();
        expect(typeof audio.volume).toBe('number');
    });

    test('localStorage mock is working', () => {
        expect(global.localStorage).toBeDefined();
        expect(global.localStorage.getItem).toBeDefined();
        expect(global.localStorage.setItem).toBeDefined();
        
        // Test that we can call localStorage methods
        global.localStorage.setItem('test', 'value');
        expect(typeof global.localStorage.setItem).toBe('function');
    });

    test('DOM utilities work', () => {
        const container = global.testUtils.createMockContainer();
        
        expect(container).toBeDefined();
        expect(container.style.width).toBe('1024px');
        expect(container.style.height).toBe('768px');
        expect(document.body.contains(container)).toBe(true);
    });
}); 