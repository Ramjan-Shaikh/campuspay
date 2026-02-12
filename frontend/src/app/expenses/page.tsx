"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../context/WalletContext";

const BACKEND_BASE_URL = "http://localhost:4000";

interface Expense {
  id: string;
  creator: string;
  title?: string;
  totalAmount: number;
  participants: string[];
  amountPerParticipant: number;
  paid: Record<string, boolean>;
  shares?: Record<string, number>;
}

export default function ExpensesPage() {
  const { address } = useWallet();
  const router = useRouter();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!address) return;
      try {
        setLoading(true);
        setError(null);
        const resp = await fetch(
          `${BACKEND_BASE_URL}/api/expenses?wallet=${encodeURIComponent(
            address
          )}`
        );
        if (!resp.ok) {
          const data = await resp.json();
          throw new Error(data.error || "Failed to load expenses");
        }
        const data = (await resp.json()) as Expense[];
        setItems(data);
      } catch (e: any) {
        setError(e.message || "Failed to load expenses");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  return (
    <main className="min-h-screen text-slate-50 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">My expenses</h1>
            <p className="text-xs text-slate-400">
              Expenses you created or participate in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
          >
            ← Back
          </button>
        </header>

        {!address && (
          <p className="text-xs text-slate-400">
            Connect your wallet on the dashboard to see your expense history.
          </p>
        )}

        {loading && (
          <p className="text-xs text-slate-400">Loading expenses...</p>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {!loading && address && items.length === 0 && !error && (
          <p className="text-xs text-slate-400">
            No expenses found yet. Create one from the dashboard.
          </p>
        )}

        <ul className="space-y-2">
          {items.map((e) => {
            const paidCount = Object.values(e.paid).filter(Boolean).length;
            return (
              <li
                key={e.id}
                className="border border-slate-800 rounded-xl bg-slate-900/80 p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-sm">
                    {e.title || `Expense #${e.id.slice(0, 6)}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    Total: {e.totalAmount} CAMPUS •{" "}
                    {e.shares ? "Custom shares" : `Per person: ${e.amountPerParticipant} CAMPUS`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Participants: {e.participants.length} • Paid: {paidCount}/
                    {e.participants.length}
                  </p>
                </div>
                <a
                  href={`/expense/${e.id}`}
                  className="self-start inline-flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1 text-xs font-medium transition-colors"
                >
                  View
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

