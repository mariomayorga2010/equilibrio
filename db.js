/* =========================================================
   EQUILIBRIO — Capa de datos (Supabase / PostgreSQL)
   ---------------------------------------------------------
   El navegador no puede hablar directo con Postgres, así que
   todo pasa por la API REST del proyecto (PostgREST) usando
   fetch. Aquí vive TODO lo que sabe de la base: script.js solo
   llama funciones de DB y nunca arma una URL a mano.

   Lo único que se guarda en este navegador son las credenciales
   de conexión y la sesión; los datos ya viven en la base.
   ========================================================= */

const DB = (function(){

  const CONFIG_KEY  = "equilibrio_conexion_v1";
  const SESSION_KEY = "equilibrio_sesion_v1";

  let config  = null;   // { url, anonKey }
  let session = null;   // { access_token, refresh_token, expires_at, user_id, email }

  /* ---------------- Configuración y sesión ---------------- */

  function readJSON(key){
    try{ return JSON.parse(localStorage.getItem(key)); }catch(e){ return null; }
  }

  function loadStored(){
    config  = readJSON(CONFIG_KEY);
    session = readJSON(SESSION_KEY);
  }

  function saveConfig(url, anonKey){
    config = { url: String(url).trim().replace(/\/+$/,""), anonKey: String(anonKey).trim() };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return config;
  }

  function saveSession(payload){
    session = {
      access_token:  payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at:    Date.now() + ((payload.expires_in || 3600) * 1000) - 60000,
      user_id:       payload.user ? payload.user.id : (session && session.user_id),
      email:         payload.user ? payload.user.email : (session && session.email)
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession(){
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }

  function hasConfig(){ return !!(config && config.url && config.anonKey); }
  function isConnected(){ return hasConfig() && !!(session && session.access_token); }
  function currentUser(){ return session ? { id: session.user_id, email: session.email } : null; }
  function getConfig(){ return config ? { url: config.url, anonKey: config.anonKey } : null; }

  /* ---------------- Autenticación ---------------- */

  async function authRequest(grantType, body){
    if(!hasConfig()) throw new Error("Falta la URL del proyecto o la llave anon.");
    const res = await fetch(`${config.url}/auth/v1/token?grant_type=${grantType}`, {
      method: "POST",
      headers: { "Content-Type":"application/json", apikey: config.anonKey },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){
      throw new Error(data.error_description || data.msg || data.message || `Error de autenticación (${res.status}).`);
    }
    return data;
  }

  async function signIn(email, password){
    const data = await authRequest("password", { email, password });
    return saveSession(data);
  }

  async function refreshSession(){
    if(!session || !session.refresh_token) throw new Error("Tu sesión expiró. Vuelve a iniciarla.");
    const data = await authRequest("refresh_token", { refresh_token: session.refresh_token });
    return saveSession(data);
  }

  async function signOut(){
    if(isConnected()){
      try{
        await fetch(`${config.url}/auth/v1/logout`, {
          method:"POST",
          headers:{ apikey: config.anonKey, Authorization:`Bearer ${session.access_token}` }
        });
      }catch(e){ /* cerrar sesión local de todos modos */ }
    }
    clearSession();
  }

  /* ---------------- Llamadas REST ---------------- */

  async function ensureFreshToken(){
    if(!session) throw new Error("No has iniciado sesión.");
    if(session.expires_at && Date.now() >= session.expires_at) await refreshSession();
  }

  async function rest(path, { method="GET", body, prefer } = {}){
    if(!hasConfig()) throw new Error("No hay conexión configurada.");
    await ensureFreshToken();

    const build = () => {
      const headers = {
        apikey: config.anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      };
      if(prefer) headers.Prefer = prefer;
      return { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
    };

    let res = await fetch(`${config.url}/rest/v1/${path}`, build());
    if(res.status === 401){
      await refreshSession();
      res = await fetch(`${config.url}/rest/v1/${path}`, build());
    }

    if(!res.ok){
      const detalle = await res.text().catch(()=> "");
      throw new Error(describeError(res.status, detalle));
    }
    if(res.status === 204) return null;
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }

  // Traduce los errores más comunes de PostgREST a algo accionable.
  function describeError(status, detalle){
    let msg = detalle;
    try{
      const parsed = JSON.parse(detalle);
      msg = parsed.message || parsed.hint || detalle;
      if(parsed.code === "23503" && /planes/.test(detalle)){
        return "Ese mes todavía no existe en la base. Vuelve a entrar a la app para que se sincronice y reintenta.";
      }
      if(parsed.code === "23514") return "Algún valor está fuera del rango permitido por la base.";
      if(parsed.code === "42P01") return "Falta una tabla: ¿ya ejecutaste schema.sql en el SQL Editor?";
    }catch(e){ /* el detalle no era JSON */ }
    if(status === 401 || status === 403) return "La base rechazó la petición. Revisa que iniciaste sesión y que RLS está configurado.";
    return `Error ${status}: ${String(msg).slice(0,180)}`;
  }

  const REPRESENTACION = "return=representation";

  async function insertar(tabla, fila){
    const filas = await rest(tabla, { method:"POST", body: fila, prefer: REPRESENTACION });
    return Array.isArray(filas) ? filas[0] : filas;
  }

  async function borrar(tabla, filtro){
    await rest(`${tabla}?${filtro}`, { method:"DELETE" });
  }

  function uid(){
    if(!session || !session.user_id) throw new Error("No has iniciado sesión.");
    return session.user_id;
  }

  /* ---------------- Prueba de conexión ---------------- */

  async function probar(){
    const pilares = await rest("pilares?select=clave");
    return Array.isArray(pilares) ? pilares.length : 0;
  }

  /* ---------------- Meses/ciclos ---------------- */

  // Mantiene la tabla planes al día con lo que haya en PLANS (data.js).
  async function sincronizarPlanes(plans){
    const filas = Object.keys(plans).map(clave => ({
      user_id: uid(), clave, etiqueta: plans[clave].label
    }));
    if(filas.length === 0) return;
    await rest("planes?on_conflict=user_id,clave", {
      method:"POST", body: filas, prefer:"resolution=merge-duplicates,return=minimal"
    });
  }

  /* ---------------- Carga completa ---------------- */

  async function cargarTodo(){
    const [
      mediciones, recetas, sesiones, actividades, tecnicas, checklist, preferencias
    ] = await Promise.all([
      rest("mediciones?select=*&order=fecha.asc,creado_en.asc"),
      rest("recetas?select=*&order=creado_en.asc"),
      rest("sesiones_entrenamiento?select=*,ejercicios:ejercicios_sesion(id,nombre,meta,orden)&order=creado_en.asc&ejercicios.order=orden.asc"),
      rest("actividades_extra?select=*&order=creado_en.asc"),
      rest("tecnicas_estres?select=*&order=creado_en.asc"),
      rest("checklist_registros?select=fecha,pilar_clave"),
      rest("preferencias?select=*")
    ]);
    return {
      mediciones:   mediciones   || [],
      recetas:      recetas      || [],
      sesiones:     sesiones     || [],
      actividades:  actividades  || [],
      tecnicas:     tecnicas     || [],
      checklist:    checklist    || [],
      preferencias: (preferencias && preferencias[0]) || null
    };
  }

  /* ---------------- Mediciones ---------------- */

  function crearMedicion(m){
    return insertar("mediciones", {
      user_id: uid(),
      fecha: m.fecha,
      edad: m.edad,
      sexo: m.sexo,
      estatura_cm: m.estatura,
      peso_kg: m.peso,
      cintura_cm: m.cintura,
      cadera_cm: m.cadera
    });
  }
  function borrarMedicion(id){ return borrar("mediciones", `id=eq.${id}`); }

  /* ---------------- Recetas ---------------- */

  function crearReceta(r){
    return insertar("recetas", {
      user_id: uid(),
      plan_clave: r.plan_clave,
      dia_indice: r.dia_indice,
      tiempo_clave: r.tiempo_clave,
      nombre: r.nombre,
      preparacion: r.preparacion,
      kcal: r.kcal || null
    });
  }
  function borrarReceta(id){ return borrar("recetas", `id=eq.${id}`); }

  /* ---------------- Sesiones de entrenamiento ---------------- */

  async function crearSesion(s){
    const sesion = await insertar("sesiones_entrenamiento", {
      user_id: uid(),
      plan_clave: s.plan_clave,
      semana: s.semana,
      dia_indice: s.dia_indice,
      titulo: s.titulo,
      categoria: s.categoria
    });
    const ejercicios = (s.ejercicios || []).map((ex,i)=>({
      user_id: uid(), sesion_id: sesion.id, orden: i, nombre: ex.nombre, meta: ex.meta || null
    }));
    sesion.ejercicios = ejercicios.length
      ? await rest("ejercicios_sesion", { method:"POST", body: ejercicios, prefer: REPRESENTACION })
      : [];
    return sesion;
  }
  function borrarSesion(id){ return borrar("sesiones_entrenamiento", `id=eq.${id}`); }

  /* ---------------- Actividades extra ---------------- */

  function crearActividad(a){
    return insertar("actividades_extra", {
      user_id: uid(),
      plan_clave: a.plan_clave,
      semana: a.semana,
      dia_indice: a.dia_indice,
      nombre: a.nombre,
      meta: a.meta || null
    });
  }
  function borrarActividad(id){ return borrar("actividades_extra", `id=eq.${id}`); }

  /* ---------------- Técnicas de estrés ---------------- */

  function crearTecnica(t){
    return insertar("tecnicas_estres", {
      user_id: uid(), frecuencia: t.frecuencia, nombre: t.nombre, detalle: t.detalle
    });
  }
  function borrarTecnica(id){ return borrar("tecnicas_estres", `id=eq.${id}`); }

  /* ---------------- Checklist ---------------- */

  async function marcarPilar(fecha, pilarClave, cumplido){
    if(cumplido){
      await rest("checklist_registros?on_conflict=user_id,fecha,pilar_clave", {
        method:"POST",
        body: { user_id: uid(), fecha, pilar_clave: pilarClave },
        prefer: "resolution=merge-duplicates,return=minimal"
      });
    }else{
      await borrar("checklist_registros", `fecha=eq.${fecha}&pilar_clave=eq.${pilarClave}`);
    }
  }

  async function guardarInicioChecklist(fecha){
    await rest("preferencias?on_conflict=user_id", {
      method:"POST",
      body: { user_id: uid(), checklist_inicio: fecha, actualizado_en: new Date().toISOString() },
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }

  /* ---------------- Migración desde localStorage ----------------
     Sube de una sola vez lo que quedó guardado en este navegador
     por la versión anterior de la app. No borra nada local: si algo
     falla, tus datos siguen ahí. */

  const CLAVES_VIEJAS = {
    mediciones:  "equilibrio_mediciones_v1",
    recetas:     "equilibrio_custom_meals_v1",
    sesiones:    "equilibrio_custom_training_v1",
    actividades: "equilibrio_extra_exercises_v1",
    tecnicas:    "equilibrio_custom_stress_v1",
    checklist:   "equilibrio_checklist_v1",
    inicio:      "equilibrio_checklist_start_v1"
  };

  function hayDatosLocales(){
    return Object.values(CLAVES_VIEJAS).some(k => {
      const raw = localStorage.getItem(k);
      if(!raw) return false;
      try{
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v.length > 0 : (v && typeof v === "object" ? Object.keys(v).length > 0 : true);
      }catch(e){ return true; }
    });
  }

  function leerViejo(clave, porDefecto){
    try{ return JSON.parse(localStorage.getItem(CLAVES_VIEJAS[clave])) || porDefecto; }
    catch(e){ return porDefecto; }
  }

  function indiceDeDia(valor, dayNames){
    if(typeof valor === "number") return valor;
    const i = dayNames.findIndex(d => d.toLowerCase() === String(valor).toLowerCase());
    return i === -1 ? 0 : i;
  }

  // dayNames y planesValidos vienen de data.js; la capa de datos no los inventa.
  async function migrarDesdeLocalStorage(dayNames, planesValidos, mesPorDefecto){
    const resumen = { mediciones:0, recetas:0, sesiones:0, actividades:0, tecnicas:0, checklist:0, errores:[] };
    const mesSeguro = clave => (clave && planesValidos[clave]) ? clave : mesPorDefecto;

    const intentar = async (etiqueta, fn) => {
      try{ await fn(); return true; }
      catch(e){ resumen.errores.push(`${etiqueta}: ${e.message}`); return false; }
    };

    for(const m of leerViejo("mediciones", [])){
      if(await intentar(`medición ${m.fecha||""}`, ()=> crearMedicion({
        fecha: m.fecha, edad: m.edad, sexo: m.sexo,
        estatura: m.estatura, peso: m.peso, cintura: m.cintura, cadera: m.cadera
      }))) resumen.mediciones++;
    }

    for(const r of leerViejo("recetas", [])){
      if(await intentar(`receta ${r.name||""}`, ()=> crearReceta({
        plan_clave: mesSeguro(r.month),
        dia_indice: indiceDeDia(r.day, dayNames),
        tiempo_clave: r.type,
        nombre: r.name, preparacion: r.detail, kcal: r.kcal
      }))) resumen.recetas++;
    }

    for(const s of leerViejo("sesiones", [])){
      if(await intentar(`sesión ${s.title||""}`, ()=> crearSesion({
        plan_clave: mesSeguro(s.month),
        semana: typeof s.week === "number" ? s.week : 0,
        dia_indice: indiceDeDia(s.day, dayNames),
        titulo: s.title, categoria: s.tag || "Funcional",
        ejercicios: (s.exercises||[]).map(ex=>({ nombre: ex.name, meta: ex.meta }))
      }))) resumen.sesiones++;
    }

    for(const a of leerViejo("actividades", [])){
      if(await intentar(`actividad ${a.name||""}`, ()=> crearActividad({
        plan_clave: mesSeguro(a.month),
        semana: typeof a.week === "number" ? a.week : 0,
        dia_indice: indiceDeDia(a.day, dayNames),
        nombre: a.name, meta: a.meta
      }))) resumen.actividades++;
    }

    for(const t of leerViejo("tecnicas", [])){
      if(await intentar(`técnica ${t.name||""}`, ()=> crearTecnica({
        frecuencia: t.tag || "Diario", nombre: t.name, detalle: t.detail
      }))) resumen.tecnicas++;
    }

    const checklist = leerViejo("checklist", {});
    const filasChecklist = [];
    Object.keys(checklist).forEach(fecha=>{
      const dia = checklist[fecha] || {};
      Object.keys(dia).forEach(pilar=>{ if(dia[pilar]) filasChecklist.push({ user_id: uid(), fecha, pilar_clave: pilar }); });
    });
    if(filasChecklist.length){
      if(await intentar("checklist", ()=> rest("checklist_registros?on_conflict=user_id,fecha,pilar_clave", {
        method:"POST", body: filasChecklist, prefer:"resolution=merge-duplicates,return=minimal"
      }))) resumen.checklist = filasChecklist.length;
    }

    const inicio = localStorage.getItem(CLAVES_VIEJAS.inicio);
    if(inicio) await intentar("inicio de checklist", ()=> guardarInicioChecklist(inicio));

    return resumen;
  }

  loadStored();

  return {
    // conexión
    saveConfig, getConfig, hasConfig, isConnected, currentUser,
    signIn, signOut, probar,
    // datos
    sincronizarPlanes, cargarTodo,
    crearMedicion, borrarMedicion,
    crearReceta, borrarReceta,
    crearSesion, borrarSesion,
    crearActividad, borrarActividad,
    crearTecnica, borrarTecnica,
    marcarPilar, guardarInicioChecklist,
    // migración
    hayDatosLocales, migrarDesdeLocalStorage
  };
})();
