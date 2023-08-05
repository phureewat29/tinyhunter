import { Contract } from 'ethers';

import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CTF_SIMPLE_ABI } from './lib/abi';

const TX_GAS_LIMIT = 400000;
const MAX_GAS_PRICE = 500n;
const MAX_PRIORITY_FEE = 100n;
const GWEI = 10n ** 9n;
const TIP = BigInt(1e9) * BigInt(1e3);

const BLOCKS_TO_TRY = 24;

// 0x98997b55Bb271e254BEC8B85763480719DaB0E53 -> simple
// 0x1cdDB0BA9265bb3098982238637C2872b7D12474 -> simple
// 0x65459dD36b03Af9635c06BAD1930DB660b968278 -> simple
// 0x20a1A5857fDff817aa1BD8097027a841D4969AA5 -> simple
// 0x118Bcb654d9A7006437895B51b5cD4946bF6CdC2 -> simple
// 0x9BE957D1c1c1F86Ba9A2e1215e9d9EEFdE615a56
// 0xE8B7475e2790409715AF793F799f3Cc80De6f071
// 0x5eA0feA0164E5AA58f407dEBb344876b5ee10DEA
// 0x1eA6Fb65BAb1f405f8Bdb26D163e6984B9108478
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
    chainId: 1,
    maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
    gasLimit: TX_GAS_LIMIT,
    nonce: nonce,
  };
  const signedTx = await executorWallet.signTransaction(claimTx);
  const bundleParams: BundleParams = {
    inclusion: {
      block: currentBlock,
      // maxBlock: currentBlock + BLOCKS_TO_TRY,
    },
    body: [{ hash: pendingTxHash }, { tx: signedTx, canRevert: false }],
  };
  // const simResult = await mevShare.simulateBundle(bundleParams);
  // console.log('sim result', simResult);
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  console.log('bundle hash', sendBundleResult.bundleHash);
}

const main = async () => {
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (
      pendingTx.to === CONTRACT_ADDRESS &&
      pendingTx.functionSelector === '0xa3c356e4'
    ) {
      console.log('found activeRewardSimple tx!', pendingTx.hash);
      backrunHandler(pendingTx.hash);
    }
  });
};

main();
