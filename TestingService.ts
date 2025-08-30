import {ChatService} from "@token-ring/chat";
import {Registry, Service} from "@token-ring/registry";
import GenericMultipleRegistry from "@token-ring/utility/GenericMultipleRegistry";
import TestingResource, {type TestResult as ResourceTestResult,} from "./TestingResource.js";

export type TestResult = {
  passed: boolean;
  name: string;
  details?: string;
};

export default class TestingService extends Service {
  name: string = "TestingService";
  description: string = "Provides testing functionality";

  #latestTestResults: Record<string, ResourceTestResult> = {};

  private testRegistry = new GenericMultipleRegistry<TestingResource>();

  registerResource = this.testRegistry.register;
  getActiveResourceNames = this.testRegistry.getActiveItemNames;
  enableResources = this.testRegistry.enableItem;
  getAvailableResources = this.testRegistry.getAllItemNames;


  async runTests(
    {names}: { names?: string[] },
    registry: Registry,
  ): Promise<Record<string, ResourceTestResult>> {
    const chatService = registry.requireFirstServiceByType(ChatService);

    const results: Record<string, ResourceTestResult> = {};
    const testingResources = this.testRegistry.getActiveItemEntries();
    for (const name in testingResources) {
      if (names && !names.includes(name)) continue;

      const testingResource = testingResources[name];

      chatService.infoLine(`Running tests for resource ${name}...`);

      results[name] = this.#latestTestResults[name] =
        await testingResource.runTest(registry);
    }

    return results;
  }

  getLatestTestResults(): Record<string, ResourceTestResult> {
    return this.#latestTestResults;
  }

  allTestsPassed(registry: Registry): boolean {
    const resources = this.testRegistry.getActiveItemEntries();
    return Object.keys(resources).every(
      name => this.#latestTestResults[name]?.passed,
    );
  }
}
