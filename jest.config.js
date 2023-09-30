// base config for jest shared across packages
module.exports = {
    moduleFileExtensions: [
        "js",
        "json",
        "ts"
      ],
      testRegex: ".*\\.test\\.ts$",
      transform: {
        "^.+\\.(t|j)s$": "ts-jest"
      },
      collectCoverageFrom: [
        "./src/**/*.{js,ts}",
        "!./src/**/index.{js,ts}"
      ],
      clearMocks: true,
      coveragePathIgnorePatterns: ["/node_modules/"],
      coverageDirectory: "./coverage",
      coverageReporters: ["json", "text", "lcov", "clover", "html"],
      testEnvironment: "node"
  };