/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/cascade.json`.
 */
export type Cascade = {
  "address": "6erxegH47t73aQjWm3fZEkwva57tz2JH7ZMxdoayzxVQ",
  "metadata": {
    "name": "cascade",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "The Hourly Payroll Platform"
  },
  "instructions": [
    {
      "name": "closeStream",
      "discriminator": [
        255,
        241,
        196,
        212,
        95,
        93,
        160,
        89
      ],
      "accounts": [
        {
          "name": "employer",
          "writable": true,
          "signer": true,
          "relations": [
            "stream"
          ]
        },
        {
          "name": "stream",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  101,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              },
              {
                "kind": "account",
                "path": "stream.employee",
                "account": "paymentStream"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stream"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createStream",
      "discriminator": [
        71,
        188,
        111,
        127,
        108,
        40,
        229,
        158
      ],
      "accounts": [
        {
          "name": "employer",
          "writable": true,
          "signer": true
        },
        {
          "name": "employee"
        },
        {
          "name": "mint"
        },
        {
          "name": "stream",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  101,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              },
              {
                "kind": "account",
                "path": "employee"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stream"
              }
            ]
          }
        },
        {
          "name": "employerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hourlyRate",
          "type": "u64"
        },
        {
          "name": "totalDeposit",
          "type": "u64"
        }
      ]
    },
    {
      "name": "employerEmergencyWithdraw",
      "discriminator": [
        53,
        243,
        175,
        174,
        220,
        22,
        246,
        211
      ],
      "accounts": [
        {
          "name": "employer",
          "writable": true,
          "signer": true
        },
        {
          "name": "stream",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  101,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              },
              {
                "kind": "account",
                "path": "stream.employee",
                "account": "paymentStream"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "stream"
          ]
        },
        {
          "name": "employerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "refreshActivity",
      "discriminator": [
        55,
        172,
        115,
        3,
        200,
        89,
        189,
        250
      ],
      "accounts": [
        {
          "name": "employee",
          "writable": true,
          "signer": true
        },
        {
          "name": "stream",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  101,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "stream.employer",
                "account": "paymentStream"
              },
              {
                "kind": "account",
                "path": "employee"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "topUpStream",
      "discriminator": [
        12,
        244,
        26,
        215,
        160,
        204,
        9,
        151
      ],
      "accounts": [
        {
          "name": "employer",
          "writable": true,
          "signer": true
        },
        {
          "name": "stream",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  101,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              },
              {
                "kind": "account",
                "path": "stream.employee",
                "account": "paymentStream"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "stream"
          ]
        },
        {
          "name": "employerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "additionalAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "employee",
          "writable": true,
          "signer": true
        },
        {
          "name": "stream",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  101,
                  97,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "stream.employer",
                "account": "paymentStream"
              },
              {
                "kind": "account",
                "path": "employee"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "stream"
          ]
        },
        {
          "name": "employeeTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "paymentStream",
      "discriminator": [
        124,
        85,
        193,
        22,
        93,
        1,
        143,
        75
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "streamInactive",
      "msg": "This stream is no longer active"
    },
    {
      "code": 6001,
      "name": "unauthorizedEmployee",
      "msg": "Only the employee can perform this action"
    },
    {
      "code": 6002,
      "name": "unauthorizedEmployer",
      "msg": "Only the employer can perform this action"
    },
    {
      "code": 6003,
      "name": "insufficientBalance",
      "msg": "Insufficient balance available for withdrawal"
    },
    {
      "code": 6004,
      "name": "employeeStillActive",
      "msg": "Employee is still active, cannot perform emergency withdrawal"
    },
    {
      "code": 6005,
      "name": "employerLockActive",
      "msg": "Employer lock period has not expired yet"
    },
    {
      "code": 6006,
      "name": "mathOverflow",
      "msg": "Mathematical operation overflow"
    },
    {
      "code": 6007,
      "name": "streamStillActive",
      "msg": "Stream is still active and cannot be closed"
    },
    {
      "code": 6008,
      "name": "vaultNotEmpty",
      "msg": "Vault must be empty before closing stream"
    },
    {
      "code": 6009,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp detected"
    }
  ],
  "types": [
    {
      "name": "paymentStream",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "employer",
            "type": "pubkey"
          },
          {
            "name": "employee",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "hoursElapsed",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "withdrawnAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "employeeLastActivityAt",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
