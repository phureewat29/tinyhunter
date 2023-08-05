import { Contract, getCreate2Address, keccak256 } from 'ethers';

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
const CONTRACT_CHILD_BYTECODE =
  '0x60a060405233608052436000556080516101166100266000396000606f01526101166000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806396b81609146037578063b88a802f146051575b600080fd5b603f60005481565b60405190815260200160405180910390f35b60576059565b005b4360005414606657600080fd5b600080819055507f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031663720ecf456040518163ffffffff1660e01b8152600401600060405180830381600087803b15801560c757600080fd5b505af115801560da573d6000803e3d6000fd5b5050505056fea26469706673582212207a00db890eff47285ac0d9c9b8735727d476952aa87b45ee82fd6bb4f42c6fa764736f6c63430008130033';

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

const ruleAddrFunc = (pendingTx: IPendingTransaction) =>
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

const ruleSaltFunc = (pendingTx: IPendingTransaction) =>
  (pendingTx.logs || []).some(
    (log) =>
      log.data &&
      log.address === '0x5ea0fea0164e5aa58f407debb344876b5ee10dea' &&
      log.topics.some(
        (topic) =>
          topic ===
          '0x71fd33d3d871c60dc3d6ecf7c8e5bb086aeb6491528cce181c289a411582ff1c',
      ),
  );

const main = async () => {
  let newContractAddress: string;

  mevShare.on('transaction', async (pendingTx: IPendingTransaction) => {
    if (ruleSaltFunc(pendingTx)) {
      try {
        const [salt] = contract.interface.decodeEventLog(
          'ActivateBySalt',
          (pendingTx.logs && pendingTx.logs[0].data) || '',
        );
        newContractAddress = await getCreate2Address(
          CONTRACT_ADDRESS,
          salt,
          keccak256(CONTRACT_CHILD_BYTECODE),
        );
        console.log('[salt] new contract address', newContractAddress);
        backrunHandler(pendingTx.hash, newContractAddress);
      } catch (e) {
        return;
      }
    } else if (ruleAddrFunc(pendingTx)) {
      try {
        [newContractAddress] = contract.interface.decodeEventLog(
          'Activate',
          (pendingTx.logs && pendingTx.logs[0].data) || '',
        );
        console.log('[addr] new contract address', newContractAddress);
        backrunHandler(pendingTx.hash, newContractAddress);
      } catch (e) {
        return;
      }
    }
  });
};

main();
