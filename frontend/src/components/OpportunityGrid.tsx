import React, { useState, useMemo } from 'react';
import { Opportunity, Account, Employee, OpportunityStatus, OpportunityType, Motive } from '../types/types';
import { Edit2, Archive, Trash2, RotateCcw, Clock, Calendar, Link, Search, Cpu, Smartphone, FileCheck, File, FilterX, XCircle } from 'lucide-react';
import * as api from '../api';

interface Props {
    data: Opportunity[];
    onOpenDetail: (opp: Opportunity) => void;
    onArchive: (opp: Opportunity) => void;
    onUnarchive: (opp: Opportunity) => void;
    onRestore: (opp: Opportunity) => void;
    onDelete: (id: number) => void;
    onUpdate: () => void;
    isHistoryView: boolean;
    isTrashView: boolean;
    accounts: Account[];
    employees: Employee[];
    statuses: OpportunityStatus[];
    docTypes: DocumentType[];
    oppTypes: OpportunityType[];
    motives: Motive[];
    // NUEVO: Recibimos el buscador desde el padre
    searchElement?: React.ReactNode;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch { return ''; }
};

// Función para calcular días hábiles (lunes a viernes) entre dos fechas
const getBusinessDays = (d1?: string, d2?: string) => {
    if (!d1 || !d2) return '-';
    
    let startDate = new Date(d1);
    let endDate = new Date(d2);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '-';
    if (startDate > endDate) return '-';

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    let businessDays = 0;
    let curDate = new Date(startDate.getTime());
    while (curDate < endDate) {
        curDate.setDate(curDate.getDate() + 1);
        const day = curDate.getDay();
        if (day !== 0 && day !== 6) {
            businessDays++;
        }
    }
    return businessDays;
}

const OpportunityGrid: React.FC<Props> = ({ 
    data, onOpenDetail, onArchive, onUnarchive, onRestore, onDelete, onUpdate, 
    isHistoryView, isTrashView, accounts, employees, statuses, motives, searchElement
}) => {
    
    const isReadOnlyView = isHistoryView || isTrashView;
    const [focusedDate, setFocusedDate] = useState<string | null>(null);

    // --- ESTADO INTERNO PARA FILTROS (Agregado) ---
    const [filters, setFilters] = useState({
        accountId: '',
        statusId: '',
        managerId: '',
        approverId: '',
        businessId: ''
    });

    const hasActiveFilters = Object.values(filters).some(val => val !== '');

    // --- LÓGICA DE FILTRADO (Cascada) ---
    const getFilteredSubset = (sourceData: Opportunity[], ignoreField: string | null) => {
        return sourceData.filter(opp => {
            if (filters.accountId && ignoreField !== 'accountId' && opp.account_id !== parseInt(filters.accountId)) return false;
            if (filters.statusId && ignoreField !== 'statusId' && opp.status_id !== parseInt(filters.statusId)) return false;
            if (filters.managerId && ignoreField !== 'managerId' && opp.manager_id !== parseInt(filters.managerId)) return false;
            if (filters.approverId && ignoreField !== 'approverId' && opp.responsible_dc_id !== parseInt(filters.approverId)) return false;
            if (filters.businessId && ignoreField !== 'businessId' && opp.responsible_business_id !== parseInt(filters.businessId)) return false;
            return true;
        });
    };

    // 1. Datos finales que se mostrarán en la tabla
    const filteredData = useMemo(() => getFilteredSubset(data, null), [data, filters]);

    // 2. Opciones disponibles para los dropdowns (calculadas dinámicamente)
    const activeAccountIds = useMemo(() => new Set(getFilteredSubset(data, 'accountId').map(o => o.account_id)), [data, filters]);
    const activeStatusIds = useMemo(() => new Set(getFilteredSubset(data, 'statusId').map(o => o.status_id)), [data, filters]);
    const activeManagerIds = useMemo(() => new Set(getFilteredSubset(data, 'managerId').map(o => o.manager_id)), [data, filters]);
    const activeApproverIds = useMemo(() => new Set(getFilteredSubset(data, 'approverId').map(o => o.responsible_dc_id).filter(Boolean)), [data, filters]);
    const activeBusinessIds = useMemo(() => new Set(getFilteredSubset(data, 'businessId').map(o => o.responsible_business_id).filter(Boolean)), [data, filters]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({ accountId: '', statusId: '', managerId: '', approverId: '', businessId: '' });
    };

    const handleSaveField = async (oppId: number, field: keyof Opportunity, value: any) => {
        if (isReadOnlyView) return;
        try {
            let cleanedValue = value;
            if (value === "" || value === undefined) cleanedValue = null;
            if (typeof value === 'number' && isNaN(value)) cleanedValue = null;

            await api.updateOpportunity(oppId, { [field]: cleanedValue });
            onUpdate();
        } catch (e) { 
            console.error('Error updating field:', e);
        }
    };

    const validateSemaforo = (percent: number, color: string): boolean => {
        switch (color) {
            case 'RED':
                return percent === 0;
            case 'YELLOW':
                return percent >= 0 && percent <= 69;
            case 'NONE':
                return percent >= 0 && percent <= 69;
            case 'GREEN':
                return percent >= 70 && percent <= 100;
            default:
                return false;
        }
    };
    
    const getRangeSuggestion = (color: string): string => {
        switch (color) {
            case 'RED': return 'Debe ser 0%';
            case 'YELLOW': return 'Rango: 0% - 69%';
            case 'GREEN': return 'Rango: 70% - 100%';
            case 'NONE': return 'Rango: 0% - 69%';
            default: return '';
        }
    };
    
    const handleSavePercentage = async (oppId: number, percent: number, color: string) => {
        if (isReadOnlyView) return;
        
        if (!validateSemaforo(percent, color)) {
            alert(`Error de regla - Combinación inválida:\n- Rojo: 0%\n- Amarillo: 0% - 69%\n- Sin color: 0% - 69%\n- Verde: 70% - 100%`);
            return;
        }
    
        try {
            await api.updateOpportunity(oppId, { percentage: percent, color_code: color });
            onUpdate();
        } catch (e) { console.error(e); }
    };

    const handleColorChange = async (oppId: number, newColor: string, currentPercent: number) => {
        if (isReadOnlyView) return;
    
        if (newColor === 'RED') {
            try {
                await api.updateOpportunity(oppId, { percentage: 0, color_code: newColor });
                onUpdate();
                return;
            } catch (e) { console.error(e); return; }
        }
    
        // Si el nuevo color es Amarillo, siempre pedir el porcentaje.
        if (newColor === 'YELLOW') {
            const range = getRangeSuggestion(newColor);
            let newPercentStr = prompt(`Ingrese el porcentaje para el color Amarillo.\n${range}.`);
            
            if (newPercentStr === null) return; // User cancelled
            
            const newPercent = parseInt(newPercentStr);
            
            if (isNaN(newPercent) || !validateSemaforo(newPercent, newColor)) {
                alert("Porcentaje inválido o fuera de rango. No se guardaron los cambios.");
                return;
            }
    
            try {
                await api.updateOpportunity(oppId, { percentage: newPercent, color_code: newColor });
                onUpdate();
            } catch (e) { console.error(e); }
            return; // Termina la ejecución aquí para no pasar a la lógica de abajo
        }
    
        // Lógica para otros colores (Verde, Sin color)
        if (!validateSemaforo(currentPercent, newColor)) {
            const range = getRangeSuggestion(newColor);
            let newPercentStr = prompt(`El porcentaje actual (${currentPercent}%) no es válido para el color ${newColor}.\n${range}.\n\nIngrese el nuevo porcentaje:`);
            
            if (newPercentStr === null) return;
            
            const newPercent = parseInt(newPercentStr);
            
            if (isNaN(newPercent) || !validateSemaforo(newPercent, newColor)) {
                alert("Porcentaje inválido o fuera de rango. No se guardaron los cambios.");
                return;
            }
    
            try {
                await api.updateOpportunity(oppId, { percentage: newPercent, color_code: newColor });
                onUpdate();
            } catch (e) { console.error(e); }
        } else {
            // Si el porcentaje actual es válido, solo se cambia el color
            handleSavePercentage(oppId, currentPercent, newColor);
        }
    };
    

    const handleObservationUpdate = async (oppId: number, text: string, oldText?: string) => {
        if (isReadOnlyView || text === oldText) return;
        try {
            await api.createObservation(oppId, text);
            onUpdate();
        } catch (e) { console.error(e); }
    }

    const getSemaforoStyle = (colorCode: string) => {
        switch (colorCode) {
            case 'GREEN': return 'bg-[#22c55e] text-black';
            case 'YELLOW': return 'bg-[#facc15] text-black';
            case 'RED': return 'bg-[#ef4444] text-white';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    const getStatusStyle = (statusName?: string) => {
        const name = (statusName || '').toUpperCase();
        if (name.includes('PROGRESO') || name.includes('ELABORACIÓN') || name.includes('EVALUACIÓN')) {
            return "bg-blue-100 text-blue-700 border-blue-200";
        }
        if (name.includes('GANADA')) {
            return "bg-green-100 text-green-700 border-green-200";
        }
        if (name.includes('PERDIDA') || name.includes('DESESTIMADA')) {
            return "bg-red-100 text-red-700 border-red-200";
        }
        if (name.includes('ESPERANDO') || name.includes('STAND-BY')) {
            return "bg-yellow-100 text-yellow-700 border-yellow-200";
        }
        return "bg-gray-100 text-gray-700 border-gray-200";
    };

    // Estilos (Originales + Nuevos para filtros)
    const headerClass = "px-2 py-3 text-center text-[10px] font-black text-gray-800 uppercase tracking-wider border-b border-r border-gray-300 bg-gray-100 sticky top-0 z-10";
    const cellClass = "px-2 py-3 border-b border-r border-gray-300 align-middle text-gray-900 font-medium";
    const inlineInput = "w-full bg-transparent hover:bg-gray-100/50 px-1 py-0.5 rounded cursor-pointer border-none font-inherit text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all";
    const inlineDate = "bg-transparent border-none text-[10px] font-bold p-0 cursor-pointer hover:bg-gray-100 rounded px-1 w-full text-gray-800";
    const actionBtnClass = "flex items-center gap-1.5 px-2 py-1 rounded transition-all text-[9px] font-bold uppercase tracking-tight w-full";
    // Nuevo estilo para select de filtros
    const filterSelectClass = "text-[11px] h-8 border border-gray-200 rounded-lg px-2 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-medium text-gray-700 min-w-[120px]";

    // Listas filtradas para los selects de edición (Lógica original)
    const filteredDC = employees.filter(e => e.role_name === 'Aprobador' && e.is_active).sort((a, b) => a.full_name.localeCompare(b.full_name));
    const filteredNeg = employees.filter(e => e.role_name === 'Analista de negocios' && e.is_active).sort((a, b) => a.full_name.localeCompare(b.full_name));
    const filteredTec = employees.filter(e => e.role_name === 'Responsable técnico' && e.is_active).sort((a, b) => a.full_name.localeCompare(b.full_name));
    const filteredManagers = employees.filter(e => e.role_name === 'Gerente Comercial' && e.is_active).sort((a, b) => a.full_name.localeCompare(b.full_name));

    const renderDateInput = (oppId: number, field: keyof Opportunity, value?: string, colorClass: string = "text-gray-800") => {
        const id = `${oppId}-${field}`;
        const isFocused = focusedDate === id;
        const hasValue = !!value;

        return (
            <input 
                type={(isFocused || hasValue) ? "date" : "text"}
                className={`${inlineDate} ${colorClass}`}
                value={hasValue ? formatDate(value) : ''}
                onFocus={() => setFocusedDate(id)}
                onBlur={() => setFocusedDate(null)}
                onChange={e => handleSaveField(oppId, field, e.target.value)}
                disabled={isReadOnlyView}
                placeholder={isFocused ? "dd/mm/aaaa" : ""}
            />
        );
    }

    const handleOpenLink = (link?: string) => {
        if (!link) return;
        const url = link.startsWith('http') ? link : `https://${link}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className="flex flex-col gap-2">
            
            {/* --- NUEVA BARRA DE HERRAMIENTAS (Buscador + Filtros) --- */}
            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4 pb-2">
                
                {/* ZONA IZQUIERDA: Buscador (Inyectado desde App.tsx) */}
                <div className="w-full md:w-1/3 min-w-[300px]">
                    {searchElement}
                </div>

                {/* ZONA DERECHA: Filtros alineados */}
                <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                    
                    {/* Select de Cuenta */}
                    <div className="flex flex-col">
                        <select className={filterSelectClass} value={filters.accountId} onChange={(e) => handleFilterChange('accountId', e.target.value)} title="Cuenta">
                            <option value="">Todas las cuentas</option>
                            {accounts.map(a => {
                                // Mostrar opción solo si existe en los datos filtrados O si está seleccionada
                                if (!activeAccountIds.has(a.id) && filters.accountId !== a.id.toString()) return null;
                                return <option key={a.id} value={a.id}>{a.name}</option>
                            })}
                        </select>
                    </div>

                    {/* Select de Estado */}
                    <div className="flex flex-col">
                        <select className={filterSelectClass} value={filters.statusId} onChange={(e) => handleFilterChange('statusId', e.target.value)} title="Estado">
                            <option value="">Todos los estados</option>
                            {statuses.map(s => {
                                if (!activeStatusIds.has(s.id) && filters.statusId !== s.id.toString()) return null;
                                return <option key={s.id} value={s.id}>{s.name}</option>
                            })}
                        </select>
                    </div>

                    {/* Select de Gerente */}
                    <div className="flex flex-col">
                        <select className={`${filterSelectClass} !min-w-[100px]`} value={filters.managerId} onChange={(e) => handleFilterChange('managerId', e.target.value)} title="Gerente">
                            <option value="">Gte: Todos</option>
                            {filteredManagers.map(m => {
                                if (!activeManagerIds.has(m.id) && filters.managerId !== m.id.toString()) return null;
                                return <option key={m.id} value={m.id}>{m.full_name}</option>
                            })}
                        </select>
                    </div>

                    {/* Select de Aprobador */}
                    <div className="flex flex-col">
                        <select className={`${filterSelectClass} !min-w-[100px]`} value={filters.approverId} onChange={(e) => handleFilterChange('approverId', e.target.value)} title="Aprobador">
                            <option value="">Apr: Todos</option>
                            {filteredDC.map(a => {
                                if (!activeApproverIds.has(a.id) && filters.approverId !== a.id.toString()) return null;
                                return <option key={a.id} value={a.id}>{a.full_name}</option>
                            })}
                        </select>
                    </div>

                    {/* Select de Negocio */}
                    <div className="flex flex-col">
                        <select className={`${filterSelectClass} !min-w-[100px]`} value={filters.businessId} onChange={(e) => handleFilterChange('businessId', e.target.value)} title="Negocio">
                            <option value="">Neg: Todos</option>
                            {filteredNeg.map(n => {
                                if (!activeBusinessIds.has(n.id) && filters.businessId !== n.id.toString()) return null;
                                return <option key={n.id} value={n.id}>{n.full_name}</option>
                            })}
                        </select>
                    </div>

                    {/* Botón Limpiar */}
                    {hasActiveFilters && (
                        <button 
                            onClick={clearFilters}
                            className="h-8 px-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-[10px] flex items-center gap-1 transition-colors"
                            title="Limpiar filtros"
                        >
                            <XCircle size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* --- TABLA ORIGINAL (Usando filteredData) --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-auto max-h-[calc(100vh-170px)]">
                <table className="w-full border-collapse min-w-[1500px]">
                    <thead>
                        <tr>
                            <th className={`${headerClass} w-10`}>#</th>
                            <th className={`${headerClass} w-20`}>%</th>
                            <th className={`${headerClass} w-44`}>Cuenta</th>
                            <th className={`${headerClass} w-52`}>Oportunidad</th>
                            <th className={`${headerClass} w-52`}>Observaciones</th>
                            <th className={`${headerClass} w-40`}>Estado</th>
                            <th className={`${headerClass} w-44`}>Cronograma</th>
                            <th className={`${headerClass} w-48`}>Equipo</th>
                            <th className={`${headerClass} w-24`}>Días</th>
                            <th className={`${headerClass} w-32`}>Proyecto</th>
                            <th className={`${headerClass} w-32 border-r-0`}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredData.map(opp => (
                            <tr key={opp.id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-1 py-1 text-center text-gray-500 text-[10px] font-bold border-b border-r border-gray-300">{opp.id}</td>
                                
                                <td className={`p-0 relative w-20 align-stretch h-full border-b border-r border-gray-300 transition-colors ${getSemaforoStyle(opp.color_code)}`}>
                                    <div className="flex items-center justify-center w-full h-full min-h-[80px] relative group/percent">
                                        <span className="relative z-10 font-black text-[12px]">{opp.percentage}%</span>
                                        
                                        {!isReadOnlyView && (
                                            <div className="absolute inset-0 opacity-0 group-hover/percent:opacity-100 bg-white flex flex-col p-2 gap-1.5 transition-opacity z-20 shadow-lg justify-center border text-gray-800">
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase">Semáforo</label>
                                                    <select 
                                                        className="w-full text-[12px] font-bold border rounded bg-white p-1 text-gray-800" 
                                                        value={opp.color_code} 
                                                        onChange={e => handleColorChange(opp.id, e.target.value, opp.percentage)}
                                                    >
                                                        <option value="GREEN" className="bg-green-100 text-green-700">Verde (Óptimo)</option>
                                                        <option value="YELLOW" className="bg-yellow-100 text-yellow-700">Amarillo (Alerta)</option>
                                                        <option value="RED" className="bg-red-100 text-red-700">Rojo (Crítico)</option>
                                                        <option value="NONE" className="bg-gray-100 text-gray-700">Sin definir</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase">Porcentaje</label>
                                                    <input 
                                                        type="number" 
                                                        className={`w-full text-center text-[12px] font-bold border rounded p-1 bg-white text-gray-800 ${!validateSemaforo(opp.percentage, opp.color_code) ? 'border-red-500' : ''}`} 
                                                        defaultValue={opp.percentage} 
                                                        key={opp.percentage}
                                                        onBlur={e => handleSavePercentage(opp.id, parseInt(e.target.value) || 0, opp.color_code)} 
                                                    />
                                                    <p className="text-[7px] text-blue-500 font-bold italic leading-tight text-center">{getRangeSuggestion(opp.color_code)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                
                                <td className={`${cellClass} font-black py-1`}>
                                    <select className={`${inlineInput} text-sm font-bold`} value={opp.account_id} onChange={e => handleSaveField(opp.id, 'account_id', parseInt(e.target.value))} disabled={isReadOnlyView}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </td>
                                
                                <td className={`${cellClass} py-1`}>
                                    <div className="flex flex-col gap-1">
                                        <textarea 
                                            className={`${inlineInput} uppercase text-[9px] resize-none h-12 overflow-y-auto leading-tight p-0.5`} 
                                            defaultValue={opp.name} 
                                            onBlur={e => handleSaveField(opp.id, 'name', e.target.value)} 
                                            disabled={isReadOnlyView} 
                                            style={{ fontSize: '12px' }}
                                        />
                                        <div className="flex gap-2 px-1 mt-1 flex-wrap">
                                            <label className={`text-[9px] font-bold flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md transition-all border ${opp.has_ia_proposal ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm' : 'text-gray-400 border-transparent hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={opp.has_ia_proposal} onChange={e => handleSaveField(opp.id, 'has_ia_proposal', e.target.checked)} disabled={isReadOnlyView} />
                                                <Cpu size={12} className={opp.has_ia_proposal ? "text-purple-600" : "text-gray-400"} />
                                                IA
                                            </label>
                                            <label className={`text-[9px] font-bold flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md transition-all border ${opp.has_prototype ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'text-gray-400 border-transparent hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={opp.has_prototype} onChange={e => handleSaveField(opp.id, 'has_prototype', e.target.checked)} disabled={isReadOnlyView} />
                                                <Smartphone size={12} className={opp.has_prototype ? "text-blue-600" : "text-gray-400"} />
                                                PROTOTIPO
                                            </label>
                                            <label className={`text-[9px] font-bold flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md transition-all border ${opp.has_rfp ? 'bg-pink-100 text-pink-700 border-pink-200 shadow-sm' : 'text-gray-400 border-transparent hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={opp.has_rfp} onChange={e => handleSaveField(opp.id, 'has_rfp', e.target.checked)} disabled={isReadOnlyView} />
                                                <FileCheck size={12} className={opp.has_rfp ? "text-pink-600" : "text-gray-400"} />
                                                RFP
                                            </label>
                                            <label className={`text-[9px] font-bold flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md transition-all border ${opp.has_anteproyecto ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm' : 'text-gray-400 border-transparent hover:bg-gray-50'}`}>
                                                <input type="checkbox" className="hidden" checked={opp.has_anteproyecto} onChange={e => handleSaveField(opp.id, 'has_anteproyecto', e.target.checked)} disabled={isReadOnlyView} />
                                                <File size={12} className={opp.has_anteproyecto ? "text-indigo-600" : "text-gray-400"} />
                                                ANTEPROY.
                                            </label>
                                        </div>
                                    </div>
                                </td>
                                
                                <td className={`${cellClass} max-w-xs py-1`}>
                                    <textarea 
                                        className={`${inlineInput} text-[14px] leading-tight resize-none h-20 font-medium text-gray-700 p-0.5 border border-gray-200 rounded focus:border-blue-300`} 
                                        defaultValue={opp.last_observation || ''} 
                                        onBlur={e => handleObservationUpdate(opp.id, e.target.value, opp.last_observation)} 
                                        disabled={isReadOnlyView} 
                                        style={{ fontSize: '11px' }}
                                    />
                                </td>
                                
                                <td className={`${cellClass} text-center py-1`}>
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className={`w-full rounded-md border p-1 transition-colors ${getStatusStyle(statuses.find(s => s.id === opp.status_id)?.name)}`}>
                                            <select 
                                                className={`${inlineInput} text-center text-[8px] font-black uppercase !bg-transparent !text-inherit whitespace-normal break-words h-auto min-h-[24px] p-0.5`} 
                                                value={opp.status_id} 
                                                onChange={e => handleSaveField(opp.id, 'status_id', parseInt(e.target.value))} 
                                                disabled={isReadOnlyView}
                                                style={{ appearance: 'none', WebkitAppearance: 'none' }}
                                            >
                                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-full border border-gray-200 rounded-md bg-gray-50/50 p-1">
                                            <select className={`${inlineInput} text-center text-[7px] text-gray-700 !bg-transparent whitespace-normal break-words h-auto p-0.5`} value={opp.motive_id || ''} onChange={e => handleSaveField(opp.id, 'motive_id', e.target.value ? parseInt(e.target.value) : null)} disabled={isReadOnlyView}>
                                                <option value="">- Motivo -</option>
                                                {motives.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-center gap-1 w-full border border-red-100 rounded-md bg-red-50/30 p-1">
                                            <span className="text-[9px] font-black text-red-600 uppercase">K-Rojo:</span>
                                            <input type="number" className="w-10 text-[9px] font-black text-red-600 bg-transparent border-none text-center outline-none" defaultValue={opp.k_red_index || 0} onBlur={e => handleSaveField(opp.id, 'k_red_index', parseInt(e.target.value) || 0)} disabled={isReadOnlyView} />
                                        </div>
                                    </div>
                                </td>
                                
                                <td className={`${cellClass} text-[10px] py-1`}>
                                    <div className="grid grid-cols-[80px,1fr] gap-x-1 gap-y-1">
                                        <span className="font-black text-gray-500 uppercase text-[9px] text-right pr-1">Inicio:</span> 
                                        {renderDateInput(opp.id, 'start_date', opp.start_date)}
                                        
                                        <span className="font-black text-gray-500 uppercase text-[9px] text-right pr-1 text-nowrap">Entendim.:</span> 
                                        {renderDateInput(opp.id, 'understanding_date', opp.understanding_date)}
                                        
                                        <span className="font-black text-gray-500 uppercase text-[9px] text-right pr-1">Alcance:</span> 
                                        {renderDateInput(opp.id, 'scope_date', opp.scope_date)}
                                        
                                        <span className="font-black text-gray-500 uppercase text-[9px] text-right pr-1">COE:</span> 
                                        {renderDateInput(opp.id, 'coe_date', opp.coe_date)}
                                        
                                        <span className="font-black text-blue-600 uppercase text-[9px] text-right pr-1 text-nowrap">Entrega Gte:</span> 
                                        {renderDateInput(opp.id, 'delivery_date', opp.delivery_date, "text-blue-700")}
                                        
                                        <span className="font-black text-green-600 uppercase text-[9px] text-right pr-1">Real:</span> 
                                        {renderDateInput(opp.id, 'real_delivery_date', opp.real_delivery_date, "text-green-700")}
                                    </div>
                                </td>

                                <td className={`${cellClass} py-1`}>
                                    <div className="grid grid-cols-[35px,1fr] gap-x-1 gap-y-1 text-[12px]">
                                        <span className="font-black text-gray-500 uppercase text-[9px] pt-1">Gte:</span> 
                                        <select className={`${inlineInput} text-[11px] p-0.5`} value={opp.manager_id} onChange={e => handleSaveField(opp.id, 'manager_id', parseInt(e.target.value))} disabled={isReadOnlyView} style={{ fontSize: '11px' }}>
                                            {filteredManagers.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                                        </select>
                                        
                                        <span className="font-black text-gray-500 uppercase text-[9px] pt-1 text-nowrap">Aprob:</span> 
                                        <select className={`${inlineInput} text-[11px] p-0.5`} value={opp.responsible_dc_id || ''} onChange={e => handleSaveField(opp.id, 'responsible_dc_id', parseInt(e.target.value))} disabled={isReadOnlyView} style={{ fontSize: '11px' }}>
                                            <option value="">-</option>{filteredDC.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                                        </select>

                                        <span className="font-black text-gray-500 uppercase text-[9px] pt-1">Neg:</span> 
                                        <select className={`${inlineInput} text-[11px] p-0.5`} value={opp.responsible_business_id || ''} onChange={e => handleSaveField(opp.id, 'responsible_business_id', parseInt(e.target.value))} disabled={isReadOnlyView} style={{ fontSize: '11px' }}>
                                            <option value="">-</option>{filteredNeg.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                                        </select>

                                        <span className="font-black text-gray-500 uppercase text-[9px] pt-1">Tec:</span> 
                                        <select className={`${inlineInput} text-[11px] p-0.5`} value={opp.responsible_tech_id || ''} onChange={e => handleSaveField(opp.id, 'responsible_tech_id', parseInt(e.target.value))} disabled={isReadOnlyView} style={{ fontSize: '11px' }}>
                                            <option value="">-</option>{filteredTec.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                                        </select>
                                    </div>
                                </td>
                                
                                <td className={`${cellClass} text-center py-1`}>
                                    <div className="flex flex-col gap-1 items-center">
                                        <div className="flex items-center gap-1"><span className="font-black text-gray-500 text-[10px] uppercase">Inicio:</span><span className="font-black text-gray-900 text-[13px]">{getBusinessDays(opp.start_date, opp.understanding_date)}</span></div>
                                        <div className="flex items-center gap-1"><span className="font-black text-gray-500 text-[10px] uppercase">Entendim.:</span><span className="font-black text-gray-900 text-[13px]">{getBusinessDays(opp.understanding_date, opp.scope_date)}</span></div>
                                        <div className="mt-1 bg-blue-50/50 px-2 py-1 rounded border border-blue-200 flex flex-col items-center">
                                            <span className="text-[7px] font-black text-blue-500 uppercase leading-none text-nowrap">Elaboración</span>
                                            <span className="font-black text-blue-700 text-[12px]">{getBusinessDays(opp.scope_date, opp.real_delivery_date)}</span>
                                        </div>
                                    </div>
                                </td>
                                
                                <td className={`${cellClass} py-1`}>
                                    <div className="flex flex-col gap-1 items-center">
                                        <div className="flex items-center gap-2 text-gray-900">
                                            <Clock size={14} className="text-gray-400" />
                                            <span className="text-[13px] font-bold">
                                                {opp.estimated_hours && opp.estimated_hours > 0 ? `${opp.estimated_hours} hs` : '- hs'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-900">
                                            <Calendar size={14} className="text-gray-400" />
                                            <span className="text-[13px] font-bold">
                                                {opp.estimated_term_months && opp.estimated_term_months > 0 ? `${opp.estimated_term_months} meses` : '- meses'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleOpenLink(opp.work_plan_link)}
                                            className={`mt-1 flex items-center justify-center gap-1.5 px-3 py-1 rounded-md border font-black text-[9px] uppercase tracking-widest shadow-sm transition-all ${opp.work_plan_link ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                                        >
                                            <Link size={12}/> PLAN
                                        </button>
                                    </div>
                                </td>
                                
                                <td className="px-2 py-1 text-center align-middle border-b border-gray-300">
                                    <div className="flex flex-col gap-1 items-center">
                                        {isTrashView ? (
                                            <div className="w-full flex flex-col gap-1">
                                                <button onClick={() => onRestore(opp)} className={`${actionBtnClass} text-green-600 hover:bg-green-50 shadow-sm border border-green-100`}>
                                                    <RotateCcw size={14}/> <span>Restaurar</span>
                                                </button>
                                                <button onClick={() => onDelete(opp.id)} className={`${actionBtnClass} text-red-600 hover:bg-red-50 shadow-sm border border-red-100`}>
                                                    <Trash2 size={14}/> <span>Eliminar</span>
                                                </button>
                                            </div>
                                        ) : isHistoryView ? (
                                            <div className="w-full flex flex-col gap-1">
                                                <button onClick={() => onUnarchive(opp)} className={`${actionBtnClass} text-blue-600 hover:bg-blue-50 shadow-sm border border-blue-100`}>
                                                    <RotateCcw size={14}/> <span>Activar</span>
                                                </button>
                                                <button onClick={() => onOpenDetail(opp)} className={`${actionBtnClass} text-blue-700 hover:bg-blue-50 shadow-sm border border-blue-100`}>
                                                    <Search size={14}/> <span>Ver Detalle</span>
                                                </button>
                                                <button onClick={() => onDelete(opp.id)} className={`${actionBtnClass} text-red-600 hover:bg-red-50 shadow-sm border border-red-100`}>
                                                    <Trash2 size={14}/> <span>Borrar</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full flex flex-col gap-1">
                                                <button onClick={() => onOpenDetail(opp)} className={`${actionBtnClass} text-blue-600 hover:bg-blue-50 shadow-sm border border-blue-100`}>
                                                    <Edit2 size={14}/> <span>Editar</span>
                                                </button>
                                                <button onClick={() => onArchive(opp)} className={`${actionBtnClass} text-orange-500 hover:bg-orange-50 shadow-sm border border-orange-100`}>
                                                    <Archive size={14}/> <span>Archivar</span>
                                                </button>
                                                <button onClick={() => onDelete(opp.id)} className={`${actionBtnClass} text-red-600 hover:bg-red-50 shadow-sm border border-red-100`}>
                                                    <Trash2 size={14}/> <span>Borrar</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OpportunityGrid;