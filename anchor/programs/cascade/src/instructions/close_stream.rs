use crate::errors::ErrorCode;
use crate::state::PaymentStream;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn close_stream(ctx: Context<CloseStream>) -> Result<()> {
    let stream = &ctx.accounts.stream;
    require!(!stream.is_active, ErrorCode::StreamStillActive);

    let vault_balance = ctx.accounts.vault.amount;
    if vault_balance > 0 {
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
        token::transfer(cpi_ctx, vault_balance)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct CloseStream<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        close = employer,
        seeds = [b"stream", employer.key().as_ref(), stream.employee.as_ref()],
        bump = stream.bump,
        has_one = employer
    )]
    pub stream: Account<'info, PaymentStream>,

    #[account(
        mut,
        close = employer,
        seeds = [b"vault", stream.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = employer_token_account.owner == employer.key() @ ErrorCode::InvalidTokenAccount,
        constraint = employer_token_account.mint == stream.mint @ ErrorCode::InvalidTokenAccount
    )]
    pub employer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
