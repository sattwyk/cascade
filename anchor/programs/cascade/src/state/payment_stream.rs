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
