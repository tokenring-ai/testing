import { Agent } from "@tokenring-ai/agent";
import { FileSystemService } from "@tokenring-ai/filesystem";
import { WorkQueueService } from "@tokenring-ai/queue";
import TestingService from "../TestingService.js";

export const description = "Runs repairs automatically after chat is complete";

export async function afterTesting(agent: Agent): Promise<void> {
	const workQueueService = agent.requireServiceByType(WorkQueueService);

	//TODO carry forward state
	//const { enabledServices, enabledPlugins } = state;
	//const stateToCarryForward = { enabledServices, enabledPlugins};

	const testingService = agent.requireServiceByType(TestingService);
	const filesystem = agent.requireServiceByType(FileSystemService);
	if (filesystem.dirty) {
		const testResults = testingService.getLatestTestResults();
		for (const [name, result] of Object.entries(testResults)) {
			if (!result.passed) {
				agent.errorLine(
					`Test ${name} did not pass, adding repair order to work queue`,
				);
				workQueueService.enqueue(
					{
						//TODO: Should we carry forward state?
						checkpoint: agent.generateCheckpoint(),
						name: `Repair after ${name} testing failure`,
						input: [
							{
								role: "system",
								content:
									"While automatically testing the application code, the following error was encountered. Please repair the error",
							},
							{
								role: "system",
								content: `-- Test results -- ${result.output}`,
							},
						],
					},
					agent,
				);
			}
		}
	}
}
