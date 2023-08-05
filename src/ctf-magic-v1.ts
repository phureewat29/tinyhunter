import { Contract } from 'ethers';

import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CTF_MAGIC_NUMBER_V1 } from './lib/abi';

const TX_GAS_LIMIT = 500000;
const MAX_GAS_PRICE = 100n;
const MAX_PRIORITY_FEE = 100n;
const GWEI = 10n ** 9n;
const TIP = 100n * GWEI;

const BLOCKS_TO_TRY = 3;
const CONTRACT_ADDRESS = '0x118bcb654d9a7006437895b51b5cd4946bf6cdc2';

const { mevShare, executorWallet, provider } = initMevShare();
const contract = new Contract(
  CONTRACT_ADDRESS,
  MEV_SHARE_CTF_MAGIC_NUMBER_V1,
  executorWallet,
);

async function backrunHandler(
  pendingTxHash: string,
  lowerBound: number,
  upperBound: number,
) {
  const currentBlock = await provider.getBlockNumber();
  console.log('current block', currentBlock);

  const nonce = await executorWallet.getNonce('latest');

  const txs = [];
  for (
    let i = 0, magicNumber = lowerBound;
    magicNumber <= upperBound;
    i++, magicNumber++
  ) {
    const tx = await contract.claimReward.populateTransaction(magicNumber);
    const signedTx = await executorWallet.signTransaction({
      ...tx,
      chainId: 5,
      maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
      gasLimit: TX_GAS_LIMIT,
      nonce: nonce + i,
    });
    txs.push({ tx: signedTx, canRevert: true });
  }

  const bundleParams: BundleParams = {
    inclusion: { block: currentBlock, maxBlock: currentBlock + BLOCKS_TO_TRY },
    body: [{ hash: pendingTxHash }, ...txs],
  };
  // const simResult = await mevShare.simulateBundle(bundleParams);
  // console.log('sim result', simResult);
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  console.log('bundle hash', sendBundleResult.bundleHash);
}

const ruleFunc = (pendingTx: IPendingTransaction) =>
  (pendingTx.logs || []).some(
    (log) =>
      log.data &&
      log.address === '0x118bcb654d9a7006437895b51b5cd4946bf6cdc2' &&
      log.topics.some(
        (topic) =>
          topic ===
          '0x86a27c2047f889fafe51029e28e24f466422abe8a82c0c27de4683dda79a0b5d',
      ),
  );

const main = async () => {
  let lowerBound, upperBound;

  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (ruleFunc(pendingTx)) {
      try {
        [lowerBound, upperBound] = contract.interface.decodeEventLog(
          'Activate',
          (pendingTx.logs && pendingTx.logs[0].data) || '',
        );
        console.log(`lowerBound: ${lowerBound}, upperBound: ${upperBound}`);
        backrunHandler(pendingTx.hash, lowerBound, upperBound);
      } catch (e) {
        return;
      }
    }
  });
};

main();
