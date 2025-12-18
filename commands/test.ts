import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TestingService from "../TestingService.js";

const description =
  "/test - Run all or a specific test from any TestingService. Shows available tests if name is omitted.";

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

const help: string = `# /test [test_name|all]

## Description

Run tests from the TestingService. Displays available tests when no arguments are provided, runs specific tests when test names are given, or runs all tests when 'all' is specified.

## Usage

/test                    - Show available tests
/test <test_name>        - Run a specific test
/test test1 test2        - Run multiple specific tests
/test all                - Run all available tests

## Examples

/test                    - Lists all available tests
/test userAuth           - Run the 'userAuth' test
/test userAuth payment   - Run both 'userAuth' and 'payment' tests
/test all                - Execute every available test

## Output

- **PASSED**: Test completed successfully
- **FAILED**: Test failed with error output shown`;
export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand

