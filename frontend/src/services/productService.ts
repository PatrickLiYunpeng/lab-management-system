import api from './api';
import type {
  Product,
  ProductFormData,
  ProductUpdateData,
  ProductFilters,
  ProductConfig,
  PackageFormOption,
  PackageFormOptionFormData,
  PackageFormOptionUpdateData,
  PackageTypeOption,
  PackageTypeOptionFormData,
  PackageTypeOptionUpdateData,
  ApplicationScenario,
  ApplicationScenarioFormData,
  ApplicationScenarioUpdateData,
  ConfigOptionFilters,
  PaginatedResponse,
} from '../types';

interface GetProductsParams extends ProductFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

interface GetConfigOptionsParams extends ConfigOptionFilters {
  page?: number;
  page_size?: number;
  signal?: AbortSignal;
}

export const productService = {
  // ============================================================================
  // Product Configuration (获取所有配置选项)
  // ============================================================================
  
  async getProductConfig(): Promise<ProductConfig> {
    const response = await api.get<ProductConfig>('/products/config');
    return response.data;
  },

  // ============================================================================
  // Products (产品)
  // ============================================================================

  async getProducts(params: GetProductsParams = {}): Promise<PaginatedResponse<Product>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<Product>>('/products', { params: queryParams, signal });
    return response.data;
  },

  async getProductById(id: number): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  async createProduct(data: ProductFormData): Promise<Product> {
    const response = await api.post<Product>('/products', data);
    return response.data;
  },

  async updateProduct(id: number, data: ProductUpdateData): Promise<Product> {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  // ============================================================================
  // Package Form Options (封装形式配置)
  // ============================================================================

  async getPackageForms(params: GetConfigOptionsParams = {}): Promise<PaginatedResponse<PackageFormOption>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<PackageFormOption>>('/products/config/package-forms', { params: queryParams, signal });
    return response.data;
  },

  async createPackageForm(data: PackageFormOptionFormData): Promise<PackageFormOption> {
    const response = await api.post<PackageFormOption>('/products/config/package-forms', data);
    return response.data;
  },

  async updatePackageForm(id: number, data: PackageFormOptionUpdateData): Promise<PackageFormOption> {
    const response = await api.put<PackageFormOption>(`/products/config/package-forms/${id}`, data);
    return response.data;
  },

  async deletePackageForm(id: number): Promise<void> {
    await api.delete(`/products/config/package-forms/${id}`);
  },

  // ============================================================================
  // Package Type Options (封装产品类型配置)
  // ============================================================================

  async getPackageTypes(params: GetConfigOptionsParams = {}): Promise<PaginatedResponse<PackageTypeOption>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<PackageTypeOption>>('/products/config/package-types', { params: queryParams, signal });
    return response.data;
  },

  async createPackageType(data: PackageTypeOptionFormData): Promise<PackageTypeOption> {
    const response = await api.post<PackageTypeOption>('/products/config/package-types', data);
    return response.data;
  },

  async updatePackageType(id: number, data: PackageTypeOptionUpdateData): Promise<PackageTypeOption> {
    const response = await api.put<PackageTypeOption>(`/products/config/package-types/${id}`, data);
    return response.data;
  },

  async deletePackageType(id: number): Promise<void> {
    await api.delete(`/products/config/package-types/${id}`);
  },

  // ============================================================================
  // Application Scenarios (应用场景配置)
  // ============================================================================

  async getScenarios(params: GetConfigOptionsParams = {}): Promise<PaginatedResponse<ApplicationScenario>> {
    const { signal, ...queryParams } = params;
    const response = await api.get<PaginatedResponse<ApplicationScenario>>('/products/config/scenarios', { params: queryParams, signal });
    return response.data;
  },

  async createScenario(data: ApplicationScenarioFormData): Promise<ApplicationScenario> {
    const response = await api.post<ApplicationScenario>('/products/config/scenarios', data);
    return response.data;
  },

  async updateScenario(id: number, data: ApplicationScenarioUpdateData): Promise<ApplicationScenario> {
    const response = await api.put<ApplicationScenario>(`/products/config/scenarios/${id}`, data);
    return response.data;
  },

  async deleteScenario(id: number): Promise<void> {
    await api.delete(`/products/config/scenarios/${id}`);
  },
};
