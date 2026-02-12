"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";

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

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState<string | null>(null);
    const [buying, setBuying] = useState(false);
    const [myTickets, setMyTickets] = useState<string[]>([]);

    useEffect(() => {
        // Check wallet connection
        const pera = new PeraWalletConnect();
        pera.reconnectSession().then((accounts) => {
            if (accounts.length > 0) setAddress(accounts[0]);
        });

        const fetchEvent = async () => {
            try {
                const resp = await fetch(`${BACKEND_BASE_URL}/api/event/${id}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setEvent(data);
                }
            } catch (e) {
                console.error("Failed to fetch event", e);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    useEffect(() => {
        const loadMyTickets = async () => {
            if (!address) return;
            try {
                const resp = await fetch(`${BACKEND_BASE_URL}/api/event/verify/${address}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setMyTickets(data.eventIds as string[]);
                }
            } catch (e) {
                console.error("Failed to load user tickets", e);
            }
        };
        loadMyTickets();
    }, [address]);

    const buyTicket = async () => {
        if (!address || !event) return;
        setBuying(true);
        try {
            let txId = "";
            if (event.ticketPrice > 0) {
                const campusIdStr = process.env.NEXT_PUBLIC_CAMPUS_TOKEN_ID;
                if (!campusIdStr) throw new Error("CAMPUS token ID not found");
                const assetId = Number(campusIdStr);

                const algod = new algosdk.Algodv2("", process.env.NEXT_PUBLIC_ALGOD_SERVER!, "");
                const paramsTx = await algod.getTransactionParams().do();

                const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                    from: address,
                    to: event.creator,
                    amount: event.ticketPrice,
                    assetIndex: assetId,
                    suggestedParams: paramsTx,
                });

                const pera = new PeraWalletConnect();
                const signedTxnData = await pera.signTransaction([
                    { txn: Buffer.from(txn.toByte()).toString("base64") } as any,
                ]);
                const signedTx = (signedTxnData[0] as any);
                const decoded = new Uint8Array(Buffer.from(signedTx, "base64"));
                const result = await algod.sendRawTransaction(decoded).do();
                txId = result.txId;
                await algosdk.waitForConfirmation(algod, txId, 4);
            }

            const resp = await fetch(`${BACKEND_BASE_URL}/api/event/${event.id}/buy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ buyer: address }),
            });

            if (!resp.ok) {
                const data = await resp.json();
                throw new Error(data.error || "Purchase failed on backend");
            }

            // Update local state
            setEvent((prev) => prev ? { ...prev, remainingTickets: prev.remainingTickets - 1 } : null);
            setMyTickets((prev) => [...prev, event.id]);

            alert(event.ticketPrice === 0 ? "Free ticket secured!" : `Ticket bought! Tx: ${txId}`);
        } catch (e: any) {
            alert(e.message || "Purchase failed");
        } finally {
            setBuying(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin text-emerald-500 text-4xl">⏳</div>
        </div>
    );

    if (!event) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
            <Link href="/events" className="text-emerald-400 hover:underline">Back to events</Link>
        </div>
    );

    const isPurchased = myTickets.includes(event.id);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50 font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                <Link href="/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Discovery
                </Link>

                <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-8">
                        <div className="space-y-4">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold tracking-widest uppercase">
                                {event.category}
                            </span>
                            <h1 className="text-4xl md:text-6xl font-bold leading-tight">{event.name}</h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-slate-400">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📅</span>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">Date & Time</p>
                                    <p className="text-sm font-medium text-slate-200">{event.date || "TBA"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📍</span>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">Location</p>
                                    <p className="text-sm font-medium text-slate-200">{event.location || "TBA"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-invert max-w-none">
                            <h3 className="text-xl font-bold mb-4">About this event</h3>
                            <p className="text-slate-400 text-lg leading-relaxed whitespace-pre-wrap">
                                {event.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Availability</p>
                                <p className="text-xl font-bold">{event.remainingTickets}/{event.totalTickets}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Price</p>
                                <p className="text-xl font-bold text-emerald-400">
                                    {event.ticketPrice === 0 ? "FREE" : `${event.ticketPrice} CPAY`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-8">
                            <h3 className="text-lg font-bold mb-6">Reservation</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Ticket Type</span>
                                    <span className="font-bold">Standard Admission</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-4">
                                    <span className="text-slate-400">Total Price</span>
                                    <span className="text-xl font-bold text-white">
                                        {event.ticketPrice === 0 ? "FREE" : `${event.ticketPrice} CAMPUS`}
                                    </span>
                                </div>

                                <div className="pt-4">
                                    <button
                                        disabled={!address || event.remainingTickets <= 0 || isPurchased || buying}
                                        onClick={buyTicket}
                                        className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20 active:scale-95"
                                    >
                                        {buying ? "Processing..." : isPurchased ? "✓ Already Owned" : "Secure Ticket"}
                                    </button>
                                    {!address && (
                                        <p className="text-[10px] text-red-400 text-center font-bold mt-2 uppercase">Please connect wallet</p>
                                    )}
                                    {isPurchased && (
                                        <Link href="/profile" className="block text-center text-xs text-emerald-400 hover:underline mt-4">
                                            View your ticket in profile →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
