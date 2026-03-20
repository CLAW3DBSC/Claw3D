import { Suspense } from "react";
import { AgentStoreProvider } from "@/features/agents/state/store";
import { OfficeScreen } from "@/features/office/screens/OfficeScreen";

export default function OfficePage() {
  return (
    <AgentStoreProvider>
      <Suspense fallback={null}>
        <OfficeScreen />
      </Suspense>
    </AgentStoreProvider>
  );
}
