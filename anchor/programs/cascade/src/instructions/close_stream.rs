use crate::errors::ErrorCode;
use crate::state::PaymentStream;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, TransferChecked};

pub fn close_stream(ctx: Context<CloseStream>) -> Result<()> {
    let stream = &ctx.accounts.stream;
    require!(!stream.is_active, ErrorCode::StreamStillActive);

    let employer_key = stream.employer.key();
    let employee_key = stream.employee.key();
    let seeds = &[
        b"stream",
        employer_key.as_ref(),
        employee_key.as_ref(),
        &[stream.bump],
    ];
    let signer = &[&seeds[..]];

    let vault_balance = ctx.accounts.vault.amount;
    if vault_balance > 0 {
        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.employer_token_account.to_account_info(),
            authority: stream.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer);
        token::transfer_checked(cpi_ctx, vault_balance, ctx.accounts.mint.decimals)?;
    }

    let close_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.employer.to_account_info(),
        authority: stream.to_account_info(),
    };
    let close_program = ctx.accounts.token_program.to_account_info();
    let close_ctx = CpiContext::new(close_program, close_accounts).with_signer(signer);
    token::close_account(close_ctx)?;

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
        has_one = employer,
        has_one = mint
    )]
    pub stream: Account<'info, PaymentStream>,

    pub mint: Account<'info, token::Mint>,

    #[account(
        mut,
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
