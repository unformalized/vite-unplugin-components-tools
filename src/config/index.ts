import { ARCO_PACKAGE_NAME, getArcoComponentStyleDir, isArcoComponentStyleDir } from './arco';

export function getComponentStyleDir(libName: string, importComponentName: string): string | undefined;
export function getComponentStyleDir(libName: string): string[];
export function getComponentStyleDir(libName: string, importComponentName?: string): undefined | string | string[] {
  if (libName === ARCO_PACKAGE_NAME) return getArcoComponentStyleDir(importComponentName);
  return undefined;
}

export const isComponentStyleDir = (libName: string, importSource: string) => {
  if (libName === ARCO_PACKAGE_NAME) return isArcoComponentStyleDir(importSource);
  return false;
};
