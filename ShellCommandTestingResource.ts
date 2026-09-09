import type Agent from "@tokenring-ai/agent/Agent";
import { TerminalService } from "@tokenring-ai/terminal";
import { stripUndefinedKeys } from "@tokenring-ai/utility/object/stripObject";
import type { z } from "zod";
import type { shellCommandTestingConfigSchema, TestResult } from "./schema.ts";
import type { TestingResource } from "./TestingResource.ts";

export default class ShellCommandTestingResource implements TestingResource {
  description: string = "Provides ShellCommandTesting functionality";

  constructor(private readonly options: z.output<typeof shellCommandTestingConfigSchema>) {}

  async runTest(agent: Agent): Promise<TestResult> {
    const terminal = agent.requireService(TerminalService);
    const startedAt = Date.now();

    const bashResult = await terminal.runScript(
      this.options.command,
      {
        timeoutSeconds: this.options.timeoutSeconds,
        workingDirectory: this.options.workingDirectory,
        isolation: this.options.isolation,
      },
      agent,
    );

    const finishedAt = Date.now();

    if (bashResult.status === "unknownError") {
      return {
        status: "error" as const,
        startedAt,
        finishedAt,
        error: bashResult.error,
      };
    }

    const cropLimit = this.options.cropOutput;
    const location = this.options.workingDirectory ? ` in ${this.options.workingDirectory}` : "";
    const output = `Running ${this.options.command}${location}:\n${bashResult.output.trim().substring(0, cropLimit)}`;

    if (bashResult.status === "success") {
      return {
        status: "passed" as const,
        startedAt,
        finishedAt,
        output,
      };
    }

    if (bashResult.status === "badExitCode") {
      return {
        status: "failed" as const,
        startedAt,
        finishedAt,
        output,
      };
    }

    return {
      status: "timeout" as const,
      startedAt,
      finishedAt,
      output,
    };
  }
}
