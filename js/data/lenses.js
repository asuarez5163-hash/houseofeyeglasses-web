// Opciones de lentes — FUENTE ÚNICA para la web (página de lentes, lector de receta y, más adelante, el configurador).
// price: null = Armando todavía no fijó el precio. La web no muestra precios todavía (una sola nota arriba de la comparación).
// Los rangos de índice son la guía general de la industria para elegir grosor; el óptico confirma cada receta.
window.HOE_LENS_OPTIONS = {
  uses: [
    { id: 'single', price: null,
      en: { name: 'Single vision', text: 'One power across the whole lens, set for one distance: far (driving, TV, walking around) or near (reading). The most common lens.', for: 'Best if you are nearsighted or farsighted, with or without astigmatism, and your prescription has no ADD.' },
      es: { name: 'Monofocales', text: 'Una sola graduación en todo el lente, para una sola distancia: lejos (manejar, ver TV, caminar) o cerca (leer). El lente más común.', for: 'Ideal si eres miope o hipermétrope, con o sin astigmatismo, y tu receta no trae ADD.' } },
    { id: 'progressive', price: null, needsAdd: true,
      en: { name: 'Progressive', text: 'Three zones in one lens, with no visible line: far at the top, computer in the middle, reading at the bottom. One pair for everything, no switching glasses.', for: 'Best if you need help seeing both far and near (your prescription has an ADD), usually after 40.' },
      es: { name: 'Progresivos', text: 'Tres zonas en un solo lente, sin línea visible: lejos arriba, computadora en el medio y lectura abajo. Un solo par para todo, sin cambiar de lentes.', for: 'Ideal si necesitas ver bien de lejos y de cerca (tu receta trae ADD), por lo general después de los 40.' } },
    { id: 'office', price: null, needsAdd: true,
      en: { name: 'Office Lens', text: 'Made for the desk: sharp for the computer and for reading, and clear across the room. It has no far-distance zone, so it is not for driving or walking around.', for: 'Best for long hours on screens and paper, if your prescription has an ADD. Wear it at the desk and keep another pair for the street.' },
      es: { name: 'Lente de oficina', text: 'Hecho para el escritorio: nítido para la computadora y para leer, y claro hasta el otro lado del cuarto. No tiene zona de lejos, así que no es para manejar ni para caminar por la calle.', for: 'Ideal para muchas horas frente a pantallas y papeles, si tu receta trae ADD. Úsalo en el escritorio y ten otro par para la calle.' } },
    { id: 'non-rx', price: null,
      en: { name: 'Non-prescription', text: 'Clear lenses with no correction, for style or with a blue-light filter.', for: 'Fashion frames, or sunglasses with no correction.' },
      es: { name: 'Sin graduación', text: 'Lentes transparentes sin corrección, por estilo o con filtro de luz azul.', for: 'Armazones de moda o lentes de sol sin corrección.' } },
  ],
  // Niveles del PROGRESIVO (solo progresivo). El precio NO vive aquí: lo publica el Central en data/manifest.json → lentes.progressive
  // (lib/optica/lentes) y el Worker cobra ese mismo número. Se describen por lo que nota el cliente, sin marca ni tecnología.
  tiers: [
    { id: 'estandar', price: null,
      en: { name: 'Standard', text: 'A proven progressive design: clear far and near vision, with a narrower middle zone.', for: 'A first pair of progressives, or a tighter budget.' },
      es: { name: 'Estándar', text: 'Un diseño progresivo probado: lejos y cerca nítidos, con la zona intermedia más angosta.', for: 'Un primer par de progresivos o un presupuesto más ajustado.' } },
    { id: 'premium', price: null,
      en: { name: 'Premium', text: 'Digitally surfaced for your prescription: wider reading and computer zones, less blur at the sides.', for: 'All-day wear, screens and reading.' },
      es: { name: 'Premium', text: 'Tallado digital para tu receta: zonas de lectura y computadora más anchas, menos borroso a los lados.', for: 'Uso de todo el día, pantallas y lectura.' } },
    { id: 'ultimate', price: null,
      en: { name: 'Ultimate', text: 'Our most advanced design, tailored to your prescription and frame: the widest zones, the least side blur, the easiest to get used to.', for: 'Anyone who wants the most natural vision, or has struggled with progressives before.' },
      es: { name: 'Ultimate', text: 'Nuestro diseño más avanzado, a la medida de tu receta y tu armazón: las zonas más anchas, lo menos borroso a los lados y la adaptación más fácil.', for: 'Quien quiere la visión más natural, o ya batalló con progresivos antes.' } },
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
