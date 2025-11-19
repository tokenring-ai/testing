# Testing Package Documentation

## Overview

The `@tokenring-ai/testing` package provides a comprehensive testing framework for AI agents within the TokenRing AI
ecosystem. It enables automated and manual testing of codebases, integration with shell commands for executing tests,
AI-assisted code repair for failing tests, and hooks for seamless integration into agent workflows. The package is
designed to ensure code reliability by running tests after file modifications and automatically queuing repairs when
failures occur.

Key features include:

- **Testing Resources**: Pluggable components for defining and running tests (e.g., shell commands).
- **Service Layer**: A central `TestingService` to manage and execute tests across resources.
- **Chat Commands**: Interactive `/test` and `/repair` commands for manual control.
- **Automation Hooks**: Automatic test execution and repair queuing post-chat or post-modification.
- **Repair Agent**: An AI agent specialized in diagnosing and fixing test failures.

This package plays a crucial role in maintaining codebase integrity during AI-driven development sessions.

## Installation/Setup

This package is part of the TokenRing AI monorepo. To use it:

1. Ensure you have Node.js (v18+) and npm/yarn installed.
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
3. Build the TypeScript code:
   ```
   npm run build
   ```
   (Assumes a build script in `package.json` compiling to `dist/`.)
4. In your agent application, import and register the package:
   ```typescript
   import { packageInfo } from '@tokenring-ai/testing';
   // Register with your TokenRing agent/team setup
   ```
5. Enable the package in your agent config to activate chat commands, hooks, and agents.

Dependencies are managed via `package.json` and include `@tokenring-ai/agent`, `@tokenring-ai/filesystem`, etc. No
additional external setup is required beyond the monorepo.

## Package Structure

The package is organized as follows:

```
pkg/testing/
├── index.ts                 # Main exports and package info
├── TestingService.ts        # Core service for managing tests
├── TestingResource.ts       # Abstract base for test resources
├── ShellCommandTestingResource.ts  # Example resource for shell-based tests
├── agents/
│   └── repair.ts            # AI agent config for code repair
├── hooks/
│   ├── autoTest.ts          # Hook to run tests after chat completion
│   └── autoRepair.ts        # Hook to queue repairs after test failures
├── commands/
│   ├── test.ts              # /test chat command
│   └── repair.ts            # /repair chat command
├── package.json             # Package metadata
├── tsconfig.json            # TypeScript configuration
├── README.md                # This documentation
└── LICENSE                  # License file
```

## Core Components

### TestingService

The `TestingService` is the central hub for test execution. It registers pluggable `TestingResource` instances and runs
tests on demand.

- **Key Methods**:
 - `registerResource(resource: TestingResource, name: string)`: Registers a testing resource.
 - `runTests({ names?: string[] }, agent: Agent): Promise<Record<string, TestResult>>`: Runs specified (or all active)
   tests, returning results.
  - `names`: Array of resource names to test; omit for all.
  - Returns: Object mapping resource names to `TestResult` (with `passed`, `name`, `details`).
 - `getLatestTestResults(): Record<string, TestResult>`: Retrieves the most recent results.
 - `allTestsPassed(agent: Agent): boolean`: Checks if all active tests passed based on latest results.
 - `enableResources(names: string[])`: Activates specific resources.
 - `getAvailableResources(): string[]`: Lists all registered resources.

Resources are managed via a `KeyedRegistryWithMultipleSelection`, allowing selective enabling.

### TestingResource (Abstract)

Base class for defining custom test implementations.

- **Key Methods**:
 - `runTest(agent: Agent): Promise<TestResult>`: Executes the test and returns a result.
  - `TestResult`: `{ startedAt: Date, finishedAt: Date, passed: boolean, output?: string, error?: unknown }`.
 - `_runTest(agent: Agent): Promise<string>`: Abstract method to implement test logic (throws if not overridden).
 - `getLatestTestResult(): TestResult | undefined`: Gets the last run result.

Subclasses must implement `_runTest` to perform the actual testing.

### ShellCommandTestingResource

A concrete implementation that runs shell commands as tests.

- **Constructor Options**:
  ```typescript
  interface ShellCommandTestingResourceOptions {
    name: string;
    description?: string;
    workingDirectory?: string;
    command: string;
    timeoutSeconds?: number;  // Default: 60
  }
  ```

- **Key Behavior**:
 - Uses `@tokenring-ai/filesystem/tools/runShellCommand` to execute the command.
 - Passes if `ok: true`; throws error with stdout/stderr on failure.
 - Example:
   ```typescript
   import ShellCommandTestingResource from './ShellCommandTestingResource';
   const resource = new ShellCommandTestingResource({
     name: 'npm-test',
     command: 'npm test',
     workingDirectory: './project',
     timeoutSeconds: 120
   });
   testingService.registerResource(resource, 'npm-test');
   ```

### Chat Commands

- **/test [test_name|all]**:
 - Lists available tests if no args.
 - Runs specific tests or all, reporting pass/fail.
 - Example: `/test npm-test` or `/test all`.

- **/repair [--modify code|test|either] [test_name|all]**:
 - Runs tests, then uses AI to repair failures.
 - `--modify` specifies what to fix: `code` (fix implementation), `test` (fix test), `either` (AI decides, default).
 - Enqueues AI chat with repair prompt including test output.
 - Example: `/repair --modify code all`.

### Hooks

- **autoTest (afterChatComplete)**:
 - Triggers after agent chat if filesystem is dirty.
 - Runs all tests across services and logs pass/fail.

- **autoRepair (afterTesting)**:
 - Triggers after testing if filesystem dirty and failures exist.
 - Enqueues repair tasks to `WorkQueueService` with checkpoint and failure details.

### Repair Agent

An AI agent config for autonomous code repair.

- **Config**:
  ```typescript
  {
    name: "Code Repair",
    description: "A code repair bot that auto-repairs code",
    visual: { color: "green" },
    ai: {
      systemPrompt: "You are a code repairing developer assistant... [full prompt for analyzing failures]",
      temperature: 0.7,
      topP: 0.8
    },
    initialCommands: ["/tools enable @tokenring-ai/filesystem/*"]
  }
  ```
- Activated via work queue or manually; uses tools to inspect/fix code based on test failures.

## Usage Examples

1. **Registering and Running a Shell Test**:
   ```typescript
   import TestingService from '@tokenring-ai/testing/TestingService';
   import ShellCommandTestingResource from '@tokenring-ai/testing/ShellCommandTestingResource';
   import { Agent } from '@tokenring-ai/agent';

   const testingService = new TestingService();
   const shellResource = new ShellCommandTestingResource({
     name: 'build-test',
     command: 'npm run build',
   });
   testingService.registerResource(shellResource, 'build-test');
   testingService.enableResources(['build-test']);

   const agent = new Agent(/* config */);
   const results = await testingService.runTests({}, agent);
   console.log(results['build-test'].passed ? 'Build passed!' : 'Build failed');
   ```

2. **Using Chat Command for Interactive Testing**:
   In agent chat: `/test all` – Runs all enabled tests and displays results.

3. **Auto-Repair Workflow**:
   After file changes in chat, hooks automatically test. If failures:
   ```typescript
   // In agent setup, ensure hooks are enabled
   // Failures trigger /repair-like AI session via queue
   ```

## Configuration Options

- **Resource Registration**: Enable via `enableResources(names: string[])` in `TestingService`.
- **Shell Commands**: Customize `command`, `workingDirectory`, `timeoutSeconds` per resource.
- **Repair Mode**: Use `--modify` flag in `/repair` to control fix target.
- **Hooks**: Enabled by default in package; customize prompts in agent configs.
- **Environment Variables**: None specific; relies on agent-level configs (e.g., AI model via
  `@tokenring-ai/ai-client`).

## API Reference

- **TestingService**:
 - `runTests(options: {names?: string[]}, agent: Agent): Promise<Record<string, TestResult>>`
 - `getLatestTestResults(): Record<string, TestResult>`
 - `allTestsPassed(agent: Agent): boolean`
 - `registerResource(resource: TestingResource, name: string): void`

- **TestingResource**:
 - `runTest(agent: Agent): Promise<TestResult>`

- **ShellCommandTestingResource**:
 - Constructor: `new ShellCommandTestingResource(options: ShellCommandTestingResourceOptions)`

- **Chat Commands**:
 - `execute(remainder: string, agent: Agent): Promise<void>` (internal)

- **Hooks**:
 - `afterChatComplete(agent: Agent): Promise<void>` (autoTest)
 - `afterTesting(agent: Agent): Promise<void>` (autoRepair)

- **Repair Agent Config**: `AgentConfig` object as exported.

## Dependencies

- `@tokenring-ai/agent`: Core agent framework.
- `@tokenring-ai/filesystem`: File operations and shell execution.
- `@tokenring-ai/utility`: Registry utilities.
- `@tokenring-ai/ai-client`: AI chat and service integration.
- `@tokenring-ai/queue`: Work queue for repair tasks.

## Contributing/Notes

- **Testing the Package**: Use the provided shell resources to test your own code; extend `TestingResource` for custom
  tests (e.g., unit tests via Jest API).
- **Building**: Run `npm run build` to compile TS to JS.
- **Known Limitations**:
 - Shell tests assume Unix-like environment; Windows may need adjustments.
 - AI repairs depend on model quality; always review changes.
 - Auto-repair enqueues tasks but does not execute them immediately—monitor the work queue.
- Contributions: Fork the repo, add features (e.g., new resources), and submit PRs. Focus on extensibility for diverse
  testing needs.

For issues or extensions, refer to the TokenRing AI documentation.