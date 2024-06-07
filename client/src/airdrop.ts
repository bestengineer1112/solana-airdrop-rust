/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
dotenv.config();

import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createAccountInfo, checkAccountInitialized } from "./utils";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  TokenAirdropAccountLayoutInterface,
  TokenAirdropAccountLayout,
} from "./account";
import BN = require("bn.js");
import bs58 = require("bs58");

type InstructionNumber = 0 | 1 | 2 | 3;

const transaction = async () => {
  console.log("4. Airdrop Tokens");
  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Airdrop Transaction");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const tokenAirdropProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID!);
  const sellerPubkey = new PublicKey(process.env.AIRDROP_PUBLIC_KEY!);
  const airdropPubkey = new PublicKey(process.env.BUYER_PUBLIC_KEY!);
  const airdropPrivateKey = Uint8Array.from(
    bs58.decode(process.env.BUYER_PRIVATE_KEY!)
  );
  const airdropKeypair = new Keypair({
    publicKey: airdropPubkey.toBytes(),
    secretKey: airdropPrivateKey,
  });

  const tokenPubkey = new PublicKey(process.env.TOKEN_PUBKEY!);
  const tokenAirdopProgramAccountPubkey = new PublicKey(
    process.env.TOKEN_AIRDROP_PROGRAM_ACCOUNT_PUBKEY!
  );
  const airdropTokenAccountPubkey = new PublicKey(
    process.env.AIRDROP_PUBLIC_KEY!
  );
  const tempTokenAccountPubkey = new PublicKey(
    process.env.TEMP_TOKEN_ACCOUNT_PUBKEY!
  );
  const instruction: InstructionNumber = 1;

  const tokenAirdropProgramAccount = await checkAccountInitialized(
    connection,
    tokenAirdopProgramAccountPubkey
  );
  const encodedTokenAirdropProgramAccountData = tokenAirdropProgramAccount.data;
  const decodedTokenAirdropProgramAccountData =
    TokenAirdropAccountLayout.decode(
      encodedTokenAirdropProgramAccountData
    ) as TokenAirdropAccountLayoutInterface;
  const tokenAirdropProgramAccountData = {
    isInitialized: decodedTokenAirdropProgramAccountData.isInitialized,
    airdropPubkey: new PublicKey(
      decodedTokenAirdropProgramAccountData.airdropPubkey
    ),
    tempTokenAccountPubkey: new PublicKey(
      decodedTokenAirdropProgramAccountData.tempTokenAccountPubkey
    ),
  };

  const token = new Token(
    connection,
    tokenPubkey,
    TOKEN_PROGRAM_ID,
    airdropKeypair
  );
  const airdropTokenAccount = await token.getOrCreateAssociatedAccountInfo(
    airdropKeypair.publicKey
  );

  const PDA = await PublicKey.findProgramAddress(
    [Buffer.from("token_airdrop")],
    tokenAirdropProgramId
  );

  const buyTokenIx = new TransactionInstruction({
    programId: tokenAirdropProgramId,
    keys: [
      createAccountInfo(airdropKeypair.publicKey, true, true),
      createAccountInfo(
        tokenAirdropProgramAccountData.airdropPubkey,
        false,
        true
      ),
      createAccountInfo(
        tokenAirdropProgramAccountData.tempTokenAccountPubkey,
        false,
        true
      ),
      createAccountInfo(tokenAirdopProgramAccountPubkey, false, true),
      createAccountInfo(airdropTokenAccount.address, false, true),
      createAccountInfo(TOKEN_PROGRAM_ID, false, false),
      createAccountInfo(PDA[0], false, false),
    ],
    data: Buffer.from(Uint8Array.of(instruction)),
  });

  const tx = new Transaction().add(buyTokenIx);

  await sendAndConfirmTransaction(connection, tx, [airdropKeypair]);
  //phase1 end

  //phase2 (check token sale)
  const sellerTokenAccountBalance = await connection.getTokenAccountBalance(
    airdropTokenAccountPubkey
  );
  const tempTokenAccountBalance = await connection.getTokenAccountBalance(
    tempTokenAccountPubkey
  );
  const airdropTokenAccountBalance = await connection.getTokenAccountBalance(
    airdropTokenAccount.address
  );

  console.table([
    {
      sellerTokenAccountBalance:
        sellerTokenAccountBalance.value.amount.toString(),
      tempTokenAccountBalance: tempTokenAccountBalance.value.amount.toString(),
      airdropTokenAccountBalance:
        airdropTokenAccountBalance.value.amount.toString(),
    },
  ]);

  const sellerSOLBalance = await connection.getBalance(
    sellerPubkey,
    "confirmed"
  );
  const airdropSOLBalance = await connection.getBalance(
    airdropKeypair.publicKey,
    "confirmed"
  );

  console.table([
    {
      sellerSOLBalance: sellerSOLBalance / LAMPORTS_PER_SOL,
      airdropSOLBalance: airdropSOLBalance / LAMPORTS_PER_SOL,
    },
  ]);

  console.log(`✨TX successfully finished✨\n`);
  //#phase2 end
};

transaction();
