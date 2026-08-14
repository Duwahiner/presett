## Exploration: Global Gentle-AI and OpenCode configuration

### Current State
PreSett ya detecta y lee `~/.config/opencode/opencode.json`, valida su estructura con Zod y expone operaciones específicas para asignaciones de modelos. Las escrituras de OpenCode crean respaldo previo, escriben mediante archivo temporal y rename atómico, vuelven a leer el archivo y bloquean asignaciones cuando el catálogo de modelos no está disponible o el valor no pertenece al catálogo. Las rutas canónicas de OpenCode, Gentle-AI y PreSett están centralizadas en `src/lib/paths.ts`; `/api/status` ofrece únicamente un estado liviano de instalación/configuración. No existe todavía una superficie unificada para editar preferencias globales de Gentle-AI y opciones generales de OpenCode, ni un contrato de validación y errores accionables para ese conjunto de valores. La convención OpenSpec usa cambios bajo `openspec/changes/<slug>/` y el proyecto está configurado con Next.js 16, TypeScript, Vitest y TDD estricto.

### Affected Areas
- `src/adapters/opencode.ts` — lectura, validación y escritura segura de `opencode.json`; debe ampliarse sin perder backups, escritura atómica ni relectura de verificación.
- `src/lib/validators.ts` y `src/types/opencode.ts` — contratos de configuración y validación previa; el esquema actual permite campos adicionales, por lo que las opciones globales requieren límites explícitos.
- `src/lib/paths.ts`, `src/services/stateService.ts` y servicios relacionados — posibles fuentes de preferencias Gentle-AI y persistencia; deben mantener rutas abstractas y evitar exponer rutas completas.
- `src/app/api/config/route.ts`, `src/app/api/status/route.ts` y rutas API de configuración existentes — contrato local de lectura/escritura, saneamiento de errores y protección de mutaciones.
- `src/app/`, `src/components/organisms/` y recursos tipados — futura pantalla agrupada de configuración, estados de validación y mensajes accionables sin secretos ni rutas locales.
- `src/adapters/__tests__/`, `src/lib/**/__tests__/`, pruebas de rutas y componentes — cobertura TDD para validación, no-mutación ante errores, backup y presentación segura.

### Approaches
1. **Superficie unificada con adaptadores por dominio** — crear un contrato de configuración global que agregue preferencias de Gentle-AI y opciones permitidas de OpenCode, manteniendo adaptadores/servicios separados para leer, validar y persistir cada archivo.
   - Pros: una experiencia coherente sin mezclar responsabilidades; permite validación por dominio, errores parciales accionables y reutilización de las garantías actuales de escritura.
   - Cons: requiere definir con precisión qué opciones son administrables y coordinar persistencia cuando un guardado afecta más de un dominio.
   - Effort: High

2. **Extender las rutas y pantallas existentes de modelos/estado** — incorporar opciones globales directamente en los contratos y componentes actuales.
   - Pros: menor cantidad inicial de rutas y componentes nuevos.
   - Cons: acopla preferencias globales con modelos/diagnóstico, hace ambiguos los límites de validación y aumenta el riesgo de exponer datos locales o romper contratos existentes.
   - Effort: Medium

### Recommendation
Adoptar la superficie unificada con adaptadores por dominio. La interfaz debe presentar secciones claramente separadas para Gentle-AI y OpenCode, mientras que la aplicación conserva servicios especializados y un contrato de actualización explícito. Validar todo el payload antes de escribir; ante cualquier valor inválido, devolver errores de campo o de opción comprensibles y no modificar ningún archivo. Reutilizar `writeOpenCodeConfig` y sus respaldos para OpenCode, y definir una garantía equivalente para el estado/preferencias de Gentle-AI. Las respuestas deben exponer solo valores administrables y estados abstractos, nunca secretos ni rutas completas.

### Risks
- El issue no enumera qué preferencias concretas de Gentle-AI ni qué opciones generales de OpenCode deben ser editables; la propuesta debe cerrar ese alcance antes de implementar.
- Actualizar dos archivos en una sola acción puede dejar cambios parciales si la segunda escritura falla; conviene definir guardado independiente por sección o una estrategia de recuperación explícita.
- `OpenCodeConfig` conserva campos arbitrarios mediante `.passthrough()`, por lo que una validación superficial podría permitir cambios no soportados o peligrosos.
- Los errores actuales contienen metadatos de archivo en algunos resultados internos; las rutas API deben sanearlos antes de responder para cumplir el criterio de no exposición.
- La existencia de artefactos SDD no rastreados de otros cambios exige no modificar ni borrar sus directorios; este cambio debe quedar aislado en su propio slug.

### Ready for Proposal
Yes — el cambio está suficientemente delimitado para una propuesta, pero esta debe fijar la lista exacta de preferencias Gentle-AI y opciones OpenCode administrables, el modelo de guardado entre dominios y los contratos de error seguros antes de pasar a especificación y diseño.
