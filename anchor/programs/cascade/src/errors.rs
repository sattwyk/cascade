use anchor_lang::prelude::*;

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

    #[msg("Invalid timestamp detected")]
    InvalidTimestamp,

    #[msg("Only 6-decimal stablecoin mints are supported")]
    UnsupportedMintDecimals,

    #[msg("Provided token account does not match expected owner or mint")]
    InvalidTokenAccount,
}
