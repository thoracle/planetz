/**
 * Test the new DistanceCalculator utility
 * This ensures our refactoring is working correctly
 */

import { DistanceCalculator } from '../../frontend/static/js/utils/DistanceCalculator.js';

describe('DistanceCalculator', () => {
    test('calculate distance between two points', () => {
        const point1 = { x: 0, y: 0, z: 0 };
        const point2 = { x: 3, y: 4, z: 0 };

        const distance = DistanceCalculator.calculate(point1, point2);
        expect(distance).toBeCloseTo(5.0, 0.001); // 3-4-5 triangle
    });

    test('calculate squared distance', () => {
        const point1 = { x: 1, y: 1, z: 1 };
        const point2 = { x: 4, y: 5, z: 6 };

        const squaredDistance = DistanceCalculator.calculateSquared(point1, point2);
        expect(squaredDistance).toBe(3*3 + 4*4 + 5*5); // 9 + 16 + 25 = 50
    });

    test('handle invalid inputs', () => {
        const result1 = DistanceCalculator.calculate(null, { x: 1, y: 1, z: 1 });
        expect(result1).toBe(Infinity);

        const result2 = DistanceCalculator.calculate({ x: 1, y: 1, z: 1 }, undefined);
        expect(result2).toBe(Infinity);
    });

    test('standardize different coordinate formats', () => {
        // Test array format
        const arrayPoint = [1, 2, 3];
        const standardized = DistanceCalculator.standardizeCoordinates(arrayPoint);
        expect(standardized).toEqual({ x: 1, y: 2, z: 3 });

        // Test object format
        const objectPoint = { x: 4, y: 5, z: 6 };
        const standardized2 = DistanceCalculator.standardizeCoordinates(objectPoint);
        expect(standardized2).toEqual({ x: 4, y: 5, z: 6 });
    });

    test('validate coordinates', () => {
        expect(DistanceCalculator.validateCoordinates({ x: 1, y: 2, z: 3 })).toBe(true);
        expect(DistanceCalculator.validateCoordinates({ x: 1, y: 2 })).toBe(false);
        expect(DistanceCalculator.validateCoordinates(null)).toBe(false);
        expect(DistanceCalculator.validateCoordinates({ x: 'invalid', y: 2, z: 3 })).toBe(false);
    });

    test('isWithinRange functionality', () => {
        const center = { x: 0, y: 0, z: 0 };
        const point1 = { x: 3, y: 0, z: 0 }; // Distance 3
        const point2 = { x: 6, y: 0, z: 0 }; // Distance 6

        expect(DistanceCalculator.isWithinRange(center, point1, 5)).toBe(true); // 3 < 5
        expect(DistanceCalculator.isWithinRange(center, point2, 5)).toBe(false); // 6 > 5
    });
});
