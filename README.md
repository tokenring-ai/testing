# @tokenring-ai/testing

A testing framework for AI agents within the TokenRing AI ecosystem that provides automated testing capabilities and seamless integration with agent workflows.

## Overview

The `@tokenring-ai/testing` package enables automated and manual testing of codebases. It integrates shell command execution for tests and includes automation hooks for seamless workflow integration.

### Key Features

- **Testing Resources**: Pluggable components for defining and running tests (shell commands, custom resources)
- **Service Layer**: Central `TestingService` for managing and executing tests across resources
- **Chat Commands**: Interactive `/test` command for manual control
- **Automation Hooks**: Automatic test execution after file modifications
- **Configuration-Based Setup**: Declarative resource configuration through plugin system
- **State Management**: Checkpoint-based state preservation during repair workflows

## Installation

This package is part of the TokenRing AI monorepo. To use it:

1. Ensure you have Node.js (v18+) and npm/yarn installed
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the TypeScript code:
   ```bash
   bun run build
   ```

### Package Integration

To integrate the testing package into your application, import the plugin and add it to your app:

```typescript
import testingPlugin from '@tokenring-ai/testing/plugin';
app.addPlugin(testingPlugin);
```

This registers all required services, commands, and hooks automatically.

## Configuration

The testing package uses a Zod-based configuration schema for declarative setup:

```typescript
import { TestingServiceConfigSchema } from '@tokenring-ai/testing';
import { z } from 'zod';

const TestingConfigSchema = TestingServiceConfigSchema.extend({
  // Optional custom configuration
});
```

### Resource Configuration

Configure testing resources through your application config:

```typescript
{
  "testing": {
    "agentDefaults": {
      "maxAutoRepairs": 5
    },
    "resources": {
      "build-test": {
        "type": "shell",
        "name": "build-test",
        "command": "bun run build",
        "workingDirectory": "./project",
        "timeoutSeconds": 120
      },
      "unit-tests": {
        "type": "shell",
        "name": "unit-tests",
        "command": "bun test",
        "workingDirectory": "./project"
      }
    }
  }
}
```

Note: The `name` field in resources is required and should match the resource name in the config key.

### Agent Configuration

Individual agents can override the default testing configuration:

```typescript
// Agent-level configuration that merges with service defaults
const agentConfig = {
  testing: {
    maxAutoRepairs: 10
  }
};
```

### Environment Variables

No specific environment variables required. The package integrates with your existing agent configuration and AI model setup through `@tokenring-ai/ai-client`.

## Core Components

### TestingService

The central service for managing and executing tests across all registered resources.

**Key Methods:**

- `registerResource(name: string, resource: TestingResource)`: Register a testing resource
- `getAvailableResources()`: Get all registered resource names (returns Iterable<string>)
- `runTests(likeName: string, agent: Agent)`: Execute tests matching the given pattern
- `allTestsPassed(agent: Agent): boolean`: Check if all tests passed for the given agent
- `attach(agent: Agent)`: Initialize agent state with testing configuration

**Example:**

```typescript
const testingService = agent.requireServiceByType(TestingService);
await testingService.runTests("*", agent);
const allPassed = testingService.allTestsPassed(agent);
if (allPassed) {
  agent.chatOutput("All tests passed!");
}
```

### TestingResource (Interface)

Base interface for implementing custom test resources.

**Interface Definition:**

```typescript
interface TestingResource {
  description: string;
  runTest: (agent: Agent) => Promise<TestResult>;
}
```

**Key Methods:**

- `runTest(agent: Agent): Promise<TestResult>`: Execute the test

**TestResult Interface:**

```typescript
interface TestResult {
  startedAt: number;
  finishedAt: number;
  passed: boolean;
  output?: string;
  error?: unknown;
}
```

### ShellCommandTestingResource

Concrete implementation for running shell commands as tests.

**Constructor Options:**

```typescript
interface ShellCommandTestingResourceOptions {
  type: "shell";
  name: string;
  description?: string;
  workingDirectory?: string;
  command: string;
  timeoutSeconds?: number;
}
```

**Example:**

```typescript
import ShellCommandTestingResource from '@tokenring-ai/testing/ShellCommandTestingResource';

const resource = new ShellCommandTestingResource({
  type: "shell",
  name: 'build-test',
  command: 'bun run build',
  workingDirectory: './project',
  timeoutSeconds: 120
});

testingService.registerResource('build-test', resource);
```

## Chat Commands

### /test Command

Run tests interactively through the chat interface.

**Usage:**

- `/test list` - Show available tests
- `/test run [test_name|*]` - Run specific tests or all tests (default when no argument provided)

**Examples:**

```bash
/test list                     # Lists all available tests
/test run build-test           # Run the 'build-test' resource
/test run                      # Execute every available test (default)
/test run userAuth             # Run the 'userAuth' test
```

**Output:**

- `PASSED`: Test completed successfully
- `FAILED`: Test failed; error details and repair options may be provided

## Automation Hooks

### autoTest Hook

Automatically runs tests after chat completion when files have been modified.

**Configuration:**

- **Name**: `autoTest`
- **Display Name**: `Testing/Auto Test`
- **Description**: "Runs tests automatically after chat is complete"

**Trigger:** `afterChatCompletion` hook event

**Condition:** Filesystem is dirty (file modifications detected via `filesystem.isDirty(agent)`)

**Behavior:**

1. Detects file modifications via `filesystem.isDirty(agent)`
2. If dirty, runs all available tests via `testingService.runTests("*", agent)`
3. Reports pass/fail status for each test
4. Metrics are logged to agent output

**Example Comment from Code:**

```typescript
async function afterChatCompletion(agent: Agent): Promise<void> {
  const filesystem = agent.requireServiceByType(FileSystemService);
  const testingService = agent.requireServiceByType(TestingService);

  if (filesystem.isDirty(agent)) {
    agent.infoMessage("Working Directory was updated, running test suite...");
    await testingService.runTests("*", agent);
  }
}
```

## Plugin Integration

The package automatically integrates through the TokenRing plugin system:

**Registration Flow:**

1. Registers chat commands with `AgentCommandService` via `agentCommandService.addAgentCommands(chatCommands)`
2. Registers hooks with `AgentLifecycleService` via `lifecycleService.addHooks(packageJSON.name, hooks)`
3. Auto-registers `TestingService` with application via `app.addServices(testingService)`
4. Creates `ShellCommandTestingResource` instances from configuration via `testingConfig.type === "shell"`
5. Uses `TestingServiceConfigSchema` and `shellCommandTestingConfigSchema` for validation

**Key Schema Interfaces:**

```typescript
// Plugin configuration schema
interface TestingServiceConfigSchema {
  agentDefaults: {
    maxAutoRepairs: number;
  };
  resources?: Record<string, any>;
}

// Shell command resource schema
interface shellCommandTestingConfigSchema {
  type: "shell";
  name: string;
  description?: string;
  workingDirectory?: string;
  command: string;
  timeoutSeconds?: number;
}

// Agent configuration slice
interface TestingAgentConfigSchema {
  maxAutoRepairs?: number;
}
```

## Usage Examples

### Basic Setup and Testing

```typescript
import TestingService from '@tokenring-ai/testing/TestingService';
import ShellCommandTestingResource from '@tokenring-ai/testing/ShellCommandTestingResource';

// Create service with configuration
const testingService = new TestingService({
  agentDefaults: { maxAutoRepairs: 5 },
  resources: {}
});

// Register a resource
const shellResource = new ShellCommandTestingResource({
  type: "shell",
  name: 'build-test',
  command: 'bun run build',
  workingDirectory: './project',
  timeoutSeconds: 120
});

testingService.registerResource('build-test', shellResource);

// In an agent context
const agent = new Agent(/* config */);
await testingService.runTests("build-test", agent);
const allPassed = testingService.allTestsPassed(agent);
console.log(allPassed ? 'All tests passed!' : 'Some tests failed');
```

### Resource Registration from Config

```typescript
import {TestingServiceConfigSchema, shellCommandTestingConfigSchema} from '@tokenring-ai/testing';

const appConfig = {
  testing: {
    agentDefaults: { maxAutoRepairs: 5 },
    resources: {
      build: {
        type: "shell",
        name: "build",
        command: "bun run build"
      },
      test: {
        type: "shell",
        name: "test",
        command: "bun test"
      }
    }
  }
};

// Parse and register in plugin install hook
const parsedConfig = TestingServiceConfigSchema.parse(appConfig.testing);
const testingService = new TestingService(parsedConfig);

for (const name in parsedConfig.resources) {
  if (parsedConfig.resources[name].type === "shell") {
    const resourceConfig = shellCommandTestingConfigSchema.parse(parsedConfig.resources[name]);
    testingService.registerResource(name,
      new ShellCommandTestingResource(resourceConfig)
    );
  }
}
```

### Interactive Testing Workflow

```bash
# In agent chat:
/test list              # See available tests
/test run               # Run all tests (default)
/test run build-test    # Run specific test
```

### Automated Repair Workflow

```typescript
// Hook integration - automatically triggers when:
// 1. File modifications detected (filesystem.isDirty(agent) = true)
// 2. autoTest hook executes after chat completion
// 3. Tests run via testingService.runTests("*", agent)
// 4. Failures detected and repairCount < maxAutoRepairs
// 5. User confirms repair through agent.askForConfirmation()

// If user confirms repair:
// 1. Agent receives failure details from agent.handleInput()
// 2. Agent attempts to fix issues
// 3. Tests run again to verify repair
// 4. repairCount is incremented
```

### Custom Test Resource Implementation

```typescript
import type {TestingResource} from '@tokenring-ai/testing/TestingResource';
import type {TestResult} from '@tokenring-ai/testing/schema';

class CustomTestingResource implements TestingResource {
  description = 'Custom test resource';

  async runTest(agent): Promise<TestResult> {
    const startedAt = Date.now();

    try {
      // Perform custom test logic
      const result = await this.performTest(agent);

      return {
        startedAt,
        finishedAt: Date.now(),
        passed: result.success,
        output: result.output
      };
    } catch (error) {
      return {
        startedAt,
        finishedAt: Date.now(),
        passed: false,
        output: '',
        error
      };
    }
  }

  private async performTest(agent) {
    // Test implementation
    return { success: true, output: 'Test output' };
  }
}

const customResource = new CustomTestingResource();
testingService.registerResource('custom', customResource);
```

## API Reference

### TestingService

```typescript
class TestingService implements TokenRingService {
  name: string = "TestingService";
  description: string = "Provides testing functionality";

  registerResource: (name: string, resource: TestingResource) => void
  getAvailableResources: () => Iterable<string>
  runTests: (likeName: string, agent: Agent) => Promise<void>
  allTestsPassed: (agent: Agent) => boolean
  attach: (agent: Agent) => void
  constructor(readonly options: z.output<typeof TestingServiceConfigSchema>)
}
```

### TestingResource (Interface)

```typescript
interface TestingResource {
  description: string;
  runTest: (agent: Agent) => Promise<TestResult>;
}
```

### ShellCommandTestingResource

```typescript
class ShellCommandTestingResource implements TestingResource {
  constructor(private readonly options: z.output<typeof shellCommandTestingConfigSchema>)

  // Properties
  description: string
  readonly options: z.output<typeof shellCommandTestingConfigSchema>
}
```

### TestResult (Interface)

```typescript
interface TestResult {
  startedAt: number
  finishedAt: number
  passed: boolean
  output?: string
  error?: unknown
}
```

### Chat Commands

```typescript
interface TokenRingAgentCommand {
  description: string
  execute: (remainder: string | undefined, agent: Agent) => Promise<void>
  help: string
}
```

### Hooks

```typescript
interface HookConfig {
  name: string;
  displayName: string;
  description: string;
  afterChatCompletion: (agent: Agent) => Promise<void>;
}
```

### Configuration Schemas

```typescript
// Plugin-level configuration schema
const TestingServiceConfigSchema = z.object({
  agentDefaults: z.object({
    maxAutoRepairs: z.number().default(5)
  }).prefault({}),
  resources: z.record(z.string(), z.any()).optional()
}).strict().prefault({});

// Resource schema for shell resources
const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string(),
  description: z.string().optional(),
  workingDirectory: z.string().optional(),
  command: z.string(),
  timeoutSeconds: z.number().optional()
});

// Agent configuration slice
const TestingAgentConfigSchema = z.object({
  maxAutoRepairs: z.number().optional()
}).default({});
```

## State Management

The TestingService manages state through the `TestingState` class:

```typescript
class TestingState implements AgentStateSlice<typeof serializationSchema> {
  name: string = "TestingState";
  serializationSchema: z.output<typeof serializationSchema>;
  testResults: Record<string, TestResult> = {};
  repairCount: number = 0;
  maxAutoRepairs: number;

  constructor(readonly initialConfig: z.output<typeof TestingServiceConfigSchema>["agentDefaults"])

  reset(what: ResetWhat[]): void
  serialize(): z.output<typeof serializationSchema>
  deserialize(data: z.output<typeof serializationSchema>): void
  show(): string[]
}
```

**State Properties:**

- `testResults`: Record of test name to TestResult objects
- `repairCount`: Number of auto-repair attempts made
- `maxAutoRepairs`: Maximum number of auto-repairs allowed before stopping

**State Lifecycle:**

1. **Initialization**: Created via `agent.initializeState(TestingState, config)` during service attach
2. **Serialization**: State can be serialized using `serialize()` method and checkpointed
3. **Deserialization**: State can be restored from checkpoint using `deserialize(data)`
4. **UI Display**: State information shown via `show()` method
5. **Reset**: `reset(what)` method can clear specific state portions

**Serialization Schema:**

```typescript
const serializationSchema = z.object({
  testResults: z.record(z.string(), z.any()),
  repairCount: z.number(),
  maxAutoRepairs: z.number()
});
```

**State Display Output:**

The `show()` method returns a formatted string array showing:

- Test results with PASS/FAIL status
- Error information if a test failed
- Total repair count
- Structure: `["Test Results:", "[Test: name]: PASSED/FAILED\nerror", "", "Total Repairs: N"]`

**State Preservation:**

- Test results are persisted across sessions via serialization
- Repair count is tracked and stored to prevent infinite loops
- State can be serialized and deserialized for checkpoint recovery
- State is automatically restored when agent is reinitialized

## Development

### Testing

```bash
bun run test              # Run tests
bun run test:watch        # Run tests in watch mode
bun run test:coverage     # Run tests with coverage
```

### Known Limitations

- Shell tests assume Unix-like environment (Windows may need adjustments)
- Repair quality depends on agent capabilities
- Auto-repair prompts user but execution depends on user confirmation
- File system modification detection requires proper integration with FileSystemService
- Only shell resource type is currently provided; custom resources can be implemented

### Dependencies

- `zod`: Runtime type validation for configuration schemas
- `@tokenring-ai/agent`: Agent framework and command system
- `@tokenring-ai/filesystem`: File system operations and shell command execution
- `@tokenring-ai/utility`: Utility classes including KeyedRegistry for resource management
- `@tokenring-ai/app`: Application framework and plugin system
- `glob-gitignore`: Gitignore pattern support for glob operations

### Package Structure

```
pkg/testing/
├── ChatCommands/          # Chat command definitions
│   └── test/
│       ├── list.ts
│       └── run.ts
├── hooks.ts               # Hook exports
├── hooks/
│   └── autoTest.ts        # autoTest hook implementation
├── commands.ts            # Command exports
├── commands/
│   └── test/
│       └── test.ts        # /test command
├── state/
│   └── testingState.ts    # TestingState class
├── TestingResource.ts     # TestingResource interface
├── ShellCommandTestingResource.ts
├── TestingService.ts
├── schema.ts              # Zod schemas for configuration
├── plugin.ts              # Plugin registration
├── index.ts               # Public exports
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration

```

### Contributing

1. Fork the repository
2. Add new testing resource types
3. Enhance repair capabilities
4. Improve automation hooks
5. Add support for additional resource types (e.g., file-based tests, API tests)
6. Submit pull requests

For issues or feature requests, refer to the TokenRing AI documentation and community guidelines.

## License

MIT License - see LICENSE file for details.
