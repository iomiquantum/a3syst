

# Plan: Completar tracking de IA y dashboard detallado por sección

## Problema

Hay **9 funciones** que llaman al gateway de IA, pero solo **4** registran consumo en `ai_token_usage`. Las 5 que NO registran:

| Función | Qué hace con IA | generator_type faltante |
|---------|-----------------|------------------------|
| `appointment-flow` | Detección de intención + guía de citas | `appointment_flow` |
| `personalize-business` | Personalizar etiquetas/servicios | `personalize` |
| `analyze-brand-style` | Análisis visual de marca | `brand_analysis` |
| `onboarding-conversation` | Chat de onboarding | `onboarding` |
| `whatsapp-webhook` | Transcripción de notas de voz | `voice_transcription` |

Además, dentro de funciones que SÍ registran, hay **llamadas secundarias sin tracking**:

| Función | Llamada no registrada | generator_type |
|---------|----------------------|----------------|
| `ai-agent-reply` | Análisis de disposición (línea 699) | `agent_disposition` |
| `ai-agent-reply` | Extracción de datos de contacto (línea 857) | `agent_extraction` |
| `pipeline-automation` | Resumen ejecutivo para escalación (línea 567) | `pipeline_summary` |

**Total: 8 llamadas IA sin registrar → costos invisibles.**

---

## Plan de implementación

### Fase 1 — Cerrar fugas de tracking (8 Edge Functions)

Agregar `insert` a `ai_token_usage` después de cada llamada al gateway en:

1. **`appointment-flow/index.ts`** — `generator_type: "appointment_flow"`, label: "Flujo de citas IA"
2. **`personalize-business/index.ts`** — `generator_type: "personalize"`, label: "Personalización de negocio"
3. **`analyze-brand-style/index.ts`** — `generator_type: "brand_analysis"`, label: "Análisis de marca"
4. **`onboarding-conversation/index.ts`** — `generator_type: "onboarding"`, label: "Onboarding conversacional"
5. **`whatsapp-webhook/index.ts`** — `generator_type: "voice_transcription"`, label: "Transcripción de voz"
6. **`ai-agent-reply/index.ts`** (disposición) — `generator_type: "agent_disposition"`, label: "Análisis de disposición"
7. **`ai-agent-reply/index.ts`** (extracción) — `generator_type: "agent_extraction"`, label: "Extracción datos contacto"
8. **`pipeline-automation/index.ts`** (resumen) — `generator_type: "pipeline_summary"`, label: "Resumen ejecutivo escalación"

### Fase 2 — Dashboard por secciones del sistema

Reescribir `AdminAIConsumption.tsx` con agrupación por **módulo/sección del sistema**:

```text
┌─────────────────────────────────────────────────┐
│  SECCIÓN DEL SISTEMA        │ Calls │ Cost USD  │
├─────────────────────────────┼───────┼───────────┤
│ 💬 Mensajería / Agente IA   │       │           │
│   ├─ Respuestas automáticas │  850  │  $0.32    │
│   ├─ Análisis disposición   │  420  │  $0.04    │
│   ├─ Extracción de datos    │  380  │  $0.03    │
│   └─ Transcripción de voz   │   45  │  $0.01    │
│ 🔄 Pipeline / Seguimientos   │       │           │
│   ├─ Seguimientos S1-S6     │  340  │  $0.12    │
│   └─ Resumen de escalación  │   12  │  $0.002   │
│ 📅 Flujo de Citas            │       │           │
│   └─ Asistente de citas     │   28  │  $0.01    │
│ 🎨 Contenido                 │       │           │
│   ├─ Generación de copy     │   85  │  $0.08    │
│   └─ Generación de imágenes │   42  │  $1.68    │
│ 🏢 Configuración / Setup     │       │           │
│   ├─ Onboarding IA          │   12  │  $0.003   │
│   ├─ Personalización        │    4  │  $0.001   │
│   └─ Análisis de marca      │    3  │  $0.002   │
│ 📋 Reuniones                 │       │           │
│   └─ Resumen de reunión     │    5  │  $0.02    │
└─────────────────────────────┴───────┴───────────┘
```

**Mapeo generator_type → Sección:**

- **Mensajería**: `agent`, `agent_disposition`, `agent_extraction`, `voice_transcription`
- **Pipeline**: `agent` (con action_label "Seguimiento..."), `pipeline_summary`
- **Citas**: `appointment_flow`
- **Contenido**: `copy`, `image`
- **Configuración**: `onboarding`, `personalize`, `brand_analysis`
- **Reuniones**: `meeting_summary`

Cada sección expandible muestra: llamadas, tokens in/out, costo, modelos usados, y detalle por negocio.

### Fase 3 — Desglose adicional

- **Por modelo LLM**: Tabla con cada modelo usado, sus llamadas y costo
- **Por negocio expandible**: Click en un negocio → ver su desglose por sección
- **Gráfico de tendencia**: BarChart apilado por sección (costo/día)
- **Exportar CSV**: Botón para descargar el detalle completo para facturación
- **Cálculo ROI**: Tiempo estimado ahorrado vs costo humano configurable

### Fase 4 — Unificar estimación de costos

Estandarizar la tabla de precios por modelo en todas las Edge Functions para que coincida con `useTokenUsage.ts`. Actualmente `ai-agent-reply` y `summarize-meeting` tienen sus propias tablas de precios divergentes.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/appointment-flow/index.ts` | Agregar logging |
| `supabase/functions/personalize-business/index.ts` | Agregar logging |
| `supabase/functions/analyze-brand-style/index.ts` | Agregar logging |
| `supabase/functions/onboarding-conversation/index.ts` | Agregar logging |
| `supabase/functions/whatsapp-webhook/index.ts` | Agregar logging |
| `supabase/functions/ai-agent-reply/index.ts` | Agregar logging a 2 llamadas secundarias + unificar precios |
| `supabase/functions/pipeline-automation/index.ts` | Agregar logging a resumen + unificar precios |
| `src/components/admin/AdminAIConsumption.tsx` | Reescritura completa con agrupación por sección |
| `src/hooks/useTokenUsage.ts` | Agregar nuevos generator_types al mapeo de labels |

