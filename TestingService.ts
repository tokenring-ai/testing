import type { Agent } from "@tokenring-ai/agent";

import type { TokenRingService } from "@tokenring-ai/app/types";
import deepMerge from "@tokenring-ai/utility/object/deepMerge";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import codeBlock from "@tokenring-ai/utility/string/codeBlock";
import type { z } from "zod";
import { TestingAgentConfigSchema, type TestingServiceConfigSchema, type TestResult } from "./schema.ts";
import { TestingState } from "./state/testingState.ts";
import type { TestingResource } from "./TestingResource.ts";

export default class TestingService implements TokenRingService {
  readonly name: string = "TestingService";
  description: string = "Provides testing functionality";

  private testRegistry = new KeyedRegistry<TestingResource>();

  registerResource = this.testRegistry.set;
  getAvailableResources = this.testRegistry.keysArray;

  constructor(readonly options: z.output<typeof TestingServiceConfigSchema>) {}

  attach(agent: Agent): void {
    const config = deepMerge(this.options.agentDefaults, agent.getAgentConfigSlice("testing", TestingAgentConfigSchema));
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
          agent.chatOutput(`### [${name}]\n ⏳ TIMEOUT`);
        } else {
          agent.chatOutput(`### [${name}]\n ⚠️ ERROR`);
        }
      });
    }

    if (failureReport === "") {
      agent.chatOutput(`\n**All tests passed!** ✨`);
      return;
    }

    let repairCount!: number;
    let maxAutoRepairs!: number;
    agent.mutateState(TestingState, state => {
      Object.assign(state.testResults, results);
      repairCount = ++state.repairCount;
      maxAutoRepairs = state.maxAutoRepairs;
    });

    const confirm = await agent.askForApproval({
      message: `The above tests failed. Would you like to ask the agent to automatically repair the errors?`,
      default: true,
      timeout: repairCount > maxAutoRepairs ? undefined : 30,
    });

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
