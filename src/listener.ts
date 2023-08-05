import { initMevShare } from './lib/client';
import {
  IPendingTransaction,
  IPendingBundle,
} from '@flashbots/mev-share-client';

const main = async () => {
  const { mevShare } = await initMevShare();

  // listen for txs
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (
      pendingTx.functionSelector === '0xa3c356e4' &&
      pendingTx.callData === '0xa3c356e4'
    ) {
      console.info('found activeRewardSimple tx!', pendingTx.hash);
      console.dir(pendingTx, { depth: null });
    }
  });
};

main();
