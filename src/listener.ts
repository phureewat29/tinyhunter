import { initMevShare } from './lib/client';
import { IPendingTransaction } from '@flashbots/mev-share-client';

const main = async () => {
  const { mevShare } = await initMevShare();

  // listen for txs
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    console.dir(pendingTx, { depth: null });
  });
};

main();
