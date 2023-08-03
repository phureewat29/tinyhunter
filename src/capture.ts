import { Contract } from 'ethers';
import { initMevShare } from './lib/client';
import { MEV_SHARE_CAPTURE_ABI } from './lib/abi';

const { mevShare, executorWallet } = initMevShare();

const MEV_SHARE_CAPTURE_ADDRESS = '0x6C9c151642C0bA512DE540bd007AFa70BE2f1312';

const mevShareCaptureContract = new Contract(
  MEV_SHARE_CAPTURE_ADDRESS,
  MEV_SHARE_CAPTURE_ABI,
  executorWallet,
);

const main = async () => {
  //TODO: call contract
  console.info('WIP');
};

main();
