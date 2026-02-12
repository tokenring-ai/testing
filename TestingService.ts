import {Agent} from "@tokenring-ai/agent";

import {TokenRingService} from "@tokenring-ai/app/types";
import deepMerge from "@tokenring-ai/utility/object/deepMerge";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import {z} from "zod";
import {TestingAgentConfigSchema, TestingServiceConfigSchema, TestResult} from "./schema.ts";
import {TestingState} from "./state/testingState.ts";
import type {TestingResource} from "./TestingResource.ts";

export default class TestingService implements TokenRingService {
  readonly name: string = "TestingService";
  description: string = "Provides testing functionality";

  private testRegistry = new KeyedRegistry<TestingResource>();

  registerResource = this.testRegistry.register;
  getAvailableResources = this.testRegistry.getAllItemNames;

  constructor(readonly options: z.output<typeof TestingServiceConfigSchema>) {}
  attach(agent: Agent): void {
    const config = deepMerge(this.options.agentDefaults, agent.getAgentConfigSlice('testing', TestingAgentConfigSchema));
    agent.initializeState(TestingState, config);
  }

  async runTests(
    likeName: string,
    agent: Agent,
  ): Promise<void> {

    const selectedTests = this.testRegistry.getItemEntriesLike(likeName);

    if (selectedTests.length === 0) {
      agent.chatOutput(`No tests found matching \`${likeName}\`.`);
      return;
    }

    const results: Record<string, TestResult> = {};

    agent.chatOutput(`### Running tests...\n`);

    let failureReport = "";
    for (const [name, testingResource] of selectedTests) {
      await agent.busyWhile(`Running test ${name}`, async () => {
        const result = results[name] = await testingResource.runTest(agent);

        if (result.status === "passed") {
          agent.chatOutput(`- **[Test: ${name}]** : ✅ PASSED`);
        } else if (result.status === "failed") {
          agent.chatOutput(`- **[Test: ${name}]** : ❌ FAILED`);
          failureReport += `#### ${name}\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
        } else if (result.status === "timeout") {
          agent.chatOutput(`- **[Test: ${name}]** : ⏳ TIMEOUT`);
        } else {
          agent.chatOutput(`- **[Test: ${name}]** : ⚠️ ERROR`);
        }
      });
    }

    if (failureReport === '') {
      agent.chatOutput(`\n**All tests passed!** ✨`);
      return;
    }

    let repairCount!: number;
    let maxAutoRepairs!: number;
    agent.mutateState(TestingState, (state) => {
      Object.assign(state.testResults, results);
      repairCount = ++state.repairCount;
      maxAutoRepairs = state.maxAutoRepairs;
    })

    const confirm = await agent.askForApproval({
      message: `The following tests failed. Would you like to ask the agent to automatically repair the errors?\n${failureReport}`,
      default: true,
      timeout: repairCount > maxAutoRepairs ? undefined : 30,
    });

    if (confirm) {
      agent.infoMessage(`Attempting to repair errors...`);
      agent.handleInput({
        message: `After running the test suite, the following problems were encountered, please repair them:\n ${failureReport}`
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
    
    agent.mutateState(TestingState, (state) => {
      testResults = { ...state.testResults };
    });

    return Object.values(testResults).every(result => result.status === "passed");
  }
}