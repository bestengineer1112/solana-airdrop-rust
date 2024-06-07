use solana_program::{
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};

pub struct AirdropProgramData {
    pub is_initialized: bool,
    pub airdrop_pubkey: Pubkey,
    pub temp_token_account_pubkey: Pubkey,
    pub airdropped_token_amount: u64
    pub fee: u64
}

impl AirdropProgramData {
    pub fn init(
        &mut self,
        is_initialized: bool,
        airdrop_pubkey: Pubkey,
        temp_token_account_pubkey: Pubkey,
        airdropped_token_amount: u64
        fee : u64
    ) {
        self.is_initialized = is_initialized;
        self.airdrop_pubkey = airdrop_pubkey;
        self.temp_token_account_pubkey = temp_token_account_pubkey;
        self.airdropped_token_amount = airdropped_token_amount;
        self.fee = fee;
    }

    pub fn increase_token_amount (
        &mut self,
        airdropped_token_amount: u64,
    ) {
        self.airdropped_token_amount = self.airdropped_token_amount + airdropped_token_amount;
    }

}

impl Sealed for AirdropProgramData {}

impl IsInitialized for AirdropProgramData {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for AirdropProgramData {
    const LEN: usize = 113;
    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let src = array_ref![src, 0, AirdropProgramData::LEN];
        let (
            is_initialized,
            airdrop_pubkey,
            temp_token_account_pubkey,
            airdropped_token_amount
        ) = array_refs![src, 1, 32, 32, 8];

        let is_initialized = match is_initialized {
            [0] => false,
            [1] => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };

        return Ok(AirdropProgramData {
            is_initialized,
            airdrop_pubkey: Pubkey::new_from_array(*airdrop_pubkey),
            temp_token_account_pubkey: Pubkey::new_from_array(*temp_token_account_pubkey),
            airdropped_token_amount: u64::from_le_bytes(*airdropped_token_amount)
        });
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let dst = array_mut_ref![dst, 0, AirdropProgramData::LEN];
        let (
            is_initialized_dst,
            airdrop_pubkey_dst,
            temp_token_account_pubkey_dst,
            airdropped_token_amount_dst
        ) = mut_array_refs![dst, 1, 32, 32, 8];

        let AirdropProgramData {
            is_initialized,
            airdrop_pubkey,
            temp_token_account_pubkey,
            airdropped_token_amount
        } = self;

        is_initialized_dst[0] = *is_initialized as u8;
        airdrop_pubkey_dst.copy_from_slice(airdrop_pubkey.as_ref());
        temp_token_account_pubkey_dst.copy_from_slice(temp_token_account_pubkey.as_ref());
        *airdropped_token_amount_dst = airdropped_token_amount.to_le_bytes();
    }
}
