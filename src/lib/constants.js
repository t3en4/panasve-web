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

// Contenido educativo de seguridad alimentaria (para perfiles)
export const SEGURIDAD_ALIMENTARIA = {
  peligro: {
    titulo: 'La espera es el peligro',
    parrafos: [
      'La comida donada viaja, espera en puntos de acopio y se reparte poco a poco. Eso puede significar 3, 5 u 8 horas sin refrigeración, muchas veces bajo calor.',
      'Entre 5°C y 60°C las bacterias se multiplican rápido. Pasado ese tiempo límite, el riesgo de enfermar a quien recibe la ayuda sube fuerte — sin importar qué tan bien haya quedado la comida al cocinarla.',
    ],
    nota: 'Zona de peligro: más de 2 horas entre 5°C y 60°C (1 hora con mucho calor) = riesgo alto.',
  },
  condimentos: [
    {
      nivel: 'no-usar',
      nombre: 'Mayonesa',
      etiqueta: 'No usar',
      texto: 'Mezclada en sándwiches, hamburguesas o ensaladas, crea un ambiente ideal para bacterias como Staphylococcus aureus o Salmonella, sobre todo si pasa horas fuera de refrigeración. Una vez mezclada, el reloj corre rápido aunque se traslade en cavas.',
    },
    {
      nivel: 'cuidado',
      nombre: 'Ketchup',
      etiqueta: 'Con cuidado',
      texto: 'Es más ácido que la mayonesa, así que controla mejor a las bacterias. Pero igual puede fermentar, perder sabor o separarse con el calor. Mejor en sobres individuales sellados, aparte de la comida, para que cada persona se lo agregue antes de comer.',
    },
  ],
}