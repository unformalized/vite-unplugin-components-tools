export type DisallowResolveIconOption = undefined | false | { enable: false };
export type AllowResolveIconOption = true | { enable: true; iconPrefix?: string };
export type ResolveIconsOption = DisallowResolveIconOption | AllowResolveIconOption;

export interface ArcoResolverOptions {
  /**
   * exclude components that do not require automatic import
   *
   * @default []
   */
  exclude?: string | RegExp | (string | RegExp)[];
  /**
   * import style css or less with components
   *
   * @default 'css'
   */
  importStyle?: boolean | 'css' | 'less' | 'all';
  /**
   * resolve icons
   *
   * @default false
   */
  resolveIcons?: ResolveIconsOption;
  /**
   * Control style automatic import
   *
   * @default true
   */
  sideEffect?: boolean;
  /**
   * 如果使用了 v1 版本，会先在 transform 阶段去除掉样式文件，在 generateBundle 阶段再添加上，该配置则是在 generateBundle 使用，默认为 css
   * @default 'css'
   */
  generateBundleImportStyle?: 'css' | 'less' | 'all';
}

export interface ViteUnpluginCssUnBundlePluginOtpnios {
  '@arco-design/web-vue'?: ArcoResolverOptions | true;
}
