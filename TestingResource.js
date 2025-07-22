import { Resource } from "@token-ring/registry";
import { ChatService } from "@token-ring/chat";

/**
 * @typedef {Object} Test
 * @property {string} name - The name of the test
 * @property {string} description - A description of the test
 */

/**
 * @typedef {Object} TestResult
 * @property {Date} startedAt - Time when the test started
 * @property {Date} finishedAt - Time when the test finished
 * @property {boolean} passed - Whether the test passed
 * @property {string} output - The output of the test
 */

/**
 * Abstract class that implements testing resources
 * @extends TokenRingResource
 */
export default class TestingResource extends Resource {
	#testResults = [];

	/**
	 * Runs a specific test
	 * @param {TokenRingRegistry} registry - The package registry
	 * @returns {Promise<TestResult>} The result of the test
	 * @throws {Error} If the test does not exist
	 */
	async _runTest(registry) {
		throw new Error(
			`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
		);
	}

	/**
	 * Retrieves the latest test result.
	 * @returns {TestResult} Latest test result.
	 */
	getLatestTestResult() {
		return this.#testResults[this.#testResults.length - 1];
	}

	async runTest(registry) {
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
			//console.log(error);
			this.#testResults.push({
				startedAt,
				finishedAt: new Date(),
				passed: false,
				error,
			});
		}

		return this.#testResults[this.#testResults.length - 1];
	}
}
