/* =========================================================
   EQUILIBRIO — Lógica de la aplicación (Vanilla JS)
   ---------------------------------------------------------
   Los datos viven en PostgreSQL (Supabase). Al abrir la app se
   traen de golpe a STATE y de ahí pintan todas las secciones;
   cada alta o baja va primero a la base y luego actualiza STATE.
   El contenido base del plan (menús y rutinas) sigue en data.js,
   porque es material tuyo que editas a mano, no datos capturados.
   ========================================================= */

/* ---------------- Estado en memoria ---------------- */
const STATE = {
  cargado: false,
  mediciones: [],
  recetas: [],
  sesiones: [],
  actividades: [],
  tecnicas: [],
  checklist: {},        // { "2026-09-13": { pilar_id: true } }
  checklistInicio: null
};

// Escapa texto capturado por el usuario antes de insertarlo como HTML
function escapeHTML(str){
  if(str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

/* ---------------- Fechas locales (UTC−6) ----------------
   toISOString() convierte a UTC: después de las 18:00 hora local un
   registro se guardaría con la fecha del día siguiente. */
function toLocalISODate(date){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function toLocalISOMonth(date){ return toLocalISODate(date).slice(0,7); }
function todayISO(){ return toLocalISODate(new Date()); }
function parseLocalISODate(iso){
  const [y,m,d] = String(iso).split("-").map(Number);
  return new Date(y, (m||1)-1, d||1);
}

const WHATSAPP_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.6-1.5-.8-1.9-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.3.2-.6.2-1.2.1-1.3z"/><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z"/></svg>`;

function shareOnWhatsApp(text){
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

/* ---------------- Navegación ---------------- */
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

function goToView(targetId){
  views.forEach(v => v.classList.toggle("view-active", v.id === targetId));
  navButtons.forEach(b => {
    const active = b.dataset.target === targetId;
    b.classList.toggle("nav-active", active);
    if(active) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
  });
  window.scrollTo({ top:0, behavior:"smooth" });
}
navButtons.forEach(btn => btn.addEventListener("click", ()=> goToView(btn.dataset.target)));

/* ---------------- Normalización de filas de la base ----------------
   La base usa nombres en español y unidades explícitas (peso_kg,
   estatura_cm). Aquí se traducen a la forma que ya esperaban las
   funciones de pintado, para no reescribirlas todas. */
function normalizarMedicion(row){
  return {
    id: row.id,
    fecha: row.fecha,
    edad: row.edad,
    sexo: row.sexo,
    estatura: Number(row.estatura_cm),
    peso: Number(row.peso_kg),
    cintura: row.cintura_cm === null ? null : Number(row.cintura_cm),
    cadera: row.cadera_cm === null ? null : Number(row.cadera_cm),
    imc: Number(row.imc)
  };
}
function normalizarSesion(row){
  return {
    id: row.id,
    plan_clave: row.plan_clave,
    semana: row.semana,
    dia_indice: row.dia_indice,
    day: DAY_NAMES[row.dia_indice],
    title: row.titulo,
    tag: row.categoria,
    exercises: (row.ejercicios || [])
      .slice()
      .sort((a,b)=> (a.orden||0) - (b.orden||0))
      .map(ex=>({ id: ex.id, name: ex.nombre, meta: ex.meta || "" }))
  };
}

function hidratarEstado(datos){
  STATE.mediciones  = datos.mediciones.map(normalizarMedicion);
  STATE.recetas     = datos.recetas.slice();
  STATE.sesiones    = datos.sesiones.map(normalizarSesion);
  STATE.actividades = datos.actividades.slice();
  STATE.tecnicas    = datos.tecnicas.slice();
  STATE.checklist   = {};
  datos.checklist.forEach(r=>{
    if(!STATE.checklist[r.fecha]) STATE.checklist[r.fecha] = {};
    STATE.checklist[r.fecha][r.pilar_clave] = true;
  });
  STATE.checklistInicio = datos.preferencias ? datos.preferencias.checklist_inicio : null;
  STATE.cargado = true;
}

/* ---------------- PERFIL ---------------- */
function calcIMC(pesoKg, estaturaCm){
  const m = estaturaCm/100;
  return pesoKg / (m*m);
}
function imcCategoria(imc){
  if(imc < 18.5) return "Bajo peso";
  if(imc < 25) return "Saludable";
  if(imc < 30) return "Sobrepeso";
  return "Obesidad";
}
const IMC_OBJETIVO = 24.9;
function pesoObjetivo(estaturaCm){
  const m = estaturaCm / 100;
  return IMC_OBJETIVO * m * m;
}
// Mifflin-St Jeor + actividad moderada-alta, con déficit moderado
function calcMetaCalorica(peso, estatura, edad, sexo){
  const bmr = sexo === "M"
    ? (10*peso) + (6.25*estatura) - (5*edad) + 5
    : (10*peso) + (6.25*estatura) - (5*edad) - 161;
  return Math.round(bmr * 1.55 * 0.82);
}

const profileForm = document.getElementById("profileForm");
const profileHint = document.getElementById("profileHint");

profileForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!exigirConexion(profileHint)) return;

  const edad = parseFloat(document.getElementById("fEdad").value);
  const sexo = document.getElementById("fSexo").value;
  const estatura = parseFloat(document.getElementById("fEstatura").value);
  const peso = parseFloat(document.getElementById("fPeso").value);
  const cintura = parseFloat(document.getElementById("fCintura").value) || null;
  const cadera = parseFloat(document.getElementById("fCadera").value) || null;

  if(!edad || !sexo || !estatura || !peso){
    profileHint.textContent = "Completa al menos edad, sexo, estatura y peso.";
    return;
  }

  profileHint.textContent = "Guardando…";
  try{
    const fila = await DB.crearMedicion({ fecha: todayISO(), edad, sexo, estatura, peso, cintura, cadera });
    const entry = normalizarMedicion(fila);
    STATE.mediciones.push(entry);
    STATE.mediciones.sort((a,b)=> a.fecha.localeCompare(b.fecha));

    const metaKcal = calcMetaCalorica(peso, estatura, edad, sexo);
    profileHint.textContent = `Guardado ✓ — IMC ${entry.imc} (${imcCategoria(entry.imc)}). Meta calórica diaria orientativa: ~${metaKcal} kcal.`;

    document.getElementById("fPeso").value = "";
    document.getElementById("fCintura").value = "";
    document.getElementById("fCadera").value = "";
    renderProfileSummary();
    renderConnSummary();
  }catch(err){
    profileHint.textContent = "No se guardó: " + err.message;
  }
});

async function eliminarMedicion(id){
  try{
    await DB.borrarMedicion(id);
    STATE.mediciones = STATE.mediciones.filter(m=>m.id!==id);
    renderProfileSummary();
    renderConnSummary();
  }catch(err){ profileHint.textContent = "No se pudo eliminar: " + err.message; }
}

/* ---------------- Dial de balance ---------------- */
function setDial(circleEl, pct, radioPorDefecto){
  if(!circleEl) return;
  const r = parseFloat(circleEl.getAttribute("r"));
  const circ = 2 * Math.PI * (Number.isFinite(r) ? r : radioPorDefecto);
  const safePct = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
  circleEl.style.strokeDasharray = circ;
  circleEl.style.strokeDashoffset = circ - (circ * safePct);
}

function renderProfileSummary(){
  const data = STATE.mediciones;
  const historyList = document.getElementById("historyList");
  const dialIMC = document.getElementById("dialIMC");
  const dialProgress = document.getElementById("dialProgress");
  const dialProgressInner = document.getElementById("dialProgressInner");

  historyList.innerHTML = "";
  if(data.length === 0){
    historyList.innerHTML = `<p class="form-hint">${DB.isConnected()
      ? "Aún no hay mediciones guardadas. Captura tu primera medición arriba."
      : "Conecta tu base de datos en Configuración para ver y guardar mediciones."}</p>`;
    dialIMC.textContent = "--";
    setDial(dialProgress, 0, 58);
    setDial(dialProgressInner, 0, 44);
    renderWeightChart([]);
    renderBodySilhouette();
    return;
  }

  [...data].reverse().forEach(d=>{
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `<span>${escapeHTML(d.fecha)}</span><span>${escapeHTML(d.peso)} kg · IMC ${escapeHTML(d.imc)}</span><button type="button" class="history-delete-btn" data-id="${escapeHTML(d.id)}" title="Eliminar registro">✕</button>`;
    historyList.appendChild(row);
  });
  historyList.querySelectorAll(".history-delete-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarMedicion(btn.dataset.id));
  });

  const last = data[data.length-1];
  dialIMC.textContent = last.imc;

  const first = data[0];
  let pesoProgressPct = 0;
  if(data.length > 1){
    const totalRange = Math.abs(first.peso - pesoObjetivo(first.estatura));
    pesoProgressPct = totalRange > 0 ? (first.peso - last.peso)/totalRange : 0;
  }
  setDial(dialProgress, pesoProgressPct, 58);

  const primeraFecha = parseLocalISODate(first.fecha);
  const semanasConDatos = new Set(
    data.map(d => Math.floor((parseLocalISODate(d.fecha) - primeraFecha) / (7*24*3600*1000)))
  ).size;
  setDial(dialProgressInner, semanasConDatos/4, 44);

  renderWeightChart(data);
  renderBodySilhouette();
}

function renderWeightChart(data){
  const container = document.getElementById("weightChart");
  if(data.length < 2){
    container.innerHTML = `<p class="form-hint">Se necesitan al menos 2 mediciones para graficar tendencia.</p>`;
    return;
  }
  const w = 600, h = 140, pad = 20;
  const pesos = data.map(d=>d.peso);
  const min = Math.min(...pesos), max = Math.max(...pesos);
  const range = (max - min) || 1;

  const points = data.map((d,i)=>{
    const x = pad + (i/(data.length-1)) * (w - pad*2);
    const y = h - pad - ((d.peso - min)/range) * (h - pad*2);
    return `${x},${y}`;
  });

  const dots = points.map(p=>{
    const [x,y] = p.split(",");
    return `<circle cx="${x}" cy="${y}" r="4" fill="var(--clay)"></circle>`;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${"M " + points.join(" L ")}" fill="none" stroke="var(--sage-deep)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
}

/* ---------------- Silueta de referencia según IMC ---------------- */
const IMC_BODY_WIDTH = { "Bajo peso": 0.72, "Saludable": 0.9, "Sobrepeso": 1.15, "Obesidad": 1.4 };

function bodySilhouetteSVG(category){
  const w = IMC_BODY_WIDTH[category] || 1;
  const torsoRx = Math.round(15 * w);
  const legW = Math.round(6 * w);
  return `
    <svg viewBox="0 0 80 140" aria-hidden="true">
      <circle cx="40" cy="17" r="13" fill="var(--sand)"/>
      <ellipse cx="40" cy="66" rx="${torsoRx}" ry="40" fill="var(--sand)"/>
      <rect x="${40-legW}" y="102" width="${legW*2}" height="30" rx="7" fill="var(--sand)"/>
    </svg>`;
}

function renderBodySilhouette(){
  const container = document.getElementById("bodySilhouette");
  if(!container) return;
  if(STATE.mediciones.length === 0){
    container.innerHTML = `<span class="legend-silhouette-icon">${bodySilhouetteSVG("Saludable")}</span> Referencia: sin datos aún`;
    return;
  }
  const cat = imcCategoria(STATE.mediciones[STATE.mediciones.length-1].imc);
  container.innerHTML = `<span class="legend-silhouette-icon">${bodySilhouetteSVG(cat)}</span> Referencia: ${escapeHTML(cat)}`;
}

/* ---------------- Saludos ---------------- */
function renderGreetings(){
  const set = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
  set("greetPerfil", `Hola ${USER_NAME} 👋 — este es tu perfil y seguimiento de peso.`);
  set("greetAlimentacion", `Hola ${USER_NAME}, esta es tu dieta de la semana.`);
  set("greetRutinas", `Hola ${USER_NAME}, esta es tu rutina de entrenamiento.`);
  set("greetManejo", `Hola ${USER_NAME}, este es tu manejo de cortisol e hígado graso.`);
  set("greetConfiguracion", `Hola ${USER_NAME}, aquí administras el contenido de tu plan.`);
}

/* ---------------- Selector de mes/ciclo ---------------- */
function pickDefaultMonthKey(){
  const keys = Object.keys(PLANS).sort();
  const ym = toLocalISOMonth(new Date());
  return PLANS[ym] ? ym : keys[0];
}
let currentMonthKey = pickDefaultMonthKey();

function renderMonthSelector(){
  const select = document.getElementById("monthSelect");
  const keys = Object.keys(PLANS).sort();
  select.innerHTML = keys.map(k => `<option value="${escapeHTML(k)}" ${k===currentMonthKey?"selected":""}>${escapeHTML(PLANS[k].label)}</option>`).join("");
  select.addEventListener("change", ()=>{
    currentMonthKey = select.value;
    currentNutritionDay = 0;
    currentTrainingWeek = 0;
    renderDayTabsNutricion();
    renderMealPlan();
    renderWeekTabsRutina();
    renderTrainingPlan();
    updateTopbarWeek();
  });
}

/* ---------------- ALIMENTACIÓN ---------------- */
let currentNutritionDay = 0;

function renderDayTabsNutricion(){
  const wrap = document.getElementById("dayTabsNutricion");
  wrap.innerHTML = "";
  DAY_NAMES.forEach((name,i)=>{
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i===currentNutritionDay ? " tab-active" : "");
    btn.textContent = name.slice(0,3);
    btn.addEventListener("click", ()=>{
      currentNutritionDay = i;
      renderDayTabsNutricion();
      renderMealPlan();
    });
    wrap.appendChild(btn);
  });
}

const MEAL_TYPE_LABELS = { desayuno:"Desayuno", colacion1:"Colación (mañana)", comida:"Comida", colacion2:"Colación (tarde)", cena:"Cena" };
const MEAL_ORDER = [
  ["desayuno","Desayuno"],
  ["colacion1","Colación"],
  ["comida","Comida"],
  ["colacion2","Colación"],
  ["cena","Cena"]
];

function renderMealPlan(){
  const container = document.getElementById("mealPlanContainer");
  const day = PLANS[currentMonthKey].meals[currentNutritionDay];
  const registry = [];
  let html = "";

  MEAL_ORDER.forEach(([key,label])=>{
    const base = day[key];
    if(base){
      registry.push(base);
      html += mealCardHTML(label, base, false, null, registry.length-1);
    }
    STATE.recetas
      .filter(r => r.plan_clave===currentMonthKey && r.dia_indice===currentNutritionDay && r.tiempo_clave===key)
      .forEach(r=>{
        const receta = { name: r.nombre, detail: r.preparacion, kcal: r.kcal || "" };
        registry.push(receta);
        html += mealCardHTML(label, receta, true, r.id, registry.length-1);
      });
  });

  container.innerHTML = html;

  container.querySelectorAll(".meal-share-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const meal = registry[Number(btn.dataset.idx)];
      let text = `*${meal.name}*\n\n${meal.detail}`;
      if(meal.kcal) text += `\n\n${meal.kcal}`;
      shareOnWhatsApp(text);
    });
  });
  container.querySelectorAll(".meal-delete-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarReceta(btn.dataset.id));
  });
}

function mealCardHTML(label, meal, isCustom, id, idx){
  return `
    <div class="meal-card ${isCustom?"is-custom":""}">
      <div class="meal-card-head">
        <span class="meal-type">${escapeHTML(label)}${isCustom?'<span class="meal-type-tag">Personalizada</span>':''}</span>
        <span class="meal-kcal">${escapeHTML(meal.kcal||"")}</span>
      </div>
      <p class="meal-name">${escapeHTML(meal.name)}</p>
      <p class="meal-detail">${escapeHTML(meal.detail)}</p>
      <div class="meal-card-actions">
        ${isCustom?`<button type="button" class="custom-item-remove meal-delete-btn" data-id="${escapeHTML(id)}">Eliminar</button>`:""}
        <button type="button" class="share-btn meal-share-btn" data-idx="${idx}">${WHATSAPP_ICON_SVG}WhatsApp</button>
      </div>
    </div>`;
}

async function eliminarReceta(id){
  const hint = document.getElementById("mealFormHint");
  try{
    await DB.borrarReceta(id);
    STATE.recetas = STATE.recetas.filter(r=>r.id!==id);
    renderMealPlan();
    renderCustomMealsList();
    renderConnSummary();
  }catch(err){ if(hint) hint.textContent = "No se pudo eliminar: " + err.message; }
}

function renderCustomMealsList(){
  const container = document.getElementById("customMealsList");
  if(!container) return;
  if(STATE.recetas.length === 0){ container.innerHTML = ""; return; }
  container.innerHTML = `<p class="form-hint form-hint-static">Recetas agregadas (${STATE.recetas.length}):</p>` +
    STATE.recetas.map(r=>`
      <div class="custom-item-row">
        <span>${escapeHTML(PLANS[r.plan_clave] ? PLANS[r.plan_clave].label : r.plan_clave)} · ${escapeHTML(DAY_NAMES[r.dia_indice])} · ${escapeHTML(MEAL_TYPE_LABELS[r.tiempo_clave]||r.tiempo_clave)} — <strong>${escapeHTML(r.nombre)}</strong></span>
        <button type="button" class="custom-item-remove" data-id="${escapeHTML(r.id)}">Eliminar</button>
      </div>`).join("");
  container.querySelectorAll(".custom-item-remove").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarReceta(btn.dataset.id));
  });
}

function populateMealFormSelects(){
  const monthSel = document.getElementById("mfMonth");
  const daySel = document.getElementById("mfDay");
  if(!monthSel || !daySel) return;
  monthSel.innerHTML = Object.keys(PLANS).sort().map(k=>`<option value="${escapeHTML(k)}">${escapeHTML(PLANS[k].label)}</option>`).join("");
  monthSel.value = currentMonthKey;
  daySel.innerHTML = DAY_NAMES.map((n,i)=>`<option value="${i}">${escapeHTML(n)}</option>`).join("");
}

function setupMealForm(){
  wireConfigForm({
    formId: "mealForm",
    hintId: "mealFormHint",
    leerFormulario: ()=>{
      const nombre = document.getElementById("mfName").value.trim();
      const preparacion = document.getElementById("mfDetail").value.trim();
      if(!nombre || !preparacion) return { ok:false, error:"Completa al menos nombre y receta." };
      return { ok:true, item:{
        plan_clave: document.getElementById("mfMonth").value,
        dia_indice: Number(document.getElementById("mfDay").value),
        tiempo_clave: document.getElementById("mfType").value,
        nombre, preparacion,
        kcal: document.getElementById("mfKcal").value.trim()
      }};
    },
    guardar: async (item)=>{
      const fila = await DB.crearReceta(item);
      STATE.recetas.push(fila);
    },
    despues: ()=>{ renderMealPlan(); renderCustomMealsList(); populateMealFormSelects(); renderConnSummary(); }
  });
}

function renderPantry(){
  document.getElementById("pantryList").innerHTML = PANTRY.map(p=>`
    <div class="pantry-cat">
      <strong>${escapeHTML(p.cat)}</strong>
      <ul>${p.items.map(i=>`<li>${escapeHTML(i)}</li>`).join("")}</ul>
    </div>
  `).join("");
}

/* ---------------- RUTINAS ---------------- */
let currentTrainingWeek = 0;

function renderWeekTabsRutina(){
  const wrap = document.getElementById("weekTabsRutina");
  wrap.innerHTML = "";
  PLANS[currentMonthKey].training.forEach((w,i)=>{
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i===currentTrainingWeek ? " tab-active" : "");
    btn.textContent = `Semana ${i+1}`;
    btn.addEventListener("click", ()=>{
      currentTrainingWeek = i;
      renderWeekTabsRutina();
      renderTrainingPlan();
    });
    wrap.appendChild(btn);
  });
}

/* Estimador de tiempo a partir del texto libre en "meta" ("3x12", "4x2 min", "30 seg") */
function estimateExerciseMinutes(meta){
  if(!meta) return 5;
  const m = String(meta).toLowerCase();

  const minMatch = m.match(/(\d+)(?:-(\d+))?\s*min/);
  if(minMatch){
    const a = parseFloat(minMatch[1]);
    const b = minMatch[2] ? parseFloat(minMatch[2]) : a;
    const avgMin = (a+b)/2;
    const setsMatch = m.match(/^(\d+)\s*[x×]/);
    return setsMatch ? Math.round(parseFloat(setsMatch[1]) * avgMin) : Math.round(avgMin);
  }
  const segMatch = m.match(/(\d+)\s*seg/);
  if(segMatch){
    const sec = parseFloat(segMatch[1]);
    const setsMatch = m.match(/^(\d+)\s*[x×]/);
    const sets = setsMatch ? parseFloat(setsMatch[1]) : 1;
    return Math.max(1, Math.round((sets * (sec + 45))/60));
  }
  const setsRepsMatch = m.match(/(\d+)\s*[x×]\s*(\d+)/);
  if(setsRepsMatch){
    const sets = parseFloat(setsRepsMatch[1]);
    return Math.max(1, Math.round((sets*45 + Math.max(0, sets-1)*60)/60));
  }
  return 5;
}
function estimateDayMinutes(exercises){
  return (exercises||[]).reduce((sum,ex)=> sum + estimateExerciseMinutes(ex.meta), 0);
}

function actividadesDelDia(diaIndice){
  return STATE.actividades.filter(a =>
    a.plan_clave===currentMonthKey && a.semana===currentTrainingWeek && a.dia_indice===diaIndice);
}

function renderTrainingPlan(){
  const container = document.getElementById("trainingPlanContainer");
  const week = PLANS[currentMonthKey].training[currentTrainingWeek];
  const sesionesPropias = STATE.sesiones.filter(s => s.plan_clave===currentMonthKey && s.semana===currentTrainingWeek);
  const registry = [];
  let html = `<div class="callout">${escapeHTML(week.note)}</div>`;

  week.days.forEach(d=>{
    const item = { ...d, dia_indice: DAY_NAMES.indexOf(d.day) };
    registry.push(item);
    html += dayCardHTML(item, false, registry.length-1);
  });
  sesionesPropias.forEach(s=>{ registry.push(s); html += dayCardHTML(s, true, registry.length-1); });

  container.innerHTML = html;

  container.querySelectorAll(".training-share-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const d = registry[Number(btn.dataset.idx)];
      const allEx = (d.exercises||[]).concat(
        actividadesDelDia(d.dia_indice).map(a=>({ name:a.nombre, meta:a.meta }))
      );
      let text = `*${d.title}*\n${d.day} — ${d.tag}\n\n`;
      text += allEx.length ? allEx.map(ex=>`• ${ex.name} — ${ex.meta}`).join("\n") : "Descanso total.";
      shareOnWhatsApp(text);
    });
  });
  container.querySelectorAll(".training-delete-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarSesion(btn.dataset.id));
  });
  container.querySelectorAll(".add-exercise-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = document.getElementById(btn.dataset.target);
      if(target) target.hidden = !target.hidden;
    });
  });
  container.querySelectorAll(".add-ex-save").forEach(btn=>{
    btn.addEventListener("click", ()=> guardarActividadExtra(btn));
  });
  container.querySelectorAll(".exercise-extra-remove").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarActividad(btn.dataset.id));
  });
}

function dayCardHTML(d, isCustom, idx){
  const extras = actividadesDelDia(d.dia_indice).map(a=>({ id:a.id, name:a.nombre, meta:a.meta||"", extra:true }));
  const allEx = (d.exercises||[]).map(ex=>({ ...ex, extra:false })).concat(extras);
  const totalMin = estimateDayMinutes(allEx);
  const dayKey = `${currentMonthKey}_w${currentTrainingWeek}_${idx}`;

  return `
    <div class="day-card ${d.rest?"rest":""} ${isCustom?"is-custom":""}">
      <div class="day-card-head">
        <h3>${escapeHTML(d.day)} · ${escapeHTML(d.title)}${isCustom?' <span class="meal-type-tag">Personalizada</span>':''}</h3>
        <span class="day-tag">${escapeHTML(d.tag)}</span>
      </div>
      ${!d.rest && totalMin>0 ? `<div class="day-time-badge">⏱ ~${totalMin} min estimados en total</div>` : ""}
      ${allEx.length ? allEx.map(ex=>`
        <div class="exercise-row">
          <span class="exercise-name">${escapeHTML(ex.name)}</span>
          <span class="exercise-right">
            <span class="exercise-meta">${escapeHTML(ex.meta)}</span>
            ${ex.extra ? `<button type="button" class="exercise-extra-remove" data-id="${escapeHTML(ex.id)}" title="Quitar">×</button>` : ""}
          </span>
        </div>`).join("") : `<p class="meal-detail">Descanso total: prioriza sueño e hidratación.</p>`}

      <div class="day-card-add">
        <button type="button" class="add-exercise-btn" data-target="addEx-${escapeHTML(dayKey)}">+ Agregar actividad a este día</button>
        <div class="add-exercise-inline" id="addEx-${escapeHTML(dayKey)}" data-dia="${d.dia_indice}" hidden>
          <input type="text" class="add-ex-name" placeholder="Tipo de ejercicio">
          <input type="text" class="add-ex-meta" placeholder="Reps (3x12)">
          <button type="button" class="btn btn-primary btn-small add-ex-save">Agregar</button>
        </div>
      </div>

      <div class="day-card-share">
        ${isCustom?`<button type="button" class="custom-item-remove training-delete-btn" data-id="${escapeHTML(d.id)}">Eliminar sesión</button>`:""}
        <button type="button" class="share-btn training-share-btn" data-idx="${idx}">${WHATSAPP_ICON_SVG}WhatsApp</button>
      </div>
    </div>`;
}

async function guardarActividadExtra(btn){
  const wrap = btn.closest(".add-exercise-inline");
  const nameInput = wrap.querySelector(".add-ex-name");
  const metaInput = wrap.querySelector(".add-ex-meta");
  const nombre = nameInput.value.trim();
  if(!nombre){ nameInput.focus(); return; }
  if(!DB.isConnected()){ mostrarBannerConexion(); return; }

  btn.disabled = true;
  try{
    const fila = await DB.crearActividad({
      plan_clave: currentMonthKey,
      semana: currentTrainingWeek,
      dia_indice: Number(wrap.dataset.dia),
      nombre,
      meta: metaInput.value.trim()
    });
    STATE.actividades.push(fila);
    renderTrainingPlan();
    renderConnSummary();
  }catch(err){
    btn.disabled = false;
    alert("No se pudo agregar: " + err.message);
  }
}

async function eliminarActividad(id){
  try{
    await DB.borrarActividad(id);
    STATE.actividades = STATE.actividades.filter(a=>a.id!==id);
    renderTrainingPlan();
    renderConnSummary();
  }catch(err){ alert("No se pudo quitar: " + err.message); }
}

async function eliminarSesion(id){
  const hint = document.getElementById("trainingFormHint");
  try{
    await DB.borrarSesion(id);
    STATE.sesiones = STATE.sesiones.filter(s=>s.id!==id);
    renderTrainingPlan();
    renderCustomTrainingList();
    renderConnSummary();
  }catch(err){ if(hint) hint.textContent = "No se pudo eliminar: " + err.message; }
}

function renderCustomTrainingList(){
  const container = document.getElementById("customTrainingList");
  if(!container) return;
  if(STATE.sesiones.length === 0){ container.innerHTML = ""; return; }
  container.innerHTML = `<p class="form-hint form-hint-static">Entrenamientos agregados (${STATE.sesiones.length}):</p>` +
    STATE.sesiones.map(s=>`
      <div class="custom-item-row">
        <span>${escapeHTML(PLANS[s.plan_clave] ? PLANS[s.plan_clave].label : s.plan_clave)} · Semana ${s.semana+1} · ${escapeHTML(s.day)} — <strong>${escapeHTML(s.title)}</strong></span>
        <button type="button" class="custom-item-remove" data-id="${escapeHTML(s.id)}">Eliminar</button>
      </div>`).join("");
  container.querySelectorAll(".custom-item-remove").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarSesion(btn.dataset.id));
  });
}

function populateTrainingFormSelects(){
  const monthSel = document.getElementById("tfMonth");
  const daySel = document.getElementById("tfDay");
  if(!monthSel || !daySel) return;
  monthSel.innerHTML = Object.keys(PLANS).sort().map(k=>`<option value="${escapeHTML(k)}">${escapeHTML(PLANS[k].label)}</option>`).join("");
  monthSel.value = currentMonthKey;
  daySel.innerHTML = DAY_NAMES.map((n,i)=>`<option value="${i}">${escapeHTML(n)}</option>`).join("");
}

function addExerciseFormRow(name="", meta=""){
  const wrap = document.getElementById("exerciseFormList");
  if(!wrap) return;
  const row = document.createElement("div");
  row.className = "exercise-form-row";
  row.innerHTML = `
    <input type="text" class="ex-name" placeholder="Ejercicio (ej. Sentadilla goblet)" value="${escapeHTML(name)}">
    <input type="text" class="ex-meta" placeholder="3x12" value="${escapeHTML(meta)}">
    <button type="button" class="exercise-remove-btn" title="Quitar">×</button>`;
  row.querySelector(".exercise-remove-btn").addEventListener("click", ()=> row.remove());
  wrap.appendChild(row);
}

function setupTrainingForm(){
  const addBtn = document.getElementById("addExerciseRowBtn");
  if(addBtn) addBtn.addEventListener("click", ()=> addExerciseFormRow());

  wireConfigForm({
    formId: "trainingForm",
    hintId: "trainingFormHint",
    leerFormulario: ()=>{
      const titulo = document.getElementById("tfTitle").value.trim();
      const ejercicios = Array.from(document.querySelectorAll("#exerciseFormList .exercise-form-row")).map(row=>({
        nombre: row.querySelector(".ex-name").value.trim(),
        meta: row.querySelector(".ex-meta").value.trim()
      })).filter(ex=>ex.nombre);
      if(!titulo || ejercicios.length===0) return { ok:false, error:"Agrega un título y al menos un ejercicio con nombre." };
      return { ok:true, item:{
        plan_clave: document.getElementById("tfMonth").value,
        semana: Number(document.getElementById("tfWeek").value),
        dia_indice: Number(document.getElementById("tfDay").value),
        titulo,
        categoria: document.getElementById("tfTag").value,
        ejercicios
      }};
    },
    guardar: async (item)=>{
      const fila = await DB.crearSesion(item);
      STATE.sesiones.push(normalizarSesion(fila));
    },
    despues: ()=>{
      document.getElementById("exerciseFormList").innerHTML = "";
      addExerciseFormRow(); addExerciseFormRow();
      populateTrainingFormSelects();
      renderTrainingPlan();
      renderCustomTrainingList();
      renderConnSummary();
    }
  });
}

/* ---------------- Manejo de estrés ---------------- */
function renderStress(){
  const container = document.getElementById("stressTechniques");
  const all = STRESS_TECHNIQUES.concat(
    STATE.tecnicas.map(t=>({ tag:t.frecuencia, name:t.nombre, detail:t.detalle, custom:true }))
  );
  container.innerHTML = all.map(s=>`
    <div class="mini-card ${s.custom?"is-custom":""}">
      <span class="mini-tag">${escapeHTML(s.tag)}</span>
      <h4>${escapeHTML(s.name)}${s.custom?' <span class="meal-type-tag">Personalizada</span>':''}</h4>
      <p>${escapeHTML(s.detail)}</p>
    </div>
  `).join("");
}

async function eliminarTecnica(id){
  const hint = document.getElementById("stressFormHint");
  try{
    await DB.borrarTecnica(id);
    STATE.tecnicas = STATE.tecnicas.filter(t=>t.id!==id);
    renderStress();
    renderCustomStressList();
    renderConnSummary();
  }catch(err){ if(hint) hint.textContent = "No se pudo eliminar: " + err.message; }
}

function renderCustomStressList(){
  const container = document.getElementById("customStressList");
  if(!container) return;
  if(STATE.tecnicas.length === 0){ container.innerHTML = ""; return; }
  container.innerHTML = `<p class="form-hint form-hint-static">Sugerencias agregadas (${STATE.tecnicas.length}):</p>` +
    STATE.tecnicas.map(t=>`
      <div class="custom-item-row">
        <span>${escapeHTML(t.frecuencia)} — <strong>${escapeHTML(t.nombre)}</strong></span>
        <button type="button" class="custom-item-remove" data-id="${escapeHTML(t.id)}">Eliminar</button>
      </div>`).join("");
  container.querySelectorAll(".custom-item-remove").forEach(btn=>{
    btn.addEventListener("click", ()=> eliminarTecnica(btn.dataset.id));
  });
}

function setupStressForm(){
  wireConfigForm({
    formId: "stressForm",
    hintId: "stressFormHint",
    leerFormulario: ()=>{
      const nombre = document.getElementById("sfName").value.trim();
      const detalle = document.getElementById("sfDetail").value.trim();
      if(!nombre || !detalle) return { ok:false, error:"Completa al menos nombre y descripción." };
      return { ok:true, item:{ frecuencia: document.getElementById("sfTag").value, nombre, detalle } };
    },
    guardar: async (item)=>{
      const fila = await DB.crearTecnica(item);
      STATE.tecnicas.push(fila);
    },
    despues: ()=>{ renderStress(); renderCustomStressList(); renderConnSummary(); }
  });
}

/* ---------------- CHECKLIST DIARIO ---------------- */
function getChecklistStartDate(){
  if(STATE.checklistInicio) return STATE.checklistInicio;
  const d = new Date();
  const day = d.getDay(); // 0=domingo .. 6=sábado
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  const inicio = toLocalISODate(d);
  STATE.checklistInicio = inicio;
  if(DB.isConnected()){
    DB.guardarInicioChecklist(inicio).catch(e=> console.warn("No se guardó el inicio del checklist:", e.message));
  }
  return inicio;
}

let selectedChecklistDate = todayISO();

function renderPillarsChecklist(){
  const container = document.getElementById("pillarsChecklist");
  const dayData = STATE.checklist[selectedChecklistDate] || {};

  container.innerHTML = PILLARS.map(p=>{
    const checked = !!dayData[p.id];
    return `
      <div class="pillar-item ${checked ? "checked":""}" data-pillar="${escapeHTML(p.id)}" role="checkbox" aria-checked="${checked}" tabindex="0">
        <span class="pillar-icon"><svg viewBox="0 0 24 24">${p.icon}</svg></span>
        <span class="pillar-body">
          <span class="pillar-name">${escapeHTML(p.name)}</span>
          <p class="pillar-detail">${escapeHTML(p.detail)}</p>
        </span>
        <span class="pillar-check"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg></span>
      </div>`;
  }).join("");

  container.querySelectorAll(".pillar-item").forEach(el=>{
    const toggle = ()=> alternarPilar(el.dataset.pillar);
    el.addEventListener("click", toggle);
    el.addEventListener("keydown", (e)=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(); } });
  });

  updateChecklistDayHint();
}

async function alternarPilar(pilarId){
  const hint = document.getElementById("checklistDayHint");
  if(!DB.isConnected()){ mostrarBannerConexion(); return; }

  const dia = STATE.checklist[selectedChecklistDate] || {};
  const nuevoValor = !dia[pilarId];

  // Optimista: se pinta de inmediato y se revierte si la base lo rechaza.
  dia[pilarId] = nuevoValor;
  STATE.checklist[selectedChecklistDate] = dia;
  renderPillarsChecklist();
  renderChecklistCalendar();

  try{
    await DB.marcarPilar(selectedChecklistDate, pilarId, nuevoValor);
  }catch(err){
    dia[pilarId] = !nuevoValor;
    renderPillarsChecklist();
    renderChecklistCalendar();
    if(hint) hint.textContent = "No se guardó: " + err.message;
  }
}

function updateChecklistDayHint(){
  const hint = document.getElementById("checklistDayHint");
  const dayObj = STATE.checklist[selectedChecklistDate] || {};
  const done = PILLARS.filter(p=>dayObj[p.id]).length;
  const niceDate = parseLocalISODate(selectedChecklistDate).toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });
  hint.textContent = `${niceDate} — ${done} de ${PILLARS.length} pilares cumplidos.`;
}

function renderChecklistCalendar(){
  const container = document.getElementById("checklistCalendar");
  const start = parseLocalISODate(getChecklistStartDate());
  const today = todayISO();

  let html = "";
  for(let week=0; week<4; week++){
    html += `<div class="checklist-week"><div class="checklist-week-label">Semana ${week+1}</div><div class="checklist-days">`;
    for(let d=0; d<7; d++){
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + week*7 + d);
      const iso = toLocalISODate(cellDate);
      const dayObj = STATE.checklist[iso] || {};
      const done = PILLARS.filter(p=>dayObj[p.id]).length;
      const deg = Math.round((done / PILLARS.length)*360);
      html += `
        <button type="button" class="checklist-day ${iso===today?"is-today":""} ${iso===selectedChecklistDate?"is-selected":""}" data-date="${iso}" title="${iso} — ${done}/${PILLARS.length}">
          <span class="checklist-day-ring" style="background: conic-gradient(var(--sage-deep) ${deg}deg, var(--line) ${deg}deg)"></span>
          <span class="checklist-day-num">${cellDate.getDate()}</span>
        </button>`;
    }
    html += `</div></div>`;
  }
  container.innerHTML = html;

  container.querySelectorAll(".checklist-day").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      selectedChecklistDate = btn.dataset.date;
      document.getElementById("checklistDate").value = selectedChecklistDate;
      renderPillarsChecklist();
      renderChecklistCalendar();
    });
  });
}

function initChecklistDatePicker(){
  const input = document.getElementById("checklistDate");
  input.value = selectedChecklistDate;
  input.max = todayISO();
  input.addEventListener("change", ()=>{
    if(!input.value) return;
    selectedChecklistDate = input.value;
    renderPillarsChecklist();
    renderChecklistCalendar();
  });
}

function renderSupplements(){
  document.getElementById("supplementsList").innerHTML = SUPPLEMENTS.map(s=>`
    <div class="mini-card">
      <span class="mini-tag warn">Consultar con tu médico</span>
      <h4>${escapeHTML(s.name)}</h4><p>${escapeHTML(s.detail)}</p>
    </div>
  `).join("");
}
function renderSleep(){
  document.getElementById("sleepList").innerHTML = SLEEP_TIPS.map(s=>`
    <div class="mini-card"><h4>${escapeHTML(s.name)}</h4><p>${escapeHTML(s.detail)}</p></div>
  `).join("");
}

function updateTopbarWeek(){
  document.getElementById("topbarWeek").textContent = `Semana ${currentTrainingWeek+1} de 4`;
}

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */
const CONFIG_CATEGORY_TABS = [
  { key:"alimentacion", label:"Alimentación", panelId:"configPanelAlimentacion" },
  { key:"rutina",       label:"Rutinas",      panelId:"configPanelRutinas" },
  { key:"cortisol",     label:"Cortisol",     panelId:"configPanelCortisol" },
  { key:"conexion",     label:"Conexión",     panelId:"configPanelConexion" }
];
let currentConfigCategory = "alimentacion";

function renderConfigTabs(){
  const wrap = document.getElementById("configTabs");
  if(!wrap) return;
  wrap.innerHTML = CONFIG_CATEGORY_TABS.map(c=>
    `<button type="button" class="tab-btn ${c.key===currentConfigCategory?"tab-active":""}" data-cat="${c.key}">${c.label}</button>`
  ).join("");
  wrap.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      currentConfigCategory = btn.dataset.cat;
      renderConfigTabs();
      showActiveConfigPanel();
    });
  });
}

function showActiveConfigPanel(){
  CONFIG_CATEGORY_TABS.forEach(c=>{
    const panel = document.getElementById(c.panelId);
    if(panel) panel.hidden = (c.key !== currentConfigCategory);
  });
}

/* Motor compartido de los formularios de captura.
   opts = { formId, hintId, leerFormulario, guardar, despues } */
function wireConfigForm(opts){
  const form = document.getElementById(opts.formId);
  if(!form) return;
  const hint = document.getElementById(opts.hintId);
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!exigirConexion(hint)) return;

    const lectura = opts.leerFormulario();
    if(!lectura.ok){ hint.textContent = lectura.error; return; }

    if(submitBtn) submitBtn.disabled = true;
    hint.textContent = "Guardando…";
    try{
      await opts.guardar(lectura.item);
      hint.textContent = "Guardado ✓";
      form.reset();
      opts.despues();
    }catch(err){
      hint.textContent = "No se guardó: " + err.message;
    }finally{
      if(submitBtn) submitBtn.disabled = false;
    }
  });
}

function exigirConexion(hintEl){
  if(DB.isConnected()) return true;
  if(hintEl) hintEl.textContent = "Primero conecta tu base de datos en Configuración > Conexión.";
  mostrarBannerConexion();
  return false;
}

/* ---------------- Panel de conexión ---------------- */
function mostrarBannerConexion(texto){
  const wrap = document.getElementById("connBannerWrap");
  const banner = document.getElementById("connBanner");
  if(!wrap || !banner) return;
  banner.innerHTML = texto || '<strong>Sin conexión a la base.</strong> Tus datos viven en PostgreSQL. Ve a Configuración &gt; Conexión para iniciar sesión y cargarlos.';
  wrap.hidden = false;
}
function ocultarBannerConexion(){
  const wrap = document.getElementById("connBannerWrap");
  if(wrap) wrap.hidden = true;
}

function renderConnSummary(){
  const card = document.getElementById("connSessionCard");
  const resumen = document.getElementById("connSummary");
  const migrar = document.getElementById("connMigrateCard");
  if(!card || !resumen) return;

  const conectado = DB.isConnected();
  card.hidden = !conectado;
  if(migrar) migrar.hidden = !(conectado && DB.hayDatosLocales());
  if(!conectado) return;

  const usuario = DB.currentUser();
  const filas = [
    ["sesión iniciada como", usuario ? usuario.email : "—"],
    ["mediciones", STATE.mediciones.length],
    ["recetas propias", STATE.recetas.length],
    ["entrenamientos propios", STATE.sesiones.length],
    ["actividades extra", STATE.actividades.length],
    ["técnicas de estrés", STATE.tecnicas.length],
    ["días con checklist", Object.keys(STATE.checklist).length]
  ];
  resumen.innerHTML = filas.map(([etiqueta,valor])=>`
    <div class="data-summary-row">
      <span>${escapeHTML(etiqueta)}</span>
      <strong>${escapeHTML(valor)}</strong>
    </div>`).join("");
}

function setupConnectionPanel(){
  const form = document.getElementById("connForm");
  const hint = document.getElementById("connHint");
  const btn = document.getElementById("connSubmitBtn");

  const guardada = DB.getConfig();
  if(guardada){
    document.getElementById("connUrl").value = guardada.url;
    document.getElementById("connKey").value = guardada.anonKey;
  }
  const usuario = DB.currentUser();
  if(usuario && usuario.email) document.getElementById("connEmail").value = usuario.email;

  if(form){
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const url = document.getElementById("connUrl").value.trim();
      const key = document.getElementById("connKey").value.trim();
      const email = document.getElementById("connEmail").value.trim();
      const password = document.getElementById("connPassword").value;

      if(!url || !key || !email || !password){ hint.textContent = "Completa los cuatro campos."; return; }

      btn.disabled = true;
      hint.textContent = "Conectando…";
      try{
        DB.saveConfig(url, key);
        await DB.signIn(email, password);
        await DB.probar();
        document.getElementById("connPassword").value = "";
        hint.textContent = "Conectado ✓ Cargando tus datos…";
        await cargarDesdeLaBase();
        hint.textContent = "Conectado ✓";
      }catch(err){
        hint.textContent = "No se pudo conectar: " + err.message;
      }finally{
        btn.disabled = false;
      }
    });
  }

  const salirBtn = document.getElementById("connSignOutBtn");
  if(salirBtn){
    salirBtn.addEventListener("click", async ()=>{
      await DB.signOut();
      STATE.cargado = false;
      STATE.mediciones = []; STATE.recetas = []; STATE.sesiones = [];
      STATE.actividades = []; STATE.tecnicas = []; STATE.checklist = {};
      renderTodo();
      mostrarBannerConexion();
      if(hint) hint.textContent = "Sesión cerrada en este dispositivo.";
    });
  }

  const migrarBtn = document.getElementById("connMigrateBtn");
  if(migrarBtn){
    migrarBtn.addEventListener("click", async ()=>{
      const migrarHint = document.getElementById("connMigrateHint");
      if(!exigirConexion(migrarHint)) return;
      migrarBtn.disabled = true;
      migrarHint.textContent = "Subiendo…";
      try{
        await DB.sincronizarPlanes(PLANS);
        const r = await DB.migrarDesdeLocalStorage(DAY_NAMES, PLANS, currentMonthKey);
        await cargarDesdeLaBase();
        const partes = [
          `${r.mediciones} mediciones`, `${r.recetas} recetas`, `${r.sesiones} entrenamientos`,
          `${r.actividades} actividades`, `${r.tecnicas} técnicas`, `${r.checklist} marcas de checklist`
        ];
        migrarHint.textContent = `Subido: ${partes.join(", ")}.` +
          (r.errores.length ? ` No se pudieron subir ${r.errores.length}: ${r.errores.slice(0,3).join(" | ")}` : "");
      }catch(err){
        migrarHint.textContent = "Falló la subida: " + err.message;
      }finally{
        migrarBtn.disabled = false;
      }
    });
  }
}

/* ---------------- Pintado global y arranque ---------------- */
function renderTodo(){
  renderProfileSummary();
  renderMealPlan();
  renderCustomMealsList();
  renderTrainingPlan();
  renderCustomTrainingList();
  renderStress();
  renderCustomStressList();
  renderPillarsChecklist();
  renderChecklistCalendar();
  renderConnSummary();
}

async function cargarDesdeLaBase(){
  await DB.sincronizarPlanes(PLANS);   // asegura que los meses de data.js existan como filas
  const datos = await DB.cargarTodo();
  hidratarEstado(datos);
  ocultarBannerConexion();
  renderTodo();
}

async function init(){
  renderGreetings();
  renderMonthSelector();
  renderDayTabsNutricion();
  renderPantry();
  renderWeekTabsRutina();
  renderSupplements();
  renderSleep();

  populateMealFormSelects();
  populateTrainingFormSelects();
  addExerciseFormRow();
  addExerciseFormRow();
  setupMealForm();
  setupTrainingForm();
  setupStressForm();

  initChecklistDatePicker();
  renderConfigTabs();
  showActiveConfigPanel();
  setupConnectionPanel();
  updateTopbarWeek();

  renderTodo(); // pinta el plan base aunque todavía no haya datos

  if(DB.isConnected()){
    try{
      await cargarDesdeLaBase();
    }catch(err){
      mostrarBannerConexion(`<strong>No se pudieron cargar tus datos.</strong> ${escapeHTML(err.message)} Revisa Configuración &gt; Conexión.`);
    }
  }else{
    mostrarBannerConexion();
  }
}

document.addEventListener("DOMContentLoaded", init);
