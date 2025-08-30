import {execute as runShellCommand} from "@token-ring/filesystem/tools/runShellCommand";
import {Registry} from "@token-ring/registry";
import TestingResource from "./TestingResource.js";

export type TestCommand = {
  command: string;
  description?: string;
};

export type TestResult = {
  passed: boolean;
  output: string;
};

export interface ShellCommandTestingResourceOptions {
  name: string;
  description?: string;
  workingDirectory?: string;
  command: string;
  timeoutSeconds?: number;
}

export default class ShellCommandTestingResource extends TestingResource {
  description: string = "Provides ShellCommandTesting functionality";
  workingDirectory: string | undefined;
  command!: string;
  timeoutSeconds: number = 60;

  constructor({
                workingDirectory,
                command,
                timeoutSeconds,
                ...params
              }: ShellCommandTestingResourceOptions) {
    super();
    this.workingDirectory = workingDirectory;
    this.command = command;
    this.timeoutSeconds = timeoutSeconds ?? 60;
  }

  async _runTest(registry: Registry): Promise<string> {

    const {ok, stdout, stderr} = await runShellCommand(
      {
        command: this.command,
        timeoutSeconds: this.timeoutSeconds,
        workingDirectory: this.workingDirectory,
      },
      registry,
    );
    if (ok) {
      return stdout as string;
    } else {
      throw new Error(
        [
          `Command ${this.command} threw error ${stderr}, stderr:`,
          stderr,
          "\nstdout: ",
          stdout,
        ].join("\n"),
      );
    }
  }
}
