# Weapon Cooldown Times - Updated for Testing

All weapon cooldown times have been updated to be between 1-5 seconds with different values for each weapon type to make testing more noticeable and varied.

## Energy Weapons (Scan-Hit)

| Weapon Type | Old Cooldown | New Cooldown | Change | Damage | Notes |
|-------------|--------------|--------------|--------|---------|-------|
| **Laser Cannon** | 0.5s | **1.0s** | +0.5s | 50 | Fast basic weapon |
| **Pulse Cannon** | 0.3s | **1.5s** | +1.2s | 75 | Burst fire weapon |
| **Phaser Array** | 0.8s | **2.0s** | +1.2s | 90 | Wide beam weapon |
| **Plasma Cannon** | 1.5s | **2.5s** | +1.0s | 120 | High damage energy weapon |

## Missiles & Projectiles (Splash-Damage)

| Weapon Type | Old Cooldown | New Cooldown | Change | Damage | Notes |
|-------------|--------------|--------------|--------|---------|-------|
| **Homing Missile** | 2.0s | **3.0s** | +1.0s | 250 | Tracking capability |
| **Proximity Mine** | 4.0s | **3.5s** | -0.5s | 150 | Deployable defense |
| **Guided Torpedo** | 3.5s | **3.8s** | +0.3s | 350 | Heavy guided projectile |
| **Standard Missile** | 3.0s | **4.0s** | +1.0s | 200 | Basic missile |
| **Cluster Missile** | 4.0s | **4.5s** | +0.5s | 180 | Multi-warhead |
| **Heavy Torpedo** | 5.0s | **5.0s** | No change | 400 | Maximum cooldown |

## Testing Scenarios

### 1. **Fast Combat Testing**
- **Laser Cannon (1.0s)**: Quick repeated firing
- **Pulse Cannon (1.5s)**: Burst fire with noticeable gaps

### 2. **Balanced Combat Testing**  
- **Phaser Array (2.0s)**: Moderate rate energy weapon
- **Plasma Cannon (2.5s)**: Slower but more powerful

### 3. **Heavy Weapons Testing**
- **Homing Missile (3.0s)**: Missile tracking and guidance
- **Standard Missile (4.0s)**: Basic projectile timing
- **Heavy Torpedo (5.0s)**: Maximum power, maximum wait

## Key Testing Benefits

1. **Distinct Timing**: Each weapon now has a clearly different cooldown
2. **Visible Gaps**: All weapons have noticeable cooldown periods (1-5 seconds)
3. **Weapon Balance**: Faster weapons do less damage, slower weapons do more
4. **Strategy Testing**: Players must choose between fast/weak vs slow/powerful
5. **UI Testing**: Cooldown indicators will be clearly visible and distinguishable

## Technical Notes

- All changes made in `frontend/static/js/ship/systems/WeaponDefinitions.js`
- Cooldown times affect both autofire and manual fire modes
- Weapon damage and energy costs remain unchanged
- UI cooldown indicators will automatically reflect new timings
- Compatible with existing WeaponSyncManager (4-slot maximum) 