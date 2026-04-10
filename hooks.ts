import autoTest from "./hooks/autoTest.ts";

export default {
  autoTest,
};

export class AfterTestsPassed {
  readonly type = "hook";
}
