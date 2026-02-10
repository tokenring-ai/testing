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

    const finishedAt = Date.now();

    if (bashResult.status === "success") {
      agent.infoMessage(`Finished running ${this.options.command} in ${this.options.workingDirectory}. Status: Passed`);
      return {
        status: "passed" as const,
        startedAt,
        finishedAt,
        output: `Running ${this.options.command} in ${this.options.workingDirectory}:\n${bashResult.output.trim().substring(0, this.options.cropOutput)}`,
      };
    }

    if (bashResult.status === "badExitCode") {
      agent.errorMessage(`Finished running ${this.options.command} in ${this.options.workingDirectory}. Status: Failed`);
      return {
        status: "failed" as const,
        startedAt,
        finishedAt,
        output: `Running ${this.options.command} in ${this.options.workingDirectory}:\n${bashResult.output.trim().substring(0, this.options.cropOutput)}`,
      };
    }

    if (bashResult.status === "timeout") {
      agent.errorMessage(`Test ${this.options.command} timed out`);
      return {
        status: "timeout" as const,
        startedAt,
        finishedAt,
      };
    }

    agent.errorMessage(`Test ${this.options.command} encountered an error`);
    return {
      status: "error" as const,
      startedAt,
      finishedAt,
      error: bashResult.error,
    };
  }
}
