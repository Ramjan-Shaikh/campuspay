import algosdk, { Algodv2, Indexer } from "algosdk";
import dotenv from "dotenv";

dotenv.config();

export interface AlgorandClients {
  algod: Algodv2;
  indexer: Indexer;
}

export const getAlgorandClients = (): AlgorandClients => {
  const {
    ALGOD_SERVER,
    ALGOD_PORT,
    ALGOD_TOKEN,
    INDEXER_SERVER,
    INDEXER_PORT,
    INDEXER_TOKEN,
  } = process.env;

  if (!ALGOD_SERVER || !ALGOD_PORT) {
    throw new Error("ALGOD_SERVER and ALGOD_PORT must be set in .env");
  }

  if (!INDEXER_SERVER || !INDEXER_PORT) {
    throw new Error("INDEXER_SERVER and INDEXER_PORT must be set in .env");
  }

  const algod = new algosdk.Algodv2(
    ALGOD_TOKEN || "",
    ALGOD_SERVER,
    Number(ALGOD_PORT)
  );

  const indexer = new algosdk.Indexer(
    INDEXER_TOKEN || "",
    INDEXER_SERVER,
    Number(INDEXER_PORT)
  );

  return { algod, indexer };
};

export const getCreatorAccount = () => {
  const mnemonic = process.env.CREATOR_MNEMONIC;
  if (!mnemonic) {
    throw new Error("CREATOR_MNEMONIC must be set in .env");
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
};

