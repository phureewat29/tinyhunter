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
const CONTRACT_ADDRESS = '0xe8b7475e2790409715af793f799f3cc80de6f071';

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

  const magicNumberList = []
  for (let i = lowerBound; i < upperBound; i++) {
    magicNumberList.push(i)
  }

  await Promise.all(magicNumberList.map(async (magicNumber) => {
    const tx = await contract.claimReward.populateTransaction(magicNumber);
    const signedTx = await executorWallet.signTransaction({
      ...tx,
      chainId: 5,
      maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
      gasLimit: TX_GAS_LIMIT,
      nonce: nonce,
    });
    const bundleParams: BundleParams = {
      inclusion: { block: currentBlock + 1, maxBlock: currentBlock + BLOCKS_TO_TRY },
      body: [{ hash: pendingTxHash }, { tx: signedTx, canRevert: false }],
    };
    const sendBundleResult = await mevShare.sendBundle(bundleParams);
    console.log('bundle hash', sendBundleResult.bundleHash);
    // const simResult = await mevShare.simulateBundle(bundleParams);
    // console.log('sim result', simResult);
  }))
}

const ruleFunc = (pendingTx: IPendingTransaction) =>
  (pendingTx.logs || []).some(
    (log) =>
      log.data &&
      log.address === '0xe8b7475e2790409715af793f799f3cc80de6f071' &&
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
        console.log(pendingTx);
        [lowerBound, upperBound] = contract.interface.decodeEventLog(
          'Activate',
          (pendingTx.logs && pendingTx.logs[0].data) || '',
        );
        const currentBlock = await provider.getBlockNumber();
        console.log(`lowerBound: ${lowerBound}, upperBound: ${upperBound}`);
        backrunHandler(pendingTx.hash, lowerBound, upperBound);
      } catch (e) {
        return;
      }
    }
  });
};

main();
