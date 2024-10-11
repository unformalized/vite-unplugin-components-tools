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
  importStyle?: boolean | 'css' | 'less';
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
}

export interface ViteUnpluginCssUnBundlePluginOtpnios {
  '@arco-design/web-vue'?: ArcoResolverOptions | true;
}
