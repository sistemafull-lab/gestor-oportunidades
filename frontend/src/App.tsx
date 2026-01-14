import React, { useState, useEffect } from 'react';
import OpportunityGrid from './components/OpportunityGrid';
import EditModal from './components/EditModal';
import AdminModal from './components/AdminModal';
import * as api from './api';
import { Opportunity, Account, Employee, OpportunityStatus, OpportunityType, Motive } from './types/types';
import { Plus, Layers, Search, Settings, Trash2, Download, ArrowRightLeft, Filter, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState<'ON' | 'ON-OUT' | 'TRASH'>('ON');
  const [searchTerm, setSearchTerm] = useState('');
  

  // Filters (Ahora manejados internamente en OpportunityGrid, excepto si se requiere lógica global)
  // Pero para mantener consistencia con el requerimiento de moverlos a la cabecera de la grilla,
  // pasaremos estos estados como props a OpportunityGrid o haremos que OpportunityGrid maneje su propio filtrado.
  // Dado que la arquitectura actual filtra en App.tsx antes de pasar la data, mantendremos el estado aquí
  // pero la UI de los filtros se moverá a OpportunityGrid.

  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterManager, setFilterManager] = useState<string>('');
  const [filterAprobador, setFilterAprobador] = useState<string>('');
  const [filterNegocio, setFilterNegocio] = useState<string>('');
  const [filterTecnico, setFilterTecnico] = useState<string>('');
  const [filterKRed, setFilterKRed] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | undefined>(undefined);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Lists
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statuses, setStatuses] = useState<OpportunityStatus[]>([]);
  const [oppTypes, setOppTypes] = useState<OpportunityType[]>([]);
  const [motives, setMotives] = useState<Motive[]>([]);

  const fetchData = async () => {
    try {
        const [opps, acc, emp, sta, oty, mot] = await Promise.all([
            api.getOpportunities(activeTab),
            api.getAccounts(),
            api.getEmployees(),
            api.getStatuses(),
            api.getOppTypes(),
            api.fetchApi('/motives')
        ]);
        setOpportunities(opps);
        setAccounts(acc);
        setEmployees(emp);
        setStatuses(sta);
        setOppTypes(oty);
        setMotives(mot);
    } catch (err) {
        console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSave = async (data: Partial<Opportunity>) => {
    try {
        if (!isNewRecord && editingOpp?.id) {
            await api.updateOpportunity(editingOpp.id, data);
        } else {
            await api.createOpportunity(data);
        }
        setIsModalOpen(false);
        setEditingOpp(undefined);
        setIsNewRecord(false);
        fetchData();
    } catch (err) {
        alert(`Error al guardar: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
      if (activeTab === 'TRASH') {
          if (!window.confirm('¿Eliminar definitivamente?')) return;
          await api.permanentDeleteOpportunity(id);
      } else {
          if (!window.confirm('¿Mover a papelera?')) return;
          await api.deleteOpportunity(id);
      }
      fetchData();
  };

  const handleArchive = async (opp: Opportunity) => {
      await api.updateOpportunity(opp.id, { is_archived: true });
      fetchData();
  };

  const handleUnarchive = async (opp: Opportunity) => {
      await api.updateOpportunity(opp.id, { is_archived: false });
      fetchData();
  };

  const handleRestoreFromTrash = async (opp: Opportunity) => {
      try {
          await api.restoreOpportunity(opp.id);
          fetchData();
      } catch (err) {
          alert(`Error al restaurar: ${err.message}`);
      }
  };

  // REQ 3: Mover filas
  const handleMoveToHistory = async () => {
      if (!window.confirm("¿Desea mover registros a históricos según las reglas de negocio?")) return;
      
      const toMove = opportunities.filter(o => {
          const isRed = o.color_code === 'RED';
          const highKRedIndex = (o.k_red_index || 0) >= 3; 

          if (isRed && highKRedIndex) return true;

          const status = (o.status_name || "").toUpperCase();
          if (status.includes("GANADA") || status.includes("PERDIDA")) return true;

          return false;
      });

      if (toMove.length === 0) {
          alert("No hay registros que cumplan las condiciones para ser movidos.");
          return;
      }

      try {
          await Promise.all(toMove.map(o => api.updateOpportunity(o.id, { is_archived: true })));
          alert(`${toMove.length} registros movidos a históricos.`);
          fetchData();
      } catch (err) {
          alert("Error al mover registros.");
      }
  };

  // REQ 1: Nueva Fila con ID autocompletado
  const handleNewOpportunity = async () => {
    try {
        const { max_id } = await api.getMaxOpportunityId();
        const nextId = max_id + 1;
        const today = new Date().toISOString().split('T')[0];

        setEditingOpp({
            id: nextId,
            name: '',
            account_id: accounts[0]?.id || 0,
            status_id: statuses.find(s => s.name.toUpperCase().includes('EVALUACIÓN'))?.id || statuses[0]?.id || 0,
            manager_id: employees.find(e => e.role_name === 'Gerente Comercial')?.id || employees[0]?.id || 0,
            percentage: 0,
            color_code: 'NONE',
            start_date: today,
            is_archived: false,
            has_ia_proposal: false,
            has_prototype: false
        } as Opportunity);
        setIsNewRecord(true);
        setIsModalOpen(true);
    } catch (err) {
        console.error(err);
    }
  };

  // REQ 2: Ordenar filas (Solo en ON)
  const sortOpportunities = (opps: Opportunity[]) => {
      if (activeTab !== 'ON') return opps;

      const statusOrder = ["EVALUACIÓN", "ELABORACIÓN", "ESPERANDO", "RESPUESTA", "REASIGNADO A CAPACITY", "DESESTIMADA", "GANADA", "PERDIDA"];

      return [...opps].sort((a, b) => {
          const aEmpty = !a.name && !a.account_id;
          const bEmpty = !b.name && !b.account_id;
          if (aEmpty && !bEmpty) return -1;
          if (!aEmpty && bEmpty) return 1;

          const aMissingStatus = a.name && a.manager_id && !a.status_id;
          const bMissingStatus = b.name && b.manager_id && !b.status_id;
          if (aMissingStatus && !bMissingStatus) return -1;
          if (!aMissingStatus && bMissingStatus) return 1;

          const aStatusName = (a.status_name || "").toUpperCase();
          const bStatusName = (b.status_name || "").toUpperCase();

          const getStatusIndex = (name: string) => {
             for (let i = 0; i < statusOrder.length; i++) {
                 if (name.includes(statusOrder[i])) return i;
             }
             return -1;
          }

          const aStatusIdx = getStatusIndex(aStatusName);
          const bStatusIdx = getStatusIndex(bStatusName);
          
          if (aStatusIdx !== -1 && bStatusIdx !== -1) {
              if (aStatusIdx !== bStatusIdx) return aStatusIdx - bStatusIdx;
          } else if (aStatusIdx !== -1) return -1;
          else if (bStatusIdx !== -1) return 1;

          const kDiff = (b.k_red_index || 0) - (a.k_red_index || 0);
          if (kDiff !== 0) return kDiff;

          return b.id - a.id;
      });
  };

  const filteredOpps = sortOpportunities(opportunities.filter(o => {
      const matchSearch = searchTerm === '' || 
          o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.account_name && o.account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (o.manager_name && o.manager_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (o.dc_name && o.dc_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (o.neg_name && o.neg_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (o.tec_name && o.tec_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchAccount = filterAccount === '' || o.account_name === filterAccount;
      const matchStatus = filterStatus === '' || o.status_name === filterStatus;
      const matchManager = filterManager === '' || o.manager_name === filterManager;
      const matchAprobador = filterAprobador === '' || o.dc_name === filterAprobador;
      const matchNegocio = filterNegocio === '' || o.neg_name === filterNegocio;
      const matchTecnico = filterTecnico === '' || o.tec_name === filterTecnico;
      const matchKRed = filterKRed === '' || String(o.k_red_index) === filterKRed;

      return matchSearch && matchAccount && matchStatus && matchManager && matchAprobador && matchNegocio && matchTecnico && matchKRed;
  }));

  const clearFilters = () => {
    setFilterAccount('');
    setFilterStatus('');
    setFilterManager('');
    setFilterAprobador('');
    setFilterNegocio('');
    setFilterTecnico('');
    setFilterKRed('');
  };

  const getDownloadDateSuffix = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `_${dd}${mm}${yyyy}`;
  };

  const exportDC = () => {
    const headers = [
        "ID", "%", "Gerente Comercial", "Observaciones", 
        "Nombre de la cuenta", "Nombre de la oportunidad", "Estado", 
        "Entregar al Gerente Comercial", "Motivo"
    ];

    const data = filteredOpps.map(opp => {
        const motive = motives.find(m => m.id === opp.motive_id);
        return {
            "ID": opp.id,
            "%": opp.percentage ? `${opp.percentage} %`: '',
            "Gerente Comercial": opp.manager_name,
            "Observaciones": opp.last_observation,
            "Nombre de la cuenta": opp.account_name,
            "Nombre de la oportunidad": opp.name,
            "Estado": opp.status_name,
            "Entregar al Gerente Comercial": opp.delivery_date ? formatDate(opp.delivery_date) : '',
            "Motivo": motive ? motive.name : '',
        };
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });

    const getHexColor = (colorCode?: string) => {
        switch (colorCode) {
            case 'RED': return 'FFFF0000'; 
            case 'YELLOW': return 'FFFFFF00'; 
            case 'GREEN': return 'FF00FF00'; 
            default: return 'FFFFFFFF'; 
        }
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const headerStyle = {
        fill: { fgColor: { rgb: "FFFFE0B2" } },
        font: { bold: true, sz: 10 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };

    const baseCellStyle = {
        font: { sz: 10 },
        alignment: { vertical: "center", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
        if (R === 0) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                ws[cellRef].s = headerStyle;
            }
            continue; 
        }
        
        const rowData = filteredOpps[R - 1]; 
        if (!rowData) continue;

        const colorHex = getHexColor(rowData.color_code);
        const colsToColor = [2, 3, 4];

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; 
            
            ws[cellRef].s = { ...baseCellStyle };

            if (colsToColor.includes(C)) {
                 ws[cellRef].s.fill = { fgColor: { rgb: colorHex } };
            }
        }
    }
    ws['!cols'] = [{ wch: 5 }, { wch: 5 }, { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DC Export");
    XLSX.writeFile(wb, `export_dc${getDownloadDateSuffix()}.xlsx`);
  };

  const exportPablo = () => {
    const filteredForPablo = filteredOpps.filter(opp => 
        opp.color_code === 'GREEN' || opp.color_code === 'YELLOW'
    );
    const headers = ["ID", "%", "Gerente Comercial", "Observaciones", "Nombre de la cuenta", "Nombre de la oportunidad", "Estado", "Entregar al Gerente Comercial", "Motivo"];
    const data = filteredForPablo.map(opp => {
        const motive = motives.find(m => m.id === opp.motive_id);
        return {
            "ID": opp.id, "%": opp.percentage ? `${opp.percentage} %`: '', "Gerente Comercial": opp.manager_name, "Observaciones": opp.last_observation,
            "Nombre de la cuenta": opp.account_name, "Nombre de la oportunidad": opp.name, "Estado": opp.status_name,
            "Entregar al Gerente Comercial": opp.delivery_date ? formatDate(opp.delivery_date) : '', "Motivo": motive ? motive.name : '',
        };
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const getHexColor = (colorCode?: string) => {
        switch (colorCode) { case 'YELLOW': return 'FFFFFF00'; case 'GREEN': return 'FF00FF00'; default: return 'FFFFFFFF'; }
    };
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const headerStyle = {
        fill: { fgColor: { rgb: "FFFFE0B2" } }, font: { bold: true, sz: 10 }, alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    const baseCellStyle = {
        font: { sz: 10 }, alignment: { vertical: "center", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    for (let R = range.s.r; R <= range.e.r; ++R) {
        if (R === 0) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                ws[cellRef].s = headerStyle;
            }
            continue; 
        }
        const rowData = filteredForPablo[R - 1]; if (!rowData) continue;
        const colorHex = getHexColor(rowData.color_code);
        const colsToColor = [2, 3, 4];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
            ws[cellRef].s = { ...baseCellStyle };
            if (colsToColor.includes(C)) { ws[cellRef].s.fill = { fgColor: { rgb: colorHex } }; }
        }
    }
    ws['!cols'] = [{ wch: 5 }, { wch: 5 }, { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pablo Export");
    XLSX.writeFile(wb, `export_pablo${getDownloadDateSuffix()}.xlsx`);
  };

  const exportJP = async () => {
    const allOpps = await api.getOpportunities('ALL');
    const headers = [
        "ID", "%", "Nombre de la Cuenta", "Nombre Oportunidad", "Gerente Comercial",
        "Equipo de Preventa-COE", "Fecha-Inicio (Comercial pasa a Preventa)",
        "Fecha-Enfrendimiento (Primer reunión con Preventa)", "Fecha-Alcance (Cierre del alcance)",
        "Fecha-COE (Aprobacion Coe)", "Fecha-Entrega (Fecha envío PP al comercial)",
        "Días (Fecha-Inicio y Fecha-COE)", "Días (Fecha-Inicio y Fecha-Entrega)",
        "Estado Final", "Motivo"
    ];
    const diffDays = (date1?: string, date2?: string) => {
        if (!date1 || !date2) return '';
        const d1 = new Date(date1); const d2 = new Date(date2);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';
        const diff = d2.getTime() - d1.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };
    const data = allOpps.map(opp => {
        const eqPreventa = [opp.dc_name, opp.neg_name].filter(Boolean).join(' - ');
        return {
            "ID": opp.id, "%": opp.percentage ? `${opp.percentage} %`: '', "Nombre de la Cuenta": opp.account_name, "Nombre Oportunidad": opp.name,
            "Gerente Comercial": opp.manager_name, "Equipo de Preventa-COE": eqPreventa || 'N/A',
            "Fecha-Inicio (Comercial pasa a Preventa)": formatDate(opp.start_date),
            "Fecha-Enfrendimiento (Primer reunión con Preventa)": formatDate(opp.understanding_date),
            "Fecha-Alcance (Cierre del alcance)": formatDate(opp.scope_date),
            "Fecha-COE (Aprobacion Coe)": formatDate(opp.coe_date),
            "Fecha-Entrega (Fecha envío PP al comercial)": formatDate(opp.delivery_date),
            "Días (Fecha-Inicio y Fecha-COE)": diffDays(opp.start_date, opp.coe_date),
            "Días (Fecha-Inicio y Fecha-Entrega)": diffDays(opp.start_date, opp.delivery_date),
            "Estado Final": opp.status_name, "Motivo": opp.motive_name,
        };
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const headerStyle = {
        fill: { fgColor: { rgb: "B0E0E6" } }, font: { bold: true, sz: 10 }, alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    const baseCellStyle = {
        font: { sz: 10 }, alignment: { vertical: "center", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
    };
    for (let R = range.s.r; R <= range.e.r; ++R) {
        if (R === 0) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                ws[cellRef].s = headerStyle;
            }
            continue; 
        }
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({c: C, r: R});
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
            ws[cellRef].s = { ...baseCellStyle };
            if (C === 13) { ws[cellRef].s.fill = { fgColor: { rgb: "C6EFCE" } }; } 
            if (C === 14) { ws[cellRef].s.fill = { fgColor: { rgb: "C6EFCE" } }; }
        }
    }
    ws['!cols'] = [
        { wch: 5 }, { wch: 5 }, { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 30 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "JP Export");
    XLSX.writeFile(wb, `export_jp${getDownloadDateSuffix()}.xlsx`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch { return ''; }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-xs text-gray-800">
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="mx-auto px-4 py-2 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-md">
                    <Layers size={18} />
                </div>
                <h1 className="text-lg font-black text-gray-800 tracking-tight uppercase">Gestor de oportunidades</h1>
            </div>
            
            <div className="flex items-center space-x-2">
                 <button onClick={() => setIsAdminOpen(true)} className="flex items-center gap-1.5 p-1.5 text-gray-400 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-100 rounded-lg" title="Configuración">
                    <Settings size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Configuración</span>
                 </button>
                 
                 <button onClick={handleMoveToHistory} className="flex items-center space-x-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-black text-orange-600 hover:bg-orange-50 border-orange-200 uppercase tracking-widest shadow-sm transition-all">
                    <ArrowRightLeft size={12} />
                    <span>Mover a historicos</span>
                 </button>
                 
                 <button onClick={handleNewOpportunity} className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">
                    <Plus size={16} />
                    <span>Nueva Oportunidad</span>
                 </button>
            </div>
        </div>
      </header>

      <main className="px-4 py-2">
        <div className="flex items-center justify-between mb-1">
            <div className="flex space-x-1">
                <button onClick={() => setActiveTab('ON')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-t-lg ${activeTab === 'ON' ? 'bg-white border-t border-x border-gray-200 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>ON (Activas)</button>
                <button onClick={() => setActiveTab('ON-OUT')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-t-lg ${activeTab === 'ON-OUT' ? 'bg-white border-t border-x border-gray-200 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>ON-OUT (Históricos)</button>
                <button onClick={() => setActiveTab('TRASH')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-t-lg flex items-center gap-2 ${activeTab === 'TRASH' ? 'bg-white border-t border-x border-gray-200 text-red-600' : 'text-gray-400 hover:text-red-400'}`}>
                    <Trash2 size={12}/> PAPELERA
                </button>
            </div>
        </div>

        <div className="mb-2 flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" size={16} />
                <input 
                    type="text" placeholder="Buscar..." 
                    className="pl-10 pr-4 py-1.5 border-none rounded-lg text-xs w-full outline-none focus:ring-0 placeholder:text-gray-300 font-medium bg-gray-50/50"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
                 {activeTab !== 'TRASH' && (
                    <div className="flex gap-1">
                        <button onClick={exportPablo} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded hover:bg-green-100 text-[10px] font-bold" title="Exportar Pablo">
                            <Download size={12}/> <span>PABLO</span>
                        </button>
                        <button onClick={exportJP} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded hover:bg-blue-100 text-[10px] font-bold" title="Exportar JP">
                            <Download size={12}/> <span>JP</span>
                        </button>
                        <button onClick={exportDC} className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded hover:bg-orange-100 text-[10px] font-bold" title="Exportar DC">
                            <Download size={12}/> <span>DC</span>
                        </button>
                    </div>
                )}
            </div>
        </div>

        <OpportunityGrid 
            data={filteredOpps}
            onOpenDetail={(opp) => { setEditingOpp(opp); setIsNewRecord(false); setIsModalOpen(true); }}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onRestore={handleRestoreFromTrash}
            onDelete={handleDelete}
            onUpdate={fetchData}
            isHistoryView={activeTab === 'ON-OUT'}
            isTrashView={activeTab === 'TRASH'}
            accounts={accounts}
            employees={employees}
            statuses={statuses}
            oppTypes={oppTypes}
            motives={motives}
            // Passing filters to OpportunityGrid to render in header
            filters={{
                account: filterAccount,
                status: filterStatus,
                manager: filterManager,
                aprobador: filterAprobador,
                negocio: filterNegocio,
                tecnico: filterTecnico,
                kred: filterKRed
            }}
            setFilters={{
                setAccount: setFilterAccount,
                setStatus: setFilterStatus,
                setManager: setFilterManager,
                setAprobador: setFilterAprobador,
                setNegocio: setFilterNegocio,
                setTecnico: setFilterTecnico,
                setKRed: setFilterKRed
            }}
        />
      </main>

      {isModalOpen && <EditModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingOpp(undefined); setIsNewRecord(false); }} 
        onSave={handleSave}
        initialData={editingOpp}
        isNew={isNewRecord}
        isReadOnly={activeTab !== 'ON'}
        accounts={accounts}
        teams={employees}
        statuses={statuses}
        oppTypes={oppTypes}
      />}

      {isAdminOpen && <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
}

export default App;
