<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🛡️ CONSAGRADOS 2026 - Sistema de Gestión Táctica

> **No pedimos permiso para ser luz** - Plataforma de gestión de comunidad religiosa con interfaz militar/táctica.

## 📋 Descripción

Sistema completo de gestión de miembros para comunidades religiosas con las siguientes características:

- 🔐 **Autenticación por ID/PIN** con 3 niveles de acceso (Director, Líder, Estudiante)
- 📷 **Scanner QR** para registro de asistencia con validación de 1 escaneo/día
- 👥 **Directorio de Agentes** con búsqueda y visualización de perfiles
- ✍️ **Inscripción de Nuevos Agentes** con subida de fotos a Google Drive
- ⭐ **Sistema de Puntos XP** (Biblia, Apuntes, Liderazgo)
- 📊 **Centro de Inteligencia** (Dashboard para Directores)
- 🤖 **Integración con Gemini AI** para análisis tácticos
- 📲 **Notificaciones Telegram** automáticas

## 🛠️ Tecnologías

| Frontend | Backend |
|----------|---------|
| React 19.2.4 | Google Apps Script |
| TypeScript 5.8.2 | Google Sheets (BD) |
| Vite 6.2.0 | Google Drive (Fotos) |
| jsQR | Telegram Bot API |
| Lucide React | Gemini AI |

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js 18+

### Pasos

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar API Key de Gemini:**
   Edita el archivo `.env.local`:
   ```env
   GEMINI_API_KEY=tu_api_key_aquí
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

## 📂 Estructura del Proyecto

```
consagrados-2026/
├── App.tsx                    # Componente principal
├── types.ts                   # Tipos TypeScript
├── components/
│   ├── Layout.tsx             # Layout con navegación
│   ├── DigitalIdCard.tsx      # Tarjeta ID digital
│   ├── EnrollmentForm.tsx     # Formulario inscripción
│   └── IntelligenceCenter.tsx # Dashboard directores
├── services/
│   ├── supabaseService.ts     # Núcleo de datos Supabase
│   └── geminiService.ts       # Gemini AI
└── backend/
    └── Code.gs                # Backend Apps Script
```

## ⚙️ Configuración del Backend

El archivo `backend/Code.gs` debe desplegarse como Web App en Google Apps Script con las siguientes configuraciones:

```javascript
const CONFIG = {
  SPREADSHEET_ID: 'tu_spreadsheet_id',
  DRIVE_FOLDER_ID: 'tu_drive_folder_id',
  TELEGRAM_BOT_TOKEN: 'tu_bot_token',
  TELEGRAM_CHAT_ID: 'tu_chat_id'
};
```

## 📱 Funcionalidades por Rol

| Funcionalidad | Director | Líder | Estudiante |
|---------------|----------|-------|------------|
| Ver Perfil | ✅ | ✅ | ✅ |
| Directorio | ✅ | ✅ | ❌ |
| Scanner | ✅ | ✅ | ❌ |
| Inscripciones | ✅ | ✅ | ❌ |
| Centro Intel | ✅ | ❌ | ❌ |

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.

---

**Desarrollado con 💙 para la comunidad CONSAGRADOS 2026**
