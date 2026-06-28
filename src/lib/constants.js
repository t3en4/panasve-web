// Estados de Venezuela (24 + Distrito Capital)
export const ESTADOS = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
  'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
  'Guárico', 'La Guaira', 'Lara', 'Mérida', 'Miranda', 'Monagas',
  'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
  'Yaracuy', 'Zulia',
]

// Tipos de proveedor
export const PROVIDER_TYPES = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'chef', label: 'Chef' },
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'individuo', label: 'Individuo' },
  { value: 'otro', label: 'Otro' },
]

export const providerTypeLabel = (v) =>
  PROVIDER_TYPES.find(t => t.value === v)?.label || 'Proveedor'

// Reglas de oro para manejo seguro de alimentos
export const REGLAS_ORO = [
  { titulo: 'Tiempo', texto: 'Máximo 2 horas fuera de frío (1 hora si hace mucho calor, por encima de 32°C).' },
  { titulo: 'Temperatura', texto: 'Cocina a fondo y mantén bien caliente o bien frío hasta el momento de entregar.' },
  { titulo: 'Higiene', texto: 'Manos y utensilios limpios; cubre bien los recipientes durante el traslado.' },
  { titulo: 'Etiqueta', texto: 'Anota la hora en que se preparó cada lote para saber cuánto tiempo lleva esperando.' },
]
export const REGLAS_ORO_NOTA =
  'Si un lote ya pasó su tiempo límite, es más seguro descartarlo que arriesgarse a entregarlo.'
