# vite-unplugin-components-tools

## viteUnpluginCssUnBundlePlugin viteUnpluginCssUnBundlePluginV2
主要用于业务组件库使用，防止在业务组件库中在使用 vite unplugin 会将重复基础样式 css 文件引入到业务项目中，
- 例子：
business-component 使用了 arco-design/web-vue unplugin, 则会将 arco css 打包到 css 文件中，而在业务项目中同时使用 arco-design/web-vue unplugin 和引入 business-component/dist/index.css，则会重复导入 arco css 文件，导致样式文件过大。


