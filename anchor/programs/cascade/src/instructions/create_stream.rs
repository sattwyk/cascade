use crate::state::PaymentStream;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn create_stream(
    ctx: Context<CreateStream>,
    hourly_rate: u64,
    total_deposit: u64,
) -> Result<()> {
    let stream = &mut ctx.accounts.stream;
    let clock = Clock::get()?;

    stream.employer = ctx.accounts.employer.key();
    stream.employee = ctx.accounts.employee.key();
    stream.mint = ctx.accounts.mint.key();
    stream.vault = ctx.accounts.vault.key();
    stream.hourly_rate = hourly_rate;
    stream.total_deposited = total_deposit;
    stream.withdrawn_amount = 0;
    stream.created_at = clock.unix_timestamp;
    stream.employee_last_activity_at = clock.unix_timestamp;
    stream.is_active = true;
    stream.bump = ctx.bumps.stream;

    // Transfer USDC from employer to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.employer_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.employer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, total_deposit)?;

    Ok(())
}

#[derive(Accounts)]
pub struct CreateStream<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    /// CHECK: Employee address is stored in the stream PDA for future validation. No authority checks needed at stream creation.
    pub employee: AccountInfo<'info>,

    pub mint: Account<'info, token::Mint>,

    #[account(
        init,
        payer = employer,
        space = 8 + PaymentStream::INIT_SPACE,
        seeds = [b"stream", employer.key().as_ref(), employee.key().as_ref()],
        bump
    )]
    pub stream: Account<'info, PaymentStream>,

    #[account(
        init,
        payer = employer,
        token::mint = mint,
        token::authority = stream,
        seeds = [b"vault", stream.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub employer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
