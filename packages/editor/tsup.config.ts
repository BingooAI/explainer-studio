import { defineConfig } from 'tsup'

export default defineConfig({
  // Two entries: `.` carries the panels, `./ops` is pure and importable without React.
  // A server applying operations headlessly should not pull a renderer in with them.
  entry: ['src/index.ts', 'src/ops.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
})
