# @tokenring-ai/testing

A comprehensive testing framework for AI agents within the TokenRing AI ecosystem that provides automated testing, AI-powered code repair, and seamless integration with agent workflows.

## Overview

The `@tokenring-ai/testing` package enables automated and manual testing of codebases with AI-assisted repair capabilities. It integrates shell command execution for tests, provides intelligent failure analysis and repair through specialized agents, and includes automation hooks for seamless workflow integration.

### Key Features

- **Testing Resources**: Pluggable components for defining and running tests (shell commands, custom resources)
- **Service Layer**: Central `TestingService` for managing and executing tests across resources
- **Chat Commands**: Interactive `/test` command for manual control
- **Automation Hooks**: Automatic test execution after file modifications
- **AI Repair Agent**: Specialized agent for diagnosing and fixing test failures
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

To integrate the testing package in your agent application:

```typescript
import { packageInfo } from '@tokenring-ai/testing';
// The package auto-registers through the plugin system
```

## Configuration

The testing package uses a Zod-based configuration schema for declarative setup:

```typescript
import { testingConfigSchema } from '@tokenring-ai/testing';
import { z } from 'zod';

const TestingConfigSchema = testingConfigSchema.extend({
  // Optional custom configuration
});
```

### Resource Configuration

Configure testing resources through your application config:

```typescript
{
  "testing": {
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
    },
    "maxAutoRepairs": 3
  }
}
```

### Environment Variables

No specific environment variables required. The package integrates with your existing agent configuration and AI model setup through `@tokenring-ai/ai-client`.

## Core Components

### TestingService

The central service for managing and executing tests across all registered resources.

**Key Methods:**

- `registerResource(name: string, resource: TestingResource)`: Register a testing resource
- `getAvailableResources(): string[]`: Get all registered resource names  
- `runTests(likeName: string, agent: Agent)`: Execute tests matching the given pattern
- `allTestsPassed(agent: Agent): boolean`: Check if all tests passed

**Example:**
```typescript
const testingService = agent.requireServiceByType(TestingService);
await testingService.runTests("*", agent);
```

### TestingResource (Interface)

Base interface for implementing custom test resources.

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
  name: string;
  description?: string;
  workingDirectory?: string;
  command: string;
  timeoutSeconds?: number; // Default: 60
}
```

**Example:**
```typescript
import ShellCommandTestingResource from '@tokenring-ai/testing/ShellCommandTestingResource';

const resource = new ShellCommandTestingResource({
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
- `/test` - Show available tests
- `/test <test_name>` - Run specific test
- `/test <test1> <test2>` - Run multiple tests (using wildcard pattern matching)
- `/test *` - Run all available tests

**Examples:**
```bash
/test                    # Lists all available tests
/test build-test         # Run the 'build-test' resource
/test build-test unit-tests  # Run multiple specific tests using pattern matching
/test *                # Execute every available test
```

**Output:**
- `PASSED`: Test completed successfully
- `FAILED`: Test failed with error output shown

## Automation Hooks

### autoTest Hook

Automatically runs tests after chat completion when files have been modified.

**Trigger:** `afterChatCompletion`
**Condition:** Filesystem is dirty (file modifications detected)

**Behavior:**
1. Detects file modifications via `filesystem.dirty`
2. Runs all enabled tests across services
3. Reports pass/fail status for each test
4. Logs results to agent output

**Test Failure Handling:**
- If tests fail, the system tracks failures
- Offers to automatically repair when `maxAutoRepairs` limit not reached
- Enqueues repair tasks to WorkQueueService with failure details

## AI Repair Agent

A specialized background agent for autonomous code repair.

**Agent Configuration:**
```typescript
{
  name: "Code Repair Engineer",
  description: "Call this agent to fix failing tests and repair broken code...",
  category: "Quality & Operations",
  type: "background",
  visual: { color: "green" },
  chat: {
    systemPrompt: "You are an expert code repair engineer specializing in debugging and fixing failing tests...",
    temperature: 0.2,
    topP: 0.7,
  },
  initialCommands: ["/tools enable @tokenring-ai/filesystem/*"]
}
```

**Capabilities:**
- Test failure analysis and root cause identification
- Code debugging and bug fixing
- Minimal, targeted fixes that preserve existing functionality

## Plugin Integration

The package automatically integrates through the TokenRing plugin system:

**Registration:**
1. Registers chat commands with `AgentCommandService`
2. Registers hooks with `AgentLifecycleService`
3. Registers repair agent with `AgentManager`
4. Auto-registers `TestingService` with application
5. Configures resources based on application config

**Service Dependencies:**
- `@tokenring-ai/agent`: Core agent framework
- `@tokenring-ai/chat`: Chat command processing
- `@tokenring-ai/filesystem`: File system operations and shell execution
- `@tokenring-ai/queue`: Work queue for repair tasks
- `@tokenring-ai/utility`: Registry utilities

## Usage Examples

### Basic Setup and Testing

```typescript
import TestingService from '@tokenring-ai/testing/TestingService';
import ShellCommandTestingResource from '@tokenring-ai/testing/ShellCommandTestingResource';

const testingService = new TestingService(/* config */);
const shellResource = new ShellCommandTestingResource({
  name: 'build-test',
  command: 'bun run build',
  workingDirectory: './project',
  timeoutSeconds: 120
});

testingService.registerResource('build-test', shellResource);

const agent = new Agent(/* config */);
await testingService.runTests("build-test", agent);
console.log(testingService.allTestsPassed(agent) ? 'All tests passed!' : 'Some tests failed');
```

### Interactive Testing Workflow

```bash
# In agent chat:
/test                    # See available tests
/test *                  # Run all tests
```

### Automated Repair Workflow

```typescript
// Hook integration - automatically triggers when:
// 1. File modifications detected (filesystem.dirty = true)
// 2. Tests run via autoTest hook
// 3. Failures detected
// 4. Repair tasks queued to WorkQueueService

// Repair agent automatically:
// 1. Analyzes test failures
// 2. Investigates source code issues
// 3. Implements targeted fixes
// 4. Validates repairs work correctly
```

## API Reference

### TestingService

```typescript
class TestingService implements TokenRingService {
  name: string = "TestingService";
  description: string = "Provides testing functionality";
  
  registerResource: (name: string, resource: TestingResource) => void
  getAvailableResources: () => string[]
  runTests: (likeName: string, agent: Agent) => Promise<void>
  allTestsPassed: (agent: Agent) => boolean
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
  constructor(options: ShellCommandTestingResourceOptions)
  
  // Properties
  description: string
  workingDirectory: string | undefined
  command: string
  timeoutSeconds: number
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
  description: string;
  afterChatCompletion: (agent: Agent) => Promise<void>;
}
```

## Dependencies

**Runtime Dependencies:**
- `@tokenring-ai/agent`: Core agent framework
- `@tokenring-ai/chat`: Chat command processing
- `@tokenring-ai/filesystem`: File operations and shell execution
- `@tokenring-ai/queue`: Work queue for repair tasks
- `@tokenring-ai/utility`: Registry utilities
- `@tokenring-ai/app`: Application framework
- `glob-gitignore`: Pattern matching utilities
- `zod`: Schema validation

**Development Dependencies:**
- `typescript`: TypeScript compilation
- `vitest`: Testing framework

## Development

### Testing

```bash
bun run test
# Run tests
bun run test:watch
# Run tests in watch mode
bun run test:coverage
# Run tests with coverage
```

### Known Limitations

- Shell tests assume Unix-like environment (Windows may need adjustments)
- AI repair quality depends on model capabilities
- Auto-repair enqueues tasks but doesn't execute immediately
- Repair execution depends on work queue processing
- File system modification detection requires proper integration

### Contributing

1. Fork the repository
2. Add new testing resource types
3. Enhance repair capabilities
4. Improve automation hooks
5. Submit pull requests

For issues or feature requests, refer to the TokenRing AI documentation and community guidelines.