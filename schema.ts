import type { ConfigFieldMeta } from "@tokenring-ai/app/config/metadata";
import { z } from "zod";

export const testResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("passed"),
    startedAt: z.number(),
    finishedAt: z.number(),
    output: z.string().exactOptional(),
  }),
  z.object({
    status: z.literal("failed"),
    startedAt: z.number(),
    finishedAt: z.number(),
    output: z.string(),
  }),
  z.object({
    status: z.literal("timeout"),
    startedAt: z.number(),
    finishedAt: z.number(),
    output: z.string(),
  }),
  z.object({
    status: z.literal("error"),
    startedAt: z.number(),
    finishedAt: z.number(),
    error: z.string(),
  }),
]);

export type TestResult = z.infer<typeof testResultSchema>;

export const TestingAgentConfigSchema = z
  .object({
    maxAutoRepairs: z.number().exactOptional(),
  })
  .default({});

export const TestingServiceConfigSchema = z
  .object({
    agentDefaults: z
      .object({
        maxAutoRepairs: z
          .number()
          .default(5)
          .meta({ description: "Number of times an agent will retry fixing a failing test before giving up" } satisfies ConfigFieldMeta),
      })
      .prefault({})
      .meta({ label: "Agent Defaults" } satisfies ConfigFieldMeta),
    resources: z
      .record(
        z.string(),
        z.looseObject({
          type: z.string(),
        }),
      )
      .exactOptional()
      .meta({ label: "Resources", description: "Named test resources (e.g. shell commands), keyed by name" } satisfies ConfigFieldMeta),
  })
  .strict()
  .prefault({})
  .meta({ label: "Testing", description: "Test execution and auto-repair settings for agents" } satisfies ConfigFieldMeta);

export const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string().meta({ description: "Name shown for this test resource" } satisfies ConfigFieldMeta),
  description: z.string().exactOptional().meta({ description: "What this test checks" } satisfies ConfigFieldMeta),
  workingDirectory: z.string().exactOptional().meta({ description: "Directory the command runs in" } satisfies ConfigFieldMeta),
  command: z.string().meta({ description: "Shell command that runs the test" } satisfies ConfigFieldMeta),
  isolation: z
    .enum(["sandbox", "none"])
    .default("sandbox")
    .meta({ advanced: true, description: "Whether the command runs inside the sandbox" } satisfies ConfigFieldMeta),
  timeoutSeconds: z.number().default(120).meta({ unit: "s", advanced: true, description: "Kill the command if it runs longer than this" } satisfies ConfigFieldMeta),
  cropOutput: z.number().default(10000).meta({ unit: "chars", advanced: true, description: "Truncate command output beyond this length" } satisfies ConfigFieldMeta),
});
