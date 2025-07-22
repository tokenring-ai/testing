/**
 * Represents a test result with pass/fail status.
 * @typedef {Object} TestResult
 * @property {boolean} passed - Indicates whether the test passed.
 * @property {string} name - Name of the test.
 * @property {string} [details] - Optional additional details about the test result.
 */

import { Service } from "@token-ring/registry";
import { ChatService } from "@token-ring/chat";
import TestingResource from "./TestingResource.js";

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
	 * @type {Object.<string,TestResult>}
	 * @private
	 */
	#latestTestResults = {};

	/**
	 * Retrieves available tests.
	 * @throws {Error} When called on the abstract base class.
	 * @returns {Object<string, Object>} List of test names.
	 */
	getTests() {
		throw new Error(
			`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
		);
	}

	async runTests({ names }, registry) {
		const chatService = registry.requireFirstServiceByType(ChatService);

		const results = {};
		const testingResources =
			registry.resources.getResourcesByType(TestingResource);
		for (const testingResource of testingResources) {
			const name = testingResource.name;
			if (names && !names.includes(name)) continue;

			chatService.infoLine(`Running tests for resource ${name}...`);

			results[name] = this.#latestTestResults[name] =
				await testingResource.runTest(registry);
		}

		return results;
	}

	/**
	 * Retrieves the current test results.
	 * @returns {Object.<string,TestResult>} Current test results.
	 */
	getLatestTestResults() {
		return this.#latestTestResults;
	}

	/**
	 * Checks if all tests have passed.
	 * @returns {boolean} True if all tests passed, false otherwise.
	 */
	allTestsPassed(registry) {
		const resources = registry.resources.getResourcesByType(TestingResource);
		return resources.every(
			(resource) => this.#latestTestResults[resource.name]?.passed,
		);
	}
}
