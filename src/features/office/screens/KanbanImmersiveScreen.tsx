"use client";

import type { ComponentProps } from "react";
import { X } from "lucide-react";

import type { AgentState } from "@/features/agents/state/store";
import { TaskBoardView } from "@/features/office/tasks/TaskBoardView";
import type { TaskBoardCard, TaskBoardStatus } from "@/features/office/tasks/types";
import type { CronJobSummary } from "@/lib/cron/types";

export function KanbanImmersiveScreen({
  agents,
  cardsByStatus,
  selectedCard,
  activeRuns,
  cronJobs,
  cronLoading,
  cronError,
  taskCaptureDebug,
  onCreateCard,
  onMoveCard,
  onSelectCard,
  onUpdateCard,
  onDeleteCard,
  onRefreshCronJobs,
  onClose,
}: {
  agents: AgentState[];
  cardsByStatus: Record<TaskBoardStatus, TaskBoardCard[]>;
  selectedCard: TaskBoardCard | null;
  activeRuns: Array<{ runId: string; agentId: string; label: string }>;
  cronJobs: CronJobSummary[];
  cronLoading: boolean;
  cronError: string | null;
  taskCaptureDebug?: ComponentProps<typeof TaskBoardView>["taskCaptureDebug"];
  onCreateCard: () => void;
  onMoveCard: (cardId: string, status: TaskBoardStatus) => void;
  onSelectCard: (cardId: string | null) => void;
  onUpdateCard: (cardId: string, patch: Partial<TaskBoardCard>) => void;
  onDeleteCard: (cardId: string) => void;
  onRefreshCronJobs: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[min(75vh,800px)] w-[min(80vw,1280px)] flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0e0b07]/85 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-amber-500/15 bg-[#0e0b07]/60 px-6 py-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-200/85">
              Kanban Board
            </div>
            <div className="mt-1 font-mono text-[12px] text-white/50">
              Headquarters task routing, scheduling, and review.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <TaskBoardView
            title="Kanban"
            subtitle="Manual tasks, inferred requests, and scheduled playbooks."
            agents={agents}
            cardsByStatus={cardsByStatus}
            selectedCard={selectedCard}
            activeRuns={activeRuns}
            cronJobs={cronJobs}
            cronLoading={cronLoading}
            cronError={cronError}
            taskCaptureDebug={taskCaptureDebug}
            onCreateCard={onCreateCard}
            onMoveCard={onMoveCard}
            onSelectCard={onSelectCard}
            onUpdateCard={onUpdateCard}
            onDeleteCard={onDeleteCard}
            onRefreshCronJobs={onRefreshCronJobs}
          />
        </div>
      </div>
    </div>
  );
}
