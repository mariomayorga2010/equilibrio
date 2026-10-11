-- =========================================================
-- EQUILIBRIO — Esquema relacional (PostgreSQL / Supabase)
-- ---------------------------------------------------------
-- Cómo usarlo:
--   1) Crea un proyecto gratuito en supabase.com
--   2) Abre el SQL Editor
--   3) Pega este archivo completo y ejecútalo
--   4) Ve a Authentication > Users y crea tu usuario (email + contraseña)
--   5) En la app: Configuración > Conexión, pega la URL del proyecto
--      y la llave "anon public" (Project Settings > API), e inicia sesión.
--
-- Toda tabla con datos tuyos lleva user_id y RLS activo: aunque la llave
-- anon es pública (viaja en el navegador), nadie puede leer ni escribir
-- tus filas sin tu sesión iniciada.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. CATÁLOGOS (compartidos, solo lectura desde la app)
-- =========================================================

create table if not exists dias_semana (
  indice  smallint primary key check (indice between 0 and 6),
  nombre  text not null unique
);

insert into dias_semana (indice, nombre) values
  (0,'Lunes'), (1,'Martes'), (2,'Miércoles'), (3,'Jueves'),
  (4,'Viernes'), (5,'Sábado'), (6,'Domingo')
on conflict (indice) do nothing;


create table if not exists tiempos_comida (
  clave     text primary key,
  etiqueta  text not null,
  orden     smallint not null
);

insert into tiempos_comida (clave, etiqueta, orden) values
  ('desayuno',  'Desayuno',           1),
  ('colacion1', 'Colación (mañana)',  2),
  ('comida',    'Comida',             3),
  ('colacion2', 'Colación (tarde)',   4),
  ('cena',      'Cena',               5)
on conflict (clave) do nothing;


create table if not exists categorias_entrenamiento (
  clave text primary key
);

insert into categorias_entrenamiento (clave) values
  ('Funcional'), ('Boxeo'), ('LISS'), ('Recuperación'), ('Descanso')
on conflict (clave) do nothing;


create table if not exists frecuencias_estres (
  clave text primary key
);

insert into frecuencias_estres (clave) values
  ('Diario'), ('3×/semana'), ('Semanal')
on conflict (clave) do nothing;


-- Pilares del checklist diario (mismos ids que PILLARS en data.js)
create table if not exists pilares (
  clave    text primary key,
  nombre   text not null,
  detalle  text not null,
  orden    smallint not null
);

insert into pilares (clave, nombre, detalle, orden) values
  ('peso_gradual', 'Pérdida de peso gradual',
   '0.5–0.75 kg por semana. Perder peso más rápido se ha asociado a empeorar la inflamación hepática en hígado graso.', 1),
  ('sin_azucar', 'Sin azúcar / fructosa añadida hoy',
   'Refrescos, jugos, pan dulce: de los factores dietéticos más asociados a esteatosis hepática.', 2),
  ('horarios', 'Horarios de comida regulares',
   'Comer cada 3-4 h evita picos de cortisol por hipoglucemia y reduce atracones nocturnos.', 3),
  ('sueno', 'Dormí entre 7 y 9 horas',
   'La privación de sueño eleva cortisol y empeora la resistencia a la insulina en menos de una semana.', 4),
  ('movimiento', 'Movimiento diario fuera del entrenamiento',
   'Caminar después de comer (10-15 min) ayuda a controlar la glucosa postprandial.', 5)
on conflict (clave) do nothing;


-- =========================================================
-- 2. DATOS DEL USUARIO
-- =========================================================

-- Meses/ciclos del plan. La app los sincroniza sola desde PLANS (data.js).
create table if not exists planes (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clave     text not null,                       -- "2026-06"
  etiqueta  text not null,                       -- "Junio 2026"
  primary key (user_id, clave)
);


-- Preferencias sueltas (una fila por usuario)
create table if not exists preferencias (
  user_id           uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  checklist_inicio  date,
  actualizado_en    timestamptz not null default now()
);


-- Mediciones del perfil. El IMC se calcula en la base, no en el navegador:
-- así nunca queda desfasado respecto al peso y la estatura de la fila.
create table if not exists mediciones (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha        date not null default current_date,
  edad         smallint check (edad between 15 and 100),
  sexo         char(1) check (sexo in ('F','M')),
  estatura_cm  numeric(5,1) not null check (estatura_cm between 120 and 220),
  peso_kg      numeric(5,1) not null check (peso_kg between 30 and 300),
  cintura_cm   numeric(5,1) check (cintura_cm between 40 and 200),
  cadera_cm    numeric(5,1) check (cadera_cm between 40 and 200),
  imc          numeric(4,1) generated always as
                 (round(peso_kg / ((estatura_cm / 100) * (estatura_cm / 100)), 1)) stored,
  creado_en    timestamptz not null default now()
);

create index if not exists mediciones_user_fecha_idx on mediciones (user_id, fecha);


-- Recetas propias, colgadas de un mes + día + tiempo de comida
create table if not exists recetas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_clave    text not null,
  dia_indice    smallint not null references dias_semana(indice),
  tiempo_clave  text not null references tiempos_comida(clave),
  nombre        text not null check (length(trim(nombre)) > 0),
  preparacion   text not null check (length(trim(preparacion)) > 0),
  kcal          text,
  creado_en     timestamptz not null default now(),
  foreign key (user_id, plan_clave) references planes(user_id, clave) on delete cascade
);

create index if not exists recetas_ubicacion_idx on recetas (user_id, plan_clave, dia_indice, tiempo_clave);


-- Sesiones de entrenamiento propias
create table if not exists sesiones_entrenamiento (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_clave  text not null,
  semana      smallint not null check (semana between 0 and 3),
  dia_indice  smallint not null references dias_semana(indice),
  titulo      text not null check (length(trim(titulo)) > 0),
  categoria   text not null references categorias_entrenamiento(clave),
  creado_en   timestamptz not null default now(),
  foreign key (user_id, plan_clave) references planes(user_id, clave) on delete cascade
);

create index if not exists sesiones_ubicacion_idx on sesiones_entrenamiento (user_id, plan_clave, semana);


-- Ejercicios de cada sesión: tabla aparte en vez de un arreglo JSON.
-- Borrar la sesión borra sus ejercicios en cascada.
create table if not exists ejercicios_sesion (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sesion_id  uuid not null references sesiones_entrenamiento(id) on delete cascade,
  orden      smallint not null default 0,
  nombre     text not null check (length(trim(nombre)) > 0),
  meta       text
);

create index if not exists ejercicios_sesion_idx on ejercicios_sesion (sesion_id, orden);


-- Actividades sueltas agregadas a un día que ya existe en el plan base
create table if not exists actividades_extra (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_clave  text not null,
  semana      smallint not null check (semana between 0 and 3),
  dia_indice  smallint not null references dias_semana(indice),
  nombre      text not null check (length(trim(nombre)) > 0),
  meta        text,
  creado_en   timestamptz not null default now(),
  foreign key (user_id, plan_clave) references planes(user_id, clave) on delete cascade
);

create index if not exists actividades_extra_idx on actividades_extra (user_id, plan_clave, semana, dia_indice);


-- Técnicas de manejo de estrés propias
create table if not exists tecnicas_estres (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  frecuencia  text not null references frecuencias_estres(clave),
  nombre      text not null check (length(trim(nombre)) > 0),
  detalle     text not null check (length(trim(detalle)) > 0),
  creado_en   timestamptz not null default now()
);


-- Checklist diario: una fila por pilar cumplido en un día.
-- Destacharlo borra la fila, así que la tabla solo guarda lo que sí hiciste.
create table if not exists checklist_registros (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha        date not null,
  pilar_clave  text not null references pilares(clave),
  creado_en    timestamptz not null default now(),
  primary key (user_id, fecha, pilar_clave)
);

create index if not exists checklist_fecha_idx on checklist_registros (user_id, fecha);


-- =========================================================
-- 3. VISTA DE APOYO
-- =========================================================

-- Pilares cumplidos por día, para consultar constancia sin contar en el cliente.
create or replace view vista_adherencia_diaria as
select
  user_id,
  fecha,
  count(*)::int as pilares_cumplidos,
  (select count(*) from pilares)::int as pilares_totales
from checklist_registros
group by user_id, fecha;


-- =========================================================
-- 4. SEGURIDAD (Row Level Security)
-- =========================================================

alter table planes                 enable row level security;
alter table preferencias           enable row level security;
alter table mediciones             enable row level security;
alter table recetas                enable row level security;
alter table sesiones_entrenamiento enable row level security;
alter table ejercicios_sesion      enable row level security;
alter table actividades_extra      enable row level security;
alter table tecnicas_estres        enable row level security;
alter table checklist_registros    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'planes','preferencias','mediciones','recetas','sesiones_entrenamiento',
    'ejercicios_sesion','actividades_extra','tecnicas_estres','checklist_registros'
  ] loop
    execute format('drop policy if exists "solo_dueno" on %I', t);
    execute format(
      'create policy "solo_dueno" on %I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Catálogos: lectura para cualquier usuario autenticado, sin escritura.
alter table dias_semana             enable row level security;
alter table tiempos_comida          enable row level security;
alter table categorias_entrenamiento enable row level security;
alter table frecuencias_estres      enable row level security;
alter table pilares                 enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'dias_semana','tiempos_comida','categorias_entrenamiento','frecuencias_estres','pilares'
  ] loop
    execute format('drop policy if exists "lectura_autenticados" on %I', t);
    execute format('create policy "lectura_autenticados" on %I for select to authenticated using (true)', t);
  end loop;
end $$;
