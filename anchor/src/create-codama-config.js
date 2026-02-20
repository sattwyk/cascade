import { GILL_EXTERNAL_MODULE_MAP } from 'gill';

export function createCodamaConfig({
  idl,
  clientJs,
  dependencyMap = GILL_EXTERNAL_MODULE_MAP,
  formatCode = false,
  dependencyVersions = { gill: '0.14.0' },
  rendererModule = '@codama/renderers-js',
}) {
  return {
    idl,
    scripts: {
      js: {
        args: [clientJs, { dependencyMap, dependencyVersions, formatCode }],
        from: rendererModule,
      },
    },
  };
}
