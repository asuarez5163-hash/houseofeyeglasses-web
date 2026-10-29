// Opciones de lentes — FUENTE ÚNICA para la web (página de lentes, lector de receta y, más adelante, el configurador).
// price: null = Armando todavía no fijó el precio. La web no muestra precios todavía (una sola nota arriba de la comparación).
// Los rangos de índice son la guía general de la industria para elegir grosor; el óptico confirma cada receta.
window.HOE_LENS_OPTIONS = {
  uses: [
    { id: 'single', price: null,
      en: { name: 'Single vision', text: 'One prescription across the whole lens, for distance or for reading.', for: 'Most prescriptions: one power for distance or for near.' },
      es: { name: 'Monofocales', text: 'Una sola graduación en todo el lente, para ver de lejos o para leer.', for: 'La mayoría de las recetas: una graduación para lejos o para cerca.' } },
    { id: 'progressive', price: null, needsAdd: true,
      en: { name: 'Progressive', text: 'Distance, computer and reading zones in one lens, with no visible line.', for: 'Anyone who needs help seeing both far and near, usually after 40.' },
      es: { name: 'Progresivos', text: 'Zonas para lejos, computadora y lectura en un solo lente, sin línea visible.', for: 'Quien necesita ver bien de lejos y de cerca, por lo general después de los 40.' } },
    { id: 'readers', price: null,
      en: { name: 'Readers', text: 'Magnification only, for close-up reading. No prescription needed.', for: 'Clear distance vision, but small print looks blurry up close.' },
      es: { name: 'De lectura', text: 'Solo aumento para leer de cerca. No hace falta receta.', for: 'Ves bien de lejos, pero la letra pequeña se ve borrosa de cerca.' } },
    { id: 'non-rx', price: null,
      en: { name: 'Non-prescription', text: 'Clear lenses with no correction, for style or with a blue-light filter.', for: 'Fashion frames, or sunglasses with no correction.' },
      es: { name: 'Sin graduación', text: 'Lentes transparentes sin corrección, por estilo o con filtro de luz azul.', for: 'Armazones de moda o lentes de sol sin corrección.' } },
  ],
  // maxPower = potencia máxima (valor absoluto de SPH+CYL en el meridiano más fuerte) recomendada para ese índice.
  materials: [
    { id: 'index-150', index: 1.50, maxPower: 2.0, price: null,
      en: { name: 'Standard 1.50', text: 'For low prescriptions. Clear optics, thicker at higher powers.' },
      es: { name: 'Estándar 1.50', text: 'Para graduaciones bajas. Óptica clara, más grueso en graduaciones altas.' } },
    { id: 'poly-159', index: 1.59, maxPower: 4.0, price: null, impact: true,
      en: { name: 'Polycarbonate 1.59', text: 'Impact-resistant and light. Recommended for kids and sports.', for: 'Kids, sports and active days' },
      es: { name: 'Policarbonato 1.59', text: 'Resistente a golpes y liviano. Recomendado para niños y deporte.', for: 'Niños, deporte y días activos' } },
    { id: 'index-161', index: 1.61, maxPower: 4.0, price: null,
      en: { name: 'Thin 1.61', text: 'Thinner and lighter than standard for moderate prescriptions.' },
      es: { name: 'Delgado 1.61', text: 'Más delgado y liviano que el estándar para graduaciones medias.' } },
    { id: 'index-167', index: 1.67, maxPower: 6.0, price: null,
      en: { name: 'Thinner 1.67', text: 'For strong prescriptions; noticeably slimmer edges.' },
      es: { name: 'Más delgado 1.67', text: 'Para graduaciones fuertes; bordes notablemente más finos.' } },
    { id: 'index-174', index: 1.74, maxPower: 99, price: null,
      en: { name: 'Ultra-thin 1.74', text: 'The thinnest option for very strong prescriptions.' },
      es: { name: 'Ultra delgado 1.74', text: 'La opción más delgada para graduaciones muy fuertes.' } },
  ],
  coatings: [
    { id: 'anti-reflective', price: null,
      en: { name: 'Anti-reflective', text: 'Cuts glare and reflections, for sharper vision and better night driving.', for: 'Night driving, screen work and video calls.' },
      es: { name: 'Antirreflejo', text: 'Reduce brillos y reflejos: visión más nítida y mejor al manejar de noche.', for: 'Manejar de noche, trabajar en pantalla y videollamadas.' } },
    { id: 'scratch', price: null,
      en: { name: 'Scratch-resistant', text: 'A hard coat that protects the lens surface from everyday wear.', for: 'Everyday wear, especially for kids.' },
      es: { name: 'Antirrayas', text: 'Capa dura que protege la superficie del lente del uso diario.', for: 'El uso diario, sobre todo en niños.' } },
    { id: 'uv', price: null,
      en: { name: 'UV protection', text: 'Blocks ultraviolet light that can harm your eyes over time.', for: 'Time outdoors, all year round.' },
      es: { name: 'Protección UV', text: 'Bloquea la luz ultravioleta que con el tiempo daña los ojos.', for: 'Quien pasa tiempo al aire libre, todo el año.' } },
    { id: 'blue-light', price: null,
      en: { name: 'Blue-light filter', text: 'For long hours in front of phones and computers.', for: 'Long hours on phones and computers.' },
      es: { name: 'Filtro de luz azul', text: 'Para muchas horas frente al celular y la computadora.', for: 'Muchas horas con el celular y la computadora.' } },
    { id: 'light-responsive', price: null,
      en: { name: 'Light-responsive', text: 'Clear indoors and darkens in sunlight, so one pair works everywhere.', for: 'Going in and out all day with one pair.' },
      es: { name: 'Fotocromáticos', text: 'Transparentes adentro y se oscurecen al sol: un solo par para todo.', for: 'Entrar y salir todo el día con un solo par.' } },
    { id: 'polarized', price: null,
      en: { name: 'Polarized sun lenses', text: 'Cuts the glare off the Bay, the beach and wet roads after an afternoon storm. Prescription available.', for: 'Driving and fishing.' },
      es: { name: 'Solares polarizados', text: 'Quita el reflejo de la bahía, de la playa y de la calle mojada después del aguacero. También con graduación.', for: 'Manejar y pescar.' } },
    { id: 'tint', price: null,
      en: { name: 'Sun tint', text: 'A solid or gradient color tint for everyday sunglasses.', for: 'Everyday sunglasses and a fashion look.' },
      es: { name: 'Tinte solar', text: 'Tinte de color sólido o degradado para lentes de sol del día a día.', for: 'Lentes de sol del día a día y un look de moda.' } },
  ],
};

// Índice sugerido para una potencia (valor absoluto). Devuelve el primer material cuyo maxPower la cubre.
window.hoeSuggestIndex = function (power) {
  const p = Math.abs(Number(power) || 0);
  return window.HOE_LENS_OPTIONS.materials.find(m => !m.impact && p <= m.maxPower) || window.HOE_LENS_OPTIONS.materials[window.HOE_LENS_OPTIONS.materials.length - 1];
};
