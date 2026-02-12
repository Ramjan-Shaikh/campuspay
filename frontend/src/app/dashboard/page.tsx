"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { useWallet } from "../../context/WalletContext";

const BACKEND_BASE_URL = "http://localhost:4000";

type Friend = {
  name: string;
  address: string;
};

const FRIENDS_STORAGE_KEY = "campuspay_address_book";

export default function DashboardPage() {
  const { address, algoBalance, campusBalance, connect, disconnect, connecting, reloadBalances } =
    useWallet();
  const router = useRouter();

  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);

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

  const useFriendAsReceiver = (addr: string) => {
    setReceiver(addr);
  };

  const sendCampus = async () => {
    if (!address) {
      return;
    }
    try {
      setLoadingTx(true);
      setTxStatus(null);

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
      const params = await algod.getTransactionParams().do();

      const amt = Number(amount);
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: address,
        to: receiver,
        amount: amt,
        assetIndex: assetId,
        suggestedParams: params,
      });

      const pera = new PeraWalletConnect();
      const [{ signedTx }] = await pera.signTransaction([
        { txn: Buffer.from(txn.toByte()).toString("base64") },
      ]);

      const decoded = new Uint8Array(Buffer.from(signedTx, "base64"));
      const { txId } = await algod.sendRawTransaction(decoded).do();
      await algosdk.waitForConfirmation(algod, txId, 4);

      setTxStatus(`Sent CAMPUS. TxId: ${txId}`);
      await reloadBalances();
    } catch (e: any) {
      console.error(e);
      setTxStatus(e.message || "Failed to send CAMPUS");
    } finally {
      setLoadingTx(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">CampusPay Dashboard</h1>
            <p className="text-slate-400 text-sm">
              Connect Pera, manage CAMPUS tokens, split expenses and handle
              event tickets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {address ? (
              <>
                <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                  {address.slice(0, 6)}...{address.slice(-6)}
                </span>
                <button
                  onClick={disconnect}
                  className="text-xs px-3 py-1 rounded-full border border-slate-600 hover:bg-slate-800 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connect}
                disabled={connecting}
                className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {connecting ? "Connecting..." : "Connect Pera Wallet"}
              </button>
            )}
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-medium mb-2">Wallet</h2>
            <p className="text-xs text-slate-400 mb-3">
              Connected Testnet account balances.
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-slate-400">Algo:</span>{" "}
                {algoBalance ?? "-"}
              </p>
              <p>
                <span className="text-slate-400">CAMPUS:</span>{" "}
                {campusBalance ?? "-"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:col-span-2">
            <h2 className="text-sm font-medium mb-2">Send CAMPUS</h2>
            <p className="text-xs text-slate-400 mb-3">
              Peer-to-peer CAMPUS ASA transfer on Algorand Testnet.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Receiver address"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
              <input
                type="number"
                placeholder="Amount (CAMPUS units)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70"
              />
              <button
                onClick={sendCampus}
                disabled={!address || loadingTx}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {loadingTx ? "Sending..." : "Send CAMPUS"}
              </button>
              {txStatus && (
                <p className="text-xs text-slate-300 mt-2 break-all">
                  {txStatus}
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-slate-800 pt-3 space-y-2">
              <p className="text-[11px] text-slate-400 font-medium">
                Saved contacts (for quick send)
              </p>
              {friends.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  Add contacts below to quickly fill the receiver field.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends.map((f) => (
                    <button
                      key={f.address}
                      type="button"
                      onClick={() => useFriendAsReceiver(f.address)}
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
              <div className="flex flex-col sm:flex-row gap-2">
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
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <a
            href="/expense/create"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-emerald-500/70 transition-colors"
          >
            <h2 className="text-sm font-medium mb-1">Create expense</h2>
            <p className="text-xs text-slate-400">
              Split a CAMPUS-denominated cost across multiple wallets.
            </p>
          </a>
          <a
            href="/events"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-emerald-500/70 transition-colors"
          >
            <h2 className="text-sm font-medium mb-1">Events & tickets</h2>
            <p className="text-xs text-slate-400">
              Create events, buy tickets and verify ownership.
            </p>
          </a>
          <a
            href="/expenses"
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-emerald-500/70 transition-colors"
          >
            <h2 className="text-sm font-medium mb-1">My expenses</h2>
            <p className="text-xs text-slate-400">
              View all expenses you created or participate in.
            </p>
          </a>
        </section>
      </div>
    </main>
  );
}

