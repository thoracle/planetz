// ES6 Module wrapper for global THREE.js
// This allows ES6 modules to import THREE when it's loaded as a global script

if (typeof THREE === 'undefined') {
    throw new Error('THREE.js must be loaded globally before importing this module');
}

// Export the global THREE object and its main classes
export const Vector3 = THREE.Vector3;
export const Vector2 = THREE.Vector2;
export const Color = THREE.Color;
export const Scene = THREE.Scene;
export const PerspectiveCamera = THREE.PerspectiveCamera;
export const WebGLRenderer = THREE.WebGLRenderer;
export const Mesh = THREE.Mesh;
export const SphereGeometry = THREE.SphereGeometry;
export const BufferGeometry = THREE.BufferGeometry;
export const MeshBasicMaterial = THREE.MeshBasicMaterial;
export const LineBasicMaterial = THREE.LineBasicMaterial;
export const PointsMaterial = THREE.PointsMaterial;
export const Group = THREE.Group;
export const Object3D = THREE.Object3D;
export const Raycaster = THREE.Raycaster;
export const MathUtils = THREE.MathUtils;
export const Line = THREE.Line;
export const Points = THREE.Points;
export const PlaneGeometry = THREE.PlaneGeometry;
export const BoxGeometry = THREE.BoxGeometry;
export const CylinderGeometry = THREE.CylinderGeometry;

// Export everything as default
export default THREE;
