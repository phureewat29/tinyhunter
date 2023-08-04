import { buildTx, sendTx } from './lib/tx';
import { initMevShare } from './lib/client';

const { mevShare, executorWallet } = initMevShare();

const main = async () => {
  console.log('sending tx to flashbots');
  const { tx } = await buildTx(executorWallet);
  const txHash = await sendTx(
    mevShare,
    await executorWallet.signTransaction(tx),
  );
  console.log('tx hash:', txHash);
};

main();
