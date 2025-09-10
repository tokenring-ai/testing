import Agent from "@tokenring-ai/agent/Agent";
import {ChatMessageStorage} from "@tokenring-ai/ai-client";
import runChat from "@tokenring-ai/ai-client/runChat";
import type {TestResult as ResourceTestResult} from "../TestingResource.js";
import TestingService from "../TestingService.js";

export const description =
  "/repair [--modify code|test|either] [test_name|all] - Run tests and automatically fix failing ones using AI. Shows available tests if name is omitted.";

export async function execute(remainder: string | undefined, agent: Agent) {
  if (!remainder?.trim()) {
    const testingService = agent.requireFirstServiceByType(TestingService);

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

  const chatMessageStorage =
    agent.requireFirstServiceByType(ChatMessageStorage);
  const testingService = agent.requireFirstServiceByType(TestingService);

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

  const currentMessage = chatMessageStorage.getCurrentMessage();

  for (const name of names) {
    const result = testResults[name];
    if (result.passed) {
      agent.infoLine(`${name}: PASSED`);
    } else {
      agent.errorLine(`${name}: FAILED`);
      if (result.output) agent.errorLine(result.output);

      agent.infoLine(
        `${name}: Running AI repair (modify: ${modifyOption})...`,
      );

      const repairPrompt = getRepairPrompt(name, result, modifyOption);

      chatMessageStorage.setCurrentMessage(null);

      const [output, response] = await runChat(
        {
          input: repairPrompt,
        },
        agent,
      );

      agent.infoLine(`${name}: AI repair completed`);

    }
  }

  chatMessageStorage.setCurrentMessage(currentMessage);
}

function getRepairPrompt(
  testName: string,
  result: ResourceTestResult,
  modifyOption: "code" | "test" | "either",
) {
  const testOutput =
    result.output ??
    (typeof result.error === "object" && result.error && "message" in result.error
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

// noinspection JSUnusedGlobalSymbols
export function help() {
  return [
    "/repair [--modify code|test|either] [test_name|all]",
    "  --modify code: Only repair the underlying code",
    "  --modify test: Only repair the test code itself",
    "  --modify either: Let AI decide whether to repair code or tests (default)",
    "  - With no test arguments: Shows available tests",
    "  - With test_name: Run specific test and repair if it fails",
    "  - With 'all': Run all available tests and repair any failures",
  ];
}