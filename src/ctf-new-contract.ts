import { Contract } from 'ethers';

import { BundleParams, IPendingTransaction } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CTF_NEW_CONTRACT } from './lib/abi';

const TX_GAS_LIMIT = 500000;
const MAX_GAS_PRICE = 100n;
const MAX_PRIORITY_FEE = 100n;
const GWEI = 10n ** 9n;
const TIP = 10n * GWEI;

const BLOCKS_TO_TRY = 3;
const CONTRACT_ADDRESS = '0x5ea0fea0164e5aa58f407debb344876b5ee10dea';

const { mevShare, executorWallet, provider } = initMevShare();
const contract = new Contract(
  CONTRACT_ADDRESS,
  MEV_SHARE_CTF_NEW_CONTRACT,
  executorWallet,
);

async function backrunHandler(
  pendingTxHash: string,
  newContractAddress: string,
) {
  const currentBlock = await provider.getBlockNumber();
  const nonce = await executorWallet.getNonce('latest');
  console.log('current block', currentBlock);

  const newlyDeployedContract = new Contract(
    newContractAddress,
    [
      {
        inputs: [],
        name: 'claimReward',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    executorWallet,
  );
  const tx = await newlyDeployedContract.claimReward.populateTransaction();
  const signedTx = await executorWallet.signTransaction({
    ...tx,
    chainId: 5,
    maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
    gasLimit: TX_GAS_LIMIT,
    nonce: nonce,
  });
  const bundleParams: BundleParams = {
    inclusion: {
      block: currentBlock + 1,
      maxBlock: currentBlock + BLOCKS_TO_TRY,
    },
    body: [{ hash: pendingTxHash }, { tx: signedTx, canRevert: false }],
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
      log.address === '0x5ea0fea0164e5aa58f407debb344876b5ee10dea' &&
      log.topics.some(
        (topic) =>
          topic ===
          '0xf7e9fe69e1d05372bc855b295bc4c34a1a0a5882164dd2b26df30a26c1c8ba15',
      ),
  );

const main = async () => {
  let newContractAddress;

  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (ruleFunc(pendingTx)) {
      try {
        [newContractAddress] = contract.interface.decodeEventLog(
          'Activate',
          (pendingTx.logs && pendingTx.logs[0].data) || '',
        );
        console.log('new contract address', newContractAddress);
        backrunHandler(pendingTx.hash, newContractAddress);
      } catch (e) {
        return;
      }
    }
  });
};

main();
