import { Resource } from "@token-ring/registry";

/**
 * @typedef {Object} Test
 * @property {string} name - The name of the test
 * @property {string} description - A description of the test
 */

/**
 * @typedef {Object} TestResult
 * @property {boolean} passed - Whether the test passed
 * @property {string} output - The output of the test
 */

/**
 * Abstract class that implements testing resources
 * @extends TokenRingResource
 */
export default class TestingResource extends Resource {
	/**
	 * Returns all tests with their descriptions
	 * @returns {Object.<string, {description: string}>} The tests and their descriptions
	 */
	getTests() {
		throw new Error(
			`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
		);
	}

	/**
	 * Runs a specific test
	 * @param {string} name - The name of the test to run
	 * @param {TokenRingRegistry} registry - The package registry
	 * @returns {Promise<TestResult>} The result of the test
	 * @throws {Error} If the test does not exist
	 */
	async runTest(name, registry) {
		throw new Error(
			`The ${import.meta.filename} class is abstract and cannot be used directly. Please use a subclass instead.`,
		);
	}
}
