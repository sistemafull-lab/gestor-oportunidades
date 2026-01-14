import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, RotateCcw, Menu, ChevronRight, Search, Check, Save } from 'lucide-react';
import { Account, OpportunityStatus, OpportunityType, Employee, JobRole, Motive } from '../types/types';
import * as api from '../api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const AdminModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'statuses' | 'oppTypes' | 'roles' | 'employees' | 'motives'>('accounts');
    
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [statuses, setStatuses] = useState<OpportunityStatus[]>([]);
    const [oppTypes, setOppTypes] = useState<OpportunityType[]>([]);
    const [roles, setRoles] = useState<JobRole[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [motives, setMotives] = useState<Motive[]>([]);

    const [formData, setFormData] = useState<any>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [inlineEditId, setInlineEditId] = useState<number | null>(null);
    const [inlineData, setInlineData] = useState<any>({});

    const fetchData = async () => {
        try {
            const [acc, sta, opp, rol, emp, mot] = await Promise.all([
                api.getAccounts(),
                api.getStatuses(),
                api.getOppTypes(),
                api.getJobRoles(),
                api.getEmployees(),
                api.fetchApi('/motives')
            ]);
            setAccounts(acc);
            setStatuses(sta);
            setOppTypes(opp);
            setRoles(rol);
            setEmployees(emp);
            setMotives(mot);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
            resetForm();
        }
    }, [isOpen, activeSubTab]);

    const resetForm = () => {
        setEditingId(null);
        setInlineEditId(null);
        setInlineData({});
        setSearchTerm('');
        
        if (activeSubTab === 'accounts') {
            setFormData({ name: '', contact_name: '', contact_email: '', is_active: true });
        } else if (activeSubTab === 'employees') {
            setFormData({ full_name: '', role_id: '', is_active: true });
        } else {
            setFormData({ name: '' });
        }
    };

    const handleSave = async (isInline = false) => {
        try {
            const entityMap: any = {
                accounts: 'accounts',
                statuses: 'statuses',
                oppTypes: 'opp-types',
                roles: 'job-roles',
                employees: 'employees',
                motives: 'motives'
            };
            const endpoint = entityMap[activeSubTab];

            if (isInline && inlineEditId) {
                 await api.updateEntity(endpoint, inlineEditId, inlineData);
                 setInlineEditId(null);
            } else {
                if (editingId) {
                    await api.updateEntity(endpoint, editingId, formData);
                } else {
                    await api.createEntity(endpoint, formData);
                }
                if (!isInline) resetForm(); // Only reset search/edit state if not inline, or handle properly
            }
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Seguro?')) return;
        try {
            const entityMap: any = {
                accounts: 'accounts',
                statuses: 'statuses',
                oppTypes: 'opp-types',
                roles: 'job-roles',
                employees: 'employees',
                motives: 'motives'
            };
            await api.deleteEntity(entityMap[activeSubTab], id);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setFormData({ ...item });
        // Close inline edit if open
        setInlineEditId(null);
    };

    const startInlineEdit = (item: any) => {
        setInlineEditId(item.id);
        setInlineData({ ...item });
        // Close form edit if open
        setEditingId(null);
    };

    const getFilteredList = () => {
        let list: any[] = [];
        if (activeSubTab === 'accounts') list = accounts;
        else if (activeSubTab === 'statuses') list = statuses;
        else if (activeSubTab === 'oppTypes') list = oppTypes;
        else if (activeSubTab === 'roles') list = roles;
        else if (activeSubTab === 'employees') list = employees;
        else if (activeSubTab === 'motives') list = motives;

        if (!searchTerm) return list;

        return list.filter((item: any) => {
            const name = item.name || item.full_name || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    };

    if (!isOpen) return null;

    const navItemClasses = (id: string) => `w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition-all ${activeSubTab === id ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`;
    const inputClasses = "bg-[#3f4b5b] border-none text-white text-[12px] rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-400 w-full placeholder:text-gray-400 disabled:opacity-50";
    const headerTh = "text-[#495057] font-black text-[10px] px-3 py-1.5 text-left bg-[#f8f9fa] uppercase tracking-wider";
    
    // Inline input styles
    const inlineInputClass = "bg-white border border-gray-300 text-gray-800 text-[11px] rounded px-2 py-1 outline-none focus:border-blue-500 w-full h-7";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden">
                
                {/* Sidebar Navigation */}
                <div className="w-48 bg-white border-r border-gray-100 flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                            <Menu size={16} />
                        </div>
                        <span className="font-black text-gray-800 text-xs uppercase tracking-tight">Configuración</span>
                    </div>
                    <nav className="flex-1 overflow-y-auto py-2">
                        <button onClick={() => { setActiveSubTab('accounts'); resetForm(); }} className={navItemClasses('accounts')}>Cuentas {activeSubTab === 'accounts' && <ChevronRight size={14}/>}</button>
                        <button onClick={() => { setActiveSubTab('statuses'); resetForm(); }} className={navItemClasses('statuses')}>Estados {activeSubTab === 'statuses' && <ChevronRight size={14}/>}</button>
                        <button onClick={() => { setActiveSubTab('oppTypes'); resetForm(); }} className={navItemClasses('oppTypes')}>Tipos ON {activeSubTab === 'oppTypes' && <ChevronRight size={14}/>}</button>
                        <button onClick={() => { setActiveSubTab('roles'); resetForm(); }} className={navItemClasses('roles')}>Puestos {activeSubTab === 'roles' && <ChevronRight size={14}/>}</button>
                        <button onClick={() => { setActiveSubTab('employees'); resetForm(); }} className={navItemClasses('employees')}>Empleados {activeSubTab === 'employees' && <ChevronRight size={14}/>}</button>
                        <button onClick={() => { setActiveSubTab('motives'); resetForm(); }} className={navItemClasses('motives')}>Motivos {activeSubTab === 'motives' && <ChevronRight size={14}/>}</button>
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-gray-50/30">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
                        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                            Administrar {activeSubTab === 'accounts' ? 'Cuentas' : 
                                       activeSubTab === 'statuses' ? 'Estados' : 
                                       activeSubTab === 'oppTypes' ? 'Tipos de Oportunidad' : 
                                       activeSubTab === 'roles' ? 'Puestos Laborales' : 
                                       activeSubTab === 'motives' ? 'Motivos de Rechazo' : 'Empleados'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Nuevo Registro Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="text-gray-700 font-black text-[11px] uppercase tracking-widest">
                                    {editingId ? 'Editar Registro' : 'Nuevo Registro'}
                                </h3>
                                {editingId && (
                                    <button onClick={resetForm} className="text-red-500 text-[10px] font-bold flex items-center gap-1 hover:underline uppercase">
                                        <RotateCcw size={10}/> Cancelar
                                    </button>
                                )}
                            </div>
                            <div className="p-4 space-y-3">
                                {activeSubTab === 'accounts' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input className={inputClasses} placeholder="Nombre Cliente" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                            <input className={inputClasses} placeholder="Nombre Contacto" value={formData.contact_name || ''} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 items-center">
                                            <input className={inputClasses} placeholder="Mail Contacto" value={formData.contact_email || ''} onChange={e => setFormData({...formData, contact_email: e.target.value})} />
                                            <div className="flex items-center gap-2 pl-1">
                                                <input type="checkbox" id="active-acc" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                                <label htmlFor="active-acc" className="text-[11px] font-bold text-gray-700 uppercase cursor-pointer select-none">Activo</label>
                                            </div>
                                        </div>
                                    </>
                                ) : activeSubTab === 'employees' ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input className={inputClasses} placeholder="Nombre Completo" value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                            <select className={inputClasses} value={formData.role_id || ''} onChange={e => setFormData({...formData, role_id: parseInt(e.target.value)})}>
                                                <option value="">Seleccionar Puesto...</option>
                                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 pl-1">
                                            <input type="checkbox" id="active-emp" className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                            <label htmlFor="active-emp" className="text-[11px] font-bold text-gray-700 uppercase cursor-pointer select-none">Activo</label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1">
                                        <input className={inputClasses} placeholder="Nombre" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                )}
                                
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => handleSave(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-6 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2">
                                        {editingId ? <Edit2 size={12}/> : <Plus size={14}/>} 
                                        {editingId ? 'Actualizar' : 'Agregar'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                placeholder={`Buscar en ${activeSubTab === 'accounts' ? 'cuentas' : 'registros'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Table Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className={headerTh}>Nombre</th>
                                            {activeSubTab === 'accounts' && <th className={headerTh}>Contacto</th>}
                                            {activeSubTab === 'employees' && <th className={headerTh}>Puesto</th>}
                                            {(activeSubTab === 'accounts' || activeSubTab === 'employees') && <th className={`${headerTh} text-center`}>Estado</th>}
                                            <th className={`${headerTh} text-right w-24`}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-[11px]">
                                        {getFilteredList().map((item: any) => (
                                            <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors ${editingId === item.id ? 'bg-blue-50' : ''}`}>
                                                
                                                {/* NAME COLUMN */}
                                                <td className="px-3 py-2">
                                                    {inlineEditId === item.id ? (
                                                        <input 
                                                            className={inlineInputClass} 
                                                            value={inlineData.name || inlineData.full_name || ''} 
                                                            onChange={e => setInlineData({ ...inlineData, [item.full_name ? 'full_name' : 'name']: e.target.value })}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="font-bold text-gray-800">{item.name || item.full_name}</div>
                                                    )}
                                                </td>

                                                {/* CONTACT COLUMN (ACCOUNTS ONLY) */}
                                                {activeSubTab === 'accounts' && (
                                                    <td className="px-3 py-2">
                                                        {inlineEditId === item.id ? (
                                                            <div className="space-y-1">
                                                                <input 
                                                                    className={inlineInputClass} 
                                                                    placeholder="Nombre Contacto"
                                                                    value={inlineData.contact_name || ''} 
                                                                    onChange={e => setInlineData({ ...inlineData, contact_name: e.target.value })}
                                                                />
                                                                <input 
                                                                    className={inlineInputClass} 
                                                                    placeholder="Email Contacto"
                                                                    value={inlineData.contact_email || ''} 
                                                                    onChange={e => setInlineData({ ...inlineData, contact_email: e.target.value })}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="font-bold text-gray-700">{item.contact_name || '-'}</div>
                                                                {item.contact_email && <div className="text-[9px] text-gray-400 font-medium">{item.contact_email}</div>}
                                                            </>
                                                        )}
                                                    </td>
                                                )}

                                                {/* ROLE COLUMN (EMPLOYEES ONLY) */}
                                                {activeSubTab === 'employees' && (
                                                    <td className="px-3 py-2 text-gray-600 font-medium">
                                                        {inlineEditId === item.id ? (
                                                            <select 
                                                                className={inlineInputClass} 
                                                                value={inlineData.role_id || ''} 
                                                                onChange={e => setInlineData({ ...inlineData, role_id: parseInt(e.target.value) })}
                                                            >
                                                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                            </select>
                                                        ) : (
                                                            item.role_name || '-'
                                                        )}
                                                    </td>
                                                )}

                                                {/* ACTIVE STATUS COLUMN */}
                                                {(activeSubTab === 'accounts' || activeSubTab === 'employees') && (
                                                    <td className="px-3 py-2 text-center">
                                                        {inlineEditId === item.id ? (
                                                            <input 
                                                                type="checkbox" 
                                                                checked={inlineData.is_active} 
                                                                onChange={e => setInlineData({ ...inlineData, is_active: e.target.checked })} 
                                                            />
                                                        ) : (
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {item.is_active ? 'Sí' : 'No'}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}

                                                {/* ACTIONS COLUMN */}
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {inlineEditId === item.id ? (
                                                            <>
                                                                <button onClick={() => handleSave(true)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-all" title="Guardar"><Save size={14}/></button>
                                                                <button onClick={() => setInlineEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-all" title="Cancelar"><X size={14}/></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startInlineEdit(item)} className={`p-1.5 rounded-md transition-all ${editingId === item.id ? 'text-blue-700 bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}><Edit2 size={12}/></button>
                                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 size={12}/></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {getFilteredList().length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                                                    No se encontraron resultados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminModal;
