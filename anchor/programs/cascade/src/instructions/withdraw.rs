use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::PaymentStream;
use crate::errors::ErrorCode;

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let stream = &mut ctx.accounts.stream;
        let clock = Clock::get()?;

        require!(stream.is_active, ErrorCode::StreamInactive);
        require!(ctx.accounts.employee.key() == stream.employee, ErrorCode::UnauthorizedEmployee);

        // Calculate total earned based on time elapsed
        let hours_elapsed = clock.unix_timestamp.checked_sub(stream.created_at).ok_or(ErrorCode::InvalidTimestamp)?;
        let total_earned_uncapped = (hours_elapsed as u64)
            .checked_mul(stream.hours_elapsed)
            .ok_or(ErrorCode::MathOverflow)?;

        // Cap earned amount at total deposited
        let total_earned = std::cmp::min(total_earned_uncapped, stream.total_deposited);
        
        // Calculate available balance
        let available_balance = total_earned
            .checked_sub(stream.withdrawn_amount)
            .ok_or(ErrorCode::InsufficientBalance)?;

        require!(amount <= available_balance, ErrorCode::InsufficientBalance);

        // Transfer tokens from vault to employee using PDA signer
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
            to: ctx.accounts.employee_token_account.to_account_info(),
            authority: stream.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer);
        token::transfer(cpi_ctx, amount)?;

        // Update stream state
        stream.withdrawn_amount = stream.withdrawn_amount
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;
        stream.employee_last_activity_at = clock.unix_timestamp;

        Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"stream", stream.employer.as_ref(), employee.key().as_ref()],
        bump = stream.bump,
        has_one = vault
    )]
    pub stream: Account<'info, PaymentStream>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub employee_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}