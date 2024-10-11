import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json';
import Components from 'unplugin-vue-components/vite';
import { ArcoResolver } from 'unplugin-vue-components/resolvers';
import AutoImport from 'unplugin-auto-import/vite';
import { viteUnpluginCssUnBundlePluginV2 } from 'vite-unplugin-components-tools';

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
        }),
      ],
      dts: './config/unplugin/auto-imports.d.ts',
    }),
    viteUnpluginCssUnBundlePluginV2({ '@arco-design/web-vue': 'all', generateBundleImportStyle: 'less' }),
  ],
  build: {
    target: 'modules',
    emptyOutDir: true,
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [...Object.keys(packageJson.peerDependencies || {})],
    },
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      name: 'index',
      fileName: 'index',
    },
  },
});
