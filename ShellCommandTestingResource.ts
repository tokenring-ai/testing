import Agent from "@tokenring-ai/agent/Agent";
import {execute as runShellCommand} from "@tokenring-ai/filesystem/tools/runShellCommand";
import {z} from "zod";
import {shellCommandTestingConfigSchema, TestResult} from "./schema.ts";
import {TestingResource} from "./TestingResource.ts";

export default class ShellCommandTestingResource implements TestingResource {
  description: string = "Provides ShellCommandTesting functionality";

  constructor(private readonly options: z.output<typeof shellCommandTestingConfigSchema>) {}
  async runTest(agent: Agent): Promise<TestResult> {
    const startedAt = Date.now();
    const {ok, stdout, stderr} = await runShellCommand(
      {
        command: this.options.command,
        timeoutSeconds: this.options.timeoutSeconds,
        workingDirectory: this.options.workingDirectory,
      },
      agent,
    );

    return {
      startedAt,
      finishedAt: Date.now(),
      passed: ok,
      output: stdout
    }
  }
}
