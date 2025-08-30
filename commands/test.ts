import ChatService from "@token-ring/chat/ChatService";
import {Registry} from "@token-ring/registry";
import TestingService from "../TestingService.js";

export const description =
  "/test [test_name|all] - Run all or a specific test from any TestingService. Shows available tests if name is omitted.";

export async function execute(remainder: string | undefined, registry: Registry) {
  const chatService = registry.requireFirstServiceByType(ChatService);
  const testingService = registry.requireFirstServiceByType(TestingService);

  const trimmed = remainder?.trim();

  // No arguments: list available tests
  if (!trimmed) {
    const available = Array.from(testingService.getActiveResourceNames());
    if (available.length === 0) {
      chatService.systemLine("No tests available.");
    } else {
      chatService.systemLine("Available tests: " + available.join(", "));
    }
    return;
  }

  // Determine which tests to run
  let names: string[] | undefined;
  if (trimmed === "all") {
    // Run all tests – leave names undefined to let runTests handle it
    names = undefined;
  } else {
    names = trimmed.split(/\s+/).filter((n) => n.length > 0);
  }

  const testResults = await testingService.runTests({names}, registry);

  // Output results for requested tests (or all if 'all')
  const outputNames = names ?? Object.keys(testResults);
  for (const name of outputNames) {
    const result = testResults[name];
    if (!result) continue; // unknown test name
    if (result.passed) {
      chatService.systemLine(`${name}: PASSED`);
    } else {
      chatService.errorLine(`${name}: FAILED`);
      chatService.errorLine(result.output);
    }
  }
}

// noinspection JSUnusedGlobalSymbols
export function help() {
  return [
    "/test [test_name|all]",
    "  - With no arguments: Shows available tests",
    "  - With test_name: Run specific test",
    "  - With 'all': Run all available tests",
  ];
}
