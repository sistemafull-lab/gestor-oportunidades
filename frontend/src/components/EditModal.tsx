import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Plus, Calendar, Clock, Users, Info, FileText, CheckSquare, Square, Link as LinkIcon, Sparkles, Layout, AlertCircle, FileCheck, File } from 'lucide-react';
import { Opportunity, Account, Employee, OpportunityStatus, OpportunityType, Observation, Motive } from '../types/types';
import * as api from '../api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Opportunity>) => void;
    initialData?: Opportunity;
    isNew?: boolean;
    isReadOnly: boolean;
    accounts: Account[];
    teams: Employee[];
    statuses: OpportunityStatus[];
    docTypes: DocumentType[];
    oppTypes: OpportunityType[];
}

const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toISOString().split('T')[0];
    } catch { return ''; }
};

const EditModal: React.FC<Props> = ({ 
    isOpen, onClose, onSave, initialData, isNew, isReadOnly, accounts, teams, statuses, docTypes, oppTypes
}) => {
    const [formData, setFormData] = useState<Partial<Opportunity>>({});
    const [observations, setObservations] = useState<Observation[]>([]);
    const [newObs, setNewObs] = useState('');
    const [motives, setMotives] = useState<Motive[]>([]);
    const [validationMsg, setValidationMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadMotives();
            if (initialData && !isNew) {
                setFormData({
                    ...initialData,
                    start_date: formatDateForInput(initialData.start_date),
                    understanding_date: formatDateForInput(initialData.understanding_date),
                    scope_date: formatDateForInput(initialData.scope_date),
                    coe_date: formatDateForInput(initialData.coe_date),
                    delivery_date: formatDateForInput(initialData.delivery_date),
                    engagement_date: formatDateForInput(initialData.engagement_date),
                    real_delivery_date: formatDateForInput(initialData.real_delivery_date),
                });
                loadObservations(initialData.id);
            } else {
                setFormData({
                    name: '',
                    account_id: accounts[0]?.id || 0,
                    status_id: statuses.find(s => s.name.toUpperCase().includes('EVALUACIÓN'))?.id || statuses[0]?.id || 0,
                    percentage: 0,
                    color_code: 'NONE',
                    has_ia_proposal: false,
                    has_prototype: false,
                    has_rfp: false,
                    has_anteproyecto: false,
                    start_date: new Date().toISOString().split('T')[0],
                    manager_id: teams.find(t => t.role_name === 'Gerente Comercial')?.id || teams[0]?.id || 0,
                    k_red_index: 0
                });
                setObservations([]);
            }
        }
    }, [initialData, isOpen, isNew]);

    const loadMotives = async () => {
        try {
            const data = await api.fetchApi('/motives');
            setMotives(data);
        } catch (e) { console.error(e); }
    };

    const loadObservations = async (id: number) => {
        try {
            const data = await api.getObservations(id);
            setObservations(data);
        } catch (e) { console.error(e); }
    };

    const handleAddObs = async () => {
        if (!newObs || !initialData || isReadOnly) return;
        await api.createObservation(initialData.id, newObs);
        setNewObs('');
        loadObservations(initialData.id);
    };

    const validateSemaforo = (percent: number, color: string): boolean => {
        if (color === 'RED' && percent !== 0) return false;
        if (percent === 0 && color !== 'RED' && color !== 'NONE') return false;
        if (color === 'YELLOW' && (percent < 50 || percent > 69)) return false;
        if (color === 'GREEN' && (percent < 70 || percent > 100)) return false;
        if (color === 'NONE' && percent > 49) return false;
        return true;
    };

    const getRangeSuggestion = (color: string): string => {
        switch (color) {
            case 'RED': return 'Debe ser 0%';
            case 'YELLOW': return 'Rango sugerido: 50% - 69%';
            case 'GREEN': return 'Rango sugerido: 70% - 100%';
            case 'NONE': return 'Rango sugerido: 0% - 49%';
            default: return '';
        }
    };

    const isFormValid = formData.name && 
                        formData.account_id && 
                        formData.status_id && 
                        formData.manager_id && 
                        validateSemaforo(formData.percentage || 0, formData.color_code || 'NONE');

    const handleSave = () => {
        if (!formData.name) return setValidationMsg("Nombre de Oportunidad obligatorio");
        if (!formData.account_id) return setValidationMsg("Cuenta obligatoria");
        if (!formData.status_id) return setValidationMsg("Estado obligatorio");
        if (!formData.manager_id) return setValidationMsg("Gerente obligatorio");
        
        const percentageNum = parseFloat(String(formData.percentage || '0').replace(',', '.'));
        if (!validateSemaforo(percentageNum, formData.color_code || 'NONE')) {
            return setValidationMsg("La combinación de Porcentaje y Semáforo no es válida según las reglas de negocio.");
        }

        // Helper to safely parse numbers that might be strings with commas, null, or undefined
        const safeParseNumber = (value: any): number | null => {
            if (value === null || value === undefined || value === '') {
                return null; // Return null for empty/missing values
            }
            const stringValue = String(value).replace(',', '.');
            const number = parseFloat(stringValue);
            return isNaN(number) ? null : number;
        };

        const dataToSave: Partial<Opportunity> = {
            ...formData,
            // Ensure boolean fields are always true or false
            has_ia_proposal: !!formData.has_ia_proposal,
            has_prototype: !!formData.has_prototype,
            has_rfp: !!formData.has_rfp,
            has_anteproyecto: !!formData.has_anteproyecto,
            
            // Ensure numeric fields are correctly parsed, providing defaults for non-nullable ones
            percentage: safeParseNumber(formData.percentage) ?? 0,
            k_red_index: safeParseNumber(formData.k_red_index) ?? 0,
            estimated_hours: safeParseNumber(formData.estimated_hours),
            estimated_term_months: safeParseNumber(formData.estimated_term_months),
        };

        onSave(dataToSave);
    };
                    
    const handleInputChange = (field: keyof Opportunity, value: any) => {
        let newData = { ...formData, [field]: value };

        // Lógica especial para semáforo:
        if (field === 'color_code') {
            if (value === 'RED') {
                newData.percentage = 0;
            } else {
                // Si el porcentaje actual no es válido para el nuevo color, lo limpiamos (o ponemos null/0)
                // para obligar al usuario a ingresarlo.
                if (!validateSemaforo(formData.percentage || 0, value)) {
                    newData.percentage = undefined; // Lo dejamos "vacío"
                }
            }
        }

        setFormData(newData);
        setValidationMsg(null);
    };

    if (!isOpen) return null;

    const inputClasses = "bg-[#3f4b5b] border-none text-white text-[13px] rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 w-full placeholder:text-gray-400 disabled:opacity-50";
    const labelStyle = "text-gray-500 font-bold text-[11px] uppercase tracking-wider mb-1 block";
    const sectionTitleStyle = "text-[#333] font-bold text-[15px] mb-4 border-b pb-2";

    const filteredManagers = teams.filter(t => t.role_name === 'Gerente Comercial' && t.is_active);
    const filteredAprobadores = teams.filter(t => t.role_name === 'Aprobador' && t.is_active);
    const filteredNeg = teams.filter(t => t.role_name === 'Analista de negocios' && t.is_active);
    const filteredTec = teams.filter(t => t.role_name === 'Responsable técnico' && t.is_active);

    const semaforoInvalid = !validateSemaforo(formData.percentage || 0, formData.color_code || 'NONE');
    const percentageEmpty = formData.percentage === undefined || formData.percentage === null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-gray-800">
                <header className="flex justify-between items-center px-6 py-3 border-b bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-xl shadow-lg text-white">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">
                                {initialData && !isNew ? `EDITAR OPORTUNIDAD #${initialData.id}` : 'NUEVA OPORTUNIDAD'}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Gestión de Pipeline Comercial</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors">
                        <X size={28} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                    {validationMsg && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3 text-red-700 text-sm font-bold">
                            <AlertCircle size={20}/>
                            {validationMsg}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* COL 1 */}
                        <section>
                            <h3 className={sectionTitleStyle}><Info size={14} className="inline mr-2"/> Datos Generales</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelStyle}>Cuenta / Cliente</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.account_id || ''} onChange={e => handleInputChange('account_id', parseInt(e.target.value))}>
                                        <option value="">Seleccione Cuenta</option>
                                        {accounts.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyle}>Nombre de la Oportunidad</label>
                                    <input readOnly={isReadOnly} type="text" className={inputClasses} value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className={labelStyle}>Tipo Oportunidad</label>
                                        <select disabled={isReadOnly} className={inputClasses} value={formData.opportunity_type_id || ''} onChange={e => handleInputChange('opportunity_type_id', parseInt(e.target.value))}>
                                            <option value="">-</option>
                                            {oppTypes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-blue-50/50 rounded-2xl p-6 space-y-4 border border-blue-100/50">
                                    <button disabled={isReadOnly} onClick={() => handleInputChange('has_ia_proposal', !formData.has_ia_proposal)} className="flex items-center gap-4 w-full text-left">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${formData.has_ia_proposal ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            {formData.has_ia_proposal && <Plus size={14} strokeWidth={4}/>}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                                            <Sparkles size={14} className="text-purple-500"/> Propuesta con IA
                                        </span>
                                    </button>
                                    <button disabled={isReadOnly} onClick={() => handleInputChange('has_prototype', !formData.has_prototype)} className="flex items-center gap-4 w-full text-left">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${formData.has_prototype ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            {formData.has_prototype && <Plus size={14} strokeWidth={4}/>}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                                            <Layout size={14} className="text-blue-500"/> Incluye Prototipo
                                        </span>
                                    </button>
                                    <button disabled={isReadOnly} onClick={() => handleInputChange('has_rfp', !formData.has_rfp)} className="flex items-center gap-4 w-full text-left">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${formData.has_rfp ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            {formData.has_rfp && <Plus size={14} strokeWidth={4}/>}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                                            <FileCheck size={14} className="text-pink-500"/> Incluye RFP
                                        </span>
                                    </button>
                                    <button disabled={isReadOnly} onClick={() => handleInputChange('has_anteproyecto', !formData.has_anteproyecto)} className="flex items-center gap-4 w-full text-left">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${formData.has_anteproyecto ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            {formData.has_anteproyecto && <Plus size={14} strokeWidth={4}/>}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                                            <File size={14} className="text-indigo-500"/> Incluye Anteproyecto
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* COL 2 */}
                        <section>
                            <h3 className={sectionTitleStyle}><Users size={14} className="inline mr-2"/> Pipeline y Responsables</h3>
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className={(semaforoInvalid || percentageEmpty) ? "ring-2 ring-red-500 rounded-lg p-1" : ""}>
                                    <label className={labelStyle}>Probabilidad (%)</label>
                                    <input 
                                        readOnly={isReadOnly} 
                                        type="number" 
                                        className={`${inputClasses} text-center font-bold`} 
                                        value={formData.percentage ?? ''} 
                                        onChange={e => handleInputChange('percentage', e.target.value === '' ? undefined : parseInt(e.target.value))} 
                                        placeholder="Ingresar %"
                                    />
                                    <p className="text-[9px] mt-1 text-blue-500 font-bold italic">{getRangeSuggestion(formData.color_code || 'NONE')}</p>
                                </div>
                                <div className={semaforoInvalid ? "ring-2 ring-red-500 rounded-lg p-1" : ""}>
                                    <label className={labelStyle}>Semáforo</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.color_code || 'NONE'} onChange={e => handleInputChange('color_code', e.target.value)}>
                                        <option value="GREEN">Verde (Óptimo)</option>
                                        <option value="YELLOW">Amarillo (Alerta)</option>
                                        <option value="RED">Rojo (Crítico)</option>
                                        <option value="NONE">Sin definir</option>
                                    </select>
                                </div>
                            </div>
                            {(semaforoInvalid || percentageEmpty) && (
                                <p className="text-[10px] text-red-600 font-bold uppercase mb-4 italic text-center">
                                    {percentageEmpty ? "Debe ingresar un porcentaje" : "Combinación inválida"}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-4 mb-6 mt-4">
                                <div>
                                    <label className={labelStyle}>Estado Actual</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.status_id || ''} onChange={e => handleInputChange('status_id', parseInt(e.target.value))}>
                                        <option value="">Seleccione Estado</option>
                                        {statuses.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyle}>K-Rojo</label>
                                    <input readOnly={isReadOnly} type="number" className={inputClasses} value={formData.k_red_index || 0} onChange={e => handleInputChange('k_red_index', parseInt(e.target.value))} />
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className={labelStyle}>Motivo / Razón</label>
                                <select disabled={isReadOnly} className={inputClasses} value={formData.motive_id || ''} onChange={e => handleInputChange('motive_id', parseInt(e.target.value))}>
                                    <option value="">Seleccione Motivo</option>
                                    {motives.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4 pt-6 border-t border-dashed">
                                <div>
                                    <label className={labelStyle}>Gerente Comercial</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.manager_id || ''} onChange={e => handleInputChange('manager_id', parseInt(e.target.value))}>
                                        <option value="">Seleccione Gte</option>
                                        {filteredManagers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyle}>Responsable Aprobador</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.responsible_dc_id || ''} onChange={e => handleInputChange('responsible_dc_id', parseInt(e.target.value))}>
                                        <option value="">Seleccione Aprobador</option>
                                        {filteredAprobadores.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyle}>Responsable Negocio</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.responsible_business_id || ''} onChange={e => handleInputChange('responsible_business_id', parseInt(e.target.value))}>
                                        <option value="">Seleccione Responsable</option>
                                        {filteredNeg.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyle}>Responsable Técnico</label>
                                    <select disabled={isReadOnly} className={inputClasses} value={formData.responsible_tech_id || ''} onChange={e => handleInputChange('responsible_tech_id', parseInt(e.target.value))}>
                                        <option value="">Seleccione Responsable</option>
                                        {filteredTec.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* COL 3 */}
                        <section>
                            <h3 className={sectionTitleStyle}><Calendar size={14} className="inline mr-2"/> Cronograma y KPIS</h3>
                            <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 mb-8">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">Fechas del Proceso</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div><label className={labelStyle}>F. Inicio</label><input readOnly={isReadOnly} type="date" className={inputClasses} value={formData.start_date || ''} onChange={e => handleInputChange('start_date', e.target.value)} /></div>
                                    <div><label className={labelStyle}>F. Entendim.</label><input readOnly={isReadOnly} type="date" className={inputClasses} value={formData.understanding_date || ''} onChange={e => handleInputChange('understanding_date', e.target.value)} /></div>
                                    <div><label className={labelStyle}>F. Alcance</label><input readOnly={isReadOnly} type="date" className={inputClasses} value={formData.scope_date || ''} onChange={e => handleInputChange('scope_date', e.target.value)} /></div>
                                    <div><label className={labelStyle}>F. COE</label><input readOnly={isReadOnly} type="date" className={inputClasses} value={formData.coe_date || ''} onChange={e => handleInputChange('coe_date', e.target.value)} /></div>
                                    <div><label className={labelStyle}>F. Compromiso</label><input readOnly={isReadOnly} type="date" className={inputClasses} value={formData.delivery_date || ''} onChange={e => handleInputChange('delivery_date', e.target.value)} /></div>
                                    <div><label className={`${labelStyle} text-green-600`}>F. Entrega Real</label><input readOnly={isReadOnly} type="date" className={`${inputClasses} !bg-white !text-gray-800 border border-green-200`} value={formData.real_delivery_date || ''} onChange={e => handleInputChange('real_delivery_date', e.target.value)} /></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Dimensionamiento</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelStyle}>Horas Estimadas</label><input readOnly={isReadOnly} type="number" className={inputClasses} value={formData.estimated_hours || ''} onChange={e => handleInputChange('estimated_hours', parseInt(e.target.value))} /></div>
                                    <div><label className={labelStyle}>Plazo (Meses)</label><input readOnly={isReadOnly} type="number" className={inputClasses} value={formData.estimated_term_months || ''} onChange={e => handleInputChange('estimated_term_months', parseInt(e.target.value))} /></div>
                                </div>
                                <div><label className={labelStyle}>Enlace Plan de Trabajo</label><input readOnly={isReadOnly} type="text" className={inputClasses} placeholder="https://..." value={formData.work_plan_link || ''} onChange={e => handleInputChange('work_plan_link', e.target.value)} /></div>
                            </div>
                        </section>
                    </div>

                    {/* OBSERVATIONS */}
                    <div className="mt-12 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <MessageSquare className="text-blue-600" size={20}/>
                            <h3 className="text-gray-800 font-black uppercase tracking-widest text-sm">Historial de Observaciones</h3>
                        </div>
                        {!isReadOnly && (
                            <div className="flex gap-4 mb-8">
                                <input type="text" className="flex-1 border border-gray-200 rounded-xl px-6 py-4 text-sm" placeholder="Nueva observación..." value={newObs} onChange={e => setNewObs(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddObs()} />
                                <button onClick={handleAddObs} className="bg-[#d1d5db] hover:bg-[#c2c6cc] text-[#6b7280] px-8 py-4 rounded-xl font-black text-xs uppercase transition-colors">Agregar</button>
                            </div>
                        )}
                        <div className="space-y-3">
                            {observations.map(obs => (
                                <div key={obs.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                    <div className="text-blue-600 font-bold text-[10px] uppercase mb-2">{new Date(obs.created_at).toLocaleString()}</div>
                                    <p className="text-gray-700 text-sm leading-relaxed">{obs.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="p-6 border-t bg-white flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-gray-500 uppercase hover:text-gray-700 transition-colors">Cerrar</button>
                    {!isReadOnly && (
                        <button 
                            onClick={handleSave} 
                            className={`px-12 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all transform active:scale-95 ${isFormValid ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            disabled={!isFormValid}
                        >
                            {initialData && !isNew ? 'Guardar Cambios' : 'Crear Oportunidad'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default EditModal;