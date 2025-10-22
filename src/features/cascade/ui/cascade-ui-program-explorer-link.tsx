import { ellipsify } from '@wallet-ui/react';

import { CASCADE_PROGRAM_ADDRESS } from '@project/anchor';

import { AppExplorerLink } from '@/components/app-explorer-link';

export function CascadeUiProgramExplorerLink() {
  return <AppExplorerLink address={CASCADE_PROGRAM_ADDRESS} label={ellipsify(CASCADE_PROGRAM_ADDRESS)} />;
}
