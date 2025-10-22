import { AppHero } from '@/components/app-hero';
import { useSolana } from '@/components/solana/use-solana';
import { WalletDropdown } from '@/components/wallet-dropdown';
import { CascadeUiProgram } from '@/features/cascade/ui/cascade-ui-program';

import { CascadeUiCreate } from './ui/cascade-ui-create';
import { CascadeUiProgramExplorerLink } from './ui/cascade-ui-program-explorer-link';

export default function CascadeFeature() {
  const { account } = useSolana();

  if (!account) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletDropdown />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHero title="Cascade" subtitle={'Run the program by clicking the "Run program" button.'}>
        <p className="mb-6">
          <CascadeUiProgramExplorerLink />
        </p>
        <CascadeUiCreate account={account} />
      </AppHero>
      <CascadeUiProgram />
    </div>
  );
}
