import {Registry} from "@token-ring/registry";

export type Test = {
  name: string;
  description: string;
};

export type TestResult = {
  startedAt: Date;
  finishedAt: Date;
  passed: boolean;
  output?: string;
  error?: unknown;
};

/**
 * Abstract class that implements testing resources
 */
export default class TestingResource  {
  #testResults: TestResult[] = [];

  /**
   * Runs a specific test (to be implemented by subclasses)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async _runTest(registry: Registry): Promise<string> {
    throw new Error(
      `The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
    );
  }

  /**
   * Retrieves the latest test result.
   */
  getLatestTestResult(): TestResult | undefined {
    return this.#testResults[this.#testResults.length - 1];
  }

  async runTest(registry: Registry): Promise<TestResult> {
    const startedAt = new Date();
    try {
      const result = await this._runTest(registry);
      this.#testResults.push({
        startedAt,
        finishedAt: new Date(),
        passed: true,
        output: result,
      });
    } catch (error) {
      this.#testResults.push({
        startedAt,
        finishedAt: new Date(),
        passed: false,
        error,
      });
    }

    return this.#testResults[this.#testResults.length - 1]!;
  }
}
