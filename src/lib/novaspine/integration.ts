import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { resolveConfigPathCandidates, resolveStateDir } from "@/lib/clawdbot/paths";

export type NovaSpineIntegrationStatus = {
  stateDir: string;
  openclawConfigPath: string | null;
  openclawDetected: boolean;
  openclawVersion: string | null;
  openclawVersionValidated: boolean;
  pythonDetected: boolean;
  pythonVersion: string | null;
  pythonSupported: boolean;
  gitDetected: boolean;
  novaspineModuleDetected: boolean;
  installRoot: string;
  repoCacheDir: string;
  memorySlot: string | null;
  contextEngineSlot: string | null;
  consciousnessEnabled: boolean;
  integrationEnabled: boolean;
  readiness:
    | "ready"
    | "integrated"
    | "missing-openclaw"
    | "missing-config"
    | "missing-python"
    | "unsupported-python"
    | "missing-git";
  messages: string[];
};

export type NovaSpineInstallResult = {
  ok: boolean;
  steps: Array<{ name: string; ok: boolean; detail: string }>;
  status: NovaSpineIntegrationStatus;
};

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  error?: string;
};

const SUPPORTED_OPENCLAW_VERSIONS = new Set(["2026.4.5", "2026.4.7", "2026.4.9"]);
const DEFAULT_NOVASPINE_REPO_URL = "https://github.com/maddwiz/NovaSpine.git";
const DEFAULT_NOVASPINE_REPO_REF = "master";
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const coerceString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const runCommand = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): CommandResult => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    timeout: INSTALL_TIMEOUT_MS,
  });
  return {
    ok: result.status === 0 && !result.error,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    status: typeof result.status === "number" ? result.status : null,
    error: result.error instanceof Error ? result.error.message : undefined,
  };
};

const readVersion = (command: string, variants: string[][]): string | null => {
  for (const args of variants) {
    const result = runCommand(command, args);
    if (!result.ok) continue;
    const output = `${result.stdout}\n${result.stderr}`.trim();
    const match = output.match(/\b\d{4}\.\d+\.\d+\b/);
    if (match) return match[0];
    if (output) return output.split(/\s+/).pop() ?? null;
  }
  return null;
};

const detectPython = (): { detected: boolean; version: string | null; supported: boolean } => {
  const version = readVersion("python3", [["--version"]]);
  if (!version) {
    return { detected: false, version: null, supported: false };
  }
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  const supported =
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    (parts[0] > 3 || (parts[0] === 3 && parts[1] >= 12));
  return { detected: true, version, supported };
};

const detectGit = (): boolean => Boolean(readVersion("git", [["--version"]]));

const detectOpenClawVersion = (): string | null =>
  readVersion("openclaw", [["--version"], ["version"]]);

const resolveOpenClawConfigPath = (env: NodeJS.ProcessEnv = process.env): string | null => {
  const candidates = resolveConfigPathCandidates(env);
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
};

const resolveNovaSpineRepoCacheDir = (env: NodeJS.ProcessEnv = process.env): string =>
  path.join(resolveStateDir(env), "claw3d", "vendor", "NovaSpine");

const resolveNovaSpineInstallRoot = (env: NodeJS.ProcessEnv = process.env): string =>
  path.join(resolveStateDir(env), "claw3d", "novaspine", "openclaw");

const detectNovaSpineModule = (): boolean => {
  const result = runCommand("python3", ["-c", "from importlib.util import find_spec; import sys; sys.exit(0 if find_spec('c3ae') else 1)"]);
  return result.ok;
};

const readOpenClawConfig = (configPath: string | null): Record<string, unknown> | null => {
  if (!configPath) return null;
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const detectPluginState = (config: Record<string, unknown> | null) => {
  const plugins = isRecord(config?.plugins) ? config.plugins : null;
  const slots = isRecord(plugins?.slots) ? plugins.slots : null;
  const entries = isRecord(plugins?.entries) ? plugins.entries : null;
  const memorySlot = coerceString(slots?.memory);
  const contextEngineSlot = coerceString(slots?.contextEngine);
  const consciousnessEntry = isRecord(entries?.["nova-consciousness"])
    ? (entries?.["nova-consciousness"] as Record<string, unknown>)
    : null;
  const consciousnessEnabled = consciousnessEntry?.enabled !== false && Boolean(consciousnessEntry);
  return {
    memorySlot,
    contextEngineSlot,
    consciousnessEnabled,
    integrationEnabled:
      memorySlot === "novaspine-memory" && contextEngineSlot === "novaspine-context",
  };
};

export const getNovaSpineIntegrationStatus = (
  env: NodeJS.ProcessEnv = process.env
): NovaSpineIntegrationStatus => {
  const stateDir = resolveStateDir(env);
  const openclawConfigPath = resolveOpenClawConfigPath(env);
  const openclawVersion = detectOpenClawVersion();
  const python = detectPython();
  const gitDetected = detectGit();
  const novaspineModuleDetected = detectNovaSpineModule();
  const config = readOpenClawConfig(openclawConfigPath);
  const pluginState = detectPluginState(config);
  const installRoot = resolveNovaSpineInstallRoot(env);
  const repoCacheDir = resolveNovaSpineRepoCacheDir(env);
  const messages: string[] = [];

  let readiness: NovaSpineIntegrationStatus["readiness"] = "ready";
  if (pluginState.integrationEnabled) {
    readiness = "integrated";
  } else if (!openclawVersion) {
    readiness = "missing-openclaw";
    messages.push("OpenClaw CLI was not detected.");
  } else if (!openclawConfigPath) {
    readiness = "missing-config";
    messages.push("OpenClaw config was not found.");
  } else if (!python.detected) {
    readiness = "missing-python";
    messages.push("Python 3 was not detected.");
  } else if (!python.supported) {
    readiness = "unsupported-python";
    messages.push("NovaSpine currently requires Python 3.12+.");
  } else if (!gitDetected) {
    readiness = "missing-git";
    messages.push("Git was not detected.");
  }

  if (openclawVersion && !SUPPORTED_OPENCLAW_VERSIONS.has(openclawVersion)) {
    messages.push(`OpenClaw ${openclawVersion} is untested; install is still allowed.`);
  }
  if (pluginState.integrationEnabled && !novaspineModuleDetected) {
    messages.push("OpenClaw is wired for NovaSpine, but the local Python module was not detected.");
  }

  return {
    stateDir,
    openclawConfigPath,
    openclawDetected: Boolean(openclawVersion),
    openclawVersion,
    openclawVersionValidated: Boolean(openclawVersion && SUPPORTED_OPENCLAW_VERSIONS.has(openclawVersion)),
    pythonDetected: python.detected,
    pythonVersion: python.version,
    pythonSupported: python.supported,
    gitDetected,
    novaspineModuleDetected,
    installRoot,
    repoCacheDir,
    memorySlot: pluginState.memorySlot,
    contextEngineSlot: pluginState.contextEngineSlot,
    consciousnessEnabled: pluginState.consciousnessEnabled,
    integrationEnabled: pluginState.integrationEnabled,
    readiness,
    messages,
  };
};

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const stepResult = (name: string, result: CommandResult): { name: string; ok: boolean; detail: string } => ({
  name,
  ok: result.ok,
  detail: [result.stdout.trim(), result.stderr.trim(), result.error?.trim()]
    .filter(Boolean)
    .join(" | ") || (result.ok ? "ok" : "command failed"),
});

const cloneOrRefreshNovaSpineRepo = (env: NodeJS.ProcessEnv, repoCacheDir: string) => {
  const repoUrl = env.CLAW3D_NOVASPINE_REPO_URL?.trim() || DEFAULT_NOVASPINE_REPO_URL;
  const repoRef = env.CLAW3D_NOVASPINE_REPO_REF?.trim() || DEFAULT_NOVASPINE_REPO_REF;
  ensureDir(path.dirname(repoCacheDir));
  if (!fs.existsSync(path.join(repoCacheDir, ".git"))) {
    return runCommand("git", ["clone", "--depth", "1", "--branch", repoRef, repoUrl, repoCacheDir], { env });
  }
  const fetch = runCommand("git", ["-C", repoCacheDir, "fetch", "--depth", "1", "origin", repoRef], { env });
  if (!fetch.ok) return fetch;
  return runCommand("git", ["-C", repoCacheDir, "checkout", "-B", "claw3d-bundled", "FETCH_HEAD"], { env });
};

const installNovaSpinePythonPackage = (env: NodeJS.ProcessEnv) =>
  runCommand("python3", ["-m", "pip", "install", "--user", "--upgrade", env.CLAW3D_NOVASPINE_PIP_SPEC?.trim() || "novaspine"], { env });

const installOpenClawIntegration = (params: {
  env: NodeJS.ProcessEnv;
  repoCacheDir: string;
  configPath: string;
  installRoot: string;
}) =>
  runCommand(
    "bash",
    [
      path.join(params.repoCacheDir, "scripts", "install-openclaw.sh"),
      "--install-root",
      params.installRoot,
      "--config",
      params.configPath,
      "--force-slots",
      "--skip-validate",
    ],
    {
      env: {
        ...params.env,
        NOVASPINE_OPENCLAW_HOME: params.installRoot,
      },
    }
  );

const validateOpenClawConfig = (env: NodeJS.ProcessEnv) =>
  runCommand("openclaw", ["config", "validate"], { env });

const runNovaSpineDoctor = (env: NodeJS.ProcessEnv) =>
  runCommand("python3", ["-m", "c3ae.cli", "doctor", "--skip-api-check"], { env });

export const installNovaSpineIntoOpenClaw = (
  env: NodeJS.ProcessEnv = process.env
): NovaSpineInstallResult => {
  const initial = getNovaSpineIntegrationStatus(env);
  if (initial.readiness === "integrated") {
    return {
      ok: true,
      steps: [{ name: "status", ok: true, detail: "NovaSpine is already integrated." }],
      status: initial,
    };
  }
  if (!initial.openclawDetected || !initial.openclawConfigPath) {
    return {
      ok: false,
      steps: [{ name: "preflight", ok: false, detail: "OpenClaw CLI/config not detected." }],
      status: initial,
    };
  }
  if (!initial.pythonDetected || !initial.pythonSupported) {
    return {
      ok: false,
      steps: [{ name: "preflight", ok: false, detail: "Python 3.12+ is required for NovaSpine." }],
      status: initial,
    };
  }
  if (!initial.gitDetected) {
    return {
      ok: false,
      steps: [{ name: "preflight", ok: false, detail: "Git is required to fetch the bundled NovaSpine source cache." }],
      status: initial,
    };
  }

  const steps: NovaSpineInstallResult["steps"] = [];
  const clone = cloneOrRefreshNovaSpineRepo(env, initial.repoCacheDir);
  steps.push(stepResult("repo-sync", clone));
  if (!clone.ok) {
    return { ok: false, steps, status: getNovaSpineIntegrationStatus(env) };
  }

  const pipInstall = installNovaSpinePythonPackage(env);
  steps.push(stepResult("python-package", pipInstall));
  if (!pipInstall.ok) {
    return { ok: false, steps, status: getNovaSpineIntegrationStatus(env) };
  }

  const install = installOpenClawIntegration({
    env,
    repoCacheDir: initial.repoCacheDir,
    configPath: initial.openclawConfigPath,
    installRoot: initial.installRoot,
  });
  steps.push(stepResult("openclaw-install", install));
  if (!install.ok) {
    return { ok: false, steps, status: getNovaSpineIntegrationStatus(env) };
  }

  const validateConfig = validateOpenClawConfig(env);
  steps.push(stepResult("openclaw-validate", validateConfig));

  const doctor = runNovaSpineDoctor(env);
  steps.push(stepResult("novaspine-doctor", doctor));

  const status = getNovaSpineIntegrationStatus(env);
  return {
    ok: status.integrationEnabled,
    steps,
    status,
  };
};
