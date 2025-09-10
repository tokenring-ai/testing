import {Agent} from "@tokenring-ai/agent";
import {TokenRingService} from "@tokenring-ai/agent/types";
import KeyedRegistryWithMultipleSelection from "@tokenring-ai/utility/KeyedRegistryWithMultipleSelection";
import TestingResource, {type TestResult as ResourceTestResult,} from "./TestingResource.js";

export type TestResult = {
  passed: boolean;
  name: string;
  details?: string;
};

export default class TestingService implements TokenRingService {
  name: string = "TestingService";
  description: string = "Provides testing functionality";

  #latestTestResults: Record<string, ResourceTestResult> = {};

  private testRegistry = new KeyedRegistryWithMultipleSelection<TestingResource>();

  registerResource = this.testRegistry.register;
  getActiveResourceNames = this.testRegistry.getActiveItemNames;
  enableResources = this.testRegistry.enableItems;
  getAvailableResources = this.testRegistry.getAllItemNames;


  async runTests(
    {names}: { names?: string[] },
    agent: Agent,
  ): Promise<Record<string, ResourceTestResult>> {

    const results: Record<string, ResourceTestResult> = {};
    const testingResources = this.testRegistry.getActiveItemEntries();
    for (const name in testingResources) {
      if (names && !names.includes(name)) continue;

      const testingResource = testingResources[name];

      agent.infoLine(`Running tests for resource ${name}...`);

      results[name] = this.#latestTestResults[name] =
        await testingResource.runTest(agent);
    }

    return results;
  }

  getLatestTestResults(): Record<string, ResourceTestResult> {
    return this.#latestTestResults;
  }

  allTestsPassed(agent: Agent): boolean {
    const resources = this.testRegistry.getActiveItemEntries();
    return Object.keys(resources).every(
      name => this.#latestTestResults[name]?.passed,
    );
  }
}
