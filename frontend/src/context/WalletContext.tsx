"use client";

import React, {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import algosdk, { Algodv2 } from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";

interface WalletContextValue {
  address: string | null;
  algoBalance: number | null;
  campusBalance: number | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reloadBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const pera = new PeraWalletConnect();

const getAlgodClient = (): Algodv2 => {
  const server = process.env.NEXT_PUBLIC_ALGOD_SERVER;
  if (!server) {
    throw new Error("NEXT_PUBLIC_ALGOD_SERVER is not set");
  }
  // Public Algonode /Testnet endpoints do not require a token.
  return new algosdk.Algodv2("", server, "");
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [address, setAddress] = useState<string | null>(null);
  const [algoBalance, setAlgoBalance] = useState<number | null>(null);
  const [campusBalance, setCampusBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  const loadBalances = useCallback(
    async (addr: string) => {
      try {
        const algod = getAlgodClient();
        const account = await algod.accountInformation(addr).do();
        const microAlgos = Number(account.amount);
        setAlgoBalance(microAlgos / 1_000_000); // microAlgos -> Algos

        const campusIdStr = process.env.NEXT_PUBLIC_CAMPUS_TOKEN_ID;
        if (campusIdStr) {
          const assetId = Number(campusIdStr);
          const assets = (account.assets || []) as Array<{
            "asset-id": number;
            amount: number;
          }>;
          const holding = assets.find((a) => a["asset-id"] === assetId);
          setCampusBalance(holding ? holding.amount : 0);
        } else {
          setCampusBalance(null);
        }
      } catch (e) {
        console.error("Failed to load balances", e);
      }
    },
    []
  );

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      const accounts = await pera.connect();
      const firstAddr = accounts[0];
      setAddress(firstAddr);
      await loadBalances(firstAddr);
    } catch (e) {
      console.error("Failed to connect Pera wallet", e);
    } finally {
      setConnecting(false);
    }
  }, [loadBalances]);

  const disconnect = useCallback(async () => {
    await pera.disconnect();
    setAddress(null);
    setAlgoBalance(null);
    setCampusBalance(null);
  }, []);

  useEffect(() => {
    pera.reconnectSession().then((accounts: string[]) => {
      if (accounts.length > 0) {
        const firstAddr = accounts[0];
        setAddress(firstAddr);
        loadBalances(firstAddr);
      }
    });
  }, [loadBalances]);

  const reloadBalances = useCallback(async () => {
    if (address) {
      await loadBalances(address);
    }
  }, [address, loadBalances]);

  return (
    <WalletContext.Provider
      value={{
        address,
        algoBalance,
        campusBalance,
        connecting,
        connect,
        disconnect,
        reloadBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
};

