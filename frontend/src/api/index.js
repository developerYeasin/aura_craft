import client from './client.js';

export const categoryApi = {
  list: (params) => client.get('/categories', { params }),
  listAll: () => client.get('/categories/all'),
  get: (key) => client.get(`/categories/${key}`),
  create: (body) => client.post('/categories', body),
  update: (id, body) => client.put(`/categories/${id}`, body),
  remove: (id) => client.delete(`/categories/${id}`),
};

export const productApi = {
  list: (params) => client.get('/products', { params }),
  listAll: (params) => client.get('/products/admin/all', { params }),
  homeFeed: (perCategory = 6) => client.get('/products/home-feed', { params: { perCategory } }),
  facets: (params) => client.get('/products/facets', { params }),
  get: (key) => client.get(`/products/${key}`),
  create: (body) => client.post('/products', body),
  update: (id, body) => client.put(`/products/${id}`, body),
  remove: (id) => client.delete(`/products/${id}`),
};

export const orderApi = {
  place: (body) => client.post('/orders', body),
  track: (code) => client.get(`/orders/track/${code}`),
  list: (params) => client.get('/orders', { params }),
  get: (id) => client.get(`/orders/${id}`),
  setStatus: (id, status) => client.patch(`/orders/${id}/status`, { status }),
  remove: (id) => client.delete(`/orders/${id}`),
};

export const teamApi = {
  list: () => client.get('/team'),
  listAll: () => client.get('/team/all'),
  create: (body) => client.post('/team', body),
  update: (id, body) => client.put(`/team/${id}`, body),
  remove: (id) => client.delete(`/team/${id}`),
};

export const authApi = {
  login: (body) => client.post('/auth/login', body),
  me: () => client.get('/auth/me'),
  changePassword: (body) => client.post('/auth/change-password', body),
  users: () => client.get('/auth/users'),
  createUser: (body) => client.post('/auth/users', body),
  toggleUser: (id) => client.patch(`/auth/users/${id}/toggle`),
  removeUser: (id) => client.delete(`/auth/users/${id}`),
};

export const dashboardApi = {
  stats: () => client.get('/dashboard/stats'),
};

export const settingApi = {
  get: () => client.get('/settings'),
  save: (body) => client.put('/settings', body),
};

export const notificationApi = {
  list: (params) => client.get('/notifications', { params }),
  markRead: (id) => client.patch(`/notifications/${id}/read`),
  markAllRead: () => client.post('/notifications/read-all'),
  clear: () => client.delete('/notifications'),
  vapidKey: () => client.get('/notifications/vapid-key'),
  subscribe: (subscription) => client.post('/notifications/subscribe', subscription),
  unsubscribe: (endpoint) => client.post('/notifications/unsubscribe', { endpoint }),
  test: () => client.post('/notifications/test'),
};

export const uploadApi = {
  image: (file) => {
    const form = new FormData();
    form.append('image', file);
    return client.post('/uploads/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
