import chalk from "chalk";
import ChatService from "@token-ring/chat/ChatService";
import TestingService from "../TestingService.js";
import TestingResource from "../TestingResource.js";
import { execute as runChat } from "@token-ring/ai-client/runChat";
import { ChatMessageStorage } from "@token-ring/ai-client";

export const description =
	"/repair [test_name|all] - Run tests and automatically fix failing ones using AI. Shows available tests if name is omitted.";

export async function execute(remainder, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const chatMessageStorage =
		registry.requireFirstServiceByType(ChatMessageStorage);
	const testingService = registry.requireFirstServiceByType(TestingService);

	let names;
	if (remainder && remainder.trim() !== "all") {
		names = remainder.split(/\s+/);
	}

	const testResults = await testingService.runTests({ names }, registry);

	names ??= Object.keys(testResults);

	const currentMessage = chatMessageStorage.getCurrentMessage();

	for (const name of names) {
		const result = testResults[name];
		if (result.passed) {
			chatService.systemLine(`${name}: PASSED`);
		} else {
			chatService.errorLine(`${name}: FAILED`);
			chatService.errorLine(result.output);

			// Execute runChat for failed test
			chatService.infoLine(`${name}: Running AI repair...`);

			const repairPrompt = `Test "${name}" has failed. Please analyze the test failure and fix the issue.

Test Output:
${result.output || result.error?.message || "No output available"}

Instructions:
1. Analyze the test failure carefully
2. Identify the root cause of the failure
3. Implement the necessary fixes to make the test pass
4. Ensure your changes don't break other functionality
5. Provide a clear explanation of what was fixed

Please fix this test failure.`;

			try {
				chatMessageStorage.setCurrentMessage(null);

				const [output, response] = await runChat(
					{
						input: repairPrompt,
						systemPrompt:
							"You are an expert developer assistant. Fix the failing test by analyzing the error and implementing the necessary code changes.",
						model: "auto:intelligence>=2",
					},
					registry,
				);

				chatService.systemLine(`${name}: AI repair completed`);
			} catch (error) {
				chatService.errorLine(`${name}: AI repair failed - ${error.message}`);
			}
		}
	}

	chatMessageStorage.setCurrentMessage(currentMessage);
}

export function help() {
	return [
		"/repair [test_name|all]",
		"  - With no arguments: Shows available tests",
		"  - With test_name: Run specific test and repair if it fails",
		"  - With 'all': Run all available tests and repair any failures",
	];
}
