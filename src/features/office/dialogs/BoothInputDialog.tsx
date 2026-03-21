"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PhoneCall,
  MessageSquareText,
  Loader2,
  Delete,
  UserPlus,
  Clock,
  Users,
  X,
  Check,
  Phone,
  MessageSquare,
  Eye,
  EyeOff,
  ChevronLeft,
} from "lucide-react";
import type { MockPhoneCallScenario } from "@/lib/office/call/types";
import type { MockTextMessageScenario } from "@/lib/office/text/types";
import {
  loadContacts,
  loadHistory,
  addContact,
  addHistoryEntry,
  findContactByPhone,
  formatRelativeTime,
  type BoothContact,
  type BoothHistoryEntry,
} from "@/lib/office/boothContacts";

type Props =
  | { kind: "phone"; onSuccess: (scenario: MockPhoneCallScenario) => void; onClose: () => void }
  | { kind: "sms"; onSuccess: (scenario: MockTextMessageScenario) => void; onClose: () => void };

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "⌫"],
];

// ── Add Contact overlay ────────────────────────────────────────────────────────

function AddContactModal({
  initialPhone,
  onSave,
  onClose,
}: {
  initialPhone: string;
  onSave: (c: BoothContact) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-white/10 bg-[#0b1a2e] p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-wide text-slate-100">New Contact</span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500/50"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 867-5309"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500/50"
          />
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-xs uppercase tracking-widest text-slate-400 hover:border-white/20 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim() || !phone.trim()}
            onClick={() => { const c = addContact(name.trim(), phone.trim()); onSave(c); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-600/25 py-3 text-xs uppercase tracking-widest text-sky-200 hover:bg-sky-600/35 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BoothInputDialog(props: Props) {
  const { kind, onClose } = props;
  const isPhone = kind === "phone";

  const [digits, setDigits] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [tab, setTab] = useState<"contacts" | "recent">("contacts");
  const [contacts, setContacts] = useState<BoothContact[]>([]);
  const [history, setHistory] = useState<BoothHistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    setContacts(loadContacts());
    setHistory(loadHistory());
  }, []);

  const refreshContacts = useCallback(() => setContacts(loadContacts()), []);

  const fullNumber = digits.trim();

  const pressKey = (key: string) => {
    if (key === "⌫") setDigits((d) => d.slice(0, -1));
    else if (digits.length < 20) setDigits((d) => d + key);
  };

  const selectContact = (c: BoothContact) => { setDigits(c.phone); };
  const selectHistory = (h: BoothHistoryEntry) => { setDigits(h.phone); if (h.message) setMessage(h.message); };

  const filteredContacts = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  );
  const filteredHistory = history.filter(
    (h) => (h.name ?? "").toLowerCase().includes(search.toLowerCase()) || h.phone.includes(search),
  );

  const handleSubmit = async () => {
    if (!fullNumber) return;
    setLoading(true);
    setError(null);
    try {
      const url = isPhone ? "/api/office/call" : "/api/office/text";
      const body = isPhone
        ? { callee: fullNumber, message: message.trim() || null }
        : { recipient: fullNumber, message: message.trim() || null };

      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { scenario?: unknown; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Something went wrong."); return; }

      addHistoryEntry({
        kind: isPhone ? "call" : "sms",
        name: findContactByPhone(fullNumber)?.name ?? null,
        phone: fullNumber,
        message: message.trim() || null,
      });
      setHistory(loadHistory());
      setSuccess(true);

      setTimeout(() => {
        if (isPhone) (props as Extract<Props, { kind: "phone" }>).onSuccess(data.scenario as MockPhoneCallScenario);
        else (props as Extract<Props, { kind: "sms" }>).onSuccess(data.scenario as MockTextMessageScenario);
      }, 700);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#060f1d]">

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center gap-4 border-b border-white/[0.06] px-6">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.07] hover:text-slate-200"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isPhone ? "bg-emerald-500/15" : "bg-sky-500/15"}`}>
          {isPhone
            ? <Phone className="h-4 w-4 text-emerald-400" />
            : <MessageSquare className="h-4 w-4 text-sky-400" />}
        </div>

        <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-200">
          {isPhone ? "Phone Booth" : "SMS Booth"}
        </span>

        <div className="flex-1" />

        <button
          title={privacyMode ? "Show numbers" : "Hide numbers"}
          onClick={() => setPrivacyMode((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/[0.07] hover:text-slate-300"
        >
          {privacyMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-500 transition-all hover:border-white/[0.15] hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── BODY (3 colonnes) ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* ── COL 1 : CONTACTS / RÉCENTS ────────────────────────────────────── */}
        <div className="flex w-72 shrink-0 flex-col border-r border-white/[0.05] bg-[#050d1a]">

          {/* Tabs */}
          <div className="mx-4 mt-5 mb-3 flex rounded-xl bg-white/[0.04] p-0.5">
            {(["contacts", "recent"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[11px] font-medium uppercase tracking-wider transition-all ${
                  tab === t ? "bg-white/[0.09] text-slate-100" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "contacts" ? <Users className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {t === "contacts" ? "Contacts" : "Recent"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mx-4 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500/30"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {tab === "contacts" ? (
              filteredContacts.length === 0
                ? <p className="mt-12 text-center text-[12px] text-slate-600">No contacts yet</p>
                : filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectContact(c)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-[13px] font-bold text-sky-400">
                      {c.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-slate-200">{c.name}</div>
                      <div className="truncate font-mono text-[11px] text-slate-500">
                        {privacyMode ? "••• ••• ••••" : c.phone}
                      </div>
                    </div>
                  </button>
                ))
            ) : (
              filteredHistory.length === 0
                ? <p className="mt-12 text-center text-[12px] text-slate-600">No recent activity</p>
                : filteredHistory.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => selectHistory(h)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${h.kind === "call" ? "bg-emerald-500/10" : "bg-violet-500/10"}`}>
                      {h.kind === "call"
                        ? <Phone className="h-3.5 w-3.5 text-emerald-500" />
                        : <MessageSquare className="h-3.5 w-3.5 text-violet-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-slate-200">
                        {h.name ?? (privacyMode ? "••• ••• ••••" : h.phone)}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[10px] text-slate-600">
                          {privacyMode ? "•••" : (h.message ?? h.phone)}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-700">{formatRelativeTime(h.timestamp)}</span>
                      </div>
                    </div>
                  </button>
                ))
            )}
          </div>

          {/* Add contact */}
          <div className="border-t border-white/[0.05] p-3">
            <button
              onClick={() => setShowAddContact(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] py-2.5 text-[11px] uppercase tracking-widest text-slate-500 transition-colors hover:border-white/[0.12] hover:text-slate-300"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Contact
            </button>
          </div>
        </div>

        {/* ── COL 2 : COMPOSITION ──────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col px-10 py-8">

          {/* Number display */}
          <div className="mb-1">
            <label className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-slate-600">
              {isPhone ? "Call" : "Send to"}
            </label>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-5">
              <div className="font-mono text-3xl font-light tracking-[0.18em] text-slate-100">
                {digits
                  ? (privacyMode ? "••• ••• ••••" : digits)
                  : <span className="text-2xl font-sans tracking-normal text-slate-700">(555) 867-5309</span>}
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="mt-6 flex flex-1 flex-col">
            <label className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-slate-600">
              {isPhone ? "Voice message" : "Message"}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isPhone ? "Tell them I'll be late…" : "Hey, just checking in…"}
              className="flex-1 w-full resize-none rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5 text-[15px] leading-7 text-slate-200 placeholder-slate-700 outline-none transition focus:border-sky-500/25 focus:bg-white/[0.05]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-[13px] text-red-400">
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            disabled={!digits.trim() || loading || success}
            onClick={handleSubmit}
            className={`mt-5 flex h-14 items-center justify-center gap-3 rounded-2xl border text-[13px] font-semibold uppercase tracking-[0.22em] transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              success
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : isPhone
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/18"
                : "border-sky-500/25 bg-sky-500/10 text-sky-300 hover:border-sky-500/40 hover:bg-sky-500/18"
            }`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" />
              : success ? <Check className="h-5 w-5" />
              : isPhone ? <PhoneCall className="h-5 w-5" />
              : <MessageSquareText className="h-5 w-5" />}
            {success ? "Done!" : isPhone ? "Call" : "Send SMS"}
          </button>
        </div>

        {/* ── COL 3 : PAVÉ NUMÉRIQUE ──────────────────────────────────────── */}
        <div className="flex w-72 shrink-0 flex-col items-center justify-center border-l border-white/[0.05] bg-[#050d1a] px-8 py-8">
          <div className="grid w-full grid-cols-3 gap-3">
            {KEYPAD_ROWS.flat().map((key) => (
              <button
                key={key}
                onClick={() => pressKey(key)}
                className={`flex h-16 items-center justify-center rounded-2xl border text-xl font-light transition-all active:scale-95 ${
                  key === "⌫"
                    ? "border-white/[0.06] bg-white/[0.03] text-slate-500 hover:bg-white/[0.07] hover:text-slate-300"
                    : "border-white/[0.07] bg-white/[0.04] text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.09]"
                }`}
              >
                {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Add contact overlay */}
      {showAddContact && (
        <AddContactModal
          initialPhone={digits}
          onSave={() => { refreshContacts(); setShowAddContact(false); }}
          onClose={() => setShowAddContact(false)}
        />
      )}
    </div>
  );
}
