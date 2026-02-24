use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi");

#[program]
pub mod cascade {
    use super::*;

    pub fn create_stream(
        ctx: Context<CreateStream>,
        hourly_rate: u64,
        total_deposit: u64,
    ) -> Result<()> {
        instructions::create_stream::create_stream(ctx, hourly_rate, total_deposit)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw(ctx, amount)
    }

    pub fn refresh_activity(ctx: Context<RefreshActivity>) -> Result<()> {
        instructions::refresh_activity::refresh_activity(ctx)
    }

    pub fn employer_emergency_withdraw(ctx: Context<EmployerEmergencyWithdraw>) -> Result<()> {
        instructions::employer_emergency_withdraw::employer_emergency_withdraw(ctx)
    }

    pub fn top_up_stream(ctx: Context<TopUpStream>, additional_amount: u64) -> Result<()> {
        instructions::top_up_stream::top_up_stream(ctx, additional_amount)
    }

    pub fn close_stream(ctx: Context<CloseStream>) -> Result<()> {
        instructions::close_stream::close_stream(ctx)
    }
}
