import { Contract } from 'ethers';

import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CTF_TRIPLE } from './lib/abi';

const TX_GAS_LIMIT = 500000;
const MAX_GAS_PRICE = 100n;
const MAX_PRIORITY_FEE = 100n;
const GWEI = 10n ** 9n;
const TIP = 10n * GWEI;

const BLOCKS_TO_TRY = 3;
const CONTRACT_ADDRESS = '0x1ea6fb65bab1f405f8bdb26d163e6984b9108478';

const { mevShare, executorWallet, provider } = initMevShare();
const contract = new Contract(
  CONTRACT_ADDRESS,
  MEV_SHARE_CTF_TRIPLE,
  executorWallet,
);

async function backrunHandler(pendingTxHash: string) {
  const currentBlock = await provider.getBlockNumber();
  console.log('current block', currentBlock);

  const nonce = await executorWallet.getNonce('latest');

  const txs = [];
  for (let i = 0; i < 3; i++) {
    const tx = await contract.claimReward.populateTransaction();
    const signedTx = await executorWallet.signTransaction({
      ...tx,
      chainId: 5,
      maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
      gasLimit: TX_GAS_LIMIT,
      nonce: nonce + i,
    });
    txs.push({ tx: signedTx, canRevert: false });
  }

  const bundleParams: BundleParams = {
    inclusion: {
      block: currentBlock + 1,
      maxBlock: currentBlock + BLOCKS_TO_TRY,
    },
    body: [{ hash: pendingTxHash }, ...txs],
  };
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  console.log('bundle hash', sendBundleResult.bundleHash);
  // const simResult = await mevShare.simulateBundle(bundleParams);
  // console.log('sim result', simResult);
}

const ruleFunc = (pendingTx: IPendingTransaction) =>
  (pendingTx.logs || []).some(
    (log) =>
      log.data === '0x' &&
      log.address === '0x1ea6fb65bab1f405f8bdb26d163e6984b9108478' &&
      log.topics.some(
        (topic) =>
          topic ===
          '0x59d3ce47d6ad6c6003cef97d136155b29d88653eb355c8bed6e03fbf694570ca',
      ),
  );

const main = async () => {
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (ruleFunc(pendingTx)) {
      backrunHandler(pendingTx.hash);
    }
  });
};

main();
