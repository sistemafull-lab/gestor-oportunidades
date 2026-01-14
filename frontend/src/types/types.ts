export interface Opportunity {
    id: number;
    name: string;
    account_id: number;
    account_name?: string;
    status_id: number;
    status_name?: string;
    opportunity_type_id?: number;
    opportunity_type_name?: string;
    
    // Responsables
    manager_id: number;
    manager_name?: string;
    responsible_dc_id?: number;
    dc_name?: string;
    responsible_business_id?: number;
    neg_name?: string;
    responsible_tech_id?: number;
    tec_name?: string;

    // Semáforo y Reglas de Negocio
    percentage: number; 
    color_code: string;
    has_ia_proposal: boolean;
    has_prototype: boolean;
    has_rfp: boolean;
    has_anteproyecto: boolean;
    reason_motive?: string;
    motive_id?: number;
    motive_name?: string;
    k_red_index?: number;
    
    // Cronograma
    start_date: string;
    understanding_date?: string;
    scope_date?: string;
    coe_date?: string;
    delivery_date?: string;      // Fecha-Entrega
    engagement_date?: string;    // Entregar al Gerente Comercial
    real_delivery_date?: string; 
    
    // Métricas de Esfuerzo e Integración
    estimated_hours?: number;
    estimated_term_months?: number; // Puede ser decimal en frontend
    work_plan_link?: string;
    order_index?: number;

    // Estados de Persistencia
    is_archived: boolean;
    deleted_at?: string;
    updated_at?: string;
    
    // UI Helpers
    last_observation?: string;
}

export interface Observation {
    id: number;
    opportunity_id: number;
    text: string;
    created_at: string;
    updated_at: string;
}

export interface Account {
    id: number;
    name: string;
    contact_name?: string;
    contact_email?: string;
    is_active: boolean;
}

export interface Employee {
    id: number;
    full_name: string;
    role_id: number;
    role_name?: string; // Optional but useful
    is_active: boolean;
}

export interface OpportunityStatus {
    id: number;
    name: string;
}

export interface OpportunityType {
    id: number;
    name: string;
}

export interface JobRole {
    id: number;
    name: string;
}

export interface Motive {
    id: number;
    name: string;
}
