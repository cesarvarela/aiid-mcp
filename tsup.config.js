import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['index.ts'],       // just the one file
    format: ['esm', 'cjs'],        // dual-format bundle
    dts: true,                     // emit index.d.ts
    sourcemap: true,
    clean: true,
    banner: { js: '#!/usr/bin/env node' } // keep the shebang
});