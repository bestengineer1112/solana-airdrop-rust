use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use spl_token::state::Account;

use crate::{instruction::AirdropInstruction, state::AirdropProgramData};
pub struct Processor;
impl Processor {
    pub fn process(
        token_program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = AirdropInstruction::unpack(instruction_data)?;

        match instruction {
            AirdropInstruction::InitTokenAirdrop {
                token_amount,
                fee
            } => {
                msg!("Instruction: init token sale program");
                Self::init_token_airdrop_program(
                    accounts,
                    token_program_id,
                    token_amount,
                    fee
                )
            }

            AirdropInstruction::AirdropToken { number_of_tokens } => {
                msg!("Instruction: airdrop token");
                Self::airdrop_token(accounts, token_program_id, number_of_tokens)
            }
        }
    }

    fn init_token_airdrop_program(
        account_info_list: &[AccountInfo],
        token_airdrop_program_id: &Pubkey,
        token_amount: u64,
        fee: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut account_info_list.iter();

        let airdrop_account_info = next_account_info(account_info_iter)?;
        if !airdrop_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        let temp_token_account_info = next_account_info(account_info_iter)?;
        if *temp_token_account_info.owner != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }
        
        let token_airdrop_program_account_info = next_account_info(account_info_iter)?;

        let rent_account_info = next_account_info(account_info_iter)?;
        let rent = &Rent::from_account_info(rent_account_info)?;
        
        if !rent.is_exempt(
            token_airdrop_program_account_info.lamports(),
            token_airdrop_program_account_info.data_len(),
        ) {
            return Err(ProgramError::AccountNotRentExempt);
        }
        
        let mut token_airdrop_program_account_data = AirdropProgramData::unpack_unchecked(
            &token_airdrop_program_account_info.try_borrow_data()?,
        )?;
        
        if token_airdrop_program_account_data.is_initialized {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        
        token_airdrop_program_account_data.init(
            true,
            *airdrop_account_info.key,
            *temp_token_account_info.key,
            token_amount,
            fee
        );
        
        AirdropProgramData::pack(
            token_airdrop_program_account_data,
            &mut token_airdrop_program_account_info.try_borrow_mut_data()?,
        )?;

        let (pda, _bump_seed) =
            Pubkey::find_program_address(&[b"token_airdrop"], token_airdrop_program_id);
        
        let token_program = next_account_info(account_info_iter)?;
        let set_authority_ix = spl_token::instruction::set_authority(
            token_program.key,
            temp_token_account_info.key,
            Some(&pda),
            spl_token::instruction::AuthorityType::AccountOwner,
            airdrop_account_info.key,
            &[&airdrop_account_info.key],
        )?;

        msg!("Change tempToken's Authroity : airdrop -> token_program");
        invoke(
            &set_authority_ix,
            &[
                token_program.clone(),
                temp_token_account_info.clone(),
                airdrop_account_info.clone(),
            ],
        )?;

        return Ok(());
    }

    fn airdrop_token(accounts: &[AccountInfo], token_airdrop_program_id: &Pubkey) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let airdrop_user_account_info = next_account_info(account_info_iter)?;
        if !airdrop_user_account_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let airdrop_account_info = next_account_info(account_info_iter)?;
        let temp_token_account_info = next_account_info(account_info_iter)?;

        let token_airdrop_program_account_info = next_account_info(account_info_iter)?;
        let mut token_airdrop_program_account_data =
            AirdropProgramData::unpack_unchecked(&token_airdrop_program_account_info.try_borrow_data()?)?;
        if *airdrop_account_info.key != token_airdrop_program_account_data.airdrop_pubkey {
            return Err(ProgramError::InvalidAccountData);
        }

        if *temp_token_account_info.key != token_airdrop_program_account_data.temp_token_account_pubkey
        {
            return Err(ProgramError::InvalidAccountData);
        }
        

        msg!("Airdrop Token : temp token account -> airdrop token account");
        let airdrop_token_account_info = next_account_info(account_info_iter)?;
        let token_program = next_account_info(account_info_iter)?;
        let (pda, bump_seed) =
            Pubkey::find_program_address(&[b"token_airdrop"], token_airdrop_program_id);

        let transfer_token_to_airdrop_ix = spl_token::instruction::transfer(
            token_program.key,
            temp_token_account_info.key,
            airdrop_token_account_info.key,
            &pda,
            &[&pda],
            token_airdrop_program_account_data.airdropped_token_amount,
        )?;

        
        msg!("Transfer {} SOL : buy account -> airdrop account");
        let transfer_sol_to_seller = system_instruction::transfer(
            airdrop_user_account_info.key,
            airdrop_account_info.key,
            token_airdrop_program_account_data.fee,
        );
        

        let pda = next_account_info(account_info_iter)?;
        invoke_signed(
            &transfer_token_to_airdrop_ix,
            &[
                temp_token_account_info.clone(),
                airdrop_token_account_info.clone(),
                pda.clone(),
                token_program.clone(),
            ],
            &[&[&b"token_airdrop"[..], &[bump_seed]]],
        )?;

        token_airdrop_program_account_data.increase_token_amount(number_of_tokens);

        AirdropProgramData::pack(
            token_airdrop_program_account_data,
            &mut token_airdrop_program_account_info.try_borrow_mut_data()?,
        )?;

        return Ok(());
    }
}
