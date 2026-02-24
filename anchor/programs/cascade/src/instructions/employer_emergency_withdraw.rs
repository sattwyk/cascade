use crate::errors::ErrorCode;
use crate::state::PaymentStream;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, TransferChecked};

const INACTIVITY_THRESHOLD_SECONDS: i64 = 30 * 24 * 60 * 60;

fn get_employee_inactive_duration(
    current_timestamp: i64,
    employee_last_activity_at: i64,
) -> Option<i64> {
    current_timestamp
        .checked_sub(employee_last_activity_at)
        .filter(|duration| *duration >= 0)
}

pub fn employer_emergency_withdraw(ctx: Context<EmployerEmergencyWithdraw>) -> Result<()> {
    let stream = &mut ctx.accounts.stream;
    let clock = Clock::get()?;

    require!(
        ctx.accounts.employer.key() == stream.employer,
        ErrorCode::UnauthorizedEmployer
    );

    // Check if 30 days have passed since employee's last activity
    let employee_inactive_duration =
        get_employee_inactive_duration(clock.unix_timestamp, stream.employee_last_activity_at)
            .ok_or(ErrorCode::InvalidTimestamp)?;

    require!(
        employee_inactive_duration >= INACTIVITY_THRESHOLD_SECONDS,
        ErrorCode::EmployeeStillActive
    );

    stream.assert_accounting_invariant()?;
    let expected_vault_balance = stream.expected_vault_balance()?;
    let withdrawable_vault_balance = ctx.accounts.vault.amount;
    // Donations can increase the vault above expected, but any deficit indicates
    // broken stream accounting and must fail.
    require!(
        withdrawable_vault_balance >= expected_vault_balance,
        ErrorCode::VaultBalanceInvariantViolated
    );

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

    if withdrawable_vault_balance > 0 {
        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.employer_token_account.to_account_info(),
            authority: stream.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer);
        token::transfer_checked(
            cpi_ctx,
            withdrawable_vault_balance,
            ctx.accounts.mint.decimals,
        )?;
    }

    // Stream vault is emptied (plus optional donation overflow), so mark the
    // accounted stream balance as fully withdrawn before close.
    stream.withdrawn_amount = stream.total_deposited;
    stream.is_active = false;
    stream.assert_accounting_invariant()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::get_employee_inactive_duration;

    #[test]
    fn returns_duration_when_current_timestamp_is_after_last_activity() {
        let duration = get_employee_inactive_duration(1_000, 400);
        assert_eq!(duration, Some(600));
    }

    #[test]
    fn returns_none_when_last_activity_is_in_the_future() {
        let duration = get_employee_inactive_duration(400, 1_000);
        assert_eq!(duration, None);
    }
}

#[derive(Accounts)]
pub struct EmployerEmergencyWithdraw<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stream", employer.key().as_ref(), stream.employee.as_ref()],
        bump = stream.bump,
        has_one = vault,
        has_one = mint
    )]
    pub stream: Account<'info, PaymentStream>,

    pub mint: Account<'info, token::Mint>,

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
