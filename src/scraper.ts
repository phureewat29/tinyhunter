import { initMevShare } from './lib/client';
import { IPendingTransaction } from '@flashbots/mev-share-client';
import { logtail } from './lib/logtail';

const main = async () => {
  const { mevShare } = await initMevShare();

  // listen for txs
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    // log to logtail for visualisation and querying
    logtail.info('tx', {
      hash: pendingTx.hash,
      to: pendingTx.to || '',
      functionSelector: pendingTx.functionSelector || '',
      callData: pendingTx.callData || '',
    });
    console.info(pendingTx);
  });
  console.log('listening for transactions...');
};

main();
