/**
 * WeaponCard.js - Re-exports for backwards compatibility
 *
 * This file re-exports all weapon classes from their individual modules.
 * The actual implementations have been extracted to:
 *   - weapons/WeaponBase.js (WeaponCard base class)
 *   - weapons/ScanHitWeapon.js (Hitscan weapons like lasers)
 *   - weapons/SplashDamageWeapon.js (Projectile weapons like missiles)
 *   - weapons/Projectile.js (Simple fallback projectile)
 *   - weapons/PhysicsProjectile.js (Ammo.js physics projectile)
 */

// Re-export all weapon classes for backwards compatibility
export { WeaponCard } from './weapons/WeaponBase.js';
export { ScanHitWeapon } from './weapons/ScanHitWeapon.js';
export { SplashDamageWeapon } from './weapons/SplashDamageWeapon.js';
export { Projectile } from './weapons/Projectile.js';
export { PhysicsProjectile } from './weapons/PhysicsProjectile.js';
