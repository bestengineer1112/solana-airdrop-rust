import { PublicKey } from "@solana/web3.js";

//@ts-expect-error missing types
import * as BufferLayout from "buffer-layout";

export const TokenAirdropAccountLayout = BufferLayout.struct([
  BufferLayout.u8("isInitialized"),
  BufferLayout.blob(32, "sellerPubkey"),
  BufferLayout.blob(32, "tempTokenAccountPubkey"),
  BufferLayout.blob(8, "airdroppedTokenAmount"),
  BufferLayout.blob(8, "fee"),
]);

export interface TokenAirdropAccountLayoutInterface {
  [index: string]: number | Uint8Array;
  isInitialized: number;
  sellerPubkey: Uint8Array;
  tempTokenAccountPubkey: Uint8Array;
  airdroppedTokenAmount: Uint8Array;
  fee: Uint8Array;
}

export interface ExpectedTokenAirdropAccountLayoutInterface {
  [index: string]: number | PublicKey;
  isInitialized: number;
  sellerPubkey: PublicKey;
  tempTokenAccountPubkey: PublicKey;
  airdroppedTokenAmount: number;
  fee: number;
}
