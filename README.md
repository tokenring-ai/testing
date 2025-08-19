@token-ring/testing

Overview

- @token-ring/testing provides a lightweight testing layer for the Token Ring ecosystem. It introduces a TestingService
  that discovers and runs tests exposed by resources, a base TestingResource to implement custom tests, a
  ShellCommandTestingResource for command-based checks, and chat commands to run and automatically repair failing tests.

What this package offers

- Service: TestingService
- Discovers resources that extend TestingResource and orchestrates running their tests.
- Logs progress/results via the ChatService.
- Stores the latest results and can report whether all tests have passed.
- Base class: TestingResource (abstract)
- Implements the test lifecycle and result recording; subclasses implement _runTest(registry) and return output or
  throw on failure.
- Resource: ShellCommandTestingResource
- Runs a shell command as a test with configurable workingDirectory, command, timeoutSeconds, and env.
- Uses @token-ring/filesystem/tools/runShellCommand under the hood.
- Chat commands
- /test [test_name|all] — Run all or selected tests and report results.
- /repair [--modify code|test|either] [test_name|all] — Run tests and use AI to attempt automatic fixes for failures.

Exports

- index.ts
- TestingService
- ShellCommandTestingResource
- chatCommands (namespace; provides commands.test and commands.repair)
- name, description, version

Core Concepts

1) TestingService

- Type: Service
- Responsibilities:
- getTests(registry): returns a map of discovered TestingResource instances keyed by name.
- runTests({ names? }, registry): runs tests for all discovered resources or only the specified subset. Integrates with
  ChatService for progress output and returns a map of TestResult objects.
- getLatestTestResults(): returns the last recorded results per resource.
- allTestsPassed(registry): convenience method to check if all discovered tests passed according to the latest run.

2) TestingResource (abstract)

- Type: Resource
- Responsibilities:
- _runTest(registry): to be implemented by subclasses; should return a string (output) when passing, or throw to
  indicate failure.
- runTest(registry): wraps _runTest, records timing, pass/fail, output or error, and returns the final TestResult.
- getLatestTestResult(): returns the most recent TestResult for this resource instance.
- TestResult shape:
  {
  startedAt: Date;
  finishedAt: Date;
  passed: boolean;
  output?: string;
  error?: unknown;
  }

3) ShellCommandTestingResource

- Purpose: Execute a shell command as a test and pass if it exits successfully.
- Constructor parameters (selected):
- workingDirectory?: string — directory to run in
- command: string — command to execute
- timeoutSeconds?: number — default 60
- env?: Record<string, string | undefined> — environment variables
- Behavior: Delegates to runShellCommand({ command, timeoutSeconds, env, workingDirectory }) and treats ok=true as pass;
  otherwise throws with details.

Chat Commands

1) /test [test_name|all]

- With no arguments: lists available tests.
- With one or more names: runs those tests.
- With "all": runs every discovered test.

2) /repair [--modify code|test|either] [test_name|all]

- Runs tests like /test. For any failure, invokes the AI client with the "repair" persona to attempt a fix.
- --modify controls what the AI is allowed to change:
- code: only fix underlying implementation code
- test: only fix the test itself
- either: AI chooses (default)

Usage Examples

1) Create a custom test by subclassing TestingResource

import { Registry } from "@token-ring/registry";
import TestingResource from "@token-ring/testing/TestingResource";

class APingTest extends TestingResource {
name = "api:ping";
description = "Ensure the /ping endpoint responds with 200";

async _runTest(registry: Registry): Promise<string> {
// perform your check; throw to indicate failure
const res = await fetch("http://localhost:3000/ping");
if (!res.ok) throw new Error(`/ping returned ${res.status}`);
return "Ping OK";
}
}

// Register your resource with the registry used by your app/runtime
// registry.registerResource(new APingTest({ ...optionalBaseProps }));

2) Use ShellCommandTestingResource

import ShellCommandTestingResource from "@token-ring/testing/ShellCommandTestingResource";

const lintTest = new ShellCommandTestingResource({
name: "lint",
description: "Codebase should be lint-clean",
workingDirectory: process.cwd(),
command: "npm run lint",
timeoutSeconds: 120,
});

// registry.registerResource(lintTest);

3) Programmatically run tests via TestingService

import { TestingService } from "@token-ring/testing";

const testingService = new TestingService();
// registry.registerService(testingService);
// await testingService.runTests({ names: ["lint", "api:ping"] }, registry);
// const allGood = testingService.allTestsPassed(registry);

Installation

- This package is part of the Token Ring monorepo and is typically consumed by the runtime.
- If needed directly, add dependency: "@token-ring/testing": "0.1.0".
- Ensure peer packages are available in your workspace: @token-ring/registry and @token-ring/chat. For /repair,
  @token-ring/ai-client must be configured (including a suitable persona named "repair").

Notes

- Naming: Give each TestingResource a stable, unique name so it can be targeted via /test <name> or /repair <name>.
- Output: For failures, TestingResource.runTest captures the thrown error and timestamps to aid debugging.
- Security: /repair executes AI-driven changes according to your configured AI client and personas. Review changes as
  needed in your environment.

License

- MIT (same as the repository license).
