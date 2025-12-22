import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {AgentStateSlice} from "@tokenring-ai/agent/types";
import type {TestResult} from "../schema.ts";

export class TestingState implements AgentStateSlice {
  name = "TestingState";
  testResults: Record<string, TestResult> = {};
  repairCount = 0;
  maxAutoRepairs: number;

  constructor({ maxAutoRepairs }: { maxAutoRepairs: number }) {
    this.maxAutoRepairs = maxAutoRepairs;
  }
  reset(what: ResetWhat[]): void {}

  serialize(): object {
    return {
      testResults: this.testResults,
      repairCount: this.repairCount,
      maxAutoRepairs: this.maxAutoRepairs
    };
  }

  deserialize(data: any): void {
    this.testResults = data.testResults;
    this.repairCount = data.repairCount;
    this.maxAutoRepairs = data.maxAutoRepairs;
  }

  show(): string[] {
    return [
      "Test Results:",
      ...Object.entries(this.testResults).map(([name, result]) => {
        if (result.error) {
          return `[Test: ${name}]: FAILED\n${result.error}`;
        } else {
          return `[Test: ${name}]: PASSED`;
        }
      }),
      "",
      `Total Repairs: ${this.repairCount}`,
    ]
  }
}
