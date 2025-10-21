use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::PaymentStream;
use crate::errors::ErrorCode;

pub fn employer_emergency_withdraw(ctx: Context<EmployerEmergencyWithdraw>) -> Result<()> {
        let stream = &mut ctx.accounts.stream;
        let clock = Clock::get()?;

        require!(ctx.accounts.employer.key() == stream.employer, ErrorCode::UnauthorizedEmployer);

        // Check if 30 days have passed since employee's last activity
        let employee_inactive_duration = clock.unix_timestamp - stream.employee_last_activity_at;
        let thirty_days: i64 = 30 * 24 * 60 * 60;

        require!(
            employee_inactive_duration >= thirty_days,
            ErrorCode::EmployeeStillActive
        );
        
        let remaining_balance = stream.total_deposited
            .checked_sub(stream.withdrawn_amount)
            .ok_or(ErrorCode::InsufficientBalance)?;

        // Transfer remaining balance back to employer
        let employer_key = stream.employer.key();
        let employee_key = stream.employee.key();
        let seeds = &[
            b"stream",
            employer_key.as_ref(),
            employee_key.as_ref(),
            &[stream.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.employer_token_account.to_account_info(),
            authority: stream.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer);
        token::transfer(cpi_ctx, remaining_balance)?;

        // Mark stream as inactive
        stream.is_active = false;

        Ok(())
}

#[derive(Accounts)]
pub struct EmployerEmergencyWithdraw<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"stream", employer.key().as_ref(), stream.employee.as_ref()],
        bump = stream.bump,
        has_one = vault
    )]
    pub stream: Account<'info, PaymentStream>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub employer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}