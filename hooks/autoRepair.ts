import TestingService from "../TestingService.js";
import { ChatService } from "@token-ring/chat";
import { WorkQueueService } from "@token-ring/queue";
import { FileSystemService } from "@token-ring/filesystem";
import { Registry } from "@token-ring/registry";

export const description = "Runs repairs automatically after chat is complete";

export async function afterTesting(registry: Registry): Promise<void> {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const workQueueService = registry.requireFirstServiceByType(WorkQueueService);

	//TODO carry forward state
	//const { enabledServices, enabledPlugins } = state;
	//const stateToCarryForward = { enabledServices, enabledPlugins};

	const filesystem = registry.requireFirstServiceByType(FileSystemService);
	if (filesystem.dirty) {
		const testingServices = registry.services.getServicesByType(TestingService);
		for (const testingService of testingServices) {
			const testResults = testingService.getLatestTestResults();
			for (const [name, result] of Object.entries(testResults)) {
				if (!result.passed) {
					chatService.errorLine(
						`Test ${name} did not pass, adding repair order to work queue`,
					);
					workQueueService.enqueue({
						//stateToCarryForward,
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
					});
				}
			}
		}
	}
}