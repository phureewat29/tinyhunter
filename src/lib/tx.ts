import { hexlify, toUtf8Bytes, TransactionRequest, Wallet } from 'ethers';
import MevShareClient, { HintPreferences } from '@flashbots/mev-share-client';

const TX_GAS_LIMIT = 400000;
const MAX_GAS_PRICE = 40n;
const MAX_PRIORITY_FEE = 0n;
const GWEI = 10n ** 9n;

export const buildTx = async (
  executorWallet: Wallet,
  flair?: string,
  tip?: bigint,
) => {
  const tipActual = tip ? tip.valueOf() : BigInt(0);
  const tx: TransactionRequest = {
    type: 2,
    chainId: 5, // goerli
    to: executorWallet.address,
    nonce: await executorWallet.getNonce(),
    value: 0,
    data: hexlify(toUtf8Bytes(flair || 'greeting from tinyhunter!')),
    maxFeePerGas: MAX_GAS_PRICE * GWEI + tipActual,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + tipActual,
    gasLimit: TX_GAS_LIMIT,
  };

  return {
    tx,
    signedTx: await executorWallet.signTransaction(tx),
  };
};

export const sendTx = async (
  mevShare: MevShareClient,
  signedTx: string,
  hints?: HintPreferences,
  maxBlockNumber?: number,
) => {
  return mevShare.sendTransaction(signedTx, { hints, maxBlockNumber });
};
