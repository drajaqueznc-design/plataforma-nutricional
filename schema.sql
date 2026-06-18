-- ============================================================
-- PLATAFORMA INTEGRAL DE NUTRICIÓN CLÍNICA
-- Dra. Anayanet Jáquez
-- Schema SQLite v1.0
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- TABLA MAESTRA: PACIENTES
-- ============================================================
CREATE TABLE pacientes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Identificación
    nombre              TEXT NOT NULL,
    apellidos           TEXT NOT NULL,
    cedula              TEXT UNIQUE,
    fecha_nacimiento    DATE,
    sexo                TEXT CHECK(sexo IN ('F','M')),
    telefono            TEXT,
    email               TEXT,
    ocupacion           TEXT,
    -- Institución de origen
    institucion         TEXT CHECK(institucion IN ('UM','MAT','PRIVADA')) NOT NULL,
    -- Tipo de consulta
    tipo_consulta       TEXT CHECK(tipo_consulta IN ('AMBULATORIA','POST_EGRESO')) DEFAULT 'AMBULATORIA',
    -- Control
    activo              INTEGER DEFAULT 1,
    fecha_registro      DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas_generales     TEXT
);

-- ============================================================
-- ANTECEDENTES (una fila por paciente, se actualiza)
-- ============================================================
CREATE TABLE antecedentes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    -- Patológicos
    patologias          TEXT,   -- texto libre + JSON de lista
    medicamentos        TEXT,
    alergias            TEXT,
    intolerancias       TEXT,
    -- Familiares
    dm2_familiar        INTEGER DEFAULT 0,
    evc_familiar        INTEGER DEFAULT 0,
    obesidad_familiar   INTEGER DEFAULT 0,
    cancer_familiar     INTEGER DEFAULT 0,
    familiar_detalle    TEXT,
    -- Hábitos
    tabaquismo          TEXT CHECK(tabaquismo IN ('no','ex','activo')) DEFAULT 'no',
    tabaquismo_años     INTEGER,
    alcohol             TEXT CHECK(alcohol IN ('no','ocasional','regular','dependencia')) DEFAULT 'no',
    actividad_fisica    TEXT CHECK(actividad_fisica IN ('sedentario','leve','moderado','intenso')) DEFAULT 'sedentario',
    actividad_tipo      TEXT,
    actividad_frecuencia TEXT,
    horas_sueno         REAL,
    calidad_sueno       TEXT CHECK(calidad_sueno IN ('buena','regular','mala')),
    -- Quirúrgicos
    cirugias_previas    TEXT,
    -- GI
    cirugia_bariatrica  INTEGER DEFAULT 0,
    tipo_bariatrica     TEXT,
    fecha_bariatrica    DATE,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- POST EGRESO (complementa si tipo_consulta = POST_EGRESO)
-- ============================================================
CREATE TABLE post_egreso (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    institucion_egreso  TEXT,
    fecha_ingreso       DATE,
    fecha_egreso        DATE,
    dias_hospitalizacion INTEGER,
    diagnostico_egreso  TEXT,
    estuvo_uci          INTEGER DEFAULT 0,
    dias_uci            INTEGER,
    soporte_nutricional TEXT CHECK(soporte_nutricional IN ('ninguno','enteral','parenteral','mixto','oral_supervisado')),
    complicaciones_nutricionales TEXT,
    -- Post UCI
    sindrome_post_uci   INTEGER DEFAULT 0,
    debilidad_uci       INTEGER DEFAULT 0,
    disfagia            INTEGER DEFAULT 0,
    notas               TEXT,
    fecha_registro      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VISITAS (cada consulta genera una visita)
-- ============================================================
CREATE TABLE visitas (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    institucion         TEXT CHECK(institucion IN ('UM','MAT','PRIVADA')) NOT NULL,
    numero_visita       INTEGER,  -- calculado automático
    motivo_consulta     TEXT,
    diagnosticos        TEXT,     -- JSON array de CIE-10
    plan_general        TEXT,
    proxima_cita        DATE,
    -- Módulos activos en esta visita
    mod_obesidad        INTEGER DEFAULT 0,
    mod_farmacoterapia  INTEGER DEFAULT 0,
    mod_salud_mental    INTEGER DEFAULT 0,
    mod_sibo            INTEGER DEFAULT 0,
    mod_eii             INTEGER DEFAULT 0,
    notas_clinicas      TEXT,
    fecha_registro      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- COMPOSICIÓN CORPORAL (por visita)
-- ============================================================
CREATE TABLE composicion_corporal (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    -- Antropometría
    peso                REAL,   -- kg
    talla               REAL,   -- cm
    imc                 REAL,   -- calculado
    clasificacion_imc   TEXT,   -- calculado
    -- Clasificación obesidad Lancet 2025
    obesidad_prec       INTEGER DEFAULT 0,  -- preclínica
    obesidad_clinica    INTEGER DEFAULT 0,  -- clínica
    estadio_obesidad    TEXT,
    -- Circunferencias
    cintura             REAL,   -- cm
    cadera              REAL,   -- cm
    pantorrilla         REAL,   -- cm
    -- Índices calculados
    cintura_talla       REAL,   -- calculado
    cintura_cadera      REAL,   -- calculado
    -- Bioimpedanciometría
    equipo              TEXT CHECK(equipo IN ('InBody120','Tanita','otro')),
    pct_grasa           REAL,   -- %
    kg_grasa            REAL,
    kg_masa_magra       REAL,
    kg_masa_muscular    REAL,   -- músculo esquelético
    agua_corporal       REAL,   -- litros
    masa_osea           REAL,   -- kg
    edad_metabolica     INTEGER,
    tmb_equipo          REAL,   -- kcal, del equipo
    -- GET calculado
    factor_actividad    REAL,
    get_calculado       REAL,   -- calculado
    proteina_objetivo   REAL,   -- calculado g/día
    -- Funcionalidad
    handgrip_der_1      REAL,   -- kg
    handgrip_der_2      REAL,
    handgrip_der_3      REAL,
    handgrip_der_mejor  REAL,   -- calculado: mejor de 3
    handgrip_izq_1      REAL,
    handgrip_izq_2      REAL,
    handgrip_izq_3      REAL,
    handgrip_izq_mejor  REAL,   -- calculado
    handgrip_interpretacion TEXT, -- normal/bajo (EWGSOP2)
    sit_to_stand_reps   INTEGER, -- número de repeticiones
    sit_to_stand_interp TEXT,    -- normal/límite/bajo (EWGSOP2)
    -- SARC-F
    sarcf_carga         INTEGER CHECK(sarcf_carga BETWEEN 0 AND 2),
    sarcf_asistencia    INTEGER CHECK(sarcf_asistencia BETWEEN 0 AND 2),
    sarcf_levantarse    INTEGER CHECK(sarcf_levantarse BETWEEN 0 AND 2),
    sarcf_escaleras     INTEGER CHECK(sarcf_escaleras BETWEEN 0 AND 2),
    sarcf_caidas        INTEGER CHECK(sarcf_caidas BETWEEN 0 AND 2),
    sarcf_total         INTEGER, -- calculado
    sarcf_interpretacion TEXT,
    notas               TEXT
);

-- ============================================================
-- ANALÍTICAS (por visita)
-- ============================================================
CREATE TABLE analiticas (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    fecha_muestra       DATE,   -- fecha real de la analítica
    -- Glucometabolismo
    glucemia_ayunas     REAL,   -- mg/dL
    insulina_ayunas     REAL,   -- μUI/mL
    homa_ir             REAL,   -- calculado
    homa_interpretacion TEXT,   -- calculado
    hba1c               REAL,   -- %
    glucemia_2h         REAL,   -- mg/dL post carga
    -- Perfil lipídico
    colesterol_total    REAL,
    ldl                 REAL,
    hdl                 REAL,
    trigliceridos       REAL,
    no_hdl              REAL,   -- calculado
    indice_aterogenico  REAL,   -- calculado CT/HDL
    apob                REAL,   -- mg/dL
    -- Función renal
    creatinina          REAL,
    urea                REAL,
    acido_urico         REAL,
    egfr                REAL,   -- calculado CKD-EPI
    egfr_estadio        TEXT,   -- G1-G5 calculado
    microalbuminuria    REAL,   -- mg/g
    -- Función hepática
    alt                 REAL,
    ast                 REAL,
    ggt                 REAL,
    fosfatasa_alcalina  REAL,
    bilirrubina_total   REAL,
    -- Tiroides
    tsh                 REAL,
    t4_libre            REAL,
    -- Inflamación / micronutrientes
    pcr_us              REAL,   -- mg/L ultrasensible
    ferritina           REAL,
    hierro_serico       REAL,
    sat_transferrina    REAL,   -- %
    vitamina_d          REAL,   -- ng/mL
    vitamina_b12        REAL,   -- pg/mL
    folato              REAL,   -- ng/mL
    magnesio            REAL,   -- mg/dL
    zinc                REAL,   -- μg/dL
    -- Hemograma
    hemoglobina         REAL,
    hematocrito         REAL,
    leucocitos          REAL,
    linfocitos          REAL,
    notas               TEXT
);

-- ============================================================
-- MÓDULO OBESIDAD (por visita)
-- ============================================================
CREATE TABLE obesidad (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    -- Clasificación
    clasificacion_imc   TEXT,
    obesidad_prec_clinica TEXT CHECK(obesidad_prec_clinica IN ('preclínica','clínica','sin obesidad')),
    estadio             TEXT,
    -- OBSCORE
    obscore_pct         REAL,
    obscore_nivel       TEXT CHECK(obscore_nivel IN ('bajo','moderado','alto')),
    obscore_fecha       DATE,
    -- Riesgo cardiometabólico
    riesgo_cardio       TEXT CHECK(riesgo_cardio IN ('bajo','moderado','alto','muy_alto')),
    framingham_score    REAL,
    -- Complicaciones relacionadas con obesidad
    comp_dm2            INTEGER DEFAULT 0,
    comp_hta            INTEGER DEFAULT 0,
    comp_dislipidemia   INTEGER DEFAULT 0,
    comp_higado_graso   INTEGER DEFAULT 0,
    comp_saos           INTEGER DEFAULT 0,
    comp_artrosis       INTEGER DEFAULT 0,
    comp_depresion      INTEGER DEFAULT 0,
    comp_otras          TEXT,
    notas               TEXT
);

-- ============================================================
-- MÓDULO FARMACOTERAPIA (por visita)
-- ============================================================
CREATE TABLE farmacoterapia (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    -- Fármacos sugeridos / prescritos
    farmaco             TEXT NOT NULL,
    dosis               TEXT,
    frecuencia          TEXT,
    via                 TEXT,
    generico            INTEGER DEFAULT 1,
    marca_comercial     TEXT,
    -- Semáforo
    semaforo            TEXT CHECK(semaforo IN ('verde','amarillo','rojo')),
    contraindicacion    TEXT,
    override_medico     INTEGER DEFAULT 0,
    override_motivo     TEXT,
    -- Estado
    estado              TEXT CHECK(estado IN ('sugerido','prescrito','suspendido','contraindicado')),
    fecha_inicio        DATE,
    fecha_suspension    DATE,
    notas               TEXT
);

-- ============================================================
-- MÓDULO SALUD MENTAL (por visita)
-- ============================================================
CREATE TABLE salud_mental (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    -- PHQ-9 (9 ítems, 0-3 cada uno)
    phq9_1              INTEGER CHECK(phq9_1 BETWEEN 0 AND 3),
    phq9_2              INTEGER CHECK(phq9_2 BETWEEN 0 AND 3),
    phq9_3              INTEGER CHECK(phq9_3 BETWEEN 0 AND 3),
    phq9_4              INTEGER CHECK(phq9_4 BETWEEN 0 AND 3),
    phq9_5              INTEGER CHECK(phq9_5 BETWEEN 0 AND 3),
    phq9_6              INTEGER CHECK(phq9_6 BETWEEN 0 AND 3),
    phq9_7              INTEGER CHECK(phq9_7 BETWEEN 0 AND 3),
    phq9_8              INTEGER CHECK(phq9_8 BETWEEN 0 AND 3),
    phq9_9              INTEGER CHECK(phq9_9 BETWEEN 0 AND 3),
    phq9_total          INTEGER,  -- calculado
    phq9_severidad      TEXT,     -- calculado
    -- GAD-7 (7 ítems, 0-3 cada uno)
    gad7_1              INTEGER CHECK(gad7_1 BETWEEN 0 AND 3),
    gad7_2              INTEGER CHECK(gad7_2 BETWEEN 0 AND 3),
    gad7_3              INTEGER CHECK(gad7_3 BETWEEN 0 AND 3),
    gad7_4              INTEGER CHECK(gad7_4 BETWEEN 0 AND 3),
    gad7_5              INTEGER CHECK(gad7_5 BETWEEN 0 AND 3),
    gad7_6              INTEGER CHECK(gad7_6 BETWEEN 0 AND 3),
    gad7_7              INTEGER CHECK(gad7_7 BETWEEN 0 AND 3),
    gad7_total          INTEGER,  -- calculado
    gad7_severidad      TEXT,     -- calculado
    -- Conducta alimentaria
    comer_emocional     INTEGER CHECK(comer_emocional BETWEEN 0 AND 10),
    atracones_frecuencia TEXT CHECK(atracones_frecuencia IN ('nunca','<1/sem','1/sem','>1/sem','diario')),
    craving_tipo        TEXT,
    craving_intensidad  INTEGER CHECK(craving_intensidad BETWEEN 0 AND 10),
    -- Sueño
    sueno_horas         REAL,
    sueno_calidad       INTEGER CHECK(sueno_calidad BETWEEN 0 AND 10),
    sueno_latencia      INTEGER,  -- minutos para dormirse
    sueno_despertares   INTEGER,
    -- Derivación
    derivacion_psicologia  INTEGER DEFAULT 0,
    derivacion_psiquiatria INTEGER DEFAULT 0,
    derivacion_motivo      TEXT,
    notas               TEXT
);

-- ============================================================
-- MÓDULO SIBO / IMO (por visita)
-- ============================================================
CREATE TABLE sibo_imo (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    -- Factores de riesgo
    ipt_previo          INTEGER DEFAULT 0,
    antibioticos_recientes INTEGER DEFAULT 0,
    ibs_diagnostico     INTEGER DEFAULT 0,
    hipotiroidismo      INTEGER DEFAULT 0,
    diabetes            INTEGER DEFAULT 0,
    cirugia_gi          INTEGER DEFAULT 0,
    -- Síntomas (0-10)
    distension          INTEGER CHECK(distension BETWEEN 0 AND 10),
    dolor_abdominal     INTEGER CHECK(dolor_abdominal BETWEEN 0 AND 10),
    flatulencia         INTEGER CHECK(flatulencia BETWEEN 0 AND 10),
    diarrea             INTEGER CHECK(diarrea BETWEEN 0 AND 10),
    estrenimiento       INTEGER CHECK(estrenimiento BETWEEN 0 AND 10),
    reflujo             INTEGER CHECK(reflujo BETWEEN 0 AND 10),
    fatiga              INTEGER CHECK(fatiga BETWEEN 0 AND 10),
    score_total         INTEGER,  -- calculado
    -- Prueba respiratoria
    prueba_respiratoria TEXT CHECK(prueba_respiratoria IN ('no_realizada','lactulose','glucosa','fructosa')),
    resultado_prueba    TEXT CHECK(resultado_prueba IN ('negativo','SIBO_H2','IMO_CH4','SIBO_H2S','mixto')),
    fecha_prueba        DATE,
    -- Tratamiento
    tratamiento         TEXT,
    dieta_indicada      TEXT CHECK(dieta_indicada IN ('ninguna','low_fodmap','especifica')),
    notas               TEXT
);

-- ============================================================
-- MÓDULO EII (por visita)
-- ============================================================
CREATE TABLE eii (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    -- Diagnóstico
    tipo_eii            TEXT CHECK(tipo_eii IN ('crohn','colitis_ulcerosa','indeterminada')),
    fecha_diagnostico   DATE,
    localizacion        TEXT,
    -- Actividad clínica
    actividad           TEXT CHECK(actividad IN ('remision','leve','moderada','grave')),
    -- PG-SGA (Scored Patient-Generated Subjective Global Assessment)
    pgsa_perdida_peso   INTEGER CHECK(pgsa_perdida_peso BETWEEN 0 AND 4),
    pgsa_ingesta        INTEGER CHECK(pgsa_ingesta BETWEEN 0 AND 3),
    pgsa_sintomas       INTEGER CHECK(pgsa_sintomas BETWEEN 0 AND 3),
    pgsa_actividad      INTEGER CHECK(pgsa_actividad BETWEEN 0 AND 3),
    pgsa_total          INTEGER,  -- calculado
    pgsa_categoria      TEXT,     -- A/B/C calculado
    -- GLIM
    glim_fenotipico     TEXT,
    glim_etiologico     TEXT,
    glim_diagnostico    TEXT CHECK(glim_diagnostico IN ('sin_desnutricion','leve_moderada','severa')),
    -- Sarcopenia
    sarcopenia          TEXT CHECK(sarcopenia IN ('no','probable','confirmada','grave')),
    -- Déficits nutricionales
    deficit_fe          INTEGER DEFAULT 0,
    deficit_b12         INTEGER DEFAULT 0,
    deficit_d           INTEGER DEFAULT 0,
    deficit_zinc        INTEGER DEFAULT 0,
    deficit_folato      INTEGER DEFAULT 0,
    deficit_otros       TEXT,
    notas               TEXT
);

-- ============================================================
-- REGISTRO ALIMENTARIO 24H (por visita)
-- ============================================================
CREATE TABLE registro_24h (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    -- Comidas del día
    desayuno            TEXT,   -- texto libre estructurado
    media_manana        TEXT,
    almuerzo            TEXT,
    merienda            TEXT,
    cena                TEXT,
    otros               TEXT,
    -- Resumen calculado / estimado
    kcal_estimadas      REAL,
    proteinas_g         REAL,
    carbohidratos_g     REAL,
    grasas_g            REAL,
    fibra_g             REAL,
    agua_l              REAL,
    -- Contexto
    dia_tipico          INTEGER DEFAULT 1,  -- ¿es un día típico?
    observaciones       TEXT
);

-- ============================================================
-- FRECUENCIA DE CONSUMO (por visita)
-- ============================================================
CREATE TABLE frecuencia_consumo (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    grupo_alimentario   TEXT NOT NULL,
    frecuencia          TEXT CHECK(frecuencia IN ('nunca','1-3/mes','1/sem','2-4/sem','5-6/sem','diario','2+/dia')),
    porcion_habitual    TEXT,
    observacion         TEXT
);

-- ============================================================
-- MÓDULO INVESTIGACIÓN: COHORTES
-- ============================================================
CREATE TABLE cohortes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre              TEXT NOT NULL,
    descripcion         TEXT,
    criterios_inclusion TEXT,
    criterios_exclusion TEXT,
    fecha_inicio        DATE,
    fecha_fin           DATE,
    activa              INTEGER DEFAULT 1,
    fecha_creacion      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cohorte_pacientes (
    cohorte_id          INTEGER REFERENCES cohortes(id),
    paciente_id         INTEGER REFERENCES pacientes(id),
    fecha_inclusion     DATE,
    fecha_exclusion     DATE,
    motivo_exclusion    TEXT,
    PRIMARY KEY (cohorte_id, paciente_id)
);

-- ============================================================
-- PLAN NUTRICIONAL (por visita)
-- ============================================================
CREATE TABLE plan_nutricional (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    visita_id           INTEGER NOT NULL REFERENCES visitas(id),
    paciente_id         INTEGER NOT NULL REFERENCES pacientes(id),
    fecha               DATE NOT NULL,
    objetivo_principal  TEXT,
    peso_objetivo       REAL,
    kcal_prescritas     REAL,
    proteina_prescrita  REAL,
    agua_recomendada    REAL,
    deficit_superavit   REAL,
    plantilla_dieta     TEXT,
    suplementacion      TEXT,
    indicaciones        TEXT,
    proxima_evaluacion  DATE
);

-- ============================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================
CREATE INDEX idx_pacientes_cedula ON pacientes(cedula);
CREATE INDEX idx_pacientes_inst ON pacientes(institucion);
CREATE INDEX idx_visitas_paciente ON visitas(paciente_id);
CREATE INDEX idx_visitas_fecha ON visitas(fecha);
CREATE INDEX idx_cc_paciente ON composicion_corporal(paciente_id);
CREATE INDEX idx_analiticas_paciente ON analiticas(paciente_id);

-- ============================================================
-- VISTA: RESUMEN DE PACIENTE (última visita)
-- ============================================================
CREATE VIEW v_resumen_pacientes AS
SELECT
    p.id,
    p.nombre || ' ' || p.apellidos AS nombre_completo,
    p.cedula,
    p.sexo,
    CAST((julianday('now') - julianday(p.fecha_nacimiento)) / 365.25 AS INTEGER) AS edad,
    p.institucion,
    p.tipo_consulta,
    -- Última visita
    MAX(v.fecha) AS ultima_visita,
    -- Última composición corporal
    cc.peso,
    cc.imc,
    cc.clasificacion_imc,
    cc.pct_grasa,
    cc.kg_masa_muscular,
    -- Último OBSCORE
    ob.obscore_nivel,
    ob.riesgo_cardio
FROM pacientes p
LEFT JOIN visitas v ON v.paciente_id = p.id
LEFT JOIN composicion_corporal cc ON cc.visita_id = (
    SELECT id FROM visitas WHERE paciente_id = p.id ORDER BY fecha DESC LIMIT 1
)
LEFT JOIN obesidad ob ON ob.visita_id = (
    SELECT id FROM visitas WHERE paciente_id = p.id ORDER BY fecha DESC LIMIT 1
)
WHERE p.activo = 1
GROUP BY p.id;
