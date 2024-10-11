import type { ViteUnpluginCssUnBundlePluginOtpnios } from '../interface';
import { ARCO_PACKAGE_NAME, getArcoComponentStyleDir, isArcoComponentStyleDir } from './arco';

export function getComponentStyleDir(options: {
  libName: string;
  pluginOptions: ViteUnpluginCssUnBundlePluginOtpnios;
  importName?: string;
}): undefined | string | string[] {
  const { libName, pluginOptions, importName } = options;
  if (libName === ARCO_PACKAGE_NAME)
    return getArcoComponentStyleDir({
      importName,
      options: pluginOptions['@arco-design/web-vue'],
    });
  return undefined;
}

export const isComponentStyleDir = (source: string, options: ViteUnpluginCssUnBundlePluginOtpnios) => {
  return Object.keys(options).some((item) => {
    const key = item as keyof ViteUnpluginCssUnBundlePluginOtpnios;
    switch (key) {
      case '@arco-design/web-vue':
        return isArcoComponentStyleDir(source, options[key]);
      default:
        return false;
    }
  });
};
