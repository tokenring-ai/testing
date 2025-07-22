import chalk from "chalk";
import ChatService from "@token-ring/chat/ChatService";
import TestingService from "../TestingService.js";
import TestingResource from "../TestingResource.js";

export const description =
	"/test [test_name|all] - Run all or a specific test from any TestingService. Shows available tests if name is omitted.";

export async function execute(remainder, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);

	const testingService = registry.requireFirstServiceByType(TestingService);

	let names;
	if (remainder && remainder.trim() !== "all") {
		names = remainder.split(/\s+/);
	}

	const testResults = await testingService.runTests({ names }, registry);

	names ??= Object.keys(testResults);

	for (const name of names) {
		const result = testResults[name];
		if (result.passed) {
			chatService.systemLine(`${name}: PASSED`);
		} else {
			chatService.errorLine(`${name}: FAILED`);
			chatService.errorLine(result.output);
		}
	}
}

export function help() {
	return [
		"/test [test_name|all]",
		"  - With no arguments: Shows available tests",
		"  - With test_name: Run specific test",
		"  - With 'all': Run all available tests",
	];
}
