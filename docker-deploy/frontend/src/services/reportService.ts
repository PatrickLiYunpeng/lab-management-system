import api from './api';

export interface WorkOrderPdfParams {
  laboratory_id?: number;
  work_order_type?: string;
  status?: string;
  client_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface PersonnelPdfParams {
  laboratory_id?: number;
  site_id?: number;
  status?: string;
}

export interface EquipmentPdfParams {
  laboratory_id?: number;
  site_id?: number;
  status?: string;
  category?: string;
}

/**
 * Helper function to download a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const reportService = {
  /**
   * Export work orders list as PDF
   */
  async exportWorkOrdersPdf(params: WorkOrderPdfParams = {}): Promise<void> {
    const response = await api.get('/reports/work-orders/pdf', {
      params,
      responseType: 'blob',
    });
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `work_orders_report_${new Date().toISOString().split('T')[0]}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.+)/);
      if (match) filename = match[1];
    }
    
    downloadBlob(response.data, filename);
  },

  /**
   * Export single work order detail as PDF
   */
  async exportWorkOrderDetailPdf(workOrderId: number): Promise<void> {
    const response = await api.get(`/reports/work-orders/${workOrderId}/pdf`, {
      responseType: 'blob',
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `work_order_${workOrderId}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.+)/);
      if (match) filename = match[1];
    }
    
    downloadBlob(response.data, filename);
  },

  /**
   * Export personnel list as PDF
   */
  async exportPersonnelPdf(params: PersonnelPdfParams = {}): Promise<void> {
    const response = await api.get('/reports/personnel/pdf', {
      params,
      responseType: 'blob',
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `personnel_report_${new Date().toISOString().split('T')[0]}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.+)/);
      if (match) filename = match[1];
    }
    
    downloadBlob(response.data, filename);
  },

  /**
   * Export equipment list as PDF
   */
  async exportEquipmentPdf(params: EquipmentPdfParams = {}): Promise<void> {
    const response = await api.get('/reports/equipment/pdf', {
      params,
      responseType: 'blob',
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `equipment_report_${new Date().toISOString().split('T')[0]}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.+)/);
      if (match) filename = match[1];
    }
    
    downloadBlob(response.data, filename);
  },
};
