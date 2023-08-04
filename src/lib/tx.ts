import { hexlify, toUtf8Bytes, TransactionRequest, Wallet } from 'ethers';
import MevShareClient, {
  BundleParams,
  TransactionOptions,
} from '@flashbots/mev-share-client';

const TX_GAS_LIMIT = 42000;
const MAX_GAS_PRICE = 40n;
const MAX_PRIORITY_FEE = 2n;
const GWEI = 10n ** 9n;

const BLOCKS_TO_TRY = 24;

export const buildTx = async (
  executorWallet: Wallet,
  flair?: string,
  tip?: bigint,
) => {
  const tipActual = tip ? tip.valueOf() : 0n;
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

  return { executorWallet, tx };
};

export const sendTx = async (
  mevShare: MevShareClient,
  signedTx: string,
  maxBlockNumber?: number,
) => {
  const txParams: TransactionOptions = {
    hints: {
      logs: true,
      contractAddress: true,
      calldata: true,
      functionSelector: true,
    },
    maxBlockNumber,
  };
  return mevShare.sendTransaction(signedTx, txParams);
};

export const sendBundle = async (
  mevShare: MevShareClient,
  signedTx: string,
  targetBlock: number,
) => {
  const bundleParams: BundleParams = {
    inclusion: {
      block: targetBlock,
      maxBlock: targetBlock + BLOCKS_TO_TRY,
    },
    body: [{ tx: signedTx, canRevert: false }],
    privacy: {
      hints: {
        logs: true,
        contractAddress: true,
        calldata: true,
        functionSelector: true,
      },
    },
  };
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  return {
    bundleParams,
    sendBundleResult,
  };
};
