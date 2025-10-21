use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("6erxegH47t73aQjWm3fZEkwva57tz2JH7ZMxdoayzxVQ");

#[program]
pub mod cascade {
    use super::*;

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
        stream.hours_elapsed= hourly_rate;
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

    pub fn refresh_activity(ctx: Context<RefreshActivity>) -> Result<()> {
        let stream = &mut ctx.accounts.stream;
        let clock = Clock::get()?;

        require!(stream.is_active, ErrorCode::StreamInactive);
        require!(ctx.accounts.employee.key() == stream.employee, ErrorCode::UnauthorizedEmployee);

        stream.employee_last_activity_at = clock.unix_timestamp;
        
        Ok(())
    }

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

    pub fn top_up_stream(ctx: Context<TopUpStream>, additional_amount: u64) -> Result<()> {
        let stream = &mut ctx.accounts.stream;

        require!(stream.is_active, ErrorCode::StreamInactive);
        require!(ctx.accounts.employer.key() == stream.employer, ErrorCode::UnauthorizedEmployer);

        // Transfer additional USDC from employer to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.employer_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.employer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, additional_amount)?;

        stream.total_deposited = stream.total_deposited
            .checked_add(additional_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn close_stream(ctx: Context<CloseStream>) -> Result<()> {
    let stream = &ctx.accounts.stream;
    require!(!stream.is_active, ErrorCode::StreamStillActive);
    
    let vault_balance = ctx.accounts.vault.amount;
    require!(vault_balance == 0, ErrorCode::VaultNotEmpty);
    
    Ok(())
}

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
    
    #[account(mut)]
    pub employer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
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

#[account]
#[derive(InitSpace)]
pub struct PaymentStream {
    pub employer: Pubkey,
    pub employee: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub hours_elapsed: u64,
    pub total_deposited: u64,
    pub withdrawn_amount: u64,
    pub created_at: i64,
    pub employee_last_activity_at: i64,
    pub is_active: bool,
    pub bump: u8,
}


#[error_code]
pub enum ErrorCode {
    #[msg("This stream is no longer active")]
    StreamInactive,
    
    #[msg("Only the employee can perform this action")]
    UnauthorizedEmployee,
    
    #[msg("Only the employer can perform this action")]
    UnauthorizedEmployer,
    
    #[msg("Insufficient balance available for withdrawal")]
    InsufficientBalance,
    
    #[msg("Employee is still active, cannot perform emergency withdrawal")]
    EmployeeStillActive,
    
    #[msg("Employer lock period has not expired yet")]
    EmployerLockActive,
    
    #[msg("Mathematical operation overflow")]
    MathOverflow,

    #[msg("Stream is still active and cannot be closed")]
    StreamStillActive,
    
    #[msg("Vault must be empty before closing stream")]
    VaultNotEmpty,

    #[msg("Invalid timestamp detected")]
    InvalidTimestamp,
}
