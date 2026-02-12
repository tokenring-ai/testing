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
      return {
        status: "passed" as const,
        startedAt,
        finishedAt,
        output: `Running ${this.options.command} in ${this.options.workingDirectory}:\n${bashResult.output.trim().substring(0, this.options.cropOutput)}`,
      };
    }

    if (bashResult.status === "badExitCode") {
      return {
        status: "failed" as const,
        startedAt,
        finishedAt,
        output: `Running ${this.options.command} in ${this.options.workingDirectory}:\n${bashResult.output.trim().substring(0, this.options.cropOutput)}`,
      };
    }

    if (bashResult.status === "timeout") {
      return {
        status: "timeout" as const,
        startedAt,
        finishedAt,
      };
    }

    return {
      status: "error" as const,
      startedAt,
      finishedAt,
      error: bashResult.error,
    };
  }
}
