import { kebabCase } from 'lodash-es';
import type { ArcoResolverOptions } from '../interface';

export const ARCO_PACKAGE_NAME = '@arco-design/web-vue';
export const ArcoMatchComponents = [
  {
    pattern: /^AnchorLink$/,
    componentDir: 'anchor',
  },
  {
    pattern: /^AvatarGroup$/,
    componentDir: 'avatar',
  },
  {
    pattern: /^BreadcrumbItem$/,
    componentDir: 'breadcrumb',
  },
  {
    pattern: /^ButtonGroup$/,
    componentDir: 'button',
  },
  {
    pattern: /^(CardMeta|CardGrid)$/,
    componentDir: 'card',
  },
  {
    pattern: /^CarouselItem$/,
    componentDir: 'carousel',
  },
  {
    pattern: /^CascaderPanel$/,
    componentDir: 'cascader',
  },
  {
    pattern: /^CheckboxGroup$/,
    componentDir: 'checkbox',
  },
  {
    pattern: /^CollapseItem$/,
    componentDir: 'collapse',
  },
  {
    pattern: /^(WeekPicker|MonthPicker|YearPicker|QuarterPicker|RangePicker)$/,
    componentDir: 'date-picker',
  },
  {
    pattern: /^DescriptionsItem$/,
    componentDir: 'descriptions',
  },
  {
    pattern: /^(Doption|Dgroup|Dsubmenu|DropdownButton)$/,
    componentDir: 'dropdown',
  },
  {
    pattern: /^FormItem$/,
    componentDir: 'form',
  },
  {
    pattern: /^(Col|Row|GridItem)$/,
    componentDir: 'grid',
  },
  {
    pattern: /^(ImagePreview|ImagePreviewGroup|ImagePreviewAction)$/,
    componentDir: 'image',
  },
  {
    pattern: /^(InputGroup|InputSearch|InputPassword)$/,
    componentDir: 'input',
  },

  {
    pattern: /^(LayoutHeader|LayoutContent|LayoutFooter|LayoutSider)$/,
    componentDir: 'layout',
  },
  {
    pattern: /^(ListItem|ListItemMeta)$/,
    componentDir: 'list',
  },
  {
    pattern: /^(MenuItem|MenuItemGroup|SubMenu)$/,
    componentDir: 'menu',
  },
  {
    pattern: /^RadioGroup$/,
    componentDir: 'radio',
  },
  {
    pattern: /^(Option|Optgroup)$/,
    componentDir: 'select',
  },

  {
    pattern: /^(SkeletonLine|SkeletonShape)$/,
    componentDir: 'skeleton',
  },
  {
    pattern: /^Countdown$/,
    componentDir: 'statistic',
  },
  {
    pattern: /^Step$/,
    componentDir: 'steps',
  },
  {
    pattern: /^(Thead|Td|Th|Tr|Tbody|TableColumn)$/,
    componentDir: 'table',
  },
  {
    pattern: /^TagGroup$/,
    componentDir: 'tag',
  },
  {
    pattern: /^TabPane$/,
    componentDir: 'tabs',
  },
  {
    pattern: /^TimelineItem$/,
    componentDir: 'timeline',
  },
  {
    pattern: /^(TypographyParagraph|TypographyTitle|TypographyText)$/,
    componentDir: 'typography',
  },
];
export const ArcoComponents = [
  'affix',
  'alert',
  'anchor',
  'auto-complete',
  'avatar',
  'back-top',
  'badge',
  'breadcrumb',
  'button',
  'calendar',
  'card',
  'carousel',
  'cascader',
  'checkbox',
  'collapse',
  'color-picker',
  'comment',
  'date-picker',
  'descriptions',
  'divider',
  'drawer',
  'dropdown',
  'empty',
  'form',
  'grid',
  'image',
  'input-number',
  'input-tag',
  'input',
  'layout',
  'link',
  'list',
  'locale',
  'mention',
  'menu',
  'message',
  'modal',
  'notification',
  'overflow-list',
  'page-header',
  'pagination',
  'popconfirm',
  'popover',
  'progress',
  'radio',
  'rate',
  'resize-box',
  'result',
  'scrollbar',
  'select',
  'skeleton',
  'slider',
  'space',
  'spin',
  'split',
  'statistic',
  'steps',
  'switch',
  'table',
  'tabs',
  'tag',
  'textarea',
  'time-picker',
  'timeline',
  'tooltip',
  'transfer',
  'tree-select',
  'tree',
  'trigger',
  'typography',
  'upload',
  'verification-code',
  'watermark',
];

export const ARCO_STYLE_IMPORT_REGEX =
  /import\s+(["'])@arco-design\/web-vue\/es\/([\w-]+)\/style\/(index\.js|css\.js)\1\s*;?\s*/g;

const _getArcoComponentStyleDir = (componentName: string, options: ArcoResolverOptions | true): string | string[] => {
  const importStyle = typeof options === 'boolean' ? 'css' : options.importStyle ?? 'css';
  if (importStyle === 'less') return `@arco-design/web-vue/es/${componentName}/style/index.js`;
  if (importStyle === 'css') return `@arco-design/web-vue/es/${componentName}/style/css.js`;
  return [
    `@arco-design/web-vue/es/${componentName}/style/index.js`,
    `@arco-design/web-vue/es/${componentName}/style/css.js`,
  ];
};

/**
 * 获取 arco 组件样式路径
 * @param _options importName 源代码中引入的组件名称
 */
export function getArcoComponentStyleDir(_options: {
  importName?: string;
  options: ArcoResolverOptions | true;
}): undefined | string | string[] {
  const { importName, options } = _options || {};
  if (!importName) {
    return ArcoComponents.flatMap((componentDir) => _getArcoComponentStyleDir(componentDir, options));
  }

  if (['ConfigProvider', 'Icon'].includes(importName)) return undefined;

  let componentDir = kebabCase(importName);
  for (const item of ArcoMatchComponents) {
    if (item.pattern.test(importName)) {
      componentDir = item.componentDir;
      break;
    }
  }

  return _getArcoComponentStyleDir(componentDir, options);
}

export const isArcoComponentStyleDir = (importSource: string, options: ArcoResolverOptions | true) => {
  return ArcoComponents.some((componentDir) =>
    [_getArcoComponentStyleDir(componentDir, options)].flatMap((item) => item).includes(importSource),
  );
};

export const getArcoIconDir = (options: ArcoResolverOptions | true): null | string => {
  if (options === true) return null;
  const enableResolveIcons =
    typeof options?.resolveIcons === 'boolean' ? options?.resolveIcons : options?.resolveIcons?.enable;
  return enableResolveIcons ? `@arco-design/web-vue/es/icon` : null;
};
