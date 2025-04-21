import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "https://incidentdatabase.ai/api/graphql",
  // documents: '**/!(*.d).{ts,tsx,js}',
  pluckConfig: {
    globalIdentifier: 'gql',
  },
  generates: {
    "graphql/generated/": {
      preset: 'client',
      presetConfig: {
        gqlTagName: "gql",
      }
    }
  }
};

export default config; 