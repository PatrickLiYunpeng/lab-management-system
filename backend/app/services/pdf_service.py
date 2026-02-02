"""
PDF Report Generation Service using ReportLab.
Generates professional PDF reports for work orders, personnel, and analytics.
"""
from io import BytesIO
from datetime import datetime
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from sqlalchemy.orm import Session

from app.models.work_order import WorkOrder, WorkOrderTask, WorkOrderStatus
from app.models.personnel import Personnel
from app.models.equipment import Equipment


class PDFReportService:
    """Service for generating PDF reports."""
    
    # Chinese-friendly styles
    @staticmethod
    def get_styles():
        styles = getSampleStyleSheet()
        # Add custom styles
        styles.add(ParagraphStyle(
            name='ChineseTitle',
            parent=styles['Title'],
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            spaceAfter=20,
        ))
        styles.add(ParagraphStyle(
            name='ChineseHeading',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            spaceBefore=12,
            spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            name='ChineseNormal',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
        ))
        styles.add(ParagraphStyle(
            name='ChineseSmall',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.grey,
        ))
        return styles

    @staticmethod
    def create_header_footer(canvas, doc, title: str):
        """Add header and footer to each page."""
        canvas.saveState()
        
        # Header
        canvas.setFont('Helvetica-Bold', 12)
        canvas.drawString(2*cm, A4[1] - 1.5*cm, title)
        canvas.setFont('Helvetica', 9)
        canvas.drawRightString(A4[0] - 2*cm, A4[1] - 1.5*cm, 
                              f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        canvas.line(2*cm, A4[1] - 1.8*cm, A4[0] - 2*cm, A4[1] - 1.8*cm)
        
        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.drawString(2*cm, 1.5*cm, "Laboratory Management System")
        canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, f"Page {doc.page}")
        canvas.line(2*cm, 1.8*cm, A4[0] - 2*cm, 1.8*cm)
        
        canvas.restoreState()

    @classmethod
    def generate_work_order_report(cls, work_order: WorkOrder, tasks: List[WorkOrderTask]) -> BytesIO:
        """Generate a detailed PDF report for a single work order."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4,
            rightMargin=2*cm, 
            leftMargin=2*cm,
            topMargin=2.5*cm, 
            bottomMargin=2.5*cm
        )
        
        styles = cls.get_styles()
        elements = []
        
        # Title
        elements.append(Paragraph(f"Work Order Report", styles['ChineseTitle']))
        elements.append(Paragraph(f"#{work_order.order_number}", styles['ChineseHeading']))
        elements.append(Spacer(1, 10))
        
        # Work Order Details Table
        wo_data = [
            ['Field', 'Value'],
            ['Order Number', work_order.order_number],
            ['Title', work_order.title or '-'],
            ['Type', work_order.work_order_type.value.replace('_', ' ').title()],
            ['Status', work_order.status.value.replace('_', ' ').title()],
            ['Priority Level', str(work_order.priority_level)],
            ['Priority Score', f"{work_order.priority_score:.1f}"],
            ['Created At', work_order.created_at.strftime('%Y-%m-%d %H:%M') if work_order.created_at else '-'],
            ['SLA Deadline', work_order.sla_deadline.strftime('%Y-%m-%d %H:%M') if work_order.sla_deadline else '-'],
            ['Started At', work_order.started_at.strftime('%Y-%m-%d %H:%M') if work_order.started_at else '-'],
            ['Completed At', work_order.completed_at.strftime('%Y-%m-%d %H:%M') if work_order.completed_at else '-'],
        ]
        
        wo_table = Table(wo_data, colWidths=[5*cm, 10*cm])
        wo_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1890ff')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fafafa')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        elements.append(wo_table)
        elements.append(Spacer(1, 20))
        
        # Description if available
        if work_order.description:
            elements.append(Paragraph("Description", styles['ChineseHeading']))
            elements.append(Paragraph(work_order.description, styles['ChineseNormal']))
            elements.append(Spacer(1, 15))
        
        # Tasks Section
        if tasks:
            elements.append(Paragraph(f"Tasks ({len(tasks)})", styles['ChineseHeading']))
            
            task_data = [['#', 'Task Number', 'Title', 'Status', 'Assigned To']]
            for i, task in enumerate(tasks, 1):
                assignee = '-'
                if task.assigned_technician and task.assigned_technician.user:
                    assignee = task.assigned_technician.user.full_name or task.assigned_technician.employee_id
                task_data.append([
                    str(i),
                    task.task_number,
                    task.title[:30] + '...' if len(task.title) > 30 else task.title,
                    task.status.value.replace('_', ' ').title(),
                    assignee,
                ])
            
            task_table = Table(task_data, colWidths=[1*cm, 2.5*cm, 6*cm, 3*cm, 4*cm])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#52c41a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ]))
            elements.append(task_table)
        
        # Build PDF
        doc.build(elements, onFirstPage=lambda c, d: cls.create_header_footer(c, d, "Work Order Report"),
                  onLaterPages=lambda c, d: cls.create_header_footer(c, d, "Work Order Report"))
        
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_work_orders_list_report(
        cls, 
        work_orders: List[WorkOrder],
        title: str = "Work Orders Report",
        filters_description: str = ""
    ) -> BytesIO:
        """Generate a PDF report listing multiple work orders."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=landscape(A4),
            rightMargin=1.5*cm, 
            leftMargin=1.5*cm,
            topMargin=2.5*cm, 
            bottomMargin=2.5*cm
        )
        
        styles = cls.get_styles()
        elements = []
        
        # Title
        elements.append(Paragraph(title, styles['ChineseTitle']))
        if filters_description:
            elements.append(Paragraph(filters_description, styles['ChineseSmall']))
        elements.append(Paragraph(f"Total: {len(work_orders)} records", styles['ChineseNormal']))
        elements.append(Spacer(1, 15))
        
        # Table Header
        data = [['#', 'Order #', 'Title', 'Type', 'Status', 'Priority', 'Client', 'SLA Deadline', 'Created']]
        
        for i, wo in enumerate(work_orders, 1):
            client_name = wo.client.name if wo.client else '-'
            sla = wo.sla_deadline.strftime('%Y-%m-%d') if wo.sla_deadline else '-'
            created = wo.created_at.strftime('%Y-%m-%d') if wo.created_at else '-'
            
            data.append([
                str(i),
                wo.order_number,
                wo.title[:25] + '...' if len(wo.title) > 25 else wo.title,
                wo.work_order_type.value.replace('_', ' ').title()[:10],
                wo.status.value.replace('_', ' ').title(),
                str(wo.priority_level),
                client_name[:15] + '...' if len(client_name) > 15 else client_name,
                sla,
                created,
            ])
        
        # Create table with column widths for landscape A4
        col_widths = [1*cm, 2.5*cm, 5*cm, 3*cm, 2.5*cm, 1.5*cm, 4*cm, 2.5*cm, 2.5*cm]
        table = Table(data, colWidths=col_widths)
        
        # Style based on status
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1890ff')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (5, 0), (5, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]
        
        # Color code status column
        for i, wo in enumerate(work_orders, 1):
            if wo.status == WorkOrderStatus.COMPLETED:
                table_style.append(('TEXTCOLOR', (4, i), (4, i), colors.HexColor('#52c41a')))
            elif wo.status == WorkOrderStatus.IN_PROGRESS:
                table_style.append(('TEXTCOLOR', (4, i), (4, i), colors.HexColor('#1890ff')))
            elif wo.status == WorkOrderStatus.CANCELLED:
                table_style.append(('TEXTCOLOR', (4, i), (4, i), colors.HexColor('#ff4d4f')))
        
        table.setStyle(TableStyle(table_style))
        elements.append(table)
        
        # Build PDF
        doc.build(elements, onFirstPage=lambda c, d: cls.create_header_footer(c, d, title),
                  onLaterPages=lambda c, d: cls.create_header_footer(c, d, title))
        
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_personnel_report(cls, personnel_list: List[Personnel]) -> BytesIO:
        """Generate a PDF report listing personnel."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=landscape(A4),
            rightMargin=1.5*cm, 
            leftMargin=1.5*cm,
            topMargin=2.5*cm, 
            bottomMargin=2.5*cm
        )
        
        styles = cls.get_styles()
        elements = []
        
        # Title
        elements.append(Paragraph("Personnel Report", styles['ChineseTitle']))
        elements.append(Paragraph(f"Total: {len(personnel_list)} records", styles['ChineseNormal']))
        elements.append(Spacer(1, 15))
        
        # Table
        data = [['#', 'Employee ID', 'Name', 'Job Title', 'Department', 'Laboratory', 'Status', 'Hire Date']]
        
        for i, p in enumerate(personnel_list, 1):
            name = p.user.full_name if p.user else '-'
            lab_name = p.primary_laboratory.name if p.primary_laboratory else '-'
            hire_date = p.hire_date.strftime('%Y-%m-%d') if p.hire_date else '-'
            
            data.append([
                str(i),
                p.employee_id,
                name,
                p.job_title or '-',
                p.department or '-',
                lab_name,
                p.status.value.replace('_', ' ').title(),
                hire_date,
            ])
        
        col_widths = [1*cm, 2.5*cm, 4*cm, 3.5*cm, 3.5*cm, 4*cm, 2.5*cm, 2.5*cm]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#722ed1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        elements.append(table)
        
        # Build PDF
        doc.build(elements, onFirstPage=lambda c, d: cls.create_header_footer(c, d, "Personnel Report"),
                  onLaterPages=lambda c, d: cls.create_header_footer(c, d, "Personnel Report"))
        
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_equipment_report(cls, equipment_list: List[Equipment]) -> BytesIO:
        """Generate a PDF report listing equipment."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=landscape(A4),
            rightMargin=1.5*cm, 
            leftMargin=1.5*cm,
            topMargin=2.5*cm, 
            bottomMargin=2.5*cm
        )
        
        styles = cls.get_styles()
        elements = []
        
        # Title
        elements.append(Paragraph("Equipment Report", styles['ChineseTitle']))
        elements.append(Paragraph(f"Total: {len(equipment_list)} records", styles['ChineseNormal']))
        elements.append(Spacer(1, 15))
        
        # Table
        data = [['#', 'Code', 'Name', 'Type', 'Category', 'Laboratory', 'Status', 'Next Maintenance']]
        
        for i, eq in enumerate(equipment_list, 1):
            lab_name = eq.laboratory.name if eq.laboratory else '-'
            next_maint = eq.next_maintenance_date.strftime('%Y-%m-%d') if eq.next_maintenance_date else '-'
            category = eq.category.value if eq.category else '-'
            
            data.append([
                str(i),
                eq.code,
                eq.name[:20] + '...' if len(eq.name) > 20 else eq.name,
                eq.equipment_type.value.replace('_', ' ').title(),
                category.replace('_', ' ').title(),
                lab_name,
                eq.status.value.replace('_', ' ').title(),
                next_maint,
            ])
        
        col_widths = [1*cm, 2.5*cm, 5*cm, 3*cm, 3*cm, 4*cm, 2.5*cm, 3*cm]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#13c2c2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        elements.append(table)
        
        # Build PDF
        doc.build(elements, onFirstPage=lambda c, d: cls.create_header_footer(c, d, "Equipment Report"),
                  onLaterPages=lambda c, d: cls.create_header_footer(c, d, "Equipment Report"))
        
        buffer.seek(0)
        return buffer
