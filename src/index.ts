import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
// @ts-ignore
import generator from '@babel/generator';
import { compact, intersection } from 'lodash-es';
import { getComponentStyleDir, getIconsDir } from './config';
import { isComponentStyleDir } from './config';
import type { ViteUnpluginCssUnBundlePluginOtpnios } from './interface';

type Chunk = Extract<
  Parameters<Extract<Plugin['generateBundle'], (...args: any[]) => any>>[1][string],
  { type: 'chunk' }
>;

/**
 * 删除对于 peerDep 的全量引入
 * 如 import "vue";
 * @param peerDeps
 * @param chunk
 */
const removePeerDepNoBindingsImport = (peerDeps: string[], chunk: Chunk): string => {
  const peerImport = intersection(peerDeps, chunk.imports);
  if (peerImport.length) {
    const unBindingsPeerImport = peerImport.filter(
      (p) => !chunk.importedBindings[p] || chunk.importedBindings[p].length === 0,
    );

    if (unBindingsPeerImport.length) {
      const parserResult = parse(chunk.code, { sourceType: 'module' });
      if (parserResult.errors.length > 0) {
        return null;
      }
      const program = parserResult.program;
      program.body = program.body.filter((node) => {
        if (node.type === 'ImportDeclaration') {
          const source = node.source.value;
          const isUnBindingsPeerImport = unBindingsPeerImport.includes(source);
          if (isUnBindingsPeerImport) {
            chunk.imports = chunk.imports.filter((item) => item !== source);
            chunk.importedBindings[source] && delete chunk.importedBindings[source];
          }
          return !isUnBindingsPeerImport;
        }
        return true;
      });
      try {
        const nextCode = generator.default(parserResult).code;
        chunk.code = nextCode;
      } catch (error) {}
    }
  }
};

/**
 * 添加 css 引入
 */
const addCssImports = (chunk: Chunk, pluginOptions: ViteUnpluginCssUnBundlePluginOtpnios) => {
  Object.keys(pluginOptions).forEach((libName) => {
    const importBindings = chunk.importedBindings[libName];
    if (importBindings && importBindings.length) {
      const importedList: string[] = [];
      const styleImportBlock = importBindings
        .map((item) => {
          const resolveOptions = pluginOptions[libName as keyof ViteUnpluginCssUnBundlePluginOtpnios];
          const nextOptions =
            typeof resolveOptions === 'boolean'
              ? resolveOptions
              : { ...resolveOptions, importStyle: resolveOptions.generateBundleImportStyle };
          pluginOptions[libName as keyof ViteUnpluginCssUnBundlePluginOtpnios] = nextOptions;
          const styleImport = getComponentStyleDir({ libName, importName: item, pluginOptions });
          if (!styleImport) return '';
          const importList = (Array.isArray(styleImport) ? styleImport : [styleImport]).filter(
            (item) => !importedList.includes(item),
          );
          importedList.push(...importList);
          importList.forEach((styleImport) => {
            chunk.imports.push(styleImport);
            chunk.importedBindings[styleImport] = [];
          });
          return importList.map((styleImport) => `import '${styleImport}';`).join('\n');
        })
        .join('\n')
        .concat('\n');

      chunk.code = styleImportBlock.concat(chunk.code);
    }
  });
};

const removeCssImports = (code: string, options: ViteUnpluginCssUnBundlePluginOtpnios): string | null => {
  if (!Object.keys(options)) return null;
  const parserResult = parse(code, { sourceType: 'module' });
  if (parserResult.errors.length > 0) {
    return null;
  }
  const program = parserResult.program;
  let needRegenerate = false;
  program.body = program.body.filter((node) => {
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value;
      const isLibCssFile = isComponentStyleDir(source, options);
      needRegenerate = needRegenerate || isLibCssFile;
      return !isLibCssFile;
    }
    return true;
  });
  if (needRegenerate) {
    try {
      const nextCode = generator.default(parserResult).code;
      return nextCode;
    } catch (error) {}
  }
  return null;
};

/**
 * 现在使用组件库存在一个问题，例如在组件库中 arco 引入的组件样式会打包到 css 文件中
 * 若是在业务代码中，也使用了相同 arco 组件，会导致 css 样式重复
 * 所以该插件会将 arco 的 css 代码，
 */
export const viteUnpluginCssUnBundlePlugin = (options: ViteUnpluginCssUnBundlePluginOtpnios): Plugin => {
  return {
    name: 'vite-arco-css-unbundle',
    enforce: 'post',
    apply: 'build',
    transform(code, id) {
      return removeCssImports(code, options);
    },
    generateBundle(outputOptions, bundle, isWrite) {
      Object.keys(bundle).forEach((key) => {
        const item = bundle[key];
        if (item.type === 'chunk') {
          addCssImports(item, options);
        }
      });
    },
  };
};

/**
 * 使用在 resolveId 时忽略 css 样式的处理
 * 增加 icon 处理，arco option 中设置 resolveIcons
 * @param options
 */
export const viteUnpluginUnBundlePlugin = (options: ViteUnpluginCssUnBundlePluginOtpnios): Plugin => {
  const libNames: string[] = Object.keys(options);
  const paths = libNames.flatMap((item) => {
    const paths = getComponentStyleDir({ libName: item, pluginOptions: options });
    return Array.isArray(paths) ? paths : [paths];
  });
  const iconsPaths = compact(libNames.map((item) => getIconsDir({ libName: item, pluginOptions: options })));

  return {
    name: 'vite-arco-css-unbundle-v2',
    enforce: 'pre',
    apply: 'build',
    resolveId(source, importer, options) {
      const isUnbundleCss = paths.some((item) => source === item);
      if (isUnbundleCss) {
        return { id: source, external: true };
      }
      if (iconsPaths.length && iconsPaths.some((item) => item === source)) {
        return { id: source, external: true };
      }
      return null;
    },
  };
};

export const peerDepsNoBiddingImportRemove = (packageJson: any): Plugin => {
  const peerDeps = Object.keys(packageJson.peerDependencies || {});

  return {
    name: 'vite-peer-deps-no-bidding-import-remove',
    enforce: 'post',
    apply: 'build',
    generateBundle(options, bundle, isWrite) {
      Object.keys(bundle).forEach((key) => {
        const item = bundle[key];
        if (item.type === 'chunk') {
          removePeerDepNoBindingsImport(peerDeps, item);
        }
      });
    },
  };
};
