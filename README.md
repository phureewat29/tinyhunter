# Tinyhunter

A tiny framework to run searcher for Flashbots mev-share on Goerli network

### Setup

```sh
cd src/
cp .env.example .env
vim .env
```

### Flashbots CTF

`yarn ctf:simple 0x000000` - listen for `activateRewardSimple` tx upon each constrain to build the bundle, see avaliable contracts in `src/ctf-simple.ts`

`yarn ctf:magic-v1` - listen for `activateRewardMagicNumber` tx to build the set of bundle within magic number range

### Avaliable scripts

`yarn listener` - listening for pending transaction and new bundle

`yarn history` - get historical event stream data

`yarn backrun` - perform a backrun

`yarn send-tx` - submit a transaction

`yarn send-bundle` - submit a bundle
