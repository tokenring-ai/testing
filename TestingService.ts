import {Agent} from "@tokenring-ai/agent";

import {TokenRingService} from "@tokenring-ai/app/types";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import {z} from "zod";
import {testingConfigSchema, TestResult, TestResult as ResourceTestResult, testResultSchema} from "./schema.ts";
import {TestingState} from "./state/testingState.ts";
import type {TestingResource} from "./TestingResource.ts";

export default class TestingService implements TokenRingService {
  name: string = "TestingService";
  description: string = "Provides testing functionality";

  private testRegistry = new KeyedRegistry<TestingResource>();

  registerResource = this.testRegistry.register;
  getAvailableResources = this.testRegistry.getAllItemNames;

  constructor(private config: z.output<typeof testingConfigSchema>) {}
  attach(agent: Agent) {
    agent.initializeState(TestingState, { maxAutoRepairs: this.config.maxAutoRepairs });
  }
  async runTests(
    likeName: string,
    agent: Agent,
  ): Promise<void> {

    const selectedTests = this.testRegistry.getItemEntriesLike(likeName);

    if (selectedTests.length === 0) {
      agent.infoLine(`No tests found matching "${likeName}".`);
      return;
    }

    const results: Record<string, TestResult> = {};

    let failureReport = "";
    for (const [name, testingResource] of selectedTests) {
      await agent.busyWhile(`Running test ${name}`, async () => {
        const result = results[name] = await testingResource.runTest(agent);

        if (result.passed) {
          agent.infoLine(`[Test: ${name}] : PASSED`);
        } else {
          agent.errorLine(`[Test: ${name}] : FAILED`);
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

      const confirm = await agent.askHuman({
        type: "askForConfirmation",
        message: `The following tests failed. Would you like to ask the agent to automatically repair the errors?\n${failureReport}`,
        timeout: repairCount > maxAutoRepairs ? undefined : 30,
      });

      if (confirm) {
        agent.infoLine(`Attempting to repair errors...`);
        agent.handleInput({
          message: `After running the test suite, the following tests failed: ${failureReport}`
        });
      }
    }
  }
}
