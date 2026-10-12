/*!
 * Equilibrio: seguimiento de peso, plan de alimentación de 4 semanas y rutinas.
 * HTML5 + Bootstrap 5 + JavaScript sin frameworks. Los datos se guardan en LocalStorage.
 *
 * Este archivo está organizado en secciones; cada bloque (function (App) {...})
 * es un módulo independiente que se registra en window.Equilibrio:
 *
 *   1. Datos      App.data      alimentos, platillos, plan, ejercicios, rutinas, hábitos
 *   2. Núcleo     App.core      utilidades, almacenamiento, cálculos, validación, plan, rutinas, seguimiento
 *   3. Interfaz   App.ui        iconos, componentes, gráficas
 *   4. Pantallas  App.modulos   registro inicial, inicio, progreso, alimentación, rutinas, historial, perfil
 *   5. Arranque   App.router    navegación por #/ruta, tema claro u oscuro
 *
 * El orden importa: cada sección usa lo que definieron las anteriores.
 */

/* ==========================================================================
   1. DATOS
   ========================================================================== */

/* ---------- Espacio de nombres ---------- */
/* Espacio de nombres global. Se carga antes que cualquier otro script. */
window.Equilibrio = window.Equilibrio || { data: {}, core: {}, ui: {}, modulos: {} };

/* ---------- Catálogo de alimentos (porción, calorías, macros, categoría del súper) ---------- */
(function (App) {
  'use strict';

  /*
   * Catálogo de alimentos. Valores aproximados por porción comestible, tomados de
   * USDA FoodData Central y del Sistema Mexicano de Alimentos Equivalentes (SMAE).
   *
   *  u       unidad base: 'g', 'ml' o 'pza'
   *  k       kcal por 100 g / 100 ml, o por pieza cuando u = 'pza'
   *  libre   verdura no feculenta o condimento: no cambia al ajustar porciones
   *  compra  conversión a lo que se compra (p. ej. arroz cocido → arroz crudo)
   *  paso/min  redondeo de porciones; pzaG, tazaG, tazaMl, cdita: equivalencias caseras
   */
  App.data.categorias = [
    { id: 'frutas', nombre: 'Frutas' },
    { id: 'verduras', nombre: 'Verduras' },
    { id: 'proteinas', nombre: 'Proteínas' },
    { id: 'lacteos', nombre: 'Lácteos' },
    { id: 'cereales', nombre: 'Cereales' },
    { id: 'leguminosas', nombre: 'Leguminosas' },
    { id: 'grasas', nombre: 'Grasas saludables' },
    { id: 'otros', nombre: 'Otros' }
  ];

  App.data.alimentos = {
    // Proteínas (peso crudo)
    pollo: { nombre: 'Pechuga de pollo sin piel', cat: 'proteinas', u: 'g', k: 115 },
    res: { nombre: 'Bistec de res magro', cat: 'proteinas', u: 'g', k: 150 },
    resMolida: { nombre: 'Carne molida de res magra', cat: 'proteinas', u: 'g', k: 175 },
    pescado: { nombre: 'Filete de pescado blanco (tilapia o basa)', cat: 'proteinas', u: 'g', k: 95 },
    salmon: { nombre: 'Salmón o trucha', cat: 'proteinas', u: 'g', k: 180 },
    camaron: { nombre: 'Camarón limpio', cat: 'proteinas', u: 'g', k: 85 },
    atun: { nombre: 'Atún en agua (drenado)', cat: 'proteinas', u: 'g', k: 110, paquete: { g: 100, nombre: 'lata', plural: 'latas' } },
    huevo: { nombre: 'Huevo', cat: 'proteinas', u: 'pza', k: 72, paso: 1, min: 1 },

    // Lácteos
    yogur: { nombre: 'Yogur griego natural sin azúcar', cat: 'lacteos', u: 'g', k: 70, tazaG: 240 },
    leche: { nombre: 'Leche descremada o light', cat: 'lacteos', u: 'ml', k: 40, tazaMl: 240 },
    panela: { nombre: 'Queso panela', cat: 'lacteos', u: 'g', k: 240 },
    requeson: { nombre: 'Requesón', cat: 'lacteos', u: 'g', k: 170 },

    // Cereales y tubérculos (arroz y pasta en peso cocido)
    avena: { nombre: 'Avena en hojuelas', cat: 'cereales', u: 'g', k: 375, tazaG: 80 },
    tortilla: { nombre: 'Tortilla de maíz', cat: 'cereales', u: 'pza', k: 65, paso: 0.5, min: 1, pzaG: 30 },
    tostada: { nombre: 'Tostada horneada', cat: 'cereales', u: 'pza', k: 50, paso: 1, min: 1 },
    pan: { nombre: 'Pan integral', cat: 'cereales', u: 'pza', k: 75, paso: 1, min: 1, etiqueta: ['rebanada', 'rebanadas'] },
    arroz: { nombre: 'Arroz integral o blanco, cocido', cat: 'cereales', u: 'g', k: 130, tazaG: 180, compra: { factor: 0.36, nombre: 'Arroz integral o blanco (crudo)' } },
    pasta: { nombre: 'Pasta integral, cocida', cat: 'cereales', u: 'g', k: 140, tazaG: 140, compra: { factor: 0.42, nombre: 'Pasta integral (cruda)' } },
    amaranto: { nombre: 'Amaranto natural', cat: 'cereales', u: 'g', k: 370 },
    papa: { nombre: 'Papa', cat: 'verduras', u: 'g', k: 87, pzaG: 170 },
    camote: { nombre: 'Camote', cat: 'verduras', u: 'g', k: 90, pzaG: 250 },

    // Leguminosas (peso cocido)
    frijol: { nombre: 'Frijoles de la olla', cat: 'leguminosas', u: 'g', k: 130, tazaG: 170, compra: { factor: 0.4, nombre: 'Frijol negro o bayo (seco)' } },
    lenteja: { nombre: 'Lentejas cocidas', cat: 'leguminosas', u: 'g', k: 115, tazaG: 200, compra: { factor: 0.4, nombre: 'Lentejas (secas)' } },
    garbanzo: { nombre: 'Garbanzos cocidos', cat: 'leguminosas', u: 'g', k: 165, tazaG: 160, compra: { factor: 0.45, nombre: 'Garbanzo (seco)' } },

    // Verduras libres
    jitomate: { nombre: 'Jitomate', cat: 'verduras', u: 'g', k: 18, libre: true, pzaG: 120 },
    tomateVerde: { nombre: 'Tomate verde', cat: 'verduras', u: 'g', k: 32, libre: true, pzaG: 50 },
    cebolla: { nombre: 'Cebolla', cat: 'verduras', u: 'g', k: 40, libre: true, pzaG: 150 },
    ajo: { nombre: 'Ajo', cat: 'verduras', u: 'pza', k: 4, libre: true, paso: 1, min: 1, etiqueta: ['diente', 'dientes'] },
    chile: { nombre: 'Chile serrano o jalapeño', cat: 'verduras', u: 'pza', k: 4, libre: true, paso: 1, min: 1 },
    poblano: { nombre: 'Chile poblano', cat: 'verduras', u: 'pza', k: 22, libre: true, paso: 1, min: 1 },
    lechuga: { nombre: 'Lechuga', cat: 'verduras', u: 'g', k: 15, libre: true, pzaG: 500 },
    espinaca: { nombre: 'Espinaca', cat: 'verduras', u: 'g', k: 23, libre: true },
    pepino: { nombre: 'Pepino', cat: 'verduras', u: 'g', k: 15, libre: true, pzaG: 250 },
    zanahoria: { nombre: 'Zanahoria', cat: 'verduras', u: 'g', k: 41, libre: true, pzaG: 80 },
    calabacita: { nombre: 'Calabacita', cat: 'verduras', u: 'g', k: 17, libre: true, pzaG: 200 },
    brocoli: { nombre: 'Brócoli', cat: 'verduras', u: 'g', k: 34, libre: true },
    chayote: { nombre: 'Chayote', cat: 'verduras', u: 'g', k: 19, libre: true, pzaG: 250 },
    nopal: { nombre: 'Nopales', cat: 'verduras', u: 'g', k: 16, libre: true, pzaG: 80 },
    champinon: { nombre: 'Champiñones', cat: 'verduras', u: 'g', k: 22, libre: true },
    pimiento: { nombre: 'Pimiento morrón', cat: 'verduras', u: 'g', k: 26, libre: true, pzaG: 160 },
    col: { nombre: 'Col o repollo', cat: 'verduras', u: 'g', k: 25, libre: true },
    jicama: { nombre: 'Jícama', cat: 'verduras', u: 'g', k: 38, libre: true, pzaG: 500 },
    apio: { nombre: 'Apio', cat: 'verduras', u: 'g', k: 16, libre: true },
    cilantro: { nombre: 'Cilantro', cat: 'verduras', libre: true, sinCantidad: true, compraTexto: '1 manojo' },

    // Frutas
    manzana: { nombre: 'Manzana', cat: 'frutas', u: 'pza', k: 95, paso: 0.5, min: 0.5 },
    platano: { nombre: 'Plátano', cat: 'frutas', u: 'pza', k: 105, paso: 0.5, min: 0.5 },
    pera: { nombre: 'Pera', cat: 'frutas', u: 'pza', k: 100, paso: 0.5, min: 0.5 },
    mandarina: { nombre: 'Mandarina', cat: 'frutas', u: 'pza', k: 45, paso: 1, min: 1 },
    guayaba: { nombre: 'Guayaba', cat: 'frutas', u: 'pza', k: 37, paso: 1, min: 1 },
    papaya: { nombre: 'Papaya', cat: 'frutas', u: 'g', k: 43, tazaG: 145 },
    fresa: { nombre: 'Fresas', cat: 'frutas', u: 'g', k: 32, tazaG: 150 },
    frutosRojos: { nombre: 'Frutos rojos congelados', cat: 'frutas', u: 'g', k: 50, tazaG: 140 },
    melon: { nombre: 'Melón', cat: 'frutas', u: 'g', k: 34, tazaG: 160 },
    pina: { nombre: 'Piña', cat: 'frutas', u: 'g', k: 50, tazaG: 165 },
    limon: { nombre: 'Limón', cat: 'frutas', u: 'pza', k: 10, libre: true, paso: 0.5, min: 0.5 },

    // Grasas saludables
    aguacate: { nombre: 'Aguacate', cat: 'grasas', u: 'g', k: 160, pzaG: 150 },
    aceite: { nombre: 'Aceite de oliva', cat: 'grasas', u: 'ml', k: 810, cdita: true },
    nuez: { nombre: 'Nuez', cat: 'grasas', u: 'g', k: 654 },
    almendra: { nombre: 'Almendras', cat: 'grasas', u: 'g', k: 580, pzaG: 1.2 },
    cacahuate: { nombre: 'Cacahuate natural sin sal', cat: 'grasas', u: 'g', k: 570 },
    crCacahuate: { nombre: 'Crema de cacahuate natural', cat: 'grasas', u: 'g', k: 590 },
    chia: { nombre: 'Semillas de chía', cat: 'grasas', u: 'g', k: 490 },
    linaza: { nombre: 'Linaza molida', cat: 'grasas', u: 'g', k: 530 },
    pepita: { nombre: 'Pepitas de calabaza', cat: 'grasas', u: 'g', k: 560 },
    aceituna: { nombre: 'Aceitunas', cat: 'grasas', u: 'g', k: 115, pzaG: 4 },

    // Otros
    cacao: { nombre: 'Cacao en polvo sin azúcar', cat: 'otros', u: 'g', k: 230 },
    canela: { nombre: 'Canela en polvo', cat: 'otros', libre: true, sinCantidad: true, compraTexto: '1 frasco' },
    especias: { nombre: 'Especias (orégano, comino, pimienta)', cat: 'otros', libre: true, sinCantidad: true, compraTexto: 'al gusto' },
    chileEnPolvo: { nombre: 'Chile en polvo sin azúcar', cat: 'otros', libre: true, sinCantidad: true, compraTexto: '1 frasco' },
    chipotle: { nombre: 'Chile chipotle adobado', cat: 'otros', libre: true, sinCantidad: true, compraTexto: '1 lata chica' },
    vinagre: { nombre: 'Vinagre de manzana', cat: 'otros', libre: true, sinCantidad: true, compraTexto: '1 botella' },
    mostaza: { nombre: 'Mostaza', cat: 'otros', libre: true, sinCantidad: true, compraTexto: '1 frasco' }
  };
})(window.Equilibrio);

/* ---------- Tiempos de comida y platillos ---------- */
(function (App) {
  'use strict';

  App.data.tiemposComida = [
    { id: 'desayuno', nombre: 'Desayuno' },
    { id: 'colacion1', nombre: 'Colación 1' },
    { id: 'comida', nombre: 'Comida' },
    { id: 'colacion2', nombre: 'Colación 2' },
    { id: 'cena', nombre: 'Cena' }
  ];

  /*
   * Platillos base (≈ 1,650 kcal/día); el plan los ajusta al objetivo de cada persona.
   * ing: [idAlimento, cantidad en la unidad del catálogo]. Prefijos: D desayuno,
   * S colación, C comida, N cena.
   */
  App.data.comidas = {
    D01: {
      nombre: 'Avena cocida con manzana, yogur y nuez',
      ing: [['avena', 35], ['leche', 250], ['canela'], ['manzana', 0.5], ['yogur', 100], ['nuez', 10]],
      prep: 'Cuece la avena en la leche con canela durante 5 minutos. Sirve con la manzana picada, el yogur y la nuez troceada.'
    },
    D02: {
      nombre: 'Huevos a la mexicana con frijoles',
      ing: [['huevo', 2], ['jitomate', 80], ['cebolla', 25], ['chile', 1], ['aceite', 5], ['frijol', 80], ['tortilla', 2]],
      prep: 'Sofríe jitomate, cebolla y chile picados en el aceite; agrega los huevos y revuelve. Acompaña con frijoles y tortillas.'
    },
    D03: {
      nombre: 'Yogur griego con frutos rojos, avena y linaza',
      ing: [['yogur', 200], ['frutosRojos', 100], ['avena', 30], ['linaza', 10], ['almendra', 10]],
      prep: 'Sirve el yogur con los frutos rojos descongelados, la avena, la linaza y las almendras.'
    },
    D04: {
      nombre: 'Molletes integrales con frijoles, panela y pico de gallo',
      ing: [['pan', 2], ['frijol', 80], ['panela', 40], ['jitomate', 60], ['cebolla', 20], ['cilantro'], ['limon', 0.5], ['aguacate', 30]],
      prep: 'Unta los frijoles en el pan, agrega la panela rallada y gratina en horno o en comal tapado. Sirve con pico de gallo y aguacate.'
    },
    D05: {
      nombre: 'Omelette de espinaca y champiñones',
      ing: [['huevo', 2], ['espinaca', 50], ['champinon', 60], ['panela', 30], ['aceite', 5], ['tortilla', 2], ['jitomate', 50]],
      prep: 'Saltea la espinaca y los champiñones en el aceite, agrega los huevos batidos y la panela en cubos. Acompaña con tortillas y rodajas de jitomate.'
    },
    D06: {
      nombre: 'Licuado de plátano, avena y crema de cacahuate',
      ing: [['leche', 200], ['yogur', 100], ['platano', 0.5], ['avena', 30], ['crCacahuate', 10], ['canela']],
      prep: 'Licúa todo hasta que quede terso. Si lo prefieres frío, usa el plátano congelado.'
    },
    D07: {
      nombre: 'Chilaquiles horneados con pollo',
      ing: [['tortilla', 2], ['tomateVerde', 120], ['chile', 1], ['cebolla', 20], ['ajo', 1], ['pollo', 70], ['panela', 20], ['frijol', 60], ['aguacate', 30]],
      prep: 'Corta las tortillas en triángulos y hornéalas hasta que estén crujientes. Báñalas con salsa verde cocida y sirve con pollo deshebrado, panela, frijoles y aguacate.'
    },
    D08: {
      nombre: 'Huevo con nopales y frijoles',
      ing: [['huevo', 2], ['nopal', 100], ['cebolla', 20], ['jitomate', 50], ['aceite', 5], ['frijol', 60], ['tortilla', 2]],
      prep: 'Cocina los nopales en tiras con cebolla y jitomate en el aceite; agrega los huevos y revuelve. Sirve con frijoles y tortillas.'
    },
    D09: {
      nombre: 'Hot cakes de avena y plátano con fresas',
      ing: [['avena', 40], ['huevo', 1], ['platano', 0.5], ['leche', 50], ['canela'], ['yogur', 100], ['fresa', 80]],
      prep: 'Licúa avena, huevo, plátano, leche y canela. Cocina porciones pequeñas en sartén antiadherente. Sirve con yogur y fresas en lugar de miel o jarabe.'
    },
    D10: {
      nombre: 'Sándwich integral de huevo y aguacate',
      ing: [['pan', 2], ['huevo', 2], ['aguacate', 40], ['jitomate', 40], ['lechuga', 20], ['mandarina', 1]],
      prep: 'Prepara los huevos cocidos o estrellados en sartén antiadherente. Arma el sándwich con aguacate, jitomate y lechuga. Mandarina de postre.'
    },
    D11: {
      nombre: 'Quesadillas de panela con champiñones y salsa verde',
      ing: [['tortilla', 3], ['panela', 70], ['champinon', 60], ['tomateVerde', 80], ['chile', 1], ['cebolla', 15]],
      prep: 'Calienta las tortillas en comal con la panela y los champiñones salteados. Acompaña con salsa verde cocida.'
    },
    D12: {
      nombre: 'Papaya con yogur griego, amaranto y nuez',
      ing: [['papaya', 200], ['yogur', 200], ['amaranto', 15], ['nuez', 10], ['chia', 5]],
      prep: 'Sirve la papaya en cubos con el yogur y espolvorea amaranto, nuez y chía.'
    },
    D13: {
      nombre: 'Huevos rancheros ligeros',
      ing: [['huevo', 2], ['aceite', 5], ['tortilla', 2], ['jitomate', 100], ['chile', 1], ['cebolla', 20], ['ajo', 1], ['frijol', 60], ['aguacate', 20]],
      prep: 'Prepara una salsa ranchera cocida con jitomate, chile, cebolla y ajo. Sirve los huevos estrellados sobre las tortillas con la salsa, frijoles y aguacate.'
    },
    D14: {
      nombre: 'Pan integral con requesón, aguacate y huevo',
      ing: [['pan', 2], ['requeson', 60], ['aguacate', 30], ['jitomate', 50], ['huevo', 1], ['fresa', 150]],
      prep: 'Tuesta el pan, unta el requesón y el aguacate y agrega rodajas de jitomate. Acompaña con un huevo cocido y fresas.'
    },

    S01: { nombre: 'Manzana con crema de cacahuate', ing: [['manzana', 1], ['crCacahuate', 10]], prep: 'Corta la manzana en gajos y úntalos con la crema de cacahuate.' },
    S02: { nombre: 'Yogur griego con nuez y canela', ing: [['yogur', 150], ['nuez', 10], ['canela']], prep: 'Mezcla el yogur con canela y la nuez troceada.' },
    S03: {
      nombre: 'Jícama, pepino y zanahoria con cacahuates',
      ing: [['jicama', 100], ['pepino', 100], ['zanahoria', 60], ['limon', 1], ['chileEnPolvo'], ['cacahuate', 15]],
      prep: 'Corta las verduras en bastones con limón y chile en polvo. Acompaña con los cacahuates.'
    },
    S04: { nombre: 'Huevo cocido y mandarinas', ing: [['huevo', 1], ['mandarina', 2]], prep: 'Puedes dejar huevos cocidos listos para 2 o 3 días en el refrigerador.' },
    S05: { nombre: 'Papaya con yogur y chía', ing: [['papaya', 150], ['yogur', 100], ['chia', 5]], prep: 'Sirve la papaya en cubos con el yogur y la chía.' },
    S06: { nombre: 'Guayabas con almendras', ing: [['guayaba', 2], ['almendra', 15]], prep: 'Una colación fácil de llevar al trabajo.' },
    S07: {
      nombre: 'Hummus casero con bastones de verdura',
      ing: [['garbanzo', 50], ['aceite', 5], ['limon', 0.5], ['ajo', 1], ['zanahoria', 60], ['pepino', 80]],
      prep: 'Licúa o machaca el garbanzo con aceite, limón, ajo y un poco de agua. Acompaña con zanahoria y pepino.'
    },
    S08: {
      nombre: 'Panela con pepino y jícama',
      ing: [['panela', 50], ['pepino', 100], ['jicama', 80], ['limon', 0.5], ['chileEnPolvo']],
      prep: 'Corta todo en cubos y agrega limón y chile en polvo.'
    },
    S09: { nombre: 'Pera con nuez', ing: [['pera', 1], ['nuez', 10]], prep: 'Fruta entera con un puño pequeño de nuez.' },
    S10: {
      nombre: 'Tostada de atún con pico de gallo',
      ing: [['tostada', 1], ['atun', 50], ['jitomate', 40], ['cebolla', 15], ['cilantro'], ['limon', 0.5], ['aguacate', 20]],
      prep: 'Mezcla el atún con el pico de gallo y sírvelo sobre la tostada con aguacate.'
    },
    S11: { nombre: 'Licuado de fresa', ing: [['leche', 200], ['fresa', 120], ['avena', 10]], prep: 'Licúa sin agregar azúcar; la fruta aporta el dulzor.' },
    S12: { nombre: 'Melón con pepitas', ing: [['melon', 200], ['pepita', 15]], prep: 'Sirve el melón en cubos con las pepitas.' },
    S13: { nombre: 'Yogur con cacao y frutos rojos', ing: [['yogur', 150], ['cacao', 5], ['frutosRojos', 80]], prep: 'Mezcla el cacao con el yogur y agrega los frutos rojos.' },
    S14: { nombre: 'Requesón con piña', ing: [['requeson', 60], ['pina', 120]], prep: 'Sirve la piña en cubos con el requesón.' },

    C01: {
      nombre: 'Pollo a la plancha con arroz, frijoles y verduras salteadas',
      ing: [['pollo', 140], ['especias'], ['arroz', 100], ['frijol', 60], ['calabacita', 100], ['zanahoria', 50], ['brocoli', 80], ['aceite', 10]],
      prep: 'Sazona el pollo con especias y ásalo. Saltea las verduras con la mitad del aceite y usa el resto para el pollo.'
    },
    C02: {
      nombre: 'Pescado empapelado con papa y ensalada',
      ing: [['pescado', 160], ['jitomate', 60], ['cebolla', 30], ['pimiento', 40], ['aceite', 10], ['limon', 1], ['papa', 150], ['lechuga', 60], ['pepino', 60], ['aguacate', 30], ['tortilla', 1]],
      prep: 'Envuelve el pescado con las verduras en rodajas, limón y aceite en papel aluminio y hornea 20 minutos a 200 °C. Acompaña con papa cocida y ensalada.'
    },
    C03: {
      nombre: 'Tinga de pollo con tostadas y frijoles',
      ing: [['pollo', 130], ['jitomate', 150], ['cebolla', 60], ['chipotle'], ['ajo', 1], ['aceite', 5], ['tostada', 3], ['frijol', 80], ['lechuga', 40], ['aguacate', 30]],
      prep: 'Cuece y deshebra el pollo. Sofríe la cebolla en rodajas, agrega el jitomate licuado con ajo y chipotle e integra el pollo. Sirve sobre tostadas con frijoles, lechuga y aguacate.'
    },
    C04: {
      nombre: 'Lentejas guisadas con verduras, arroz y panela',
      ing: [['lenteja', 200], ['jitomate', 80], ['zanahoria', 50], ['calabacita', 80], ['cebolla', 30], ['ajo', 1], ['aceite', 5], ['arroz', 80], ['panela', 40]],
      prep: 'Cuece las lentejas con zanahoria y calabacita y agrega un sofrito de jitomate, cebolla y ajo. Sirve con arroz y panela en cubos.'
    },
    C05: {
      nombre: 'Bistec en salsa verde con nopales y arroz',
      ing: [['res', 130], ['tomateVerde', 120], ['chile', 1], ['cebolla', 30], ['ajo', 1], ['nopal', 100], ['aceite', 10], ['arroz', 80], ['tortilla', 1]],
      prep: 'Dora el bistec en tiras con la mitad del aceite y cocínalo en salsa verde. Asa los nopales con el resto del aceite y sirve con arroz.'
    },
    C06: {
      nombre: 'Pasta integral con atún, espinaca y jitomate',
      ing: [['pasta', 160], ['atun', 100], ['jitomate', 120], ['espinaca', 60], ['ajo', 2], ['aceite', 10], ['panela', 30], ['lechuga', 60]],
      prep: 'Saltea el ajo y el jitomate en el aceite, agrega la espinaca y el atún e integra la pasta. Termina con panela desmoronada y acompaña con lechuga.'
    },
    C07: {
      nombre: 'Caldo de pollo con verduras',
      ing: [['pollo', 140], ['zanahoria', 60], ['calabacita', 100], ['chayote', 100], ['apio', 30], ['cebolla', 30], ['ajo', 1], ['arroz', 80], ['aguacate', 40], ['tortilla', 2], ['limon', 1]],
      prep: 'Cuece el pollo con cebolla, ajo y apio; agrega zanahoria, chayote y calabacita al final. Sirve con arroz, aguacate y limón.'
    },
    C08: {
      nombre: 'Pescado a la veracruzana con arroz',
      ing: [['pescado', 160], ['jitomate', 150], ['cebolla', 40], ['pimiento', 40], ['aceituna', 15], ['ajo', 1], ['aceite', 10], ['arroz', 100], ['lechuga', 60], ['aguacate', 30]],
      prep: 'Sofríe cebolla, ajo y pimiento, agrega el jitomate picado y las aceitunas, y cuece el pescado en esa salsa 10 minutos. Sirve con arroz y ensalada.'
    },
    C09: {
      nombre: 'Albóndigas en caldillo de jitomate',
      ing: [['resMolida', 120], ['avena', 10], ['jitomate', 150], ['calabacita', 80], ['zanahoria', 50], ['cebolla', 30], ['ajo', 1], ['aceite', 5], ['arroz', 80], ['tortilla', 1]],
      prep: 'Mezcla la carne con la avena y forma albóndigas. Cuécelas en caldillo de jitomate licuado con cebolla y ajo, junto con las verduras en cubos. Sirve con arroz.'
    },
    C10: {
      nombre: 'Tacos de pescado con col y pico de gallo',
      ing: [['pescado', 150], ['aceite', 5], ['tortilla', 3], ['col', 80], ['jitomate', 60], ['cebolla', 20], ['cilantro'], ['limon', 1], ['aguacate', 40], ['frijol', 50]],
      prep: 'Asa el pescado sazonado con limón. Arma los tacos con col rallada, pico de gallo y aguacate, y acompaña con frijoles.'
    },
    C11: {
      nombre: 'Ensalada de pollo, garbanzo y aguacate',
      ing: [['pollo', 120], ['garbanzo', 80], ['lechuga', 80], ['jitomate', 80], ['pepino', 80], ['cebolla', 20], ['aguacate', 40], ['aceite', 10], ['vinagre'], ['tostada', 2]],
      prep: 'Asa el pollo y córtalo en tiras. Mézclalo con el garbanzo y las verduras y adereza con aceite y vinagre. Acompaña con tostadas.'
    },
    C12: {
      nombre: 'Enfrijoladas de pollo con ensalada',
      ing: [['tortilla', 3], ['frijol', 120], ['pollo', 80], ['panela', 20], ['cebolla', 20], ['aceite', 5], ['lechuga', 60], ['jitomate', 60]],
      prep: 'Licúa los frijoles con su caldo y caliéntalos con la cebolla acitronada en el aceite. Pasa las tortillas por la salsa, rellena con pollo deshebrado y termina con panela. Acompaña con ensalada.'
    },
    C13: {
      nombre: 'Salmón o trucha al horno con camote y brócoli',
      ing: [['salmon', 140], ['camote', 150], ['brocoli', 150], ['aceite', 5], ['limon', 1], ['ajo', 1], ['lechuga', 60]],
      prep: 'Hornea el pescado con ajo, limón y aceite de 15 a 18 minutos a 200 °C. Acompaña con camote cocido o asado, brócoli al vapor y lechuga.'
    },
    C14: {
      nombre: 'Picadillo de res con verduras',
      ing: [['resMolida', 110], ['papa', 80], ['zanahoria', 60], ['chayote', 80], ['jitomate', 120], ['cebolla', 30], ['ajo', 1], ['aceite', 5], ['tortilla', 2]],
      prep: 'Dora la carne con cebolla y ajo, agrega el jitomate licuado y las verduras en cubos pequeños, y cocina hasta que estén suaves. Sirve con tortillas.'
    },
    C15: {
      nombre: 'Fajitas de pollo con pimientos',
      ing: [['pollo', 140], ['pimiento', 150], ['cebolla', 60], ['aceite', 5], ['limon', 1], ['tortilla', 2], ['frijol', 60], ['aguacate', 30]],
      prep: 'Saltea el pollo en tiras con pimiento y cebolla a fuego alto. Sirve en tortillas con frijoles y aguacate.'
    },
    C16: {
      nombre: 'Camarones al ajillo con arroz y ensalada',
      ing: [['camaron', 160], ['ajo', 3], ['aceite', 10], ['limon', 1], ['arroz', 100], ['lechuga', 60], ['jitomate', 60], ['pepino', 60], ['aguacate', 40], ['tortilla', 1]],
      prep: 'Saltea el ajo en el aceite sin quemarlo, agrega los camarones de 3 a 4 minutos y termina con limón. Sirve con arroz y ensalada.'
    },
    C17: {
      nombre: 'Chiles rellenos de panela al horno',
      ing: [['poblano', 2], ['panela', 80], ['jitomate', 150], ['cebolla', 20], ['ajo', 1], ['aceite', 5], ['arroz', 80], ['frijol', 60]],
      prep: 'Asa y pela los chiles, rellénalos con panela y hornéalos 10 minutos sin capear. Sirve con caldillo de jitomate, arroz y frijoles.'
    },

    N01: {
      nombre: 'Tacos de pollo con nopales asados',
      ing: [['tortilla', 2], ['pollo', 100], ['nopal', 100], ['cebolla', 20], ['tomateVerde', 60], ['chile', 1], ['aguacate', 30]],
      prep: 'Asa el pollo y los nopales en comal. Arma los tacos con salsa verde y aguacate.'
    },
    N02: {
      nombre: 'Ensalada de atún con aguacate',
      ing: [['atun', 100], ['lechuga', 60], ['jitomate', 60], ['pepino', 60], ['cebolla', 20], ['aguacate', 40], ['aceite', 5], ['limon', 1], ['tostada', 2]],
      prep: 'Mezcla el atún con las verduras picadas, limón y aceite. Sirve con aguacate y tostadas.'
    },
    N03: {
      nombre: 'Sopa de verduras y quesadilla de panela',
      ing: [['calabacita', 100], ['zanahoria', 50], ['chayote', 80], ['jitomate', 60], ['cebolla', 20], ['ajo', 1], ['aceite', 5], ['tortilla', 2], ['panela', 60]],
      prep: 'Prepara una sopa con caldillo de jitomate y verduras en cubos. Acompaña con quesadillas de panela hechas en comal.'
    },
    N04: {
      nombre: 'Huevos revueltos con calabacita',
      ing: [['huevo', 2], ['calabacita', 100], ['jitomate', 60], ['cebolla', 20], ['aceite', 5], ['frijol', 50], ['tortilla', 1]],
      prep: 'Saltea la calabacita con jitomate y cebolla y agrega los huevos. Acompaña con frijoles y tortilla.'
    },
    N05: {
      nombre: 'Tostadas de pollo con frijoles y panela',
      ing: [['tostada', 2], ['frijol', 60], ['pollo', 80], ['lechuga', 50], ['jitomate', 50], ['panela', 20], ['aguacate', 20], ['tomateVerde', 40]],
      prep: 'Unta frijoles en las tostadas y agrega pollo deshebrado, lechuga, jitomate, panela, aguacate y salsa verde.'
    },
    N06: {
      nombre: 'Crema de brócoli y tostadas de atún',
      ing: [['brocoli', 150], ['cebolla', 30], ['ajo', 1], ['leche', 150], ['aceite', 5], ['tostada', 2], ['atun', 60], ['jitomate', 40], ['limon', 0.5]],
      prep: 'Cuece el brócoli con cebolla y ajo y lícualo con la leche, sin crema. Acompaña con tostadas de atún con jitomate y limón.'
    },
    N07: {
      nombre: 'Pescado al limón con verduras al vapor',
      ing: [['pescado', 150], ['ajo', 1], ['limon', 1], ['aceite', 5], ['brocoli', 80], ['zanahoria', 60], ['calabacita', 80], ['tortilla', 2]],
      prep: 'Cocina el pescado a la plancha con ajo, limón y aceite. Acompaña con verduras al vapor y tortillas.'
    },
    N08: {
      nombre: 'Ensalada tibia de lentejas con panela',
      ing: [['lenteja', 150], ['jitomate', 80], ['pepino', 60], ['cebolla', 20], ['cilantro'], ['panela', 50], ['aceite', 5], ['limon', 1]],
      prep: 'Mezcla las lentejas tibias con las verduras picadas, la panela en cubos, limón y aceite.'
    },
    N09: {
      nombre: 'Calabacitas a la mexicana con panela',
      ing: [['calabacita', 200], ['jitomate', 80], ['cebolla', 30], ['chile', 1], ['aceite', 5], ['panela', 70], ['tortilla', 2]],
      prep: 'Guisa la calabacita con jitomate, cebolla y chile en el aceite. Agrega la panela en cubos al final y sirve con tortillas.'
    },
    N10: {
      nombre: 'Sándwich integral de pollo',
      ing: [['pan', 2], ['pollo', 80], ['aguacate', 30], ['jitomate', 40], ['lechuga', 30], ['mostaza'], ['zanahoria', 60], ['pepino', 80]],
      prep: 'Arma el sándwich con pollo asado o deshebrado, aguacate, jitomate, lechuga y mostaza. Acompaña con bastones de zanahoria y pepino.'
    },
    N11: {
      nombre: 'Tacos de bistec con nopales',
      ing: [['res', 90], ['nopal', 100], ['cebolla', 30], ['aceite', 5], ['tortilla', 2], ['tomateVerde', 60], ['chile', 1]],
      prep: 'Asa el bistec y los nopales con cebolla en el aceite. Arma los tacos con salsa verde.'
    },
    N12: {
      nombre: 'Tostadas de ceviche de atún',
      ing: [['atun', 100], ['jitomate', 60], ['cebolla', 30], ['pepino', 60], ['cilantro'], ['limon', 1], ['aguacate', 30], ['tostada', 3]],
      prep: 'Mezcla el atún con jitomate, cebolla, pepino y cilantro picados y suficiente limón. Sirve sobre tostadas con aguacate.'
    },
    N13: {
      nombre: 'Sopa de lentejas',
      ing: [['lenteja', 150], ['jitomate', 80], ['zanahoria', 50], ['cebolla', 30], ['ajo', 1], ['aceite', 5], ['panela', 30], ['tortilla', 1]],
      prep: 'Cuece las lentejas con zanahoria y un sofrito de jitomate, cebolla y ajo. Sirve con panela en cubos y tortilla.'
    },
    N14: {
      nombre: 'Brochetas de pollo con verduras',
      ing: [['pollo', 110], ['pimiento', 80], ['cebolla', 40], ['calabacita', 80], ['champinon', 60], ['aceite', 5], ['tortilla', 2]],
      prep: 'Ensarta el pollo y las verduras en cubos, barnízalos con aceite y ásalos en comal o sartén. Acompaña con tortillas.'
    }
  };
})(window.Equilibrio);

/* ---------- Plan de alimentación de 4 semanas ---------- */
(function (App) {
  'use strict';

  // Cada día: [desayuno, colación 1, comida, colación 2, cena], de lunes a domingo.
  App.data.plan4semanas = [
    [
      ['D01', 'S01', 'C01', 'S02', 'N09'],
      ['D02', 'S05', 'C02', 'S03', 'N14'],
      ['D03', 'S06', 'C04', 'S07', 'N01'],
      ['D04', 'S09', 'C05', 'S08', 'N02'],
      ['D05', 'S12', 'C10', 'S10', 'N03'],
      ['D06', 'S14', 'C03', 'S13', 'N06'],
      ['D07', 'S04', 'C13', 'S11', 'N04']
    ],
    [
      ['D08', 'S06', 'C11', 'S08', 'N08'],
      ['D09', 'S09', 'C08', 'S10', 'N05'],
      ['D10', 'S12', 'C12', 'S11', 'N12'],
      ['D11', 'S14', 'C09', 'S13', 'N07'],
      ['D12', 'S04', 'C06', 'S03', 'N10'],
      ['D13', 'S01', 'C17', 'S02', 'N11'],
      ['D14', 'S05', 'C16', 'S07', 'N13']
    ],
    [
      ['D03', 'S12', 'C15', 'S11', 'N02'],
      ['D08', 'S14', 'C02', 'S13', 'N09'],
      ['D06', 'S04', 'C04', 'S02', 'N14'],
      ['D13', 'S01', 'C14', 'S03', 'N03'],
      ['D01', 'S05', 'C10', 'S07', 'N04'],
      ['D11', 'S06', 'C07', 'S08', 'N12'],
      ['D04', 'S09', 'C13', 'S10', 'N01']
    ],
    [
      ['D12', 'S04', 'C01', 'S03', 'N06'],
      ['D05', 'S01', 'C08', 'S07', 'N08'],
      ['D09', 'S05', 'C12', 'S08', 'N07'],
      ['D02', 'S06', 'C05', 'S10', 'N13'],
      ['D14', 'S09', 'C06', 'S11', 'N05'],
      ['D10', 'S12', 'C03', 'S13', 'N11'],
      ['D07', 'S14', 'C16', 'S02', 'N10']
    ]
  ];
})(window.Equilibrio);

/* ---------- Equipo y catálogo de ejercicios ---------- */
(function (App) {
  'use strict';

  App.data.equipo = [
    { id: 'cuerda', nombre: 'Cuerda para saltar' },
    { id: 'mancuernas', nombre: 'Mancuernas' },
    { id: 'kettlebell', nombre: 'Kettlebell' },
    { id: 'costal', nombre: 'Costal de boxeo' },
    { id: 'peraFija', nombre: 'Pera fija' },
    { id: 'peraElastica', nombre: 'Pera elástica' },
    { id: 'pesas', nombre: 'Pesas (barra y discos)' },
    { id: 'natacion', nombre: 'Natación' }
  ];

  /*
   * eq: equipo requerido (sin eq = peso corporal). medida: 'reps' (por defecto),
   * 'tiempo', 'rounds' o 'continuo'. lado: el ejercicio se hace por cada lado.
   */
  App.data.ejercicios = {
    sentadillaGobletKB: { nombre: 'Sentadilla goblet con kettlebell', eq: 'kettlebell', tip: 'Pecho arriba y rodillas en línea con los pies.' },
    sentadillaGobletMancuerna: { nombre: 'Sentadilla goblet con mancuerna', eq: 'mancuernas', tip: 'Sostén la mancuerna vertical, pegada al pecho.' },
    sentadillaGobletDisco: { nombre: 'Sentadilla goblet con disco', eq: 'pesas', tip: 'Sostén el disco al pecho y baja controlado.' },
    sentadillaLibre: { nombre: 'Sentadilla con peso corporal', tip: 'Usa una silla como referencia de profundidad.' },
    zancadaMancuernas: { nombre: 'Zancadas alternadas con mancuernas', eq: 'mancuernas', lado: true, tip: 'Paso largo, torso erguido y rodilla trasera cerca del piso.' },
    zancadaKB: { nombre: 'Zancadas alternadas con kettlebell', eq: 'kettlebell', lado: true, tip: 'Sostén la kettlebell al pecho.' },
    zancadaLibre: { nombre: 'Zancadas alternadas', lado: true, tip: 'Apóyate en una pared si necesitas equilibrio.' },
    pmrMancuernas: { nombre: 'Peso muerto rumano con mancuernas', eq: 'mancuernas', tip: 'Cadera atrás, espalda neutra y mancuernas pegadas a las piernas.' },
    pmrKB: { nombre: 'Peso muerto rumano con kettlebell', eq: 'kettlebell', tip: 'Empuja la cadera hacia atrás sin redondear la espalda.' },
    pmrBarra: { nombre: 'Peso muerto rumano con barra', eq: 'pesas', tip: 'Barra cerca del cuerpo; baja hasta media espinilla.' },
    pmrUnaPierna: { nombre: 'Peso muerto a una pierna sin peso', lado: true, tip: 'Mueve la cadera como bisagra; apóyate en la pared si hace falta.' },
    puenteGluteoMancuerna: { nombre: 'Puente de glúteo con mancuerna', eq: 'mancuernas', tip: 'Mancuerna sobre la cadera; aprieta los glúteos 1 s arriba.' },
    puenteGluteo: { nombre: 'Puente de glúteo', tip: 'Talones cerca de la cadera; sube sin arquear la espalda baja.' },

    pressPisoMancuernas: { nombre: 'Press de pecho en piso con mancuernas', eq: 'mancuernas', tip: 'Codos a unos 45° del cuerpo.' },
    pressPisoBarra: { nombre: 'Press de pecho en piso con barra', eq: 'pesas', tip: 'Baja hasta que los brazos toquen el piso.' },
    lagartijas: { nombre: 'Lagartijas inclinadas o con rodillas apoyadas', tip: 'Cuerpo en línea recta; ajusta la inclinación a tu nivel.' },
    remoMancuerna: { nombre: 'Remo a una mano con mancuerna', eq: 'mancuernas', lado: true, tip: 'Lleva el codo hacia la cadera con la espalda neutra.' },
    remoKB: { nombre: 'Remo con kettlebell', eq: 'kettlebell', lado: true, tip: 'Apoya la mano libre en una silla o banco.' },
    remoBarra: { nombre: 'Remo inclinado con barra', eq: 'pesas', tip: 'Torso inclinado a unos 45°; jala hacia el ombligo.' },
    ytwPiso: { nombre: 'Y-T-W boca abajo', tip: 'Forma Y, T y W con los brazos y junta los omóplatos.' },
    pressHombroMancuernas: { nombre: 'Press de hombro con mancuernas', eq: 'mancuernas', tip: 'Abdomen firme; no arquees la espalda.' },
    pressHombroKB: { nombre: 'Press de hombro con kettlebell', eq: 'kettlebell', lado: true, tip: 'Muñeca recta y codo debajo de la kettlebell.' },
    pressMilitarBarra: { nombre: 'Press militar con barra', eq: 'pesas', tip: 'Glúteos y abdomen firmes; barra cerca de la cara.' },
    pikePushup: { nombre: 'Lagartija pica para hombro', tip: 'Cadera alta; baja la cabeza entre las manos.' },
    farmerMancuernas: { nombre: 'Caminata de granjero con mancuernas', eq: 'mancuernas', medida: 'tiempo', tip: 'Hombros abajo y atrás, pasos cortos.' },
    farmerKB: { nombre: 'Caminata de granjero con kettlebell', eq: 'kettlebell', medida: 'tiempo', tip: 'Con una sola kettlebell, cambia de mano en cada serie.' },
    farmerDiscos: { nombre: 'Caminata de granjero con discos', eq: 'pesas', medida: 'tiempo', tip: 'Sujeta los discos con firmeza.' },
    toqueHombro: { nombre: 'Plancha alta con toque de hombro', lado: true, tip: 'Pies separados; evita que la cadera gire.' },

    plancha: { nombre: 'Plancha', medida: 'tiempo', tip: 'Glúteos y abdomen firmes; respira con calma.' },
    deadBug: { nombre: 'Dead bug', lado: true, tip: 'Mantén la espalda baja pegada al piso.' },
    bicicleta: { nombre: 'Abdominal bicicleta', lado: true, tip: 'Movimiento lento y controlado.' },

    swingKB: { nombre: 'Swing con kettlebell', eq: 'kettlebell', tip: 'El impulso sale de la cadera, no de los brazos.' },
    swingMancuerna: { nombre: 'Swing con mancuerna', eq: 'mancuernas', tip: 'Sujeta la mancuerna por un extremo y haz bisagra de cadera.' },
    thrusterMancuernas: { nombre: 'Thruster con mancuernas', eq: 'mancuernas', tip: 'Sentadilla y empuje arriba en un solo movimiento.' },
    thrusterKB: { nombre: 'Thruster con kettlebell', eq: 'kettlebell', tip: 'Sentadilla con la kettlebell al pecho y empuje arriba.' },
    escaladores: { nombre: 'Escaladores', tip: 'Hazlos lentos si el impacto te molesta.' },
    costalRafagas: { nombre: 'Ráfagas de rectos al costal', eq: 'costal', tip: 'Golpes rápidos y relajados, con la guardia arriba.' },

    costalCombinaciones: { nombre: 'Costal: combinaciones de jab, cross y gancho', eq: 'costal', medida: 'rounds', tip: 'Exhala en cada golpe y regresa siempre a la guardia.' },
    peraFijaVelocidad: { nombre: 'Pera fija: ritmo y velocidad', eq: 'peraFija', medida: 'rounds', tip: 'Golpes cortos y constantes.' },
    peraElasticaTiming: { nombre: 'Pera elástica: timing y esquivas', eq: 'peraElastica', medida: 'rounds', tip: 'Golpea y esquiva el rebote.' },
    sombraCombinaciones: { nombre: 'Sombra: combinaciones de 3 a 4 golpes', medida: 'rounds', tip: 'Imagina un rival; técnica antes que velocidad.' },
    sombraEsquivas: { nombre: 'Sombra: esquivas y contragolpe', medida: 'rounds', tip: 'Flexiona las rodillas para esquivar, no solo la cintura.' },
    sombraDesplazamiento: { nombre: 'Sombra con desplazamiento', medida: 'rounds', tip: 'Muévete en todas direcciones sin cruzar los pies.' },

    cuerdaIntervalos: { nombre: 'Saltar la cuerda', eq: 'cuerda', medida: 'tiempo', tip: 'Saltos bajos sobre la punta de los pies; si el impacto molesta, marcha en tu lugar.' },
    cuerdaSuave: { nombre: 'Cuerda a ritmo suave', eq: 'cuerda', medida: 'tiempo' },
    jumpingJacks: { nombre: 'Jumping jacks', medida: 'tiempo', tip: 'Versión sin salto: abre un pie a la vez.' },
    marchaRodillas: { nombre: 'Marcha con rodillas altas', medida: 'tiempo' },
    natacionContinua: { nombre: 'Natación continua a ritmo cómodo', eq: 'natacion', medida: 'continuo', tip: 'Si hace falta, descansa de 20 a 30 s cada 50 m.' },
    caminataRapida: { nombre: 'Caminata rápida o bicicleta', medida: 'continuo', tip: 'Ritmo en el que puedes hablar en frases cortas.' },
    natacionSuave: { nombre: 'Nado suave de técnica', eq: 'natacion', medida: 'continuo' },
    caminataSuave: { nombre: 'Caminata suave', medida: 'continuo' },
    flujoMovilidad: { nombre: 'Movilidad: gato-vaca, 90/90 de cadera y apertura torácica', medida: 'continuo' },
    respiracion: { nombre: 'Respiración diafragmática', medida: 'continuo', tip: 'Inhala 4 s por la nariz y exhala en 6 s.' }
  };
})(window.Equilibrio);

/* ---------- Progresión de 4 semanas, plantillas de sesión y distribución por días ---------- */
(function (App) {
  'use strict';

  // Prescripción por tipo de trabajo para las semanas 1 a 4 (descansos en segundos).
  App.data.progresion = {
    fuerza: [{ series: 3, reps: 12, descanso: 75 }, { series: 3, reps: 12, descanso: 60 }, { series: 4, reps: 10, descanso: 60 }, { series: 4, reps: 12, descanso: 60 }],
    coreReps: [{ series: 3, reps: 8, descanso: 30 }, { series: 3, reps: 10, descanso: 30 }, { series: 3, reps: 12, descanso: 30 }, { series: 4, reps: 12, descanso: 30 }],
    coreTiempo: [{ series: 3, seg: 30, descanso: 30 }, { series: 3, seg: 35, descanso: 30 }, { series: 3, seg: 40, descanso: 30 }, { series: 4, seg: 40, descanso: 30 }],
    acarreo: [{ series: 3, seg: 30, descanso: 60 }, { series: 3, seg: 35, descanso: 60 }, { series: 4, seg: 40, descanso: 60 }, { series: 4, seg: 45, descanso: 60 }],
    boxeo: [{ series: 3, seg: 120, descanso: 60 }, { series: 3, seg: 120, descanso: 45 }, { series: 4, seg: 120, descanso: 45 }, { series: 3, seg: 180, descanso: 60 }],
    intervalos: [{ series: 6, seg: 30, descanso: 30 }, { series: 8, seg: 30, descanso: 30 }, { series: 8, seg: 40, descanso: 20 }, { series: 10, seg: 40, descanso: 20 }],
    circuito: [{ vueltas: 3, seg: 30, descanso: 30, entreVueltas: 90 }, { vueltas: 3, seg: 35, descanso: 25, entreVueltas: 90 }, { vueltas: 4, seg: 35, descanso: 25, entreVueltas: 90 }, { vueltas: 4, seg: 40, descanso: 20, entreVueltas: 90 }],
    continuo: [{ min: 25 }, { min: 30 }, { min: 35 }, { min: 40 }],
    suave: [{ min: 20 }, { min: 20 }, { min: 25 }, { min: 25 }],
    movilidad: [{ min: 10 }, { min: 10 }, { min: 12 }, { min: 12 }],
    respiracion: [{ min: 3 }, { min: 3 }, { min: 5 }, { min: 5 }]
  };

  App.data.semanasEntrenamiento = [
    { titulo: 'Técnica y adaptación', esfuerzo: '5 a 6', nota: 'Cargas e intensidad bajas a moderadas. El objetivo es aprender la técnica y activar el cuerpo sin terminar agotado.' },
    { titulo: 'Progresión', esfuerzo: '6 a 7', nota: 'Sube un poco la carga o acorta los descansos. Termina cada serie sintiendo que podrías hacer 2 o 3 repeticiones más.' },
    { titulo: 'Volumen', esfuerzo: '7', nota: 'Se agrega una serie a la mayoría de los ejercicios. Prioriza la técnica sobre el peso.' },
    { titulo: 'Consolidación', esfuerzo: '7 a 8', nota: 'Es la semana más exigente del ciclo. Al terminar, repite el ciclo con cargas un poco mayores, o haz una semana más ligera si te sientes fatigado.' }
  ];

  const SENTADILLA = ['sentadillaGobletKB', 'sentadillaGobletMancuerna', 'sentadillaGobletDisco', 'sentadillaLibre'];
  const ZANCADA = ['zancadaMancuernas', 'zancadaKB', 'zancadaLibre'];
  const BISAGRA = ['pmrMancuernas', 'pmrKB', 'pmrBarra', 'pmrUnaPierna'];
  const PUENTE = ['puenteGluteoMancuerna', 'puenteGluteo'];
  const EMPUJE = ['pressPisoMancuernas', 'pressPisoBarra', 'lagartijas'];
  const JALON = ['remoMancuerna', 'remoKB', 'remoBarra', 'ytwPiso'];
  const HOMBRO = ['pressHombroMancuernas', 'pressHombroKB', 'pressMilitarBarra', 'pikePushup'];
  const ACARREO = ['farmerMancuernas', 'farmerKB', 'farmerDiscos', 'toqueHombro'];
  const SWING = ['swingKB', 'swingMancuerna', 'puenteGluteo'];
  const ACTIVACION = { alts: ['cuerdaSuave', 'marchaRodillas'], detalle: '3 min' };

  /*
   * bloques: cada uno lista alternativas en orden de preferencia; se usa la primera
   * cuyo equipo esté disponible (las últimas no requieren equipo).
   */
  App.data.sesiones = {
    inferior: {
      nombre: 'Fuerza funcional: tren inferior',
      etiqueta: 'Funcional',
      abrev: 'Pierna',
      objetivo: 'Fortalecer piernas y glúteos y dominar la sentadilla y la bisagra de cadera.',
      calentamiento: { min: 8, pasos: [ACTIVACION, { texto: 'Círculos de cadera y tobillo: 10 por lado' }, { texto: 'Sentadilla sin peso con pausa abajo: 2×8' }] },
      bloques: [{ alts: SENTADILLA, tipo: 'fuerza' }, { alts: ZANCADA, tipo: 'fuerza' }, { alts: BISAGRA, tipo: 'fuerza' }, { alts: PUENTE, tipo: 'fuerza' }, { alts: ['plancha'], tipo: 'core' }],
      enfriamiento: { min: 5, pasos: ['Caminata suave: 2 min', 'Estiramiento de cuádriceps, isquiotibiales y glúteo: 30 s cada uno', 'Respiración lenta: 1 min'] }
    },
    superior: {
      nombre: 'Fuerza funcional: tren superior',
      etiqueta: 'Funcional',
      abrev: 'Torso',
      objetivo: 'Fortalecer pecho, espalda y hombros, con énfasis en una buena postura.',
      calentamiento: { min: 7, pasos: [{ alts: ['cuerdaSuave', 'jumpingJacks'], detalle: '3 min' }, { texto: 'Círculos de brazos y hombros: 10 en cada dirección' }, { texto: 'Lagartijas inclinadas suaves: 1×8' }] },
      bloques: [{ alts: EMPUJE, tipo: 'fuerza' }, { alts: JALON, tipo: 'fuerza' }, { alts: HOMBRO, tipo: 'fuerza' }, { alts: ACARREO, tipo: 'acarreo' }, { alts: ['deadBug'], tipo: 'core' }],
      enfriamiento: { min: 5, pasos: ['Estiramiento de pecho en el marco de una puerta: 30 s por lado', 'Estiramiento de espalda y hombros: 1 min', 'Respiración lenta: 1 min'] }
    },
    boxeo: {
      nombre: 'Boxeo y acondicionamiento',
      etiqueta: 'Boxeo',
      abrev: 'Boxeo',
      objetivo: 'Mejorar la condición cardiovascular, la coordinación y la potencia con trabajo por rounds.',
      calentamiento: { min: 8, pasos: [{ alts: ['cuerdaSuave', 'jumpingJacks'], detalle: '4 min' }, { texto: 'Movilidad de cuello, hombros y cadera: 2 min' }, { texto: 'Sombra suave: 1 round de 2 min' }] },
      bloques: [
        { alts: ['costalCombinaciones', 'sombraCombinaciones'], tipo: 'boxeo' },
        { alts: ['peraFijaVelocidad', 'peraElasticaTiming', 'sombraEsquivas'], tipo: 'boxeo' },
        { alts: ['peraElasticaTiming', 'sombraDesplazamiento'], tipo: 'boxeo' },
        { alts: ['cuerdaIntervalos', 'jumpingJacks'], tipo: 'intervalos' },
        { alts: ['bicicleta'], tipo: 'core' }
      ],
      enfriamiento: { min: 5, pasos: ['Sombra muy suave: 1 min', 'Estiramiento de hombros, pecho y pantorrillas: 3 min', 'Respiración lenta: 1 min'] }
    },
    cardio: {
      nombre: 'Cardio ligero en zona 2',
      etiqueta: 'Cardio',
      abrev: 'Cardio',
      objetivo: 'Sumar gasto energético con un esfuerzo cómodo: deberías poder hablar en frases cortas.',
      calentamiento: { min: 5, pasos: [{ texto: 'Empieza a un ritmo muy suave: 5 min' }] },
      bloques: [{ alts: ['natacionContinua', 'caminataRapida'], tipo: 'continuo' }],
      enfriamiento: { min: 5, pasos: ['Baja el ritmo: 3 min', 'Estira pantorrillas, cadera y espalda: 2 min'] }
    },
    metabolico: {
      nombre: 'Circuito metabólico',
      etiqueta: 'Circuito',
      abrev: 'Circuito',
      formato: 'circuito',
      objetivo: 'Trabajo de cuerpo completo en circuito para mejorar la resistencia y elevar el gasto energético.',
      calentamiento: { min: 8, pasos: [ACTIVACION, { texto: 'Bisagra de cadera sin peso: 10 repeticiones' }, { texto: 'Sentadilla con alcance arriba: 10 repeticiones' }] },
      bloques: [
        { alts: SWING, tipo: 'circuito' },
        { alts: ['thrusterMancuernas', 'thrusterKB', 'sentadillaLibre'], tipo: 'circuito' },
        { alts: ['remoKB', 'remoMancuerna', 'ytwPiso'], tipo: 'circuito' },
        { alts: ['costalRafagas', 'escaladores'], tipo: 'circuito' },
        { alts: ['cuerdaIntervalos', 'jumpingJacks'], tipo: 'circuito' }
      ],
      enfriamiento: { min: 5, pasos: ['Caminata suave: 2 min', 'Estiramiento de cadera, pecho y espalda: 3 min'] }
    },
    recuperacion: {
      nombre: 'Recuperación activa y movilidad',
      etiqueta: 'Recuperación',
      abrev: 'Suave',
      objetivo: 'Favorecer la recuperación con movimiento suave y trabajo de movilidad.',
      calentamiento: { min: 0, pasos: [] },
      bloques: [{ alts: ['natacionSuave', 'caminataSuave'], tipo: 'suave' }, { alts: ['flujoMovilidad'], tipo: 'movilidad' }, { alts: ['respiracion'], tipo: 'respiracion' }],
      enfriamiento: { min: 0, pasos: [] }
    },
    fullA: {
      nombre: 'Cuerpo completo A',
      etiqueta: 'Funcional',
      abrev: 'Total A',
      objetivo: 'Trabajar los patrones básicos (sentadilla, empuje, bisagra y jalón) en una sola sesión.',
      calentamiento: { min: 8, pasos: [ACTIVACION, { texto: 'Movilidad de cadera, tobillos y hombros: 3 min' }, { texto: 'Sentadilla sin peso: 1×10' }] },
      bloques: [{ alts: SENTADILLA, tipo: 'fuerza' }, { alts: EMPUJE, tipo: 'fuerza' }, { alts: BISAGRA, tipo: 'fuerza' }, { alts: JALON, tipo: 'fuerza' }, { alts: ['plancha'], tipo: 'core' }],
      enfriamiento: { min: 5, pasos: ['Caminata suave: 2 min', 'Estiramiento general de piernas, pecho y espalda: 3 min'] }
    },
    fullB: {
      nombre: 'Cuerpo completo B',
      etiqueta: 'Funcional',
      abrev: 'Total B',
      objetivo: 'Variante con trabajo unilateral, de hombro y de potencia de cadera.',
      calentamiento: { min: 8, pasos: [ACTIVACION, { texto: 'Zancadas sin peso: 1×6 por lado' }, { texto: 'Círculos de brazos: 10 en cada dirección' }] },
      bloques: [{ alts: ZANCADA, tipo: 'fuerza' }, { alts: HOMBRO, tipo: 'fuerza' }, { alts: SWING, tipo: 'fuerza' }, { alts: ACARREO, tipo: 'acarreo' }, { alts: ['deadBug'], tipo: 'core' }],
      enfriamiento: { min: 5, pasos: ['Caminata suave: 2 min', 'Estiramiento de cadera, hombros y espalda: 3 min'] }
    }
  };

  // Días sugeridos (0 = lunes) y orden de las sesiones según los días por semana.
  App.data.distribucion = {
    3: { dias: [0, 2, 4], sesiones: ['fullA', 'boxeo', 'fullB'] },
    4: { dias: [0, 2, 4, 5], sesiones: ['inferior', 'boxeo', 'superior', 'cardio'] },
    5: { dias: [0, 1, 3, 4, 5], sesiones: ['inferior', 'boxeo', 'superior', 'cardio', 'metabolico'] },
    6: { dias: [0, 1, 2, 3, 4, 5], sesiones: ['inferior', 'boxeo', 'superior', 'cardio', 'metabolico', 'recuperacion'] }
  };
})(window.Equilibrio);

/* ---------- Hábitos diarios, guía y avisos ---------- */
(function (App) {
  'use strict';

  App.data.habitos = [
    { id: 'horarios', nombre: 'Comí en horarios regulares', descripcion: 'Cinco tiempos de comida, cada 3 a 4 horas.', icono: 'clock' },
    { id: 'sinAzucar', nombre: 'Sin bebidas azucaradas ni azúcar añadida', descripcion: 'Refrescos, jugos y pan dulce solo de forma ocasional.', icono: 'ban' },
    { id: 'sueno', nombre: 'Dormí entre 7 y 9 horas', descripcion: 'Con un horario de sueño lo más constante posible.', icono: 'moon' },
    { id: 'movimiento', nombre: 'Caminé después de comer', descripcion: 'De 10 a 15 minutos de caminata ligera tras alguna comida.', icono: 'activity' },
    { id: 'agua', nombre: 'Tomé agua natural', descripcion: 'Agua simple como bebida principal del día.', icono: 'droplet' }
  ];

  App.data.guiaHabitos = [
    {
      titulo: 'Alimentación',
      icono: 'leaf',
      puntos: [
        'Da prioridad a verduras, leguminosas, pescado, pollo, cereales integrales, aceite de oliva, nueces y semillas: un patrón de tipo mediterráneo adaptado a la cocina mexicana.',
        'Limita las bebidas azucaradas, los jugos y el pan dulce. El exceso de azúcar añadido y de fructosa se asocia con mayor acumulación de grasa en el hígado.',
        'Prefiere alimentos poco procesados y reduce embutidos, frituras y harinas refinadas.',
        'Si tienes hígado graso u otra condición del hígado, consulta con tu médico sobre el consumo de alcohol.'
      ]
    },
    {
      titulo: 'Pérdida de peso gradual',
      icono: 'trending',
      puntos: [
        'Las guías clínicas recomiendan bajar de peso de forma progresiva; alrededor de medio kilo por semana es un ritmo razonable para la mayoría de las personas.',
        'Evita las dietas muy restrictivas y los ayunos prolongados. Este plan reparte la comida en cinco tiempos.'
      ]
    },
    {
      titulo: 'Sueño',
      icono: 'moon',
      puntos: [
        'Procura dormir de 7 a 9 horas, con horarios parecidos todos los días, incluso el fin de semana.',
        'Mantén el cuarto oscuro, silencioso y fresco.',
        'Evita la cafeína por la tarde y las cenas muy abundantes cerca de la hora de dormir.'
      ]
    },
    {
      titulo: 'Estrés',
      icono: 'heart',
      puntos: [
        'El estrés influye en el sueño, el apetito y la constancia. Ningún alimento por sí solo regula las hormonas del estrés; lo que ayuda son los hábitos: dormir bien, moverte, hacer pausas y convivir con otras personas.',
        'En momentos de tensión, prueba de 3 a 5 minutos de respiración lenta: inhala 4 segundos y exhala en 6.'
      ]
    },
    {
      titulo: 'Movimiento diario',
      icono: 'activity',
      puntos: [
        'La OMS recomienda a los adultos de 150 a 300 minutos semanales de actividad moderada y ejercicios de fuerza al menos 2 días por semana.',
        'Caminar de 10 a 15 minutos después de comer es una forma sencilla de sumar movimiento.'
      ]
    }
  ];

  App.data.avisos = {
    plan: 'Este plan está diseñado como orientación general y no sustituye la valoración de un médico o nutriólogo.',
    metricas: 'Las métricas son orientativas y no sustituyen una valoración médica.',
    habitos: 'Son recomendaciones generales de estilo de vida, no un tratamiento.',
    ejercicio: 'Si tienes alguna lesión o condición médica, o llevas tiempo sin entrenar, consulta a un profesional antes de empezar. Detente si sientes dolor, mareo o una falta de aire fuera de lo normal.',
    inicio: 'Si estás embarazada o en lactancia, tienes una condición médica o tomas medicamentos, valida el plan con tu médico antes de seguirlo.'
  };
})(window.Equilibrio);

/* ==========================================================================
   2. NÚCLEO (lógica sin interfaz)
   ========================================================================== */

/* ---------- Utilidades: fechas locales, formato, números ---------- */
(function (App) {
  'use strict';

  const LOCALE = 'es-MX';
  const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const NOMBRES_DIA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const CUARTOS = ['', '¼', '½', '¾'];

  function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
  }

  // Fechas 'AAAA-MM-DD' en hora local. No se usa toISOString() porque convierte
  // a UTC y en México (UTC−6) cambiaría el día a partir de las 18:00.
  const dosDigitos = (n) => String(n).padStart(2, '0');
  const fechaISO = (f = new Date()) => `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`;
  const hoyISO = () => fechaISO(new Date());

  function parseISO(iso) {
    const [a, m, d] = String(iso).split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function esFechaValida(iso) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) && fechaISO(parseISO(iso)) === iso;
  }
  function sumarDias(iso, dias) {
    const f = parseISO(iso);
    f.setDate(f.getDate() + dias);
    return fechaISO(f);
  }
  function diasEntre(desde, hasta) {
    const utc = (iso) => {
      const [a, m, d] = iso.split('-').map(Number);
      return Date.UTC(a, m - 1, d);
    };
    return Math.round((utc(hasta) - utc(desde)) / 86400000);
  }
  const diaSemana = (iso) => (parseISO(iso).getDay() + 6) % 7; // 0 = lunes
  const lunesDe = (iso) => sumarDias(iso, -diaSemana(iso));

  // Ubica una fecha en el ciclo de 4 semanas que inicia el lunes inicioIso.
  function posicionEnCiclo(fechaIso, inicioIso) {
    const dias = Math.max(0, diasEntre(inicioIso, fechaIso));
    const ciclo = Math.floor(dias / 28);
    return {
      semanaIdx: Math.floor(dias / 7) % 4,
      diaIdx: diaSemana(fechaIso),
      ciclo: ciclo + 1,
      inicioCiclo: sumarDias(inicioIso, ciclo * 28)
    };
  }

  const FORMATOS_FECHA = {
    larga: new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }),
    media: new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }),
    corta: new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }),
    mes: new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' })
  };
  const formatoFecha = (iso, estilo = 'media') => FORMATOS_FECHA[estilo].format(parseISO(iso)).replace(/\./g, '');

  const formatosNumero = new Map();
  function num(valor, decimales = 0) {
    if (!formatosNumero.has(decimales)) {
      formatosNumero.set(decimales, new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }));
    }
    return formatosNumero.get(decimales).format(valor);
  }
  const redondear = (valor, paso = 1) => Math.round(valor / paso) * paso;
  const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor));

  // 1.5 → '1½', 0.25 → '¼'
  function fraccion(valor) {
    const cuartos = Math.round(valor * 4);
    const entero = Math.floor(cuartos / 4);
    const resto = CUARTOS[cuartos % 4];
    return entero ? `${entero}${resto}` : resto || '0';
  }

  // Acepta coma o punto decimal ("92,5" o "92.5").
  function leerNumero(texto) {
    const limpio = String(texto ?? '').trim().replace(',', '.');
    return limpio === '' ? NaN : Number(limpio);
  }

  function minutosDeHora(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
  }
  const minutosAhora = (f = new Date()) => f.getHours() * 60 + f.getMinutes();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  App.core.utils = {
    NOMBRES_DIA, NOMBRES_DIA_CORTO, escapeHtml, fechaISO, hoyISO, parseISO, esFechaValida,
    sumarDias, diasEntre, diaSemana, lunesDe, posicionEnCiclo, formatoFecha, num, redondear,
    limitar, fraccion, leerNumero, minutosDeHora, minutosAhora, uid
  };
})(window.Equilibrio);

/* ---------- Almacenamiento (única capa que usa LocalStorage) ---------- */
(function (App) {
  'use strict';

  /*
   * Única capa que toca LocalStorage. Para migrar a un backend (p. ej. Supabase)
   * basta con reimplementar obtener/guardar conservando las mismas claves.
   */
  const PREFIJO = 'equilibrio.v1.';
  const HORARIOS = { desayuno: '07:30', colacion1: '11:00', comida: '14:30', colacion2: '17:30', cena: '20:30' };
  const DEFAULTS = {
    perfil: null,
    registros: [],
    config: { deficitPct: 15, equipo: [], diasPersonalizados: null, horarios: HORARIOS, inicioCiclo: null },
    diario: {},
    actividadesExtra: {},
    compras: {}
  };
  const CLAVES = Object.keys(DEFAULTS);

  const copia = (valor) => (valor == null ? valor : JSON.parse(JSON.stringify(valor)));

  function validarClave(clave) {
    if (!CLAVES.includes(clave)) throw new Error(`Clave de almacenamiento desconocida: ${clave}`);
  }

  function obtener(clave) {
    validarClave(clave);
    let guardado;
    try {
      const crudo = localStorage.getItem(PREFIJO + clave);
      guardado = crudo === null ? undefined : JSON.parse(crudo);
    } catch (error) {
      console.warn(`No se pudo leer "${clave}"; se usan valores por defecto.`, error);
    }
    if (guardado === undefined || guardado === null) return copia(DEFAULTS[clave]);
    if (clave === 'config') {
      return { ...copia(DEFAULTS.config), ...guardado, horarios: { ...HORARIOS, ...(guardado.horarios || {}) } };
    }
    return guardado;
  }

  function guardar(clave, valor) {
    validarClave(clave);
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
      return true;
    } catch (error) {
      window.dispatchEvent(new CustomEvent('equilibrio:error-almacenamiento', { detail: error }));
      return false;
    }
  }

  function actualizar(clave, modificar) {
    const actual = obtener(clave);
    const nuevo = modificar(actual);
    const valor = nuevo === undefined ? actual : nuevo;
    guardar(clave, valor);
    return valor;
  }

  function borrarTodo() {
    CLAVES.forEach((clave) => localStorage.removeItem(PREFIJO + clave));
  }

  function disponible() {
    try {
      const prueba = `${PREFIJO}__prueba`;
      localStorage.setItem(prueba, '1');
      localStorage.removeItem(prueba);
      return true;
    } catch (error) {
      return false;
    }
  }

  function exportar() {
    const datos = {};
    CLAVES.forEach((clave) => { datos[clave] = obtener(clave); });
    return { app: 'equilibrio', version: 1, exportado: App.core.utils.hoyISO(), datos };
  }

  function importar(respaldo) {
    const datos = respaldo && respaldo.app === 'equilibrio' ? respaldo.datos : null;
    const valido = datos && datos.perfil && typeof datos.perfil.alturaCm === 'number'
      && Array.isArray(datos.registros) && datos.registros.length > 0;
    if (!valido) throw new Error('El archivo no es un respaldo válido de Equilibrio.');
    borrarTodo();
    CLAVES.forEach((clave) => { if (datos[clave] !== undefined) guardar(clave, datos[clave]); });
  }

  App.core.storage = { HORARIOS, obtener, guardar, actualizar, borrarTodo, disponible, exportar, importar };
})(window.Equilibrio);

/* ---------- Fórmulas: IMC, ICC, Mifflin-St Jeor, objetivo calórico, macros ---------- */
(function (App) {
  'use strict';

  const { limitar } = App.core.utils;

  // Clasificación del IMC de la OMS para adultos.
  const CATEGORIAS_IMC = [
    { max: 18.5, nombre: 'Bajo peso', clase: 'bajo' },
    { max: 25, nombre: 'Peso normal', clase: 'normal' },
    { max: 30, nombre: 'Sobrepeso', clase: 'sobrepeso' },
    { max: 35, nombre: 'Obesidad grado I', clase: 'ob1' },
    { max: 40, nombre: 'Obesidad grado II', clase: 'ob2' },
    { max: Infinity, nombre: 'Obesidad grado III', clase: 'ob3' }
  ];

  // IMC = peso (kg) / altura (m)²
  function imc(pesoKg, alturaCm) {
    const metros = alturaCm / 100;
    return pesoKg / (metros * metros);
  }
  const categoriaImc = (valor) => CATEGORIAS_IMC.find((c) => valor < c.max);
  const pesoParaImc = (valorImc, alturaCm) => valorImc * (alturaCm / 100) ** 2;

  // Relación cintura/cadera; punto de referencia de la OMS: 0.90 hombres, 0.85 mujeres.
  const relacionCinturaCadera = (cinturaCm, caderaCm) => cinturaCm / caderaCm;
  function interpretarIcc(valor, sexo) {
    const umbral = sexo === 'M' ? 0.9 : 0.85;
    const elevado = valor >= umbral;
    return { umbral, elevado, texto: `${elevado ? 'Igual o mayor' : 'Menor'} que el punto de referencia de la OMS (${umbral.toFixed(2)})` };
  }

  // Tasa metabólica basal, ecuación de Mifflin-St Jeor (1990):
  // 10 × peso (kg) + 6.25 × altura (cm) − 5 × edad + 5 (hombres) o − 161 (mujeres)
  function tasaMetabolicaBasal({ sexo, edad, alturaCm }, pesoKg) {
    return 10 * pesoKg + 6.25 * alturaCm - 5 * edad + (sexo === 'M' ? 5 : -161);
  }

  // Factor de actividad según días de entrenamiento: valores conservadores entre los
  // clásicos 1.375 (actividad ligera), 1.55 (moderada) y 1.725 (intensa).
  const FACTORES_ACTIVIDAD = { 3: 1.375, 4: 1.46, 5: 1.55, 6: 1.64 };
  const OPCIONES_DEFICIT = [10, 15, 20];
  const DEFICIT_MAXIMO_KCAL = 700;
  const MINIMO_KCAL = { F: 1200, M: 1500 };
  const KCAL_POR_KG = 7700; // aproximación clásica; con el tiempo la pérdida real suele ser menor

  /*
   * Gasto diario = TMB × factor de actividad. El déficit es un porcentaje de ese gasto
   * (máximo 700 kcal) y el objetivo nunca baja de la TMB ni del mínimo por sexo.
   */
  function objetivoCalorico(perfil, pesoKg, deficitPct) {
    const pct = OPCIONES_DEFICIT.includes(deficitPct) ? deficitPct : 15;
    const tmb = tasaMetabolicaBasal(perfil, pesoKg);
    const factor = FACTORES_ACTIVIDAD[perfil.diasEntrenamiento] || FACTORES_ACTIVIDAD[3];
    const mantenimiento = tmb * factor;
    const minimo = Math.max(MINIMO_KCAL[perfil.sexo] || MINIMO_KCAL.F, tmb);
    let deficit = Math.min((mantenimiento * pct) / 100, DEFICIT_MAXIMO_KCAL);
    let objetivo = mantenimiento - deficit;
    const ajustado = objetivo < minimo;
    if (ajustado) {
      objetivo = Math.min(minimo, mantenimiento);
      deficit = mantenimiento - objetivo;
    }
    const a10 = (v) => Math.round(v / 10) * 10;
    return {
      tmb: Math.round(tmb),
      factor,
      mantenimiento: a10(mantenimiento),
      deficit: a10(deficit),
      objetivo: a10(objetivo),
      deficitPct: pct,
      minimo: a10(minimo),
      ajustado,
      ritmoKgSemana: (deficit * 7) / KCAL_POR_KG
    };
  }

  // Proteína: 1.6 g por kg de peso meta (máximo 35 % de las calorías). Grasas: 30 %.
  // Carbohidratos: el resto. Todo dentro de los rangos aceptables de referencia.
  function macronutrientes(objetivoKcal, pesoMetaKg) {
    const proteinaG = Math.min(1.6 * pesoMetaKg, (objetivoKcal * 0.35) / 4);
    const grasaKcal = objetivoKcal * 0.3;
    const carboKcal = Math.max(0, objetivoKcal - proteinaG * 4 - grasaKcal);
    const fila = (gramos, kcal) => ({ g: Math.round(gramos), kcal: Math.round(kcal), pct: Math.round((kcal / objetivoKcal) * 100) });
    return {
      proteina: fila(proteinaG, proteinaG * 4),
      carbohidratos: fila(carboKcal / 4, carboKcal),
      grasas: fila(grasaKcal / 9, grasaKcal)
    };
  }

  // Resumen a partir de los registros ordenados por fecha (el primero es la medición inicial).
  function resumenProgreso(perfil, registros) {
    if (!registros.length) return null;
    const inicial = registros[0];
    const actual = registros[registros.length - 1];
    const perdido = inicial.pesoKg - actual.pesoKg;
    const porPerder = inicial.pesoKg - perfil.pesoMetaKg;
    return {
      inicial,
      actual,
      pesoInicial: inicial.pesoKg,
      pesoActual: actual.pesoKg,
      meta: perfil.pesoMetaKg,
      perdido,
      diferencia: actual.pesoKg - inicial.pesoKg,
      porcentajeCambio: (perdido / inicial.pesoKg) * 100,
      restante: Math.max(0, actual.pesoKg - perfil.pesoMetaKg),
      avance: porPerder > 0 ? limitar((perdido / porPerder) * 100, 0, 100) : 100,
      metaAlcanzada: actual.pesoKg <= perfil.pesoMetaKg,
      imc: imc(actual.pesoKg, perfil.alturaCm)
    };
  }

  App.core.calculos = {
    CATEGORIAS_IMC, FACTORES_ACTIVIDAD, OPCIONES_DEFICIT, DEFICIT_MAXIMO_KCAL, MINIMO_KCAL, KCAL_POR_KG,
    imc, categoriaImc, pesoParaImc, relacionCinturaCadera, interpretarIcc, tasaMetabolicaBasal,
    objetivoCalorico, macronutrientes, resumenProgreso
  };
})(window.Equilibrio);

/* ---------- Validación de formularios ---------- */
(function (App) {
  'use strict';

  const { leerNumero, esFechaValida, hoyISO, num } = App.core.utils;
  const { pesoParaImc } = App.core.calculos;

  const RANGOS = {
    edad: { etiqueta: 'tu edad', min: 18, max: 90, unidad: 'años', entero: true },
    alturaCm: { etiqueta: 'tu altura', min: 120, max: 230, unidad: 'cm' },
    pesoKg: { etiqueta: 'tu peso', min: 30, max: 300, unidad: 'kg' },
    cinturaCm: { etiqueta: 'la medida de cintura', min: 40, max: 200, unidad: 'cm' },
    caderaCm: { etiqueta: 'la medida de cadera', min: 50, max: 220, unidad: 'cm' },
    pesoMetaKg: { etiqueta: 'tu peso meta', min: 30, max: 300, unidad: 'kg' },
    diasEntrenamiento: { etiqueta: 'los días de entrenamiento', min: 3, max: 6, unidad: 'días', entero: true }
  };

  function validarNumero(campo, texto) {
    const regla = RANGOS[campo];
    const valor = leerNumero(texto);
    const rango = `entre ${regla.min} y ${regla.max} ${regla.unidad}`;
    if (Number.isNaN(valor)) return { error: `Escribe ${regla.etiqueta} (${rango}).` };
    if (regla.entero && !Number.isInteger(valor)) return { error: `Usa un número entero para ${regla.etiqueta}.` };
    if (valor < regla.min || valor > regla.max) return { error: `Revisa ${regla.etiqueta}: debe estar ${rango}.` };
    return { valor: regla.entero ? valor : Math.round(valor * 10) / 10 };
  }

  function validarNumeros(campos, entrada) {
    const datos = {};
    const errores = {};
    campos.forEach((campo) => {
      const r = validarNumero(campo, entrada[campo]);
      if (r.error) errores[campo] = r.error;
      else datos[campo] = r.valor;
    });
    return { datos, errores };
  }

  function validarTexto(valor, { requerido = false, max, vacio, largo }) {
    const texto = String(valor ?? '').trim();
    if (requerido && !texto) return { error: vacio };
    if (texto.length > max) return { error: largo || `Usa máximo ${max} caracteres.` };
    return { valor: texto };
  }

  function validarDatosPersonales(entrada) {
    const r = validarNumeros(['edad', 'alturaCm'], entrada);
    const nombre = validarTexto(entrada.nombre, { requerido: true, max: 40, vacio: 'Escribe tu nombre.' });
    if (nombre.error) r.errores.nombre = nombre.error;
    else r.datos.nombre = nombre.valor;
    if (entrada.sexo === 'F' || entrada.sexo === 'M') r.datos.sexo = entrada.sexo;
    else r.errores.sexo = 'Selecciona una opción.';
    return r;
  }

  const validarMedidas = (entrada) => validarNumeros(['pesoKg', 'cinturaCm', 'caderaCm'], entrada);

  // La meta debe ser menor al peso actual y no quedar por debajo de un IMC de 18.5.
  function validarObjetivo(entrada, { pesoActualKg, alturaCm }) {
    const r = validarNumeros(['pesoMetaKg', 'diasEntrenamiento'], entrada);
    const meta = r.datos.pesoMetaKg;
    if (meta === undefined) return r;
    const minimo = Math.ceil(pesoParaImc(18.5, alturaCm) * 10) / 10;
    if (pesoActualKg < minimo) {
      r.errores.pesoMetaKg = 'Tu IMC actual ya es menor a 18.5. Esta app está pensada para bajar de peso; consulta a un profesional de la salud.';
    } else if (meta >= pesoActualKg) {
      r.errores.pesoMetaKg = `La meta debe ser menor a tu peso actual (${num(pesoActualKg, 1)} kg).`;
    } else if (meta < minimo) {
      r.errores.pesoMetaKg = `Con tu altura, una meta menor a ${num(minimo, 1)} kg queda por debajo de un IMC de 18.5. Elige una meta mayor.`;
    }
    return r;
  }

  function validarRegistro(entrada) {
    const r = validarMedidas(entrada);
    const fecha = String(entrada.fecha || '');
    if (!esFechaValida(fecha)) r.errores.fecha = 'Elige una fecha válida.';
    else if (fecha > hoyISO()) r.errores.fecha = 'La fecha no puede ser futura.';
    else if (fecha < '2000-01-01') r.errores.fecha = 'Revisa el año de la fecha.';
    else r.datos.fecha = fecha;
    const comentario = validarTexto(entrada.comentario, { max: 200 });
    if (comentario.error) r.errores.comentario = comentario.error;
    else r.datos.comentario = comentario.valor;
    return r;
  }

  function validarActividad(entrada) {
    const datos = {};
    const errores = {};
    const nombre = validarTexto(entrada.nombre, { requerido: true, max: 60, vacio: 'Escribe el tipo de ejercicio.' });
    const reps = validarTexto(entrada.reps, { max: 20, largo: 'Usa máximo 20 caracteres en series o repeticiones.' });
    if (nombre.error) errores.nombre = nombre.error;
    else datos.nombre = nombre.valor;
    if (reps.error) errores.reps = reps.error;
    else datos.reps = reps.valor;
    return { datos, errores };
  }

  function validarHorarios(entrada, tiempos) {
    const errores = {};
    const datos = {};
    let anterior = -1;
    tiempos.forEach(({ id, nombre }) => {
      const valor = String(entrada[id] || '');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) {
        errores[id] = `Elige una hora válida para ${nombre.toLowerCase()}.`;
        return;
      }
      const minutos = App.core.utils.minutosDeHora(valor);
      if (minutos <= anterior) errores[id] = `${nombre} debe ser después del tiempo anterior.`;
      anterior = minutos;
      datos[id] = valor;
    });
    return { datos, errores };
  }

  const sinErrores = (errores) => Object.keys(errores).length === 0;

  App.core.validacion = {
    RANGOS, validarDatosPersonales, validarMedidas, validarObjetivo, validarRegistro,
    validarActividad, validarHorarios, sinErrores
  };
})(window.Equilibrio);

/* ---------- Plan alimenticio: porciones escaladas y lista de compras ---------- */
(function (App) {
  'use strict';

  const { alimentos, comidas, plan4semanas, tiemposComida, categorias } = App.data;
  const { redondear, limitar, fraccion, num, minutosDeHora } = App.core.utils;

  const ESCALA_MIN = 0.7;
  const ESCALA_MAX = 1.6;

  function alimento(id) {
    const a = alimentos[id];
    if (!a) throw new Error(`Alimento desconocido: ${id}`);
    return a;
  }

  function kcalDe(id, cantidad) {
    const a = alimento(id);
    if (a.sinCantidad) return 0;
    return a.u === 'pza' ? cantidad * a.k : (cantidad * a.k) / 100;
  }

  // Promedio diario del plan base: kcal de verduras libres (fijas) y del resto (escalables).
  const base = (() => {
    let fijas = 0;
    let escalables = 0;
    let dias = 0;
    plan4semanas.forEach((semana) => semana.forEach((dia) => {
      dias += 1;
      dia.forEach((comidaId) => comidas[comidaId].ing.forEach(([id, q = 0]) => {
        if (alimento(id).libre) fijas += kcalDe(id, q);
        else escalables += kcalDe(id, q);
      }));
    }));
    return { fijas: fijas / dias, escalables: escalables / dias, total: (fijas + escalables) / dias };
  })();

  // Un solo factor para todo el plan: las verduras se mantienen y el resto se ajusta.
  const factorEscala = (objetivoKcal) => limitar((objetivoKcal - base.fijas) / base.escalables, ESCALA_MIN, ESCALA_MAX);

  function escalar(id, cantidad, factor) {
    const a = alimento(id);
    if (a.sinCantidad || a.libre) return cantidad;
    const valor = cantidad * factor;
    const paso = a.paso || (a.u === 'pza' ? 0.5 : valor >= 100 ? 10 : 5);
    const minimo = a.min ?? (a.u === 'pza' ? 0.5 : 5);
    return Math.max(minimo, redondear(valor, paso));
  }

  const cuartos = (valor) => fraccion(Math.max(0.25, Math.round(valor * 4) / 4));

  function equivalencia(a, q) {
    if (a.cdita) {
      if (q % 15 === 0) return `${q / 15} cda`;
      const n = q / 5;
      return `${fraccion(n)} cdita${n > 1 ? 's' : ''}`;
    }
    const taza = a.tazaG || a.tazaMl;
    if (taza) {
      const t = q / taza;
      return t >= 0.2 ? `≈ ${cuartos(t)} taza${t > 1.125 ? 's' : ''}` : '';
    }
    if (a.pzaG) {
      const p = q / a.pzaG;
      if (p < 0.2) return '';
      return p >= 2 ? `≈ ${Math.round(p)} pzas` : `≈ ${cuartos(p)} pza`;
    }
    return '';
  }

  function textoCantidad(id, q) {
    const a = alimento(id);
    if (a.sinCantidad) return 'al gusto';
    if (a.u === 'pza') {
      const [uno, varios] = a.etiqueta || ['pza', 'pzas'];
      return `${fraccion(q)} ${q > 1 ? varios : uno}`;
    }
    const eq = equivalencia(a, q);
    return `${num(q)} ${a.u}${eq ? ` (${eq})` : ''}`;
  }

  function comidaEscalada(comidaId, factor) {
    const c = comidas[comidaId];
    const ingredientes = c.ing.map(([id, q]) => {
      const a = alimento(id);
      const cantidad = a.sinCantidad ? 0 : escalar(id, q, factor);
      return { id, nombre: a.nombre, cantidad, texto: textoCantidad(id, cantidad), kcal: kcalDe(id, cantidad) };
    });
    return {
      id: comidaId,
      nombre: c.nombre,
      prep: c.prep,
      ingredientes,
      kcal: Math.round(ingredientes.reduce((suma, i) => suma + i.kcal, 0))
    };
  }

  function dia(semanaIdx, diaIdx, factor) {
    const ids = plan4semanas[semanaIdx][diaIdx];
    const lista = tiemposComida.map((t, i) => ({ tiempo: t.id, etiqueta: t.nombre, ...comidaEscalada(ids[i], factor) }));
    return { semanaIdx, diaIdx, comidas: lista, kcal: lista.reduce((suma, c) => suma + c.kcal, 0) };
  }

  const semana = (semanaIdx, factor) => plan4semanas[semanaIdx].map((_, diaIdx) => dia(semanaIdx, diaIdx, factor));

  // Siguiente comida pendiente: la primera no marcada cuya hora (+60 min de margen) no ha pasado.
  function siguienteComida(horarios, completadas, minutosActuales) {
    return tiemposComida.find((t) => !completadas[t.id] && minutosDeHora(horarios[t.id]) + 60 >= minutosActuales) || null;
  }

  // Lista del supermercado: suma de la semana, convertida a producto de compra y redondeada hacia arriba.
  const redondearCompra = (q) => {
    const paso = q <= 100 ? 10 : q <= 1000 ? 50 : 100;
    return Math.ceil(q / paso - 1e-9) * paso;
  };
  const decimalesKg = (v) => (Number.isInteger(v) ? 0 : 1);

  function textoCompra(id, total) {
    const a = alimento(id);
    const nombre = a.compra ? a.compra.nombre : a.nombre;
    if (a.sinCantidad) return { nombre, cantidad: a.compraTexto || 'al gusto', aprox: '' };
    const q = total * (a.compra ? a.compra.factor : 1);
    if (a.u === 'pza') {
      const n = Math.ceil(q - 1e-9);
      const [uno, varios] = a.etiqueta || ['pza', 'pzas'];
      const kg = a.pzaG ? Math.round((n * a.pzaG) / 100) / 10 : 0;
      return { nombre, cantidad: `${n} ${n > 1 ? varios : uno}`, aprox: kg ? `≈ ${num(kg, decimalesKg(kg))} kg` : '' };
    }
    const r = redondearCompra(q);
    const grande = r >= 1000;
    const cantidad = grande ? `${num(r / 1000, decimalesKg(r / 1000))} ${a.u === 'g' ? 'kg' : 'l'}` : `${r} ${a.u}`;
    let aprox = '';
    if (a.paquete) {
      const n = Math.ceil(q / a.paquete.g - 1e-9);
      aprox = `≈ ${n} ${n > 1 ? a.paquete.plural : a.paquete.nombre}`;
    } else if (a.pzaG >= 20) {
      const n = Math.ceil(q / a.pzaG - 1e-9);
      aprox = `≈ ${n} ${n > 1 ? 'pzas' : 'pza'}`;
    }
    return { nombre, cantidad, aprox };
  }

  function listaCompras(semanaIdx, factor) {
    const totales = new Map();
    semana(semanaIdx, factor).forEach((d) => d.comidas.forEach((c) => c.ingredientes.forEach((ing) => {
      totales.set(ing.id, (totales.get(ing.id) || 0) + ing.cantidad);
    })));
    return categorias
      .map((cat) => ({
        ...cat,
        items: [...totales.entries()]
          .filter(([id]) => alimento(id).cat === cat.id)
          .map(([id, total]) => ({ id, ...textoCompra(id, total) }))
          .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
      }))
      .filter((cat) => cat.items.length);
  }

  App.core.plan = { base, kcalDe, factorEscala, escalar, textoCantidad, comidaEscalada, dia, semana, siguienteComida, listaCompras };
})(window.Equilibrio);

/* ---------- Motor de rutinas: calendario, equipo y progresión ---------- */
(function (App) {
  'use strict';

  const { ejercicios, sesiones, progresion, distribucion, semanasEntrenamiento } = App.data;
  const { NOMBRES_DIA, posicionEnCiclo } = App.core.utils;

  const distribucionPara = (dias) => distribucion[dias] || distribucion[4];

  // Días personalizados si son válidos (misma cantidad que los días elegidos); si no, los sugeridos.
  function diasEntrenamiento(perfil, config) {
    const base = distribucionPara(perfil.diasEntrenamiento);
    const elegidos = config.diasPersonalizados;
    const validos = Array.isArray(elegidos)
      && elegidos.length === base.sesiones.length
      && new Set(elegidos).size === elegidos.length
      && elegidos.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    return validos ? [...elegidos].sort((a, b) => a - b) : base.dias;
  }

  function calendario(perfil, config) {
    const dias = diasEntrenamiento(perfil, config);
    const { sesiones: orden } = distribucionPara(perfil.diasEntrenamiento);
    return NOMBRES_DIA.map((nombre, dia) => {
      const posicion = dias.indexOf(dia);
      return { dia, nombre, sesionId: posicion >= 0 ? orden[posicion] : null };
    });
  }

  const disponible = (id, equipo) => !ejercicios[id].eq || equipo.has(ejercicios[id].eq);

  // Primera alternativa con equipo disponible que no se haya usado en la sesión.
  function elegir(alternativas, equipo, usados) {
    const posibles = alternativas.filter((id) => disponible(id, equipo));
    return posibles.find((id) => !usados.has(id)) || posibles[posibles.length - 1] || alternativas[alternativas.length - 1];
  }

  const duracion = (seg) => (seg % 60 === 0 ? `${seg / 60} min` : `${seg} s`);

  function claveProgresion(tipo, ej) {
    const medida = ej.medida || 'reps';
    if (tipo === 'core') return medida === 'tiempo' ? 'coreTiempo' : 'coreReps';
    if (tipo === 'acarreo') return medida === 'tiempo' ? 'acarreo' : 'coreReps';
    if (tipo === 'fuerza') return medida === 'tiempo' ? 'coreTiempo' : 'fuerza';
    return tipo;
  }

  // Devuelve el texto de la prescripción y su duración estimada en segundos.
  function prescribir(tipo, ej, semanaIdx) {
    const clave = claveProgresion(tipo, ej);
    const p = progresion[clave][semanaIdx];
    const lado = ej.lado ? ' c/lado' : '';
    const veces = ej.lado ? 2 : 1;
    switch (clave) {
      case 'fuerza':
        return { detalle: `${p.series}×${p.reps}${lado}`, descanso: `${p.descanso} s`, segundos: p.series * (p.reps * 4 * veces + p.descanso) };
      case 'coreReps':
        return { detalle: `${p.series}×${p.reps}${lado}`, descanso: `${p.descanso} s`, segundos: p.series * (p.reps * 3 * veces + p.descanso) };
      case 'coreTiempo':
      case 'acarreo':
        return { detalle: `${p.series}×${p.seg} s${lado}`, descanso: `${p.descanso} s`, segundos: p.series * (p.seg * veces + p.descanso) };
      case 'boxeo':
        return { detalle: `${p.series} rounds de ${duracion(p.seg)}`, corto: `${p.series}×${duracion(p.seg)}`, unidad: 'rounds', descanso: duracion(p.descanso), segundos: p.series * (p.seg + p.descanso) };
      case 'intervalos':
        return { detalle: `${p.series}×${p.seg} s`, descanso: `${p.descanso} s`, segundos: p.series * (p.seg + p.descanso) };
      case 'circuito':
        return { detalle: `${p.seg} s`, descanso: '', segundos: 0 };
      default:
        return { detalle: `${p.min} min`, descanso: '', segundos: p.min * 60 };
    }
  }

  function construirSesion(sesionId, semanaIdx, equipoIds = []) {
    const plantilla = sesiones[sesionId];
    const equipo = new Set(equipoIds);
    const usados = new Set();
    const bloques = plantilla.bloques.map((bloque) => {
      const id = elegir(bloque.alts, equipo, usados);
      usados.add(id);
      const ej = ejercicios[id];
      return { id, nombre: ej.nombre, tip: ej.tip || '', ...prescribir(bloque.tipo, ej, semanaIdx) };
    });
    const textoPaso = (paso) => paso.texto || `${ejercicios[elegir(paso.alts, equipo, new Set())].nombre}: ${paso.detalle}`;

    let segundos = bloques.reduce((suma, b) => suma + b.segundos, 0);
    let circuito = null;
    if (plantilla.formato === 'circuito') {
      const c = progresion.circuito[semanaIdx];
      segundos = c.vueltas * bloques.length * (c.seg + c.descanso) + (c.vueltas - 1) * c.entreVueltas;
      circuito = { ...c, texto: `${c.vueltas} vueltas al circuito: ${c.seg} s de trabajo y ${c.descanso} s de descanso por estación, con ${c.entreVueltas} s de pausa entre vueltas.` };
    }
    segundos += (plantilla.calentamiento.min + plantilla.enfriamiento.min) * 60;

    return {
      id: sesionId,
      nombre: plantilla.nombre,
      etiqueta: plantilla.etiqueta,
      objetivo: plantilla.objetivo,
      calentamiento: plantilla.calentamiento.pasos.map(textoPaso),
      bloques,
      enfriamiento: plantilla.enfriamiento.pasos,
      circuito,
      minutos: Math.max(5, Math.round(segundos / 300) * 5)
    };
  }

  function sesionDelDia(fechaIso, perfil, config) {
    const pos = posicionEnCiclo(fechaIso, config.inicioCiclo);
    const dia = calendario(perfil, config)[pos.diaIdx];
    return { ...pos, sesion: dia.sesionId ? construirSesion(dia.sesionId, pos.semanaIdx, config.equipo) : null };
  }

  function textoCompartir(sesion, diaNombre, semanaIdx, extras = []) {
    const lista = (titulo, items) => (items.length ? ['', titulo, ...items.map((t) => `• ${t}`)] : []);
    return [
      `*${diaNombre}: ${sesion.nombre}*`,
      `Semana ${semanaIdx + 1} (${semanasEntrenamiento[semanaIdx].titulo.toLowerCase()}), unos ${sesion.minutos} min`,
      ...lista('Calentamiento', sesion.calentamiento),
      ...(sesion.circuito ? ['', sesion.circuito.texto] : []),
      ...lista('Ejercicios', [
        ...sesion.bloques.map((b) => `${b.nombre}: ${b.detalle}${b.descanso ? `, descanso ${b.descanso}` : ''}`),
        ...extras.map((x) => (x.reps ? `${x.nombre}: ${x.reps}` : x.nombre))
      ]),
      ...lista('Enfriamiento', sesion.enfriamiento)
    ].join('\n');
  }

  App.core.rutinas = { distribucionPara, diasEntrenamiento, calendario, construirSesion, sesionDelDia, textoCompartir };
})(window.Equilibrio);

/* ---------- Seguimiento: registros, diario y racha ---------- */
(function (App) {
  'use strict';

  const { storage, utils } = App.core;

  // Registros de medidas, siempre ordenados por fecha (el primero es la medición inicial).
  const registros = () => storage.obtener('registros').slice().sort((a, b) => a.fecha.localeCompare(b.fecha));

  function registroActual() {
    const lista = registros();
    return lista[lista.length - 1] || null;
  }

  // Crea un registro; si ya hay uno en la misma fecha lo reemplaza. Con id, edita ese registro.
  function guardarRegistro(datos, id) {
    const lista = registros();
    if (id) {
      if (lista.some((r) => r.fecha === datos.fecha && r.id !== id)) return { error: 'Ya hay otro registro en esa fecha.' };
      storage.guardar('registros', lista.map((r) => (r.id === id ? { ...r, ...datos } : r)));
      return { accion: 'actualizado' };
    }
    const existente = lista.find((r) => r.fecha === datos.fecha);
    if (existente) {
      storage.guardar('registros', lista.map((r) => (r === existente ? { ...r, ...datos } : r)));
      return { accion: 'reemplazado' };
    }
    storage.guardar('registros', [...lista, { id: utils.uid(), ...datos }]);
    return { accion: 'creado' };
  }

  function eliminarRegistro(id) {
    const lista = registros();
    if (lista.length <= 1) return false;
    storage.guardar('registros', lista.filter((r) => r.id !== id));
    return true;
  }

  // Diario por fecha: { habitos: {id: true}, comidas: {tiempo: true}, entrenamiento: true }
  const soloMarcados = (obj = {}) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
  const normalizar = (d = {}) => ({ habitos: soloMarcados(d.habitos), comidas: soloMarcados(d.comidas), entrenamiento: Boolean(d.entrenamiento) });

  const dia = (fecha, diario = storage.obtener('diario')) => normalizar(diario[fecha]);

  function guardarDia(fecha, valor) {
    storage.actualizar('diario', (diario) => {
      const limpio = normalizar(valor);
      const vacio = !limpio.entrenamiento && !Object.keys(limpio.habitos).length && !Object.keys(limpio.comidas).length;
      if (vacio) delete diario[fecha];
      else diario[fecha] = limpio;
      return diario;
    });
  }

  function marcar(fecha, grupo, id, valor) {
    const d = dia(fecha);
    d[grupo][id] = valor;
    guardarDia(fecha, d);
  }
  const marcarHabito = (fecha, id, valor) => marcar(fecha, 'habitos', id, valor);
  const marcarComida = (fecha, tiempo, valor) => marcar(fecha, 'comidas', tiempo, valor);
  function marcarEntrenamiento(fecha, valor) {
    const d = dia(fecha);
    d.entrenamiento = valor;
    guardarDia(fecha, d);
  }

  // Un día cuenta para la racha si se registró algún hábito, comida, entrenamiento o medida.
  function contexto() {
    return { diario: storage.obtener('diario'), fechasRegistro: new Set(registros().map((r) => r.fecha)) };
  }
  function diaActivo(fecha, ctx) {
    const d = dia(fecha, ctx.diario);
    return d.entrenamiento || Object.keys(d.habitos).length > 0 || Object.keys(d.comidas).length > 0 || ctx.fechasRegistro.has(fecha);
  }

  // Días consecutivos activos contando desde hoy (o desde ayer si hoy aún no se registra nada).
  function racha(hoy = utils.hoyISO()) {
    const ctx = contexto();
    let fecha = diaActivo(hoy, ctx) ? hoy : utils.sumarDias(hoy, -1);
    let total = 0;
    while (total < 3660 && diaActivo(fecha, ctx)) {
      total += 1;
      fecha = utils.sumarDias(fecha, -1);
    }
    return total;
  }

  // Resumen de un rango de fechas para el historial.
  function resumenRango(desde, hasta) {
    const ctx = contexto();
    const resumen = { activos: 0, entrenamientos: 0, comidas: 0, habitos: 0, dias: [] };
    for (let fecha = desde; fecha <= hasta; fecha = utils.sumarDias(fecha, 1)) {
      const d = dia(fecha, ctx.diario);
      const habitos = App.data.habitos.filter((h) => d.habitos[h.id]).length;
      const activo = diaActivo(fecha, ctx);
      resumen.dias.push({ fecha, habitos, entrenamiento: d.entrenamiento, comidas: Object.keys(d.comidas).length, activo, registro: ctx.fechasRegistro.has(fecha) });
      if (activo) resumen.activos += 1;
      if (d.entrenamiento) resumen.entrenamientos += 1;
      resumen.comidas += Object.keys(d.comidas).length;
      resumen.habitos += habitos;
    }
    return resumen;
  }

  App.core.seguimiento = {
    registros, registroActual, guardarRegistro, eliminarRegistro, dia, guardarDia,
    marcarHabito, marcarComida, marcarEntrenamiento, racha, resumenRango
  };
})(window.Equilibrio);

/* ---------- Contexto compartido por las pantallas ---------- */
(function (App) {
  'use strict';

  const { storage, utils, calculos, plan, seguimiento } = App.core;

  // Datos derivados que comparten las pantallas; se recalculan en cada render.
  App.core.contexto = function contexto() {
    const perfil = storage.obtener('perfil');
    const config = storage.obtener('config');
    if (!config.inicioCiclo) config.inicioCiclo = utils.lunesDe(perfil.creadoEl || utils.hoyISO());
    const registros = seguimiento.registros();
    const resumen = calculos.resumenProgreso(perfil, registros);
    const hoy = utils.hoyISO();
    const objetivo = calculos.objetivoCalorico(perfil, resumen.pesoActual, config.deficitPct);
    return {
      perfil,
      config,
      registros,
      resumen,
      hoy,
      pos: utils.posicionEnCiclo(hoy, config.inicioCiclo),
      objetivo,
      factor: plan.factorEscala(objetivo.objetivo)
    };
  };
})(window.Equilibrio);

/* ==========================================================================
   3. INTERFAZ
   ========================================================================== */

/* ---------- Iconos SVG ---------- */
(function (App) {
  'use strict';

  const TRAZOS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    utensils: '<path d="M5 3v5a2 2 0 0 0 4 0V3"/><path d="M7 3v18"/><path d="M17 21V3c-2.2 1.6-3.2 4.2-3.2 7.2 0 1.6 1 2.8 3.2 2.8"/>',
    dumbbell: '<rect x="4.5" y="7" width="3" height="10" rx="1"/><rect x="16.5" y="7" width="3" height="10" rx="1"/><path d="M7.5 12h9M2.5 10v4M21.5 10v4"/>',
    trending: '<path d="M22 17 13.5 8.5l-5 5L2 7"/><path d="M16 17h6v-6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.1-2-5.6-3.6-7.2-.3 1.6-1.2 2.8-2.4 3.4.2-3.3-1.2-6.4-4-8.6-.4 3.3-2 5.4-3.6 7.3C3.9 12.1 5 14.6 5 15.4 5 19.3 8 22 12 22z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    droplet: '<path d="M12 2.7 17.7 8.3a8 8 0 1 1-11.3 0z"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6 2.4-.5 4.9-2 5.9-3"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.7z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>'
  };

  App.ui.icono = (nombre, clase = '') => `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TRAZOS[nombre] || TRAZOS.info}</svg>`;

  // Símbolo de la marca: círculo con una onda (equilibrio).
  App.ui.marca = () => '<svg class="marca-simbolo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M5.5 13.5c2.2-1.8 4.3-1.8 6.5 0s4.3 1.8 6.5 0" fill="none" stroke="var(--app-accent)" stroke-width="2.5" stroke-linecap="round"/></svg>';
})(window.Equilibrio);

/* ---------- Componentes: avisos, modales, formularios, tarjetas ---------- */
(function (App) {
  'use strict';

  const { escapeHtml, num, limitar } = App.core.utils;
  const { icono } = App.ui;

  /* ---------- Avisos emergentes ---------- */
  function toast(mensaje, tipo = 'exito') {
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-atomic', 'true');
    const simbolo = { exito: 'check', error: 'alert', info: 'info' }[tipo] || 'info';
    el.innerHTML = `<div class="toast-cuerpo">${icono(simbolo)}<span>${escapeHtml(mensaje)}</span>
      <button type="button" class="toast-cerrar" data-bs-dismiss="toast" aria-label="Cerrar">${icono('x')}</button></div>`;
    document.getElementById('toasts').appendChild(el);
    el.addEventListener('hidden.bs.toast', () => el.remove());
    bootstrap.Toast.getOrCreateInstance(el, { delay: tipo === 'error' ? 6000 : 3000 }).show();
  }

  /* ---------- Modales ---------- */
  const modal = {
    abrir({ titulo, cuerpo, alMostrar }) {
      const el = document.getElementById('modal-app');
      el.querySelector('.modal-title').textContent = titulo;
      const contenido = el.querySelector('.modal-body');
      contenido.innerHTML = cuerpo;
      if (alMostrar) alMostrar(contenido);
      bootstrap.Modal.getOrCreateInstance(el).show();
    },
    cerrar() {
      const instancia = bootstrap.Modal.getInstance(document.getElementById('modal-app'));
      if (instancia) instancia.hide();
    }
  };

  function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false }) {
    return new Promise((resolver) => {
      const el = document.getElementById('modal-confirmar');
      const boton = el.querySelector('[data-confirmar]');
      const instancia = bootstrap.Modal.getOrCreateInstance(el);
      let confirmado = false;
      el.querySelector('.modal-title').textContent = titulo;
      el.querySelector('.modal-body').innerHTML = `<p class="mb-0">${escapeHtml(mensaje)}</p>`;
      boton.textContent = textoConfirmar;
      boton.className = `btn ${peligro ? 'btn-danger' : 'btn-primary'}`;
      const alConfirmar = () => {
        confirmado = true;
        instancia.hide();
      };
      boton.addEventListener('click', alConfirmar);
      el.addEventListener('hidden.bs.modal', () => {
        boton.removeEventListener('click', alConfirmar);
        resolver(confirmado);
      }, { once: true });
      instancia.show();
    });
  }

  /* ---------- Formularios ---------- */
  function atributos(mapa) {
    return Object.entries(mapa)
      .filter(([, v]) => v !== undefined && v !== null && v !== false && v !== '')
      .map(([k, v]) => (v === true ? k : `${k}="${escapeHtml(v)}"`))
      .join(' ');
  }

  const describir = (nombre, ayuda) => `e-${nombre}${ayuda ? ` a-${nombre}` : ''}`;

  function envolver({ nombre, etiqueta, ayuda, control }) {
    return `<div class="campo">
      <label class="form-label" for="f-${nombre}">${etiqueta}</label>
      ${control}
      ${ayuda ? `<div class="form-text" id="a-${nombre}">${ayuda}</div>` : ''}
      <div class="invalid-feedback" id="e-${nombre}" data-error-de="${nombre}"></div>
    </div>`;
  }

  function campoTexto({ nombre, etiqueta, valor = '', max = 60, ayuda = '', autocomplete = 'off', placeholder = '' }) {
    const control = `<input ${atributos({ class: 'form-control', type: 'text', id: `f-${nombre}`, name: nombre, value: valor, maxlength: max, autocomplete, placeholder, 'aria-describedby': describir(nombre, ayuda) })}>`;
    return envolver({ nombre, etiqueta, ayuda, control });
  }

  function campoNumero({ nombre, etiqueta, valor = '', unidad = '', ayuda = '', entero = false, placeholder = '' }) {
    const input = `<input ${atributos({ class: 'form-control', type: 'text', inputmode: entero ? 'numeric' : 'decimal', id: `f-${nombre}`, name: nombre, value: valor, autocomplete: 'off', placeholder, 'aria-describedby': describir(nombre, ayuda) })}>`;
    const control = unidad ? `<div class="input-group">${input}<span class="input-group-text">${unidad}</span></div>` : input;
    return envolver({ nombre, etiqueta, ayuda, control });
  }

  function campoFecha({ nombre, etiqueta, valor = '', max = '', ayuda = '' }) {
    const control = `<input ${atributos({ class: 'form-control', type: 'date', id: `f-${nombre}`, name: nombre, value: valor, max, 'aria-describedby': describir(nombre, ayuda) })}>`;
    return envolver({ nombre, etiqueta, ayuda, control });
  }

  function campoHora({ nombre, etiqueta, valor = '' }) {
    const control = `<input ${atributos({ class: 'form-control', type: 'time', id: `f-${nombre}`, name: nombre, value: valor, step: 300, 'aria-describedby': describir(nombre, '') })}>`;
    return envolver({ nombre, etiqueta, ayuda: '', control });
  }

  function campoAreaTexto({ nombre, etiqueta, valor = '', max = 200, ayuda = '' }) {
    const control = `<textarea ${atributos({ class: 'form-control', id: `f-${nombre}`, name: nombre, rows: 2, maxlength: max, 'aria-describedby': describir(nombre, ayuda) })}>${escapeHtml(valor)}</textarea>`;
    return envolver({ nombre, etiqueta, ayuda, control });
  }

  function grupoOpciones({ nombre, etiqueta, tipo, opciones, ayuda = '', clase = '' }) {
    const items = opciones.map(({ valor, texto, marcado }) => {
      const id = `f-${nombre}-${valor}`;
      return `<input ${atributos({ type: tipo, class: 'btn-check', name: nombre, id, value: valor, checked: marcado, autocomplete: 'off' })}><label class="btn btn-opcion" for="${id}">${texto}</label>`;
    }).join('');
    return `<fieldset class="campo">
      <legend class="form-label">${etiqueta}</legend>
      <div class="opciones ${clase}">${items}</div>
      ${ayuda ? `<div class="form-text">${ayuda}</div>` : ''}
      <div class="invalid-feedback" data-error-de="${nombre}"></div>
    </fieldset>`;
  }

  const campoOpciones = ({ nombre, etiqueta, valor, opciones, ayuda }) => grupoOpciones({
    nombre, etiqueta, ayuda, tipo: 'radio',
    opciones: opciones.map(([v, texto]) => ({ valor: v, texto, marcado: String(valor) === String(v) }))
  });

  const campoEquipo = (seleccion = []) => grupoOpciones({
    nombre: 'equipo',
    etiqueta: 'Equipo disponible',
    tipo: 'checkbox',
    clase: 'opciones-chips',
    ayuda: 'Si no marcas nada, las rutinas usan tu peso corporal.',
    opciones: App.data.equipo.map((e) => ({ valor: e.id, texto: e.nombre, marcado: seleccion.includes(e.id) }))
  });

  const campoDias = (seleccion = []) => grupoOpciones({
    nombre: 'dias',
    etiqueta: 'Días de entrenamiento',
    tipo: 'checkbox',
    clase: 'opciones-dias',
    opciones: App.core.utils.NOMBRES_DIA_CORTO.map((texto, i) => ({ valor: String(i), texto, marcado: seleccion.includes(i) }))
  });

  const leerFormulario = (form) => Object.fromEntries(new FormData(form).entries());
  const valoresMarcados = (form, nombre) => [...form.querySelectorAll(`input[name="${nombre}"]:checked`)].map((i) => i.value);

  // Muestra errores por campo; devuelve true si no hay errores.
  function mostrarErrores(form, errores) {
    form.querySelectorAll('[name]').forEach((el) => {
      const invalido = Boolean(errores[el.name]);
      el.classList.toggle('is-invalid', invalido && el.type !== 'radio' && el.type !== 'checkbox');
      if (invalido) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    });
    form.querySelectorAll('[data-error-de]').forEach((el) => {
      const mensaje = errores[el.dataset.errorDe] || '';
      el.textContent = mensaje;
      el.classList.toggle('d-block', Boolean(mensaje));
    });
    const primero = form.querySelector('[aria-invalid="true"]');
    if (primero) primero.focus();
    return !primero;
  }

  /* ---------- Piezas de presentación ---------- */
  function cabecera({ titulo, intro = '', acciones = '' }) {
    return `<header class="pagina-cabecera">
      <div><h1 class="pagina-titulo">${titulo}</h1>${intro ? `<p class="pagina-intro">${intro}</p>` : ''}</div>
      ${acciones ? `<div class="pagina-acciones">${acciones}</div>` : ''}
    </header>`;
  }

  const estadoVacio = ({ icono: simbolo = 'info', titulo, texto = '', accion = '' }) => `<div class="vacio">
      <span class="vacio-icono">${icono(simbolo)}</span>
      <p class="vacio-titulo">${titulo}</p>
      ${texto ? `<p class="vacio-texto">${texto}</p>` : ''}${accion}
    </div>`;

  function barra(porcentaje, etiqueta) {
    const valor = Math.round(limitar(porcentaje, 0, 100));
    return `<div class="progress" role="progressbar" aria-label="${escapeHtml(etiqueta)}" aria-valuenow="${valor}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width: ${valor}%"></div></div>`;
  }

  const stat = (etiqueta, valor, unidad = '', nota = '') => `<div class="stat">
      <p class="stat-etiqueta">${etiqueta}</p>
      <p class="stat-valor"><span class="cifra">${valor}</span>${unidad ? `<span class="unidad">${unidad}</span>` : ''}</p>
      ${nota ? `<p class="stat-nota">${nota}</p>` : ''}
    </div>`;

  // Escala visual del IMC entre 15 y 45 con los cortes de la OMS.
  function escalaImc(valor) {
    const MIN = 15;
    const MAX = 45;
    const pos = (v) => ((limitar(v, MIN, MAX) - MIN) / (MAX - MIN)) * 100;
    const tramos = [[15, 18.5, 'bajo'], [18.5, 25, 'normal'], [25, 30, 'sobrepeso'], [30, 35, 'ob1'], [35, 40, 'ob2'], [40, 45, 'ob3']];
    return `<div class="escala-imc" aria-hidden="true">
      <div class="escala-imc-barra">${tramos.map(([a, b, c]) => `<span class="tramo-${c}" style="width: ${pos(b) - pos(a)}%"></span>`).join('')}</div>
      <span class="escala-imc-marca" style="left: ${pos(valor)}%"></span>
      <div class="escala-imc-cortes">${[18.5, 25, 30, 35, 40].map((v) => `<span style="left: ${pos(v)}%">${v}</span>`).join('')}</div>
    </div>`;
  }

  function tarjetaImc(valor) {
    const categoria = App.core.calculos.categoriaImc(valor);
    return `<section class="tarjeta h-100" aria-label="Índice de masa corporal">
      <h2 class="tarjeta-titulo">Índice de masa corporal</h2>
      <p class="metrica"><span class="cifra cifra-lg">${num(valor, 1)}</span><span class="chip chip-imc-${categoria.clase}">${categoria.nombre}</span></p>
      ${escalaImc(valor)}
      <p class="nota">Clasificación de la OMS para adultos. El IMC no distingue entre grasa y músculo.</p>
    </section>`;
  }

  function tarjetaIcc(registro, sexo) {
    const { relacionCinturaCadera, interpretarIcc } = App.core.calculos;
    const valor = relacionCinturaCadera(registro.cinturaCm, registro.caderaCm);
    const lectura = interpretarIcc(valor, sexo);
    return `<section class="tarjeta h-100" aria-label="Relación cintura cadera">
      <h2 class="tarjeta-titulo">Relación cintura/cadera</h2>
      <p class="metrica"><span class="cifra cifra-lg">${num(valor, 2)}</span><span class="chip ${lectura.elevado ? 'chip-aviso' : 'chip-primario'}">${lectura.elevado ? 'Por arriba de la referencia' : 'Dentro de la referencia'}</span></p>
      <p class="mb-1">Cintura ${num(registro.cinturaCm, 1)} cm y cadera ${num(registro.caderaCm, 1)} cm.</p>
      <p class="nota">${lectura.texto}. Sirve como referencia de la grasa abdominal.</p>
    </section>`;
  }

  /* ---------- Acciones externas ---------- */
  function abrirEnlace(url) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  const abrirWhatsApp = (texto) => abrirEnlace(`https://wa.me/?text=${encodeURIComponent(texto)}`);

  function descargarJson(nombreArchivo, datos) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  Object.assign(App.ui, {
    toast, modal, confirmar, campoTexto, campoNumero, campoFecha, campoHora, campoAreaTexto,
    campoOpciones, campoEquipo, campoDias, leerFormulario, valoresMarcados, mostrarErrores,
    cabecera, estadoVacio, barra, stat, escalaImc, tarjetaImc, tarjetaIcc, abrirWhatsApp, descargarJson
  });
})(window.Equilibrio);

/* ---------- Gráfica de líneas en SVG ---------- */
(function (App) {
  'use strict';

  const { escapeHtml, num, formatoFecha, diasEntre } = App.core.utils;

  // Paso "redondo" (1, 2, 2.5 o 5 × 10ⁿ) para las marcas del eje vertical.
  function pasoRedondo(rango, marcas = 4) {
    const bruto = rango / marcas;
    const potencia = 10 ** Math.floor(Math.log10(bruto));
    const n = bruto / potencia;
    const factor = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return Number((factor * potencia).toPrecision(6));
  }

  function svgLinea({ puntos, ancho, alto = 230, unidad = '', decimales = 1, meta = null, titulo = '' }) {
    const m = { arriba: 26, derecha: 18, abajo: 30, izquierda: 44 };
    const valores = puntos.map((p) => p.valor).concat(meta === null ? [] : [meta]);
    const holgura = Math.max((Math.max(...valores) - Math.min(...valores)) * 0.15, decimales ? 0.5 : 1);
    const min = Math.min(...valores) - holgura;
    const max = Math.max(...valores) + holgura;
    const paso = pasoRedondo(max - min);
    const decMarca = Math.min(2, (String(paso).split('.')[1] || '').length);
    const totalDias = Math.max(1, diasEntre(puntos[0].fecha, puntos[puntos.length - 1].fecha));
    const anchoUtil = ancho - m.izquierda - m.derecha;

    const x = (fecha) => (puntos.length === 1 ? m.izquierda + anchoUtil / 2 : m.izquierda + (diasEntre(puntos[0].fecha, fecha) / totalDias) * anchoUtil);
    const y = (v) => m.arriba + ((max - v) / (max - min)) * (alto - m.arriba - m.abajo);
    const coords = puntos.map((p) => ({ ...p, cx: x(p.fecha), cy: y(p.valor) }));
    const ultimo = coords[coords.length - 1];
    const trazo = coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(' ');
    const piso = (alto - m.abajo).toFixed(1);
    const area = `${trazo} L${ultimo.cx.toFixed(1)} ${piso} L${coords[0].cx.toFixed(1)} ${piso} Z`;

    const marcas = [];
    for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) marcas.push(Number(v.toFixed(6)));
    const rejilla = marcas.map((v) => `<line x1="${m.izquierda}" x2="${ancho - m.derecha}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`).join('');
    const etiquetasY = marcas.map((v) => `<text x="${m.izquierda - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${num(v, decMarca)}</text>`).join('');

    const fechasX = puntos.length === 1 ? [[coords[0], 'middle']] : [[coords[0], 'start'], [ultimo, 'end']];
    if (coords.length >= 5 && ancho >= 420) fechasX.push([coords[Math.floor(coords.length / 2)], 'middle']);
    const etiquetasX = fechasX.map(([c, ancla]) => `<text x="${c.cx.toFixed(1)}" y="${alto - 8}" text-anchor="${ancla}">${escapeHtml(formatoFecha(c.fecha, 'corta'))}</text>`).join('');

    const lineaMeta = meta === null ? '' : `<line class="graf-meta" x1="${m.izquierda}" x2="${ancho - m.derecha}" y1="${y(meta).toFixed(1)}" y2="${y(meta).toFixed(1)}"/>
      <text class="graf-meta-texto" x="${m.izquierda + 6}" y="${(y(meta) - 6).toFixed(1)}">Meta ${num(meta, decimales)} ${unidad}</text>`;

    const conPuntos = coords.length <= 40;
    const circulos = coords.map((c, i) => {
      const esUltimo = i === coords.length - 1;
      if (!conPuntos && !esUltimo) return '';
      return `<circle class="graf-punto${esUltimo ? ' ultimo' : ''}" cx="${c.cx.toFixed(1)}" cy="${c.cy.toFixed(1)}" r="${esUltimo ? 5.5 : 4}"><title>${escapeHtml(formatoFecha(c.fecha))}: ${num(c.valor, decimales)} ${unidad}</title></circle>`;
    }).join('');
    const anclaValor = ultimo.cx > ancho - 70 ? 'end' : ultimo.cx < m.izquierda + 40 ? 'start' : 'middle';
    const valorFinal = `<text class="graf-valor" x="${ultimo.cx.toFixed(1)}" y="${(ultimo.cy - 12).toFixed(1)}" text-anchor="${anclaValor}">${num(ultimo.valor, decimales)} ${unidad}</text>`;

    const resumen = `${titulo}: ${puntos.length} registros, de ${num(puntos[0].valor, decimales)} a ${num(ultimo.valor, decimales)} ${unidad}`;
    return `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="${escapeHtml(resumen)}">
      <g class="graf-rejilla">${rejilla}</g>
      <g class="graf-eje">${etiquetasY}${etiquetasX}</g>
      ${lineaMeta}
      <path class="graf-area" d="${area}"/>
      <path class="graf-linea" d="${trazo}"/>
      ${circulos}${valorFinal}
    </svg>`;
  }

  // Dibuja la gráfica al ancho real del contenedor y la redibuja si cambia de tamaño.
  function montarLinea(contenedor, opciones) {
    let anchoPrevio = 0;
    const dibujar = () => {
      anchoPrevio = contenedor.clientWidth;
      contenedor.innerHTML = svgLinea({ ...opciones, ancho: Math.max(280, Math.round(anchoPrevio || 320)) });
    };
    dibujar();
    if (!('ResizeObserver' in window)) return;
    const observador = new ResizeObserver(() => {
      if (!contenedor.isConnected) {
        observador.disconnect();
        return;
      }
      if (Math.abs(contenedor.clientWidth - anchoPrevio) > 8) dibujar();
    });
    observador.observe(contenedor);
  }

  App.ui.graficas = { svgLinea, montarLinea };
})(window.Equilibrio);

/* ==========================================================================
   4. PANTALLAS
   ========================================================================== */

/* ---------- Registro inicial ---------- */
(function (App) {
  'use strict';

  const { utils, validacion, storage, calculos } = App.core;
  const { escapeHtml, num } = utils;
  const ui = App.ui;

  const PASOS = [
    { titulo: 'Sobre ti', texto: 'Con estos datos estimamos tu gasto de energía diario.' },
    { titulo: 'Tus medidas de hoy', texto: 'Serán tu punto de partida. Mide la cintura a la altura del ombligo y la cadera en su parte más ancha, sin apretar la cinta.' },
    { titulo: 'Tu objetivo', texto: 'Ajustamos el plan de comidas y las rutinas a tu meta, a tus días y a tu equipo.' }
  ];

  let paso = 0;
  let datos = {};
  const valor = (campo) => datos[campo] ?? '';

  const CAMPOS = [
    () => [
      ui.campoTexto({ nombre: 'nombre', etiqueta: 'Nombre', valor: valor('nombre'), max: 40, autocomplete: 'given-name' }),
      ui.campoNumero({ nombre: 'edad', etiqueta: 'Edad', valor: valor('edad'), unidad: 'años', entero: true }),
      ui.campoOpciones({ nombre: 'sexo', etiqueta: 'Sexo', valor: datos.sexo, opciones: [['F', 'Mujer'], ['M', 'Hombre']], ayuda: 'Se usa en la fórmula del gasto de energía.' }),
      ui.campoNumero({ nombre: 'alturaCm', etiqueta: 'Altura', valor: valor('alturaCm'), unidad: 'cm' })
    ],
    () => [
      ui.campoNumero({ nombre: 'pesoKg', etiqueta: 'Peso actual', valor: valor('pesoKg'), unidad: 'kg' }),
      ui.campoNumero({ nombre: 'cinturaCm', etiqueta: 'Cintura', valor: valor('cinturaCm'), unidad: 'cm' }),
      ui.campoNumero({ nombre: 'caderaCm', etiqueta: 'Cadera', valor: valor('caderaCm'), unidad: 'cm' })
    ],
    () => [
      ui.campoNumero({ nombre: 'pesoMetaKg', etiqueta: 'Peso meta', valor: valor('pesoMetaKg'), unidad: 'kg' }),
      '<p class="pista" id="pista-meta" aria-live="polite"></p>',
      ui.campoOpciones({ nombre: 'diasEntrenamiento', etiqueta: 'Días de entrenamiento por semana', valor: datos.diasEntrenamiento ?? 4, opciones: [3, 4, 5, 6].map((n) => [n, n]) }),
      ui.campoEquipo(datos.equipo || [])
    ]
  ];

  function render(contenedor) {
    const ultimo = paso === PASOS.length - 1;
    contenedor.innerHTML = `
      <div class="onb">
        <div class="onb-caja">
          <p class="marca">${ui.marca()}Equilibrio</p>
          ${paso === 0 ? `<h1 class="onb-titulo">Tu plan para bajar de peso, paso a paso</h1>
            <p class="onb-intro">Registra tu punto de partida y obtén un plan de comidas de 4 semanas, rutinas adaptadas a tu equipo y un seguimiento sencillo de tu progreso.</p>` : ''}
          <div class="onb-pasos" aria-hidden="true">${PASOS.map((_, i) => `<span class="${i <= paso ? 'activo' : ''}"></span>`).join('')}</div>
          <p class="onb-contador">Paso ${paso + 1} de ${PASOS.length}</p>
          <form class="tarjeta onb-form" novalidate>
            <h2 class="tarjeta-titulo">${PASOS[paso].titulo}</h2>
            <p class="texto-suave">${PASOS[paso].texto}</p>
            ${CAMPOS[paso]().join('')}
            <div class="onb-acciones">
              ${paso > 0 ? '<button type="button" class="btn btn-outline-primary" data-accion="atras">Atrás</button>' : ''}
              <button type="submit" class="btn btn-primary">${ultimo ? 'Crear mi plan' : 'Continuar'}</button>
            </div>
          </form>
          <p class="aviso-pie">${escapeHtml(App.data.avisos.inicio)} ${escapeHtml(App.data.avisos.metricas)}</p>
        </div>
      </div>`;

    const form = contenedor.querySelector('form');
    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      avanzar(form, contenedor);
    });
    const atras = form.querySelector('[data-accion="atras"]');
    if (atras) {
      atras.addEventListener('click', () => {
        Object.assign(datos, ui.leerFormulario(form));
        if (ultimo) datos.equipo = ui.valoresMarcados(form, 'equipo');
        paso -= 1;
        render(contenedor);
      });
    }
    if (ultimo) {
      form.addEventListener('input', () => actualizarPista(form));
      actualizarPista(form);
    }
  }

  function actualizarPista(form) {
    const pista = form.querySelector('#pista-meta');
    const meta = utils.leerNumero(form.elements.pesoMetaKg.value);
    if (Number.isNaN(meta) || meta <= 0 || meta >= datos.pesoKg) {
      pista.textContent = `Tu peso actual es ${num(datos.pesoKg, 1)} kg. Para empezar, muchas guías sugieren bajar entre 5 y 10 % de tu peso.`;
      return;
    }
    const bajar = datos.pesoKg - meta;
    const imcActual = calculos.imc(datos.pesoKg, datos.alturaCm);
    const imcMeta = calculos.imc(meta, datos.alturaCm);
    pista.textContent = `Bajarías ${num(bajar, 1)} kg (${num((bajar / datos.pesoKg) * 100)} % de tu peso). Tu IMC pasaría de ${num(imcActual, 1)} a ${num(imcMeta, 1)}.`;
  }

  function avanzar(form, contenedor) {
    const entrada = ui.leerFormulario(form);
    let resultado;
    if (paso === 0) resultado = validacion.validarDatosPersonales(entrada);
    else if (paso === 1) resultado = validacion.validarMedidas(entrada);
    else resultado = validacion.validarObjetivo(entrada, { pesoActualKg: datos.pesoKg, alturaCm: datos.alturaCm });
    if (!ui.mostrarErrores(form, resultado.errores)) return;

    Object.assign(datos, resultado.datos);
    if (paso < PASOS.length - 1) {
      paso += 1;
      render(contenedor);
      window.scrollTo(0, 0);
      return;
    }
    datos.equipo = ui.valoresMarcados(form, 'equipo');
    crearPerfil();
  }

  function crearPerfil() {
    const hoy = utils.hoyISO();
    storage.guardar('perfil', {
      nombre: datos.nombre,
      edad: datos.edad,
      sexo: datos.sexo,
      alturaCm: datos.alturaCm,
      diasEntrenamiento: datos.diasEntrenamiento,
      pesoMetaKg: datos.pesoMetaKg,
      creadoEl: hoy
    });
    storage.guardar('registros', [{
      id: utils.uid(), fecha: hoy, pesoKg: datos.pesoKg, cinturaCm: datos.cinturaCm, caderaCm: datos.caderaCm, comentario: 'Medición inicial'
    }]);
    storage.actualizar('config', (config) => ({ ...config, equipo: datos.equipo, inicioCiclo: utils.lunesDe(hoy), diasPersonalizados: null }));
    paso = 0;
    datos = {};
    App.mostrarApp();
    ui.toast('Tu plan está listo');
  }

  App.modulos.onboarding = { render };
})(window.Equilibrio);

/* ---------- Inicio ---------- */
(function (App) {
  'use strict';

  const { utils, plan, rutinas, seguimiento, calculos } = App.core;
  const { escapeHtml, num } = utils;
  const ui = App.ui;
  const { icono } = ui;

  function render(contenedor) {
    const ctx = App.core.contexto();
    const { perfil, config, resumen, hoy, pos, objetivo, factor } = ctx;
    const registroHoy = seguimiento.dia(hoy);
    const { sesion } = rutinas.sesionDelDia(hoy, perfil, config);
    const racha = seguimiento.racha(hoy);

    contenedor.innerHTML = `
      <header class="saludo">
        <div>
          <p class="saludo-fecha">${escapeHtml(utils.formatoFecha(hoy, 'larga'))}</p>
          <h1 class="pagina-titulo">Hola, ${escapeHtml(perfil.nombre)}</h1>
          <p class="pagina-intro">Semana ${pos.semanaIdx + 1} de tu plan${pos.ciclo > 1 ? `, ciclo ${pos.ciclo}` : ''}</p>
        </div>
        <a class="racha" href="#/historial" aria-label="${textoRacha(racha)}. Ver historial">
          ${icono('flame')}<span class="cifra" data-racha>${racha}</span><span class="racha-texto" data-racha-texto>${racha === 1 ? 'día' : 'días'}</span>
        </a>
      </header>
      <div class="dash">
        <div class="dash-col">
          ${tarjetaPeso(resumen)}
          ${miniStats(resumen, objetivo)}
          ${tarjetaRuta(plan.dia(pos.semanaIdx, pos.diaIdx, factor), registroHoy, ctx)}
        </div>
        <div class="dash-col">
          ${tarjetaEntreno(sesion, registroHoy)}
          ${tarjetaHabitos(registroHoy)}
        </div>
      </div>
      <p class="aviso-pie">${escapeHtml(App.data.avisos.metricas)}</p>`;

    contenedor.addEventListener('click', (evento) => alClic(evento, hoy));
    contenedor.addEventListener('change', (evento) => alCambiar(evento, hoy, contenedor));
  }

  const textoRacha = (n) => `Racha de ${n} ${n === 1 ? 'día' : 'días'} seguidos`;

  function tarjetaPeso(r) {
    const cambio = r.perdido >= 0 ? `${num(r.perdido, 1)} kg menos desde el inicio` : `${num(-r.perdido, 1)} kg más desde el inicio`;
    return `<section class="tarjeta tarjeta-hero" aria-label="Peso y avance">
      <div class="peso-cabecera">
        <div><p class="etiqueta">Peso actual</p><p class="cifra cifra-xl">${num(r.pesoActual, 1)}<span class="unidad">kg</span></p></div>
        <div class="text-end"><p class="etiqueta">Meta</p><p class="cifra cifra-lg">${num(r.meta, 1)}<span class="unidad">kg</span></p></div>
      </div>
      ${ui.barra(r.avance, 'Avance hacia tu meta')}
      <div class="peso-pie"><span>${cambio}</span><strong>${num(r.avance)} % de tu meta</strong></div>
      ${r.metaAlcanzada ? '<p class="logro">Alcanzaste tu meta. Puedes definir una nueva desde tu perfil.</p>' : ''}
      <button type="button" class="btn btn-primary w-100 mt-3" data-accion="registrar">${icono('plus')} Registrar progreso</button>
    </section>`;
  }

  function miniStats(r, objetivo) {
    return `<div class="mini-stats">
      ${ui.stat('IMC', num(r.imc, 1), '', calculos.categoriaImc(r.imc).nombre)}
      ${ui.stat('Calorías', num(objetivo.objetivo), 'kcal', 'objetivo diario')}
      ${ui.stat('Por bajar', num(r.restante, 1), 'kg', r.restante > 0 ? 'para tu meta' : 'meta alcanzada')}
    </div>`;
  }

  const detalleComida = (c) => `<ul class="ruta-detalle">${c.ingredientes
    .map((i) => `<li><span>${escapeHtml(i.nombre)}</span><span>${escapeHtml(i.texto)}</span></li>`).join('')}</ul>`;

  function tarjetaRuta(diaHoy, registroHoy, ctx) {
    const { horarios } = ctx.config;
    const siguiente = plan.siguienteComida(horarios, registroHoy.comidas, utils.minutosAhora());
    const hechas = diaHoy.comidas.filter((c) => registroHoy.comidas[c.tiempo]).length;
    const items = diaHoy.comidas.map((c) => {
      const hecha = Boolean(registroHoy.comidas[c.tiempo]);
      const esSiguiente = Boolean(siguiente) && siguiente.id === c.tiempo;
      return `<li class="ruta-item${hecha ? ' hecha' : ''}${esSiguiente ? ' siguiente' : ''}">
        <span class="ruta-hora">${horarios[c.tiempo]}</span>
        <button type="button" class="parada" data-accion="comida" data-tiempo="${c.tiempo}" aria-pressed="${hecha}"
          aria-label="${hecha ? 'Desmarcar' : 'Marcar'} ${c.etiqueta.toLowerCase()} como hecha">${icono('check')}</button>
        <div class="ruta-cuerpo">
          <p class="ruta-tiempo">${c.etiqueta}${esSiguiente ? ' <span class="chip chip-acento">Sigue</span>' : ''}</p>
          <p class="ruta-nombre">${escapeHtml(c.nombre)}</p>
          ${esSiguiente ? detalleComida(c) : ''}
        </div>
      </li>`;
    }).join('');

    let nota = '';
    if (!siguiente) {
      if (hechas === diaHoy.comidas.length) {
        nota = '<p class="ruta-nota">Completaste tus cinco tiempos de hoy.</p>';
      } else {
        const posManana = utils.posicionEnCiclo(utils.sumarDias(ctx.hoy, 1), ctx.config.inicioCiclo);
        const desayuno = plan.dia(posManana.semanaIdx, posManana.diaIdx, ctx.factor).comidas[0];
        nota = `<p class="ruta-nota">Mañana empiezas con ${escapeHtml(desayuno.nombre.toLowerCase())}.</p>`;
      }
    }

    return `<section class="tarjeta" aria-labelledby="titulo-ruta">
      <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo" id="titulo-ruta">Tu ruta de hoy</h2><span class="chip">${hechas} de ${diaHoy.comidas.length}</span></div>
      <p class="nota mt-0">Toca cada parada al terminar esa comida.</p>
      <ol class="ruta">${items}</ol>
      ${nota}
      <a class="enlace-flecha" href="#/alimentacion">Ver el plan completo ${icono('chevron')}</a>
    </section>`;
  }

  function tarjetaEntreno(sesion, registroHoy) {
    if (!sesion) {
      return `<section class="tarjeta">
        <h2 class="tarjeta-titulo">Entrenamiento de hoy</h2>
        <p class="entreno-nombre">Día de descanso</p>
        <p class="texto-suave">Si te sientes bien, una caminata suave de 20 a 30 minutos o 10 minutos de movilidad te ayudan a recuperarte.</p>
        <a class="enlace-flecha" href="#/rutinas">Ver tu semana ${icono('chevron')}</a>
      </section>`;
    }
    const hecho = registroHoy.entrenamiento;
    return `<section class="tarjeta">
      <h2 class="tarjeta-titulo">Entrenamiento de hoy</h2>
      <p class="entreno-nombre">${escapeHtml(sesion.nombre)}</p>
      <div class="chips">
        <span class="chip chip-primario">${sesion.etiqueta}</span>
        <span class="chip">${icono('clock')} ${sesion.minutos} min aprox.</span>
        ${hecho ? `<span class="chip chip-exito">${icono('check')} Completado</span>` : ''}
      </div>
      <p class="texto-suave">${escapeHtml(sesion.objetivo)}</p>
      <div class="acciones">
        <a class="btn btn-outline-primary" href="#/rutinas">Ver rutina</a>
        <button type="button" class="btn ${hecho ? 'btn-suave' : 'btn-primary'}" data-accion="entreno" aria-pressed="${hecho}">${hecho ? 'Desmarcar' : 'Marcar como completado'}</button>
      </div>
    </section>`;
  }

  function tarjetaHabitos(registroHoy) {
    const { habitos } = App.data;
    const cumplidos = habitos.filter((h) => registroHoy.habitos[h.id]).length;
    return `<section class="tarjeta" aria-labelledby="titulo-habitos">
      <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo" id="titulo-habitos">Hábitos de hoy</h2><span class="chip" data-contador>${cumplidos} de ${habitos.length}</span></div>
      <div class="habitos">${habitos.map((h) => `
        <label class="habito">
          <input class="form-check-input" type="checkbox" data-habito="${h.id}"${registroHoy.habitos[h.id] ? ' checked' : ''}>
          <span class="habito-icono">${icono(h.icono)}</span>
          <span class="habito-texto"><span class="habito-nombre">${h.nombre}</span><span class="habito-desc">${h.descripcion}</span></span>
        </label>`).join('')}
      </div>
      <p class="nota">${escapeHtml(App.data.avisos.habitos)} <button type="button" class="btn-enlace" data-accion="guia">Ver la guía de hábitos</button></p>
    </section>`;
  }

  function alClic(evento, hoy) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    const marcado = boton.getAttribute('aria-pressed') === 'true';
    switch (boton.dataset.accion) {
      case 'registrar':
        App.modulos.progreso.abrirFormulario();
        break;
      case 'comida': {
        const { tiempo } = boton.dataset;
        seguimiento.marcarComida(hoy, tiempo, !marcado);
        App.router.refrescar();
        const nuevo = document.querySelector(`[data-accion="comida"][data-tiempo="${tiempo}"]`);
        if (nuevo) nuevo.focus({ preventScroll: true });
        break;
      }
      case 'entreno':
        seguimiento.marcarEntrenamiento(hoy, !marcado);
        if (!marcado) ui.toast('Entrenamiento completado');
        App.router.refrescar();
        break;
      case 'guia':
        App.modulos.alimentacion.abrir('habitos');
        break;
      default:
    }
  }

  function alCambiar(evento, hoy, contenedor) {
    const casilla = evento.target.closest('[data-habito]');
    if (!casilla) return;
    seguimiento.marcarHabito(hoy, casilla.dataset.habito, casilla.checked);
    const cumplidos = contenedor.querySelectorAll('[data-habito]:checked').length;
    contenedor.querySelector('[data-contador]').textContent = `${cumplidos} de ${App.data.habitos.length}`;
    const racha = seguimiento.racha(hoy);
    contenedor.querySelector('[data-racha]').textContent = racha;
    contenedor.querySelector('[data-racha-texto]').textContent = racha === 1 ? 'día' : 'días';
    contenedor.querySelector('.racha').setAttribute('aria-label', `${textoRacha(racha)}. Ver historial`);
  }

  App.modulos.dashboard = { render };
})(window.Equilibrio);

/* ---------- Progreso ---------- */
(function (App) {
  'use strict';

  const { utils, calculos, seguimiento, validacion } = App.core;
  const { escapeHtml, num } = utils;
  const ui = App.ui;
  const { icono } = ui;

  const METRICAS = {
    peso: { etiqueta: 'Peso', unidad: 'kg', valor: (r) => r.pesoKg, meta: (p) => p.pesoMetaKg },
    imc: { etiqueta: 'IMC', unidad: '', valor: (r, p) => calculos.imc(r.pesoKg, p.alturaCm), meta: (p) => calculos.imc(p.pesoMetaKg, p.alturaCm) },
    cintura: { etiqueta: 'Cintura', unidad: 'cm', valor: (r) => r.cinturaCm, meta: () => null },
    cadera: { etiqueta: 'Cadera', unidad: 'cm', valor: (r) => r.caderaCm, meta: () => null }
  };
  let metrica = 'peso';

  function render(contenedor) {
    const { perfil, registros, resumen } = App.core.contexto();
    const signo = resumen.diferencia > 0 ? '+' : resumen.diferencia < 0 ? '−' : '';

    contenedor.innerHTML = `
      ${ui.cabecera({
        titulo: 'Progreso',
        intro: 'Registra tus medidas una vez por semana, de preferencia el mismo día, a la misma hora y en ayunas.',
        acciones: `<button type="button" class="btn btn-primary" data-accion="registrar">${icono('plus')} Registrar progreso</button>`
      })}
      <section class="stats" aria-label="Resumen de peso">
        ${ui.stat('Peso inicial', num(resumen.pesoInicial, 1), 'kg', utils.formatoFecha(resumen.inicial.fecha))}
        ${ui.stat('Peso actual', num(resumen.pesoActual, 1), 'kg', utils.formatoFecha(resumen.actual.fecha))}
        ${ui.stat('Diferencia', `${signo}${num(Math.abs(resumen.diferencia), 1)}`, 'kg')}
        ${ui.stat('Porcentaje perdido', num(Math.max(0, resumen.porcentajeCambio), 1), '%')}
        ${ui.stat('Meta', num(resumen.meta, 1), 'kg')}
        ${ui.stat('Por bajar', num(resumen.restante, 1), 'kg')}
      </section>
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Avance hacia tu meta</h2><span class="cifra cifra-md">${num(resumen.avance)} %</span></div>
        ${ui.barra(resumen.avance, 'Avance hacia tu meta')}
        ${resumen.metaAlcanzada ? '<p class="logro">Alcanzaste tu meta. Puedes definir una nueva desde tu perfil.</p>' : ''}
      </section>
      <section class="tarjeta">
        <div class="tarjeta-cabecera tarjeta-cabecera-flexible">
          <h2 class="tarjeta-titulo">Evolución</h2>
          <div class="segmentos" role="group" aria-label="Medida a graficar">
            ${Object.entries(METRICAS).map(([id, m]) => `<button type="button" class="segmento${id === metrica ? ' activo' : ''}" data-accion="metrica" data-metrica="${id}" aria-pressed="${id === metrica}">${m.etiqueta}</button>`).join('')}
          </div>
        </div>
        <div class="grafica" id="grafica-progreso"></div>
      </section>
      <div class="rejilla-2">
        ${ui.tarjetaImc(resumen.imc)}
        ${ui.tarjetaIcc(resumen.actual, perfil.sexo)}
      </div>
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Últimos registros</h2><a class="enlace-flecha" href="#/historial">Ver todos ${icono('chevron')}</a></div>
        <ul class="registros">${registros.slice(-3).reverse().map((r) => itemRegistro(r, perfil, false)).join('')}</ul>
      </section>
      <p class="aviso-pie">${escapeHtml(App.data.avisos.metricas)}</p>`;

    dibujarGrafica(contenedor, perfil, registros);
    contenedor.addEventListener('click', (evento) => {
      const boton = evento.target.closest('[data-accion]');
      if (!boton) return;
      if (boton.dataset.accion === 'registrar') abrirFormulario();
      if (boton.dataset.accion === 'metrica') {
        metrica = boton.dataset.metrica;
        contenedor.querySelectorAll('[data-accion="metrica"]').forEach((b) => {
          const activo = b === boton;
          b.classList.toggle('activo', activo);
          b.setAttribute('aria-pressed', activo);
        });
        dibujarGrafica(contenedor, perfil, registros);
      }
    });
  }

  function dibujarGrafica(contenedor, perfil, registros) {
    const lugar = contenedor.querySelector('#grafica-progreso');
    const m = METRICAS[metrica];
    if (registros.length < 2) {
      lugar.innerHTML = ui.estadoVacio({
        icono: 'trending',
        titulo: 'Aún no hay suficientes datos',
        texto: 'Con dos o más registros verás aquí la evolución de tus medidas.',
        accion: '<button type="button" class="btn btn-outline-primary" data-accion="registrar">Registrar progreso</button>'
      });
      return;
    }
    ui.graficas.montarLinea(lugar, {
      puntos: registros.map((r) => ({ fecha: r.fecha, valor: m.valor(r, perfil) })),
      unidad: m.unidad,
      decimales: 1,
      meta: m.meta(perfil),
      titulo: `Evolución de ${m.etiqueta === 'IMC' ? 'IMC' : m.etiqueta.toLowerCase()}`
    });
  }

  // Elemento de lista de un registro; con acciones de editar y eliminar en el historial.
  function itemRegistro(r, perfil, conAcciones) {
    const fecha = utils.formatoFecha(r.fecha);
    const acciones = conAcciones ? `<div class="registro-acciones">
        <button type="button" class="btn-icono" data-accion="editar" data-id="${r.id}" aria-label="Editar registro del ${fecha}">${icono('edit')}</button>
        <button type="button" class="btn-icono" data-accion="eliminar" data-id="${r.id}" aria-label="Eliminar registro del ${fecha}">${icono('trash')}</button>
      </div>` : '';
    return `<li class="registro">
      <div class="registro-fecha"><span class="cifra">${utils.parseISO(r.fecha).getDate()}</span><span>${escapeHtml(utils.formatoFecha(r.fecha, 'mes'))}</span></div>
      <div class="registro-datos">
        <p class="registro-peso"><span class="cifra">${num(r.pesoKg, 1)}</span> kg <span class="texto-suave">IMC ${num(calculos.imc(r.pesoKg, perfil.alturaCm), 1)}</span></p>
        <p class="registro-medidas">Cintura ${num(r.cinturaCm, 1)} cm, cadera ${num(r.caderaCm, 1)} cm</p>
        ${r.comentario ? `<p class="registro-comentario">${escapeHtml(r.comentario)}</p>` : ''}
      </div>
      ${acciones}
    </li>`;
  }

  function abrirFormulario(registro = null) {
    const ultimo = seguimiento.registroActual();
    const v = registro || { fecha: utils.hoyISO(), pesoKg: '', cinturaCm: '', caderaCm: '', comentario: '' };
    const sugerencia = (campo, unidad) => (ultimo && !registro ? `Último: ${num(ultimo[campo], 1)} ${unidad}` : '');

    ui.modal.abrir({
      titulo: registro ? 'Editar registro' : 'Registrar progreso',
      cuerpo: `<form novalidate>
        ${ui.campoFecha({ nombre: 'fecha', etiqueta: 'Fecha', valor: v.fecha, max: utils.hoyISO() })}
        ${ui.campoNumero({ nombre: 'pesoKg', etiqueta: 'Peso', valor: v.pesoKg, unidad: 'kg', placeholder: sugerencia('pesoKg', 'kg') })}
        <div class="row g-3">
          <div class="col-6">${ui.campoNumero({ nombre: 'cinturaCm', etiqueta: 'Cintura', valor: v.cinturaCm, unidad: 'cm', placeholder: sugerencia('cinturaCm', '') })}</div>
          <div class="col-6">${ui.campoNumero({ nombre: 'caderaCm', etiqueta: 'Cadera', valor: v.caderaCm, unidad: 'cm', placeholder: sugerencia('caderaCm', '') })}</div>
        </div>
        ${ui.campoAreaTexto({ nombre: 'comentario', etiqueta: 'Comentario (opcional)', valor: v.comentario, max: 200 })}
        <button type="submit" class="btn btn-primary btn-lg w-100 mt-2">${registro ? 'Guardar cambios' : 'Guardar registro'}</button>
      </form>`,
      alMostrar(cuerpo) {
        const form = cuerpo.querySelector('form');
        form.addEventListener('submit', (evento) => {
          evento.preventDefault();
          const { datos, errores } = validacion.validarRegistro(ui.leerFormulario(form));
          if (!ui.mostrarErrores(form, errores)) return;
          const resultado = seguimiento.guardarRegistro(datos, registro && registro.id);
          if (resultado.error) {
            ui.mostrarErrores(form, { fecha: resultado.error });
            return;
          }
          ui.modal.cerrar();
          ui.toast({
            creado: 'Progreso registrado',
            actualizado: 'Registro actualizado',
            reemplazado: `Actualizaste el registro del ${utils.formatoFecha(datos.fecha, 'corta')}`
          }[resultado.accion]);
          App.router.refrescar();
        });
      }
    });
  }

  App.modulos.progreso = { render, abrirFormulario, itemRegistro };
})(window.Equilibrio);

/* ---------- Alimentación ---------- */
(function (App) {
  'use strict';

  const { utils, plan, storage, seguimiento, calculos } = App.core;
  const { escapeHtml, num, NOMBRES_DIA } = utils;
  const ui = App.ui;
  const { icono } = ui;

  const PESTANAS = [['plan', 'Plan semanal'], ['objetivo', 'Objetivo'], ['habitos', 'Hábitos']];
  const NIVELES_DEFICIT = { 10: 'Suave', 15: 'Moderado', 20: 'Mayor' };
  const estado = { pestana: 'plan', semana: null };

  function render(contenedor) {
    const ctx = App.core.contexto();
    if (estado.semana === null) estado.semana = ctx.pos.semanaIdx;

    contenedor.innerHTML = `
      ${ui.cabecera({ titulo: 'Alimentación', intro: 'Plan antiinflamatorio de 4 semanas con cinco tiempos de comida e ingredientes fáciles de conseguir en la Ciudad de México y el Estado de México.' })}
      <div class="alert alert-info aviso" role="note">${icono('info')}<p>${escapeHtml(App.data.avisos.plan)}</p></div>
      <div class="nav nav-pills pestanas" role="tablist" aria-label="Secciones de alimentación">
        ${PESTANAS.map(([id, texto]) => `<button type="button" class="nav-link${estado.pestana === id ? ' active' : ''}" role="tab" id="tab-${id}" aria-selected="${estado.pestana === id}" aria-controls="panel-alimentacion" data-accion="pestana" data-id="${id}">${texto}</button>`).join('')}
      </div>
      <div id="panel-alimentacion" role="tabpanel" aria-labelledby="tab-${estado.pestana}"></div>`;

    pintarPanel(contenedor, ctx);
    contenedor.addEventListener('click', (evento) => alClic(evento, contenedor, ctx));
    contenedor.addEventListener('change', (evento) => alCambiar(evento, contenedor, ctx));
  }

  function pintarPanel(contenedor, ctx) {
    const panel = contenedor.querySelector('#panel-alimentacion');
    if (estado.pestana === 'objetivo') panel.innerHTML = panelObjetivo(ctx);
    else if (estado.pestana === 'habitos') panel.innerHTML = panelHabitos();
    else panel.innerHTML = panelPlan(ctx);
  }

  /* ---------- Objetivo calórico ---------- */
  function panelObjetivo({ perfil, resumen, objetivo: o }) {
    const m = calculos.macronutrientes(o.objetivo, perfil.pesoMetaKg);
    const fila = (nombre, dato, clase) => `<div class="macro">
        <div class="macro-cabecera"><span class="macro-nombre"><span class="punto-macro ${clase}"></span>${nombre}</span><span><strong>${dato.g} g</strong> <span class="texto-suave">${num(dato.kcal)} kcal, ${dato.pct} %</span></span></div>
        <div class="progress progress-${clase}" role="progressbar" aria-label="${nombre}" aria-valuenow="${dato.pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width: ${dato.pct}%"></div></div>
      </div>`;
    const sexoTexto = perfil.sexo === 'M' ? '+ 5' : '− 161';
    return `
      <section class="tarjeta tarjeta-hero">
        <h2 class="tarjeta-titulo">Tu objetivo diario</h2>
        <p class="kcal-objetivo"><span class="cifra cifra-xl">${num(o.objetivo)}</span><span class="unidad">kcal al día</span></p>
        <dl class="lista-datos">
          <div><dt>Calorías de mantenimiento</dt><dd>${num(o.mantenimiento)} kcal</dd></div>
          <div><dt>Déficit (${o.deficitPct} %)</dt><dd>−${num(o.deficit)} kcal</dd></div>
          <div><dt>Objetivo diario</dt><dd>${num(o.objetivo)} kcal</dd></div>
          <div><dt>Ritmo estimado</dt><dd>≈ ${num(o.ritmoKgSemana, 2)} kg por semana</dd></div>
        </dl>
        ${o.ajustado ? `<div class="alert alert-info aviso">${icono('info')}<p>El objetivo se ajustó para no bajar de ${num(o.minimo)} kcal, el mínimo que usa la app para tu perfil.</p></div>` : ''}
        <fieldset class="campo mt-3">
          <legend class="form-label">Nivel de déficit</legend>
          <div class="opciones">
            ${calculos.OPCIONES_DEFICIT.map((p) => `<input type="radio" class="btn-check" name="deficit" id="deficit-${p}" value="${p}"${p === o.deficitPct ? ' checked' : ''} autocomplete="off"><label class="btn btn-opcion" for="deficit-${p}">${p} %<small>${NIVELES_DEFICIT[p]}</small></label>`).join('')}
          </div>
          <div class="form-text">Un déficit moderado es más fácil de sostener. Al cambiarlo se ajustan las porciones del plan.</div>
        </fieldset>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Distribución de macronutrientes</h2>
        ${fila('Proteínas', m.proteina, 'proteina')}
        ${fila('Carbohidratos', m.carbohidratos, 'carbohidratos')}
        ${fila('Grasas', m.grasas, 'grasas')}
        <p class="nota">Es una referencia diaria; el plan de comidas ya se aproxima a ella.</p>
      </section>
      <section class="tarjeta">
        <details class="detalles">
          <summary>¿Cómo se calcula?</summary>
          <ol class="pasos-calculo">
            <li><strong>Tasa metabólica basal</strong> (Mifflin-St Jeor): 10 × ${num(resumen.pesoActual, 1)} kg + 6.25 × ${num(perfil.alturaCm, 1)} cm − 5 × ${perfil.edad} años ${sexoTexto} = ${num(o.tmb)} kcal.</li>
            <li><strong>Gasto diario estimado</strong>: TMB × ${o.factor} (factor de actividad para ${perfil.diasEntrenamiento} días de entrenamiento) = ${num(o.mantenimiento)} kcal.</li>
            <li><strong>Déficit</strong>: ${o.deficitPct} % del gasto diario, con un máximo de ${calculos.DEFICIT_MAXIMO_KCAL} kcal = ${num(o.deficit)} kcal.</li>
            <li><strong>Objetivo</strong>: gasto diario menos déficit = ${num(o.objetivo)} kcal. Nunca baja de tu TMB ni de ${num(calculos.MINIMO_KCAL[perfil.sexo])} kcal.</li>
            <li><strong>Macronutrientes</strong>: proteína de 1.6 g por kg de peso meta (máximo 35 % de las calorías), grasas 30 % y carbohidratos el resto.</li>
            <li><strong>Ritmo</strong>: déficit × 7 ÷ ${num(calculos.KCAL_POR_KG)} kcal por kg. Es aproximado; con el tiempo la pérdida suele ser más lenta.</li>
          </ol>
        </details>
      </section>`;
  }

  /* ---------- Plan semanal y lista del supermercado ---------- */
  function panelPlan(ctx) {
    const { pos, factor, objetivo, config, hoy } = ctx;
    const semana = plan.semana(estado.semana, factor);
    const esSemanaActual = estado.semana === pos.semanaIdx;
    const registroHoy = seguimiento.dia(hoy);

    const dias = semana.map((d, i) => {
      const esHoy = esSemanaActual && i === pos.diaIdx;
      return `<div class="accordion-item">
        <h3 class="accordion-header">
          <button class="accordion-button${esHoy ? '' : ' collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#dia-${i}" aria-expanded="${esHoy}" aria-controls="dia-${i}">
            <span class="dia-titulo">${NOMBRES_DIA[i]}${esHoy ? ' <span class="chip chip-acento">Hoy</span>' : ''}</span>
            <span class="dia-kcal">≈ ${num(d.kcal)} kcal</span>
          </button>
        </h3>
        <div id="dia-${i}" class="accordion-collapse collapse${esHoy ? ' show' : ''}" data-bs-parent="#acordeon-dias">
          <div class="accordion-body">${d.comidas.map((c) => comidaHtml(c, config.horarios, esHoy, registroHoy)).join('')}</div>
        </div>
      </div>`;
    }).join('');

    return `
      ${selectorSemanas(pos.semanaIdx)}
      <p class="nota">Porciones ajustadas a tu objetivo de ${num(objetivo.objetivo)} kcal. Carnes y pescados en peso crudo; arroz, pasta y leguminosas en peso cocido. Para beber, agua natural, o café y té sin azúcar.</p>
      <div class="accordion acordeon-dias" id="acordeon-dias">${dias}</div>
      ${listaCompras(ctx)}`;
  }

  function selectorSemanas(actual) {
    return `<div class="segmentos segmentos-semanas" role="group" aria-label="Semana del plan">
      ${[0, 1, 2, 3].map((i) => `<button type="button" class="segmento${i === estado.semana ? ' activo' : ''}" data-accion="semana" data-semana="${i}" aria-pressed="${i === estado.semana}">Semana ${i + 1}${i === actual ? '<span class="punto-actual" title="Semana actual"></span>' : ''}</button>`).join('')}
    </div>`;
  }

  function comidaHtml(c, horarios, esHoy, registroHoy) {
    const interruptor = esHoy ? `<div class="form-check form-switch comida-hecha">
        <input class="form-check-input" type="checkbox" role="switch" id="hecha-${c.tiempo}" data-comida="${c.tiempo}"${registroHoy.comidas[c.tiempo] ? ' checked' : ''}>
        <label class="form-check-label" for="hecha-${c.tiempo}">Comida hecha</label>
      </div>` : '';
    return `<article class="comida">
      <header class="comida-cabecera">
        <p class="comida-tiempo"><span class="comida-hora">${horarios[c.tiempo]}</span>${c.etiqueta}</p>
        <span class="comida-kcal">${num(c.kcal)} kcal</span>
      </header>
      <h4 class="comida-nombre">${escapeHtml(c.nombre)}</h4>
      <ul class="ingredientes">${c.ingredientes.map((i) => `<li><span>${escapeHtml(i.nombre)}</span><span>${escapeHtml(i.texto)}</span></li>`).join('')}</ul>
      <p class="comida-prep">${escapeHtml(c.prep)}</p>
      ${interruptor}
    </article>`;
  }

  const claveCompras = () => `semana-${estado.semana + 1}`;

  function listaCompras({ factor }) {
    const marcados = storage.obtener('compras')[claveCompras()] || {};
    const categorias = plan.listaCompras(estado.semana, factor);
    const total = categorias.reduce((suma, c) => suma + c.items.length, 0);
    const listos = categorias.reduce((suma, c) => suma + c.items.filter((i) => marcados[i.id]).length, 0);
    return `<section class="tarjeta compras" aria-labelledby="titulo-compras">
      <div class="tarjeta-cabecera">
        <h3 class="tarjeta-titulo" id="titulo-compras">${icono('cart')} Lista del supermercado</h3>
        <span class="chip" data-progreso-compras>${listos} de ${total}</span>
      </div>
      <p class="nota mt-0">Semana ${estado.semana + 1}, para los 7 días y ya ajustada a tus porciones. Arroz, pasta y leguminosas aparecen en crudo. Cantidades aproximadas.</p>
      ${categorias.map((cat) => `<h4 class="compras-categoria">${cat.nombre}</h4>
        <ul class="compras-lista">${cat.items.map((it) => `<li>
          <label class="compras-item">
            <input class="form-check-input" type="checkbox" data-compra="${it.id}"${marcados[it.id] ? ' checked' : ''}>
            <span class="compras-nombre">${escapeHtml(it.nombre)}</span>
            <span class="compras-cantidad">${escapeHtml(it.cantidad)}${it.aprox ? `<small>${escapeHtml(it.aprox)}</small>` : ''}</span>
          </label>
        </li>`).join('')}</ul>`).join('')}
      <div class="acciones">
        <button type="button" class="btn btn-whatsapp" data-accion="compartir-compras">${icono('message')} Enviar por WhatsApp</button>
        <button type="button" class="btn btn-outline-primary" data-accion="limpiar-compras">Desmarcar todo</button>
      </div>
    </section>`;
  }

  function textoCompras(factor) {
    const lineas = [`*Lista del supermercado, semana ${estado.semana + 1}*`];
    plan.listaCompras(estado.semana, factor).forEach((cat) => {
      lineas.push('', `*${cat.nombre}*`);
      cat.items.forEach((it) => lineas.push(`• ${it.nombre}: ${it.cantidad}${it.aprox ? ` (${it.aprox})` : ''}`));
    });
    return lineas.join('\n');
  }

  /* ---------- Guía de hábitos ---------- */
  function panelHabitos() {
    return `${App.data.guiaHabitos.map((s) => `<section class="tarjeta">
        <h2 class="tarjeta-titulo con-icono">${icono(s.icono)} ${s.titulo}</h2>
        <ul class="lista-guia">${s.puntos.map((p) => `<li>${p}</li>`).join('')}</ul>
      </section>`).join('')}
      <p class="aviso-pie">${escapeHtml(App.data.avisos.habitos)} ${escapeHtml(App.data.avisos.plan)}</p>`;
  }

  /* ---------- Eventos ---------- */
  function alClic(evento, contenedor, ctx) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    switch (boton.dataset.accion) {
      case 'pestana':
        estado.pestana = boton.dataset.id;
        App.router.refrescar();
        break;
      case 'semana':
        estado.semana = Number(boton.dataset.semana);
        pintarPanel(contenedor, ctx);
        break;
      case 'compartir-compras':
        ui.abrirWhatsApp(textoCompras(ctx.factor));
        break;
      case 'limpiar-compras':
        storage.actualizar('compras', (compras) => {
          delete compras[claveCompras()];
          return compras;
        });
        pintarPanel(contenedor, ctx);
        contenedor.querySelector('#titulo-compras').scrollIntoView({ block: 'start' });
        break;
      default:
    }
  }

  function alCambiar(evento, contenedor, ctx) {
    const objetivo = evento.target;
    if (objetivo.name === 'deficit') {
      storage.actualizar('config', (config) => ({ ...config, deficitPct: Number(objetivo.value) }));
      ui.toast('Objetivo actualizado; las porciones del plan se ajustaron.');
      App.router.refrescar();
    } else if (objetivo.dataset.comida) {
      seguimiento.marcarComida(ctx.hoy, objetivo.dataset.comida, objetivo.checked);
    } else if (objetivo.dataset.compra) {
      storage.actualizar('compras', (compras) => {
        const semana = compras[claveCompras()] || {};
        if (objetivo.checked) semana[objetivo.dataset.compra] = true;
        else delete semana[objetivo.dataset.compra];
        compras[claveCompras()] = semana;
        return compras;
      });
      const casillas = contenedor.querySelectorAll('[data-compra]');
      const listos = [...casillas].filter((c) => c.checked).length;
      contenedor.querySelector('[data-progreso-compras]').textContent = `${listos} de ${casillas.length}`;
    }
  }

  // Abre la pantalla en una pestaña concreta (p. ej. desde el inicio).
  function abrir(pestana) {
    estado.pestana = pestana;
    App.router.ir('alimentacion');
  }

  App.modulos.alimentacion = { render, abrir };
})(window.Equilibrio);

/* ---------- Rutinas ---------- */
(function (App) {
  'use strict';

  const { utils, storage, rutinas, seguimiento } = App.core;
  const { escapeHtml, NOMBRES_DIA, NOMBRES_DIA_CORTO } = utils;
  const { sesiones, semanasEntrenamiento, equipo: CATALOGO_EQUIPO } = App.data;
  const ui = App.ui;
  const { icono } = ui;

  const estado = { semana: null };
  const claveExtras = (dia) => `${estado.semana}-${dia}`;

  function introPorDias(n) {
    const base = n === 3
      ? '3 sesiones por semana de cuerpo completo y boxeo'
      : `${n} sesiones por semana que combinan fuerza funcional, boxeo y cardio ligero`;
    return `${base}. La intensidad sube de forma gradual durante las 4 semanas.`;
  }

  function render(contenedor) {
    const ctx = App.core.contexto();
    const { perfil, config, pos } = ctx;
    if (estado.semana === null) estado.semana = pos.semanaIdx;
    const calendario = rutinas.calendario(perfil, config);
    const nombresEquipo = CATALOGO_EQUIPO.filter((e) => config.equipo.includes(e.id)).map((e) => e.nombre);

    contenedor.innerHTML = `
      ${ui.cabecera({ titulo: 'Mis rutinas', intro: introPorDias(perfil.diasEntrenamiento) })}
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Tu semana</h2><button type="button" class="btn btn-suave btn-sm" data-accion="dias">Cambiar días</button></div>
        <ol class="semana-cal">${calendario.map((d) => `<li class="semana-dia${d.sesionId ? ' entreno' : ''}${d.dia === pos.diaIdx ? ' hoy' : ''}">
            <span class="semana-dia-nombre">${NOMBRES_DIA_CORTO[d.dia]}</span>
            <span class="semana-dia-tipo">${d.sesionId ? sesiones[d.sesionId].abrev : 'Libre'}</span>
          </li>`).join('')}</ol>
      </section>
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Tu equipo</h2><button type="button" class="btn btn-suave btn-sm" data-accion="equipo">Editar</button></div>
        <div class="chips">${nombresEquipo.length ? nombresEquipo.map((n) => `<span class="chip chip-primario">${n}</span>`).join('') : '<span class="chip">Solo peso corporal</span>'}</div>
        <p class="nota">Los ejercicios se eligen según tu equipo; sin equipo se usan variantes con tu peso corporal.</p>
      </section>
      <div class="segmentos segmentos-semanas" role="group" aria-label="Semana del programa">
        ${[0, 1, 2, 3].map((i) => `<button type="button" class="segmento${i === estado.semana ? ' activo' : ''}" data-accion="semana" data-semana="${i}" aria-pressed="${i === estado.semana}">Semana ${i + 1}${i === pos.semanaIdx ? '<span class="punto-actual" title="Semana actual"></span>' : ''}</button>`).join('')}
      </div>
      <div id="semana-rutinas"></div>
      <p class="aviso-pie">${escapeHtml(App.data.avisos.ejercicio)}</p>`;

    pintarSemana(contenedor, ctx, calendario);
    contenedor.addEventListener('click', (evento) => alClic(evento, contenedor, ctx, calendario));
    contenedor.addEventListener('submit', (evento) => alEnviar(evento, contenedor, ctx, calendario));
  }

  function pintarSemana(contenedor, ctx, calendario) {
    const info = semanasEntrenamiento[estado.semana];
    const extras = storage.obtener('actividadesExtra');
    const completadoHoy = seguimiento.dia(ctx.hoy).entrenamiento;
    const descansos = calendario.filter((d) => !d.sesionId).map((d) => NOMBRES_DIA[d.dia]);

    const tarjetas = calendario.filter((d) => d.sesionId).map((d) => {
      const sesion = rutinas.construirSesion(d.sesionId, estado.semana, ctx.config.equipo);
      const esHoy = estado.semana === ctx.pos.semanaIdx && d.dia === ctx.pos.diaIdx;
      return tarjetaDia(d, sesion, extras[claveExtras(d.dia)] || [], esHoy, esHoy && completadoHoy);
    }).join('');

    contenedor.querySelector('#semana-rutinas').innerHTML = `
      <div class="alert alert-info aviso" role="note">${icono('info')}<p><strong>Semana ${estado.semana + 1}: ${info.titulo}.</strong> ${info.nota} Esfuerzo percibido sugerido: ${info.esfuerzo} de 10.</p></div>
      ${tarjetas}
      <section class="tarjeta tarjeta-descanso">
        <h3 class="tarjeta-titulo">Días de descanso</h3>
        <p class="mb-0">${descansos.join(', ')}. Descansar también es parte del plan: si te sientes bien, camina de 20 a 30 minutos a ritmo suave o haz 10 minutos de movilidad.</p>
      </section>`;
  }

  const lista = (items) => `<ul class="lista-simple">${items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;

  function tarjetaDia(d, sesion, extras, esHoy, completado) {
    const ejercicios = sesion.bloques.map((b) => `<li class="ejercicio">
        <div><span class="ejercicio-nombre">${escapeHtml(b.nombre)}</span>${b.tip ? `<span class="ejercicio-tip">${escapeHtml(b.tip)}</span>` : ''}</div>
        <span class="prescripcion">${b.corto || b.detalle}${[b.unidad, b.descanso && `descanso ${b.descanso}`].filter(Boolean).map((t) => `<small>${t}</small>`).join('')}</span>
      </li>`).join('');
    const agregadas = extras.map((x) => `<li class="ejercicio ejercicio-extra">
        <div><span class="ejercicio-nombre">${escapeHtml(x.nombre)}</span><span class="ejercicio-tip">Actividad agregada por ti</span></div>
        <span class="prescripcion">${escapeHtml(x.reps || 'Libre')}
          <button type="button" class="btn-icono" data-accion="quitar-extra" data-dia="${d.dia}" data-id="${x.id}" aria-label="Quitar ${escapeHtml(x.nombre)}">${icono('trash')}</button>
        </span>
      </li>`).join('');

    return `<article class="tarjeta dia-rutina${esHoy ? ' es-hoy' : ''}" aria-labelledby="rutina-${d.dia}">
      <header class="dia-rutina-cabecera">
        <div>
          <p class="dia-rutina-dia">${NOMBRES_DIA[d.dia]}${esHoy ? ' <span class="chip chip-acento">Hoy</span>' : ''}</p>
          <h3 class="dia-rutina-titulo" id="rutina-${d.dia}">${escapeHtml(sesion.nombre)}</h3>
        </div>
      </header>
      <div class="chips">
        <span class="chip chip-primario">${sesion.etiqueta}</span>
        <span class="chip">${icono('clock')} ${sesion.minutos} min aprox.</span>
        ${completado ? `<span class="chip chip-exito">${icono('check')} Completado hoy</span>` : ''}
      </div>
      <p class="dia-rutina-objetivo"><strong>Objetivo:</strong> ${escapeHtml(sesion.objetivo)}</p>
      ${sesion.calentamiento.length ? `<h4 class="subtitulo">Calentamiento</h4>${lista(sesion.calentamiento)}` : ''}
      <h4 class="subtitulo">${sesion.circuito ? 'Circuito' : 'Ejercicios'}</h4>
      ${sesion.circuito ? `<p class="nota mt-0">${sesion.circuito.texto}</p>` : ''}
      <ul class="ejercicios">${ejercicios}${agregadas}</ul>
      <form class="agregar-extra" data-dia="${d.dia}" novalidate>
        <div class="agregar-extra-campos">
          <label class="visually-hidden" for="extra-nombre-${d.dia}">Tipo de ejercicio</label>
          <input class="form-control" id="extra-nombre-${d.dia}" name="nombre" placeholder="Agregar actividad" maxlength="60" autocomplete="off">
          <label class="visually-hidden" for="extra-reps-${d.dia}">Series o repeticiones</label>
          <input class="form-control" id="extra-reps-${d.dia}" name="reps" placeholder="3×12" maxlength="20" autocomplete="off">
          <button type="submit" class="btn btn-suave" aria-label="Agregar actividad al ${NOMBRES_DIA[d.dia].toLowerCase()}">${icono('plus')}</button>
        </div>
        <div class="invalid-feedback" data-error-de="nombre"></div>
      </form>
      ${sesion.enfriamiento.length ? `<h4 class="subtitulo">Enfriamiento</h4>${lista(sesion.enfriamiento)}` : ''}
      <footer class="acciones">
        <button type="button" class="btn btn-whatsapp" data-accion="compartir" data-dia="${d.dia}">${icono('message')} Enviar por WhatsApp</button>
        ${esHoy ? `<button type="button" class="btn ${completado ? 'btn-suave' : 'btn-primary'}" data-accion="completar" aria-pressed="${completado}">${completado ? 'Desmarcar' : 'Marcar como completado'}</button>` : ''}
      </footer>
    </article>`;
  }

  function alClic(evento, contenedor, ctx, calendario) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    const dia = Number(boton.dataset.dia);
    switch (boton.dataset.accion) {
      case 'semana':
        estado.semana = Number(boton.dataset.semana);
        App.router.refrescar();
        break;
      case 'equipo':
        App.modulos.perfil.editarEquipo();
        break;
      case 'dias':
        editarDias(ctx);
        break;
      case 'compartir': {
        const d = calendario[dia];
        const sesion = rutinas.construirSesion(d.sesionId, estado.semana, ctx.config.equipo);
        const extras = storage.obtener('actividadesExtra')[claveExtras(dia)] || [];
        ui.abrirWhatsApp(rutinas.textoCompartir(sesion, NOMBRES_DIA[dia], estado.semana, extras));
        break;
      }
      case 'completar': {
        const nuevo = boton.getAttribute('aria-pressed') !== 'true';
        seguimiento.marcarEntrenamiento(ctx.hoy, nuevo);
        if (nuevo) ui.toast('Entrenamiento completado');
        pintarSemana(contenedor, ctx, calendario);
        break;
      }
      case 'quitar-extra':
        storage.actualizar('actividadesExtra', (extras) => {
          const clave = claveExtras(dia);
          extras[clave] = (extras[clave] || []).filter((x) => x.id !== boton.dataset.id);
          if (!extras[clave].length) delete extras[clave];
          return extras;
        });
        pintarSemana(contenedor, ctx, calendario);
        break;
      default:
    }
  }

  function alEnviar(evento, contenedor, ctx, calendario) {
    const form = evento.target.closest('.agregar-extra');
    if (!form) return;
    evento.preventDefault();
    const { datos, errores } = App.core.validacion.validarActividad(ui.leerFormulario(form));
    if (!ui.mostrarErrores(form, errores)) return;
    const dia = Number(form.dataset.dia);
    storage.actualizar('actividadesExtra', (extras) => {
      const clave = claveExtras(dia);
      extras[clave] = [...(extras[clave] || []), { id: utils.uid(), ...datos }];
      return extras;
    });
    pintarSemana(contenedor, ctx, calendario);
    ui.toast('Actividad agregada');
  }

  function editarDias({ perfil, config }) {
    const n = perfil.diasEntrenamiento;
    const actuales = rutinas.diasEntrenamiento(perfil, config);
    ui.modal.abrir({
      titulo: 'Días de entrenamiento',
      cuerpo: `<form novalidate>
        <p>Elige exactamente <strong>${n} días</strong>. Las sesiones se asignan en orden y los demás días quedan de descanso.</p>
        ${ui.campoDias(actuales)}
        <p class="nota">Si puedes, deja al menos un día de descanso entre las sesiones de fuerza.</p>
        <div class="acciones">
          <button type="button" class="btn btn-outline-primary" data-accion="sugeridos">Usar días sugeridos</button>
          <button type="submit" class="btn btn-primary">Guardar días</button>
        </div>
      </form>`,
      alMostrar(cuerpo) {
        const form = cuerpo.querySelector('form');
        const guardar = (dias) => {
          storage.actualizar('config', (c) => ({ ...c, diasPersonalizados: dias }));
          ui.modal.cerrar();
          ui.toast('Días actualizados');
          App.router.refrescar();
        };
        form.querySelector('[data-accion="sugeridos"]').addEventListener('click', () => guardar(null));
        form.addEventListener('submit', (evento) => {
          evento.preventDefault();
          const dias = ui.valoresMarcados(form, 'dias').map(Number);
          const error = dias.length === n ? '' : `Elegiste ${dias.length} ${dias.length === 1 ? 'día' : 'días'}; necesitas ${n}. Puedes cambiar cuántos días entrenas desde tu perfil.`;
          if (!ui.mostrarErrores(form, error ? { dias: error } : {})) return;
          guardar(dias);
        });
      }
    });
  }

  App.modulos.rutinas = { render };
})(window.Equilibrio);

/* ---------- Historial ---------- */
(function (App) {
  'use strict';

  const { utils, seguimiento } = App.core;
  const { escapeHtml, num, NOMBRES_DIA_CORTO } = utils;
  const ui = App.ui;
  const { icono } = ui;

  function render(contenedor) {
    const { perfil, registros, hoy, pos } = App.core.contexto();
    const inicio = pos.inicioCiclo;
    const fin = utils.sumarDias(inicio, 27);
    const resumen = seguimiento.resumenRango(inicio, hoy < fin ? hoy : fin);
    const porFecha = new Map(resumen.dias.map((d) => [d.fecha, d]));
    const totalHabitos = App.data.habitos.length;

    const semanas = [0, 1, 2, 3].map((s) => {
      const celdas = [0, 1, 2, 3, 4, 5, 6].map((d) => {
        const fecha = utils.sumarDias(inicio, s * 7 + d);
        const info = porFecha.get(fecha);
        const futuro = fecha > hoy;
        const pct = info ? Math.round((info.habitos / totalHabitos) * 100) : 0;
        const etiqueta = futuro
          ? `${utils.formatoFecha(fecha, 'larga')}, día por venir`
          : `${utils.formatoFecha(fecha, 'larga')}: ${info.habitos} de ${totalHabitos} hábitos${info.entrenamiento ? ', entrenamiento completado' : ''}`;
        return `<button type="button" class="celda-dia${fecha === hoy ? ' hoy' : ''}" data-fecha="${fecha}" aria-label="${escapeHtml(etiqueta)}"${futuro ? ' disabled' : ''}>
          <span class="celda-circulo" style="--lleno: ${pct}%"></span>
          <span class="celda-numero">${utils.parseISO(fecha).getDate()}</span>
          <span class="celda-entreno${info && info.entrenamiento ? ' activo' : ''}" aria-hidden="true"></span>
        </button>`;
      }).join('');
      return `<div class="constancia-semana"><p class="constancia-titulo">Semana ${s + 1}</p><div class="constancia-dias">${celdas}</div></div>`;
    }).join('');

    contenedor.innerHTML = `
      ${ui.cabecera({ titulo: 'Historial', intro: 'Tu constancia día a día y todos tus registros de medidas.' })}
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Tu constancia: 4 semanas</h2><span class="chip">Ciclo ${pos.ciclo}</span></div>
        <p class="nota mt-0">Entre más lleno el círculo, más hábitos cumpliste ese día. El punto rosa marca los días con entrenamiento. Toca un día para registrarlo o corregirlo.</p>
        <div class="constancia-encabezado" aria-hidden="true">${NOMBRES_DIA_CORTO.map((n) => `<span>${n}</span>`).join('')}</div>
        <div class="constancia">${semanas}</div>
      </section>
      <section class="mini-stats" aria-label="Resumen del ciclo">
        ${ui.stat('Días activos', resumen.activos, '', 'en este ciclo')}
        ${ui.stat('Entrenos', resumen.entrenamientos, '', 'completados')}
        ${ui.stat('Comidas', resumen.comidas, '', 'registradas')}
      </section>
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Registros de medidas</h2>
          <button type="button" class="btn btn-primary btn-sm" data-accion="registrar">${icono('plus')} Nuevo</button></div>
        <ul class="registros">${registros.slice().reverse().map((r) => App.modulos.progreso.itemRegistro(r, perfil, true)).join('')}</ul>
        ${registros.length === 1 ? '<p class="nota">La medición inicial no se puede eliminar mientras sea tu único registro, pero sí puedes corregirla.</p>' : ''}
      </section>`;

    contenedor.addEventListener('click', (evento) => alClic(evento, registros));
  }

  async function alClic(evento, registros) {
    const celda = evento.target.closest('.celda-dia');
    if (celda) {
      editarDia(celda.dataset.fecha);
      return;
    }
    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    const registro = registros.find((r) => r.id === boton.dataset.id);
    if (boton.dataset.accion === 'registrar') App.modulos.progreso.abrirFormulario();
    if (boton.dataset.accion === 'editar' && registro) App.modulos.progreso.abrirFormulario(registro);
    if (boton.dataset.accion === 'eliminar' && registro) {
      if (registros.length <= 1) {
        ui.toast('Necesitas al menos un registro. Puedes editar este en lugar de eliminarlo.', 'info');
        return;
      }
      const ok = await ui.confirmar({
        titulo: 'Eliminar registro',
        mensaje: `Se eliminará el registro del ${utils.formatoFecha(registro.fecha)} (${num(registro.pesoKg, 1)} kg). Esta acción no se puede deshacer.`,
        textoConfirmar: 'Eliminar',
        peligro: true
      });
      if (!ok) return;
      seguimiento.eliminarRegistro(registro.id);
      ui.toast('Registro eliminado');
      App.router.refrescar();
    }
  }

  const casilla = (grupo, id, texto, marcado) => `<div class="form-check casilla-grande">
      <input class="form-check-input" type="checkbox" id="d-${grupo}-${id}" name="${grupo}" value="${id}"${marcado ? ' checked' : ''}>
      <label class="form-check-label" for="d-${grupo}-${id}">${texto}</label>
    </div>`;

  function editarDia(fecha) {
    const d = seguimiento.dia(fecha);
    const titulo = utils.formatoFecha(fecha, 'larga');
    ui.modal.abrir({
      titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
      cuerpo: `<form novalidate>
        <fieldset class="campo"><legend class="form-label">Hábitos</legend>
          ${App.data.habitos.map((h) => casilla('habitos', h.id, h.nombre, d.habitos[h.id])).join('')}</fieldset>
        <fieldset class="campo"><legend class="form-label">Comidas realizadas</legend>
          ${App.data.tiemposComida.map((t) => casilla('comidas', t.id, t.nombre, d.comidas[t.id])).join('')}</fieldset>
        <fieldset class="campo"><legend class="form-label">Entrenamiento</legend>
          ${casilla('entrenamiento', 'si', 'Completé mi entrenamiento', d.entrenamiento)}</fieldset>
        <button type="submit" class="btn btn-primary btn-lg w-100">Guardar día</button>
      </form>`,
      alMostrar(cuerpo) {
        const form = cuerpo.querySelector('form');
        form.addEventListener('submit', (evento) => {
          evento.preventDefault();
          const marcados = (grupo) => Object.fromEntries(ui.valoresMarcados(form, grupo).map((id) => [id, true]));
          seguimiento.guardarDia(fecha, {
            habitos: marcados('habitos'),
            comidas: marcados('comidas'),
            entrenamiento: ui.valoresMarcados(form, 'entrenamiento').length > 0
          });
          ui.modal.cerrar();
          ui.toast('Día actualizado');
          App.router.refrescar();
        });
      }
    });
  }

  App.modulos.historial = { render };
})(window.Equilibrio);

/* ---------- Perfil ---------- */
(function (App) {
  'use strict';

  const { utils, storage, validacion } = App.core;
  const { escapeHtml, num } = utils;
  const ui = App.ui;
  const { icono } = ui;

  function render(contenedor) {
    const { perfil, config, resumen, pos } = App.core.contexto();
    const nombresEquipo = App.data.equipo.filter((e) => config.equipo.includes(e.id)).map((e) => e.nombre);

    contenedor.innerHTML = `
      ${ui.cabecera({ titulo: 'Perfil', intro: 'Tus datos alimentan el cálculo de calorías, el IMC, el progreso y las rutinas.' })}
      <section class="tarjeta tarjeta-hero">
        <div class="perfil-cabecera">
          <span class="avatar" aria-hidden="true">${escapeHtml(perfil.nombre.charAt(0).toUpperCase())}</span>
          <div><h2 class="tarjeta-titulo mb-0">${escapeHtml(perfil.nombre)}</h2><p class="nota mt-0">Desde el ${escapeHtml(utils.formatoFecha(perfil.creadoEl))}</p></div>
        </div>
        <dl class="lista-datos">
          <div><dt>Edad</dt><dd>${perfil.edad} años</dd></div>
          <div><dt>Sexo</dt><dd>${perfil.sexo === 'M' ? 'Hombre' : 'Mujer'}</dd></div>
          <div><dt>Altura</dt><dd>${num(perfil.alturaCm, 1)} cm</dd></div>
          <div><dt>Peso actual</dt><dd>${num(resumen.pesoActual, 1)} kg</dd></div>
          <div><dt>Peso meta</dt><dd>${num(perfil.pesoMetaKg, 1)} kg</dd></div>
          <div><dt>Entrenamiento</dt><dd>${perfil.diasEntrenamiento} días por semana</dd></div>
        </dl>
        <button type="button" class="btn btn-outline-primary w-100" data-accion="editar">${icono('edit')} Editar mis datos</button>
      </section>
      <div class="rejilla-2">
        ${ui.tarjetaImc(resumen.imc)}
        ${ui.tarjetaIcc(resumen.actual, perfil.sexo)}
      </div>
      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h2 class="tarjeta-titulo">Equipo para entrenar</h2><button type="button" class="btn btn-suave btn-sm" data-accion="equipo">Editar</button></div>
        <div class="chips">${nombresEquipo.length ? nombresEquipo.map((n) => `<span class="chip chip-primario">${n}</span>`).join('') : '<span class="chip">Solo peso corporal</span>'}</div>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Horarios de comida</h2>
        <p class="nota mt-0">Procura dejar de 3 a 4 horas entre cada tiempo. Se usan para mostrar tu siguiente comida.</p>
        <form id="form-horarios" class="horarios" novalidate>
          ${App.data.tiemposComida.map((t) => ui.campoHora({ nombre: t.id, etiqueta: t.nombre, valor: config.horarios[t.id] })).join('')}
          <button type="submit" class="btn btn-primary">Guardar horarios</button>
        </form>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Ciclo del plan</h2>
        <p>Vas en la semana ${pos.semanaIdx + 1} del ciclo ${pos.ciclo}, que empezó el ${escapeHtml(utils.formatoFecha(pos.inicioCiclo))}. Al terminar la semana 4, el plan vuelve a la semana 1.</p>
        <button type="button" class="btn btn-outline-primary" data-accion="reiniciar-ciclo">${icono('refresh')} Volver a la semana 1</button>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Tus datos</h2>
        <p class="nota mt-0">Todo se guarda solo en este navegador. Descarga un respaldo para no perderlo o para pasarlo a otro dispositivo.</p>
        <div class="acciones">
          <button type="button" class="btn btn-outline-primary" data-accion="exportar">${icono('download')} Descargar respaldo</button>
          <button type="button" class="btn btn-outline-primary" data-accion="importar">${icono('upload')} Restaurar respaldo</button>
          <input type="file" id="archivo-respaldo" accept="application/json,.json" hidden>
        </div>
        <hr>
        <button type="button" class="btn btn-outline-danger" data-accion="restablecer">${icono('trash')} Restablecer datos</button>
      </section>
      <p class="aviso-pie">${escapeHtml(App.data.avisos.metricas)} ${escapeHtml(App.data.avisos.plan)}</p>`;

    contenedor.addEventListener('click', (evento) => alClic(evento, contenedor));
    contenedor.querySelector('#form-horarios').addEventListener('submit', guardarHorarios);
    contenedor.querySelector('#archivo-respaldo').addEventListener('change', importarRespaldo);
  }

  async function alClic(evento, contenedor) {
    const boton = evento.target.closest('[data-accion]');
    if (!boton) return;
    switch (boton.dataset.accion) {
      case 'editar':
        editarPerfil();
        break;
      case 'equipo':
        editarEquipo();
        break;
      case 'exportar':
        ui.descargarJson(`equilibrio-respaldo-${utils.hoyISO()}.json`, storage.exportar());
        ui.toast('Respaldo descargado');
        break;
      case 'importar':
        contenedor.querySelector('#archivo-respaldo').click();
        break;
      case 'reiniciar-ciclo':
        if (await ui.confirmar({ titulo: 'Reiniciar el ciclo', mensaje: 'El plan de comidas y las rutinas volverán a la semana 1 a partir de esta semana. Tus registros se conservan.', textoConfirmar: 'Reiniciar' })) {
          storage.actualizar('config', (c) => ({ ...c, inicioCiclo: utils.lunesDe(utils.hoyISO()) }));
          ui.toast('Ciclo reiniciado: estás en la semana 1');
          App.router.refrescar();
        }
        break;
      case 'restablecer':
        if (await ui.confirmar({ titulo: 'Restablecer datos', mensaje: 'Se borrarán tu perfil, tus registros, tus hábitos y tu configuración de este navegador. Esta acción no se puede deshacer.', textoConfirmar: 'Borrar todo', peligro: true })) {
          storage.borrarTodo();
          // Navegar a la URL sin hash recarga la página sin disparar el cambio de ruta.
          window.location.replace(window.location.pathname + window.location.search);
        }
        break;
      default:
    }
  }

  function editarPerfil() {
    const { perfil, resumen } = App.core.contexto();
    ui.modal.abrir({
      titulo: 'Editar mis datos',
      cuerpo: `<form novalidate>
        ${ui.campoTexto({ nombre: 'nombre', etiqueta: 'Nombre', valor: perfil.nombre, max: 40, autocomplete: 'given-name' })}
        <div class="row g-3">
          <div class="col-6">${ui.campoNumero({ nombre: 'edad', etiqueta: 'Edad', valor: perfil.edad, unidad: 'años', entero: true })}</div>
          <div class="col-6">${ui.campoNumero({ nombre: 'alturaCm', etiqueta: 'Altura', valor: perfil.alturaCm, unidad: 'cm' })}</div>
        </div>
        ${ui.campoOpciones({ nombre: 'sexo', etiqueta: 'Sexo', valor: perfil.sexo, opciones: [['F', 'Mujer'], ['M', 'Hombre']] })}
        ${ui.campoNumero({ nombre: 'pesoMetaKg', etiqueta: 'Peso meta', valor: perfil.pesoMetaKg, unidad: 'kg', ayuda: `Tu peso actual es ${num(resumen.pesoActual, 1)} kg. Para cambiarlo, registra tu progreso.` })}
        ${ui.campoOpciones({ nombre: 'diasEntrenamiento', etiqueta: 'Días de entrenamiento por semana', valor: perfil.diasEntrenamiento, opciones: [3, 4, 5, 6].map((n) => [n, n]) })}
        <button type="submit" class="btn btn-primary btn-lg w-100 mt-2">Guardar cambios</button>
      </form>`,
      alMostrar(cuerpo) {
        const form = cuerpo.querySelector('form');
        form.addEventListener('submit', (evento) => {
          evento.preventDefault();
          const entrada = ui.leerFormulario(form);
          const personales = validacion.validarDatosPersonales(entrada);
          const objetivo = validacion.validarObjetivo(entrada, {
            pesoActualKg: resumen.pesoActual,
            alturaCm: personales.datos.alturaCm || perfil.alturaCm
          });
          const errores = { ...personales.errores, ...objetivo.errores };
          if (!ui.mostrarErrores(form, errores)) return;
          const nuevo = { ...perfil, ...personales.datos, ...objetivo.datos };
          storage.guardar('perfil', nuevo);
          if (nuevo.diasEntrenamiento !== perfil.diasEntrenamiento) {
            storage.actualizar('config', (c) => ({ ...c, diasPersonalizados: null }));
          }
          ui.modal.cerrar();
          ui.toast('Datos actualizados');
          App.router.refrescar();
        });
      }
    });
  }

  function editarEquipo() {
    const config = storage.obtener('config');
    ui.modal.abrir({
      titulo: 'Equipo para entrenar',
      cuerpo: `<form novalidate>
        <p>Marca lo que tienes a la mano. Las rutinas cambian los ejercicios según tu selección.</p>
        ${ui.campoEquipo(config.equipo)}
        <button type="submit" class="btn btn-primary btn-lg w-100">Guardar equipo</button>
      </form>`,
      alMostrar(cuerpo) {
        const form = cuerpo.querySelector('form');
        form.addEventListener('submit', (evento) => {
          evento.preventDefault();
          storage.actualizar('config', (c) => ({ ...c, equipo: ui.valoresMarcados(form, 'equipo') }));
          ui.modal.cerrar();
          ui.toast('Equipo actualizado; tus rutinas se ajustaron.');
          App.router.refrescar();
        });
      }
    });
  }

  function guardarHorarios(evento) {
    evento.preventDefault();
    const form = evento.target;
    const { datos, errores } = validacion.validarHorarios(ui.leerFormulario(form), App.data.tiemposComida);
    if (!ui.mostrarErrores(form, errores)) return;
    storage.actualizar('config', (c) => ({ ...c, horarios: datos }));
    ui.toast('Horarios guardados');
  }

  async function importarRespaldo(evento) {
    const archivo = evento.target.files[0];
    evento.target.value = '';
    if (!archivo) return;
    try {
      const respaldo = JSON.parse(await archivo.text());
      const ok = await ui.confirmar({ titulo: 'Restaurar respaldo', mensaje: `Se reemplazarán los datos actuales por los del archivo "${archivo.name}".`, textoConfirmar: 'Restaurar' });
      if (!ok) return;
      storage.importar(respaldo);
      window.location.reload();
    } catch (error) {
      ui.toast(error instanceof SyntaxError ? 'El archivo no tiene un formato válido.' : error.message, 'error');
    }
  }

  App.modulos.perfil = { render, editarEquipo };
})(window.Equilibrio);

/* ==========================================================================
   5. ARRANQUE
   ========================================================================== */

/* ---------- Enrutador, navegación, tema y arranque ---------- */
(function (App) {
  'use strict';

  const NAV = [
    { ruta: 'inicio', texto: 'Inicio', icono: 'home', movil: true },
    { ruta: 'alimentacion', texto: 'Alimentación', icono: 'utensils', movil: true },
    { ruta: 'rutinas', texto: 'Rutinas', icono: 'dumbbell', movil: true },
    { ruta: 'progreso', texto: 'Progreso', icono: 'trending', movil: true },
    { ruta: 'historial', texto: 'Historial', icono: 'calendar', movil: false },
    { ruta: 'perfil', texto: 'Perfil', icono: 'user', movil: true }
  ];
  const MODULOS = {
    inicio: 'dashboard', alimentacion: 'alimentacion', rutinas: 'rutinas',
    progreso: 'progreso', historial: 'historial', perfil: 'perfil'
  };

  let rutaPintada = null;
  let fechaPintada = null;
  const $ = (id) => document.getElementById(id);

  function rutaActual() {
    const ruta = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return MODULOS[ruta] ? ruta : 'inicio';
  }

  function marcarNav(ruta) {
    document.querySelectorAll('[data-ruta]').forEach((enlace) => {
      // En el celular, Historial se resalta dentro de Progreso.
      const activo = enlace.dataset.ruta === ruta || (ruta === 'historial' && enlace.dataset.ruta === 'progreso' && enlace.closest('#nav-movil'));
      enlace.classList.toggle('activo', Boolean(activo));
      if (activo) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    });
  }

  function render() {
    const ruta = rutaActual();
    const cambioDeRuta = ruta !== rutaPintada;
    const vista = $('vista');
    const raiz = document.createElement('div');
    raiz.className = `vista vista-${ruta}`;
    vista.replaceChildren(raiz);
    try {
      App.modulos[MODULOS[ruta]].render(raiz);
    } catch (error) {
      console.error(error);
      raiz.innerHTML = App.ui.estadoVacio({
        icono: 'alert',
        titulo: 'Algo salió mal al mostrar esta sección',
        texto: 'Recarga la página. Si el problema continúa, descarga un respaldo desde tu perfil.',
        accion: '<button type="button" class="btn btn-primary" onclick="location.reload()">Recargar</button>'
      });
    }
    marcarNav(ruta);
    document.title = `${NAV.find((n) => n.ruta === ruta).texto} | Equilibrio`;
    if (cambioDeRuta && rutaPintada !== null) {
      window.scrollTo(0, 0);
      vista.focus({ preventScroll: true });
    }
    rutaPintada = ruta;
    fechaPintada = App.core.utils.hoyISO();
  }

  App.router = {
    ir(ruta) {
      if (rutaActual() === ruta) render();
      else window.location.hash = `#/${ruta}`;
    },
    refrescar: render
  };

  function construirNav() {
    const enlace = (n, clase) => `<a href="#/${n.ruta}" class="${clase}" data-ruta="${n.ruta}">${App.ui.icono(n.icono)}<span>${n.texto}</span></a>`;
    $('nav-escritorio').innerHTML = NAV.map((n) => enlace(n, 'nav-enlace')).join('');
    $('nav-movil').innerHTML = NAV.filter((n) => n.movil).map((n) => enlace(n, 'tab')).join('');
  }

  function mostrarApp() {
    $('onboarding').hidden = true;
    $('onboarding').replaceChildren();
    $('app').hidden = false;
    construirNav();
    if (!window.location.hash) history.replaceState(null, '', '#/inicio');
    window.scrollTo(0, 0);
    render();
  }

  function mostrarOnboarding() {
    $('app').hidden = true;
    $('onboarding').hidden = false;
    App.modulos.onboarding.render($('onboarding'));
  }

  // Sincroniza el tema de Bootstrap con el del sistema (o con data-theme si se fija).
  function aplicarTema() {
    const raiz = document.documentElement;
    const oscuroSistema = window.matchMedia('(prefers-color-scheme: dark)');
    const actualizar = () => {
      const fijado = raiz.getAttribute('data-theme');
      const oscuro = fijado === 'dark' || (fijado !== 'light' && oscuroSistema.matches);
      raiz.setAttribute('data-bs-theme', oscuro ? 'dark' : 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', getComputedStyle(raiz).getPropertyValue('--app-bg').trim() || '#F2F5F3');
    };
    actualizar();
    oscuroSistema.addEventListener('change', actualizar);
    new MutationObserver(actualizar).observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function pantallaError(titulo, texto) {
    document.body.innerHTML = `<main class="error-carga"><h1>${titulo}</h1><p>${texto}</p>
      <button type="button" class="btn btn-primary" onclick="location.reload()">Intentar de nuevo</button></main>`;
  }

  function iniciar() {
    aplicarTema();
    if (typeof window.bootstrap === 'undefined') {
      pantallaError('No se pudieron cargar los componentes', 'Equilibrio necesita conexión a internet la primera vez para descargar Bootstrap. Revisa tu conexión y vuelve a intentarlo.');
      return;
    }
    if (!App.core.storage.disponible()) {
      pantallaError('No se puede guardar información', 'Tu navegador no permite guardar datos en este sitio (puede pasar en modo privado). Ábrelo en una ventana normal para usar Equilibrio.');
      return;
    }
    window.addEventListener('equilibrio:error-almacenamiento', () => {
      App.ui.toast('No se pudo guardar el cambio. Revisa el espacio disponible del navegador.', 'error');
    });
    window.addEventListener('hashchange', () => {
      if (!$('app').hidden) render();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !$('app').hidden && fechaPintada !== App.core.utils.hoyISO()) render();
    });
    if (App.core.storage.obtener('perfil')) mostrarApp();
    else mostrarOnboarding();
  }

  App.mostrarApp = mostrarApp;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window.Equilibrio);
