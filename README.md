# Equilibrio

Aplicación web para bajar de peso de forma ordenada: registro de medidas y progreso, plan de alimentación antiinflamatorio de 4 semanas con lista del supermercado, rutinas adaptadas a tus días y a tu equipo, hábitos diarios e historial de constancia. Está pensada para usarse desde el celular y funciona sin servidor: todo se guarda en el navegador.

> Este plan está diseñado como orientación general y no sustituye la valoración de un médico o nutriólogo.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la página, navegación, modales y avisos. Carga Bootstrap 5 y las fuentes desde internet, y después `style.css` y `script.js`. |
| `style.css` | Todos los estilos: diseño para celular primero, modo claro y oscuro, y los ajustes a los componentes de Bootstrap. |
| `script.js` | Toda la lógica de la app, organizada en secciones (ver abajo). |
| `manifest.webmanifest` | Permite instalar la app en la pantalla de inicio del celular con nombre e ícono. |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Íconos para Android, iPhone y la pestaña del navegador. |

Los ocho archivos van juntos en la misma carpeta, sin subcarpetas.

## Probarla en tu computadora

Lo más sencillo es abrir `index.html` con doble clic en Chrome o Edge. Si prefieres simular cómo se verá publicada, abre una terminal en la carpeta y ejecuta un servidor local; después entra a `http://localhost:8000`:

```bash
python -m http.server 8000
```

La primera vez necesitas internet, porque Bootstrap y las fuentes se descargan de una CDN.

## Publicarla gratis en GitHub Pages

Crea un repositorio **público** en GitHub, por ejemplo `equilibrio`. Dentro del repositorio elige *Add file* y luego *Upload files*, sube los ocho archivos tal cual y confirma con *Commit changes*. Después entra a *Settings*, abre la sección *Pages* y en *Source* elige *Deploy from a branch*, con la rama `main` y la carpeta `/ (root)`; guarda. En uno o dos minutos la app queda disponible en `https://TU-USUARIO.github.io/equilibrio/`.

Desde el celular también se puede hacer: abre github.com en el navegador y, si no ves la opción para subir archivos, activa "Ver versión de escritorio" en el menú del navegador.

Para instalarla en el celular, abre el enlace publicado y usa "Agregar a pantalla de inicio" (en Android, menú ⋮ de Chrome; en iPhone, botón Compartir de Safari). Se abrirá a pantalla completa, como una app.

Tus datos no se suben al repositorio: viven solo en el navegador de cada dispositivo, así que el repositorio público no contiene información personal.

Otra opción sin cuenta de GitHub es Netlify Drop (`app.netlify.com/drop`): arrastras la carpeta con los ocho archivos desde la computadora y te da un enlace al instante.

## Tus datos

Todo se guarda en el `localStorage` del navegador, con claves que empiezan con `equilibrio.v1.`. Eso significa que los datos existen solo en ese navegador y en ese dispositivo: si borras los datos de navegación, se pierden, y la versión publicada no comparte datos con la que abriste en tu computadora. Por eso en **Perfil** hay un botón para descargar un respaldo en JSON y otro para restaurarlo, que también sirve para pasar tu información de un dispositivo a otro. "Restablecer datos" borra todo después de pedir confirmación.

| Clave | Contenido |
|---|---|
| `perfil` | Nombre, edad, sexo, altura, días de entrenamiento, peso meta y fecha de alta. |
| `registros` | Mediciones: fecha, peso, cintura, cadera y comentario. La más antigua es tu punto de partida. |
| `config` | Porcentaje de déficit, equipo disponible, días de entrenamiento personalizados, horarios de comida y fecha de inicio del ciclo de 4 semanas. |
| `diario` | Por fecha: hábitos cumplidos, comidas hechas y entrenamiento completado. |
| `actividadesExtra` | Actividades que agregas a una rutina, por semana y día. |
| `compras` | Casillas marcadas de la lista del supermercado, por semana. |

## Cómo está organizado `script.js`

El archivo está dividido en cinco secciones, marcadas con comentarios. Cada bloque `(function (App) { ... })(window.Equilibrio)` es un módulo independiente que se registra en el objeto global `window.Equilibrio`, y cada sección usa lo que definieron las anteriores, por eso el orden importa.

| Sección | Contenido |
|---|---|
| 1. Datos (`App.data`) | Catálogo de 72 alimentos con porción, calorías y macronutrientes; 59 platillos; el plan de 4 semanas; equipo y ejercicios; plantillas de sesión y progresión; hábitos y avisos. |
| 2. Núcleo (`App.core`) | Lógica sin interfaz: fechas locales, almacenamiento, fórmulas, validación, escalado de porciones y lista de compras, motor de rutinas, registros, racha. |
| 3. Interfaz (`App.ui`) | Iconos SVG, componentes reutilizables (avisos, modales, campos de formulario, tarjetas) y la gráfica de líneas. |
| 4. Pantallas (`App.modulos`) | Registro inicial, Inicio, Progreso, Alimentación, Rutinas, Historial y Perfil. |
| 5. Arranque (`App.router`) | Navegación por `#/ruta`, tema claro u oscuro y manejo de errores al cargar. |

Para cambiar platillos o ejercicios basta con editar la sección de datos: las pantallas, las porciones y la lista de compras se recalculan solas.

## Fórmulas

| Cálculo | Fórmula |
|---|---|
| IMC | peso (kg) ÷ altura (m)², con las categorías de la OMS para adultos. |
| Relación cintura/cadera | cintura ÷ cadera; referencia de la OMS de 0.90 en hombres y 0.85 en mujeres. |
| Tasa metabólica basal | Mifflin-St Jeor: 10 × peso + 6.25 × altura (cm) − 5 × edad, + 5 en hombres o − 161 en mujeres. |
| Gasto diario | TMB × factor de actividad según días de entrenamiento: 3 días 1.375, 4 días 1.46, 5 días 1.55, 6 días 1.64. |
| Déficit | 10, 15 (predeterminado) o 20 % del gasto diario, con un máximo de 700 kcal. |
| Objetivo | Gasto diario − déficit, sin bajar de la TMB ni de 1,200 kcal (mujeres) o 1,500 kcal (hombres). |
| Macronutrientes | Proteína 1.6 g por kg de peso meta (máximo 35 % de las calorías), grasas 30 %, carbohidratos el resto. |
| Ritmo estimado | déficit diario × 7 ÷ 7,700 kcal por kg. Es aproximado; con el tiempo la pérdida suele ser más lenta. |
| Avance | (peso inicial − peso actual) ÷ (peso inicial − peso meta). |

Las validaciones evitan valores absurdos: edad de 18 a 90 años, altura de 120 a 230 cm, peso de 30 a 300 kg, cintura de 40 a 200 cm, cadera de 50 a 220 cm, fechas que no sean futuras y una meta menor a tu peso actual que no quede por debajo de un IMC de 18.5. Los números aceptan punto o coma decimal.

## Cómo se adapta el plan

**Alimentación.** El plan base promedia unas 1,640 kcal al día en cinco tiempos (desayuno, colación, comida, colación y cena, cada 3 a 4 horas), con ingredientes comunes en mercados y supermercados de la Ciudad de México y el Estado de México. Para llegar a tu objetivo, las porciones se multiplican por un factor único (de 0.7 a 1.6) mientras las verduras se mantienen libres. Las cantidades se muestran en gramos y en medidas caseras, y la lista del supermercado suma los 7 días de la semana, convierte arroz, pasta y leguminosas a peso crudo y redondea hacia arriba. Cambiar el déficit en la pestaña Objetivo ajusta todo al momento.

**Rutinas.** Las sesiones se reparten según tus días y combinan fuerza funcional, boxeo, cardio ligero y, con más días, un circuito y una sesión suave. Desde la pantalla de Rutinas puedes elegir qué días de la semana entrenas.

| Días | Sesiones sugeridas |
|---|---|
| 3 | Lunes cuerpo completo A, miércoles boxeo, viernes cuerpo completo B |
| 4 | Lunes tren inferior, miércoles boxeo, viernes tren superior, sábado cardio |
| 5 | Lunes inferior, martes boxeo, jueves superior, viernes cardio, sábado circuito |
| 6 | Lunes a sábado: lo anterior más una sesión suave de movilidad |

Cada ejercicio tiene alternativas según el equipo (cuerda, mancuernas, kettlebell, costal, pera fija, pera elástica, barra y discos, natación); sin equipo se usan variantes con peso corporal. La intensidad sube de forma gradual durante las 4 semanas (técnica y adaptación, progresión, volumen y consolidación), con una escala de esfuerzo percibido como guía. Al terminar la semana 4, el ciclo vuelve a empezar.

## Sobre las capturas de la app anterior

De la pantalla de rutinas solo se veía el lunes de la semana 1, así que el resto de los días y las semanas 2 a 4 se diseñaron con la misma estructura y una progresión gradual. El checklist de pilares y la guía de sueño se convirtieron en los hábitos diarios y en la guía de hábitos, redactados como recomendaciones de estilo de vida, sin afirmar que algún alimento o hábito "baja el cortisol". La cuadrícula "Tu constancia" se conservó en el Historial. La lista de suplementos no se incluyó, porque la conveniencia y la dosis de un suplemento deben indicarse de forma individual por un profesional de la salud.

## Limitaciones y siguientes pasos

La app necesita internet la primera vez para descargar Bootstrap y las fuentes; para usarla completamente sin conexión haría falta agregar un *service worker*. Los datos viven en un solo dispositivo; sincronizarlos entre celular y computadora requeriría un servicio con base de datos, como Supabase. Todas las cifras son estimaciones orientativas.
