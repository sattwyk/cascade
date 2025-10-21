use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::PaymentStream;
use crate::errors::ErrorCode;

pub fn close_stream(ctx: Context<CloseStream>) -> Result<()> {
    let stream = &ctx.accounts.stream;
    require!(!stream.is_active, ErrorCode::StreamStillActive);
    
    let vault_balance = ctx.accounts.vault.amount;
    require!(vault_balance == 0, ErrorCode::VaultNotEmpty);
    
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
    
    pub token_program: Program<'info, Token>,
}
