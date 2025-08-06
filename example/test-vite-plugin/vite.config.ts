import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json';
import Components from 'unplugin-vue-components/vite';
import { ArcoResolver } from 'unplugin-vue-components/resolvers';
import AutoImport from 'unplugin-auto-import/vite';
import dts from 'vite-plugin-dts';
import { viteUnpluginUnBundlePlugin, viteSplitImportStyle } from 'vite-unplugin-components-tools';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      extensions: ['vue'],
      resolvers: [
        ArcoResolver({
          resolveIcons: {
            enable: true,
          },
          sideEffect: true,
          importStyle: 'less',
        }),
      ],
      dts: './config/unplugin/components.d.ts',
    }),
    AutoImport({
      imports: ['vue'],
      resolvers: [
        ArcoResolver({
          resolveIcons: {
            enable: true,
          },
          importStyle: 'less',
        }),
      ],
      dts: './config/unplugin/auto-imports.d.ts',
    }),
    viteUnpluginUnBundlePlugin({
      '@arco-design/web-vue': { importStyle: 'all', resolveIcons: true },
    }),
    viteSplitImportStyle({
      styleLibNames: ['@arco-design/web-vue'],
    }),
    dts(),
  ],
  build: {
    target: 'modules',
    emptyOutDir: true,
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [...Object.keys(packageJson.peerDependencies || {})],
      output: {
        manualChunks(id, meta) {
          try {
            if (id === '\0plugin-vue:export-helper') {
              return 'vue-export-helper';
            }
            const [matchArr] = [...(id.matchAll(/([\w-_\/:]*)\/src\/([\w-_]*)\/([\S\s]*)/g) || [])];
            if (matchArr && matchArr.length >= 3) {
              const [, , componentDir] = matchArr;
              return componentDir;
            }
            return null;
          } catch (error) {
            return null;
          }
        },
        chunkFileNames: 'components/[name].js',
        hoistTransitiveImports: false,
      },
    },
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      name: 'index',
      fileName: 'index',
    },
  },
});
