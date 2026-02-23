use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PaymentStream {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub hourly_rate: u64,
    pub total_deposited: u64,
    pub withdrawn_amount: u64,
    pub created_at: i64,
    pub employee_last_activity_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl PaymentStream {
    pub fn assert_accounting_invariant(&self) -> Result<()> {
        require!(
            self.withdrawn_amount <= self.total_deposited,
            ErrorCode::InvalidStreamAccounting
        );
        Ok(())
    }

    pub fn expected_vault_balance(&self) -> Result<u64> {
        self.total_deposited
            .checked_sub(self.withdrawn_amount)
            .ok_or(ErrorCode::InvalidStreamAccounting.into())
    }
}
