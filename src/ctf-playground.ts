import { Contract } from 'ethers';

import { BundleParams } from '@flashbots/mev-share-client';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CTF_SIMPLE_ABI } from './lib/abi';

const TX_GAS_LIMIT = 400000;
const MAX_GAS_PRICE = 500n;
const MAX_PRIORITY_FEE = 100n;
const GWEI = 10n ** 9n;
const TIP = BigInt(1e9) * BigInt(1e3);

const BLOCKS_TO_TRY = 24;
// 0x98997b55Bb271e254BEC8B85763480719DaB0E53
// 0x1cdDB0BA9265bb3098982238637C2872b7D12474
// 0x65459dD36b03Af9635c06BAD1930DB660b968278
// 0x20a1A5857fDff817aa1BD8097027a841D4969AA5
// 0x118Bcb654d9A7006437895B51b5cD4946bF6CdC2
// 0x9BE957D1c1c1F86Ba9A2e1215e9d9EEFdE615a56
// 0xE8B7475e2790409715AF793F799f3Cc80De6f071
// 0x5eA0feA0164E5AA58f407dEBb344876b5ee10DEA
// 0x1eA6Fb65BAb1f405f8Bdb26D163e6984B9108478
const CONTRACT_ADDRESS = process.argv[2];

const { mevShare, executorWallet, provider } = initMevShare();
const contract = new Contract(
  CONTRACT_ADDRESS,
  MEV_SHARE_CTF_SIMPLE_ABI,
  executorWallet,
);

const main = async () => {
  const currentBlock = await provider.getBlockNumber();
  console.log('current block', currentBlock);
  const targetBlock = Number(await contract.activeBlock());
  // const targetBlock = currentBlock + 5;
  console.log('target block', targetBlock);
  const tx = await contract.claimReward.populateTransaction();
  const nonce = await executorWallet.getNonce();
  console.log('nonce', nonce);
  const claimTx = {
    ...tx,
    chainId: 5,
    maxFeePerGas: MAX_GAS_PRICE * GWEI + TIP,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE * GWEI + TIP,
    gasLimit: TX_GAS_LIMIT,
    nonce: nonce + 1,
  };
  const signedTx = await executorWallet.signTransaction(claimTx);
  console.log('signed tx', signedTx);
  const bundleParams: BundleParams = {
    inclusion: {
      block: targetBlock,
      maxBlock: targetBlock + BLOCKS_TO_TRY,
    },
    body: [{ tx: signedTx, canRevert: false }],
  };
  // const simResult = await mevShare.simulateBundle(bundleParams);
  // console.log(simResult);
  const sendBundleResult = await mevShare.sendBundle(bundleParams);
  console.log('bundle hash', sendBundleResult.bundleHash);
};

main();
