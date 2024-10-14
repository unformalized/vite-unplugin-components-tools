# vite-unplugin-components-tools

## viteUnpluginCssUnBundlePlugin
主要用于业务组件库使用，防止在业务组件库中在使用 vite unplugin 会将重复基础样式 css 文件引入到业务项目中，
- 例子：
business-component 使用了 arco-design/web-vue unplugin, 则会将 arco css 打包到 css 文件中，而在业务项目中同时使用 arco-design/web-vue unplugin 和引入 business-component/dist/index.css，则会重复导入 arco css 文件，导致样式文件过大。
用法
```typescript
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
    viteUnpluginUnBundlePlugin({
      // importStyle 对应的是 arco unplugin 将引入哪些 style 文件，'css' 或者 'less'，'all' 则表示全部引入，该插件则会根据该选项进行移除
      // generateBundleImportStyle 则表示在生成阶段将移除的 style 添加回来
      '@arco-design/web-vue': { importStyle: 'all', generateBundleImportStyle: 'css' },
    }),
  ],
});
```


## viteUnpluginUnBundlePlugin
对比 viteUnpluginCssUnBundlePlugin 增加了 icon 的处理，原理是使用 resolveId 将文件设置为 external 不需要 babel 去解析源码，推荐使用 viteUnpluginCssUnBundlePlugin
```typescript
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
    viteUnpluginUnBundlePlugin({
      // resolveIcons 对应 arco unplugin 是否引入 icon
      '@arco-design/web-vue': { importStyle: 'all', resolveIcons: true },
    }),
  ],
});
```

## peerDepsNoBiddingImportRemove

移除 peerDeps 的全量引入，例如 import "vue";
