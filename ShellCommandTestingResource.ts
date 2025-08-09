import runShellCommand from "@token-ring/filesystem/tools/runShellCommand";
import TestingResource from "./TestingResource.js";

export type TestCommand = {
	command: string;
	description?: string;
};

export type TestResult = {
	passed: boolean;
	output: string;
};

export default class ShellCommandTestingResource extends TestingResource {
	description: string = "Provides ShellCommandTesting functionality";

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
	} as const;

	workingDirectory: string | undefined;
	command!: string;
	timeoutSeconds: number = 60;
	env: Record<string, string | undefined> = process.env as Record<
		string,
		string | undefined
	>;

	constructor({
		workingDirectory,
		command,
		timeoutSeconds,
		env,
		...params
	}: any) {
		super(params);
		this.workingDirectory = workingDirectory;
		this.command = command;
		this.timeoutSeconds = timeoutSeconds ?? 60;
		this.env = (env ?? process.env) as Record<string, string | undefined>;
	}

	async _runTest(registry: any): Promise<string> {
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
			return stdout as string;
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
