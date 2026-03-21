"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Database,
  FileText,
  HeartPulse,
  Palette,
  Shield,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import type { AgentState } from "@/features/agents/state/store";
import { AgentAvatarEditorPanel } from "@/features/agents/components/AgentAvatarEditorPanel";
import { AgentBrainPanel } from "@/features/agents/components/inspect/AgentBrainPanel";
import type { AgentAvatarProfile } from "@/lib/avatars/profile";
import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import type { AgentFileName } from "@/lib/agents/agentFiles";
import { AGENT_FILE_META } from "@/lib/agents/agentFiles";
import { renameGatewayAgent } from "@/lib/gateway/agentConfig";

export type AgentEditorSection = "avatar" | AgentFileName;

type AgentEditorModalProps = {
  open: boolean;
  client: GatewayClient | null;
  agents: AgentState[];
  agent: AgentState;
  initialSection?: AgentEditorSection;
  onClose: () => void;
  onAvatarSave: (agentId: string, profile: AgentAvatarProfile) => Promise<void> | void;
  onRename?: (agentId: string, name: string) => Promise<boolean>;
};

const menuButtonClassName =
  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors";

const editorSections: Array<{
  id: AgentEditorSection;
  label: string;
  hint: string;
  icon: typeof Palette;
}> = [
  {
    id: "IDENTITY.md",
    label: "Identity",
    hint: AGENT_FILE_META["IDENTITY.md"].hint,
    icon: FileText,
  },
  {
    id: "avatar",
    label: "Avatar",
    hint: "Office appearance.",
    icon: Palette,
  },
  {
    id: "SOUL.md",
    label: "Soul",
    hint: AGENT_FILE_META["SOUL.md"].hint,
    icon: Brain,
  },
  {
    id: "AGENTS.md",
    label: "Agents",
    hint: AGENT_FILE_META["AGENTS.md"].hint,
    icon: Shield,
  },
  {
    id: "USER.md",
    label: "User",
    hint: AGENT_FILE_META["USER.md"].hint,
    icon: UserRound,
  },
  {
    id: "TOOLS.md",
    label: "Tools",
    hint: AGENT_FILE_META["TOOLS.md"].hint,
    icon: Wrench,
  },
  {
    id: "MEMORY.md",
    label: "Memory",
    hint: AGENT_FILE_META["MEMORY.md"].hint,
    icon: Database,
  },
  {
    id: "HEARTBEAT.md",
    label: "Heartbeat",
    hint: AGENT_FILE_META["HEARTBEAT.md"].hint,
    icon: HeartPulse,
  },
];

export const AgentEditorModal = ({
  open,
  client,
  agents,
  agent,
  initialSection = "avatar",
  onClose,
  onAvatarSave,
  onRename,
}: AgentEditorModalProps) => {
  const [activeSection, setActiveSection] = useState<AgentEditorSection>(initialSection);

  useEffect(() => {
    if (!open) return;
    setActiveSection(initialSection);
  }, [initialSection, open, agent.agentId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[145] flex items-center justify-center bg-background/88 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${agent.name}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-7xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/92 text-muted-foreground shadow-lg transition-colors hover:text-foreground"
          aria-label="Close agent editor"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="ui-panel flex h-[min(90vh,920px)] w-full overflow-hidden shadow-xs">
          <aside className="flex w-[240px] shrink-0 flex-col border-r border-border/50 bg-muted/20">
            <div className="border-b border-border/40 px-5 py-4">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Agent editor
              </div>
              <div className="mt-1 truncate text-lg font-semibold text-foreground">
                {agent.name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Edit avatar and agent brain settings from the office.
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {editorSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`${menuButtonClassName} ${
                      activeSection === section.id
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/45 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="text-sm font-medium">{section.label}</div>
                      <div className="text-xs opacity-75">{section.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            {activeSection === "avatar" ? (
              <AgentAvatarEditorPanel
                agentId={agent.agentId}
                agentName={agent.name}
                initialProfile={agent.avatarProfile}
                onCancel={onClose}
                onSave={(profile) => onAvatarSave(agent.agentId, profile)}
              />
            ) : client ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-border/40 px-6 py-4">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Agent file editor
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Edit one agent file at a time and save it through the gateway.
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <AgentBrainPanel
                    client={client}
                    agents={agents}
                    selectedAgentId={agent.agentId}
                    activeSection={activeSection}
                    onCancel={onClose}
                    onRename={
                      onRename ??
                      (async (agentId, name) => {
                        if (!client) return false;
                        try {
                          await renameGatewayAgent({ client, agentId, name });
                          return true;
                        } catch {
                          return false;
                        }
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                Connect to a gateway to edit brain files.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
