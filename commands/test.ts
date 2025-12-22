import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import TestingService from "../TestingService.js";

const description =
  "/test - Run all or a specific test from the TestingService. Shows available tests if name is omitted.";

const execute = createSubcommandRouter({
  list,
  run
});

async function list(remainder: string, agent: Agent) {
  const testingService = agent.requireServiceByType(TestingService);
  const available = Array.from(testingService.getAvailableResources());
  if (available.length === 0) {
    agent.infoLine("No tests available.");
  } else {
    agent.infoLine("Available tests:\n" + available.map(name => ` - ${name}`).join('\n'));
  }
}

async function run(remainder: string, agent: Agent) {
  const testingService = agent.requireServiceByType(TestingService);
  const trimmed = remainder?.trim() || "*";

  await testingService.runTests(trimmed, agent);
}

const help: string = `# /test list
# /test run [test_name|*]

## Description

Lists or runs user-defined tests.

  If tests fail, the agent will track the results and may offer to automatically repair the issues, provided the maximum auto-repair limit hasn't been reached.

## Usage

/test list               - Show all available tests
/test run <test_name>    - Run a specific test
/test run                - Run all available tests (default)

## Examples

/test list               - Lists all available tests
/test run userAuth       - Run the 'userAuth' test
/test run                - Execute every available test

## Output

- **PASSED**: Test completed successfully
- **FAILED**: Test failed; error details and repair options may be provided`;

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand

