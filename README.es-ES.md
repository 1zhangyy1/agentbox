# AgentBox

**Herramienta portátil para el empaquetado y compartido de configuraciones de agentes de IA**

AgentBox empaqueta el entorno completo de tu agente de IA (ajustes, habilidades, memoria, sesiones) en un único archivo portátil que puede compartirse entre proyectos, máquinas y equipos.

English | [简体中文](./README.zh-CN.md)

## ¿Qué problema resuelve?

Cuando trabajas con agentes de IA como Claude Code, acumulas un contexto valioso:
- Habilidades y flujos de trabajo personalizados
- Instrucciones del proyecto (CLAUDE.md)
- Memoria e historial de conversaciones
- Configuraciones de servidores MCP
- Ajustes de plugins

**El problema:** Este contexto queda atrapado en tu máquina. Cambiar a un nuevo proyecto, compartir con compañeros de equipo o migrar a una computadora nueva significa empezar desde cero.

**La solución:** AgentBox empaqueta todo en un archivo `.agentbox` que puedes compartir, respaldar o importar en cualquier lugar.

## Características Principales

### 📦 Exportar
Empaqueta todo el entorno de tu agente con un solo comando:
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
```

Crea un paquete portátil que contiene:
- Instrucciones del proyecto (CLAUDE.md)
- Ajustes y plugins
- Metadatos de habilidades
- Archivos de memoria
- Historial de conversaciones recientes (últimos 5 mensajes)
- Configuraciones de MCP

### 📥 Importar
Importa la configuración del agente de otra persona:
```bash
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

El paquete se descomprime en `.agentbox/` con archivos de vista previa optimizados para IA en `.agentbox/preview/` que muestran:
- Mensajes y planes recientes
- Extractos de memoria
- Resumen de ajustes

### 🔒 Seguridad
Redacción automática de datos sensibles:
- Claves API $\rightarrow$ `{{BINDING_NAME}}`
- Rutas absolutas $\rightarrow$ `{{HOME}}`, `{{PROJECT_ROOT}}`
- Tokens y secretos $\rightarrow$ Redactados

Verifica qué fue redactado en: `.agentbox/meta/security-audit.json`

## Casos de Uso

**Onboarding de Equipo**
```bash
# Comparte tu configuración probada con nuevos miembros del equipo
npx @nuomiji/agentbox@latest export --output team-config.agentbox
```

**Migración de Máquina**
```bash
# Máquina antigua
npx @nuomiji/agentbox@latest export --output my-setup.agentbox

# Máquina nueva
npx @nuomiji/agentbox@latest import my-setup.agentbox
```

**Respaldo de Configuración**
```bash
npx @nuomiji/agentbox@latest export --output backup-$(date +%Y%m%d).agentbox
```

**Experimentación Segura**
```bash
# Guardar estado actual
npx @nuomiji/agentbox@latest export --output baseline.agentbox

# Probar cambios...

# Restaurar si es necesario
npx @nuomiji/agentbox@latest import baseline.agentbox
```

## Integración con Asistente de IA

AgentBox incluye una habilidad que enseña a los asistentes de IA a utilizarlo automáticamente.

**Instalar la habilidad:**

Usa el comando `npx skills` para una instalación con un solo clic:
```bash
npx skills add https://github.com/1zhangyy1/agentbox --skill agentbox
```

**O instalar manualmente:**
```bash
git clone https://github.com/1zhangyy1/agentbox.git
cp -r agentbox/skills/agentbox /path/to/your/project/.claude/skills/
```

**Una vez instalado, solo di:**
- "Exporta mi configuración actual"
- "Importa esa configuración de agente"
- "¿Qué hay en este archivo agentbox?"

La IA utilizará automáticamente los comandos de AgentBox.

## Instalación

**No requiere instalación** - ejecútalo directamente con npx:
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

Esto siempre utiliza la versión más reciente.

## Qué se captura

| Capa | Contenido |
|-------|---------|
| Perfil | Instrucciones del proyecto CLAUDE.md |
| Ajustes | Plugins, servidores MCP |
| Habilidades | Metadatos de habilidades instaladas |
| Memoria | Archivos de memoria del proyecto |
| Sesión | Transcripciones y planes recientes |

## El Formato de Archivo .agentbox

Un archivo `.agentbox` es un **archivo ZIP portátil** (típicamente de 1-10MB) que contiene el entorno completo de tu agente:

```
example.agentbox (archivo ZIP)
├── box.yaml                      # Metadatos del paquete
├── bindings.template.env         # Plantilla para claves API/secretos
├── layers/                       # Capas de configuración
│   ├── profile.yaml             # Instrucciones de CLAUDE.md
│   ├── skills.yaml              # Habilidades instaladas
│   ├── memory.yaml              # Archivos de memoria
│   ├── plugins.yaml             # Ajustes de plugins
│   ├── session.yaml             # Metadatos de sesión
│   └── ...                      # Otros ajustes
├── session/                      # Historial de conversación
│   ├── transcripts/             # Logs completos de conversación (.jsonl)
│   └── plans/                   # Archivos de plan (.md)
├── meta/
│   └── security-audit.json      # Qué fue redactado
└── resolved.yaml                 # Configuración fusionada
```

**Características clave:**
- **Portátil:** Archivo único, fácil de compartir vía email, Slack o Git.
- **Seguro:** Claves API y rutas redactadas automáticamente.
- **Completo:** Todo lo necesario para recrear el entorno de tu agente.
- **Legible para humanos:** Descomprime para inspeccionar el contenido (YAML + Markdown).

**Después de importar, obtienes:**
```
tu-proyecto/
├── .agentbox/                    # Paquete descomprimido
│   ├── preview/                 # Resúmenes optimizados para IA
│   │   ├── session.md          # Mensajes y planes recientes
│   │   ├── memory.md           # Extractos de memoria
│   │   ├── settings.json       # Resumen de ajustes
│   │   └── profile.md          # Vista previa de instrucciones
│   ├── layers/                  # Configuración raw
│   └── session/                 # Transcripciones completas
├── CLAUDE.md                     # Importado (si no existía)
└── .claude/settings.local.json   # Ajustes fusionados
```

## Estructura de Archivos Tras la Importación

El directorio `.agentbox/preview/` contiene resúmenes optimizados para IA que te ayudan a entender qué se importó sin tener que leer los archivos YAML crudos.

## Requisitos

- Node.js >= 22.0.0
- Claude Code (host soportado actualmente)

## Desarrollo

```bash
git clone https://github.com/1zhangyy1/agentbox.git
cd agentbox
npm install
npm run build
```

## Hoja de Ruta (Roadmap)

### 🚀 Próximamente

**Soporte Multi-Plataforma**
- [ ] Adaptador Codex - Soporte para importar/exportar configuración para la plataforma Codex
- [ ] Adaptador OpenClaw - Soporte para conversión de configuración para la plataforma OpenClaw
- [ ] Migración Cross-Plataforma - Migra configuraciones de agentes entre diferentes plataformas de IA a la perfección

**Objetivo:** Convertir a AgentBox en el verdadero estándar cross-plataforma de configuración de agentes, permitiéndote migrar y compartir tu entorno de agente fácilmente independientemente de la plataforma de IA que utilices.

## Enlaces

- **npm:** [@nuomiji/agentbox](https://www.npmjs.com/package/@nuomiji/agentbox)
- **GitHub:** [1zhangyy1/agentbox](https://github.com/1zhangyy1/agentbox)
- **Issues:** [Reportar errores](https://github.com/1zhangyy1/agentbox/issues)

## Licencia

MIT © zhangyy
