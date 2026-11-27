# cadena-perfiles-y-modelos

Estrategia: **Cadena en rama de feature** (decisión del usuario; no se mezcla con PR
apilados). Esta rama es el rastreador y la integración final; **no se fusiona a `main`**
hasta que toda la cadena esté revisada y verificada.

## Objetivo

Integrar el trabajo acumulado de gestión de perfiles y modelos de PreSett y su adaptación a
opencode 2.x y gentle-ai 5.x, en bloques revisables y en orden.

## Restricción dura

Ningún cambio de la cadena puede afectar a opencode ni a gentle-ai: las funciones que
dependían de flags retirados de gentle-ai se desactivan dentro de PreSett, sin escribir
configuración nueva en ningún lado.

## Cadena

```text
main
 └── feat/perfiles-y-modelos                       ← rastreador (borrador, no se fusiona)
      └── PR 1  feat/perfiles-y-modelos-01-base
           └── PR 2  feat/perfiles-y-modelos-02-proveedores
                └── PR 3  feat/perfiles-y-modelos-03-catalogo-modelos
                     └── PR 4  feat/perfiles-y-modelos-04-estadisticas-uso
                          └── PR 5  feat/perfiles-y-modelos-05-opencode-bin-y-docs
                               └── PR 6  feat/perfiles-y-modelos-06-retiro-perfiles
```

| PR | Bloque de trabajo | Líneas (+/-) | Presupuesto |
|----|-------------------|--------------|-------------|
| 1 | Gestión de perfiles y modelos con registros openspec | 14 660 | `size:exception` |
| 2 | Proveedores conectados con `opencode auth list` | 91 | dentro |
| 3 | Catálogo de modelos sin `--verbose` | 174 | dentro |
| 4 | Estadísticas de uso con `opencode stats` | 1 099 | `size:exception` |
| 5 | Variable `OPENCODE_BIN` y documentos de compatibilidad | 279 | dentro |
| 6 | Retiro de las operaciones de perfiles que dependían de gentle-ai | 1 817 | `size:exception` |

## Motivo de las excepciones de tamaño

Se hizo un solo pase de corte. Los bloques 1, 4 y 6 mezclan código, tests y documentación
entrelazados y no admiten un corte coherente que los reduzca a 400 líneas sin dejar
commits intermedios que no funcionen. En el PR 1, unas 6 750 líneas son registros de
openspec. No se eliminó ningún comentario, test ni documento para ajustar el tamaño.

## Verificación

- Cada PR se verifica sobre su rama con `npx vitest run` y `npx tsc --noEmit -p .`.
- Línea base antes de la cadena: 96 archivos y 833 tests en verde en la rama de origen.
- No se ejecutó el build ni la interfaz en el navegador.

## Orden de integración

1. Revisar y fusionar el PR 1 en el rastreador, y así sucesivamente hasta el PR 6.
2. Con toda la cadena integrada y verificada, sacar el rastreador del estado de borrador
   y decidir su fusión a `main`.
