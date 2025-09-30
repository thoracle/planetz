# Debug Tools

This folder contains useful debug and diagnostic scripts for PlanetZ development.

## 🔍 **Sector Validation**

### `sector_validation_debug.js`
Comprehensive validation script to run after warping into a new sector.

**Usage:**
```javascript
// Copy and paste into browser console after warping
validateSector()        // Full validation
quickTargetTest()       // Quick test of first 5 targets  
validateCurrentWireframe() // Check current target wireframe
```

**Validates:**
- Discovery states consistency
- Faction/diplomacy data accuracy
- Object positions validity
- Wireframe color correctness
- System integration health
- Memory usage and performance

## 🧹 **Debug Cleanup**

### `cleanup_debug_spam.js`
Removes debug logging and console spam while preserving functionality.

**Usage:**
```javascript
// Copy and paste into browser console
cleanupDebugSpam()  // Remove all debug logging
verifyCleanState()  // Verify fixes still work
```

## 📋 **Development Guidelines**

- **Always run `validateSector()`** after warping to catch issues early
- **Use `cleanup_debug_spam.js`** to remove console noise during development
- **Keep this folder organized** - move temporary debug scripts here instead of cluttering the main directory
- **Document any new debug tools** you add to this folder

## 🚨 **Critical Fixes Applied**

The following fixes have been permanently integrated into the main codebase:

1. **Discovery Color Fix** - Wireframe colors now correctly match faction standings
2. **Diplomacy Logic Fix** - Discovered objects return proper faction data instead of "unknown"
3. **Cache Clearing** - Discovery status cache is cleared to prevent stale data

These debug tools help validate that these fixes continue working correctly.
