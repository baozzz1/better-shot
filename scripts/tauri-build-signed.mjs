#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const localEnv = {
  ...readEnvFile(join(rootDir, ".env")),
  ...readEnvFile(join(rootDir, ".env.local")),
  ...process.env,
};
const signingIdentity =
  localEnv.APPLE_SIGNING_IDENTITY ?? localEnv.MACOS_SIGNING_IDENTITY;
const bundleIdentifier = localEnv.TAURI_BUNDLE_IDENTIFIER;

if (!signingIdentity) {
  console.error(
    [
      "Missing signing identity.",
      "",
      "Set APPLE_SIGNING_IDENTITY to a local codesigning identity, for example:",
      '  export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"',
      "",
      "You can list available identities with:",
      "  security find-identity -v -p codesigning",
    ].join("\n"),
  );
  process.exit(1);
}

const config = {
  bundle: {
    macOS: {
      signingIdentity,
    },
  },
};

if (bundleIdentifier) {
  config.identifier = bundleIdentifier;
}

const result = spawnSync(
  "pnpm",
  ["tauri", "build", "--config", JSON.stringify(config), ...process.argv.slice(2)],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) {
          return null;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");

        return [key, value];
      })
      .filter(Boolean),
  );
}
