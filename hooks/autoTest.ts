import { Agent } from "@tokenring-ai/agent";
import { FileSystemService } from "@tokenring-ai/filesystem";
import TestingService from "../TestingService.js";

export const description = "Runs tests automatically after chat is complete";

export async function afterChatComplete(agent: Agent): Promise<void> {
	const filesystem = agent.requireServiceByType(FileSystemService);
	const testingService = agent.requireServiceByType(TestingService);

	if (filesystem.dirty) {
		agent.infoLine("Working Directory was updated, running test suite...");

		// Run all tests for this testing service
		const testResults = await testingService.runTests({}, agent);

		// Output results
		for (const [name, result] of Object.entries(testResults)) {
			if (result.passed) {
				agent.infoLine(`Test ${name} passed.`);
			} else {
				agent.errorLine(`Test ${name} failed, result: \n${result.output}`);
			}
		}
	}
}
