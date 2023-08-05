import { Contract } from 'ethers';

import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CTF_SIMPLE_ABI } from './lib/abi';

const TX_GAS_LIMIT = 500000;
const MAX_GAS_PRICE = 100n;
const MAX_PRIORITY_FEE = 100n;
const GWEI = 10n ** 9n;
const TIP = 100n * GWEI;

const BLOCKS_TO_TRY = 3;
const CONTRACT_ADDRESS = process.argv[2];

const { mevShare, executorWallet, provider } = initMevShare();
const contract = new Contract(
  CONTRACT_ADDRESS,
  MEV_SHARE_CTF_SIMPLE_ABI,
  executorWallet,
);

async function backrunHandler(pendingTxHash: string) {
  const currentBlock = await provider.getBlockNumber();
  console.log('current block', currentBlock);

  const tx = await contract.claimReward.populateTransaction();
  const nonce = await executorWallet.getNonce('latest');
  const claimTx = {
    ...tx,
    chainId: 5,
    maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
    gasLimit: TX_GAS_LIMIT,
    nonce: nonce,
  };
  const signedTx = await executorWallet.signTransaction(claimTx);
  const bundleParams: BundleParams = {
    inclusion: { block: currentBlock, maxBlock: currentBlock + BLOCKS_TO_TRY },
    body: [{ hash: pendingTxHash }, { tx: signedTx, canRevert: false }],
  };
  // const simResult = await mevShare.simulateBundle(bundleParams);
  // console.log('sim result', simResult);
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  console.log('bundle hash', sendBundleResult.bundleHash);
}

interface modeType {
  [key: string]: (pendingTx: IPendingTransaction) => boolean;
}

const modeResolver = () => {
  // 0x98997b55bb271e254bec8b85763480719dab0e53 -> simple: logs, topic
  // 0x1cddb0ba9265bb3098982238637c2872b7d12474 -> simple: to, functionSelector, callData
  // 0x65459dd36b03af9635c06bad1930db660b968278 -> simple: to, functionSelector
  // 0x20a1a5857fdff817aa1bd8097027a841d4969aa5 -> simple: blind!
  const modes: modeType = {
    '0x98997b55bb271e254bec8b85763480719dab0e53': (
      pendingTx: IPendingTransaction,
    ) => {
      return (pendingTx.logs || []).some(
        (log) => log.address === '0x98997b55bb271e254bec8b85763480719dab0e53',
      );
    },
    '0x1cddb0ba9265bb3098982238637c2872b7d12474': (
      pendingTx: IPendingTransaction,
    ) => {
      return (
        pendingTx.to === '0x1cddb0ba9265bb3098982238637c2872b7d12474' &&
        pendingTx.functionSelector === '0xa3c356e4' &&
        pendingTx.callData === '0xa3c356e4'
      );
    },
    '0x65459dd36b03af9635c06bad1930db660b968278': (
      pendingTx: IPendingTransaction,
    ) => {
      return (
        pendingTx.to === '0x65459dd36b03af9635c06bad1930db660b968278' &&
        pendingTx.functionSelector === '0xa3c356e4' &&
        pendingTx.callData === undefined
      );
    },
    '0x20a1a5857fdff817aa1bd8097027a841d4969aa5': (
      pendingTx: IPendingTransaction,
    ) => {
      return (
        pendingTx.to === null &&
        pendingTx.functionSelector === null &&
        pendingTx.callData === null
      );
    },
  };
  return modes[process.argv[2]];
};

const main = async () => {
  const ruleFunc = modeResolver();
  console.log('rule:', ruleFunc);
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (ruleFunc(pendingTx)) {
      backrunHandler(pendingTx.hash);
    }
  });
};

main();
