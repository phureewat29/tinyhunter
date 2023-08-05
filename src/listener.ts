import { initMevShare } from './lib/client';
import {
  IPendingTransaction,
  IPendingBundle,
} from '@flashbots/mev-share-client';

const main = async () => {
  const { mevShare } = await initMevShare();

  // listen for txs
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    console.info('txs', pendingTx);
  });

  // listen for bundles
  mevShare.on('bundle', async (bundle: IPendingBundle) => {
    console.info('bundle', bundle);
  });

  console.log('listening for transactions and bundles...');
};

main();
