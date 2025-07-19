import chalk from "chalk";
import ChatService from "@token-ring/chat/ChatService";
import TestingService from "../TestingService.js";

export const description =
	"/test [test_name|all] - Run all or a specific test from any TestingService. Shows available tests if name is omitted.";

export async function execute(remainder, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);

	const testingServices = registry.requireFirstServiceByType(TestingService);

	// Collect all available tests from all registry
	const availableTests = new Map(); // Map<testName, {context, test}>
	for (const context of testingServices) {
		const tests = context.getTests();
		Object.entries(tests).forEach(([name, test]) => {
			availableTests.set(name, { context, test });
		});
	}

	if (availableTests.size === 0) {
		chatService.errorLine("No tests available in any TestingService.");
		return;
	}

	let toRun = [];
	if (!remainder || remainder.trim() === "all") {
		toRun = Array.from(availableTests.keys());
	} else {
		const testName = Array.from(availableTests.keys()).find(
			(k) => k.toLowerCase() === remainder.trim().toLowerCase(),
		);
		if (!testName) {
			chatService.errorLine("Test not found: " + remainder);
			chatService.systemLine(
				"Available tests: " + Array.from(availableTests.keys()).join(", "),
			);
			return;
		}
		toRun = [testName];
	}

	// Group test results by context
	const contextResults = new Map(); // Map<TestingService, Array<result>>

	for (const testName of toRun) {
		chatService.systemLine(chalk.magentaBright(`Running test: ${testName}`));
		const { context, test } = availableTests.get(testName);

		try {
			const testResult = await context.runTest(testName, registry);
			if (!contextResults.has(context)) {
				contextResults.set(context, []);
			}
			contextResults.get(context).push(testResult);

			if (testResult.passed) {
				chatService.systemLine(`${testName}: PASSED`);
			} else {
				chatService.errorLine(`${testName}: FAILED`);
				chatService.errorLine(testResult.output);
			}
		} catch (error) {
			const result = { name: testName, passed: false, error: error.message };
			if (!contextResults.has(context)) {
				contextResults.set(context, []);
			}
			contextResults.get(context).push(result);
			chatService.errorLine(`${testName}: FAILED`);
			chatService.errorLine(error.message);
		}
	}

	// Set results for each context
	for (const [context, results] of contextResults) {
		context.setTestResults(results);
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
