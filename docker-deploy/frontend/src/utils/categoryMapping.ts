/**
 * 分类映射工具 - Category Mapping Utilities
 * 
 * 定义 Method.category 到 Equipment.category 的映射关系，
 * 用于根据选定的分析/测试方法筛选匹配的设备。
 */

/**
 * 方法分类到设备分类的映射表
 * 
 * 映射逻辑:
 * - analytical（分析类）→ 分析设备
 * - chemical（化学类）→ 机械设备 + 分析设备
 * - physical（物理类）→ 机械设备 + 测量设备
 * - electrical（电气类）→ 电学设备 + 测量设备
 * - environmental（环境类）→ 环境设备 + 热学设备
 * - reliability（可靠性）→ 环境设备 + 热学设备 + 机械设备
 */
export const METHOD_TO_EQUIPMENT_CATEGORY_MAP: Record<string, string[]> = {
  'analytical': ['analytical'],
  'chemical': ['mechanical', 'analytical'],
  'physical': ['mechanical', 'measurement'],
  'electrical': ['electrical', 'measurement'],
  'environmental': ['environmental', 'thermal'],
  'reliability': ['environmental', 'thermal', 'mechanical'],
  'thermal': ['thermal', 'environmental'],
  'mechanical': ['mechanical'],
  'optical': ['optical', 'analytical'],
};

/**
 * 根据方法分类获取匹配的设备分类列表
 * 
 * @param methodCategory - 方法分类名称（如 'analytical', 'chemical' 等）
 * @returns 匹配的设备分类列表。如果方法分类不在映射中，返回 ['other']
 */
export function getEquipmentCategoriesForMethod(methodCategory: string | undefined | null): string[] {
  if (!methodCategory) {
    return ['other'];
  }
  return METHOD_TO_EQUIPMENT_CATEGORY_MAP[methodCategory.toLowerCase()] || ['other'];
}

/**
 * 设备分类的显示名称映射
 */
export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  'thermal': '热学设备',
  'mechanical': '机械设备',
  'electrical': '电学设备',
  'optical': '光学设备',
  'analytical': '分析设备',
  'environmental': '环境设备',
  'measurement': '测量设备',
  'other': '其他设备',
};

/**
 * 方法分类的显示名称映射
 */
export const METHOD_CATEGORY_LABELS: Record<string, string> = {
  'analytical': '分析类',
  'chemical': '化学类',
  'physical': '物理类',
  'electrical': '电气类',
  'environmental': '环境类',
  'reliability': '可靠性',
  'thermal': '热学类',
  'mechanical': '机械类',
  'optical': '光学类',
};
