/**
 * Represents a test result with pass/fail status.
 * @typedef {Object} TestResult
 * @property {boolean} passed - Indicates whether the test passed.
 * @property {string} name - Name of the test.
 * @property {string} [details] - Optional additional details about the test result.
 */

import { Service } from "@token-ring/registry";

/**
 * Abstract base class for managing test registry and results.
 * @class
 */
export default class TestingService extends Service {
  /** @type {string} The name of the service. */
  name = "TestingService";
  /** @type {string} A description of the service. */
  description = "Provides testing functionality";

  /**
   * Stored test results.
   * @type {TestResult[]}
   * @private
   */
  #testResults = [];

  /**
   * Retrieves available tests.
   * @throws {Error} When called on the abstract base class.
   * @returns {Object<string, Object>} List of test names.
   */
  getTests() {
    throw new Error(`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`);
  }

  /**
   * Runs a specific test with the given registry.
   * @param {string} name - Name of the test to run.
   * @param {TokenRingRegistry} registry - The package registry.
   * @throws {Error} When called on the abstract base class.
   * @returns {TestResult} Result of the test.
   */
  runTest(name, registry) {
    throw new Error(`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`);
  }

  /**
   * Sets the test results for the current context.
   * @param {TestResult[]} testResults - Array of test results.
   */
  setTestResults(testResults) {
    this.#testResults = testResults;
  }

  /**
   * Retrieves the current test results.
   * @returns {TestResult[]} Current test results.
   */
  getTestResults() {
    return this.#testResults;
  }

  /**
   * Checks if all tests have passed.
   * @returns {boolean} True if all tests passed, false otherwise.
   */
  allTestsPassed() {
    return this.#testResults?.every(result => result.passed) ?? false;
  }
}