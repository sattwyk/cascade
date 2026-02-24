import { GILL_EXTERNAL_MODULE_MAP } from 'gill';

const dependencyMap = {
  ...GILL_EXTERNAL_MODULE_MAP,
  solanaErrors: '@solana/errors',
  solanaInstructionPlans: '@solana/instruction-plans',
  solanaPluginInterfaces: '@solana/plugin-interfaces',
  solanaProgramClientCore: '@solana/program-client-core',
  solanaRpcApi: '@solana/rpc-api',
};

export default {
  idl: 'target/idl/cascade.json',
  scripts: {
    js: {
      from: '@codama/renderers-js',
      args: [
        'anchor/src/client/js',
        {
          dependencyMap,
          dependencyVersions: {
            '@solana/program-client-core': '^6.1.0',
            gill: '0.14.0',
          },
          formatCode: false,
          generatedFolder: 'generated',
          kitImportStrategy: 'granular',
          syncPackageJson: false,
        },
      ],
    },
  },
};
