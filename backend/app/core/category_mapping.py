"""
分类映射模块 - Category Mapping

定义 Method.category 到 Equipment.category 的映射关系，
用于根据选定的分析/测试方法筛选匹配的设备。

映射逻辑:
- analytical（分析类）→ 分析设备
- chemical（化学类）→ 机械设备 + 分析设备
- physical（物理类）→ 机械设备 + 测量设备
- electrical（电气类）→ 电学设备 + 测量设备
- environmental（环境类）→ 环境设备 + 热学设备
- reliability（可靠性）→ 环境设备 + 热学设备 + 机械设备
"""
from typing import List

from app.models.equipment import EquipmentCategory


# 方法分类到设备分类的映射
METHOD_TO_EQUIPMENT_CATEGORY_MAP: dict[str, List[EquipmentCategory]] = {
    'analytical': [EquipmentCategory.ANALYTICAL],
    'chemical': [EquipmentCategory.MECHANICAL, EquipmentCategory.ANALYTICAL],
    'physical': [EquipmentCategory.MECHANICAL, EquipmentCategory.MEASUREMENT],
    'electrical': [EquipmentCategory.ELECTRICAL, EquipmentCategory.MEASUREMENT],
    'environmental': [EquipmentCategory.ENVIRONMENTAL, EquipmentCategory.THERMAL],
    'reliability': [EquipmentCategory.ENVIRONMENTAL, EquipmentCategory.THERMAL, EquipmentCategory.MECHANICAL],
    'thermal': [EquipmentCategory.THERMAL, EquipmentCategory.ENVIRONMENTAL],
    'mechanical': [EquipmentCategory.MECHANICAL],
    'optical': [EquipmentCategory.OPTICAL, EquipmentCategory.ANALYTICAL],
}


def get_equipment_categories_for_method(method_category: str) -> List[EquipmentCategory]:
    """
    根据方法分类获取匹配的设备分类列表
    
    Args:
        method_category: 方法分类名称（如 'analytical', 'chemical' 等）
    
    Returns:
        List[EquipmentCategory]: 匹配的设备分类枚举列表
        如果方法分类不在映射中，返回 [EquipmentCategory.OTHER]
    """
    if not method_category:
        return [EquipmentCategory.OTHER]
    return METHOD_TO_EQUIPMENT_CATEGORY_MAP.get(
        method_category.lower(), 
        [EquipmentCategory.OTHER]
    )


def get_equipment_category_values_for_method(method_category: str) -> List[str]:
    """
    根据方法分类获取匹配的设备分类值列表（字符串形式）
    
    Args:
        method_category: 方法分类名称
    
    Returns:
        List[str]: 匹配的设备分类值列表（如 ['thermal', 'environmental']）
    """
    categories = get_equipment_categories_for_method(method_category)
    return [cat.value for cat in categories]
