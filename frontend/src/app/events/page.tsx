"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { useWallet } from "../../context/WalletContext";

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

export default function EventsPage() {
  const { address, reloadBalances } = useWallet();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [category, setCategory] = useState("Social");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [creating, setCreating] = useState(false);
  const [myTickets, setMyTickets] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${BACKEND_BASE_URL}/api/events`);
        if (!resp.ok) {
          const data = await resp.json();
          throw new Error(data.error || "Failed to load events");
        }
        setEvents(await resp.json());
      } catch (e: any) {
        setError(e.message || "Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load user's purchased tickets when wallet is connected
  useEffect(() => {
    const loadMyTickets = async () => {
      if (!address) {
        setMyTickets([]);
        return;
      }
      try {
        const resp = await fetch(
          `${BACKEND_BASE_URL}/api/event/verify/${address}`
        );
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

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    try {
      setCreating(true);
      const resp = await fetch(`${BACKEND_BASE_URL}/api/event/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          ticketPrice: Number(ticketPrice),
          totalTickets: Number(totalTickets),
          creator: address,
          category,
          date,
          location,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to create event");
      }
      const evt = (await resp.json()) as Event;
      setEvents((prev) => [...prev, evt]);
      setName("");
      setDescription("");
      setTicketPrice("");
      setTotalTickets("");
      setDate("");
      setLocation("");
    } catch (e: any) {
      setError(e.message || "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  const buyTicket = async (event: Event) => {
    if (!address) return;
    try {
      let txId = "";

      // For free events, skip payment transaction
      if (event.ticketPrice > 0) {
        // Transfer CAMPUS from buyer to event creator
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

      // Notify backend to record ticket ownership
      const resp = await fetch(
        `${BACKEND_BASE_URL}/api/event/${event.id}/buy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyer: address }),
        }
      );
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to register ticket purchase");
      }

      await reloadBalances();

      // Reload user's tickets to update UI
      const ticketResp = await fetch(
        `${BACKEND_BASE_URL}/api/event/verify/${address}`
      );
      if (ticketResp.ok) {
        const ticketData = await ticketResp.json();
        setMyTickets(ticketData.eventIds as string[]);
      }

      if (event.ticketPrice === 0) {
        alert("Free ticket claimed successfully!");
      } else {
        alert(`Ticket purchased. TxId: ${txId}`);
      }
    } catch (e: any) {
      alert(e.message || "Failed to buy ticket");
    }
  };

  return (
    <main className="min-h-screen text-slate-50 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Events & tickets</h1>
            <p className="text-xs text-slate-400">
              Create CAMPUS-priced events and mint tickets via ASA transfers.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <Link
              href="/fundraisers"
              className="text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all"
            >
              Explore Fundraisers →
            </Link>
            <button
              type="button"
              onClick={() => router.back()}
              className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
            >
              ← Back
            </button>
          </div>
        </header>

        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search events by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {["All", "Social", "Academic", "Sports", "Other"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${selectedCategory === cat
                  ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-medium mb-4">Events</h2>
            {loading ? (
              <p className="text-xs text-slate-400 italic">Finding events...</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-400">
                No events found. Try a different search or create one!
              </p>
            ) : (
              <ul className="space-y-4">
                {events
                  .filter((evt) => {
                    const matchesSearch =
                      evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      evt.description.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCategory =
                      selectedCategory === "All" || evt.category === selectedCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map((evt) => (
                    <li
                      key={evt.id}
                      className="border border-slate-800/50 bg-slate-950/50 rounded-2xl p-4 transition-all hover:bg-slate-950 hover:border-slate-700 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/events/${evt.id}`} className="hover:underline">
                              <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                                {evt.name}
                              </h3>
                            </Link>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                              {evt.category}
                            </span>
                            {myTickets.includes(evt.id) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                                ✓ PURCHASED
                              </span>
                            )}
                          </div>

                          <Link href={`/events/${evt.id}`}>
                            <p className="text-sm text-slate-400 line-clamp-2 hover:text-slate-200 transition-colors">
                              {evt.description}
                            </p>
                          </Link>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1.5">
                              📅 {evt.date || "TBA"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              📍 {evt.location || "TBA"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              🎫 {evt.remainingTickets}/{evt.totalTickets} left
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Price</p>
                            <p className="text-lg font-bold text-white">
                              {evt.ticketPrice === 0 ? "FREE" : `${evt.ticketPrice} CAMPUS`}
                            </p>
                          </div>
                          <button
                            disabled={!address || evt.remainingTickets <= 0 || myTickets.includes(evt.id)}
                            onClick={() => buyTicket(evt)}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2.5 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                          >
                            {myTickets.includes(evt.id) ? "Owned" : "Buy Ticket"}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4 h-fit sticky top-6">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <span className="text-emerald-400">✨</span> Create New Event
            </h2>
            <form onSubmit={createEvent} className="space-y-4">
              <div className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder="Event name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="Full description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Price (CAMPUS)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Total Tickets</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={totalTickets}
                      onChange={(e) => setTotalTickets(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Social">Social</option>
                    <option value="Academic">Academic</option>
                    <option value="Sports">Sports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Date & Time</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Oct 25, 6:00 PM"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Location</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Campus Hub Hall"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/70 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !address}
                className="w-full rounded-xl bg-white hover:bg-emerald-400 hover:text-slate-950 text-slate-950 py-3 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/10 active:scale-95"
              >
                {creating ? "Launching..." : "Launch Event 🚀"}
              </button>
              {!address && <p className="text-[10px] text-red-400 text-center font-bold">Connect wallet to create</p>}
            </form>
          </div>
        </section>
      </div >
    </main >
  );
}

