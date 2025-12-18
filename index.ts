import {z} from "zod";

export const TestingConfigSchema = z
  .object({
    resources: z.record(z.string(), z.any()).optional(),
    default: z
      .object({
        resources: z.array(z.string()),
      })
      .optional(),
  })
  .optional();



export {default as TestingService} from "./TestingService.ts";
export {default as ShellCommandTestingResource} from "./ShellCommandTestingResource.ts";
