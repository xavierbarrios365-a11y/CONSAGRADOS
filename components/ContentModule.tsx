import React, { useState, useEffect } from 'react';
import { Guide, UserRole } from '../types';
import { fetchGuides, uploadFile, uploadGuideMetadata, deleteGuide } from '../services/sheetsService';
import { BookOpen, Download, Upload, Plus, X, FileText, Loader2, Search, Trash2, Link as LinkIcon } from 'lucide-react';

interface ContentModuleProps {
    userRole: UserRole;
}

const ContentModule: React.FC<ContentModuleProps> = ({ userRole }) => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'ESTUDIANTE' | 'LIDER'>('ALL');

    // Form state
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'ESTUDIANTE' | 'LIDER'>('ESTUDIANTE');
    const [uploadMethod, setUploadMethod] = useState<'FILE' | 'LINK'>('FILE');
    const [driveLink, setDriveLink] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        loadGuides();
    }, []);

    const loadGuides = async () => {
        setIsLoading(true);
        const data = await fetchGuides(userRole);
        setGuides(data || []);
        setIsLoading(false);
    };

    const handleDelete = async (guideId: string, name: string) => {
        if (!window.confirm(`¿ESTÁS SEGURO DE ELIMINAR EL RECURSO: "${name.toUpperCase()}"? UN DIRECTOR NO PUEDE DESHACER ESTA ACCIÓN.`)) return;

        try {
            const res = await deleteGuide(guideId);
            if (res.success) {
                alert('Recurso retirado del sistema.');
                loadGuides();
            } else {
                alert('Error al eliminar: ' + res.error);
            }
        } catch (err) {
            alert('Fallo en la comunicación con la base de datos.');
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newName) return;
        if (uploadMethod === 'FILE' && !selectedFile) return;
        if (uploadMethod === 'LINK' && !driveLink) return;

        setIsUploading(true);
        try {
            if (uploadMethod === 'FILE' && selectedFile) {
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    const uploadRes = await uploadFile(base64, selectedFile);

                    if (uploadRes.success && uploadRes.url) {
                        await finalizeMetadata(uploadRes.url);
                    } else {
                        alert('Error al subir archivo: ' + uploadRes.error);
                    }
                };
                reader.readAsDataURL(selectedFile);
            } else {
                await finalizeMetadata(driveLink);
            }
        } catch (err) {
            alert('Fallo táctico en la carga del recurso.');
        } finally {
            setIsUploading(false);
        }
    };

    const finalizeMetadata = async (url: string) => {
        const metadataRes = await uploadGuideMetadata(newName, newType, url);
        if (metadataRes.success) {
            alert('¡Contenido táctico desplegado!');
            setShowUploadModal(false);
            resetForm();
            loadGuides();
        } else {
            alert('Error en metadatos: ' + metadataRes.error);
        }
    };

    const resetForm = () => {
        setNewName('');
        setDriveLink('');
        setSelectedFile(null);
        setUploadMethod('FILE');
    };

    const filteredGuides = (guides || []).filter(g => {
        const nameStr = String(g.name || "");
        const matchesSearch = nameStr.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'ALL' || g.type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-orbitron font-bold text-white tracking-widest uppercase">Centro de Inteligencia</h2>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.4em] opacity-80">Recursos y Guías Estratégicas</p>
                </div>

                {userRole === UserRole.DIRECTOR && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    >
                        <Plus size={16} /> Cargar Material
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        placeholder="BUSCAR MATERIAL..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'ESTUDIANTE', 'LIDER'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f as any)}
                            className={`flex-1 py-4 px-2 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all ${activeFilter === f
                                    ? 'bg-blue-600/20 border-blue-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                }`}
                        >
                            {f === 'ALL' ? 'TODO' : f}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="text-blue-500 animate-spin" size={40} />
                    <p className="text-[8px] text-blue-500 font-black uppercase tracking-widest animate-pulse">Sincronizando Archivos...</p>
                </div>
            ) : filteredGuides.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {filteredGuides.map((guide) => (
                        <div key={guide.id} className="group bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 md:p-8 hover:border-blue-500/30 transition-all duration-500 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/5 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 overflow-hidden relative shrink-0">
                                <FileText size={24} />
                                <div className="absolute inset-0 bg-blue-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            <div className="flex-1 space-y-1 w-full overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${guide.type === 'LIDER' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                                        }`}>
                                        GUÍA {guide.type}
                                    </span>
                                </div>
                                <h3 className="text-sm font-orbitron font-bold text-white tracking-wide uppercase truncate w-full">{guide.name}</h3>
                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{new Date(guide.date).toLocaleDateString('es-VE')}</p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <a
                                    href={guide.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 md:flex-none p-4 rounded-2xl bg-white/5 hover:bg-blue-600 border border-white/5 hover:border-blue-500 text-gray-400 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <Download size={20} />
                                </a>

                                {userRole === UserRole.DIRECTOR && (
                                    <button
                                        onClick={() => handleDelete(guide.id, guide.name)}
                                        className="flex-1 md:flex-none p-4 rounded-2xl bg-white/5 hover:bg-red-600 border border-white/5 hover:border-red-500 text-gray-400 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <BookOpen className="mx-auto text-gray-700 mb-4" size={40} />
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">No se han encontrado recursos estratégicos</p>
                </div>
            )}

            {/* Modal de Carga */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in overflow-y-auto">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-blue-500/30 rounded-[3rem] p-8 md:p-10 space-y-6 md:space-y-8 shadow-[0_0_50px_rgba(37,99,235,0.2)] relative my-8">
                        <button
                            onClick={() => {
                                setShowUploadModal(false);
                                resetForm();
                            }}
                            className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center space-y-2">
                            <Upload className="mx-auto text-blue-500" size={32} />
                            <h3 className="text-white font-black uppercase tracking-widest text-sm">Cargar Nuevo Material</h3>
                            <p className="text-[9px] text-blue-500/70 font-bold uppercase tracking-[0.2em]">PROTOCOLO DE DISTRIBUCIÓN ACADÉMICA</p>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest ml-4">Nombre del Recurso</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="EJ. GUÍA DE LIDERAZGO V37"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-[10px] font-bold uppercase tracking-widest outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest ml-4">Tipo de Contenido</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {(['ESTUDIANTE', 'LIDER'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewType(t)}
                                            className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${newType === t
                                                    ? 'bg-blue-600 border-blue-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest ml-4">Método de Carga</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setUploadMethod('FILE')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${uploadMethod === 'FILE' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-gray-600'
                                            }`}
                                    >
                                        <Upload size={14} /> Archivo Local
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUploadMethod('LINK')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${uploadMethod === 'LINK' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-gray-600'
                                            }`}
                                    >
                                        <LinkIcon size={14} /> Link Drive
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest ml-4">Recurso Táctico</label>
                                {uploadMethod === 'FILE' ? (
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            required={uploadMethod === 'FILE'}
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            accept=".pdf,image/*"
                                        />
                                        <div className={`w-full py-10 rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${selectedFile ? 'bg-green-500/5 border-green-500/30' : 'bg-white/5 border-white/10 group-hover:border-blue-500/30'
                                            }`}>
                                            <FileText className={selectedFile ? 'text-green-500' : 'text-gray-600'} size={24} />
                                            <p className="text-[8px] font-black uppercase tracking-widest text-center px-6">
                                                {selectedFile ? selectedFile.name : 'Click o Arrastra Material'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                        <input
                                            type="url"
                                            required={uploadMethod === 'LINK'}
                                            placeholder="PEGAR ENLACE DE DRIVE O WEB"
                                            value={driveLink}
                                            onChange={(e) => setDriveLink(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white text-[9px] font-bold tracking-widest outline-none focus:border-blue-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || (uploadMethod === 'FILE' && !selectedFile) || (uploadMethod === 'LINK' && !driveLink) || !newName}
                                className="w-full bg-blue-600 py-6 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Transfiriendo Datos...</span>
                                    </div>
                                ) : 'Iniciar Carga de Material'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentModule;
