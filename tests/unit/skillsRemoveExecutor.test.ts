import { beforeEach, describe, expect, it, vi } from "vitest";

import { runSshJson } from "@/lib/ssh/gateway-host";
import { removeSkillOverSsh } from "@/lib/ssh/skills-remove";

vi.mock("@/lib/ssh/gateway-host", () => ({
  runSshJson: vi.fn(),
}));

describe("skills remove ssh executor", () => {
  const mockedRunSshJson = vi.mocked(runSshJson);

  beforeEach(() => {
    mockedRunSshJson.mockReset();
  });

  it("removes skill files via ssh", () => {
    mockedRunSshJson.mockReturnValueOnce({
      removed: true,
      removedPath: "/home/ubuntu/.openclaw/skills/github",
      source: "openclaw-managed",
    });

    const result = removeSkillOverSsh({
      sshTarget: "me@host",
      request: {
        skillKey: "github",
        source: "openclaw-managed",
        baseDir: "/home/ubuntu/.openclaw/skills/github",
        workspaceDir: "/home/ubuntu/.openclaw/workspace-main",
        managedSkillsDir: "/home/ubuntu/.openclaw/skills",
      },
    });

    expect(result).toEqual({
      removed: true,
      removedPath: "/home/ubuntu/.openclaw/skills/github",
      source: "openclaw-managed",
    });
    expect(runSshJson).toHaveBeenCalledWith(
      expect.objectContaining({
        sshTarget: "me@host",
        argv: [
          "bash",
          "-s",
          "--",
          "github",
          "openclaw-managed",
          "/home/ubuntu/.openclaw/skills/github",
          "/home/ubuntu/.openclaw/workspace-main",
          "/home/ubuntu/.openclaw/skills",
        ],
        label: "remove skill (github)",
        input: expect.stringContaining('python3 - "$1" "$2" "$3" "$4" "$5"'),
      })
    );
  });
});
