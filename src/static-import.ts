import fs from 'fs';
import path from 'path';
import type { RollupStaticImportPluginOptions } from 'rollup-plugin-static-import';
import type { Plugin } from 'vite';

import glob from 'glob';
import { createFilter } from '@rollup/pluginutils';

const windowsSlashRE = /\\/g;
const slash = (p: string) => {
  return p.replace(windowsSlashRE, '/');
};
const normalizePath = (id: string) => {
  return path.posix.normalize(typeof process !== 'undefined' && process.platform === 'win32' ? slash(id) : id);
};

// 重写 static-import，0.1.1 版本 static-import 的低版本 @rollup/pluginutils 导致 resolveId filter(id) 时出错
// 1.0.0 版本的 static-import 引用的 glob 在 windows 下存在错误，buildStart 时 glob.sync 检索不出文件
// 使用 vite 的 normalizePath 解决 glob 问题

const makePathAbsolute = (p: string, rootPath: string) => {
  if (path.isAbsolute(p)) {
    return p;
  }
  return path.join(rootPath, p);
};

const staticImport = (options: RollupStaticImportPluginOptions): Plugin => {
  const pluginOptions = Object.assign(
    {},
    {
      include: [],
      exclude: [],
      projectRoot: process.cwd(),
      baseDir: 'src',
    },
    options,
  );

  const projectRoot = pluginOptions.projectRoot;
  const absoluteIncludes = pluginOptions.include
    .map((p) => makePathAbsolute(p, projectRoot))
    .map((item) => normalizePath(item));
  const absoluteExcludes = pluginOptions.exclude
    .map((p) => makePathAbsolute(p, projectRoot))
    .map((item) => normalizePath(item));

  const filter = createFilter(absoluteIncludes, absoluteExcludes, { resolve: false });
  const baseDir = normalizePath(makePathAbsolute(pluginOptions.baseDir, projectRoot));

  const self: Plugin = {
    name: 'static-import',
    resolveId: (source, importer) => {
      const id = normalizePath(makePathAbsolute(path.join(path.dirname(importer || './'), source), projectRoot));
      if (!filter(id)) {
        return;
      }
      return { id: source, external: true };
    },
    buildStart() {
      // emit matching files and add them to watch list at the start of build
      const files = absoluteIncludes.flatMap((inc) => glob.sync(inc));
      files.forEach((id) => {
        this.emitFile({
          type: 'asset',
          source: fs.readFileSync(id),
          fileName: path.relative(baseDir, id),
        });
        this.addWatchFile(id);
      });
    },
    watchChange(id) {
      if (!filter(id)) {
        return;
      }
      // emit file if changed file matches filters
      this.emitFile({
        type: 'asset',
        source: fs.readFileSync(id),
        fileName: path.relative(baseDir, id),
      });
    },
  };

  return self;
};

export default staticImport;
