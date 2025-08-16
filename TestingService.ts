import {ChatService} from "@token-ring/chat";
import {Registry, Service} from "@token-ring/registry";
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

  getTests(registry: Registry): Record<string, TestingResource> {
    const results: Record<string, TestingResource> = {};
    const testingResources =
      registry.resources.getResourcesByType(TestingResource);
    for (const testingResource of testingResources as TestingResource[]) {
      const name = testingResource.name as string;
      results[name] = testingResource;
    }
    return results;
  }

  async runTests(
    {names}: { names?: string[] },
    registry: Registry,
  ): Promise<Record<string, ResourceTestResult>> {
    const chatService = registry.requireFirstServiceByType(ChatService);

    const results: Record<string, ResourceTestResult> = {};
    const testingResources =
      registry.resources.getResourcesByType(TestingResource);
    for (const testingResource of testingResources as TestingResource[]) {
      const name = testingResource.name as string;
      if (names && !names.includes(name)) continue;

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
    const resources = registry.resources.getResourcesByType(
      TestingResource,
    ) as TestingResource[];
    return resources.every(
      (resource) => this.#latestTestResults[resource.name as string]?.passed,
    );
  }
}
