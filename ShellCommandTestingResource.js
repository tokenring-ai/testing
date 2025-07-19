import runShellCommand from "@token-ring/filesystem/tools/runShellCommand";
import TestingResource from "./TestingResource.js";

/**
 * @typedef {Object} TestCommand
 * @property {string} command - The command to run
 * @property {string} [description] - A description of the test
 */

/**
 * @typedef {Object} TestResult
 * @property {boolean} passed - Whether the test passed
 * @property {string} output - The output of the test
 */

/**
 * Provides ShellCommandTesting functionality
 * @extends TestingResource
 */
export default class ShellCommandTestingResource extends TestingResource {
	/** @type {string} */
	description = "Provides ShellCommandTesting functionality";

	/**
	 * @type {Object}
	 * @static
	 */
	static constructorProperties = {
		cwd: {
			type: "string",
			required: true,
			description: "The working director for the tests",
		},
		tests: {
			type: "object",
			description: "Named tests that can be run on the source code",
			additionalProperties: {
				type: "object",
				properties: {
					command: {
						type: "string",
						required: true,
						description: "The command to run",
					},
					description: {
						type: "string",
						description: "A description of the test",
					},
				},
			},
		},
	};

	/**
	 * Creates an instance of ShellCommandTestingResource
	 * @param {Object} params - The parameters
	 * @param {Object.<string, TestCommand>} [params.tests] - The tests collection mapping test names to test commands
	 */
	constructor({ tests }) {
		super();
		if (tests) {
			for (const [name, test] of Object.entries(tests)) {
				if (!test.command) {
					throw new Error(`Test ${name} is missing a command`);
				}
			}
		}

		/** @type {Object.<string, TestCommand>} */
		this.tests = tests ?? {};
	}

	/**
	 * Returns all tests with their descriptions
	 * @returns {Object.<string, {description: string}>} The tests and their descriptions
	 */
	getTests() {
		return Object.fromEntries(
			Object.entries(this.tests).map(([name, { description }]) => [
				name,
				{ description },
			]),
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
		const test = this.tests[name];
		if (!test) {
			throw new Error(`Test ${name} does not exist`);
		}

		try {
			const { stdout } = await runShellCommand(test, registry);

			return { passed: true, output: stdout };
		} catch (err) {
			return {
				passed: false,
				output: [
					`Command ${test.cmd} threw error ${err.message}, stderr:`,
					err.stderr,
					"\nstdout: ",
					err.stdout,
				].join("\n"),
			};
		}
	}
}
