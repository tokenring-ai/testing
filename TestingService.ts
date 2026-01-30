import {Agent} from "@tokenring-ai/agent";

import {TokenRingService} from "@tokenring-ai/app/types";
import deepMerge from "@tokenring-ai/utility/object/deepMerge";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import {z} from "zod";
import {TestingAgentConfigSchema, TestingServiceConfigSchema, TestResult} from "./schema.ts";
import {TestingState} from "./state/testingState.ts";
import type {TestingResource} from "./TestingResource.ts";

export default class TestingService implements TokenRingService {
  name: string = "TestingService";
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
      agent.infoMessage(`No tests found matching "${likeName}".`);
      return;
    }

    const results: Record<string, TestResult> = {};

    let failureReport = "";
    for (const [name, testingResource] of selectedTests) {
      await agent.busyWhile(`Running test ${name}`, async () => {
        const result = results[name] = await testingResource.runTest(agent);

        if (result.passed) {
          agent.infoMessage(`[Test: ${name}] : PASSED`);
        } else {
          agent.errorMessage(`[Test: ${name}] : FAILED`);
          failureReport += `[${name}]\n${result.output}\n\n`;
        }
      });
    }

    if (failureReport === '') {
      agent.chatOutput(`All tests passed!\n`);
      return;
    }

    if (failureReport === '') {
      agent.mutateState(TestingState, (state) => {
        Object.assign(state.testResults, results);
        state.repairCount = 0;
      })
      agent.chatOutput(`All tests passed!\n`);
      return;
    } else {
      let repairCount!: number;
      let maxAutoRepairs!: number;
      agent.mutateState(TestingState, (state) => {
        Object.assign(state.testResults, results);
        repairCount = ++state.repairCount;
        maxAutoRepairs = state.maxAutoRepairs;
      })

      const confirm = await agent.askForConfirmation({
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

    // Check if all tests passed
    return Object.values(testResults).every(result => result.passed);
  }
}