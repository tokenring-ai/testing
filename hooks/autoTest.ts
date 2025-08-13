import TestingService from "../TestingService.js";
import {ChatService} from "@token-ring/chat";
import {FileSystemService} from "@token-ring/filesystem";
import {Registry} from "@token-ring/registry";

export const description = "Runs tests automatically after chat is complete";

export async function afterChatComplete(registry: Registry): Promise<void> {
	const chatService = registry.requireFirstServiceByType(ChatService);

	const filesystem = registry.requireFirstServiceByType(FileSystemService);
	if (filesystem.dirty) {
		const testingServices = registry.services.getServicesByType(TestingService);
		for (const testingService of testingServices) {
			// Run all tests for this testing service
			const testResults = await testingService.runTests({}, registry);
			
			// Output results
			for (const [name, result] of Object.entries(testResults)) {
				if (result.passed) {
					chatService.infoLine(`Test ${name} passed.`);
				} else {
					chatService.errorLine(
						`Test ${name} failed, result: \n${result.output}`,
					);
				}
			}
		}
	}
}