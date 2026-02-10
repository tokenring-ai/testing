import {z} from "zod";

export const testResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("passed"),
    startedAt: z.number(),
    finishedAt: z.number(),
    output: z.string().optional(),
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
  }),
  z.object({
    status: z.literal("error"),
    startedAt: z.number(),
    finishedAt: z.number(),
    error: z.string(),
  }),
]);

export type TestResult = z.infer<typeof testResultSchema>;

export const TestingAgentConfigSchema = z.object({
  maxAutoRepairs: z.number().optional(),
}).default({});

export const TestingServiceConfigSchema = z
  .object({
    agentDefaults: z.object({
      maxAutoRepairs: z.number().default(5),
    }).prefault({}),
    resources: z.record(z.string(), z.any()).optional(),
  }).strict().prefault({});

export const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string(),
  description: z.string().optional(),
  workingDirectory: z.string().optional(),
  command: z.string(),
  timeoutSeconds: z.number().default(120),
  cropOutput: z.number().default(10000)
})