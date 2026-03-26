# @tokenring-ai/testing

A testing framework for AI agents within the TokenRing AI ecosystem that provides automated testing capabilities and seamless integration with agent workflows.

## Overview

The `@tokenring-ai/testing` package provides a comprehensive testing framework for AI agents within the TokenRing ecosystem. It enables automated and manual testing of codebases through pluggable testing resources, with seamless integration into agent workflows.

The package integrates shell command execution for running tests and includes automation hooks for triggering tests after file modifications. When tests fail, the system can offer automatic repair suggestions based on the error output.

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

This package is part of the TokenRing AI monorepo. To use it:

### As a Monorepo Package

1. Ensure you have Bun installed
2. From the monorepo root, install dependencies:
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

This automatically registers:

- `TestingService` with the application
- Chat commands (`/test list`, `/test run`) with `AgentCommandService`
- Hooks (`autoTest`) with `AgentLifecycleService`

### Manual Service Registration

If you prefer manual registration:

```typescript
import TestingService from '@tokenring-ai/testing/TestingService';
import { TestingServiceConfigSchema } from '@tokenring-ai/testing/schema';

const config = TestingServiceConfigSchema.parse({
  agentDefaults: { maxAutoRepairs: 5 },
  resources: { /* your resources */ }
});

const testingService = new TestingService(config);
app.addServices(testingService);
```

## Configuration

The testing package uses a Zod-based configuration schema for declarative setup.

### Plugin Configuration Schema

```typescript
import { TestingServiceConfigSchema } from '@tokenring-ai/testing/schema';
import { z } from 'zod';

// Plugin-level configuration
const packageConfigSchema = z.object({
  testing: TestingServiceConfigSchema.optional()
});
```

### Testing Service Configuration

```typescript
import { TestingServiceConfigSchema } from '@tokenring-ai/testing/schema';

const config = {
  agentDefaults: {
    maxAutoRepairs: 5  // Maximum number of auto-repair attempts
  },
  resources: {
    // Resource definitions go here
  }
};
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

**Note:** The `name` field in resources is required and should match the resource name in the config key.

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

## Core Components

### TestingService

The central service for managing and executing tests across all registered resources.

**Implements:** `TokenRingService`

**Key Properties:**

- `name: string` - Service name ("TestingService")
- `description: string` - Service description ("Provides testing functionality")
- `options: z.output<typeof TestingServiceConfigSchema>` - Service configuration options

**Key Methods:**

```typescript
class TestingService {
  // Register a testing resource
  registerResource: (name: string, resource: TestingResource) => void;

  // Get all registered resource names
  getAvailableResources: () => Iterable<string>;

  // Execute tests matching the given pattern
  runTests: (likeName: string, agent: Agent) => Promise<void>;

  // Check if all tests passed for the given agent
  allTestsPassed: (agent: Agent) => boolean;

  // Initialize agent state with testing configuration
  attach: (agent: Agent) => void;
}
```

**Example:**

```typescript
import TestingService from '@tokenring-ai/testing/TestingService';

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

**TestResult Type:**

```typescript
type TestResult =
  | {
      status: "passed";
      startedAt: number;
      finishedAt: number;
      output?: string;
    }
  | {
      status: "failed";
      startedAt: number;
      finishedAt: number;
      output: string;
    }
  | {
      status: "timeout";
      startedAt: number;
      finishedAt: number;
    }
  | {
      status: "error";
      startedAt: number;
      finishedAt: number;
      error: string;
    };
```

### ShellCommandTestingResource

Concrete implementation for running shell commands as tests.

**Implements:** `TestingResource`

**Constructor Options:**

```typescript
interface ShellCommandTestingResourceOptions {
  type: "shell";
  name: string;
  description?: string;
  workingDirectory?: string;
  command: string;
  timeoutSeconds?: number;
  cropOutput?: number;
}
```

**Default Values:**

- `timeoutSeconds`: 120 seconds
- `cropOutput`: 10000 characters

**Properties:**

- `description: string` - Resource description ("Provides ShellCommandTesting functionality")
- `options: z.output<typeof shellCommandTestingConfigSchema>` - Resource configuration

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

### /test list Command

List available tests.

**Command Name**: `test list`

**Usage:**

```bash
/test list
```

**Input Schema**: No arguments required

**Output:**

- List of available test names formatted as `- [name]`
- "No tests available." if no resources are registered

### /test run Command

Run tests interactively through the chat interface.

**Command Name**: `test run`

**Usage:**

```bash
/test run [pattern]
```

**Arguments:**

- `pattern` (optional): Test name or pattern to match (default: `*` for all tests)

**Examples:**

```bash
/test list              # Lists all available tests
/test run               # Run all tests (pattern defaults to '*')
/test run build-test    # Run the 'build-test' resource
/test run unit*         # Run all tests matching 'unit*' pattern
```

**Output:**

- `✅ PASSED`: Test completed successfully
- `❌ FAILED`: Test failed with error details and repair options may be provided
- `⏳ TIMEOUT`: Test exceeded timeout limit
- `⚠️ ERROR`: Test encountered an unexpected error

If tests fail, the agent may offer automatic repair options based on `maxAutoRepairs` configuration.

## Automation Hooks

### autoTest Hook

Automatically runs tests after agent input success when files have been modified.

**Hook Definition:**

- **Name**: `autoTest`
- **Display Name**: `Testing/Auto Test`
- **Description**: "Runs tests automatically after chat is complete"

**Trigger Event**: `AfterAgentInputSuccess`

**Condition**: Filesystem is dirty (file modifications detected via `filesystem.isDirty(agent)`)

**Behavior:**

1. Triggered after successful agent input handling
2. Checks if filesystem has been modified via `filesystem.isDirty(agent)`
3. If modified, runs all available tests via `testingService.runTests("*", agent)`
4. Displays "Working Directory was updated, running test suite..." message
5. Reports pass/fail status for each test via `TestingService`

**Hook Subscription Object:**

```typescript
import { HookSubscription } from '@tokenring-ai/lifecycle/types';

const autoTest = {
  name: "autoTest",
  displayName: "Testing/Auto Test",
  description: "Runs tests automatically after chat is complete",
  callbacks: [
    new HookCallback(AfterAgentInputSuccess, async (_data, agent) => {
      const filesystem = agent.requireServiceByType(FileSystemService);
      const testingService = agent.requireServiceByType(TestingService);

      if (filesystem.isDirty(agent)) {
        agent.infoMessage("Working Directory was updated, running test suite...");
        await testingService.runTests("*", agent);
      }
    })
  ]
} satisfies HookSubscription;
```

**Example:**

See the hook definition above for the complete implementation.

The hook is registered through the plugin system:

```typescript
import hooks from '@tokenring-ai/testing/hooks';
import { AgentLifecycleService } from '@tokenring-ai/lifecycle';

// In plugin install function
app.waitForService(AgentLifecycleService, lifecycleService =>
  lifecycleService.addHooks(hooks)
);
```

## Plugin Integration

The package automatically integrates through the TokenRing plugin system.

**Registration Flow:**

1. Registers chat commands with `AgentCommandService` via `agentCommandService.addAgentCommands(agentCommands)`
2. Registers hooks with `AgentLifecycleService` via `lifecycleService.addHooks(hooks)`
3. Auto-registers `TestingService` with application via `app.addServices(testingService)`
4. Creates `ShellCommandTestingResource` instances from configuration via `testingConfig.type === "shell"`
5. Uses `TestingServiceConfigSchema` and `shellCommandTestingConfigSchema` for validation

**Hooks Registration Pattern:**

The plugin registers hooks as a record object where keys are hook names:

```typescript
export default {
  autoTest,  // Hook subscription object
};
```

This is passed to `lifecycleService.addHooks(hooks)` which registers each hook by name.

**Key Schema Interfaces:**

```typescript
import { z } from 'zod';
import { TestingServiceConfigSchema, shellCommandTestingConfigSchema } from '@tokenring-ai/testing/schema';

// Plugin configuration schema
const packageConfigSchema = z.object({
  testing: TestingServiceConfigSchema.optional()
});

// Shell command resource schema
const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string(),
  description: z.string().optional(),
  workingDirectory: z.string().optional(),
  command: z.string(),
  timeoutSeconds: z.number().default(120),
  cropOutput: z.number().default(10000)
});

// Agent configuration slice
const TestingAgentConfigSchema = z.object({
  maxAutoRepairs: z.number().optional()
}).default({});
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
import { TestingServiceConfigSchema, shellCommandTestingConfigSchema } from '@tokenring-ai/testing/schema';
import TestingService from '@tokenring-ai/testing/TestingService';
import ShellCommandTestingResource from '@tokenring-ai/testing/ShellCommandTestingResource';

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
// 2. AfterAgentInputSuccess hook executes
// 3. Tests run via testingService.runTests("*", agent)
// 4. Failures detected and repairCount < maxAutoRepairs
// 5. User confirms repair through agent.askForApproval()

// If user confirms repair:
// 1. Agent receives failure details from agent.handleInput()
// 2. Agent attempts to fix issues
// 3. Tests run again to verify repair
// 4. repairCount is incremented
```

### Custom Test Resource Implementation

```typescript
import type { TestingResource } from '@tokenring-ai/testing/TestingResource';
import type { TestResult } from '@tokenring-ai/testing/schema';
import type Agent from '@tokenring-ai/agent/Agent';

class CustomTestingResource implements TestingResource {
  description = 'Custom test resource';

  async runTest(agent: Agent): Promise<TestResult> {
    const startedAt = Date.now();

    try {
      // Perform custom test logic
      const result = await this.performTest(agent);

      return {
        status: "passed",
        startedAt,
        finishedAt: Date.now(),
        output: result.output
      };
    } catch (error) {
      return {
        status: "error",
        startedAt,
        finishedAt: Date.now(),
        error: String(error)
      };
    }
  }

  private async performTest(agent: Agent) {
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
  readonly name: string = "TestingService";
  description: string = "Provides testing functionality";

  registerResource: (name: string, resource: TestingResource) => void;
  getAvailableResources: () => Iterable<string>;
  runTests: (likeName: string, agent: Agent) => Promise<void>;
  allTestsPassed: (agent: Agent) => boolean;
  attach: (agent: Agent) => void;

  constructor(readonly options: z.output<typeof TestingServiceConfigSchema>);
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
  description: string = "Provides ShellCommandTesting functionality";

  constructor(private readonly options: z.output<typeof shellCommandTestingConfigSchema>);

  // Properties
  readonly options: z.output<typeof shellCommandTestingConfigSchema>;

  // Methods
  runTest: (agent: Agent) => Promise<TestResult>;
}
```

### TestResult (Type)

```typescript
type TestResult =
  | {
      status: "passed";
      startedAt: number;
      finishedAt: number;
      output?: string;
    }
  | {
      status: "failed";
      startedAt: number;
      finishedAt: number;
      output: string;
    }
  | {
      status: "timeout";
      startedAt: number;
      finishedAt: number;
    }
  | {
      status: "error";
      startedAt: number;
      finishedAt: number;
      error: string;
    };
```

### Chat Commands

Commands are registered with the `AgentCommandService` and follow the `TokenRingAgentCommand` interface:

```typescript
import type { TokenRingAgentCommand, AgentCommandInputSchema } from '@tokenring-ai/agent/types';

const inputSchema = {
  positionals: [{
    name: 'pattern',
    description: 'Test name or pattern',
    required: false,
    defaultValue: '*'
  }]
} as const satisfies AgentCommandInputSchema;

export default {
  name: "test run",
  description: "Run tests",
  help: `Run a specific test or all tests...`,
  inputSchema,
  execute: async ({positionals: {pattern}, agent}) => {
    await agent.requireServiceByType(TestingService).runTests(pattern, agent);
    return "Tests executed";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
```

### Hooks

```typescript
interface HookSubscription {
  name: string;
  displayName: string;
  description: string;
  callbacks: HookCallback[];
}
```

### Configuration Schemas

```typescript
import { z } from 'zod';

// Plugin-level configuration schema
const packageConfigSchema = z.object({
  testing: TestingServiceConfigSchema.optional()
});

// Service configuration schema
const TestingServiceConfigSchema = z.object({
  agentDefaults: z.object({
    maxAutoRepairs: z.number().default(5)
  }),
  resources: z.record(z.string(), z.any()).optional()
}).strict();

// Resource schema for shell resources
const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string(),
  description: z.string().optional(),
  workingDirectory: z.string().optional(),
  command: z.string(),
  timeoutSeconds: z.number().default(120),
  cropOutput: z.number().default(10000)
});

// Agent configuration slice
const TestingAgentConfigSchema = z.object({
  maxAutoRepairs: z.number().optional()
}).default({});

// Test result union type
const testResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("passed"),
    startedAt: z.number(),
    finishedAt: z.number(),
    output: z.string().optional(),
  }),
  z.object({
    status: z.literal("failed"),
    startedAt: z.number(),
    finishedAt: z.number(),
    output: z.string(),
  }),
  z.object({
    status: z.literal("timeout"),
    startedAt: z.number(),
    finishedAt: z.number(),
  }),
  z.object({
    status: z.literal("error"),
    startedAt: z.number(),
    finishedAt: z.number(),
    error: z.string(),
  }),
]);
```

## State Management

The TestingService manages state through the `TestingState` class.

```typescript
class TestingState extends AgentStateSlice<typeof serializationSchema> {
  readonly name: string = "TestingState";

  testResults: Record<string, TestResult> = {};
  repairCount: number = 0;
  maxAutoRepairs: number;

  constructor(readonly initialConfig: z.output<typeof TestingServiceConfigSchema>["agentDefaults"]) {
    super("TestingState", serializationSchema);
    this.maxAutoRepairs = initialConfig.maxAutoRepairs;
  }

  // Methods
  serialize(): z.output<typeof serializationSchema>;
  deserialize(data: z.output<typeof serializationSchema>): void;
  show(): string[];
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

Structure:
```
[
  "Test Results:",
  "[Test: name]: PASSED/FAILED/TIMEOUT/ERROR\nerror",
  "",
  "Total Repairs: N"
]
```

**State Preservation:**

- Test results are persisted across sessions via serialization
- Repair count is tracked and stored to prevent infinite loops
- State can be serialized and deserialized for checkpoint recovery
- State is automatically restored when agent is reinitialized

## Integration

### Service Registration

The TestingService is automatically registered when the plugin is installed:

```typescript
import testingPlugin from '@tokenring-ai/testing/plugin';
app.addPlugin(testingPlugin);

// Service is automatically available
const testingService = agent.requireServiceByType(TestingService);
```

### Command Registration

Chat commands are automatically registered with the AgentCommandService:

```typescript
// Available commands after plugin installation:
// - /test list
// - /test run [test_name]
```

### Hook Registration

The autoTest hook is automatically registered with the AgentLifecycleService:

```typescript
// Hook triggers on AfterAgentInputSuccess when filesystem is dirty
```

### Agent Integration

The service attaches to agents and initializes state:

```typescript
// During agent initialization:
agent.initializeState(TestingState, config);
```

## Best Practices

1. **Configure Resources Early**: Define all test resources in your application configuration before running agents
2. **Set Appropriate Timeouts**: Adjust `timeoutSeconds` based on test complexity
3. **Monitor Repair Count**: Keep `maxAutoRepairs` reasonable to prevent infinite loops
4. **Use Descriptive Names**: Give test resources clear, descriptive names for easy identification
5. **Test Filesystem Changes**: The autoTest hook only triggers when files are modified, ensuring efficient testing
6. **Custom Resources**: Implement custom TestingResource classes for non-shell test scenarios

## Testing and Development

### Running Tests

```bash
bun run test              # Run tests
bun run test:watch        # Run tests in watch mode
bun run test:coverage     # Run tests with coverage
```

### Vitest Configuration

The package uses Vitest for testing with the following configuration:

```typescript
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    environment: 'node',
    globals: true,
    isolate: true,
  },
});
```

### Build and Lint

```bash
bun run build           # Type check the code
bun run eslint          # Run ESLint with auto-fix
```

## Known Limitations

- Shell tests assume Unix-like environment (Windows may need adjustments for path separators and command syntax)
- Repair quality depends on agent capabilities and the nature of test failures
- Auto-repair requires user confirmation via `askForApproval` before execution
- File system modification detection requires proper integration with FileSystemService
- Only `shell` resource type is currently provided; custom resource types can be implemented by implementing the `TestingResource` interface
- No automatic test discovery; tests must be manually configured in the plugin configuration
- Test output is cropped to `cropOutput` characters (default 10000) to prevent excessive output
- Timeout handling may vary depending on the terminal service implementation

## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tokenring-ai/app | 0.2.0 | Application framework and plugin system |
| @tokenring-ai/chat | 0.2.0 | Chat interface integration |
| @tokenring-ai/agent | 0.2.0 | Agent framework and command system |
| @tokenring-ai/filesystem | 0.2.0 | File system service for dirty detection |
| @tokenring-ai/lifecycle | 0.2.0 | Lifecycle and hook management |
| @tokenring-ai/terminal | 0.2.0 | Terminal service for shell command execution |
| @tokenring-ai/queue | 0.2.0 | Queue service for task management |
| @tokenring-ai/utility | 0.2.0 | Utility classes including KeyedRegistry |
| glob-gitignore | ^1.0.15 | Gitignore pattern matching |
| zod | ^4.3.6 | Runtime type validation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^6.0.2 | TypeScript compiler |
| vitest | ^4.1.1 | Testing framework |

## Package Structure

```
pkg/testing/
├── commands.ts                       # Chat command exports
├── commands/
│   └── test/
│       ├── list.ts                   # /test list subcommand
│       └── run.ts                    # /test run subcommand
├── hooks.ts                          # Hook exports
├── hooks/
│   └── autoTest.ts                   # autoTest hook implementation
├── state/
│   └── testingState.ts               # TestingState class
├── TestingResource.ts                # TestingResource interface
├── ShellCommandTestingResource.ts    # Shell command test resource
├── TestingService.ts                 # Main testing service
├── schema.ts                         # Zod schemas for configuration
├── plugin.ts                         # Plugin registration
├── index.ts                          # Public exports
├── package.json                      # Dependencies and scripts
├── vitest.config.ts                  # Vitest configuration
├── LICENSE                           # MIT License
└── README.md                         # This documentation
```

## Contributing

1. Fork the repository
2. Add new testing resource types
3. Enhance repair capabilities
4. Improve automation hooks
5. Add support for additional resource types (e.g., file-based tests, API tests)
6. Submit pull requests

For issues or feature requests, refer to the TokenRing AI documentation and community guidelines.

## License

MIT License - see LICENSE file for details.
