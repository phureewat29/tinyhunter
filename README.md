# Tinyhunter Flashbots CTF

A tiny framework to solve all 10 challenges in Flashbots CTF: https://ctf.flashbots.net/

### Setup

```sh
cd src/
cp .env.example .env
vim .env
```

### Flashbots CTF

`yarn ctf:simple 0x1cddb0ba9265bb3098982238637c2872b7d12474`

`yarn ctf:simple 0x98997b55bb271e254bec8b85763480719dab0e53`

`yarn ctf:simple 0x65459dd36b03af9635c06bad1930db660b968278`

`yarn ctf:simple 0x20a1a5857fdff817aa1bd8097027a841d4969aa5`

`yarn ctf:magic-v1`

`yarn ctf:magic-v2`

`yarn ctf:magic-v3`

`yarn ctf:new-contract`

`yarn ctf:triple`

### Scripts

`yarn listener` - listening for pending transaction and new bundle
