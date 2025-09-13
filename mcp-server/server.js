#!/usr/bin/env node

/**
 * PlanetZ Playwright MCP Server
 * Provides tools to run automated Playwright tests for Star Charts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Test execution state
let currentTestProcess = null;
let testResults = {
  lastRun: null,
  lastResult: null,
  lastOutput: "",
  isRunning: false
};

class PlanetZPlaywrightServer {
  constructor() {
    this.server = new Server(
      {
        name: "planetz-playwright-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  setupToolHandlers() {
    // Tool: run_star_charts_tooltip_tests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      switch (name) {
        case "run_star_charts_tooltip_tests":
          return await this.runTooltipTests(args);

        case "run_star_charts_hitbox_tests":
          return await this.runHitboxTests(args);

        case "run_full_test_suite":
          return await this.runFullTestSuite(args);

        case "get_test_status":
          return await this.getTestStatus();

        case "stop_running_tests":
          return await this.stopRunningTests();

        case "setup_test_environment":
          return await this.setupTestEnvironment();

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  setupRequestHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "run_star_charts_tooltip_tests",
            description: "Run automated tests for Star Charts tooltip functionality",
            inputSchema: {
              type: "object",
              properties: {
                headless: {
                  type: "boolean",
                  description: "Run tests in headless mode (default: true)",
                  default: true
                },
                slowMo: {
                  type: "number",
                  description: "Slow motion delay in milliseconds (default: 100)",
                  default: 100
                }
              }
            }
          },
          {
            name: "run_star_charts_hitbox_tests",
            description: "Run tests for Star Charts hitbox validation",
            inputSchema: {
              type: "object",
              properties: {
                headless: {
                  type: "boolean",
                  description: "Run tests in headless mode (default: true)",
                  default: true
                },
                slowMo: {
                  type: "number",
                  description: "Slow motion delay in milliseconds (default: 100)",
                  default: 100
                }
              }
            }
          },
          {
            name: "run_full_test_suite",
            description: "Run the complete Playwright test suite",
            inputSchema: {
              type: "object",
              properties: {
                headless: {
                  type: "boolean",
                  description: "Run tests in headless mode (default: true)",
                  default: true
                },
                slowMo: {
                  type: "number",
                  description: "Slow motion delay in milliseconds (default: 100)",
                  default: 100
                }
              }
            }
          },
          {
            name: "get_test_status",
            description: "Get the status of currently running or last completed tests",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "stop_running_tests",
            description: "Stop any currently running tests",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "setup_test_environment",
            description: "Set up the test environment (install dependencies and browsers)",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }
        ]
      };
    });
  }

  async runTooltipTests(args = {}) {
    const { headless = true, slowMo = 100 } = args;

    if (testResults.isRunning) {
      return {
        content: [{
          type: "text",
          text: "❌ Tests are already running. Use 'stop_running_tests' first or wait for completion."
        }]
      };
    }

    return new Promise((resolve) => {
      testResults.isRunning = true;
      testResults.lastRun = new Date().toISOString();
      testResults.lastOutput = "";

      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const testProcess = spawn(pythonCmd, [
        path.join(PROJECT_ROOT, "scripts", "run_playwright_tests.py"),
        "--tooltips",
        headless ? "--headed=false" : "--headed=true",
        `--slow=${slowMo}`
      ], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"]
      });

      currentTestProcess = testProcess;
      let output = "";

      testProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[TOOLTIP_TEST] ${text.trim()}`);
      });

      testProcess.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[TOOLTIP_TEST_ERROR] ${text.trim()}`);
      });

      testProcess.on("close", (code) => {
        testResults.isRunning = false;
        testResults.lastResult = code === 0 ? "PASSED" : "FAILED";
        testResults.lastOutput = output;
        currentTestProcess = null;

        const result = code === 0 ? "PASSED" : "FAILED";
        resolve({
          content: [{
            type: "text",
            text: `🎯 Star Charts Tooltip Tests ${result}\n\nExit Code: ${code}\n\nOutput:\n${output}`
          }]
        });
      });

      testProcess.on("error", (error) => {
        testResults.isRunning = false;
        testResults.lastResult = "ERROR";
        testResults.lastOutput = `Process error: ${error.message}`;
        currentTestProcess = null;

        resolve({
          content: [{
            type: "text",
            text: `❌ Star Charts Tooltip Tests ERROR\n\n${error.message}\n\nOutput:\n${output}`
          }]
        });
      });
    });
  }

  async runHitboxTests(args = {}) {
    const { headless = true, slowMo = 100 } = args;

    if (testResults.isRunning) {
      return {
        content: [{
          type: "text",
          text: "❌ Tests are already running. Use 'stop_running_tests' first or wait for completion."
        }]
      };
    }

    return new Promise((resolve) => {
      testResults.isRunning = true;
      testResults.lastRun = new Date().toISOString();
      testResults.lastOutput = "";

      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const testProcess = spawn(pythonCmd, [
        path.join(PROJECT_ROOT, "scripts", "run_playwright_tests.py"),
        "--hitboxes",
        headless ? "--headed=false" : "--headed=true",
        `--slow=${slowMo}`
      ], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"]
      });

      currentTestProcess = testProcess;
      let output = "";

      testProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[HITBOX_TEST] ${text.trim()}`);
      });

      testProcess.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[HITBOX_TEST_ERROR] ${text.trim()}`);
      });

      testProcess.on("close", (code) => {
        testResults.isRunning = false;
        testResults.lastResult = code === 0 ? "PASSED" : "FAILED";
        testResults.lastOutput = output;
        currentTestProcess = null;

        const result = code === 0 ? "PASSED" : "FAILED";
        resolve({
          content: [{
            type: "text",
            text: `🎯 Star Charts Hitbox Tests ${result}\n\nExit Code: ${code}\n\nOutput:\n${output}`
          }]
        });
      });

      testProcess.on("error", (error) => {
        testResults.isRunning = false;
        testResults.lastResult = "ERROR";
        testResults.lastOutput = `Process error: ${error.message}`;
        currentTestProcess = null;

        resolve({
          content: [{
            type: "text",
            text: `❌ Star Charts Hitbox Tests ERROR\n\n${error.message}\n\nOutput:\n${output}`
          }]
        });
      });
    });
  }

  async runFullTestSuite(args = {}) {
    const { headless = true, slowMo = 100 } = args;

    if (testResults.isRunning) {
      return {
        content: [{
          type: "text",
          text: "❌ Tests are already running. Use 'stop_running_tests' first or wait for completion."
        }]
      };
    }

    return new Promise((resolve) => {
      testResults.isRunning = true;
      testResults.lastRun = new Date().toISOString();
      testResults.lastOutput = "";

      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const testProcess = spawn(pythonCmd, [
        path.join(PROJECT_ROOT, "scripts", "run_playwright_tests.py"),
        "--full",
        headless ? "--headed=false" : "--headed=true",
        `--slow=${slowMo}`
      ], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"]
      });

      currentTestProcess = testProcess;
      let output = "";

      testProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[FULL_TEST] ${text.trim()}`);
      });

      testProcess.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[FULL_TEST_ERROR] ${text.trim()}`);
      });

      testProcess.on("close", (code) => {
        testResults.isRunning = false;
        testResults.lastResult = code === 0 ? "PASSED" : "FAILED";
        testResults.lastOutput = output;
        currentTestProcess = null;

        const result = code === 0 ? "PASSED" : "FAILED";
        resolve({
          content: [{
            type: "text",
            text: `🚀 Full Test Suite ${result}\n\nExit Code: ${code}\n\nOutput:\n${output}`
          }]
        });
      });

      testProcess.on("error", (error) => {
        testResults.isRunning = false;
        testResults.lastResult = "ERROR";
        testResults.lastOutput = `Process error: ${error.message}`;
        currentTestProcess = null;

        resolve({
          content: [{
            type: "text",
            text: `❌ Full Test Suite ERROR\n\n${error.message}\n\nOutput:\n${output}`
          }]
        });
      });
    });
  }

  async getTestStatus() {
    return {
      content: [{
        type: "text",
        text: `📊 Test Status:\n\nRunning: ${testResults.isRunning}\nLast Run: ${testResults.lastRun || 'Never'}\nLast Result: ${testResults.lastResult || 'None'}\n\nLast Output Preview:\n${testResults.lastOutput.slice(-500) || 'No output'}`
      }]
    };
  }

  async stopRunningTests() {
    if (!testResults.isRunning || !currentTestProcess) {
      return {
        content: [{
          type: "text",
          text: "ℹ️ No tests are currently running."
        }]
      };
    }

    currentTestProcess.kill("SIGTERM");
    testResults.isRunning = false;
    testResults.lastResult = "STOPPED";
    currentTestProcess = null;

    return {
      content: [{
        type: "text",
          text: "🛑 Running tests have been stopped."
      }]
    };
  }

  async setupTestEnvironment() {
    return new Promise((resolve) => {
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const setupProcess = spawn(pythonCmd, [
        path.join(PROJECT_ROOT, "scripts", "setup_and_test.py")
      ], {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", "pipe", "pipe"]
      });

      let output = "";

      setupProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[SETUP] ${text.trim()}`);
      });

      setupProcess.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[SETUP_ERROR] ${text.trim()}`);
      });

      setupProcess.on("close", (code) => {
        const result = code === 0 ? "SUCCESS" : "FAILED";
        resolve({
          content: [{
            type: "text",
            text: `🔧 Test Environment Setup ${result}\n\nExit Code: ${code}\n\nOutput:\n${output}`
          }]
        });
      });

      setupProcess.on("error", (error) => {
        resolve({
          content: [{
            type: "text",
            text: `❌ Setup ERROR: ${error.message}\n\nOutput:\n${output}`
          }]
        });
      });
    });
  }

  async start() {
    console.log("🌌 PlanetZ Playwright MCP Server starting...");
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("✅ PlanetZ Playwright MCP Server connected");
  }
}

// Start the server
const server = new PlanetZPlaywrightServer();
server.start().catch((error) => {
  console.error("❌ MCP Server error:", error);
  process.exit(1);
});

