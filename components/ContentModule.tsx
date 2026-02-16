import React, { useState, useEffect, useRef } from 'react';
import { Guide, UserRole } from '../types';
import { fetchGuides, uploadFile, uploadGuideMetadata, deleteGuide } from '../services/sheetsService';
import { compressImage } from '../services/storageUtils';
import { BookOpen, Download, Upload, Plus, X, FileText, Loader2, Search, Trash2, Link } from 'lucide-react';

interface ContentModuleProps {
    userRole: UserRole;
}

const ContentModule: React.FC<ContentModuleProps> = ({ userRole }) => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'ESTUDIANTE' | 'LIDER'>(userRole === UserRole.STUDENT ? 'ESTUDIANTE' : 'ALL');

    // Form state - SIMPLIFICADO: solo archivo directo
    // Form state - MULTI-UPLOAD: soporta hasta 3 archivos
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'ESTUDIANTE' | 'LIDER'>('ESTUDIANTE');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadMode, setUploadMode] = useState<'FILE' | 'LINK'>('FILE');
    const [externalUrl, setExternalUrl] = useState('');
    const [uploadStatuses, setUploadStatuses] = useState<Record<string, 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (selectedFiles.length === 0 || !newName) return;

        setIsUploading(true);
        try {
            if (uploadMode === 'LINK') {
                if (!externalUrl || !newName) return;
                const metadataRes = await uploadGuideMetadata(newName, newType, externalUrl);
                if (metadataRes.success) {
                    setShowUploadModal(false);
                    resetForm();
                    loadGuides();
                } else {
                    alert('Error al guardar link: ' + metadataRes.error);
                }
                setIsUploading(false);
                return;
            }

            // MODO ARCHIVO
            if (selectedFiles.length === 0) return;
            const newStatuses: Record<string, any> = {};
            selectedFiles.forEach(f => newStatuses[f.name] = 'UPLOADING');
            setUploadStatuses(newStatuses);
            const uploadPromises = selectedFiles.map(async (file, index) => {
                try {
                    let finalBase64 = '';
                    if (file.type.startsWith('image/')) {
                        finalBase64 = await compressImage(file, 1200, 0.7);
                    } else {
                        const reader = new FileReader();
                        finalBase64 = await new Promise<string>((resolve, reject) => {
                            reader.onload = () => resolve((reader.result as string).split(',')[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                    }

                    const uploadRes = await uploadFile(finalBase64, file);

                    if (uploadRes.success && uploadRes.url) {
                        // Usar el nombre base + index si hay varios, o solo el nombre si es uno
                        const finalName = selectedFiles.length > 1 ? `${newName} (${index + 1})` : newName;
                        const metadataRes = await uploadGuideMetadata(finalName, newType, uploadRes.url);

                        if (metadataRes.success) {
                            setUploadStatuses(prev => ({ ...prev, [file.name]: 'SUCCESS' }));
                        } else {
                            throw new Error(metadataRes.error || 'Error en metadatos');
                        }
                    } else {
                        throw new Error(uploadRes.error || 'Fallo en subida');
                    }
                } catch (err) {
                    setUploadStatuses(prev => ({ ...prev, [file.name]: 'ERROR' }));
                    throw err;
                }
            });

            await Promise.allSettled(uploadPromises);

            const results = Object.values(newStatuses);
            if (results.every(s => s === 'SUCCESS')) {
                // alert('¡Todo el contenido táctico ha sido desplegado!');
            }

            setTimeout(() => {
                setShowUploadModal(false);
                resetForm();
                loadGuides();
                setIsUploading(false);
            }, 1500);

        } catch (err) {
            console.error('Multi-upload error:', err);
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 3) {
            alert('LÍMITE TÁCTICO: Máximo 3 archivos permitidos.');
            return;
        }

        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const oversized = files.find(f => f.size > MAX_SIZE);
        if (oversized) {
            alert(`ARCHIVO DEMASIADO GRANDE: "${oversized.name}" excede el límite de 10MB. Para libros pesados, sube a Drive directamente y comparte el link.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFiles(files);
    };

    const resetForm = () => {
        setNewName('');
        setExternalUrl('');
        setSelectedFiles([]);
        setUploadStatuses({});
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredGuides = (guides || []).filter(g => {
        const nameStr = String(g.name || "");
        const matchesSearch = nameStr.toLowerCase().includes(searchQuery.toLowerCase());

        // RESTRICCIÓN TÁCTICA: El estudiante solo ve material de estudiante
        const effectiveFilter = userRole === UserRole.STUDENT ? 'ESTUDIANTE' : activeFilter;
        const matchesFilter = effectiveFilter === 'ALL' || g.type === effectiveFilter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-4 md:p-10 space-y-6 animate-in fade-in pb-28 max-w-4xl mx-auto">
            {/* Header Mobile-First */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg md:text-2xl font-bebas font-bold text-white tracking-widest uppercase">Material</h2>
                    <p className="text-[8px] md:text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] opacity-80 font-montserrat">Recursos Académicos</p>
                </div>

                {userRole === UserRole.DIRECTOR && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-[#ffb700] hover:bg-[#ffb700]/90 text-[#001f3f] px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_10px_30px_rgba(255,183,0,0.2)] font-bebas"
                    >
                        <Plus size={18} /> Subir Archivo
                    </button>
                )}
            </div>

            {/* Filtros compactos para móvil */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                    <input
                        type="text"
                        placeholder="BUSCAR..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#000c19]/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#ffb700] transition-all font-montserrat"
                    />
                </div>
                {userRole !== UserRole.STUDENT && (
                    <div className="flex gap-2">
                        {['ALL', 'ESTUDIANTE', 'LIDER'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f as any)}
                                className={`flex-1 py-3 px-2 rounded-xl text-[7px] font-black uppercase tracking-widest border transition-all font-bebas ${activeFilter === f
                                    ? 'bg-[#ffb700]/20 border-[#ffb700] text-[#ffb700]'
                                    : 'bg-white/5 border-white/10 text-gray-500'
                                    }`}
                            >
                                {f === 'ALL' ? 'TODO' : f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista de Guías - Mobile Optimized */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <Loader2 className="text-[#ffb700] animate-spin" size={32} />
                    <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest animate-pulse font-bebas">Sincronizando...</p>
                </div>
            ) : filteredGuides.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {filteredGuides.map((guide) => (
                        <div key={guide.id} className="group bg-[#001833] border border-white/5 rounded-2xl p-4 hover:border-[#ffb700]/30 transition-all duration-300 font-montserrat">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-[#ffb700]/10 flex items-center justify-center text-[#ffb700] shrink-0">
                                    <FileText size={20} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${guide.type === 'LIDER' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                                            }`}>
                                            {guide.type}
                                        </span>
                                    </div>
                                    <h3 className="text-[11px] font-bold text-white uppercase truncate font-bebas tracking-wider">{guide.name}</h3>
                                    <p className="text-[7px] text-gray-600 font-bold uppercase">{new Date(guide.date).toLocaleDateString('es-VE')}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <a
                                        href={guide.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-3 rounded-xl bg-[#ffb700]/10 hover:bg-[#ffb700] border border-[#ffb700]/20 text-[#ffb700] hover:text-[#001f3f] transition-all active:scale-95"
                                    >
                                        <Download size={16} />
                                    </a>

                                    {userRole === UserRole.DIRECTOR && (
                                        <button
                                            onClick={() => handleDelete(guide.id, guide.name)}
                                            className="p-3 rounded-xl bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white transition-all active:scale-95"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl">
                    <BookOpen className="mx-auto text-gray-700 mb-3" size={32} />
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Sin recursos disponibles</p>
                </div>
            )}

            {/* Modal de Carga - SIMPLIFICADO para Mobile */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[200] bg-[#001f3f]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-[#001833] border border-[#ffb700]/30 rounded-[2.5rem] p-6 space-y-5 shadow-[0_0_50px_rgba(255,183,0,0.1)] relative font-montserrat">
                        <button
                            onClick={() => {
                                setShowUploadModal(false);
                                resetForm();
                            }}
                            className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center space-y-1 pt-2">
                            <Upload className="mx-auto text-[#ffb700]" size={28} />
                            <h3 className="text-white font-black uppercase tracking-widest text-sm font-bebas">Subir Material</h3>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            {/* Selector de Modo */}
                            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('FILE')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${uploadMode === 'FILE' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500'}`}
                                >
                                    <Upload size={14} /> Archivo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('LINK')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${uploadMode === 'LINK' ? 'bg-[#ffb700] text-[#001f3f]' : 'text-gray-500'}`}
                                >
                                    <Link size={14} /> Link Drive
                                </button>
                            </div>

                            {/* Nombre */}
                            <div className="space-y-1">
                                <label className="text-[7px] text-gray-500 font-black uppercase tracking-widest ml-3">Nombre del Material</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="EJ. MANUAL DE COMBATE"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#ffb700] font-bebas"
                                />
                            </div>

                            {/* Tipo */}
                            <div className="space-y-1">
                                <label className="text-[7px] text-gray-500 font-black uppercase tracking-widest ml-3">Tipo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['ESTUDIANTE', 'LIDER'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewType(t)}
                                            className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all font-bebas ${newType === t
                                                ? 'bg-[#ffb700] border-[#ffb700] text-[#001f3f]'
                                                : 'bg-white/5 border-white/10 text-gray-500'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input de Archivo o Link */}
                            {uploadMode === 'FILE' ? (
                                <div className="space-y-1">
                                    <label className="text-[7px] text-gray-500 font-black uppercase tracking-widest ml-3">Archivos (Máx 3)</label>
                                    <div className="relative">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            required
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            accept=".pdf,.doc,.docx,image/*"
                                        />
                                        <div className={`w-full py-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${selectedFiles.length > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                            <Plus className={selectedFiles.length > 0 ? 'text-green-500' : 'text-gray-400'} size={24} />
                                            <p className="text-[8px] font-black uppercase tracking-widest text-center px-4 text-gray-400 font-bebas">
                                                {selectedFiles.length > 0 ? `${selectedFiles.length} ARCHIVOS SELECCIONADOS` : 'Toca para seleccionar'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-[7px] text-gray-500 font-black uppercase tracking-widest ml-3">URL de Google Drive</label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://drive.google.com/..."
                                        value={externalUrl}
                                        onChange={(e) => setExternalUrl(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-[9px] font-bold outline-none focus:border-[#ffb700]"
                                    />
                                    <p className="text-[6px] text-gray-600 uppercase font-black tracking-widest mt-1 ml-2">Asegúrate de que el link sea público (Cualquiera con el enlace).</p>
                                </div>
                            )}

                            {/* Lista de archivos seleccionados con sus estados */}
                            {selectedFiles.length > 0 && (
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                    {selectedFiles.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText size={14} className="text-gray-500 shrink-0" />
                                                <span className="text-[8px] text-white/70 font-bold truncate">{file.name}</span>
                                            </div>
                                            <div className="shrink-0">
                                                {uploadStatuses[file.name] === 'UPLOADING' && <Loader2 size={12} className="text-[#ffb700] animate-spin" />}
                                                {uploadStatuses[file.name] === 'SUCCESS' && <Download size={12} className="text-green-500" />}
                                                {uploadStatuses[file.name] === 'ERROR' && <X size={12} className="text-red-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isUploading || selectedFiles.length === 0 || !newName}
                                className="w-full bg-[#ffb700] py-5 rounded-xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bebas"
                            >
                                {isUploading ? 'Desplegando Contenido...' : 'Publicar Material'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentModule;
