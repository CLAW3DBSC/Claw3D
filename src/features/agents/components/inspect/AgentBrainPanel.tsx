"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";

import type { AgentState } from "@/features/agents/state/store";
import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import { parsePersonalityFiles, serializePersonalityFiles } from "@/lib/agents/personalityBuilder";
import { useAgentFilesEditor } from "@/features/agents/hooks/useAgentFilesEditor";

export type AgentBrainPanelProps = {
  client: GatewayClient;
  agents: AgentState[];
  selectedAgentId: string | null;
  onUnsavedChangesChange?: (dirty: boolean) => void;
};

const AgentBrainPanelSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-3 border-t border-border/55 pt-8 first:border-t-0 first:pt-0">
    <h3 className="text-sm font-medium text-foreground">{title}</h3>
    {children}
  </section>
);

export const AgentBrainPanel = ({
  client,
  agents,
  selectedAgentId,
  onUnsavedChangesChange,
}: AgentBrainPanelProps) => {
  const selectedAgent = useMemo(
    () =>
      selectedAgentId
        ? agents.find((entry) => entry.agentId === selectedAgentId) ?? null
        : null,
    [agents, selectedAgentId]
  );

  const {
    agentFiles,
    agentFilesLoading,
    agentFilesSaving,
    agentFilesDirty,
    agentFilesError,
    setAgentFileContent,
    saveAgentFiles,
    discardAgentFileChanges,
  } = useAgentFilesEditor({ client, agentId: selectedAgent?.agentId ?? null });
  const draft = useMemo(() => parsePersonalityFiles(agentFiles), [agentFiles]);

  const setIdentityField = useCallback(
    (field: "name" | "creature" | "vibe" | "emoji" | "avatar", value: string) => {
      const nextDraft = parsePersonalityFiles(agentFiles);
      nextDraft.identity[field] = value;
      const serialized = serializePersonalityFiles(nextDraft);
      setAgentFileContent("IDENTITY.md", serialized["IDENTITY.md"]);
    },
    [agentFiles, setAgentFileContent]
  );

  const handleSave = useCallback(async () => {
    if (agentFilesLoading || agentFilesSaving || !agentFilesDirty) return;
    await saveAgentFiles();
  }, [agentFilesDirty, agentFilesLoading, agentFilesSaving, saveAgentFiles]);

  useEffect(() => {
    onUnsavedChangesChange?.(agentFilesDirty);
  }, [agentFilesDirty, onUnsavedChangesChange]);

  useEffect(() => {
    return () => {
      onUnsavedChangesChange?.(false);
    };
  }, [onUnsavedChangesChange]);

  return (
    <div
      className="agent-inspect-panel flex min-h-0 flex-col overflow-hidden"
      data-testid="agent-personality-panel"
      style={{ position: "relative", left: "auto", top: "auto", width: "100%", height: "100%" }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
        <section
          className="mx-auto flex min-h-0 w-full max-w-[920px] flex-col"
          data-testid="agent-personality-files"
        >
          {agentFilesError ? (
            <div className="ui-alert-danger mb-4 rounded-md px-3 py-2 text-xs">
              {agentFilesError}
            </div>
          ) : null}

          <div className="mb-6 flex items-center justify-end gap-2">
            <button
              type="button"
              className="ui-btn-secondary px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:opacity-50"
              disabled={agentFilesLoading || agentFilesSaving || !agentFilesDirty}
              onClick={discardAgentFileChanges}
            >
              Discard
            </button>
            <button
              type="button"
              className="ui-btn-primary px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
              disabled={agentFilesLoading || agentFilesSaving || !agentFilesDirty}
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </button>
          </div>

          <div className="space-y-8 pb-8">
            <AgentBrainPanelSection title="Persona">
              <textarea
                aria-label="Persona"
                className="h-56 w-full resize-y rounded-md border border-border/80 bg-background px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none"
                value={agentFiles["SOUL.md"].content}
                disabled={agentFilesLoading || agentFilesSaving}
                onChange={(event) => {
                  setAgentFileContent("SOUL.md", event.target.value);
                }}
              />
            </AgentBrainPanelSection>

            <AgentBrainPanelSection title="Directives">
              <textarea
                aria-label="Directives"
                className="h-56 w-full resize-y rounded-md border border-border/80 bg-background px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none"
                value={agentFiles["AGENTS.md"].content}
                disabled={agentFilesLoading || agentFilesSaving}
                onChange={(event) => {
                  setAgentFileContent("AGENTS.md", event.target.value);
                }}
              />
            </AgentBrainPanelSection>

            <AgentBrainPanelSection title="Context">
              <textarea
                aria-label="Context"
                className="h-56 w-full resize-y rounded-md border border-border/80 bg-background px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none"
                value={agentFiles["USER.md"].content}
                disabled={agentFilesLoading || agentFilesSaving}
                onChange={(event) => {
                  setAgentFileContent("USER.md", event.target.value);
                }}
              />
            </AgentBrainPanelSection>

            <section className="space-y-3 border-t border-border/55 pt-8">
              <h3 className="text-sm font-medium text-foreground">Identity</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs text-muted-foreground">
                  Name
                  <input
                    className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none"
                    value={draft.identity.name}
                    disabled={agentFilesLoading || agentFilesSaving}
                    onChange={(event) => {
                      setIdentityField("name", event.target.value);
                    }}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs text-muted-foreground">
                  Creature
                  <input
                    className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none"
                    value={draft.identity.creature}
                    disabled={agentFilesLoading || agentFilesSaving}
                    onChange={(event) => {
                      setIdentityField("creature", event.target.value);
                    }}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs text-muted-foreground">
                  Vibe
                  <input
                    className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none"
                    value={draft.identity.vibe}
                    disabled={agentFilesLoading || agentFilesSaving}
                    onChange={(event) => {
                      setIdentityField("vibe", event.target.value);
                    }}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs text-muted-foreground">
                  Emoji
                  <input
                    className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none"
                    value={draft.identity.emoji}
                    disabled={agentFilesLoading || agentFilesSaving}
                    onChange={(event) => {
                      setIdentityField("emoji", event.target.value);
                    }}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-xs text-muted-foreground">
                Avatar
                <input
                  className="h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none"
                  value={draft.identity.avatar}
                  disabled={agentFilesLoading || agentFilesSaving}
                  onChange={(event) => {
                    setIdentityField("avatar", event.target.value);
                  }}
                />
              </label>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};
