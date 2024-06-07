/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as BN from "bn.js";
import { createAccountInfo, updateEnv } from "./utils";

import { TokenAirdropAccountLayout } from "./account";
import { AccountLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 = require("bs58");

type InstructionNumber = 0 | 1 | 2 | 3;

const transaction = async () => {
  console.log("2. Start Token Airdrop");

  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Transaction");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const tokenAirdropProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);
  const airdropPubkey = new PublicKey(process.env.AIRDROP_PUBLIC_KEY!);
  const airdropPrivateKey = Uint8Array.from(
    bs58.decode(process.env.AIRDROP_PRIVATE_KEY!)
  );

  const airdropKeypair = new Keypair({
    publicKey: airdropPubkey.toBytes(),
    secretKey: airdropPrivateKey,
  });

  const tokenMintAccountPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);
  const airdropTokenAccountPubkey = new PublicKey(
    process.env.AIRDROP_TOKEN_ACCOUNT_PUBKEY!
  );
  console.log(
    "airdropTokenAccountPubkey: ",
    airdropTokenAccountPubkey.toBase58()
  );
  const instruction: InstructionNumber = 0;

  const airdropAmount = 8000000;
  const tokenAmount = 1200;
  const fee = 0.01 * LAMPORTS_PER_SOL;

  const tempTokenAccountKeypair = new Keypair();
  const createTempTokenAccountIx = SystemProgram.createAccount({
    fromPubkey: airdropKeypair.publicKey,
    newAccountPubkey: tempTokenAccountKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    ),
    space: AccountLayout.span,
    programId: TOKEN_PROGRAM_ID,
  });

  const initTempTokenAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    tokenMintAccountPubkey,
    tempTokenAccountKeypair.publicKey,
    airdropKeypair.publicKey
  );

  const transferTokenToTempTokenAccountIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    airdropTokenAccountPubkey,
    tempTokenAccountKeypair.publicKey,
    airdropKeypair.publicKey,
    [],
    airdropAmount
  );

  const tokenSaleProgramAccountKeypair = new Keypair();
  const createTokenSaleProgramAccountIx = SystemProgram.createAccount({
    fromPubkey: airdropKeypair.publicKey,
    newAccountPubkey: tokenSaleProgramAccountKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(
      TokenAirdropAccountLayout.span
    ),
    space: TokenAirdropAccountLayout.span,
    programId: tokenAirdropProgramId,
  });

  console.log("tokenAirdropProgramId", tokenAirdropProgramId.toBase58());

  const initTokenSaleProgramIx = new TransactionInstruction({
    programId: tokenAirdropProgramId,
    keys: [
      createAccountInfo(airdropKeypair.publicKey, true, false),
      createAccountInfo(tempTokenAccountKeypair.publicKey, false, true),
      createAccountInfo(tokenSaleProgramAccountKeypair.publicKey, false, true),
      createAccountInfo(SYSVAR_RENT_PUBKEY, false, false),
      createAccountInfo(TOKEN_PROGRAM_ID, false, false),
    ],
    data: Buffer.from(
      Uint8Array.of(
        instruction,
        ...new BN(tokenAmount).toArray("le", 8),
        ...new BN(fee).toArray("le", 8)
      )
    ),
  });

  console.log("Send transaction...\n");
  const tx = new Transaction().add(
    createTempTokenAccountIx,
    initTempTokenAccountIx,
    transferTokenToTempTokenAccountIx,
    createTokenSaleProgramAccountIx,
    initTokenSaleProgramIx
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [
    airdropKeypair,
    tempTokenAccountKeypair,
    tokenSaleProgramAccountKeypair,
  ]);
  console.log("signature: ", signature);
  console.log(`✨TX successfully finished✨\n`);
  //#phase2 end

  process.env.TOKEN_AIRDROP_PROGRAM_ACCOUNT_PUBKEY =
    tokenSaleProgramAccountKeypair.publicKey.toString();
  process.env.TEMP_TOKEN_ACCOUNT_PUBKEY =
    tempTokenAccountKeypair.publicKey.toString();
  updateEnv();
};

transaction();
