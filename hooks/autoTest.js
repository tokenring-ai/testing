import TestingService from "../TestingService.js";
import ChatService from "@token-ring/chat/ChatService";
import FileSystemService from "@token-ring/filesystem/FileSystemService";

export const description = "Runs tests automatically after chat is complete";

export async function afterChatComplete(registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);

	const filesystem = registry.requireFirstServiceByType(FileSystemService);
	if (filesystem.dirty) {
		const testingServices = registry.getServicesByType(TestingService);
		for (const testingService of testingServices) {
			const testResults = {};
			for (const test of testingService.getTests()) {
				chatService.infoLine(`Running test ${test.name}...`);

				const testResult = await testingService.runTest(test.name, registry);
				testResults[test.name] = testResult;

				if (testResult.passed) {
					chatService.infoLine(`Test ${test.name} passed.`);
				} else {
					chatService.errorLine(
						`Test ${test.name} failed, result: \n${testResult.output}`,
					);
				}
			}

			testingService.setTestResults(testResults);
		}
	}
}
