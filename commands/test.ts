import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import list from "./test/list.js";
import run from "./test/run.js";

const description = "/test - Run tests from the TestingService";

const execute = createSubcommandRouter({
  list,
  run
});

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

