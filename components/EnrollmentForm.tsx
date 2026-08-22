import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Save, AlertCircle, CheckCircle2, UploadCloud, Image as ImageIcon, Loader2, Copy, Check, ArrowRight, ShieldCheck, Sparkles, Building2, User, CreditCard, Mail, Phone, Send, AtSign, KeyRound } from 'lucide-react';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { enrollAgentSupabase, fetchSedesSupabase } from '../services/supabaseService';
import { sendTelegramAlert } from '../services/notifyService';
import { compressImage } from '../services/storageUtils';
import { tacticalSound } from '../utils/soundEffects';
import { UserRole, Agent, Sede } from '../types';

interface EnrollmentFormProps {
  onSuccess: (newAgent?: Agent) => void;
  userRole?: UserRole;
  agents?: Agent[];
  onDirectLogin?: (id: string, pin: string) => void;
}

export const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ onSuccess, userRole, agents = [], onDirectLogin }) => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    email: '',
    whatsapp: '',
    telegram: '',
    redesSociales: '',
    sedeId: 'SEDE-JESUS-ES-EL-CENTRO',
    talento: '',
    bautizado: 'NO',
    relacion: '',
    nivel: userRole === UserRole.DIRECTOR_GENERAL ? 'LIDER' : 'ESTUDIANTE',
    pin: '',
    fechaNacimiento: '',
    preguntaSeguridad: '¿Cuál es tu versículo o palabra favorita?',
    respuestaSeguridad: '',
    referidoPor: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState('');
  const [registeredCreds, setRegisteredCreds] = useState<{ id: string; pin: string; name: string; sedeName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSedes = async () => {
      const data = await fetchSedesSupabase();
      if (data && data.length > 0) {
        setSedes(data);
      } else {
        setSedes([{ id: 'SEDE-JESUS-ES-EL-CENTRO', nombre: 'JESÚS ES EL CENTRO', isActive: true }]);
      }
    };
    loadSedes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // --- VALIDACIONES DE CAMPOS OBLIGATORIOS ---
    if (!formData.nombre.trim()) {
      setError("Por favor ingresa tu Nombre y Apellido.");
      return;
    }
    if (!formData.cedula.trim()) {
      setError("Por favor ingresa tu Cédula de Identidad (Requerido para evitar duplicados).");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@') || !formData.email.includes('.')) {
      setError("Por favor ingresa un Correo Electrónico válido (ej. correo@gmail.com).");
      return;
    }
    if (!formData.whatsapp.trim()) {
      setError("Por favor ingresa tu número de WhatsApp / Teléfono.");
      return;
    }
    if (!formData.respuestaSeguridad.trim()) {
      setError("Por favor define la respuesta a tu Pregunta Secreta (para recuperar tu PIN si lo olvidas).");
      return;
    }

    let photoUrl = '';
    // 1. Subir la imagen si existe (con compresión en cliente y fallback resistente)
    if (selectedFile) {
      setStatus('UPLOADING');
      try {
        let payload: File | string = selectedFile;
        try {
          const compressed = await compressImage(selectedFile, 800, 0.7);
          if (compressed) payload = `data:image/jpeg;base64,${compressed}`;
        } catch {
          payload = selectedFile;
        }

        const uploadResult = await uploadToCloudinary(payload);
        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
        }
      } catch (err: any) {
        console.warn('⚠️ Foto no enviada, asignando avatar táctico:', err?.message);
      }
    }

    // 2. Enviar los datos del formulario
    setStatus('SUBMITTING');
    const finalData = {
      ...formData,
      photoUrl,
      userRole: formData.nivel === 'DIRECTOR_GENERAL' ? UserRole.DIRECTOR_GENERAL :
                formData.nivel === 'DIRECTOR' ? UserRole.DIRECTOR :
                formData.nivel === 'LIDER' ? UserRole.LEADER : UserRole.STUDENT
    };

    const enrollResult = await enrollAgentSupabase(finalData);

    if (enrollResult.success && enrollResult.newId && enrollResult.newPin) {
      tacticalSound.playVictoryChime();
      const selectedSedeObj = sedes.find(s => s.id === formData.sedeId);
      const currentSedeName = selectedSedeObj?.nombre || 'JESÚS ES EL CENTRO';

      // 3. Notificar a Telegram
      const telegramMessage = `✅ <b>NUEVO RECLUTA REGISTRADO</b>\n\nUn nuevo agente se ha incorporado a las filas.\n\n<b>• Nombre:</b> ${formData.nombre.toUpperCase()}\n<b>• Cédula:</b> <code>${formData.cedula.toUpperCase()}</code>\n<b>• Correo:</b> ${formData.email}\n<b>• Sede:</b> ${currentSedeName}\n<b>• ID Táctico:</b> <code>${enrollResult.newId}</code>\n<b>• PIN:</b> <code>${enrollResult.newPin}</code>\n<b>• WhatsApp:</b> ${formData.whatsapp}\n<b>• Telegram:</b> ${formData.telegram || 'No indicado'}\n<b>• Redes:</b> ${formData.redesSociales || 'No indicado'}\n<b>• Talento:</b> ${formData.talento || 'Por definir'}\n\n<i>Acceso táctico listo para despliegue.</i>`;
      sendTelegramAlert(telegramMessage).catch(() => {});

      setStatus('SUCCESS');
      setRegisteredCreds({
        id: enrollResult.newId,
        pin: enrollResult.newPin,
        name: formData.nombre.toUpperCase(),
        sedeName: currentSedeName
      });
    } else {
      tacticalSound.playErrorBuzz();
      setStatus('ERROR');
      setError(enrollResult.error || 'Error al registrar el agente.');
      setTimeout(() => setStatus('IDLE'), 5000);
    }
  };

  const handleCopyCredentials = () => {
    if (!registeredCreds) return;
    const text = `🎖️ CREDENCIALES CONSAGRADOS 2026 🎖️\n• Agente: ${registeredCreds.name}\n• Sede: ${registeredCreds.sedeName}\n• ID de Acceso: ${registeredCreds.id}\n• PIN Secreto: ${registeredCreds.pin}\n\n📲 Ingresa en: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    tacticalSound.playReactionPop();
    setTimeout(() => setCopied(false), 3000);
  };

  // --- MODAL DE BIENVENIDA / CREDENCIAL INMEDIATA ---
  if (registeredCreds) {
    return (
      <div className="p-6 max-w-md mx-auto animate-in zoom-in-95 duration-500 font-montserrat">
        <div className="bg-[#001428] border-2 border-[#ffb700] rounded-[2.5rem] p-8 text-center shadow-[0_0_50px_rgba(255,183,0,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#ffb700]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex p-4 rounded-full bg-[#ffb700]/20 text-[#ffb700] mb-4 border border-[#ffb700]/30 shadow-lg">
            <ShieldCheck size={48} className="animate-pulse" />
          </div>

          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#ffb700] font-bebas block">
            INSCRIPCIÓN TÁCTICA APROBADA
          </span>
          <h2 className="text-2xl font-black uppercase text-white font-bebas tracking-wide mt-1">
            ¡BIENVENIDO A LAS FILAS!
          </h2>
          <p className="text-xs text-white/70 font-medium mt-1">
            {registeredCreds.name} • <span className="text-[#ffb700] font-bold">🏛️ {registeredCreds.sedeName}</span>
          </p>

          {/* Tarjeta de Credenciales */}
          <div className="my-6 p-5 rounded-2xl bg-black/60 border border-white/15 text-left space-y-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <span className="text-[9px] font-black uppercase text-white/50 font-bebas tracking-widest">ID TÁCTICO:</span>
              <span className="text-base font-black text-[#ffb700] font-mono tracking-wider">{registeredCreds.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-white/50 font-bebas tracking-widest">PIN DE ACCESO:</span>
              <span className="text-base font-black text-green-400 font-mono tracking-widest">{registeredCreds.pin}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCopyCredentials}
              className="w-full py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-2xl text-xs font-black uppercase font-bebas tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? "¡Credenciales Copiadas!" : "Copiar Credenciales"}
            </button>

            <button
              onClick={() => {
                if (onDirectLogin) {
                  onDirectLogin(registeredCreds.id, registeredCreds.pin);
                } else {
                  onSuccess();
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-[#ffb700] to-yellow-500 text-[#001f3f] rounded-2xl text-xs font-black uppercase font-bebas tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_25px_rgba(255,183,0,0.3)] flex items-center justify-center gap-2"
            >
              Entrar al Sistema <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- FORMULARIO DE REGISTRO ---
  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto animate-in fade-in duration-500 pb-24 font-montserrat">
      <div className="bg-[#001428] border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFB700] to-transparent opacity-50" />

        <div className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-[0.4em] font-bebas">
              ALISTAMIENTO CONSAGRADOS 2026
            </span>
            <h2 className="text-3xl font-bebas font-bold text-white tracking-widest leading-none">
              REGISTRO DE AGENTE
            </h2>
            <p className="text-xs text-white/50">Completa tus datos obligatorios para recibir tu ID Táctico y PIN personal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {/* Foto de Perfil Opcional */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[21/9] bg-black/40 border-2 border-dashed border-[#FFB700]/20 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-black/60 transition-all p-3 group relative overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Vista previa" className="h-full w-auto object-cover rounded-xl" />
              ) : (
                <div className="space-y-1 text-gray-400">
                  <UploadCloud size={24} className="mx-auto text-[#ffb700]" />
                  <p className="text-[10px] font-bold uppercase tracking-wider font-bebas text-white">Subir Foto o Selfie (Opcional)</p>
                  <p className="text-[8px] text-white/40">Toca aquí para seleccionar una imagen</p>
                </div>
              )}
            </div>

            {/* SECCIÓN 1: DATOS OBLIGATORIOS PRINCIPALES */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                <ShieldCheck size={14} className="text-[#ffb700]" />
                <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-widest font-bebas">
                  Datos de Identidad (Obligatorios)
                </span>
              </div>

              {/* 1. Nombre Completo */}
              <InputField
                label="Nombre y Apellido *"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="EJ. DAVID MENDOZA"
                icon={<User size={14} className="text-white/40" />}
                required
              />

              {/* 2. Cédula de Identidad (Anti-duplicados) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Cédula de Identidad *"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  placeholder="EJ. V-12345678"
                  icon={<CreditCard size={14} className="text-white/40" />}
                  required
                />

                <InputField
                  label="Correo Electrónico *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="EJ. AGENTE@GMAIL.COM"
                  icon={<Mail size={14} className="text-white/40" />}
                  required
                />
              </div>

              {/* 3. WhatsApp y Sede */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="WhatsApp / Teléfono *"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="EJ. +58 412 1234567"
                  icon={<Phone size={14} className="text-white/40" />}
                  required
                />

                <div>
                  <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5 block ml-1 font-bebas">
                    🏛️ Sede / Iglesia *
                  </label>
                  <select
                    name="sedeId"
                    value={formData.sedeId}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs font-bold outline-none focus:border-[#ffb700] transition-all appearance-none font-montserrat"
                  >
                    {sedes.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#001428] text-white">
                        🏛️ {s.nombre} {s.ciudad ? `(${s.ciudad})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: REDES Y COMUNICACIÓN (OPCIONALES) */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                <Send size={14} className="text-[#ffb700]" />
                <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-widest font-bebas">
                  Canales Digitales (Opcional)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Usuario de Telegram"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  placeholder="EJ. @MiUsuario"
                  icon={<Send size={14} className="text-white/40" />}
                />
                <InputField
                  label="Instagram / Redes Sociales"
                  name="redesSociales"
                  value={formData.redesSociales}
                  onChange={handleChange}
                  placeholder="EJ. @MiInstagram"
                  icon={<AtSign size={14} className="text-white/40" />}
                />
              </div>
            </div>

            {/* SECCIÓN 3: SERVICIO Y MEMBRESÍA */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                <Sparkles size={14} className="text-[#ffb700]" />
                <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-widest font-bebas">
                  Servicio y Vocación
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InputField
                  label="Talento / Área"
                  name="talento"
                  value={formData.talento}
                  onChange={handleChange}
                  placeholder="EJ. MÚSICA, MEDIOS"
                />
                <SelectField
                  label="¿Estás Bautizado?"
                  name="bautizado"
                  value={formData.bautizado}
                  onChange={handleChange}
                  options={['NO', 'SÍ']}
                />
                <InputField
                  label="Fecha Nacimiento"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  type="date"
                />
              </div>
            </div>

            {/* Si es Director General registrando a un líder/director */}
            {(userRole === UserRole.DIRECTOR_GENERAL || userRole === UserRole.DIRECTOR) && (
              <div>
                <label className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest mb-1.5 block ml-1 font-bebas">
                  Rango Táctico de Mando
                </label>
                <select
                  name="nivel"
                  value={formData.nivel}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-[#ffb700]/40 rounded-2xl py-3.5 px-4 text-[#ffb700] text-xs font-bold outline-none font-montserrat"
                >
                  <option value="ESTUDIANTE" className="bg-[#001428]">ESTUDIANTE / RECLUTA</option>
                  <option value="LIDER" className="bg-[#001428]">LÍDER TÁCTICO</option>
                  <option value="DIRECTOR" className="bg-[#001428]">DIRECTOR DE SEDE</option>
                  {userRole === UserRole.DIRECTOR_GENERAL && (
                    <option value="DIRECTOR_GENERAL" className="bg-[#001428]">DIRECTOR GENERAL</option>
                  )}
                </select>
              </div>
            )}

            {/* SECCIÓN 4: RECUPERACIÓN DE SEGURIDAD */}
            <div className="border-t border-white/10 pt-3 mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-[#ffb700]" />
                <span className="text-[9px] font-black text-[#ffb700] uppercase tracking-widest font-bebas">
                  🔐 Llave Secreta para Recuperar tu Contraseña *
                </span>
              </div>
              <InputField
                label="Pregunta Secreta *"
                name="preguntaSeguridad"
                value={formData.preguntaSeguridad}
                onChange={handleChange}
                placeholder="EJ. ¿CUÁL ES TU VERSÍCULO FAVORITO?"
                required
              />
              <InputField
                label="Respuesta Secreta *"
                name="respuestaSeguridad"
                value={formData.respuestaSeguridad}
                onChange={handleChange}
                placeholder="TU RESPUESTA SECRETA..."
                required
              />
            </div>

            {error && (
              <div className="text-left text-red-400 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in shake duration-300">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <p className="text-red-300 font-bold leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status !== 'IDLE'}
              className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all font-bebas bg-gradient-to-r from-[#ffb700] to-yellow-500 text-[#001f3f] shadow-xl hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {status === 'UPLOADING' ? <><Loader2 size={16} className="animate-spin" /> Subiendo Foto...</> :
               status === 'SUBMITTING' ? <><Loader2 size={16} className="animate-spin" /> Verificando y Registrando...</> :
               status === 'SUCCESS' ? <><CheckCircle2 size={16} /> ¡Agente Registrado!</> :
               status === 'ERROR' ? <><AlertCircle size={16} /> Error en Registro</> :
               <><Save size={16} /> Completar Registro Táctico</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, icon, ...props }: any) => (
  <div>
    <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5 block ml-1 font-bebas">{label}</label>
    <div className="relative">
      <input {...props} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs font-medium outline-none focus:border-[#ffb700] transition-all font-montserrat placeholder-white/20" />
      {icon && <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>}
    </div>
  </div>
);

const SelectField = ({ label, options, ...props }: any) => (
  <div>
    <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1.5 block ml-1 font-bebas">{label}</label>
    <select {...props} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs font-bold outline-none focus:border-[#ffb700] transition-all appearance-none font-montserrat">
      {options.map((o: string) => <option key={o} value={o} className="bg-[#001428] text-white">{o}</option>)}
    </select>
  </div>
);

export default EnrollmentForm;
