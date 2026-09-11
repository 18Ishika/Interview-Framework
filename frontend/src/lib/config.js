const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/tech-int';

export const API_BASE = configuredApiBase.replace(/\/(tech-int|hr-int|interview)\/?$/, '');
export const SERVER_BASE = API_BASE.replace(/\/api\/?$/, '');