"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../context/WalletContext";

const BACKEND_BASE_URL = "http://localhost:4000";

type Friend = {
  name: string;
  address: string;
};

const FRIENDS_STORAGE_KEY = "campuspay_address_book";

export default function CreateExpensePage() {
  const { address } = useWallet();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [participants, setParticipants] = useState("");
  const [includeSelf, setIncludeSelf] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({});

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendName, setFriendName] = useState("");
  const [friendAddress, setFriendAddress] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FRIENDS_STORAGE_KEY);
      if (raw) {
        setFriends(JSON.parse(raw) as Friend[]);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persistFriends = (next: Friend[]) => {
    setFriends(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(next));
    }
  };

  const addFriend = () => {
    if (!friendName.trim() || !friendAddress.trim()) return;
    const next: Friend[] = [
      ...friends,
      { name: friendName.trim(), address: friendAddress.trim() },
    ];
    persistFriends(next);
    setFriendName("");
    setFriendAddress("");
  };

  const addFriendToParticipants = (addr: string) => {
    const current = participants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!current.includes(addr)) {
      current.push(addr);
      setParticipants(current.join(", "));
    }
  };

  const participantList = (() => {
    const baseList = participants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const withSelf = includeSelf && address ? [...baseList, address] : baseList;
    return Array.from(new Set(withSelf));
  })();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Connect your wallet first.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const finalParticipants = participantList;

      if (finalParticipants.length === 0) {
        throw new Error("Add at least one participant.");
      }

      const payload: {
        creator: string;
        title?: string;
        totalAmount: number;
        participants: string[];
        shares?: Record<string, number>;
      } = {
        creator: address,
        title: title.trim() || undefined,
        totalAmount: Number(totalAmount || "0"),
        participants: finalParticipants,
      };

      // Build custom shares from per-participant inputs, if provided
      const filledShares: Record<string, number> = {};
      finalParticipants.forEach((p) => {
        const raw = shareInputs[p];
        if (raw !== undefined && raw.trim() !== "") {
          const num = Number(raw);
          if (!Number.isFinite(num) || num <= 0) {
            throw new Error(
              "All share amounts must be positive numbers (for " +
                p.slice(0, 6) +
                "...)"
            );
          }
          filledShares[p] = num;
        }
      });

      if (Object.keys(filledShares).length > 0) {
        if (Object.keys(filledShares).length !== finalParticipants.length) {
          throw new Error(
            "Enter a share amount for every participant, or clear them all to use equal split."
          );
        }
        const total = Object.values(filledShares).reduce(
          (sum, v) => sum + v,
          0
        );
        payload.totalAmount = total;
        payload.shares = filledShares;
      } else {
        if (!payload.totalAmount || payload.totalAmount <= 0) {
          throw new Error("Total amount must be a positive number.");
        }
      }

      const resp = await fetch(`${BACKEND_BASE_URL}/api/expense/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to create expense");
      }
      const expense = await resp.json();
      router.push(`/expense/${expense.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Create expense</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
          >
            ← Back
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Define a shared CAMPUS expense between multiple wallets. Each
          participant pays an equal share.
        </p>
        <input
          type="text"
          placeholder="Expense title (e.g. Hostel rent, Movie night)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70"
        />
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
          <p className="text-[11px] text-slate-400 font-medium">
            Friends (address book)
          </p>
          {friends.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Add frequently used addresses here to reuse them in expenses.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {friends.map((f) => (
                <button
                  key={f.address}
                  type="button"
                  onClick={() => addFriendToParticipants(f.address)}
                  className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900 text-[11px] hover:border-emerald-500/70"
                >
                  <span className="font-medium">{f.name}</span>{" "}
                  <span className="text-slate-400">
                    ({f.address.slice(0, 4)}...{f.address.slice(-4)})
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <input
              type="text"
              placeholder="Label (e.g. Alice)"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70"
            />
            <input
              type="text"
              placeholder="Algorand address"
              value={friendAddress}
              onChange={(e) => setFriendAddress(e.target.value)}
              className="flex-[2] rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70"
            />
            <button
              type="button"
              onClick={addFriend}
              className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-medium"
            >
              Save
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="number"
            placeholder="Total amount (CAMPUS) – used for equal split"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70"
          />
          <textarea
            required
            rows={3}
            placeholder="Participants (comma-separated Algorand addresses)"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70"
          />
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={includeSelf}
              onChange={(e) => setIncludeSelf(e.target.checked)}
              className="h-3 w-3 rounded border-slate-600 bg-slate-900"
            />
            Include my address ({address?.slice(0, 4)}...
            {address?.slice(-4)}) as a participant
          </label>
          {participantList.length > 0 && (
            <div className="space-y-2 border border-slate-800 rounded-lg p-3 bg-slate-950/40">
              <p className="text-[11px] text-slate-400 font-medium">
                Custom shares per participant (optional)
              </p>
              <p className="text-[11px] text-slate-500">
                Enter a CAMPUS amount in front of each address to use custom
                shares. Leave all empty to use equal split.
              </p>
              <div className="space-y-1">
                {participantList.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2 text-[11px] text-slate-300"
                  >
                    <span className="font-mono w-40 truncate">
                      {p.slice(0, 6)}...{p.slice(-6)}
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Share (CAMPUS)"
                      value={shareInputs[p] ?? ""}
                      onChange={(e) =>
                        setShareInputs((prev) => ({
                          ...prev,
                          [p]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500/70"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create expense"}
          </button>
        </form>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </main>
  );
}

