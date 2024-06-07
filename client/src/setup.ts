/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { updateEnv } from "./utils";
import bs58 = require("bs58");

const setup = async () => {
  console.log("1. Setup Accounts");

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const airdropPubkey = new PublicKey(process.env.AIRDROP_PUBLIC_KEY!);
  const airdropPrivateKey = Uint8Array.from(
    bs58.decode(process.env.AIRDROP_PRIVATE_KEY!)
  );
  const airdropKeypair = new Keypair({
    publicKey: airdropPubkey.toBytes(),
    secretKey: airdropPrivateKey,
  });

  const buyerPubkey = new PublicKey(process.env.BUYER_PUBLIC_KEY!);

  console.log(
    "Create Token Mint Account...\n",
    airdropKeypair.publicKey,
    airdropKeypair.secretKey
  );
  const token = await Token.createMint(
    connection,
    airdropKeypair,
    airdropKeypair.publicKey,
    null,
    0,
    TOKEN_PROGRAM_ID
  );

  console.log("Create airdrop Token Account...\n");
  const airdropTokenAccount = await token.getOrCreateAssociatedAccountInfo(
    airdropKeypair.publicKey
  );

  console.log("Mint 5000 Tokens to airdrop token account...\n");
  await token.mintTo(airdropTokenAccount.address, airdropKeypair, [], 8000000);

  const airdropTokenBalance = await connection.getTokenAccountBalance(
    airdropTokenAccount.address,
    "confirmed"
  );

  // console.log("Requesting SOL for buyer...");
  //await connection.requestAirdrop(buyerPubkey, LAMPORTS_PER_SOL * 2);

  const airdropSOLBalance = await connection.getBalance(
    airdropPubkey,
    "confirmed"
  );
  const buyerSOLBalance = await connection.getBalance(buyerPubkey, "confirmed");

  console.table([
    {
      airdropSOLBalance: airdropSOLBalance / LAMPORTS_PER_SOL,
      buyerSOLBalance: buyerSOLBalance / LAMPORTS_PER_SOL,
    },
  ]);

  console.table([
    {
      tokenPubkey: token.publicKey.toString(),
      airdropTokenAccountPubkey: airdropTokenAccount.address.toString(),
      airdropTokenBalance: airdropTokenBalance.value.amount,
    },
  ]);
  console.log(`✨TX successfully finished✨\n`);

  process.env.airdrop_TOKEN_ACCOUNT_PUBKEY =
    airdropTokenAccount.address.toString();
  process.env.TOKEN_PUBKEY = token.publicKey.toString();
  updateEnv();
};

setup();
