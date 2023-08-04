import { buildTx, sendBundle } from './lib/tx';
import { initMevShare } from './lib/client';

const { provider, mevShare, executorWallet } = initMevShare();

const main = async () => {
  console.log('sending bundle to flashbots');
  const { tx } = await buildTx(
    executorWallet,
    'tinybundle',
    BigInt(1e9) * BigInt(1e7), // tip 0.01 ETH
  );
  const currentBlockNumber = await provider.getBlockNumber();
  const { bundleParams, sendBundleResult } = await sendBundle(
    mevShare,
    await executorWallet.signTransaction(tx),
    currentBlockNumber + 1,
  );
  console.log('bundle params', bundleParams);
  console.log('bundle hash: ', sendBundleResult.bundleHash);
};

main();
