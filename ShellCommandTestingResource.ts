import Agent from "@tokenring-ai/agent/Agent";
import {FileSystemService} from "@tokenring-ai/filesystem";
import {z} from "zod";
import {shellCommandTestingConfigSchema, TestResult} from "./schema.ts";
import {TestingResource} from "./TestingResource.ts";

export default class ShellCommandTestingResource implements TestingResource {
  description: string = "Provides ShellCommandTesting functionality";

  constructor(private readonly options: z.output<typeof shellCommandTestingConfigSchema>) {}
  async runTest(agent: Agent): Promise<TestResult> {
    const filesystem = agent.requireServiceByType(FileSystemService);
    const startedAt = Date.now();

    const bashResult = await filesystem.executeCommand(
      this.options.command,
      {
        timeoutSeconds: this.options.timeoutSeconds,
        workingDirectory: this.options.workingDirectory,
      },
      agent,
    );
    const {ok, stdout, stderr} = bashResult;

    return {
      startedAt,
        finishedAt: Date.now(),
      passed: ok,
      output: `Running ${this.options.command} in ${this.options.workingDirectory}:\n${stdout}\n${stderr}`,
    }
  }
}
