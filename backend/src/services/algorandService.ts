import algosdk from "algosdk";
import { getAlgorandClients, getCreatorAccount } from "../config";

const CAMPUS_TOKEN_DEFAULTS = {
  name: "CAMPUS",
  unitName: "CAMPUS",
  total: 1_000_000,
  decimals: 0,
};

export const createCampusToken = async () => {
  const { algod } = getAlgorandClients();
  const creator = getCreatorAccount();

  const params = await algod.getTransactionParams().do();

  // Cast to any to sidestep strict SDK typings while keeping
  // the canonical transaction shape.
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: creator.addr,
    total: CAMPUS_TOKEN_DEFAULTS.total,
    decimals: CAMPUS_TOKEN_DEFAULTS.decimals,
    defaultFrozen: false,
    unitName: CAMPUS_TOKEN_DEFAULTS.unitName,
    assetName: CAMPUS_TOKEN_DEFAULTS.name,
    manager: creator.addr,
    reserve: undefined,
    freeze: undefined,
    clawback: undefined,
    suggestedParams: params,
  } as any);

  const signed = txn.signTxn(creator.sk);
  const sendResult = (await algod.sendRawTransaction(signed).do()) as any;
  const txId: string = sendResult.txId || sendResult.txid;
  await algosdk.waitForConfirmation(algod, txId, 4);

  const ptx = (await algod
    .pendingTransactionInformation(txId)
    .do()) as Record<string, any>;
  const assetId = (ptx["asset-index"] ?? ptx.assetIndex) as number;

  return { txId, assetId };
};

export const transferCampusToken = async (opts: {
  fromMnemonic: string;
  to: string;
  amount: number;
  assetId: number;
}) => {
  const { fromMnemonic, to, amount, assetId } = opts;
  const { algod } = getAlgorandClients();

  const sender = algosdk.mnemonicToSecretKey(fromMnemonic);
  const params = await algod.getTransactionParams().do();

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: sender.addr,
    to,
    amount,
    assetIndex: assetId,
    suggestedParams: params,
  } as any);

  const signed = txn.signTxn(sender.sk);
  const sendResult = (await algod.sendRawTransaction(signed).do()) as any;
  const txId: string = sendResult.txId || sendResult.txid;
  await algosdk.waitForConfirmation(algod, txId, 4);
  return { txId };
};

