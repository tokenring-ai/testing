import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {ChatService} from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import type {TestResult as ResourceTestResult} from "../TestingResource.js";
import TestingService from "../TestingService.js";

const description =
  "/repair - Run tests and automatically fix failing ones using AI. Shows available tests if name is omitted.";

async function execute(remainder: string | undefined, agent: Agent) {
  if (!remainder?.trim()) {
    const testingService = agent.requireServiceByType(TestingService);

    const tests = Array.from(testingService.getActiveResourceNames());
    const testNames = Object.keys(tests);

    if (testNames.length === 0) {
      agent.infoLine("No tests available");
    } else {
      agent.infoLine("Available tests:");
      for (const testName of testNames) {
        agent.infoLine(`  ${testName}`);
      }
    }
    return;
  }

  const chatService = agent.requireServiceByType(ChatService);
  const testingService = agent.requireServiceByType(TestingService);

  let modifyOption: "code" | "test" | "either" = "either";
  let testArgs = remainder;

  if (remainder.includes("--modify")) {
    const parts = remainder.split(/\s+/);
    const modifyIndex = parts.findIndex((part) => part === "--modify");

    if (modifyIndex !== -1 && modifyIndex + 1 < parts.length) {
      const modifyValue = parts[modifyIndex + 1] as "code" | "test" | "either";
      if (["code", "test", "either"].includes(modifyValue)) {
        modifyOption = modifyValue;
        parts.splice(modifyIndex, 2);
        testArgs = parts.join(" ");
      } else {
        throw new Error("Invalid --modify option. Use: code, test, or either");
      }
    } else {
      throw new Error(
        "--modify option requires a value: code, test, or either",
      );
    }
  }

  let names: string[] | undefined;
  if (testArgs && testArgs.trim() !== "all") {
    names = testArgs.split(/\s+/).filter((name) => name.length > 0);
  }

  const testResults = await testingService.runTests({names}, agent);

  names ??= Object.keys(testResults);

  const checkpoint = agent.generateCheckpoint();

  for (const name of names) {
    const result = testResults[name];
    if (result.passed) {
      agent.infoLine(`${name}: PASSED`);
    } else {
      agent.errorLine(`${name}: FAILED`);
      if (result.output) agent.errorLine(result.output);

      agent.infoLine(`${name}: Running AI repair (modify: ${modifyOption})...`);

      const repairPrompt = getRepairPrompt(name, result, modifyOption);

      agent.reset(["chat", "history"]);

      const chatConfig = chatService.getChatConfig(agent);

      const [output, response] = await runChat(repairPrompt, chatConfig, agent);

      agent.infoLine(`${name}: AI repair completed`);
    }
  }

  agent.restoreCheckpoint(checkpoint);
}

function getRepairPrompt(
  testName: string,
  result: ResourceTestResult,
  modifyOption: "code" | "test" | "either",
) {
  const testOutput =
    result.output ??
    (typeof result.error === "object" &&
    result.error &&
    "message" in result.error
      ? (result.error as { message: string }).message
      : undefined) ??
    "No output available";

  switch (modifyOption) {
    case "code":
      return `Test "${testName}" has failed. Please analyze the test failure and fix the underlying code to make the tests pass. Only fix the underlying code, do not update the tests themselves.

Test Output:
${testOutput}`;

    case "test":
      return `Test "${testName}" has failed. Please analyze the test failure and fix the test code itself to make it pass. Only update the test code, do not modify the underlying implementation.

Test Output:
${testOutput}`;

    case "either":
    default:
      return `Test "${testName}" has failed. Please analyze the test failure and determine whether to fix the underlying code or the test itself to resolve the failure. Choose the most appropriate approach based on the failure analysis.

Test Output:
${testOutput}`;
  }
}

const help: string = `# /repair [--modify code|test|either] [test_name|all]

## Description

Run tests and automatically repair failing ones using AI assistance. Tests are executed first, and any failing tests are automatically analyzed and fixed by an AI agent based on the specified repair mode.

## Usage

/repair                                    - Show available tests
/repair <test_name>                       - Test and repair specific test
/repair test1 test2                       - Test and repair multiple tests
/repair all                               - Test and repair all tests
/repair --modify code <test_name>         - Only repair underlying code
/repair --modify test <test_name>         - Only repair test code
/repair --modify either <test_name>       - AI chooses repair approach

## Options

- **--modify code** - AI only modifies the underlying implementation code to make tests pass (default when unspecified)
- **--modify test** - AI only modifies the test code itself to fix failures
- **--modify either** - AI determines whether to fix code or tests based on the failure analysis (most flexible)

## Examples

/repair                    - List all available tests
/repair userAuth           - Test and repair 'userAuth' test
/repair --modify code userAuth - Only fix the underlying code for userAuth
/repair --modify test userAuth - Only fix the userAuth test code
/repair all                - Test and repair all available tests
/repair --modify either payment auth - Test and repair multiple tests

## Repair Modes

- **code**: Focuses on fixing the actual implementation that's being tested
- **test**: Focuses on fixing the test logic or assertions
- **either**: AI intelligently chooses the best approach based on failure

## Output

- **PASSED**: Test completed successfully without repair needed
- **FAILED**: Test failed, AI repair attempted and completed
- Shows detailed test output before repair and status after repair`;
export default {
  description,
  execute,
  help,
} as TokenRingAgentCommand