use crate::errors::ErrorCode;
use crate::state::PaymentStream;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn top_up_stream(ctx: Context<TopUpStream>, additional_amount: u64) -> Result<()> {
    let stream = &mut ctx.accounts.stream;

    require!(stream.is_active, ErrorCode::StreamInactive);
    require!(
        ctx.accounts.employer.key() == stream.employer,
        ErrorCode::UnauthorizedEmployer
    );

    // Transfer additional USDC from employer to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.employer_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.employer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, additional_amount)?;

    stream.total_deposited = stream
        .total_deposited
        .checked_add(additional_amount)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct TopUpStream<'info> {
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

    #[account(
        mut,
        constraint = employer_token_account.owner == employer.key() @ ErrorCode::InvalidTokenAccount,
        constraint = employer_token_account.mint == stream.mint @ ErrorCode::InvalidTokenAccount
    )]
    pub employer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
