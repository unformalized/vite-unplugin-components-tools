export type DisallowResolveIconOption = undefined | false | { enable: false };
export type AllowResolveIconOption = true | { enable: true; iconPrefix?: string };
export type ResolveIconsOption = DisallowResolveIconOption | AllowResolveIconOption;

export interface ArcoResolverOptions {
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
  /**
   * 是否先执行移除 css 操作
   * @default true
   */
  removeCss?: boolean;
  /**
   * 使用 v1 版本，可以过滤文件不进行样式添加
   */
  exclude?: RegExp | RegExp[];
  '@arco-design/web-vue'?: ArcoResolverOptions | true;
}

export type LibOptions = Omit<ViteUnpluginCssUnBundlePluginOtpnios, 'removeCss' | 'exclude'>;

export interface ViteSplitImportStyleOptions {
  styleLibNames: ['@arco-design/web-vue'];
}
