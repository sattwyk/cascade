use anchor_lang::prelude::*;
use crate::state::PaymentStream;
use crate::errors::ErrorCode;

pub fn refresh_activity(ctx: Context<RefreshActivity>) -> Result<()> {
        let stream = &mut ctx.accounts.stream;
        let clock = Clock::get()?;

        require!(stream.is_active, ErrorCode::StreamInactive);
        require!(ctx.accounts.employee.key() == stream.employee, ErrorCode::UnauthorizedEmployee);

        stream.employee_last_activity_at = clock.unix_timestamp;
        
        Ok(())
}

#[derive(Accounts)]
pub struct RefreshActivity<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"stream", stream.employer.as_ref(), employee.key().as_ref()],
        bump = stream.bump
    )]
    pub stream: Account<'info, PaymentStream>,
}