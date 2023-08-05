# Tinyhunter

A tiny framework to run searcher for Flashbots mev-share on Goerli network

### Setup

```sh
cd src/
cp .env.example .env
vim .env
```

### CTF

`yarn ctf:simple 0x0000000` - listen for `Activate` event to call claimReward function

### Avaliable scripts

`yarn listener` - listening for pending transaction and new bundle

`yarn history` - get historical event stream data

`yarn backrun` - perform a backrun

`yarn send-tx` - submit a transaction

`yarn send-bundle` - submit a bundle
