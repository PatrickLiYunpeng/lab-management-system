import api from './api';
import type {
  Skill,
  SkillFormData,
  SkillUpdateData,
  SkillFilters,
  PersonnelSkill,
  PersonnelSkillFormData,
  PersonnelSkillUpdateData,
  PaginatedResponse,
} from '../types';

export interface SkillListParams extends SkillFilters {
  page?: number;
  page_size?: number;
}

export const skillService = {
  // Skills CRUD
  async getSkills(params?: SkillListParams): Promise<PaginatedResponse<Skill>> {
    const response = await api.get<PaginatedResponse<Skill>>('/skills', { params });
    return response.data;
  },

  async getSkillById(id: number): Promise<Skill> {
    const response = await api.get<Skill>(`/skills/${id}`);
    return response.data;
  },

  async createSkill(data: SkillFormData): Promise<Skill> {
    const response = await api.post<Skill>('/skills', data);
    return response.data;
  },

  async updateSkill(id: number, data: SkillUpdateData): Promise<Skill> {
    const response = await api.put<Skill>(`/skills/${id}`, data);
    return response.data;
  },

  async deleteSkill(id: number): Promise<void> {
    await api.delete(`/skills/${id}`);
  },

  // Personnel by skill
  async getPersonnelBySkill(
    skillId: number,
    params?: { proficiency_level?: string; is_certified?: boolean }
  ): Promise<PersonnelSkill[]> {
    const response = await api.get<PersonnelSkill[]>(`/skills/${skillId}/personnel`, { params });
    return response.data;
  },

  // Personnel skills
  async getPersonnelSkills(personnelId: number): Promise<PersonnelSkill[]> {
    const response = await api.get<PersonnelSkill[]>(`/skills/personnel/${personnelId}`);
    return response.data;
  },

  async assignSkillToPersonnel(personnelId: number, data: PersonnelSkillFormData): Promise<PersonnelSkill> {
    const response = await api.post<PersonnelSkill>(`/skills/personnel/${personnelId}`, data);
    return response.data;
  },

  async updatePersonnelSkill(
    personnelId: number,
    skillId: number,
    data: PersonnelSkillUpdateData
  ): Promise<PersonnelSkill> {
    const response = await api.put<PersonnelSkill>(
      `/skills/personnel/${personnelId}/skills/${skillId}`,
      data
    );
    return response.data;
  },

  async removePersonnelSkill(personnelId: number, skillId: number): Promise<void> {
    await api.delete(`/skills/personnel/${personnelId}/skills/${skillId}`);
  },
};
