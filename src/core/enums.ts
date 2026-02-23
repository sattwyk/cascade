export enum AccountState {
  NEW_ACCOUNT = 'new_account',
  ONBOARDING = 'onboarding',
  WALLET_CONNECTED = 'wallet_connected',
  FIRST_STREAM_CREATED = 'first_stream_created',
  FULLY_OPERATING = 'fully_operating',
}

export enum StreamState {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  DRAFT = 'draft',
}

export enum EmployeeState {
  DRAFT = 'draft',
  INVITED = 'invited',
  READY = 'ready',
  ARCHIVED = 'archived',
}
