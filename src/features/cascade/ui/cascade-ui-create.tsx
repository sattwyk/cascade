import { UiWalletAccount } from '@wallet-ui/react';

import { AppAlert } from '@/components/app-alert';

export function CascadeUiCreate({ account }: { account: UiWalletAccount }) {
  if (!account?.address) {
    return null;
  }

  return (
    <AppAlert>
      Stream creation UI not implemented yet. Use the new Cascade data-access hooks (e.g. `useCreateStreamMutation`) to
      wire up your form.
    </AppAlert>
  );
}
