import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    onLogin: (user: { name: string; role: 'supervisor' | 'assistant' }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'supervisor' | 'assistant'>('assistant');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulación de login - En el futuro conectar con backend
        if (username && password) {
            onLogin({ name: username, role });
        } else {
            alert('Por favor complete todos los campos');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-8 text-center">
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">Bienvenido</h2>
                    <p className="text-blue-100 text-sm mt-2 font-medium">Gestor de Oportunidades</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Usuario</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Ingresa tu usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button 
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Perfil</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                className={`py-2 px-4 rounded-lg text-xs font-bold uppercase transition-all ${role === 'supervisor' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                onClick={() => setRole('supervisor')}
                            >
                                Supervisor
                            </button>
                            <button
                                type="button"
                                className={`py-2 px-4 rounded-lg text-xs font-bold uppercase transition-all ${role === 'assistant' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                onClick={() => setRole('assistant')}
                            >
                                Asistente
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all transform active:scale-95"
                    >
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
