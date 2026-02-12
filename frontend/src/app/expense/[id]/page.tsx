"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { useWallet } from "../../../context/WalletContext";

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

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { address, reloadBalances } = useWallet();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${BACKEND_BASE_URL}/api/expense/${id}`);
        if (!resp.ok) {
          const data = await resp.json();
          throw new Error(data.error || "Failed to load expense");
        }
        const data = (await resp.json()) as Expense;
        setExpense(data);
      } catch (e: any) {
        setError(e.message || "Failed to load expense");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const canPay =
    !!expense &&
    !!address &&
    expense.participants.includes(address) &&
    !expense.paid[address];

  const payShare = async () => {
    if (!expense || !address) return;
    try {
      setPaying(true);
      setStatus(null);

      // Mark as paid in backend metadata
      const resp = await fetch(`${BACKEND_BASE_URL}/api/expense/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId: expense.id, sender: address }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to mark as paid");
      }

      // Perform CAMPUS ASA transfer from participant to creator
      const campusIdStr = process.env.NEXT_PUBLIC_CAMPUS_TOKEN_ID;
      if (!campusIdStr) {
        throw new Error("NEXT_PUBLIC_CAMPUS_TOKEN_ID is not set");
      }
      const assetId = Number(campusIdStr);

      const algod = new algosdk.Algodv2(
        "",
        process.env.NEXT_PUBLIC_ALGOD_SERVER!,
        ""
      );
      const paramsTx = await algod.getTransactionParams().do();

      const shareAmount =
        expense.shares?.[address] ?? expense.amountPerParticipant;

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: address,
        to: expense.creator,
        amount: shareAmount,
        assetIndex: assetId,
        suggestedParams: paramsTx,
      });

      const pera = new PeraWalletConnect();
      const [{ signedTx }] = await pera.signTransaction([
        { txn: Buffer.from(txn.toByte()).toString("base64") },
      ]);
      const decoded = new Uint8Array(Buffer.from(signedTx, "base64"));
      const { txId } = await algod.sendRawTransaction(decoded).do();
      await algosdk.waitForConfirmation(algod, txId, 4);

      setStatus(`Paid share. TxId: ${txId}`);
      await reloadBalances();

      // Reload expense to reflect payment
      const refreshed = await fetch(`${BACKEND_BASE_URL}/api/expense/${id}`);
      if (refreshed.ok) {
        setExpense((await refreshed.json()) as Expense);
      }
    } catch (e: any) {
      setStatus(e.message || "Failed to pay share");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading expense...</p>
      </main>
    );
  }

  if (error || !expense) {
    return (
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <p className="text-sm text-red-400">
          {error || "Expense not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              {expense.title || "Untitled expense"}
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              ID: {expense.id}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
          >
            ← Back
          </button>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-slate-400">Creator:</span>{" "}
            <span className="font-mono text-xs">
              {expense.creator.slice(0, 6)}...{expense.creator.slice(-6)}
            </span>
          </p>
          <p>
            <span className="text-slate-400">Total amount:</span>{" "}
            {expense.totalAmount} CAMPUS
          </p>
          <p>
            <span className="text-slate-400">Split type:</span>{" "}
            {expense.shares ? "Custom shares" : "Equal split"}
          </p>
        </div>
        <div className="border border-slate-800 rounded-xl p-3 max-h-48 overflow-auto">
          <p className="text-xs text-slate-400 mb-2">Participants</p>
          <ul className="space-y-1 text-xs">
            {expense.participants.map((p) => (
              <li key={p} className="flex items-center justify-between">
                <span className="font-mono">
                  {p.slice(0, 6)}...{p.slice(-6)}
                  {expense.shares ? (
                    <span className="ml-1 text-[10px] text-emerald-300">
                      ({expense.shares[p] ?? 0} CAMPUS)
                    </span>
                  ) : (
                    <span className="ml-1 text-[10px] text-emerald-300">
                      ({expense.amountPerParticipant} CAMPUS)
                    </span>
                  )}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    expense.paid[p]
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-300 border border-slate-600"
                  }`}
                >
                  {expense.paid[p] ? "Paid" : "Unpaid"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {canPay && (
          <button
            onClick={payShare}
            disabled={paying}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {paying ? "Paying..." : "Pay my share"}
          </button>
        )}

        {status && <p className="text-xs text-slate-300 break-all">{status}</p>}
      </div>
    </main>
  );
}

