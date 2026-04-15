"use client";

import { Package, ShoppingCart, Store, Truck } from "lucide-react";

type ShopImmersiveScreenProps = {
  installed: boolean;
};

const SHOPPING_LIST = [
  { title: "AA batteries, 24-pack", qty: 1, note: "Reorder candidate" },
  { title: "Paper towels", qty: 2, note: "Restock office kitchen" },
  { title: "USB-C cables", qty: 3, note: "Awaiting user confirmation" },
];

const ORDER_HISTORY = [
  {
    title: "Standing desk mat",
    status: "Delivered",
    date: "Mar 28, 2026",
    detail: "Reorder available",
  },
  {
    title: "Portable monitor",
    status: "Returned",
    date: "Mar 21, 2026",
    detail: "Refund to original payment method",
  },
  {
    title: "Mechanical keyboard switches",
    status: "Shipped",
    date: "Apr 04, 2026",
    detail: "Arrives tomorrow",
  },
];

export function ShopImmersiveScreen({
  installed,
}: ShopImmersiveScreenProps) {
  const mutedClass = installed ? "" : "opacity-45 grayscale";

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_top,#3a1a0f_0%,#190a06_42%,#060302_100%)] text-[#fff6ef]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(255,214,176,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,214,176,0.12)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_54%,rgba(0,0,0,0.34)_100%)]" />

      <div className="relative flex min-h-full flex-col gap-6 px-10 py-8 pb-14">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.32em] text-[#ffd8b2]/70">
              <Store className="h-4 w-4" />
              OpenClaw Shop
            </div>
            <div className="mt-3 text-[13px] uppercase tracking-[0.24em] text-[#ffbf93]/62">
              Amazon ordering desk
            </div>
            <div className="mt-2 text-[42px] font-semibold tracking-[0.08em] text-[#fff6ef]">
              {installed ? "Ready to shop" : "Skill required"}
            </div>
            <div className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#ffd9c0]/78">
              Review pending shopping items, recent Amazon history, and workflow notes from the
              in-office shop.
            </div>
          </div>
          <div className="w-[320px] rounded-[24px] border border-[#ffd1ae]/18 bg-black/24 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#ffd1aa]/62">
              <ShoppingCart className="h-4 w-4" />
              Shop controls
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryCard label="Skill" value={installed ? "Installed" : "Missing"} />
              <SummaryCard label="Store" value="Amazon" />
              <SummaryCard label="Queued items" value={String(SHOPPING_LIST.length)} />
              <SummaryCard label="Recent orders" value={String(ORDER_HISTORY.length)} />
            </div>
            <div className="mt-4 rounded-2xl border border-[#ffd1ae]/12 bg-[#160b08]/85 px-4 py-3 text-[12px] leading-relaxed text-[#ffd9c0]/72">
              {installed
                ? "Agents can walk here when the AMAZON-ORDERING skill trigger fires."
                : "Install AMAZON-ORDERING to let agents use the shop and Amazon workflow."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.95fr]">
          <SectionCard
            title="Shopping List"
            subtitle="Pending Amazon items and quick notes for the next run."
            className={mutedClass}
          >
            <div className="space-y-3">
              {SHOPPING_LIST.map((item, index) => (
                <ListRow
                  key={item.title}
                  title={`Item ${String(index + 1).padStart(2, "0")} · ${item.title}`}
                  primary={`Qty ${item.qty}`}
                  secondary={item.note}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Amazon History"
            subtitle="Past purchases, shipment states, and return outcomes."
          >
            <div className="space-y-3">
              {ORDER_HISTORY.map((item, index) => (
                <ListRow
                  key={`${item.title}:${item.date}`}
                  title={`Order ${String(index + 1).padStart(2, "0")} · ${item.title}`}
                  primary={item.status}
                  secondary={`${item.date} · ${item.detail}`}
                />
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Shop Workflow"
            subtitle="How agents should use the in-office shopping station."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <WorkflowCard
                icon={<ShoppingCart className="h-5 w-5" />}
                title="New order"
                body="Open product page, share a screenshot with price, wait for approval, then place the order."
              />
              <WorkflowCard
                icon={<Package className="h-5 w-5" />}
                title="Reorder"
                body="Search order history, use Buy it again, verify address and payment, and place the order."
              />
              <WorkflowCard
                icon={<Truck className="h-5 w-5" />}
                title="Return"
                body="Follow the silent return flow and report item, refund amount, and drop-off details."
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Install Requirement"
            subtitle="This office station is intentionally gated behind the packaged Amazon skill."
          >
            <div className="rounded-2xl border border-[#ffd1ae]/12 bg-[#160b08]/85 px-5 py-4 text-[14px] leading-relaxed text-[#ffe6d4]/80">
              <p>
                The shop UI can always be opened, but shopping actions should only be considered
                available once <span className="font-semibold text-[#fff4ea]">AMAZON-ORDERING</span>{" "}
                is installed and enabled for the selected agent.
              </p>
              <p className="mt-3">
                When the skill is missing, the shopping list stays grayed out to match the jukebox
                disabled pattern.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-[#ffd1ae]/16 bg-black/20 p-6 ${className}`}>
      <div>
        <div className="text-[12px] uppercase tracking-[0.24em] text-[#ffd5b2]/64">{title}</div>
        <div className="mt-2 text-[14px] text-[#ffe2cf]/74">{subtitle}</div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ffd1ae]/10 bg-[#160b08]/78 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#ffbc8d]/58">{label}</div>
      <div className="mt-2 text-[16px] text-[#fff5ec]">{value}</div>
    </div>
  );
}

function ListRow({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ffd1ae]/10 bg-[#160b08]/78 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-[13px] uppercase tracking-[0.12em] text-[#fff2e8]">
          {title}
        </div>
        <div className="mt-1 text-[11px] text-[#ffd0b0]/66">{secondary}</div>
      </div>
      <div className="shrink-0 text-right text-[15px] text-[#fff5ec]">{primary}</div>
    </div>
  );
}

function WorkflowCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ffd1ae]/10 bg-[#160b08]/78 px-4 py-4">
      <div className="flex items-center gap-2 text-[#ffe7d4]">{icon}</div>
      <div className="mt-3 text-[12px] uppercase tracking-[0.18em] text-[#fff3e7]">{title}</div>
      <div className="mt-2 text-[13px] leading-relaxed text-[#ffd8c1]/74">{body}</div>
    </div>
  );
}
