# Star Charts Hit Box Debug Tool

This tool helps debug hit box positioning issues in the Star Charts system by making hit boxes visible with red circles/rectangles.

## Quick Start

1. **Open the game**: Navigate to `http://127.0.0.1:5001`
2. **Open Star Charts**: Press `G` key in the game
3. **Enable debug mode**: Open browser console (F12) and run:
   ```javascript
   enableHitBoxDebug()
   ```
4. **Refresh Star Charts**: Close and reopen Star Charts (press `G` twice)
5. **Look for red hit boxes**: You should now see red dashed circles/rectangles around all objects

## Console Commands

| Command | Description |
|---------|-------------|
| `enableHitBoxDebug()` | Enable hit box visibility |
| `disableHitBoxDebug()` | Disable hit box visibility |
| `toggleHitBoxDebug()` | Toggle hit box visibility on/off |
| `hitBoxDebugStatus()` | Check current debug status |

## What You'll See

- **Red dashed circles** - Hit boxes for planets, stars, moons
- **Red dashed squares** - Hit boxes for space stations (rotated 45°)
- **Red dashed triangles** - Hit boxes for navigation beacons
- **Yellow coordinate labels** - Show exact X,Y coordinates (only at zoom level > 2)
- **Cyan "?" icons** - Undiscovered objects with their own hit boxes

## Debugging Tips

1. **Compare visual vs hit box**: The visual object should be centered within its hit box
2. **Check coordinates**: Yellow labels show exact positioning - use these to verify alignment
3. **Look for patterns**: If hit boxes are consistently "off to the left", check the coordinate calculation
4. **Test different zoom levels**: Hit boxes should scale properly with zoom
5. **Check object types**: Different object types have different hit box shapes

## Files Modified

- `frontend/static/js/views/StarChartsUI.js` - Added debug visualization
- `frontend/static/js/views/StarChartsManager.js` - Added console commands
- `debug_star_charts_hitboxes.html` - Standalone debug tool

## Troubleshooting

**Hit boxes not visible?**
- Make sure debug mode is enabled: `hitBoxDebugStatus()`
- Refresh the Star Charts view after enabling debug mode
- Check browser console for any errors

**Hit boxes appear in wrong position?**
- Compare the visual object center with the hit box center
- Check the `getDisplayPosition()` method in StarChartsUI.js
- Look at the coordinate labels to verify positioning

**Performance issues?**
- Disable debug mode when not needed: `disableHitBoxDebug()`
- Debug mode adds extra rendering overhead

## Removing Debug Code

When debugging is complete, you can remove the debug code by:

1. Setting all hit boxes back to `transparent` and `stroke: 'none'`
2. Removing the coordinate label code
3. Removing the console commands from StarChartsManager.js

The debug code is designed to be easily removable - just search for "DEBUG:" comments in the code.
