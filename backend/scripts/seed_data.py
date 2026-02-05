"""
数据库种子数据脚本 - 实验室管理系统
Database Seed Data Script - Laboratory Management System

数据规格 Data Specifications:
- 站点 Sites: 2个
- 实验室 Laboratories: 4个 (每站点1个FA + 1个可靠性)
- 设备 Equipment: 每实验室10个类别，每类别10台设备
- 人员 Personnel: 每实验室2工程师 + 5技术员
- 工单 Work Orders: 100个，每个至少5个子任务
- 日期范围 Date Range: 2026年1月1日 - 2026年3月1日
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Site, Laboratory, LaboratoryType,
    Personnel, PersonnelStatus, Skill, PersonnelSkill, ProficiencyLevel, SkillCategory,
    Equipment, EquipmentType, EquipmentStatus, EquipmentCategory, EquipmentSchedule,
    Client, Material, MaterialType, MaterialStatus,
    WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderTask, TaskStatus,
    StandardCycleTime, Method, MethodType, MethodSkillRequirement,
    ModulePermission, ModuleCode
)


def clear_all_data(db: Session):
    """清除所有现有数据"""
    print("正在清除现有数据...")
    
    # 按依赖关系逆序删除
    db.query(EquipmentSchedule).delete()
    db.query(WorkOrderTask).delete()
    db.query(Material).delete()
    db.query(WorkOrder).delete()
    db.query(StandardCycleTime).delete()
    db.query(MethodSkillRequirement).delete()
    db.query(Method).delete()
    db.query(Client).delete()
    db.query(Equipment).delete()
    db.query(PersonnelSkill).delete()
    db.query(Personnel).delete()
    db.query(Skill).delete()
    db.query(User).delete()
    db.query(Laboratory).delete()
    db.query(Site).delete()
    db.query(ModulePermission).delete()
    
    db.commit()
    print("✓ 已清除所有现有数据")


def seed_sites(db: Session) -> list[Site]:
    """创建站点数据 - 2个站点"""
    sites_data = [
        {
            "name": "深圳研发中心",
            "code": "SZ",
            "address": "深圳市南山区科技园南区高新南七道",
            "city": "深圳",
            "country": "中国",
            "timezone": "Asia/Shanghai",
            "contact_name": "张伟",
            "contact_email": "zhangwei@lab.com",
            "contact_phone": "0755-12345678"
        },
        {
            "name": "上海测试中心",
            "code": "SH",
            "address": "上海市浦东新区张江高科技园区",
            "city": "上海",
            "country": "中国",
            "timezone": "Asia/Shanghai",
            "contact_name": "李娜",
            "contact_email": "lina@lab.com",
            "contact_phone": "021-87654321"
        }
    ]
    
    sites = []
    for data in sites_data:
        site = Site(**data)
        db.add(site)
        sites.append(site)
    
    db.commit()
    for site in sites:
        db.refresh(site)
    
    print(f"✓ 创建了 {len(sites)} 个站点")
    return sites


def seed_laboratories(db: Session, sites: list[Site]) -> list[Laboratory]:
    """创建实验室数据 - 每站点2个实验室(1个FA + 1个可靠性)，共4个"""
    labs = []
    
    for site in sites:
        # FA实验室
        fa_lab = Laboratory(
            name=f"{site.name}-失效分析实验室",
            code=f"{site.code}-FA",
            site_id=site.id,
            lab_type=LaboratoryType.FA,
            description=f"{site.name}的失效分析实验室，提供芯片失效分析、故障定位等服务",
            max_capacity=50,
            manager_name=f"{site.name}FA主管",
            manager_email=f"fa_manager_{site.code.lower()}@lab.com"
        )
        db.add(fa_lab)
        labs.append(fa_lab)
        
        # 可靠性实验室
        rel_lab = Laboratory(
            name=f"{site.name}-可靠性实验室",
            code=f"{site.code}-REL",
            site_id=site.id,
            lab_type=LaboratoryType.RELIABILITY,
            description=f"{site.name}的可靠性测试实验室，提供环境应力测试、寿命测试等服务",
            max_capacity=100,
            manager_name=f"{site.name}REL主管",
            manager_email=f"rel_manager_{site.code.lower()}@lab.com"
        )
        db.add(rel_lab)
        labs.append(rel_lab)
    
    db.commit()
    for lab in labs:
        db.refresh(lab)
    
    print(f"✓ 创建了 {len(labs)} 个实验室")
    return labs


def seed_users_and_personnel(db: Session, sites: list[Site], labs: list[Laboratory]) -> tuple[list[User], list[Personnel]]:
    """创建用户和人员数据 - 每实验室2工程师+5技术员，加上管理员等"""
    users = []
    personnel_list = []
    
    # 1. 创建系统管理员
    admin = User(
        username="admin",
        email="admin@lab.com",
        hashed_password=get_password_hash("admin12345"),
        full_name="系统管理员",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    users.append(admin)
    
    # 2. 创建全局查看者
    viewer = User(
        username="viewer",
        email="viewer@lab.com",
        hashed_password=get_password_hash("password123"),
        full_name="访客账户",
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add(viewer)
    users.append(viewer)
    
    # 中文姓氏和名字池
    surnames = ["张", "王", "李", "赵", "陈", "刘", "杨", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "林", "郭", "何", "高", "罗"]
    given_names = ["伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "洋", "艳", "勇", "军", "杰", "涛", "明", "超", "秀英", "华", "平", "刚"]
    
    employee_counter = 1000
    
    # 3. 为每个实验室创建经理、工程师和技术员
    for lab in labs:
        site = next(s for s in sites if s.id == lab.site_id)
        
        # 实验室经理
        manager_name = f"{random.choice(surnames)}{random.choice(given_names)}"
        manager_user = User(
            username=f"manager_{lab.code.lower().replace('-', '_')}",
            email=f"manager_{lab.code.lower().replace('-', '_')}@lab.com",
            hashed_password=get_password_hash("password123"),
            full_name=manager_name,
            role=UserRole.MANAGER,
            is_active=True
        )
        db.add(manager_user)
        users.append(manager_user)
        
        db.flush()  # 获取manager_user.id
        
        manager_personnel = Personnel(
            employee_id=f"EMP{employee_counter:04d}",
            user_id=manager_user.id,
            primary_laboratory_id=lab.id,
            primary_site_id=site.id,
            current_laboratory_id=lab.id,
            current_site_id=site.id,
            job_title="实验室经理",
            department=lab.name,
            status=PersonnelStatus.AVAILABLE,
            hire_date=datetime(2020, 1, 15)
        )
        db.add(manager_personnel)
        personnel_list.append(manager_personnel)
        employee_counter += 1
        
        # 2个工程师
        for eng_idx in range(2):
            eng_name = f"{random.choice(surnames)}{random.choice(given_names)}"
            eng_user = User(
                username=f"engineer_{lab.code.lower().replace('-', '_')}_{eng_idx+1}",
                email=f"engineer_{lab.code.lower().replace('-', '_')}_{eng_idx+1}@lab.com",
                hashed_password=get_password_hash("password123"),
                full_name=eng_name,
                role=UserRole.ENGINEER,
                is_active=True
            )
            db.add(eng_user)
            users.append(eng_user)
            
            db.flush()
            
            eng_personnel = Personnel(
                employee_id=f"EMP{employee_counter:04d}",
                user_id=eng_user.id,
                primary_laboratory_id=lab.id,
                primary_site_id=site.id,
                current_laboratory_id=lab.id,
                current_site_id=site.id,
                job_title="高级工程师" if eng_idx == 0 else "工程师",
                department=lab.name,
                status=PersonnelStatus.AVAILABLE,
                hire_date=datetime(2021, 3, 1) + timedelta(days=eng_idx * 60)
            )
            db.add(eng_personnel)
            personnel_list.append(eng_personnel)
            employee_counter += 1
        
        # 5个技术员
        for tech_idx in range(5):
            tech_name = f"{random.choice(surnames)}{random.choice(given_names)}"
            tech_user = User(
                username=f"tech_{lab.code.lower().replace('-', '_')}_{tech_idx+1}",
                email=f"tech_{lab.code.lower().replace('-', '_')}_{tech_idx+1}@lab.com",
                hashed_password=get_password_hash("password123"),
                full_name=tech_name,
                role=UserRole.TECHNICIAN,
                is_active=True
            )
            db.add(tech_user)
            users.append(tech_user)
            
            db.flush()
            
            tech_personnel = Personnel(
                employee_id=f"EMP{employee_counter:04d}",
                user_id=tech_user.id,
                primary_laboratory_id=lab.id,
                primary_site_id=site.id,
                current_laboratory_id=lab.id,
                current_site_id=site.id,
                job_title=f"技术员{['A', 'B', 'C', 'D', 'E'][tech_idx]}级",
                department=lab.name,
                status=PersonnelStatus.AVAILABLE,
                hire_date=datetime(2022, 6, 1) + timedelta(days=tech_idx * 30)
            )
            db.add(tech_personnel)
            personnel_list.append(tech_personnel)
            employee_counter += 1
    
    db.commit()
    for user in users:
        db.refresh(user)
    for p in personnel_list:
        db.refresh(p)
    
    print(f"✓ 创建了 {len(users)} 个用户")
    print(f"✓ 创建了 {len(personnel_list)} 个人员记录")
    return users, personnel_list


def seed_skills(db: Session) -> list[Skill]:
    """创建技能数据"""
    skills_data = [
        # FA相关技能
        {"name": "扫描电子显微镜操作", "code": "SEM", "category": SkillCategory.EQUIPMENT_OPERATION, "description": "SEM设备操作和分析"},
        {"name": "聚焦离子束操作", "code": "FIB", "category": SkillCategory.EQUIPMENT_OPERATION, "description": "FIB设备操作"},
        {"name": "X射线检测", "code": "XRAY", "category": SkillCategory.EQUIPMENT_OPERATION, "description": "X射线无损检测"},
        {"name": "芯片开封", "code": "DECAP", "category": SkillCategory.ANALYSIS_TECHNIQUE, "description": "化学/物理开封技术"},
        {"name": "横截面制备", "code": "XSEC", "category": SkillCategory.ANALYSIS_TECHNIQUE, "description": "样品横截面制备"},
        {"name": "电气特性分析", "code": "ECA", "category": SkillCategory.ANALYSIS_TECHNIQUE, "description": "曲线追踪仪分析"},
        # 可靠性相关技能
        {"name": "高温箱操作", "code": "OVEN", "category": SkillCategory.EQUIPMENT_OPERATION, "description": "高温测试设备操作"},
        {"name": "温湿度箱操作", "code": "THC", "category": SkillCategory.EQUIPMENT_OPERATION, "description": "温湿度循环测试"},
        {"name": "振动台操作", "code": "VIBE", "category": SkillCategory.EQUIPMENT_OPERATION, "description": "振动测试设备"},
        {"name": "冲击测试", "code": "SHOCK", "category": SkillCategory.TESTING_METHOD, "description": "机械冲击测试"},
        {"name": "盐雾测试", "code": "SALT", "category": SkillCategory.TESTING_METHOD, "description": "盐雾腐蚀测试"},
        {"name": "电迁移测试", "code": "EM", "category": SkillCategory.ANALYSIS_TECHNIQUE, "description": "电迁移可靠性测试"},
        # 安全技能
        {"name": "化学品安全", "code": "CHEM_SAFE", "category": SkillCategory.SAFETY_PROCEDURE, "description": "化学品操作安全"},
        {"name": "辐射安全", "code": "RAD_SAFE", "category": SkillCategory.SAFETY_PROCEDURE, "description": "X射线辐射安全"},
        {"name": "高温安全", "code": "HEAT_SAFE", "category": SkillCategory.SAFETY_PROCEDURE, "description": "高温设备安全操作"},
    ]
    
    skills = []
    for data in skills_data:
        skill = Skill(**data, is_active=True)
        db.add(skill)
        skills.append(skill)
    
    db.commit()
    for skill in skills:
        db.refresh(skill)
    
    print(f"✓ 创建了 {len(skills)} 个技能")
    return skills


def seed_personnel_skills(db: Session, personnel: list[Personnel], skills: list[Skill]):
    """为人员分配技能"""
    skill_map = {s.code: s for s in skills}
    
    # FA技能集
    fa_skills = ["SEM", "FIB", "XRAY", "DECAP", "XSEC", "ECA", "CHEM_SAFE", "RAD_SAFE"]
    # 可靠性技能集
    rel_skills = ["OVEN", "THC", "VIBE", "SHOCK", "SALT", "EM", "HEAT_SAFE"]
    
    count = 0
    for p in personnel:
        # 根据实验室类型分配技能
        lab_code = ""
        if p.primary_laboratory:
            lab_code = p.primary_laboratory.code
        
        if "FA" in lab_code:
            skill_codes = fa_skills
        elif "REL" in lab_code:
            skill_codes = rel_skills
        else:
            skill_codes = fa_skills[:3] + rel_skills[:3]  # 管理员等混合技能
        
        # 根据角色决定技能数量和熟练度
        if p.user.role == UserRole.MANAGER:
            num_skills = 4
            proficiency = ProficiencyLevel.ADVANCED
        elif p.user.role == UserRole.ENGINEER:
            num_skills = 5
            proficiency = ProficiencyLevel.ADVANCED
        else:
            num_skills = 3
            proficiency = ProficiencyLevel.INTERMEDIATE
        
        selected_skills = random.sample(skill_codes, min(num_skills, len(skill_codes)))
        
        for skill_code in selected_skills:
            if skill_code in skill_map:
                ps = PersonnelSkill(
                    personnel_id=p.id,
                    skill_id=skill_map[skill_code].id,
                    proficiency_level=proficiency,
                    is_certified=random.random() > 0.3,
                    certification_date=datetime(2023, random.randint(1, 12), random.randint(1, 28)) if random.random() > 0.3 else None
                )
                db.add(ps)
                count += 1
    
    db.commit()
    print(f"✓ 创建了 {count} 条人员技能记录")


def seed_equipment(db: Session, sites: list[Site], labs: list[Laboratory]) -> list[Equipment]:
    """创建设备数据 - 每实验室10个类别，每类别10台设备"""
    equipment_list = []
    
    # FA实验室设备类别和名称 (10类别)
    fa_equipment_categories = [
        (EquipmentCategory.ANALYTICAL, "扫描电子显微镜", "SEM", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.ANALYTICAL, "聚焦离子束", "FIB", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.ANALYTICAL, "X射线检测仪", "XRAY", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.OPTICAL, "光学显微镜", "OM", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.OPTICAL, "红外显微镜", "IR-M", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.MEASUREMENT, "曲线追踪仪", "CT", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.MEASUREMENT, "万用表", "DMM", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.MECHANICAL, "研磨抛光机", "GP", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.MECHANICAL, "切割机", "SAW", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.OTHER, "超声波清洗机", "USC", EquipmentType.AUTONOMOUS),
    ]
    
    # 可靠性实验室设备类别和名称 (10类别)
    rel_equipment_categories = [
        (EquipmentCategory.THERMAL, "高温烤箱", "OVEN", EquipmentType.AUTONOMOUS),
        (EquipmentCategory.THERMAL, "低温箱", "COLD", EquipmentType.AUTONOMOUS),
        (EquipmentCategory.ENVIRONMENTAL, "温湿度箱", "THC", EquipmentType.AUTONOMOUS),
        (EquipmentCategory.ENVIRONMENTAL, "冷热冲击箱", "TSC", EquipmentType.AUTONOMOUS),
        (EquipmentCategory.ENVIRONMENTAL, "盐雾箱", "SSC", EquipmentType.AUTONOMOUS),
        (EquipmentCategory.MECHANICAL, "振动台", "VIB", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.MECHANICAL, "冲击台", "SHK", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.ELECTRICAL, "绝缘电阻测试仪", "IR", EquipmentType.OPERATOR_DEPENDENT),
        (EquipmentCategory.ELECTRICAL, "电源循环仪", "PC", EquipmentType.AUTONOMOUS),
        (EquipmentCategory.MEASUREMENT, "精密电源", "PS", EquipmentType.OPERATOR_DEPENDENT),
    ]
    
    eq_counter = 1
    
    for lab in labs:
        site = next(s for s in sites if s.id == lab.site_id)
        
        # 根据实验室类型选择设备类别
        if lab.lab_type == LaboratoryType.FA:
            categories = fa_equipment_categories
        else:
            categories = rel_equipment_categories
        
        # 每个类别10台设备
        for cat, name_prefix, code_prefix, eq_type in categories:
            for i in range(10):
                eq = Equipment(
                    name=f"{name_prefix}-{i+1:02d}",
                    code=f"{lab.code}-{code_prefix}-{i+1:02d}",
                    equipment_type=eq_type,
                    category=cat,
                    laboratory_id=lab.id,
                    site_id=site.id,
                    model=f"Model-{code_prefix}-{random.choice(['A', 'B', 'C'])}",
                    manufacturer=random.choice(["科达", "华测", "赛默飞", "岛津", "日立", "蔡司"]),
                    serial_number=f"SN{eq_counter:06d}",
                    description=f"{lab.name}的{name_prefix}设备",
                    capacity=random.randint(10, 50) if eq_type == EquipmentType.AUTONOMOUS else 1,
                    uph=random.uniform(1.0, 5.0),
                    max_concurrent_tasks=random.randint(1, 5) if eq_type == EquipmentType.AUTONOMOUS else 1,
                    status=random.choice([EquipmentStatus.AVAILABLE] * 8 + [EquipmentStatus.MAINTENANCE]),
                    maintenance_interval_days=random.randint(30, 90),
                    calibration_interval_days=random.randint(180, 365),
                    is_active=True
                )
                db.add(eq)
                equipment_list.append(eq)
                eq_counter += 1
    
    db.commit()
    for eq in equipment_list:
        db.refresh(eq)
    
    print(f"✓ 创建了 {len(equipment_list)} 台设备 ({len(labs)} 实验室 × 10类别 × 10台)")
    return equipment_list


def seed_clients(db: Session) -> list[Client]:
    """创建客户数据"""
    clients_data = [
        {"name": "华为技术有限公司", "code": "HUAWEI", "contact_name": "王经理", "contact_email": "wang@huawei.com", "default_sla_days": 5, "priority_level": 1, "source_category": "vip"},
        {"name": "中芯国际集成电路", "code": "SMIC", "contact_name": "李经理", "contact_email": "li@smic.com", "default_sla_days": 7, "priority_level": 1, "source_category": "vip"},
        {"name": "长电科技股份", "code": "JCET", "contact_name": "张经理", "contact_email": "zhang@jcet.com", "default_sla_days": 10, "priority_level": 2, "source_category": "external"},
        {"name": "通富微电子", "code": "TFME", "contact_name": "刘经理", "contact_email": "liu@tfme.com", "default_sla_days": 10, "priority_level": 2, "source_category": "external"},
        {"name": "韦尔半导体", "code": "WILL", "contact_name": "赵经理", "contact_email": "zhao@will.com", "default_sla_days": 7, "priority_level": 2, "source_category": "external"},
        {"name": "兆易创新", "code": "GIGA", "contact_name": "钱经理", "contact_email": "qian@giga.com", "default_sla_days": 10, "priority_level": 2, "source_category": "external"},
        {"name": "汇顶科技", "code": "GOODIX", "contact_name": "孙经理", "contact_email": "sun@goodix.com", "default_sla_days": 7, "priority_level": 2, "source_category": "external"},
        {"name": "内部研发部门", "code": "INTERNAL", "contact_name": "内部", "contact_email": "rd@internal.com", "default_sla_days": 14, "priority_level": 3, "source_category": "internal"},
        {"name": "质量保证部", "code": "QA", "contact_name": "品质部", "contact_email": "qa@internal.com", "default_sla_days": 14, "priority_level": 3, "source_category": "internal"},
        {"name": "紫光展锐", "code": "UNISOC", "contact_name": "周经理", "contact_email": "zhou@unisoc.com", "default_sla_days": 7, "priority_level": 2, "source_category": "external"},
    ]
    
    clients = []
    for data in clients_data:
        client = Client(**data)
        db.add(client)
        clients.append(client)
    
    db.commit()
    for client in clients:
        db.refresh(client)
    
    print(f"✓ 创建了 {len(clients)} 个客户")
    return clients


def seed_methods(db: Session, labs: list[Laboratory], equipment: list[Equipment]) -> list[Method]:
    """创建分析/测试方法"""
    fa_labs = [l for l in labs if l.lab_type == LaboratoryType.FA]
    rel_labs = [l for l in labs if l.lab_type == LaboratoryType.RELIABILITY]
    
    methods_data = [
        # FA方法
        {"name": "SEM形貌分析", "code": "FA-SEM", "method_type": MethodType.ANALYSIS, "category": "analytical", "standard_cycle_hours": 3.0, "lab_type": "fa"},
        {"name": "FIB横截面制备", "code": "FA-FIB", "method_type": MethodType.ANALYSIS, "category": "analytical", "standard_cycle_hours": 8.0, "lab_type": "fa"},
        {"name": "X射线无损检测", "code": "FA-XRAY", "method_type": MethodType.ANALYSIS, "category": "analytical", "standard_cycle_hours": 1.0, "lab_type": "fa"},
        {"name": "芯片开封处理", "code": "FA-DECAP", "method_type": MethodType.ANALYSIS, "category": "chemical", "standard_cycle_hours": 4.0, "lab_type": "fa"},
        {"name": "横截面研磨抛光", "code": "FA-XSEC", "method_type": MethodType.ANALYSIS, "category": "physical", "standard_cycle_hours": 6.0, "lab_type": "fa"},
        {"name": "电气特性曲线分析", "code": "FA-CURVE", "method_type": MethodType.ANALYSIS, "category": "electrical", "standard_cycle_hours": 2.0, "lab_type": "fa"},
        # 可靠性方法
        {"name": "高温存储测试", "code": "REL-HTSL", "method_type": MethodType.RELIABILITY, "category": "environmental", "standard_cycle_hours": 168.0, "lab_type": "rel"},
        {"name": "温湿度循环测试", "code": "REL-THB", "method_type": MethodType.RELIABILITY, "category": "environmental", "standard_cycle_hours": 240.0, "lab_type": "rel"},
        {"name": "温度循环测试", "code": "REL-TC", "method_type": MethodType.RELIABILITY, "category": "environmental", "standard_cycle_hours": 120.0, "lab_type": "rel"},
        {"name": "冷热冲击测试", "code": "REL-TST", "method_type": MethodType.RELIABILITY, "category": "environmental", "standard_cycle_hours": 48.0, "lab_type": "rel"},
        {"name": "振动测试", "code": "REL-VIB", "method_type": MethodType.RELIABILITY, "category": "mechanical", "standard_cycle_hours": 24.0, "lab_type": "rel"},
        {"name": "盐雾腐蚀测试", "code": "REL-SSC", "method_type": MethodType.RELIABILITY, "category": "environmental", "standard_cycle_hours": 96.0, "lab_type": "rel"},
    ]
    
    methods = []
    for data in methods_data:
        lab_type = data.pop("lab_type")
        target_labs = fa_labs if lab_type == "fa" else rel_labs
        
        method = Method(
            **data,
            laboratory_id=target_labs[0].id if target_labs else None,
            description=f"{data['name']}的标准操作流程",
            requires_equipment=True,
            is_active=True
        )
        db.add(method)
        methods.append(method)
    
    db.commit()
    for method in methods:
        db.refresh(method)
    
    print(f"✓ 创建了 {len(methods)} 个分析/测试方法")
    return methods


def seed_work_orders_and_tasks(db: Session, labs: list[Laboratory], sites: list[Site],
                                clients: list[Client], users: list[User], 
                                personnel: list[Personnel], equipment: list[Equipment]) -> list[WorkOrder]:
    """创建100个工单，每个工单至少5个子任务"""
    
    # 按实验室分组人员
    lab_personnel = {}
    for p in personnel:
        lab_id = p.primary_laboratory_id
        if lab_id not in lab_personnel:
            lab_personnel[lab_id] = {"managers": [], "engineers": [], "technicians": []}
        if p.user.role == UserRole.MANAGER:
            lab_personnel[lab_id]["managers"].append(p)
        elif p.user.role == UserRole.ENGINEER:
            lab_personnel[lab_id]["engineers"].append(p)
        elif p.user.role == UserRole.TECHNICIAN:
            lab_personnel[lab_id]["technicians"].append(p)
    
    # 按实验室分组设备
    lab_equipment = {}
    for eq in equipment:
        lab_id = eq.laboratory_id
        if lab_id not in lab_equipment:
            lab_equipment[lab_id] = []
        lab_equipment[lab_id].append(eq)
    
    admin_user = next(u for u in users if u.role == UserRole.ADMIN)
    
    # FA和可靠性任务模板
    fa_task_templates = [
        ("样品接收登记", 1.0, EquipmentCategory.OTHER),
        ("外观检查", 1.0, EquipmentCategory.OPTICAL),
        ("X射线检测", 2.0, EquipmentCategory.ANALYTICAL),
        ("开封处理", 4.0, EquipmentCategory.MECHANICAL),
        ("SEM分析", 3.0, EquipmentCategory.ANALYTICAL),
        ("横截面制备", 6.0, EquipmentCategory.MECHANICAL),
        ("失效定位", 4.0, EquipmentCategory.ANALYTICAL),
        ("报告编写", 2.0, None),
    ]
    
    rel_task_templates = [
        ("样品准备编号", 2.0, None),
        ("初始电气测试", 4.0, EquipmentCategory.MEASUREMENT),
        ("环境应力测试", 168.0, EquipmentCategory.ENVIRONMENTAL),
        ("中间读数", 4.0, EquipmentCategory.MEASUREMENT),
        ("应力循环", 72.0, EquipmentCategory.THERMAL),
        ("最终电气测试", 4.0, EquipmentCategory.MEASUREMENT),
        ("数据分析", 8.0, None),
        ("报告编写", 4.0, None),
    ]
    
    # 时间范围
    start_date_range_start = datetime(2026, 1, 1, 8, 0)
    start_date_range_end = datetime(2026, 2, 1, 18, 0)
    total_start_days = (start_date_range_end - start_date_range_start).days
    
    work_orders = []
    all_tasks = []
    all_schedules = []
    
    # 用于跟踪设备使用情况，避免冲突
    equipment_schedules = {}  # {eq_id: [(start, end), ...]}
    
    for wo_idx in range(100):
        # 均匀分布开始日期
        day_offset = int((wo_idx / 100) * total_start_days)
        wo_created = start_date_range_start + timedelta(days=day_offset, hours=random.randint(0, 9))
        
        # 选择实验室
        lab = random.choice(labs)
        site = next(s for s in sites if s.id == lab.site_id)
        
        # 选择客户
        client = random.choice(clients)
        
        # 工单类型基于实验室类型
        if lab.lab_type == LaboratoryType.FA:
            wo_type = WorkOrderType.FAILURE_ANALYSIS
            task_templates = fa_task_templates
            standard_hours = random.choice([16, 24, 32, 40])
            sla_days = random.randint(5, 14)
        else:
            wo_type = WorkOrderType.RELIABILITY_TEST
            task_templates = rel_task_templates
            standard_hours = random.choice([168, 240, 336, 500])
            sla_days = random.randint(14, 30)
        
        # 确定工单状态
        days_since_created = (datetime(2026, 2, 15) - wo_created).days
        if days_since_created > 35:
            status = random.choice([WorkOrderStatus.COMPLETED] * 8 + [WorkOrderStatus.CANCELLED])
        elif days_since_created > 25:
            status = random.choice([WorkOrderStatus.COMPLETED] * 6 + [WorkOrderStatus.IN_PROGRESS] * 3 + [WorkOrderStatus.CANCELLED])
        elif days_since_created > 15:
            status = random.choice([WorkOrderStatus.COMPLETED] * 3 + [WorkOrderStatus.IN_PROGRESS] * 5 + [WorkOrderStatus.ASSIGNED] * 2)
        elif days_since_created > 7:
            status = random.choice([WorkOrderStatus.IN_PROGRESS] * 4 + [WorkOrderStatus.ASSIGNED] * 4 + [WorkOrderStatus.PENDING] * 2)
        else:
            status = random.choice([WorkOrderStatus.PENDING] * 5 + [WorkOrderStatus.ASSIGNED] * 3 + [WorkOrderStatus.DRAFT] * 2)
        
        # 创建工单
        wo = WorkOrder(
            order_number=f"WO-2026{wo_created.strftime('%m%d')}-{wo_idx+1:04d}",
            title=f"{client.name}-{lab.name[:4]}测试-{wo_idx+1:03d}",
            description=f"工单{wo_idx+1}: {client.name}的{lab.lab_type.value}测试任务",
            work_order_type=wo_type,
            laboratory_id=lab.id,
            site_id=site.id,
            client_id=client.id,
            testing_source=client.source_category,
            sla_deadline=wo_created + timedelta(days=sla_days),
            standard_cycle_hours=float(standard_hours),
            status=status,
            priority_level=client.priority_level,
            created_by_id=admin_user.id,
            created_at=wo_created,
        )
        
        # 设置工程师分配
        lab_eng = lab_personnel.get(lab.id, {}).get("engineers", [])
        lab_tech = lab_personnel.get(lab.id, {}).get("technicians", [])
        
        if status not in [WorkOrderStatus.DRAFT, WorkOrderStatus.PENDING] and lab_eng:
            wo.assigned_engineer_id = random.choice(lab_eng).id
            wo.assigned_at = wo_created + timedelta(hours=random.randint(2, 24))
        
        if status in [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED]:
            wo.started_at = wo.assigned_at + timedelta(hours=random.randint(1, 8)) if wo.assigned_at else wo_created + timedelta(hours=24)
        
        if status == WorkOrderStatus.COMPLETED:
            # 完成日期在Jan 5 - Mar 1之间
            completion_offset = random.randint(4, 59)  # 5天到60天后
            wo.completed_at = wo_created + timedelta(days=completion_offset)
            if wo.completed_at > datetime(2026, 3, 1):
                wo.completed_at = datetime(2026, 3, 1) - timedelta(hours=random.randint(1, 72))
            wo.actual_cycle_hours = wo.standard_cycle_hours * random.uniform(0.8, 1.2)
        
        wo.priority_score = wo.calculate_priority_score()
        db.add(wo)
        work_orders.append(wo)
    
    db.commit()
    for wo in work_orders:
        db.refresh(wo)
    
    # 为每个工单创建任务
    for wo in work_orders:
        if wo.status == WorkOrderStatus.DRAFT:
            continue
        
        lab = next(l for l in labs if l.id == wo.laboratory_id)
        task_templates = fa_task_templates if lab.lab_type == LaboratoryType.FA else rel_task_templates
        lab_tech = lab_personnel.get(lab.id, {}).get("technicians", [])
        lab_eq = lab_equipment.get(lab.id, [])
        
        # 至少5个任务，最多8个
        num_tasks = max(5, min(len(task_templates), 8))
        selected_templates = task_templates[:num_tasks]
        
        task_start_time = wo.started_at if wo.started_at else wo.created_at + timedelta(hours=24)
        
        for seq, (task_title, task_hours, eq_category) in enumerate(selected_templates, 1):
            task = WorkOrderTask(
                work_order_id=wo.id,
                task_number=f"T{seq:03d}",
                title=task_title,
                description=f"{wo.title} - {task_title}",
                sequence=seq,
                standard_cycle_hours=task_hours,
                status=TaskStatus.PENDING
            )
            
            # 选择设备（如果需要）
            selected_equipment = None
            if eq_category and lab_eq:
                category_eq = [e for e in lab_eq if e.category == eq_category and e.status == EquipmentStatus.AVAILABLE]
                if category_eq:
                    selected_equipment = random.choice(category_eq)
                    task.required_equipment_id = selected_equipment.id
                    task.scheduled_equipment_id = selected_equipment.id
            
            # 根据工单状态设置任务状态
            task_end_time = None
            assigned_tech = None
            
            if wo.status == WorkOrderStatus.COMPLETED:
                task.status = TaskStatus.COMPLETED
                if lab_tech:
                    assigned_tech = random.choice(lab_tech)
                    task.assigned_technician_id = assigned_tech.id
                task.assigned_at = task_start_time
                task.started_at = task_start_time + timedelta(minutes=random.randint(10, 60))
                task_end_time = task.started_at + timedelta(hours=task_hours * random.uniform(0.8, 1.2))
                task.completed_at = task_end_time
                task.actual_cycle_hours = task_hours * random.uniform(0.85, 1.15)
                task_start_time = task_end_time + timedelta(minutes=random.randint(30, 120))
                
            elif wo.status == WorkOrderStatus.IN_PROGRESS:
                progress = random.uniform(0.3, 0.7)
                task_threshold = int(num_tasks * progress)
                
                if seq <= task_threshold:
                    task.status = TaskStatus.COMPLETED
                    if lab_tech:
                        assigned_tech = random.choice(lab_tech)
                        task.assigned_technician_id = assigned_tech.id
                    task.assigned_at = task_start_time
                    task.started_at = task_start_time + timedelta(minutes=30)
                    task_end_time = task.started_at + timedelta(hours=task_hours * random.uniform(0.9, 1.1))
                    task.completed_at = task_end_time
                    task.actual_cycle_hours = task_hours * random.uniform(0.9, 1.1)
                    task_start_time = task_end_time + timedelta(hours=1)
                elif seq == task_threshold + 1:
                    task.status = TaskStatus.IN_PROGRESS
                    if lab_tech:
                        assigned_tech = random.choice(lab_tech)
                        task.assigned_technician_id = assigned_tech.id
                    task.assigned_at = task_start_time
                    task.started_at = task_start_time + timedelta(minutes=15)
                    task_end_time = task.started_at + timedelta(hours=task_hours)
                    
            elif wo.status == WorkOrderStatus.ASSIGNED and seq == 1:
                task.status = TaskStatus.ASSIGNED
                if lab_tech:
                    assigned_tech = random.choice(lab_tech)
                    task.assigned_technician_id = assigned_tech.id
                task.assigned_at = wo.assigned_at
                task_end_time = task.assigned_at + timedelta(hours=task_hours) if task.assigned_at else None
            
            db.add(task)
            all_tasks.append(task)
            
            # 创建设备调度
            if selected_equipment and task.started_at and task_end_time:
                eq_id = selected_equipment.id
                
                # 检查设备冲突
                if eq_id not in equipment_schedules:
                    equipment_schedules[eq_id] = []
                
                # 简单的冲突避免：如果有冲突，调整时间
                has_conflict = False
                for (existing_start, existing_end) in equipment_schedules[eq_id]:
                    if not (task_end_time <= existing_start or task.started_at >= existing_end):
                        has_conflict = True
                        break
                
                if not has_conflict:
                    equipment_schedules[eq_id].append((task.started_at, task_end_time))
                    
                    schedule_status = "completed" if task.status == TaskStatus.COMPLETED else \
                                      "in_progress" if task.status == TaskStatus.IN_PROGRESS else "scheduled"
                    
                    schedule = EquipmentSchedule(
                        equipment_id=eq_id,
                        start_time=task.started_at,
                        end_time=task_end_time,
                        work_order_id=wo.id,
                        operator_id=assigned_tech.id if assigned_tech else None,
                        title=f"{wo.order_number} - {task_title}",
                        status=schedule_status
                    )
                    all_schedules.append((schedule, task))
    
    db.commit()
    
    # 更新任务ID并添加调度
    for schedule, task in all_schedules:
        schedule.task_id = task.id
        db.add(schedule)
    
    db.commit()
    
    print(f"✓ 创建了 {len(work_orders)} 个工单")
    print(f"✓ 创建了 {len(all_tasks)} 个任务")
    print(f"✓ 创建了 {len(all_schedules)} 个设备调度记录")
    
    return work_orders


def seed_materials(db: Session, labs: list[Laboratory], sites: list[Site], 
                   clients: list[Client], work_orders: list[WorkOrder]):
    """创建物料/样品数据"""
    materials = []
    
    active_wos = [wo for wo in work_orders if wo.status in [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ASSIGNED]]
    
    for i, wo in enumerate(work_orders[:30]):  # 为前30个工单创建材料
        lab = next(l for l in labs if l.id == wo.laboratory_id)
        site = next(s for s in sites if s.id == wo.site_id)
        client = next((c for c in clients if c.id == wo.client_id), clients[0])
        
        material = Material(
            material_code=f"SAM-2026-{i+1:04d}",
            name=f"{client.name}测试样品-{i+1:03d}",
            material_type=MaterialType.SAMPLE,
            description=f"{wo.title}的测试样品",
            laboratory_id=lab.id,
            site_id=site.id,
            client_id=client.id,
            client_reference=f"{client.code}-{i+1:04d}",
            quantity=random.randint(5, 50),
            unit="颗",
            storage_location=f"{lab.code}-存储区-{random.choice(['A', 'B', 'C'])}{random.randint(1, 10):02d}",
            status=random.choice([MaterialStatus.IN_STORAGE, MaterialStatus.IN_USE, MaterialStatus.ALLOCATED]),
            storage_deadline=datetime(2026, 6, 30),
            processing_deadline=datetime(2026, 3, 31),
            current_work_order_id=wo.id if wo in active_wos else None
        )
        db.add(material)
        materials.append(material)
    
    db.commit()
    print(f"✓ 创建了 {len(materials)} 条物料记录")


def seed_module_permissions(db: Session):
    """创建模块权限种子数据 - 基于2026-02-05配置的权限矩阵"""
    
    # 所有模块代码
    all_modules = [m.value for m in ModuleCode]
    
    # 各角色的模块权限配置（基于数据库实际数据）
    role_permissions = {
        "admin": [
            "audit_logs", "clients", "dashboard", "equipment", "handovers",
            "locations", "materials", "methods", "personnel", "products",
            "settings", "user_management", "work_orders"
        ],
        "manager": [
            "clients", "dashboard", "equipment", "handovers", "locations",
            "materials", "methods", "personnel", "products", "user_management",
            "work_orders"
        ],
        "engineer": [
            "dashboard", "equipment", "handovers", "materials", "methods",
            "personnel", "work_orders"
        ],
        "technician": [
            "dashboard", "handovers", "materials", "work_orders"
        ],
        "viewer": [
            "work_orders"
        ],
    }
    
    count = 0
    for role, accessible_modules in role_permissions.items():
        for module_code in all_modules:
            can_access = module_code in accessible_modules
            perm = ModulePermission(
                role=role,
                module_code=module_code,
                can_access=can_access
            )
            db.add(perm)
            count += 1
    
    db.commit()
    print(f"✓ 创建了 {count} 条模块权限记录 (5角色 × {len(all_modules)}模块)")
    
    # 打印权限矩阵摘要
    print("\n  模块权限矩阵:")
    print("  " + "-" * 70)
    header = f"  {'角色':<12}"
    for role in role_permissions.keys():
        header += f"{role:<12}"
    print(header)
    print("  " + "-" * 70)
    print(f"  {'可访问模块数':<12}", end="")
    for role, modules in role_permissions.items():
        print(f"{len(modules):<12}", end="")
    print()
    print("  " + "-" * 70)


def run_seed():
    """运行所有种子数据"""
    print("\n" + "="*60)
    print("开始创建种子数据 - 实验室管理系统")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # 清除现有数据
        clear_all_data(db)
        
        # 按依赖顺序创建数据
        sites = seed_sites(db)  # 2个站点
        labs = seed_laboratories(db, sites)  # 4个实验室
        users, personnel = seed_users_and_personnel(db, sites, labs)  # 用户和人员
        skills = seed_skills(db)  # 技能
        seed_personnel_skills(db, personnel, skills)  # 人员技能
        equipment = seed_equipment(db, sites, labs)  # 设备 (4 labs × 10 categories × 10 items = 400)
        clients = seed_clients(db)  # 客户
        methods = seed_methods(db, labs, equipment)  # 方法
        work_orders = seed_work_orders_and_tasks(db, labs, sites, clients, users, personnel, equipment)  # 100工单+任务
        seed_materials(db, labs, sites, clients, work_orders)  # 物料
        seed_module_permissions(db)  # 模块权限
        
        print("\n" + "="*60)
        print("✅ 所有种子数据创建完成！")
        print("="*60)
        print("\n" + "-"*60)
        print("数据统计 Data Statistics:")
        print("-"*60)
        print(f"  站点 Sites:           2 个")
        print(f"  实验室 Laboratories:  4 个 (每站点 1 FA + 1 REL)")
        print(f"  用户 Users:           {len(users)} 个")
        print(f"  人员 Personnel:       {len(personnel)} 个 (每实验室 1经理+2工程师+5技术员)")
        print(f"  技能 Skills:          {len(skills)} 个")
        print(f"  设备 Equipment:       {len(equipment)} 台 (每实验室 10类别×10台)")
        print(f"  客户 Clients:         {len(clients)} 个")
        print(f"  方法 Methods:         {len(methods)} 个")
        print(f"  工单 Work Orders:     100 个")
        print(f"  日期范围:             2026年1月1日 - 2026年3月1日")
        print("-"*60)
        print("\n默认登录账户 Default Login Credentials:")
        print("-"*60)
        print("  系统管理员 Admin:     admin / admin12345")
        print("  FA经理 FA Manager:    manager_sz_fa / password123")
        print("  REL经理 REL Manager:  manager_sz_rel / password123")
        print("  工程师 Engineer:      engineer_sz_fa_1 / password123")
        print("  技术员 Technician:    tech_sz_fa_1 / password123")
        print("  查看者 Viewer:        viewer / password123")
        print("-"*60)
        print()
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
