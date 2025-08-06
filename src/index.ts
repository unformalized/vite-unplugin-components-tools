import type { Plugin } from 'vite';
import { parse } from '@babel/parser';
// @ts-ignore
import generator from '@babel/generator';
import { compact, intersection } from 'lodash-es';
import { getComponentStyleDir, getIconsDir, styleImportRegMap } from './config';
import { isComponentStyleDir } from './config';
import type { ViteSplitImportStyleOptions, ViteUnpluginCssUnBundlePluginOtpnios } from './interface';

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

/**
 * 特殊功能，请勿使用
 * @param options
 * @returns
 */
export const viteSplitImportStyle = (options: ViteSplitImportStyleOptions): Plugin => {
  const exportNameMap: Record<string, { exportName?: string; localName: string; importName: string }[]> = {};
  const localNameMap: Record<string, { importName: string; source: string }> = {};
  const assetsModuleIdMap: Record<
    string,
    {
      id: string;
      content: string;
      exportBindings: { localName: string; exportedName: string }[];
    }
  > = {};

  return {
    name: 'vite-split-import-style',
    enforce: 'post',
    apply: 'build',
    async renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js')) return null;
      // 在入口文件处得到所有模块的导入导出名，因为每个模块的导出名可能不同，所以如果你单独引入模块时必须增加对应的模块名
      // 例子：a 模块导出 _, 再在入口文件以 _ as Button 导出，你在入口文件里里面引入 Button 就是 a 模块的 _
      // 现在你要单独引入 a 模块的 _，但是每回编译出来的名字可能不同，所以最好在 a 模块增加 _ as Button 这样的显示导出语句
      // exportNameMap 记录每个模块的导入导出
      if (chunk.isEntry) {
        const parserResult = parse(code, { sourceType: 'module' });
        if (parserResult.errors.length > 0) {
          console.log('[vite-split-import-style]: parse entry chunk failed, ', this.error);
          return null;
        }
        const program = parserResult.program;
        program.body.forEach((node) => {
          if (node.type === 'ImportDeclaration') {
            const source = node.source.value;
            node.specifiers.forEach((item) => {
              if (item.type === 'ImportSpecifier') {
                const localName = item.local.name;
                const importName = item.imported.type === 'Identifier' ? item.imported.name : item.imported.value;
                exportNameMap[source] = [...(exportNameMap[source] || []), { importName, localName }];
                localNameMap[localName] = { source, importName };
              }
            });
          } else if (node.type === 'ExportNamedDeclaration') {
            const source = node.source?.value;
            const specifiers = node.specifiers;
            specifiers.forEach((item) => {
              if (item.type === 'ExportSpecifier') {
                const localName = item.local.name;
                const exportName = item.exported.type === 'Identifier' ? item.exported.name : item.exported.value;
                if (source) {
                  exportNameMap[source] = [
                    ...(exportNameMap[source] || []),
                    { importName: localName, localName, exportName },
                  ];
                } else {
                  if (localNameMap[localName]) {
                    const { source, importName } = localNameMap[localName];
                    exportNameMap[source] = [
                      ...(exportNameMap[source] || []),
                      { importName: importName, localName, exportName },
                    ];
                  }
                }
              }
            });
          }
        });
        // 入口文件是最后处理的，所以在这里写入每个模块的 source 文件
        Object.entries(exportNameMap).map((item) => {
          let [source, map] = item;
          if (source.startsWith('./')) {
            source = source.slice(2);
          }
          if (assetsModuleIdMap[source]) {
            let content = assetsModuleIdMap[source].content;
            const exportBindings = assetsModuleIdMap[source].exportBindings;
            map.forEach(({ importName, exportName }) => {
              const bidding = exportBindings.find((item) => item.exportedName === importName);
              if (bidding && bidding.localName !== exportName) {
                content += `\nexport const ${exportName} = ${bidding.localName}`;
              }
            });

            this.setAssetSource(assetsModuleIdMap[source].id, content);
          }
        });

        return null;
      } else {
        const regExps = options.styleLibNames.map((item) => styleImportRegMap[item]);
        const filename = chunk.fileName;
        let prefixPath = '';
        let basename = '';
        if (filename.includes('/')) {
          const arr = filename.split('/');
          prefixPath = arr.slice(0, arr.length - 1).join('/') + '/';
          basename = arr[arr.length - 1].replace(/\.js$/, '');
        } else {
          basename = filename.replace(/\.js$/, '');
        }

        let match;
        let styleImports = '';
        const matches: {
          start: number;
          end: number;
        }[] = [];

        regExps.forEach((regExp) => {
          // 提取所有样式导入及其位置
          while ((match = regExp.exec(code)) !== null) {
            // 保留原始格式（包括引号和空格）
            const fullMatch = code.substring(match.index, regExp.lastIndex);

            styleImports += fullMatch + '\n';
            matches.push({
              start: match.index,
              end: regExp.lastIndex,
            });
          }
        });

        if (matches.length === 0) return null;

        const cssFileName = `${prefixPath}${basename}-css.js`;
        const sourceFileName = `${prefixPath}${basename}-source.js`;

        // 构建新源码内容
        let sourceCode = '';
        let currentIndex = 0;

        // 移除所有样式导入，保留其他内容
        for (const { start, end } of matches) {
          sourceCode += code.substring(currentIndex, start);
          currentIndex = end;
        }
        sourceCode += code.substring(currentIndex);

        // 创建样式文件
        this.emitFile({
          type: 'asset',
          fileName: cssFileName,
          source: styleImports,
        });

        // 创建源码文件
        const sourceId = this.emitFile({
          type: 'asset',
          fileName: sourceFileName,
        });
        const exportBindings: { localName: string; exportedName: string }[] = [];
        try {
          const parserResult = parse(sourceCode, { sourceType: 'module' });
          if (parserResult.errors.length > 0) {
            console.log('[vite-split-import-style]: parse module chunk failed, ', this.error);
          } else {
            const program = parserResult.program;
            program.body.forEach((node) => {
              if (node.type === 'ExportDefaultDeclaration') {
                if (node.declaration.type === 'Identifier') {
                  exportBindings.push({
                    localName: node.declaration.name,
                    exportedName: node.declaration.name,
                  });
                } else if (node.declaration.type === 'ObjectExpression') {
                  node.declaration.properties.forEach((property) => {
                    if (property.type === 'ObjectProperty') {
                      if (property.key.type === 'Identifier' && property.value.type === 'Identifier') {
                        exportBindings.push({
                          localName: property.value.name,
                          exportedName: property.key.name,
                        });
                      }
                    }
                  });
                }
              } else if (node.type === 'ExportNamedDeclaration') {
                const source = node.source?.value;
                const specifiers = node.specifiers;
                specifiers.forEach((item) => {
                  if (item.type === 'ExportSpecifier') {
                    const localName = item.local.name;
                    const exportedName = item.exported.type === 'Identifier' ? item.exported.name : item.exported.value;
                    if (!source) {
                      exportBindings.push({ localName, exportedName });
                    }
                  }
                });
              }
            });
          }
        } catch (error) {}

        assetsModuleIdMap[filename] = {
          id: sourceId,
          content: sourceCode,
          exportBindings,
        };

        // 返回修改后的原始文件内容
        return `import './${basename}-css.js';\nexport * from './${basename}-source.js';\n`;
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
