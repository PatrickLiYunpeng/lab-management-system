"""
刷新设备数据脚本 - Refresh Equipment Data Script

将现有设备的 name 字段与 equipment_names 表匹配，
设置 equipment_name_id 和 category_id。

使用方法:
    cd backend
    python -m scripts.refresh_equipment_names
"""
import re
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.equipment import Equipment
from app.models.equipment_category import EquipmentNameModel, EquipmentCategoryModel


def extract_base_name(name: str) -> str:
    """
    提取设备名称的基础部分（去除编号后缀）
    
    例如：
    - "扫描电子显微镜-01" -> "扫描电子显微镜"
    - "万用表-10" -> "万用表"
    - "高温烤箱-05" -> "高温烤箱"
    """
    if not name:
        return ""
    # 去除末尾的 -数字 后缀
    base_name = re.sub(r'-\d+$', '', name.strip())
    return base_name.lower()


def refresh_equipment_names(db: Session) -> dict:
    """
    刷新设备的 equipment_name_id 和 category_id
    
    逻辑：
    1. 获取所有设备名记录
    2. 遍历所有设备
    3. 根据设备的 name 字段（去除编号后缀）匹配设备名记录
    4. 如果匹配成功，更新 equipment_name_id 和 category_id
    """
    stats = {
        "total_equipment": 0,
        "updated": 0,
        "already_set": 0,
        "no_match": [],
    }
    
    # 获取所有设备名记录，建立 name -> record 映射
    equipment_names = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.is_active == True
    ).all()
    
    name_map = {}
    for en in equipment_names:
        # 使用小写匹配，避免大小写问题
        name_map[en.name.lower().strip()] = en
    
    print(f"已加载 {len(name_map)} 个设备名记录")
    print(f"设备名列表: {list(name_map.keys())}")
    
    # 获取所有设备
    equipment_list = db.query(Equipment).all()
    stats["total_equipment"] = len(equipment_list)
    
    print(f"\n共有 {stats['total_equipment']} 台设备需要处理")
    
    for eq in equipment_list:
        # 如果已经设置了 equipment_name_id，跳过
        if eq.equipment_name_id:
            stats["already_set"] += 1
            continue
        
        # 提取基础名称（去除编号后缀）
        base_name = extract_base_name(eq.name)
        
        if base_name in name_map:
            matched_name = name_map[base_name]
            eq.equipment_name_id = matched_name.id
            eq.category_id = matched_name.category_id
            stats["updated"] += 1
            print(f"  [更新] {eq.code}: '{eq.name}' -> equipment_name_id={matched_name.id}, category_id={matched_name.category_id}")
        else:
            stats["no_match"].append({
                "id": eq.id,
                "code": eq.code,
                "name": eq.name,
                "base_name": base_name,
            })
    
    # 提交更改
    db.commit()
    
    return stats


def main():
    """主函数"""
    print("=" * 60)
    print("刷新设备数据 - 匹配设备名称")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        stats = refresh_equipment_names(db)
        
        print("\n" + "=" * 60)
        print("刷新完成！统计信息：")
        print("=" * 60)
        print(f"  设备总数: {stats['total_equipment']}")
        print(f"  已更新: {stats['updated']}")
        print(f"  已有设置(跳过): {stats['already_set']}")
        print(f"  未匹配: {len(stats['no_match'])}")
        
        if stats["no_match"]:
            # 统计未匹配的基础名称
            missing_names = set(item['base_name'] for item in stats['no_match'])
            print(f"\n未匹配的设备名列表（共 {len(missing_names)} 个，需要在设备名管理中添加）：")
            for name in sorted(missing_names):
                count = sum(1 for item in stats['no_match'] if item['base_name'] == name)
                print(f"  - '{name}' ({count} 台设备)")
            print("\n提示: 请在 '设备类型管理' 中添加缺失的设备名，然后重新运行此脚本。")
        
    finally:
        db.close()


if __name__ == "__main__":
    main()
