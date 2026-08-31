# @tokenring-ai/testing

Automated test execution with AI-powered "auto-repair" for fixing broken code.

## Overview

The `@tokenring-ai/testing` package provides a testing framework for AI agents within the TokenRing
ecosystem. It enables automated and manual testing of codebases through pluggable testing resources,
with seamless integration into agent workflows.

The package integrates shell command execution for running tests and includes automation hooks for
triggering tests after agent input when files are modified. When tests fail, the system can offer
automatic repair suggestions based on the error output.

### Key Features

- **Testing Resources**: Pluggable components for defining and running tests (shell commands, custom resources)
- **TestingService**: Central service for managing and executing tests across all registered resources
- **Chat Commands**: Interactive `/test list` and `/test run` commands for manual control
- **Automation Hooks**: Automatic test execution after agent input when files are modified
- **Configuration-Based Setup**: Declarative resource configuration through the plugin system using Zod schemas
- **State Management**: Persistent state for test results and repair counts with checkpoint support
- **Auto-Repair Workflow**: Automatic error detection with user-confirmable repair suggestions when tests fail
- **Pattern-Based Test Selection**: Run specific tests or patterns (e.g., `/test run build*`)
- **Output Cropping**: Configurable output limits to prevent excessive console output
- **Timeout Handling**: Configurable timeouts for test execution

## Installation

```bash
bun add @tokenring-ai/testing
```

```typescript
import TokenRingApp from "@tokenring-ai/app";
import PluginManager from "@tokenring-ai/app/PluginManager";
import testingPlugin from "@tokenring-ai/testing/plugin";

const app = new TokenRingApp({ app: { workingDirectory, workspaceDirectory, configDirectories } });
const pluginManager = app.addService(new PluginManager(app));
await pluginManager.installPlugins([testingPlugin]);
```

This automatically registers:

- `TestingService` with the application via `app.addService(new TestingService())`
- Chat commands (`test list`, `test run`) with `AgentCommandService`
- Hooks (`autoTest`) with `AgentLifecycleService`

## Chat Commands

| Command | Description |
|---------|-------------|
| `test list` | List available tests |
| `test run [pattern]` | Run tests |

### `test list`

Lists all available test resources. Takes no arguments.

**Output:** A markdown list of available test names, or `No tests available.` if no resources are
registered.

### `test run`

Runs tests matching the given pattern. If tests fail, the agent may offer to automatically repair
the issues.

**Positional arguments:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `pattern` | no | `*` | Test name or pattern to match |

**Examples:**

```bash
/test list              # Lists all available tests
/test run               # Run all tests (pattern defaults to '*')
/test run build-test    # Run the 'build-test' resource
/test run unit*         # Run all tests matching 'unit*' pattern
```

**Output:** For each test, one of the following status lines is emitted:

- `PASSED` -- test completed successfully
- `FAILED` -- test failed with error output
- `TIMEOUT` -- test exceeded the configured timeout limit
- `ERROR` -- test encountered an unexpected error

If all tests pass, the repair counter is reset and a success message is shown. If tests fail, the
service checks whether the agent's `repairCount` has reached `maxAutoRepairs`; if so, it resets the
counter and declines to repair. Otherwise, it either auto-repairs (without asking) or prompts the
user via `agent.askForApproval()` to confirm repair. On confirmation, the failure report is sent to
the agent via `agent.handleInput()` for automatic repair.

## Tools

This package does not define any tools.

## Scripting Functions

This package does not register any scripting functions.

## Configuration

```yaml
testing:
  agentDefaults:
    maxAutoRepairs: 1
  resources:
    build-test:
      type: shell
      name: build-test
      command: bun run build
      workingDirectory: ./project
      timeoutSeconds: 120
    unit-tests:
      type: shell
      name: unit-tests
      command: bun test
      workingDirectory: ./project
```

### Service Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `agentDefaults` | `object` | no | `{}` | Agent-level defaults applied during `attach` |
| `agentDefaults.maxAutoRepairs` | `number` | no | `1` | Number of times an agent will automatically retry fixing a failing test before giving up |
| `resources` | `Record<string, { type: string }>` | no | `{}` | Named test resources (e.g. shell commands), keyed by name |

### Shell Resource Configuration

Each entry in `resources` with `type: "shell"` is validated against `shellCommandTestingConfigSchema`:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"shell"` | yes | --- | Resource type discriminator |
| `name` | `string` | yes | --- | Name shown for this test resource |
| `description` | `string` | no | --- | What this test checks |
| `workingDirectory` | `string` | no | --- | Directory the command runs in |
| `command` | `string` | yes | --- | Shell command that runs the test |
| `isolation` | `"sandbox" \| "none"` | no | `"sandbox"` | Whether the command runs inside the sandbox |
| `timeoutSeconds` | `number` | no | `120` | Kill the command if it runs longer than this (seconds) |
| `cropOutput` | `number` | no | `10000` | Truncate command output beyond this length (characters) |

### Agent Configuration

Individual agents can override the service-level `agentDefaults` via an agent config slice keyed
under `testing`. The agent config is merged with service defaults using `deepClone` during
`TestingService.attach()`:

```typescript
// Agent-level configuration that merges with service defaults
const agentConfig = {
  testing: {
    maxAutoRepairs: 10
  }
};
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `maxAutoRepairs` | `number` | no | --- | Overrides the service-level `agentDefaults.maxAutoRepairs` for this agent |

### Schema Metadata

The following `.meta()` annotations are used for config UI integration:

**`TestingServiceConfigSchema`:**

| Field | Metadata |
|-------|----------|
| (root) | `label: "Testing"`, `description: "Test execution and auto-repair settings for agents"` |
| `agentDefaults` | `label: "Agent Defaults"` |
| `agentDefaults.maxAutoRepairs` | `description: "Number of times an agent will automatically retry fixing a failing test before giving up"` |
| `resources` | `label: "Resources"`, `description: "Named test resources (e.g. shell commands), keyed by name"` |

**`shellCommandTestingConfigSchema`:**

| Field | Metadata |
|-------|----------|
| `name` | `description: "Name shown for this test resource"` |
| `description` | `description: "What this test checks"` |
| `workingDirectory` | `description: "Directory the command runs in"` |
| `command` | `description: "Shell command that runs the test"` |
| `isolation` | `advanced: true`, `description: "Whether the command runs inside the sandbox"` |
| `timeoutSeconds` | `unit: "s"`, `advanced: true`, `description: "Kill the command if it runs longer than this"` |
| `cropOutput` | `unit: "chars"`, `advanced: true`, `description: "Truncate command output beyond this length"` |

## Core Components

### TestingService

The central service for managing and executing tests across all registered resources.

**Implements:** `TokenRingService`

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Service name (`"TestingService"`) |
| `description` | `string` | Service description (`"Provides testing functionality"`) |

**Methods:**

| Method | Description |
|--------|-------------|
| `constructor(options?: TestingServiceConfig)` | Creates the service with optional initial configuration; calls `reconfigure(options)` if provided |
| `registerResource(name: string, resource: TestingResource): void` | Registers a testing resource under the given name (alias of `KeyedRegistry.set`) |
| `getAvailableResources(): string[]` | Returns an array of all registered resource names (alias of `KeyedRegistry.keysArray`) |
| `reconfigure(newConfig: TestingServiceConfig): void` | Reconciles registered resources against the new config using `KeyedRegistry.reconcileAgainst`; creates shell resources for `type: "shell"`, recreates resources whose config has changed, and updates internal options |
| `attach(agent: Agent): void` | Merges `agentDefaults` with the agent's `testing` config slice via `deepClone`, then initializes `TestingState` on the agent |
| `runTests(likeName: string, agent: Agent): Promise<void>` | Runs all tests matching `likeName` against the agent; reports results and handles auto-repair logic |
| `allTestsPassed(agent: Agent): boolean` | Returns `true` if all stored test results for the agent have `status: "passed"` (returns `true` vacuously when no results exist) |

**`runTests` behavior:**

1. Selects tests via `this.testRegistry.entriesLike(likeName)`. If none match, outputs a "no tests
   found" message and returns.
2. Runs each test inside `agent.busyWithActivity()`, storing results in a local record.
3. For each test, emits a status line: `PASSED`, `FAILED` (with output in a code block), `TIMEOUT`
   (with output in a code block), or `ERROR`.
4. After all tests, checks whether all passed. If so, resets `repairCount` to 0, outputs a success
   message, and returns.
5. If not all passed, consults `TestingState`: if `repairCount >= maxAutoRepairs`, resets
   `repairCount` to 0 and sets `shouldAutoRepair` to `false`. Otherwise, increments `repairCount`
   and sets `shouldAutoRepair` to `true`.
6. If `shouldAutoRepair` is `true`, proceeds to repair without asking. Otherwise, prompts the user
   via `agent.askForApproval()`. On confirmation, sends the failure report to the agent via
   `agent.handleInput()`. On rejection, resets `repairCount` to 0 and outputs a failure message.

### TestingResource Interface

Base interface for implementing custom test resources.

```typescript
interface TestingResource {
  description: string;
  runTest: (agent: Agent) => Promise<TestResult>;
}
```

### TestResult Type

```typescript
type TestResult =
  | { status: "passed"; startedAt: number; finishedAt: number; output?: string }
  | { status: "failed"; startedAt: number; finishedAt: number; output: string }
  | { status: "timeout"; startedAt: number; finishedAt: number; output: string }
  | { status: "error"; startedAt: number; finishedAt: number; error: string };
```

### ShellCommandTestingResource

Concrete implementation for running shell commands as tests.

**Implements:** `TestingResource`

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `description` | `string` | Resource description (`"Provides ShellCommandTesting functionality"`) |

**Methods:**

| Method | Description |
|--------|-------------|
| `constructor(options: z.output<typeof shellCommandTestingConfigSchema>)` | Creates the resource with the parsed shell command configuration |
| `runTest(agent: Agent): Promise<TestResult>` | Executes the shell command via `TerminalService.runScript()` and returns a `TestResult` |

**`runTest` behavior:**

1. Calls `terminal.runScript(command, { timeoutSeconds, workingDirectory, isolation }, agent)`.
2. On `success` status: returns `{ status: "passed", ... }` with output cropped to `cropOutput`
   characters, prefixed with `Running ${command} in ${workingDirectory}:`.
3. On `badExitCode` status: returns `{ status: "failed", ... }` with the same output format.
4. On `timeout` status: returns `{ status: "timeout", ... }` with the same output format.
5. Otherwise: returns `{ status: "error", ... }` with `error: bashResult.error`.

### TestingState

State slice for tracking test results and repair counts per agent.

**Extends:** `AgentStateSlice<typeof serializationSchema>`

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | State slice name (`"TestingState"`) |
| `testResults` | `Record<string, TestResult>` | Map of test name to most recent `TestResult` |
| `repairCount` | `number` | Number of auto-repair attempts made since last reset |
| `maxAutoRepairs` | `number` | Maximum auto-repair attempts before giving up (set from `agentDefaults` at construction) |
| `initialConfig` | `z.output<typeof TestingServiceConfigSchema>["agentDefaults"]` | Original agent defaults config |

**Methods:**

| Method | Description |
|--------|-------------|
| `constructor(initialConfig)` | Initializes the state slice with `maxAutoRepairs` from the provided config |
| `serialize(): z.output<typeof serializationSchema>` | Returns `{ testResults, repairCount, maxAutoRepairs }` for checkpointing |
| `deserialize(data: z.output<typeof serializationSchema>): void` | Restores state from serialized data |
| `show(): string` | Returns a formatted string listing test results and total repair count |

**Serialization schema:**

```typescript
const serializationSchema = z.object({
  testResults: z.record(z.string(), z.any()),
  repairCount: z.number(),
  maxAutoRepairs: z.number(),
});
```

### AfterTestsPassed

A hook event class exported from `hooks.ts` representing a "tests passed" event. Defined but not
currently used in any hook callback registration within this package.

```typescript
export class AfterTestsPassed {
  readonly type = "hook";
}
```

## Services

### Service Registration

The plugin registers `TestingService` during `install`:

```typescript
import testingPlugin from "@tokenring-ai/testing/plugin";

// Via PluginManager.installPlugins([testingPlugin])
// install() does:
//   app.addService(new TestingService());
//   app.waitForService(AgentCommandService, svc => svc.addAgentCommands(agentCommands));
//   app.waitForService(AgentLifecycleService, svc => svc.addHooks(autoTest));
```

#### Plugin Lifecycle

| Property | Value |
|----------|-------|
| Name | `@tokenring-ai/testing` |
| Display Name | `Testing Framework` |
| Version | `0.2.0` |
| Description | `Automated test execution with AI-powered "auto-repair" for fixing broken code.` |
| Config Schema | `z.object({ testing: TestingServiceConfigSchema })` |

**`install(app)`:**

1. Creates a `TestingService` instance with no config (defaults applied) and registers it via
   `app.addService(new TestingService())`.
2. Waits for `AgentCommandService`, then registers `agentCommands` (the `test list` and `test run`
   commands) via `agentCommandService.addAgentCommands(agentCommands)`.
3. Waits for `AgentLifecycleService`, then registers the `autoTest` hook via
   `lifecycleService.addHooks(autoTest)`.

**`reconfigure(app, config)`:**

1. Calls `app.requireService(TestingService).reconfigure(config.testing)`, which reconciles the
   resource registry against the new configuration: creates new resources, recreates resources whose
   config has changed, and removes resources no longer present in config.

## Lifecycle Hooks

### autoTest

| Property | Value |
|----------|-------|
| Name | `autoTest` |
| Display Name | `Testing/Auto Test` |
| Description | `Runs tests automatically after chat is complete` |
| Trigger | `AfterAgentInputSuccess` |

**Behavior:**

1. Triggered after successful agent input handling.
2. Resolves `FileSystemService` and `TestingService` from the agent.
3. Checks if the filesystem has been modified via `filesystem.isDirty(agent)`.
4. If modified, emits an info message and runs all tests via `testingService.runTests("*", agent)`.

```typescript
import { AfterAgentInputSuccess, HookCallback } from "@tokenring-ai/lifecycle/util/hooks";

new HookCallback(AfterAgentInputSuccess, async (_data, agent) => {
  const filesystem = agent.requireService(FileSystemService);
  const testingService = agent.requireService(TestingService);

  if (filesystem.isDirty(agent)) {
    agent.infoMessage("Working Directory was updated, running test suite...");
    await testingService.runTests("*", agent);
  }
})
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@tokenring-ai/app` | Application framework and plugin system |
| `@tokenring-ai/agent` | Agent framework and command system |
| `@tokenring-ai/filesystem` | File system service for dirty detection |
| `@tokenring-ai/lifecycle` | Lifecycle and hook management |
| `@tokenring-ai/terminal` | Terminal service for shell command execution |
| `@tokenring-ai/utility` | Utility classes including `KeyedRegistry`, `deepClone`, `deepEqual`, `codeBlock`, `markdownList` |
| `zod` | Runtime type validation |

## Testing

```bash
bun test
```

The test commands are defined for future coverage; this package currently ships no `*.test.ts`
files.

## Package Structure

```text
plugin/testing/
├── commands.ts                       # Chat command exports
├── commands/
│   └── test/
│       ├── list.ts                   # test list subcommand
│       └── run.ts                    # test run subcommand
├── hooks.ts                          # AfterTestsPassed hook event class
├── hooks/
│   └── autoTest.ts                   # autoTest hook implementation
├── state/
│   └── testingState.ts               # TestingState class
├── TestingResource.ts                # TestingResource interface
├── ShellCommandTestingResource.ts    # Shell command test resource
├── TestingService.ts                 # Main testing service
├── schema.ts                         # Zod schemas for configuration
├── plugin.ts                         # Plugin registration
├── index.ts                          # Public exports (TestingService, ShellCommandTestingResource)
├── bun.config.ts                     # Bun test configuration
├── package.json                      # Dependencies and scripts
├── LICENSE                           # MIT License
└── README.md                         # This documentation
```

## License

MIT License — see LICENSE file for details.
