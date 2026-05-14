import { Field, FieldCreateRequest } from '../types/Field'
import { api } from './api'

export const fieldService = {
  async getAllFields(): Promise<Field[]> {
    const response = await api.get<Field[]>('/fields')
    return response.data
  },

  async getFieldById(id: number): Promise<Field> {
    const response = await api.get<Field>(`/fields/${id}`)
    return response.data
  },

  async createField(field: FieldCreateRequest): Promise<Field> {
    const response = await api.post<Field>('/fields', field)
    return response.data
  },

  async updateField(id: number, field: FieldCreateRequest): Promise<Field> {
    const response = await api.put<Field>(`/fields/${id}`, field)
    return response.data
  },

  async deleteField(id: number): Promise<void> {
    await api.delete(`/fields/${id}`)
  },
}
