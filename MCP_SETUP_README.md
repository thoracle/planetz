# 🌌 PlanetZ MCP Playwright Server Setup

## 🎯 What This Does

This MCP server allows Cursor to **run Playwright tests automatically** without any manual setup. You can now test Star Charts tooltips and hitboxes directly from Cursor's chat interface!

## 🚀 Quick Setup (3 Steps)

### Step 1: Open Cursor Settings
1. Open Cursor
2. Go to `Cursor Settings` → `MCP & Integrations` → `Add Custom MCP`
3. Click `+ Add New MCP Server`

### Step 2: Configure the Server
```
Name: PlanetZ Playwright Tests
Type: stdio
Command: node /Users/retroverse/Desktop/LLM/planetz/mcp-server/server.js
```

### Step 3: Test the Connection
1. Click the refresh button next to the server
2. You should see 6 available tools appear
3. The server is now ready!

## 🎮 Available Tools

Once configured, you can use these commands in Cursor's chat:

### **Test Star Charts Tooltips**
```
Run tooltip tests for Star Charts
```
*Tests if tooltips appear on hover, ship shows "You are here", discovered objects show names*

### **Test Hitboxes**
```
Run hitbox tests for Star Charts
```
*Validates clickable areas and checks for mysterious invisible hitboxes*

### **Run Full Test Suite**
```
Run the complete test suite
```
*Runs all Playwright tests end-to-end*

### **Setup Environment**
```
Set up the test environment
```
*Installs dependencies and Playwright browsers automatically*

### **Check Test Status**
```
Get current test status
```
*Shows if tests are running and last results*

### **Stop Tests**
```
Stop running tests
```
*Halts any currently executing tests*

## 💡 How It Works

1. **Automatic Setup**: The MCP server handles starting/stopping the Flask server
2. **Browser Management**: Launches browsers, navigates to your game, presses 'C' for Star Charts
3. **Test Execution**: Runs the comprehensive test suite I created
4. **Real-time Results**: Returns pass/fail status and detailed output

## 🎯 What Gets Tested

- ✅ **Tooltip Issues**: The core problem you reported - tooltips not working until clicking
- ✅ **Ship Movement**: Monitors if ship position changes when stationary
- ✅ **Hitbox Problems**: Detects mysterious invisible clickable areas
- ✅ **Zoom Behavior**: Ensures tooltips work at all zoom levels
- ✅ **Integration**: Full workflow from game load to Star Charts close

## 🔧 Technical Details

### Server Location
```
/Users/retroverse/Desktop/LLM/planetz/mcp-server/server.js
```

### Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- Your existing Playwright test suite
- Python and Node.js (already in your project)

### Test Files Used
- `tests/playwright/test_star_charts_tooltips.py`
- `tests/playwright/test_star_charts_hitboxes.py`
- `scripts/run_playwright_tests.py`

## 🚦 Usage Examples

### Basic Testing
```
"Run the Star Charts tooltip tests"
```

### Debug Mode
```
"Run tooltip tests with visible browser and slow motion"
```

### Full Validation
```
"Set up test environment, then run full test suite"
```

### Status Check
```
"Are any tests currently running? What were the last results?"
```

## 🎉 Why This Is Awesome

**Before**: Manual setup, terminal commands, environment management
**After**: Just chat with Cursor and get results instantly!

The MCP server eliminates all the manual steps and lets you focus on the actual testing and debugging.

## 🔍 Troubleshooting

### Server Won't Connect
- Check the path to `server.js` is correct
- Ensure `npm install` ran successfully in `mcp-server/` directory
- Restart Cursor after adding the server

### Tests Fail
- The server will automatically set up the environment
- Check that Python and Node.js are available in your PATH
- Game server will be started/stopped automatically

### No Tools Appear
- Click the refresh button in MCP settings
- Check Cursor's logs for connection errors
- Verify the server.js file exists and has proper permissions

---

**Ready to test?** Configure the MCP server and try: *"Run Star Charts tooltip tests"* 🎮
