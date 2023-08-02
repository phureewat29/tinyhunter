import { HintPreferences } from '@flashbots/mev-share-client';
import { buildTx, sendTx } from './lib/tx';
import { initMevShare } from './lib/client';

const { mevShare, executorWallet, provider } = initMevShare();

const main = async () => {
  const hints: HintPreferences = {
    calldata: true,
    logs: true,
    contractAddress: true,
    functionSelector: true,
  };
  console.log('Sending tx to Flashbots');
  const { signedTx } = await buildTx(executorWallet, mevShare, provider);
  const txHash = await sendTx(mevShare, signedTx, hints);
  console.log('TX Hash:', txHash);
};

main();
