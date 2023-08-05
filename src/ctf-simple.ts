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

// 0x98997b55bb271e254bec8b85763480719dab0e53 -> simple logs, topic
// 0x1cddb0ba9265bb3098982238637c2872b7d12474 -> simple
// 0x65459dd36b03af9635c06bad1930db660b968278 -> simple to, functionSelector
// 0x20a1a5857fdff817aa1bd8097027a841d4969aa5 -> simple no!
// 0x118bcb654d9a7006437895b51b5cd4946bf6cdc2 -> magic1
// 0x9be957d1c1c1f86ba9a2e1215e9d9eefde615a56
// 0xe8b7475e2790409715af793f799f3cc80de6f071
// 0x5ea0fea0164e5aa58f407debb344876b5ee10dea
// 0x1ea6fb65bab1f405f8bdb26d163e6984b9108478
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
      maxBlock: currentBlock + BLOCKS_TO_TRY,
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
      backrunHandler(pendingTx.hash);
    }
  });
};

main();
