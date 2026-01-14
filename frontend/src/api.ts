const API_BASE_URL = '/api';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    if (response.status === 204) return null;
    return response.json();
};

// Oportunidades
export const getOpportunities = (view: string) => fetchApi(`/opportunities?view=${view}`);
export const getMaxOpportunityId = () => fetchApi('/opportunities/max-id');
export const createOpportunity = (data: any) => fetchApi('/opportunities', { method: 'POST', body: JSON.stringify(data) });
export const updateOpportunity = (id: number, data: any) => fetchApi(`/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteOpportunity = (id: number) => fetchApi(`/opportunities/${id}`, { method: 'DELETE' });
export const permanentDeleteOpportunity = (id: number) => fetchApi(`/opportunities/${id}/permanent`, { method: 'DELETE' });
export const restoreOpportunity = (id: number) => fetchApi(`/opportunities/${id}/restore`, { method: 'POST' });

// Observaciones
export const getObservations = (oppId: number) => fetchApi(`/opportunities/${oppId}/observations`);
export const createObservation = (oppId: number, text: string) => fetchApi(`/opportunities/${oppId}/observations`, { method: 'POST', body: JSON.stringify({ text }) });
export const updateObservation = (id: number, text: string) => fetchApi(`/observations/${id}`, { method: 'PUT', body: JSON.stringify({ text }) });
export const deleteObservation = (id: number) => fetchApi(`/observations/${id}`, { method: 'DELETE' });

// Catálogos
export const getAccounts = () => fetchApi('/accounts');
export const getEmployees = () => fetchApi('/employees');
export const getStatuses = () => fetchApi('/statuses');
export const getOppTypes = () => fetchApi('/opp-types');
export const getJobRoles = () => fetchApi('/job-roles');

// ABMC Genérico
export const createEntity = (entity: string, data: any) => fetchApi(`/${entity}`, { method: 'POST', body: JSON.stringify(data) });
export const updateEntity = (entity: string, id: number, data: any) => fetchApi(`/${entity}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEntity = (entity: string, id: number) => fetchApi(`/${entity}/${id}`, { method: 'DELETE' });
