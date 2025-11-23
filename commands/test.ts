import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TestingService from "../TestingService.js";

const description =
  "/test [test_name|all] - Run all or a specific test from any TestingService. Shows available tests if name is omitted.";

async function execute(remainder: string | undefined, agent: Agent) {
  const testingService = agent.requireServiceByType(TestingService);

  const trimmed = remainder?.trim();

  // No arguments: list available tests
  if (!trimmed) {
    const available = Array.from(testingService.getActiveResourceNames());
    if (available.length === 0) {
      agent.infoLine("No tests available.");
    } else {
      agent.infoLine("Available tests: " + available.join(", "));
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

  const testResults = await testingService.runTests({names}, agent);

  // Output results for requested tests (or all if 'all')
  const outputNames = names ?? Object.keys(testResults);
  for (const name of outputNames) {
    const result = testResults[name];
    if (!result) continue; // unknown test name
    if (result.passed) {
      agent.infoLine(`${name}: PASSED`);
    } else {
      agent.errorLine(`${name}: FAILED`);
      if (result.output) agent.errorLine(result.output);
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
export default {
  description,
  execute,
  help,
} as TokenRingAgentCommand