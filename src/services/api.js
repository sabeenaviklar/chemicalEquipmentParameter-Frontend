import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (username, password, email) =>
    api.post('/register/', { username, password, email }),
  
  login: (username, password) =>
    api.post('/login/', { username, password }),
};

export const datasetAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getAll: () => api.get('/datasets/'),
  
  getDetail: (id) => api.get(`/datasets/${id}/`),
  
  getSummary: (id) => api.get(`/datasets/${id}/summary/`),
  
  downloadReport: (id) => {
    return api.get(`/datasets/${id}/report/`, {
      responseType: 'blob',
    });
  },
};

export default api;