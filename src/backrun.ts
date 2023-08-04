import { formatEther, keccak256 } from 'ethers';

import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { buildTx, sendTx } from './lib/tx';
import { AsyncArray } from './lib/async';

const { mevShare, executorWallet, provider } = initMevShare();
const BLOCKS_TO_TRY = 24;

// used for tracking txs we sent. we only want to backrun txs we sent,
// since we're using one account and incrementing the nonce of the bundle's 2nd tx
const pendingTxHashes = new AsyncArray<string>();

async function backrunHandler(pendingTxHash: string) {
  // ignore txs we didn't send
  if (!(await pendingTxHashes.includes(pendingTxHash))) return;
  console.log('target tx', pendingTxHash);

  const { tx } = await buildTx(
    executorWallet,
    `backrunning ${pendingTxHash} from tinyhunter!`,
    BigInt(1e9) * BigInt(1e3),
  );

  const backrunTx = {
    ...tx,
    nonce: tx.nonce ? tx.nonce + 1 : undefined,
  };

  const targetBlockNumber = (await provider.getBlockNumber()) + 1;
  const bundleParams: BundleParams = {
    inclusion: {
      block: targetBlockNumber,
      maxBlock: targetBlockNumber + BLOCKS_TO_TRY,
    },
    body: [
      { hash: pendingTxHash },
      { tx: await executorWallet.signTransaction(backrunTx), canRevert: false },
    ],
  };
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  console.log('bundle hash', sendBundleResult.bundleHash);

  for (let i = 0; i < BLOCKS_TO_TRY; i++) {
    const currentBlock = targetBlockNumber + i;

    console.log(`tx ${pendingTxHash} waiting for block`, currentBlock);
    // stall until target block is available
    while ((await provider.getBlockNumber()) < currentBlock) {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    }
    // check for inclusion of backrun tx in target block
    const backrunTx = (bundleParams.body[1] as any).tx;
    if (backrunTx) {
      const checkTxHash = keccak256(backrunTx);
      const receipt = await provider.getTransactionReceipt(checkTxHash);
      if (receipt?.status === 1) {
        console.log(`bundle included! (found tx ${receipt.hash})`);

        // simulate bundle
        const simOptions = {
          parentBlock: receipt.blockNumber - 1,
        };
        const simResult = await mevShare.simulateBundle(
          bundleParams,
          simOptions,
        );
        console.log(`sim result`, simResult);
        console.log(`profit: ${formatEther(simResult.profit)} ETH`);

        break;
      } else {
        console.log(
          `backrun tx ${checkTxHash} not included in block ${currentBlock}`,
        );
      }
    }
  }
}

const main = async () => {
  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    backrunHandler(pendingTx.hash);
  });

  provider.on('block', async (blockNum) => {
    // send a tx that we can backrun on every block
    // tx will be backrun independently by the `backrunHandler` callback
    if ((await pendingTxHashes.length()) === 0) {
      const { tx } = await buildTx(executorWallet, 'initial tx');
      const txHash = await sendTx(
        mevShare,
        await executorWallet.signTransaction(tx),
      );
      console.log(`[block:${blockNum}] sent tx for backrun`, txHash);
      pendingTxHashes.push(txHash);
    }
  });
};

main();
