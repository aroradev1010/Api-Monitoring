// jest.config.ts
import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/tests/**", "!src/index.ts"],
  // run tests serially; memory-server plays nicer with single-threaded runs
  maxWorkers: 1,
  // Increase default timeout for slow CI or cold in-memory Mongo spins
  testTimeout: 30000,
};

export default config;
