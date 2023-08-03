# Tinyhunter

A tiny framework to run searcher for Flashbots mev-share on Goerli network

### Setup

```sh
cd src/
cp .env.example .env
vim .env
```

### Avaliable scripts

`yarn listener` - listen for pending transaction and bundle

`yarn history` - get historical event stream data

`yarn backrun` - perform backrun transaction

`yarn send-tx` - submit a transaction to Flashbots

`yarn send-bundle` - submit a bundle to Flashbots
