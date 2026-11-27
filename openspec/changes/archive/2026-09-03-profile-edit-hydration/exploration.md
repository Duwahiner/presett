## Exploration: profile-edit-hydration

### Current State
La pantalla obtiene `GET /api/profiles` al montar `ProfilesClient`. La ruta lee `opencode.json` y devuelve únicamente metadatos resumidos (`name`, `displayName`, `active`, `modelCount`, `updatedAt`), derivados por `listProfiles`; no devuelve asignaciones ni existe una ruta GET de detalle.

Al pulsar editar, `handleEditStart` solo establece el nombre del perfil y reinicia `editAssignments` a `{}`. `ProfilesClientView` renderiza los selectores con esa colección vacía, por lo que no hidrata el orquestador ni las asignaciones de fases. El único flujo API posterior es `PUT /api/profiles/:name`, enviando exactamente el estado editado. Por tanto, la causa queda confirmada: el formulario no solicita ni recibe el detalle y la lista es insuficiente para editar.

El adaptador sí puede leer la configuración completa: identifica agentes `sdd-orchestrator-*` y `sdd-<fase>-*`, y `updateProfile` aplica solo las entradas presentes en el payload. La lectura y escritura preservan el resto del archivo y generan backups antes de la escritura atómica.

### Affected Areas
- `src/components/organisms/ProfilesClient/profilesClient.tsx` — inicia edición con asignaciones vacías y solo carga la lista.
- `src/components/organisms/ProfilesClient/profilesClientView.tsx` — muestra los selectores desde `editAssignments`; no tiene estado de carga/error de detalle.
- `src/services/profilesApiService.ts` — contrato actual solo expone `listProfiles` y mutación; falta un cliente de detalle.
- `src/app/api/profiles/route.ts` — `GET` entrega metadatos, no asignaciones.
- `src/app/api/profiles/[name]/route.ts` — solo expone `PUT`, `DELETE` y `OPTIONS`; falta `GET` de detalle.
- `src/adapters/opencode.ts` — contiene la fuente de verdad y las reglas de mapeo de agentes a perfil/fase.
- `src/app/api/profiles/__tests__/route.test.ts` y `src/app/api/profiles/[name]/__tests__/route.test.ts` — cubren lista y mutación, pero no contrato GET de detalle.
- `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` — los 24 tests pasan, pero no prueban la hidratación real al seleccionar editar.
- `src/lib/visual-audit/fixtures` y `src/components/organisms/ProfilesClient/profilesClient.tsx` — audit mode usa fixtures y bloquea edición/escritura.

### Approaches
1. **Agregar GET de detalle por perfil** — devolver desde `/api/profiles/:name` el mapa completo de asignaciones normalizado (`agentKey` o fase/orquestador, `provider`, `model`, `variant`) y cargarlo al entrar en edición.
   - Pros: separa claramente contrato de lista y detalle; evita transportar datos pesados en cada listado; permite hidratar todas las asignaciones existentes.
   - Cons: requiere contrato, validación y tests nuevos; necesita estados de carga/error en la UI.
   - Effort: Medium

2. **Incluir asignaciones en `GET /api/profiles`** — ampliar cada elemento de la lista con el detalle completo.
   - Pros: una sola petición.
   - Cons: mezcla responsabilidades, aumenta siempre el payload y conserva el acoplamiento entre listado y edición; no resuelve por sí mismo la inicialización de `editAssignments`.
   - Effort: Medium

### Recommendation
Implementar la opción 1. El contrato de detalle debería identificar inequívocamente el perfil y devolver todas sus asignaciones persistidas, incluyendo el orquestador y las fases presentes (y una representación explícita para agentes sin modelo si el editor debe conservarlos). La UI debe solicitar ese detalle al seleccionar editar, mostrar carga/error, poblar `editAssignments` solo tras respuesta exitosa y evitar guardar mientras carga o falla. El `PUT` debe conservar semántica completa: enviar el estado hidratado más los cambios del usuario, no `{}` ni solo campos modificados, porque el adaptador actual hace merge parcial y no elimina entradas ausentes.

Efectos: cancelar debe descartar el estado local y no llamar a la API; guardar debe preservar asignaciones no modificadas y crear el backup/audit trail existente mediante `writeOpenCodeConfig`; en audit mode la pantalla seguirá usando fixtures, no deberá hacer GET real ni permitir save/cancel mutativo. Conviene añadir pruebas de UI para carga exitosa, error, cancelación sin PUT y save que incluya asignaciones no tocadas, además de tests de ruta/adaptador para el contrato de detalle.

### Risks
- Un PUT parcial después de hidratar incorrectamente puede sobrescribir la intención del usuario o dejar asignaciones antiguas; el contrato debe definir si la actualización es reemplazo completo o merge.
- La clave de fase contiene guiones; derivarla con un parseo ingenuo puede asociar agentes al perfil equivocado. Debe reutilizarse el mapeo del adaptador.
- Diferencias entre `opencode.json` y `opencode.jsonc`, caché de modelos o variantes inválidas pueden hacer que un valor persistido no aparezca en el catálogo; la UI debe representar ese caso sin perderlo silenciosamente.
- La cobertura actual pasa sin detectar el bug: 34 tests pasan, pero no existe escenario de hidratación de edición.

### Ready for Proposal
Yes — la causa está confirmada con código y pruebas. El proposal debe definir el contrato GET de detalle, la semántica completa del PUT, los estados de carga/error y los escenarios de save/cancel/audit mode antes de implementar.
