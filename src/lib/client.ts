import { JsonRpcProvider, Wallet, WebSocketProvider } from 'ethers';
import MevShareClient from '@flashbots/mev-share-client';
import Env from './env';

export function initMevShare() {
  const provider = new JsonRpcProvider(Env.providerUrl);
  const authSigner = new Wallet(Env.authKey).connect(provider);
  const executorWallet = new Wallet(Env.senderKey).connect(provider);
  const mevShare = MevShareClient.useEthereumGoerli(authSigner);
  const wssProvider = new WebSocketProvider(Env.wssProviderUrl);

  console.log('mev-share auth address: ' + authSigner.address);
  console.log('executor address: ' + executorWallet.address);

  return {
    provider,
    executorWallet,
    authSigner,
    mevShare,
    wssProvider
  };
}
