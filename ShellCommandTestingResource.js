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
		command: {
			type: "string",
			required: true,
			description: "The command to run",
		},
		description: {
			type: "string",
			description: "A description of the test",
		},
		timeout: {
			type: "number",
			description: "The timeout for the command",
			default: 60000,
		},
	};

	/**
	 * Creates an instance of ShellCommandTestingResource
	 * @param {Object} params - The parameters
	 * @param {string} params.name - The name of the resource
	 * @param {string} params.description - The description of the resource
	 *
	 * @param {string} params.command - The shell command to execute. Required. Must be non-empty.
	 * @param {number} [params.timeoutSeconds=60] - Command timeout in seconds (1-600, default 60)
	 * @param {Object.<string, string>} [params.env={}] - Environment variables as key/value pairs
	 * @param {string} [params.workingDirectory="./"] - Working directory relative to source root
	 */
	constructor({ workingDirectory, command, timeoutSeconds, env, ...params }) {
		super(params);
		this.workingDirectory = workingDirectory;
		this.command = command;
		this.timeoutSeconds = timeoutSeconds ?? 60;
		this.env = env ?? process.env;
	}

	/**
	 * Runs a specific test
	 * @param {TokenRingRegistry} registry - The package registry
	 * @returns {Promise<TestResult>} The result of the test
	 * @throws {Error} If the test does not exist
	 */
	async _runTest(registry) {
		const { ok, stdout, stderr } = await runShellCommand(
			{
				command: this.command,
				timeoutSeconds: this.timeoutSeconds,
				env: this.env,
				workingDirectory: this.workingDirectory,
			},
			registry,
		);
		if (ok) {
			return stdout;
		} else {
			throw new Error(
				[
					`Command ${this.command} threw error ${stderr}, stderr:`,
					stderr,
					"\nstdout: ",
					stdout,
				].join("\n"),
			);
		}
	}
}
