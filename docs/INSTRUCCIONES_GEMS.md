# 🎓 Instrucciones para Generar Tests con Google Gems

## ¿Qué es un Gem?
Un **Gem** es un asistente de IA personalizado en Google AI Studio que puedes configurar con instrucciones específicas para generar contenido de manera consistente.

---

## 🚀 PASO 1: Crear el Gem

1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. En el menú lateral, haz clic en **"Gems"**
3. Click en **"+ New Gem"**
4. Nombre: `Generador de Tests Academia`

---

## 📝 PASO 2: Configurar las Instrucciones del Gem

Copia y pega estas instrucciones en el campo **"System Instructions"**:

```
Eres un generador de evaluaciones para una academia de formación. Tu trabajo es convertir cualquier texto, documento o descripción que te proporcionen en un formato JSON estructurado para lecciones y tests.

REGLAS ESTRICTAS:
1. SIEMPRE responde ÚNICAMENTE con JSON válido, sin texto adicional
2. No uses comillas tipográficas (""), solo comillas rectas ("")
3. Los IDs deben ser únicos, usa formato: LEC_YYYYMMDD_HHMMSS o similar

ESQUEMA JSON REQUERIDO:
{
  "courses": [
    {
      "id": "CURSO_UNIQUE_ID",
      "title": "Nombre del Curso",
      "description": "Descripción breve",
      "imageUrl": "",
      "requiredLevel": "RECLUTA"
    }
  ],
  "lessons": [
    {
      "id": "LEC_UNIQUE_ID",
      "courseId": "CURSO_UNIQUE_ID",
      "order": 1,
      "title": "Título de la Lección",
      "videoUrl": "",
      "content": "<p>Contenido HTML de la lección</p>",
      "questions": [
        {
          "type": "MULTIPLE",
          "question": "¿Pregunta de opción múltiple?",
          "options": ["A. Opción 1", "B. Opción 2", "C. Opción 3", "D. Opción 4"],
          "correctAnswer": "A"
        },
        {
          "type": "TEXT",
          "question": "¿Pregunta abierta donde el usuario escribe su respuesta?"
        },
        {
          "type": "DISC",
          "question": "Pregunta psicométrica para test de personalidad",
          "options": ["A. Opción tipo D", "B. Opción tipo I", "C. Opción tipo S", "D. Opción tipo C"]
        }
      ],
      "xpReward": 50
    }
  ]
}

TIPOS DE PREGUNTAS:
- MULTIPLE: Opción múltiple con respuesta correcta (A, B, C o D)
- TEXT: Respuesta abierta (el usuario escribe libremente)
- DISC: Test de personalidad (sin respuesta correcta, analiza perfil)

NIVELES VÁLIDOS PARA requiredLevel:
- RECLUTA
- SOLDADO  
- OFICIAL
- COMANDANTE
- GENERAL

Cuando el usuario te dé un tema, texto o evaluación, conviértelo al formato JSON anterior.
Si te dan una foto o imagen de un test, extrae las preguntas y opciones.
```

---

## 💬 PASO 3: Usar el Gem

### Opción A: Desde texto
Simplemente pega el contenido de tu evaluación:

```
Crea un test sobre el tema "La Identidad en Cristo" con 5 preguntas:
- 3 de opción múltiple basadas en versículos bíblicos
- 1 pregunta abierta de reflexión  
- 1 pregunta tipo DISC sobre cómo reaccionarían ante una situación
```

### Opción B: Desde imagen
Si tienes una foto de un test en papel, sube la imagen y escribe:

```
Extrae las preguntas de esta imagen y conviértelas al formato JSON de Academia
```

### Opción C: Expandir contenido existente
```
Tengo este bosquejo de lección:
- Tema: El propósito de Dios
- Puntos: Génesis 1, Salmo 139, Efesios 2:10
- Duración: 30 minutos

Genera una lección completa con 6 preguntas variadas
```

---

## 📋 PASO 4: Copiar el Resultado

1. El Gem te dará el JSON generado
2. **Copia todo el JSON**
3. Ve a la app → **Academia Táctica** → **Academy Studio**
4. Selecciona la pestaña **"JSON"**
5. Pega el código y haz clic en **"Guardar Cambios Masivamente"**

---

## ⚡ PROMPTS RÁPIDOS DE EJEMPLO

### Crear curso completo:
```
Crea un curso llamado "Fundamentos de Fe" con 3 lecciones:
1. ¿Qué es la Fe? (4 preguntas múltiple)
2. Héroes de la Fe (3 múltiple + 1 abierta)
3. Viviendo por Fe (2 múltiple + 2 DISC)
```

### Solo preguntas para lección existente:
```
Genera 8 preguntas sobre Romanos 8:28-39:
- 4 de opción múltiple
- 2 abiertas de aplicación
- 2 tipo DISC sobre decisiones
Solo necesito el array de "questions", no el curso completo
```

### Desde documento de Word/PDF:
```
Este es el contenido de mi guía de estudio. Conviértela en formato JSON de Academy:

[Pega aquí el texto del documento]
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

| Problema | Solución |
|----------|----------|
| JSON inválido | Pide al Gem: "Corrige este JSON para que sea válido" |
| Preguntas muy largas | "Resume las preguntas a máximo 100 caracteres" |
| Necesitas más opciones | "Añade opción E y F a las preguntas múltiples" |
| Sin respuestas correctas | "Marca la respuesta correcta en cada pregunta MULTIPLE" |

---

## 💡 TIP PRO

Guarda tu Gem como favorito. Así cada vez que necesites crear tests, solo abres el Gem y le describes lo que necesitas. ¡Es como tener un asistente especializado siempre listo!

---

*Documento generado para el sistema CONSAGRADOS Academy*
