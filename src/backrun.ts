import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { buildTx } from './lib/tx';

const { mevShare, executorWallet, provider } = initMevShare();
const NUM_TARGET_BLOCKS = 3;

async function backrunAttempt(
  currentBlockNumber: number,
  pendingTxHash: string,
) {
  const { signedTx } = await buildTx(
    executorWallet,
    'backrunning from tinyhunter!',
  );

  try {
    const bundleParams: BundleParams = {
      inclusion: {
        block: currentBlockNumber + 1,
        maxBlock: currentBlockNumber + NUM_TARGET_BLOCKS,
      },
      body: [{ hash: pendingTxHash }, { tx: signedTx, canRevert: false }],
    };
    const sendBundleResult = await mevShare.sendBundle(bundleParams);
    console.log('bundle hash: ' + sendBundleResult.bundleHash);
  } catch (e) {
    console.log('err', e);
  }
}

const main = async () => {
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    console.log(pendingTx);
    const currentBlockNumber = await provider.getBlockNumber();
    backrunAttempt(currentBlockNumber, pendingTx.hash);
  });
};

main();
