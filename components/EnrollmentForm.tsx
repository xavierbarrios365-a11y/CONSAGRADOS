
import React, { useState, useRef } from 'react';
import { UserPlus, Save, AlertCircle, CheckCircle2, UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadImage, enrollAgent } from '../services/sheetsService';

interface EnrollmentFormProps {
  onSuccess: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    whatsapp: '',
    talento: '',
    bautizado: 'NO',
    relacion: '',
    nivel: 'ESTUDIANTE',
    fechaNacimiento: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.nombre || !formData.whatsapp) {
      setError("Nombre y WhatsApp son requeridos.");
      return;
    }

    let photoUrl = '';
    // 1. Subir la imagen si existe
    if (selectedFile) {
      setStatus('UPLOADING');
      try {
        const base64 = await fileToBase64(selectedFile);
        const uploadResult = await uploadImage(base64, selectedFile);
        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
        } else {
          throw new Error(uploadResult.error || 'Fallo al subir la imagen.');
        }
      } catch (err: any) {
        setStatus('ERROR');
        setError(err.message);
        setTimeout(() => setStatus('IDLE'), 4000);
        return;
      }
    }
    
    // 2. Enviar los datos del formulario
    setStatus('SUBMITTING');
    const finalData = { ...formData, photoUrl };
    const enrollResult = await enrollAgent(finalData);

    if (enrollResult.success) {
      setStatus('SUCCESS');
      // Limpiar formulario
      setFormData({ nombre: '', whatsapp: '', talento: '', bautizado: 'NO', relacion: '', nivel: 'ESTUDIANTE', fechaNacimiento: '' });
      setSelectedFile(null);
      setImagePreview(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
      
      setTimeout(() => {
        setStatus('IDLE');
        onSuccess(); // Llamar a la función de éxito para refrescar la lista de agentes
      }, 2000);
    } else {
      setStatus('ERROR');
      setError(enrollResult.error || 'Error al registrar el agente.');
      setTimeout(() => setStatus('IDLE'), 4000);
    }
  };
  
  const getButtonContent = () => {
    switch(status) {
      case 'UPLOADING': return <><Loader2 size={18} className="animate-spin" /> Subiendo Foto...</>;
      case 'SUBMITTING': return <><Loader2 size={18} className="animate-spin" /> Registrando Agente...</>;
      case 'SUCCESS': return <><CheckCircle2 size={18} /> Agente Registrado</>;
      case 'ERROR': return <><AlertCircle size={18} /> Error en Sistema</>;
      default: return <><Save size={18} /> Completar Inscripción</>;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto animate-in fade-in duration-500 pb-24">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        <div className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-orbitron font-bold text-white tracking-widest">INSCRIPCIÓN</h2>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.4em]">Registro de Nuevo Agente</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
             <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 transition-all p-4"
             >
               {imagePreview ? (
                 <img src={imagePreview} alt="Vista previa" className="max-h-full w-auto object-contain rounded-lg" />
               ) : (
                 <div className="space-y-2 text-gray-500">
                   <UploadCloud size={32} className="mx-auto" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Subir Foto de Perfil</p>
                   <p className="text-xs">Toca para seleccionar una imagen</p>
                 </div>
               )}
             </div>

            <div className="space-y-4">
               <InputField label="Nombre Completo *" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="EJ. JUAN PÉREZ" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <InputField label="WhatsApp *" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="+54..." />
                 <InputField label="Fecha Nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <InputField label="Talento / Habilidad" name="talento" value={formData.talento} onChange={handleChange} placeholder="EJ. MÚSICA, DISEÑO..." />
                 <SelectField label="Nivel de Acceso" name="nivel" value={formData.nivel} onChange={handleChange} options={['ESTUDIANTE', 'LIDER', 'DIRECTOR']} />
               </div>
               <SelectField label="Bautizado" name="bautizado" value={formData.bautizado} onChange={handleChange} options={['SÍ', 'NO']} />
               <TextAreaField label="Relación con Dios" name="relacion" value={formData.relacion} onChange={handleChange} placeholder="Describe brevemente..." />
            </div>

            {error && <div className="text-center text-red-500 bg-red-500/10 p-3 rounded-lg text-xs font-bold">{error}</div>}

            <button type="submit" disabled={status !== 'IDLE'} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all ${
                status !== 'IDLE' ? (status === 'SUCCESS' ? 'bg-green-600' : status === 'ERROR' ? 'bg-red-600' : 'bg-gray-800 text-gray-500') : 'bg-blue-600 hover:bg-blue-500 shadow-xl'
            } text-white`}>
              {getButtonContent()}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Componentes de Formulario Reutilizables ---
const InputField = ({ label, ...props }) => (
  <div>
    <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-2 block ml-1">{label}</label>
    <input {...props} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all" />
  </div>
);

const SelectField = ({ label, options, ...props }) => (
  <div>
    <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-2 block ml-1">{label}</label>
    <select {...props} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all appearance-none">
      {options.map(o => <option key={o} value={o} className="bg-black">{o}</option>)}
    </select>
  </div>
);

const TextAreaField = ({ label, ...props }) => (
  <div>
    <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-2 block ml-1">{label}</label>
    <textarea {...props} rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all resize-none" />
  </div>
);
