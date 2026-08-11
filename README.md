# PreSett

**Gestor visual de configuración para Gentle-AI**

PreSett es una aplicación web local que proporciona una interfaz gráfica para gestionar la configuración de Gentle-AI sin necesidad de editar archivos JSON/TOML manualmente.

## ¿Qué hace PreSett?

✅ **Gestiona configuración existente:**
- Cambiar modelos asignados a agentes SDD/JD
- Crear/editar/switch entre perfiles SDD
- Toggle de componentes (engram, sdd, skills, etc.)
- Cambiar persona (gentleman/neutral/custom)
- Cambiar SDD mode (single/multi)
- Ver/gestionar backups (read-only)
- Ejecutar sync configs

❌ **NO instala nada:**
- No instala Gentle-AI
- No instala agentes (OpenCode, Claude Code, Codex)
- No instala componentes o plugins

## Stack Tecnológico

- **Frontend:** Next.js + React
- **Backend:** Node.js (API routes de Next.js)
- **Deploy:** PM2 + IIS (reverse proxy)
- **Ejecución:** localhost (browser)

## Estructura del Proyecto

```
presett/
├── README.md                    # Este archivo
├── docs/                        # Documentación
│   ├── analysis-exhaustivo.md   # Análisis completo de Gentle-AI
│   ── ...
├── design/                      # Diseños UI/UX
│   └── ...
├── specs/                       # Especificaciones técnicas
│   └── ...
└── src/                         # Código fuente (futuro)
    ├── app/
    ├── components/
    └── lib/
```

## Requisitos Previos

1. **Gentle-AI instalado** (`gentle-ai --version`)
2. **Al menos un agente configurado** (OpenCode, Claude Code, o Codex)
3. **Node.js 18+** y npm
4. **PM2** (para deploy): `npm install -g pm2`

## Comandos Útiles de Gentle-AI

```bash
# Ver estado actual
gentle-ai doctor

# Sincronizar configs
gentle-ai sync

# Actualizar Gentle-AI
gentle-ai upgrade

# Ver modelos disponibles
opencode models
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Producción (con PM2)
pm2 start ecosystem.config.js
```

## Deploy (PM2 + IIS)

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js

# Guardar para auto-start
pm2 save

# IIS como reverse proxy
# Configurar URL Rewrite en IIS para localhost:3000
```

## Documentación Relacionada

- [Análisis Exhaustivo de Gentle-AI](./docs/analysis-exhaustivo.md)
- [Documentación oficial de Gentle-AI](https://github.com/Gentleman-Programming/gentle-ai)

---

**Estado:** Planning  
**Versión:** 0.1.0  
**Última actualización:** 2026-08-02
