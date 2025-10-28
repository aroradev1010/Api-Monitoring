/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  testMatch: ["**/__tests__/**/*.(test|spec).[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1", // so @/context/stream etc work
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

module.exports = config;
