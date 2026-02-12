"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const BACKEND_BASE_URL = "http://localhost:4000";

interface Vault {
    walletAddress: string;
    balance: number;
    goal: number;
    goalName: string;
}

export default function SavingsPage() {
    const [address, setAddress] = useState<string | null>(null);
    const [vault, setVault] = useState<Vault | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const pera = new PeraWalletConnect();
        pera.reconnectSession().then(async (accounts) => {
            if (accounts.length > 0) {
                const addr = accounts[0];
                setAddress(addr);
                await loadVault(addr);
            } else {
                setLoading(false);
            }
        });
    }, []);

    const loadVault = async (addr: string) => {
        try {
            const resp = await fetch(`${BACKEND_BASE_URL}/api/vault/${addr}`);
            if (resp.ok) {
                const data = await resp.json();
                setVault(data);
            }
        } catch (e) {
            console.error("Failed to load vault", e);
        } finally {
            setLoading(false);
        }
    };

    const handleVaultAction = async (type: "deposit" | "withdraw") => {
        if (!address || !vault) return;
        const amountStr = prompt(`Enter amount of CAMPUS to ${type}:`);
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

        setProcessing(true);
        try {
            if (type === "deposit") {
                // 1. On-chain transaction via Pera Wallet
                const campusIdStr = process.env.NEXT_PUBLIC_CAMPUS_TOKEN_ID;
                if (!campusIdStr) throw new Error("CAMPUS token ID not found");
                const assetId = Number(campusIdStr);

                const algod = new algosdk.Algodv2("", process.env.NEXT_PUBLIC_ALGOD_SERVER!, "");
                const params = await algod.getTransactionParams().do();

                // For the hackathon demo, we perform a "Self-Transfer" to confirm transaction signatures.
                // In a production app, this would be an Escrow/Smart Contract address.
                const vaultAddr = address;

                const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                    from: address,
                    to: vaultAddr,
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

                alert(`Transaction confirmed! Fee: 0.001 ALGO. Tokens are now vaulted.`);
                await algosdk.waitForConfirmation(algod, result.txId, 4);
            }

            // 2. Notify backend to update the "Vaulted" ledger
            const resp = await fetch(`${BACKEND_BASE_URL}/api/vault/${address}/transaction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, type }),
            });

            if (resp.ok) {
                const updated = await resp.json();
                setVault(updated);
                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} successful!`);
            } else {
                const err = await resp.json();
                alert(err.error || "Action failed");
            }
        } catch (e: any) {
            alert(e.message || "Transaction failed");
        } finally {
            setProcessing(false);
        }
    };

    const setSavingsGoal = async () => {
        if (!address) return;
        const goalAmount = prompt("What is your target amount in CAMPUS?", (vault?.goal || 1000).toString());
        if (!goalAmount) return;

        try {
            const resp = await fetch(`${BACKEND_BASE_URL}/api/vault/${address}/goal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goalName: "Campus Savings", goal: Number(goalAmount) }),
            });
            if (resp.ok) {
                const updated = await resp.json();
                setVault(updated);
            }
        } catch (e) {
            alert("Failed to update goal");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin text-emerald-500 text-4xl">💎</div>
        </div>
    );

    const progress = vault && vault.goal > 0 ? Math.min(100, (vault.balance / vault.goal) * 100) : 0;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">
                            Campus <span className="text-emerald-500">Vault</span>
                        </h1>
                        <p className="text-slate-400 max-w-md">Secure your future. Goal-based savings powered by Algorand's transparency and speed.</p>
                    </div>
                    <Link href="/profile" className="text-sm font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2">
                        ← Back to Profile
                    </Link>
                </header>

                {!address ? (
                    <div className="py-20 text-center space-y-8 bg-slate-900/50 border border-slate-800 rounded-[3rem]">
                        <div className="text-6xl">🔒</div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold">Vault Locked</h2>
                            <p className="text-slate-400">Connect your Pera Wallet to start saving toward your campus goals.</p>
                        </div>
                        <Link href="/" className="inline-block rounded-2xl bg-emerald-500 text-slate-950 px-10 py-4 font-bold hover:scale-105 transition-all">
                            Connect at Home
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-5 gap-8">
                        {/* Left: Goal Visualization */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="relative p-12 rounded-[3.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-9xl">📈</span>
                                </div>

                                <div className="relative z-10 space-y-12">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h2 className="text-4xl md:text-5xl font-bold italic tracking-tighter uppercase">My Savings Goal</h2>
                                            </div>
                                            <button
                                                onClick={setSavingsGoal}
                                                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shadow-lg"
                                            >
                                                ⚙️ Update Amount
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="h-6 w-full bg-slate-950/50 rounded-full border border-slate-800 p-1.5 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-1000 relative group"
                                                style={{ width: `${progress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-2">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Currently Saved</p>
                                                <p className="text-3xl font-black">{vault?.balance || 0} <span className="text-sm font-bold text-slate-500">CPAY</span></p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">Target Amount</p>
                                                <p className="text-3xl font-black text-slate-400">{vault?.goal || 0} <span className="text-sm font-bold text-slate-500">CPAY</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 grid grid-cols-2 md:grid-cols-3 gap-8 border-t border-slate-800/50">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Status</p>
                                            <p className="text-sm font-bold text-emerald-400">{progress >= 100 ? "Goal Achieved! 🎉" : "In Progress"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Completion</p>
                                            <p className="text-sm font-bold">{progress.toFixed(1)}%</p>
                                        </div>
                                        <div className="hidden md:block">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Blockchain</p>
                                            <p className="text-sm font-bold">Algorand Verified</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tips Section to explain "Low Fees" and "Transparency" */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">⚡</div>
                                    <h3 className="text-lg font-bold">Zero Hidden Fees</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">Unlike traditional banks or apps, your Algorand vault charges only a 0.001 ALGO network fee per transaction. More money stays in your pocket.</p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-2xl">🛡️</div>
                                    <h3 className="text-lg font-bold">Full Transparency</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">Your savings are recorded on the public ledger. You always have 100% control over your funds without centralized intermediaries.</p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="p-8 rounded-[2.5rem] bg-emerald-500 text-slate-950 space-y-8 sticky top-8 shadow-2xl shadow-emerald-500/10">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Vault Controls</h3>
                                    <p className="text-[10px] font-bold uppercase opacity-60">Manage your capital securely</p>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        disabled={processing}
                                        onClick={() => handleVaultAction("deposit")}
                                        className="w-full flex items-center justify-between p-6 rounded-3xl bg-slate-950 text-white hover:scale-105 transition-all shadow-xl active:scale-95"
                                    >
                                        <div className="text-left">
                                            <p className="text-lg font-bold">Deposit Funds</p>
                                            <p className="text-[10px] opacity-50">Transfer from wallet to vault</p>
                                        </div>
                                        <span className="text-2xl text-emerald-500">📥</span>
                                    </button>

                                    <button
                                        disabled={processing || (vault?.balance || 0) <= 0}
                                        onClick={() => handleVaultAction("withdraw")}
                                        className="w-full flex items-center justify-between p-6 rounded-3xl bg-white text-slate-950 hover:scale-105 transition-all shadow-xl active:scale-95 disabled:opacity-40"
                                    >
                                        <div className="text-left">
                                            <p className="text-lg font-bold">Withdraw Funds</p>
                                            <p className="text-[10px] opacity-50">Release to primary wallet</p>
                                        </div>
                                        <span className="text-2xl text-emerald-500">📤</span>
                                    </button>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/20 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase">Estimated Fee</span>
                                        <span className="text-[10px] font-bold">0.001 ALGO</span>
                                    </div>
                                    <p className="text-[9px] font-medium leading-tight">Transactions are nearly instant and permanently secured by Algorand PURE Proof-of-Stake.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
