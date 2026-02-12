"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";

const BACKEND_BASE_URL = "http://localhost:4000";

interface Fundraiser {
    id: string;
    title: string;
    description: string;
    goal: number;
    raised: number;
    creator: string;
    deadline: string;
    category: string;
}

export default function FundraisersPage() {
    const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [goal, setGoal] = useState("");
    const [category, setCategory] = useState("Club");
    const [deadline, setDeadline] = useState("");

    useEffect(() => {
        // Reconnect Pera Wallet
        const pera = new PeraWalletConnect();
        pera.reconnectSession().then((accounts) => {
            if (accounts.length > 0) setAddress(accounts[0]);
        });

        const fetchFundraisers = async () => {
            try {
                const resp = await fetch(`${BACKEND_BASE_URL}/api/fundraisers`);
                if (resp.ok) {
                    const data = await resp.json();
                    setFundraisers(data);
                }
            } catch (e) {
                console.error("Failed to fetch fundraisers", e);
            } finally {
                setLoading(false);
            }
        };
        fetchFundraisers();
    }, []);

    const createFundraiser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) return;
        setCreating(true);
        try {
            const resp = await fetch(`${BACKEND_BASE_URL}/api/fundraiser/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    goal: Number(goal),
                    creator: address,
                    deadline,
                    category,
                }),
            });
            if (resp.ok) {
                const newFR = await resp.json();
                setFundraisers((prev) => [...prev, newFR]);
                setShowModal(false);
                setTitle("");
                setDescription("");
                setGoal("");
                setDeadline("");
            }
        } catch (e) {
            alert("Failed to create fundraiser");
        } finally {
            setCreating(false);
        }
    };

    const contribute = async (fr: Fundraiser) => {
        if (!address) return;
        const amountStr = prompt(`How many CAMPUS tokens would you like to contribute to "${fr.title}"?`);
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

        try {
            // 1. On-chain transaction via Pera Wallet
            const campusIdStr = process.env.NEXT_PUBLIC_CAMPUS_TOKEN_ID;
            if (!campusIdStr) throw new Error("CAMPUS token ID not found");
            const assetId = Number(campusIdStr);

            const algod = new algosdk.Algodv2("", process.env.NEXT_PUBLIC_ALGOD_SERVER!, "");
            const params = await algod.getTransactionParams().do();

            const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                from: address,
                to: fr.creator,
                amount: amount,
                assetIndex: assetId,
                suggestedParams: params,
            });

            const pera = new PeraWalletConnect();
            const signedTxnData = await pera.signTransaction([
                { txn: Buffer.from(txn.toByte()).toString("base64") } as any,
            ]);
            const signedTx = (signedTxnData[0] as any);
            const decoded = new Uint8Array(Buffer.from(signedTx, "base64"));
            const result = await algod.sendRawTransaction(decoded).do();

            alert(`Transaction sent! Waiting for confirmation...\nFee: 0.001 ALGO (Standard Algorand Fee)`);
            await algosdk.waitForConfirmation(algod, result.txId, 4);

            // 2. Notify backend
            const resp = await fetch(`${BACKEND_BASE_URL}/api/fundraiser/${fr.id}/contribute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });

            if (resp.ok) {
                const updated = await resp.json();
                setFundraisers((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
                alert("Thank you for your contribution!");
            }
        } catch (e: any) {
            alert(e.message || "Contribution failed");
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-white">
                            Campus <span className="text-emerald-500">Fundraisers</span>
                        </h1>
                        <p className="text-slate-400">Support student clubs, causes, and innovative projects on-chain.</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="rounded-2xl bg-white text-slate-950 px-8 py-4 font-bold hover:scale-105 transition-all shadow-xl shadow-white/5 active:scale-95"
                    >
                        + Start a Campaign
                    </button>
                </header>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin text-emerald-500 text-4xl">🔄</div>
                    </div>
                ) : fundraisers.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-900 rounded-3xl">
                        <p className="text-slate-500 italic">No active fundraisers yet. Be the first to start one!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {fundraisers.map((fr) => {
                            const progress = Math.min(100, (fr.raised / fr.goal) * 100);
                            return (
                                <div key={fr.id} className="group p-1 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 hover:from-emerald-500/20 hover:to-cyan-500/20 transition-all duration-500">
                                    <div className="h-full bg-slate-950 p-6 rounded-[1.9rem] flex flex-col justify-between space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <span className="px-3 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-bold uppercase tracking-widest">
                                                    {fr.category}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500">ID: {fr.id}</span>
                                            </div>
                                            <h2 className="text-2xl font-bold group-hover:text-emerald-400 transition-colors line-clamp-2">{fr.title}</h2>
                                            <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">{fr.description}</p>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-900">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-sm font-bold text-white">{fr.raised} <span className="text-[10px] text-slate-500 font-medium">/ {fr.goal} CAMPUS</span></p>
                                                    <p className="text-xs font-bold text-emerald-400">{Math.round(progress)}%</p>
                                                </div>
                                                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                                                <span>🗓️ {fr.deadline}</span>
                                                <span>🛡️ Verified Cause</span>
                                            </div>

                                            <button
                                                onClick={() => contribute(fr)}
                                                disabled={!address}
                                                className="w-full rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 py-3.5 font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                            >
                                                {address ? "Contribute" : "Connect Wallet"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                    <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold italic tracking-tight uppercase">Launch Campaign</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors text-xl font-bold">✕</button>
                        </div>

                        <form onSubmit={createFundraiser} className="space-y-5">
                            <div className="space-y-4">
                                <input
                                    required
                                    placeholder="Campaign Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                />
                                <textarea
                                    required
                                    placeholder="Tell your story. Why should people support you?"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Goal (CAMPUS)</label>
                                        <input
                                            required
                                            type="number"
                                            placeholder="e.g. 500"
                                            value={goal}
                                            onChange={(e) => setGoal(e.target.value)}
                                            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Deadline</label>
                                        <input
                                            required
                                            placeholder="e.g. Dec 31st"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Club">Club / Society</option>
                                        <option value="Charity">Charity / Cause</option>
                                        <option value="Research">Academic Research</option>
                                        <option value="Personal">Personal Project</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <button
                                    type="submit"
                                    disabled={creating || !address}
                                    className="w-full rounded-2xl bg-emerald-500 text-slate-950 py-4 font-bold transition-all disabled:opacity-40 shadow-xl shadow-emerald-500/20 active:scale-95"
                                >
                                    {creating ? "Deploying..." : "Launch on Algorand 🚀"}
                                </button>
                                <p className="text-[10px] text-center text-slate-500 italic">
                                    Fee: 0.001 ALGO | Transactions are immutable and transparent.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
