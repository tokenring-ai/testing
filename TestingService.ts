import type { Agent } from "@tokenring-ai/agent";

import type { TokenRingService } from "@tokenring-ai/app/types";
import deepClone from "@tokenring-ai/utility/object/deepClone";
import deepEqual from "@tokenring-ai/utility/object/deepEqual";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import codeBlock from "@tokenring-ai/utility/string/codeBlock";
import type { z } from "zod";
import ShellCommandTestingResource from "./ShellCommandTestingResource.ts";
import { shellCommandTestingConfigSchema, TestingAgentConfigSchema, TestingServiceConfigSchema, type TestResult } from "./schema.ts";
import { TestingState } from "./state/testingState.ts";
import type { TestingResource } from "./TestingResource.ts";

type TestingServiceConfig = z.output<typeof TestingServiceConfigSchema>;

export default class TestingService implements TokenRingService {
  readonly name: string = "TestingService";
  description: string = "Provides testing functionality";

  private testRegistry = new KeyedRegistry<TestingResource>();

  registerResource = this.testRegistry.set;
  getAvailableResources = this.testRegistry.keysArray;

  private options: TestingServiceConfig = TestingServiceConfigSchema.parse({});

  constructor(options?: TestingServiceConfig) {
    if (options) this.reconfigure(options);
  }

  reconfigure(newConfig: TestingServiceConfig): void {
    this.testRegistry.reconcileAgainst(newConfig.resources, {
      creating: (_name, testingConfig) => this.createResource(testingConfig),
      deleting: () => {},
      updating: (name, resource, testingConfig) => {
        if (deepEqual(this.options.resources[name], testingConfig)) return resource;
        return this.createResource(testingConfig);
      },
    });
    this.options = newConfig;
  }

  private createResource(testingConfig: { type: string }): TestingResource {
    switch (testingConfig.type) {
      case "shell":
        return new ShellCommandTestingResource(shellCommandTestingConfigSchema.parse(testingConfig));
      default:
        throw new Error(`Unknown testing resource type: ${testingConfig.type}`);
    }
  }

  attach(agent: Agent): void {
    const config = deepClone(this.options.agentDefaults, agent.getAgentConfigSlice("testing", TestingAgentConfigSchema));
    agent.initializeState(TestingState, config);
  }

  async runTests(likeName: string, agent: Agent): Promise<void> {
    const selectedTests = this.testRegistry.entriesLike(likeName);

    if (selectedTests.length === 0) {
      agent.chatOutput(`No tests found matching \`${likeName}\`.`);
      return;
    }

    const results: Record<string, TestResult> = {};

    agent.chatOutput(`## Running tests...\n`);

    let failureReport = "";
    for (const [name, testingResource] of selectedTests) {
      await agent.busyWithActivity(`Running test ${name}`, async () => {
        const result = (results[name] = await testingResource.runTest(agent));

        if (result.status === "passed") {
          agent.chatOutput(`### [${name}]\n ✅ PASSED\n`);
        } else if (result.status === "failed") {
          const formattedOutput = codeBlock(result.output);
          agent.chatOutput(`### [${name}]\n ❌ FAILED\n${formattedOutput}\n`);
          failureReport += `#### ${name}\n${formattedOutput}\n\n`;
        } else if (result.status === "timeout") {
          const formattedOutput = codeBlock(result.output);
          agent.chatOutput(`### [${name}]\n ⏳ TIMEOUT\n${formattedOutput}\n`);
          failureReport += `#### ${name}\nTest timed out\n${formattedOutput}\n\n`;
        } else {
          agent.chatOutput(`### [${name}]\n ⚠️ ERROR\n`);
          failureReport += `#### ${name}\n${codeBlock(result.error)}\n\n`;
        }
      });
    }

    const allPassed = Object.values(results).every(result => result.status === "passed");

    const shouldAutoRepair = agent.mutateState(TestingState, state => {
      Object.assign(state.testResults, results);
      if (allPassed || state.repairCount >= state.maxAutoRepairs) {
        state.repairCount = 0;
        return false;
      }

      state.repairCount++;
      return true;
    });

    if (allPassed) {
      agent.chatOutput(`\n**All tests passed!** ✨`);
      return;
    }

    const confirm =
      shouldAutoRepair ||
      (await agent.askForApproval({
        message: `The above tests failed. Would you like to ask the agent to automatically repair the errors?`,
        defaultValue: true,
      }));

    if (confirm) {
      agent.infoMessage(`Attempting to repair errors...`);
      agent.handleInput({
        from: "Automatic repair after test suite failure",
        message: `After running the test suite, the following problems were encountered, please repair them`,
        attachments: [
          {
            name: "Test failure report",
            encoding: "text",
            mimeType: "text/markdown",
            body: failureReport,
          },
        ],
      });
    } else {
      agent.chatOutput(`\n**Some tests failed.** ❌\n Not attempting to repair errors due to user request or auto repair limit reached`);
      agent.mutateState(TestingState, state => (state.repairCount = 0));
    }
  }

  /**
   * Check if all tests have passed for the given agent
   * @param agent The agent to check test results for
   * @returns True if all tests passed, false otherwise
   */
  allTestsPassed(agent: Agent): boolean {
    let testResults: Record<string, TestResult> = {};

    agent.mutateState(TestingState, state => {
      testResults = { ...state.testResults };
    });

    return Object.values(testResults).every(result => result.status === "passed");
  }
}
