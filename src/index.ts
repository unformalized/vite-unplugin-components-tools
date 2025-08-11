import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
// @ts-ignore
import generator from '@babel/generator';
import { compact, intersection } from 'lodash-es';
import { getComponentStyleDir, getIconsDir, styleImportRegMap } from './config';
import { isComponentStyleDir } from './config';
import type { LibOptions, ViteSplitImportStyleOptions, ViteUnpluginCssUnBundlePluginOtpnios } from './interface';

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
const addCssImports = (chunk: Chunk, pluginOptions: LibOptions) => {
  Object.keys(pluginOptions).forEach((libName) => {
    const importBindings = chunk.importedBindings[libName];
    if (importBindings && importBindings.length) {
      const importedList: string[] = [];
      const styleImportBlock = importBindings
        .map((item) => {
          const resolveOptions = pluginOptions[libName as keyof LibOptions];
          const nextOptions =
            typeof resolveOptions === 'boolean'
              ? resolveOptions
              : { ...resolveOptions, importStyle: resolveOptions.generateBundleImportStyle };
          pluginOptions[libName as keyof LibOptions] = nextOptions;
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

const removeCssImports = (code: string, options: LibOptions): string | null => {
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
  const { removeCss, exclude, ...libOptions } = options;
  return {
    name: 'vite-arco-css-unbundle',
    enforce: 'post',
    apply: 'build',
    transform(code, id) {
      if (!removeCss) return;
      return removeCssImports(code, libOptions);
    },
    generateBundle(outputOptions, bundle, isWrite) {
      Object.keys(bundle).forEach((key) => {
        const item = bundle[key];
        if (item.type === 'chunk') {
          const isExclude = exclude
            ? (Array.isArray(exclude) ? exclude : [exclude]).some((reg) => reg.test(item.fileName))
            : false;
          if (isExclude) {
            return;
          }
          addCssImports(item, libOptions);
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
export const viteUnpluginUnBundlePlugin = (options: LibOptions): Plugin => {
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

interface StyleImport {
  originalPath: string;
  componentName: string;
  importStatement: string;
}

/**
 * 特殊功能，请勿使用
 * @param options
 * @returns
 */
export const viteSplitImportStyle = (options: ViteSplitImportStyleOptions): Plugin => {
  let isLib = false;
  const libFilename: Record<ViteSplitImportStyleOptions['styleLibNames'][number], string> = {
    '@arco-design/web-vue': 'arco-design-style',
  };
  const libFileContent: Record<string, StyleImport[]> = {};

  return {
    name: 'vite-split-import-style',
    enforce: 'post',
    apply: 'build',
    config(userConfig) {
      isLib = !!userConfig.build.lib;
    },
    transform(code, id) {
      if (!isLib) return;
      let match;
      const matches: StyleImport[] = [];

      options.styleLibNames.forEach((item) => {
        const regExp = styleImportRegMap[item];
        regExp.lastIndex = 0;
        // 提取所有样式导入及其位置
        while ((match = regExp.exec(code)) !== null) {
          const importResult = {
            originalPath: match[0],
            componentName: match[2],
            importStatement: match[0],
          };
          matches.push(importResult);
          libFileContent[libFilename[item]] = libFileContent[libFilename[item]] || [];
          libFileContent[libFilename[item]].push(importResult);
        }
      });

      if (matches.length) {
        // 移除原始代码中的样式导入
        const newCode = matches.reduce((acc, { originalPath }) => acc.replace(originalPath, ''), code);

        return {
          code: newCode,
          map: null, // 保留 sourcemap
        };
      }

      return null;
    },
    renderStart() {
      Object.entries(libFileContent).forEach(([key, value]) => {
        this.emitFile({
          type: 'asset',
          fileName: `${key}.js`,
          source: [...new Set(value.map((item) => item.importStatement)).values()].join('\n'),
        });
      });
    },
    renderChunk(code, chunk) {
      if (chunk.isEntry) {
        if (chunk.fileName.endsWith('.js')) {
          this.emitFile({
            type: 'asset',
            fileName: `${chunk.fileName.slice(0, -3)}-split-style.js`,
            source: code,
          });
          return `${Object.keys(libFileContent)
            .map((item) => `import "./${item}.js"`)
            .join('\n')}\n${code}`;
        }
      }
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
