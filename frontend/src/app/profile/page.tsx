"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const BACKEND_BASE_URL = "http://localhost:4000";

interface Event {
    id: string;
    name: string;
    description: string;
    ticketPrice: number;
    totalTickets: number;
    remainingTickets: number;
    creator: string;
    assetId: number;
    category: string;
    date: string;
    location: string;
}

interface Vault {
    walletAddress: string;
    balance: number;
    goal: number;
    goalName: string;
}

export default function ProfilePage() {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<{ algo: string; campus: string }>({ algo: "0", campus: "0" });
    const [purchasedEvents, setPurchasedEvents] = useState<Event[]>([]);
    const [vault, setVault] = useState<Vault | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Event | null>(null);

    useEffect(() => {
        const pera = new PeraWalletConnect();
        pera.reconnectSession().then(async (accounts) => {
            if (accounts.length > 0) {
                const addr = accounts[0];
                setAddress(addr);
                await loadBalances(addr);
                await loadPurchasedTickets(addr);
                await loadVault(addr);
            } else {
                setLoading(false);
            }
        });
    }, []);

    const loadBalances = async (addr: string) => {
        try {
            const algod = new algosdk.Algodv2("", process.env.NEXT_PUBLIC_ALGOD_SERVER!, "");
            const accountInfo = await algod.accountInformation(addr).do();
            const algoBalance = (accountInfo.amount / 1_000_000).toFixed(2);

            const campusId = Number(process.env.NEXT_PUBLIC_CAMPUS_TOKEN_ID);
            const campusAsset = accountInfo.assets?.find((a: any) => a["asset-id"] === campusId);
            const campusBalance = campusAsset ? campusAsset.amount.toString() : "0";

            setBalance({ algo: algoBalance, campus: campusBalance });
        } catch (e) {
            console.error("Failed to load balances", e);
        }
    };

    const loadPurchasedTickets = async (addr: string) => {
        try {
            const resp = await fetch(`${BACKEND_BASE_URL}/api/event/verify/${addr}`);
            if (resp.ok) {
                const data = await resp.json();
                const eventIds = data.eventIds as string[];

                // Fetch full event details for each ID
                const eventPromises = eventIds.map(async (id) => {
                    const detailResp = await fetch(`${BACKEND_BASE_URL}/api/event/${id}`);
                    return detailResp.ok ? await detailResp.json() : null;
                });

                const details = await Promise.all(eventPromises);
                setPurchasedEvents(details.filter(e => e !== null));
            }
        } catch (e) {
            console.error("Failed to load purchased tickets", e);
        } finally {
            setLoading(false);
        }
    };

    const loadVault = async (addr: string) => {
        try {
            const resp = await fetch(`${BACKEND_BASE_URL}/api/vault/${addr}`);
            if (resp.ok) {
                const data = await resp.json();
                setVault(data);
            }
        } catch (e) {
            console.error("Failed to load vault", e);
        }
    };

    const handleVaultAction = async (type: "deposit" | "withdraw") => {
        if (!address || !vault) return;
        const amountStr = prompt(`Enter amount of CAMPUS to ${type}:`);
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

        try {
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
        } catch (e) {
            alert("Failed to process transaction");
        }
    };

    const setSavingsGoal = async () => {
        if (!address) return;
        const goalName = prompt("What are you saving for?", vault?.goalName || "New Laptop");
        const goalAmount = prompt("What is your target amount in CAMPUS?", (vault?.goal || 1000).toString());
        if (!goalName || !goalAmount) return;

        try {
            const resp = await fetch(`${BACKEND_BASE_URL}/api/vault/${address}/goal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goalName, goal: Number(goalAmount) }),
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
            <div className="animate-pulse text-emerald-500">Retrieving profile...</div>
        </div>
    );

    if (!address) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-3xl">👤</div>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Profile Locked</h1>
                <p className="text-slate-400">Please connect your Pera Wallet to view your tickets and balances.</p>
            </div>
            <Link href="/events" className="rounded-full bg-emerald-500 text-slate-950 px-8 py-3 font-bold hover:scale-105 transition-all">
                Go to Events
            </Link>
        </div>
    );

    const vaultProgress = vault && vault.goal > 0 ? Math.min(100, (vault.balance / vault.goal) * 100) : 0;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
                <header className="mb-12 space-y-4">
                    <div className="flex justify-between items-start">
                        <h1 className="text-4xl font-bold">Your Campus Identity</h1>
                        <Link href="/" className="text-slate-500 hover:text-white transition-colors text-sm">Return Home</Link>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wallet Address</p>
                            <p className="text-sm font-mono text-emerald-400 break-all">{address}</p>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex gap-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Available</p>
                                    <p className="text-xl font-bold">{balance.campus} <span className="text-xs font-normal text-slate-400">CPAY</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Vaulted</p>
                                    <p className="text-xl font-bold text-emerald-500">{vault?.balance || 0} <span className="text-xs font-normal text-slate-400">CPAY</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 w-full lg:w-96 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div>
                                        <h3 className="text-lg font-bold">Campus Savings</h3>
                                    </div>                </div>
                                <Link href="/savings" className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md transition-all text-emerald-400 font-bold border border-slate-700">Manage Full Vault →</Link>
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>{vaultProgress.toFixed(0)}% Complete</span>
                                    <span className="text-slate-500">{vault?.balance || 0} / {vault?.goal || 0} CPAY</span>
                                </div>
                                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-1000"
                                        style={{ width: `${vaultProgress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button onClick={() => handleVaultAction("deposit")} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2 rounded-xl text-xs font-bold transition-all">Deposit</button>
                                <button onClick={() => handleVaultAction("withdraw")} className="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded-xl text-xs font-bold transition-all">Withdraw</button>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                        <h2 className="text-xl font-bold">My Tickets ({purchasedEvents.length})</h2>
                        <Link href="/events" className="text-xs text-emerald-400 hover:underline">Find more events →</Link>
                    </div>

                    {purchasedEvents.length === 0 ? (
                        <div className="py-20 text-center space-y-4 border-2 border-dashed border-slate-900 rounded-3xl">
                            <p className="text-slate-500 italic">No tickets found in your wallet.</p>
                            <Link href="/events" className="inline-block text-emerald-400 hover:underline">Explore Events →</Link>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {purchasedEvents.map((evt) => (
                                <div key={evt.id} className="group p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 transition-all">
                                    <div className="space-y-4">
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                                            {evt.category}
                                        </span>
                                        <div>
                                            <h3 className="text-lg font-bold group-hover:text-emerald-400 transition-colors">{evt.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">📍 {evt.location}</p>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">📅 {evt.date}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedTicket(evt)}
                                            className="w-full rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 py-2.5 text-xs font-bold transition-all"
                                        >
                                            View QR Ticket
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* QR Ticket Modal (Feature 5) */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
                    <div className="max-w-sm w-full bg-white text-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6 text-center">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CampusPay Ticket</span>
                                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-950 transition-colors">✕</button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase">{selectedTicket.name}</h3>
                                <p className="text-xs font-bold text-slate-500">{selectedTicket.date} • {selectedTicket.location}</p>
                            </div>

                            <div className="bg-slate-100 p-4 rounded-3xl flex items-center justify-center">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`EVENT:${selectedTicket.id}|WALLET:${address}`)}`}
                                    alt="Ticket QR"
                                    className="w-48 h-48 rounded-xl"
                                />
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Attendee Signature</p>
                                <p className="text-[10px] font-mono break-all">{address?.slice(0, 16)}...{address?.slice(-16)}</p>
                            </div>

                            <p className="text-[10px] text-slate-400 italic">Present this QR code at the event entrance for verification.</p>
                        </div>

                        <div className="bg-emerald-500 py-3 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-950 tracking-[0.2em]">Verified Secure</p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
