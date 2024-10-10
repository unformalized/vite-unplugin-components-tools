import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
// @ts-ignore
import generator from '@babel/generator';
import staticImportUnix from 'rollup-plugin-static-import';
import { intersection } from 'lodash-es';
import { getComponentStyleDir } from './config';
import { isComponentStyleDir } from './config';
import staticImportWin from './static-import';

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
        const nextCode = generator(parserResult).code;
        chunk.code = nextCode;
      } catch (error) {}
    }
  }
};

/**
 * 添加 css 引入
 */
const addCssImports = (chunk: Chunk, libsNames: string[]) => {
  libsNames.forEach((libName) => {
    const importBindings = chunk.importedBindings[libName];
    if (importBindings && importBindings.length) {
      const styleImportBlock = importBindings
        .map((item) => {
          const styleImport = getComponentStyleDir(libName, item);
          if (styleImport) {
            chunk.imports.push(styleImport);
            chunk.importedBindings[styleImport] = [];
          }
          return styleImport ? `import "${styleImport}";` : '';
        })
        .join('\n')
        .concat('\n');

      chunk.code = styleImportBlock.concat(chunk.code);
    }
  });
};

const removeCssImports = (code: string, libNames: string[]) => {
  if (!libNames.length) return null;
  const parserResult = parse(code, { sourceType: 'module' });
  if (parserResult.errors.length > 0) {
    return null;
  }
  const program = parserResult.program;
  program.body = program.body.filter((node) => {
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value;
      // style 文件
      return !libNames.some((libName) => isComponentStyleDir(libName, source));
    }
    return true;
  });
  try {
    const nextCode = generator(parserResult).code;
    return nextCode;
  } catch (error) {}
  return null;
};

type SupportLibName = '@arco-design/web-vue' | 'ant-design-vue';

/**
 * 现在使用组件库存在一个问题，例如在组件库中 arco 引入的组件样式会打包到 css 文件中
 * 若是在业务代码中，也使用了相同 arco 组件，会导致 css 样式重复
 * 所以该插件会将 arco 的 css 代码，
 */
export const viteUnpluginCssUnBundlePlugin = (options: Record<SupportLibName, any>): Plugin => {
  const libNames: string[] = Object.keys(options);

  return {
    name: 'vite-arco-css-unbundle',
    enforce: 'post',
    apply: 'build',
    transform(code, id) {
      removeCssImports(code, libNames);
    },
    generateBundle(options, bundle, isWrite) {
      Object.keys(bundle).forEach((key) => {
        const item = bundle[key];
        if (item.type === 'chunk') {
          addCssImports(item, libNames);
        }
      });
    },
  };
};

const staticImport = process.platform === 'win32' ? staticImportWin : staticImportUnix;

/**
 * 使用 static-import 忽略 css 样式的处理
 * @param options
 */
export const viteUnpluginCssUnBundlePluginV2 = (options: Record<SupportLibName, any>): Plugin => {
  const libNames: string[] = Object.keys(options);

  return staticImport({
    include: libNames.flatMap((item) => getComponentStyleDir(item)),
  });
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
