import Agent from "@tokenring-ai/agent/Agent";
import {TerminalService} from "@tokenring-ai/terminal";
import {z} from "zod";
import {shellCommandTestingConfigSchema, TestResult} from "./schema.ts";
import {TestingResource} from "./TestingResource.ts";

export default class ShellCommandTestingResource implements TestingResource {
  description: string = "Provides ShellCommandTesting functionality";

  constructor(private readonly options: z.output<typeof shellCommandTestingConfigSchema>) {}
  async runTest(agent: Agent): Promise<TestResult> {
    const terminal = agent.requireServiceByType(TerminalService);
    const startedAt = Date.now();

    const bashResult = await terminal.runScript(
      this.options.command,
      {
        timeoutSeconds: this.options.timeoutSeconds,
        workingDirectory: this.options.workingDirectory,
      },
      agent,
    );

    const output = bashResult.stdout.trim().substring(0, this.options.cropOutput);

    return {
      startedAt,
        finishedAt: Date.now(),
      passed: bashResult.ok,
      output: `Running ${this.options.command} in ${this.options.workingDirectory}:\n${output}`,
    }
  }
}
