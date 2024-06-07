# Solana Presale Program

## Development

### Environment Setup

1. Install the latest Rust stable from https://rustup.rs/
2. Install Solana v1.6.1 or later from https://docs.solana.com/cli/install-solana-cli-tools
3. Install the `libudev` development package for your distribution (`libudev-dev` on Debian-derived distros, `libudev-devel` on Redhat-derived).

### Build

The normal cargo build is available for building programs against your host machine:
```
$ cargo build
```

To build a specific program, such as SPL Token, for the Solana BPF target:
```
$ cd program
$ cargo build-bpf
```

### Deploy

```
$ solana program deploy target/deploy/solana_presale.so
```

### Test

```bash
$ cd client
$ npm install
$ npm run all
```