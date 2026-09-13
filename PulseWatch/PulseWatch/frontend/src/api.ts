import axios from 'axios';
import type { Endpoint, Incident, Notification, Stats } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

export const getEndpoints    = () => api.get<Endpoint[]>('/endpoints').then(r => r.data);
export const getEndpoint     = (id: string) => api.get<Endpoint>(`/endpoints/${id}`).then(r => r.data);
export const createEndpoint  = (data: Partial<Endpoint>) => api.post<Endpoint>('/endpoints', data).then(r => r.data);
export const updateEndpoint  = (id: string, data: Partial<Endpoint>) => api.put<Endpoint>(`/endpoints/${id}`, data).then(r => r.data);
export const deleteEndpoint  = (id: string) => api.delete(`/endpoints/${id}`).then(r => r.data);
export const checkNow        = (id: string) => api.post<Endpoint>(`/endpoints/${id}/check`).then(r => r.data);

export const getIncidents    = () => api.get<Incident[]>('/incidents').then(r => r.data);
export const getNotifications = () => api.get<Notification[]>('/notifications').then(r => r.data);
export const markAllRead     = () => api.post('/notifications/read-all').then(r => r.data);
export const getStats        = () => api.get<Stats>('/stats').then(r => r.data);
