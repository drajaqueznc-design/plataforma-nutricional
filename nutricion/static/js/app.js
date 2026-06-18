/* ============================================================
   PLATAFORMA NUTRICIONAL — Dra. Anayanet Jáquez
   JavaScript principal
   ============================================================ */

const API = '/api';

// ── STATE ────────────────────────────────────────────────────
const State = {
  pacientes: [],
  currentPaciente: null,
  currentVisita: null,
  activeFilter: 'todos',
  activeView: 'pacientes',
  charts: {}
};

// ── API HELPERS ───────────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(API + path, opts);
    const j = await r.json();
    if (j.status === 'error') throw new Error(j.msg);
    return j.data;
  } catch (e) {
    toast(e.message || 'Error de conexión', 'err');
    throw e;
  }
}

// ── TOAST ────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => el.className = '', 2800);
}

// ── VIEW SWITCHER ─────────────────────────────────────────────
function showView(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
  State.activeView = name;
  if (name === 'pacientes') loadPacientes();
  if (name === 'estadisticas') loadEstadisticas();
}

// ── UTILS ─────────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return '—';
  const d = new Date(dob), n = new Date();
  return n.getFullYear() - d.getFullYear() -
    ((n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) ? 1 : 0);
}

function fmt(val, unit = '', dec = 1) {
  if (val === null || val === undefined || val === '') return '—';
  return (typeof val === 'number' ? val.toFixed(dec) : val) + (unit ? ' ' + unit : '');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-DO');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function riskBadge(nivel) {
  if (!nivel) return `<span class="badge badge-no"><span class="badge-dot"></span>—</span>`;
  const cls = nivel === 'alto' ? 'badge-hi' : nivel === 'moderado' ? 'badge-md' : 'badge-lo';
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${nivel.charAt(0).toUpperCase() + nivel.slice(1)}</span>`;
}

function instBadge(inst) {
  const map = { UM: ['badge-um', 'Unión Médica'], MAT: ['badge-mat', 'Materno'], PRIVADA: ['badge-priv', 'Privada'] };
  const [cls, label] = map[inst] || ['badge-no', inst];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── TABS ─────────────────────────────────────────────────────
function switchTab(containerId, tabId, btn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ════════════════════════════════════════════════════════════
// PACIENTES — LISTA
// ════════════════════════════════════════════════════════════

async function loadPacientes() {
  const q = document.getElementById('searchQ')?.value || '';
  const f = State.activeFilter;

  let params = new URLSearchParams();
  if (q) params.set('q', q);
  if (f === 'UM' || f === 'MAT' || f === 'PRIVADA') params.set('institucion', f);
  if (f === 'alto') params.set('riesgo', 'alto');
  if (f === 'sin_calc') params.set('riesgo', 'sin_calc');

  const data = await api('/pacientes?' + params);
  State.pacientes = data || [];
  renderPacientesTable();
  updateStats();
}

function renderPacientesTable() {
  const tbody = document.getElementById('patientBody');
  const empty = document.getElementById('emptyPacientes');
  const data = State.pacientes;

  if (!data.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(p => `
    <tr onclick="openPaciente(${p.id})">
      <td>
        <div style="font-weight:500">${p.nombre_completo}</div>
        <div style="font-size:11px;color:var(--muted)">${p.cedula || '—'}</div>
      </td>
      <td>${instBadge(p.institucion)}</td>
      <td class="mono">${calcAge(p.fecha_nacimiento) !== '—' ? calcAge(p.fecha_nacimiento) + ' a' : '—'}</td>
      <td class="mono">${fmt(p.imc, 'kg/m²')}</td>
      <td class="mono">${p.pct_grasa ? p.pct_grasa + '%' : '—'}</td>
      <td class="mono">${fmt(p.kg_masa_muscular, 'kg')}</td>
      <td class="mono" style="font-size:12px">${fmtDate(p.ultima_visita)}</td>
      <td>${riskBadge(p.obscore_nivel)}</td>
      <td><button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openPaciente(${p.id})">Ver →</button></td>
    </tr>
  `).join('');
}

function updateStats() {
  const total = State.pacientes.length;
  const um = State.pacientes.filter(p => p.institucion === 'UM').length;
  const mat = State.pacientes.filter(p => p.institucion === 'MAT').length;
  const priv = State.pacientes.filter(p => p.institucion === 'PRIVADA').length;
  const risk = State.pacientes.filter(p => p.obscore_nivel === 'alto').length;

  document.getElementById('s-total').textContent = total || '—';
  document.getElementById('s-um').textContent = um || '—';
  document.getElementById('s-mat').textContent = mat || '—';
  document.getElementById('s-priv').textContent = priv || '—';
  document.getElementById('s-risk').textContent = risk || '—';
}

function setFilter(f, btn) {
  State.activeFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadPacientes();
}

// ════════════════════════════════════════════════════════════
// PACIENTE — MODAL COMPLETO
// ════════════════════════════════════════════════════════════

async function openPaciente(id) {
  const overlay = document.getElementById('overlayPaciente');
  overlay.classList.add('open');
  document.getElementById('modalPacienteBody').innerHTML =
    '<div class="loading"><div class="spinner"></div> Cargando expediente…</div>';

  const data = await api(`/pacientes/${id}`);
  State.currentPaciente = data;
  renderPacienteModal(data);
}

function renderPacienteModal(data) {
  const p = data.paciente;
  const ant = data.antecedentes || {};
  const visitas = data.visitas || [];

  document.getElementById('modalPacienteName').textContent =
    `${p.nombre} ${p.apellidos}`;
  document.getElementById('modalPacienteMeta').innerHTML =
    `${calcAge(p.fecha_nacimiento)} años · ${p.sexo === 'F' ? 'Femenino' : 'Masculino'} · ${instBadge(p.institucion)} · Cédula: ${p.cedula || '—'}`;

  document.getElementById('modalPacienteBody').innerHTML = renderExpediente(p, ant, visitas);
  initExpedienteForms(p, ant);
}

function renderExpediente(p, ant, visitas) {
  return `
  <div class="tabs" id="expTabs">
    <button class="tab-btn active" onclick="switchTab('expContent','tab-datos',this)">Datos generales</button>
    <button class="tab-btn" onclick="switchTab('expContent','tab-visitas',this)">Visitas (${visitas.length})</button>
    <button class="tab-btn" onclick="switchTab('expContent','tab-evolucion',this);loadEvolucion(${p.id})">Evolución</button>
  </div>
  <div id="expContent">

    <!-- TAB DATOS GENERALES -->
    <div class="tab-pane active" id="tab-datos">
      <div class="g2" style="gap:14px">
        <!-- Identificación -->
        <div class="card">
          <div class="card-title">Identificación</div>
          <div class="g2">
            <div class="field"><label>Nombre</label><input id="f-nombre" value="${p.nombre||''}"></div>
            <div class="field"><label>Apellidos</label><input id="f-apellidos" value="${p.apellidos||''}"></div>
            <div class="field"><label>Cédula</label><input id="f-cedula" value="${p.cedula||''}"></div>
            <div class="field"><label>Fecha nacimiento</label><input type="date" id="f-dob" value="${p.fecha_nacimiento||''}"></div>
            <div class="field"><label>Sexo</label><select id="f-sexo">
              <option value="">—</option>
              <option value="F" ${p.sexo==='F'?'selected':''}>Femenino</option>
              <option value="M" ${p.sexo==='M'?'selected':''}>Masculino</option>
            </select></div>
            <div class="field"><label>Institución</label><select id="f-inst">
              <option value="UM" ${p.institucion==='UM'?'selected':''}>Unión Médica</option>
              <option value="MAT" ${p.institucion==='MAT'?'selected':''}>Materno</option>
              <option value="PRIVADA" ${p.institucion==='PRIVADA'?'selected':''}>Privada</option>
            </select></div>
            <div class="field"><label>Teléfono</label><input id="f-tel" value="${p.telefono||''}"></div>
            <div class="field"><label>Ocupación</label><input id="f-ocup" value="${p.ocupacion||''}"></div>
          </div>
        </div>
        <!-- Antecedentes -->
        <div>
          <div class="card" style="margin-bottom:10px">
            <div class="card-title">Antecedentes patológicos</div>
            <div class="g2">
              <div class="field span2"><label>Patologías</label><textarea id="f-patol">${ant.patologias||''}</textarea></div>
              <div class="field span2"><label>Medicamentos</label><textarea id="f-meds">${ant.medicamentos||''}</textarea></div>
              <div class="field"><label>Alergias</label><input id="f-alerg" value="${ant.alergias||''}"></div>
              <div class="field"><label>Intolerancias</label><input id="f-intol" value="${ant.intolerancias||''}"></div>
              <div class="field"><label>Cirugías previas</label><input id="f-cirug" value="${ant.cirugias_previas||''}"></div>
              <div class="field"><label>Cirugía bariátrica</label><select id="f-bariat">
                <option value="0" ${!ant.cirugia_bariatrica?'selected':''}>No</option>
                <option value="1" ${ant.cirugia_bariatrica?'selected':''}>Sí</option>
              </select></div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Hábitos</div>
            <div class="g3">
              <div class="field"><label>Tabaquismo</label><select id="f-tabaco">
                <option value="no" ${ant.tabaquismo==='no'?'selected':''}>No</option>
                <option value="ex" ${ant.tabaquismo==='ex'?'selected':''}>Ex-fumador</option>
                <option value="activo" ${ant.tabaquismo==='activo'?'selected':''}>Activo</option>
              </select></div>
              <div class="field"><label>Alcohol</label><select id="f-alcohol">
                <option value="no" ${ant.alcohol==='no'?'selected':''}>No</option>
                <option value="ocasional" ${ant.alcohol==='ocasional'?'selected':''}>Ocasional</option>
                <option value="regular" ${ant.alcohol==='regular'?'selected':''}>Regular</option>
              </select></div>
              <div class="field"><label>Actividad física</label><select id="f-activ">
                <option value="sedentario" ${ant.actividad_fisica==='sedentario'?'selected':''}>Sedentario</option>
                <option value="leve" ${ant.actividad_fisica==='leve'?'selected':''}>Leve</option>
                <option value="moderado" ${ant.actividad_fisica==='moderado'?'selected':''}>Moderado</option>
                <option value="intenso" ${ant.actividad_fisica==='intenso'?'selected':''}>Intenso</option>
              </select></div>
              <div class="field"><label>Horas de sueño</label><input type="number" id="f-sueno" value="${ant.horas_sueno||''}" step="0.5"></div>
              <div class="field"><label>Familiar DM2</label><select id="f-fdm2">
                <option value="0" ${!ant.dm2_familiar?'selected':''}>No</option>
                <option value="1" ${ant.dm2_familiar?'selected':''}>Sí</option>
              </select></div>
              <div class="field"><label>Familiar ECV</label><select id="f-fecv">
                <option value="0" ${!ant.evc_familiar?'selected':''}>No</option>
                <option value="1" ${ant.evc_familiar?'selected':''}>Sí</option>
              </select></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB VISITAS -->
    <div class="tab-pane" id="tab-visitas">
      <div class="sec-hdr">
        <span class="sec-title">Historial de visitas</span>
        <button class="btn btn-primary btn-sm" onclick="openNuevaVisita(${p.id})">+ Nueva visita</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>Fecha</th><th>Institución</th><th>Motivo</th><th>Módulos</th><th></th>
          </tr></thead>
          <tbody>
            ${visitas.length ? visitas.map(v => `
              <tr onclick="openVisita(${v.id})">
                <td class="mono">${v.numero_visita || '—'}</td>
                <td class="mono">${fmtDate(v.fecha)}</td>
                <td>${instBadge(v.institucion)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.motivo_consulta || '—'}</td>
                <td>
                  ${v.mod_obesidad ? '<span class="badge badge-md" style="font-size:10px">Obesidad</span> ' : ''}
                  ${v.mod_salud_mental ? '<span class="badge badge-hi" style="font-size:10px">S.Mental</span> ' : ''}
                  ${v.mod_sibo ? '<span class="badge badge-lo" style="font-size:10px">SIBO</span> ' : ''}
                  ${v.mod_eii ? '<span class="badge badge-no" style="font-size:10px">EII</span>' : ''}
                </td>
                <td><button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openVisita(${v.id})">Abrir →</button></td>
              </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">Sin visitas registradas</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB EVOLUCIÓN -->
    <div class="tab-pane" id="tab-evolucion">
      <div id="evolucionContent"><div class="loading"><div class="spinner"></div></div></div>
    </div>

  </div>`;
}

function initExpedienteForms(p, ant) {
  // Botón guardar en el footer del modal
  document.getElementById('btnGuardarPaciente').onclick = () => savePaciente(p.id);
}

async function savePaciente(id) {
  const body = {
    nombre: document.getElementById('f-nombre')?.value,
    apellidos: document.getElementById('f-apellidos')?.value,
    cedula: document.getElementById('f-cedula')?.value,
    fecha_nacimiento: document.getElementById('f-dob')?.value,
    sexo: document.getElementById('f-sexo')?.value,
    institucion: document.getElementById('f-inst')?.value,
    telefono: document.getElementById('f-tel')?.value,
    ocupacion: document.getElementById('f-ocup')?.value,
    antecedentes: {
      patologias: document.getElementById('f-patol')?.value,
      medicamentos: document.getElementById('f-meds')?.value,
      alergias: document.getElementById('f-alerg')?.value,
      intolerancias: document.getElementById('f-intol')?.value,
      cirugias_previas: document.getElementById('f-cirug')?.value,
      cirugia_bariatrica: parseInt(document.getElementById('f-bariat')?.value || 0),
      tabaquismo: document.getElementById('f-tabaco')?.value,
      alcohol: document.getElementById('f-alcohol')?.value,
      actividad_fisica: document.getElementById('f-activ')?.value,
      horas_sueno: parseFloat(document.getElementById('f-sueno')?.value) || null,
      dm2_familiar: parseInt(document.getElementById('f-fdm2')?.value || 0),
      evc_familiar: parseInt(document.getElementById('f-fecv')?.value || 0),
    }
  };
  await api(`/pacientes/${id}`, 'PUT', body);
  toast('Expediente guardado ✓');
  loadPacientes();
}

// ════════════════════════════════════════════════════════════
// NUEVO PACIENTE
// ════════════════════════════════════════════════════════════

function openNuevoPaciente() {
  document.getElementById('overlayNuevo').classList.add('open');
  document.getElementById('np-fecha').value = today();
}

async function createPaciente() {
  const body = {
    nombre: document.getElementById('np-nombre').value,
    apellidos: document.getElementById('np-apellidos').value,
    cedula: document.getElementById('np-cedula').value,
    fecha_nacimiento: document.getElementById('np-dob').value,
    sexo: document.getElementById('np-sexo').value,
    institucion: document.getElementById('np-inst').value,
    telefono: document.getElementById('np-tel').value,
    ocupacion: document.getElementById('np-ocup').value,
  };
  if (!body.nombre || !body.apellidos) { toast('Nombre y apellidos requeridos', 'warn'); return; }
  const data = await api('/pacientes', 'POST', body);
  closeOverlay('overlayNuevo');
  toast('Paciente creado ✓');
  loadPacientes();
  if (data) openPaciente(data.id);
}

// ════════════════════════════════════════════════════════════
// VISITA COMPLETA
// ════════════════════════════════════════════════════════════

async function openNuevaVisita(pid) {
  document.getElementById('nv-pid').value = pid;
  document.getElementById('nv-fecha').value = today();
  document.getElementById('overlayNuevaVisita').classList.add('open');
}

async function createVisita() {
  const pid = document.getElementById('nv-pid').value;
  const body = {
    fecha: document.getElementById('nv-fecha').value,
    institucion: document.getElementById('nv-inst').value,
    motivo_consulta: document.getElementById('nv-motivo').value,
    mod_obesidad: document.getElementById('nv-mod-ob').checked ? 1 : 0,
    mod_salud_mental: document.getElementById('nv-mod-sm').checked ? 1 : 0,
    mod_sibo: document.getElementById('nv-mod-sibo').checked ? 1 : 0,
    mod_eii: document.getElementById('nv-mod-eii').checked ? 1 : 0,
    mod_farmacoterapia: document.getElementById('nv-mod-farm').checked ? 1 : 0,
  };
  const data = await api(`/pacientes/${pid}/visitas`, 'POST', body);
  closeOverlay('overlayNuevaVisita');
  toast('Visita creada ✓');
  if (data) openVisita(data.visita_id);
}

async function openVisita(vid) {
  document.getElementById('overlayVisita').classList.add('open');
  document.getElementById('visitaBody').innerHTML =
    '<div class="loading"><div class="spinner"></div> Cargando visita…</div>';

  const data = await api(`/visitas/${vid}`);
  State.currentVisita = data;
  renderVisitaModal(data);
}

function renderVisitaModal(v) {
  document.getElementById('visitaTitle').textContent = `Visita #${v.numero_visita || '?'} — ${fmtDate(v.fecha)}`;
  document.getElementById('visitaMeta').innerHTML = instBadge(v.institucion) +
    (v.motivo_consulta ? ` · ${v.motivo_consulta}` : '');

  const tabs = [
    ['cc', 'Composición Corporal'],
    ['anal', 'Analíticas'],
    ['reg24', 'Registro 24h'],
    ['freq', 'Frecuencia Alimentaria'],
    ['plan', 'Plan Nutricional'],
    ['cron', 'Cronología'],
  ];
  if (v.mod_obesidad) tabs.push(['ob', 'Obesidad']);
  if (v.mod_salud_mental) tabs.push(['sm', 'Salud Mental']);
  if (v.mod_sibo) tabs.push(['sibo', 'SIBO/IMO']);
  if (v.mod_eii) tabs.push(['eii', 'EII']);

  document.getElementById('visitaBody').innerHTML = `
    <div class="tabs" id="visitaTabs">
      ${tabs.map(([id, label], i) =>
        `<button class="tab-btn ${i===0?'active':''}" onclick="switchTab('visitaContent','vtab-${id}',this)${id==='cron'?`;loadCronologia(${v.paciente_id})`:''}">${label}</button>`
      ).join('')}
    </div>
    <div id="visitaContent">
      ${tabs.map(([id], i) =>
        `<div class="tab-pane ${i===0?'active':''}" id="vtab-${id}">${renderVisitaTab(id, v)}</div>`
      ).join('')}
    </div>
  `;

  initVisitaForms(v);
}

function renderVisitaTab(id, v) {
  const cc = v.composicion_corporal || {};
  const an = v.analiticas || {};
  const plan = v.plan_nutricional || {};
  const r24 = v.registro_24h || {};

  if (id === 'cc') return renderTabCC(cc);
  if (id === 'anal') return renderTabAnaliticas(an);
  if (id === 'reg24') return renderTabReg24(r24);
  if (id === 'freq') return renderTabFreq(v.frecuencia_consumo || []);
  if (id === 'plan') return renderTabPlan(plan);
  if (id === 'cron') return `<div id="cronologiaContent"><div class="loading"><div class="spinner"></div> Cargando cronología…</div></div>`;
  if (id === 'ob') return renderTabObesidad(v.obesidad || {}, cc, an);
  if (id === 'sm') return renderTabSaludMental(v.salud_mental || {});
  if (id === 'sibo') return renderTabSibo(v.sibo_imo || {});
  if (id === 'eii') return renderTabEii(v.eii || {});
  return '';
}

// ── COMPOSICIÓN CORPORAL TAB ──────────────────────────────────
function renderTabCC(cc) {
  return `
  <div class="card">
    <div class="card-title">Antropometría <span style="float:right"><input type="date" id="cc-fecha" value="${cc.fecha || today()}" style="background:transparent;border:none;color:var(--muted);font-size:11px"></span></div>
    <div class="g4">
      <div class="field"><label>Peso (kg)</label><div class="field-wrap"><input type="number" step="0.1" id="cc-peso" value="${cc.peso||''}" oninput="autoCalcCC()"><span class="field-unit">kg</span></div></div>
      <div class="field"><label>Talla (cm)</label><div class="field-wrap"><input type="number" step="0.1" id="cc-talla" value="${cc.talla||''}" oninput="autoCalcCC()"><span class="field-unit">cm</span></div></div>
      <div class="field"><label>IMC</label><div class="computed" id="cc-imc">${cc.imc ? cc.imc + ' kg/m²' : '—'}</div></div>
      <div class="field"><label>Clasificación</label><div class="computed" id="cc-cls" style="font-size:12px">${cc.clasificacion_imc || '—'}</div></div>
      <div class="field"><label>Cintura (cm)</label><div class="field-wrap"><input type="number" step="0.1" id="cc-cintura" value="${cc.cintura||''}" oninput="autoCalcCC()"><span class="field-unit">cm</span></div></div>
      <div class="field"><label>Cadera (cm)</label><div class="field-wrap"><input type="number" step="0.1" id="cc-cadera" value="${cc.cadera||''}" oninput="autoCalcCC()"><span class="field-unit">cm</span></div></div>
      <div class="field"><label>Pantorrilla (cm)</label><div class="field-wrap"><input type="number" step="0.1" id="cc-pant" value="${cc.pantorrilla||''}"><span class="field-unit">cm</span></div></div>
      <div class="field"><label>Cintura/Talla</label><div class="computed" id="cc-ct">${cc.cintura_talla || '—'}</div></div>
      <div class="field"><label>Cintura/Cadera</label><div class="computed" id="cc-cc">${cc.cintura_cadera || '—'}</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Bioimpedanciometría
      <select id="cc-equipo" style="font-size:11px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:2px 6px">
        <option value="InBody120" ${cc.equipo==='InBody120'?'selected':''}>InBody 120</option>
        <option value="Tanita" ${cc.equipo==='Tanita'?'selected':''}>Tanita</option>
      </select>
    </div>
    <div class="g4">
      <div class="field"><label>% Grasa</label><div class="field-wrap"><input type="number" step="0.1" id="cc-pgrasa" value="${cc.pct_grasa||''}"><span class="field-unit">%</span></div></div>
      <div class="field"><label>Masa grasa</label><div class="field-wrap"><input type="number" step="0.1" id="cc-kgrasa" value="${cc.kg_grasa||''}"><span class="field-unit">kg</span></div></div>
      <div class="field"><label>Masa magra</label><div class="field-wrap"><input type="number" step="0.1" id="cc-magra" value="${cc.kg_masa_magra||''}"><span class="field-unit">kg</span></div></div>
      <div class="field"><label>Masa muscular</label><div class="field-wrap"><input type="number" step="0.1" id="cc-muscular" value="${cc.kg_masa_muscular||''}"><span class="field-unit">kg</span></div></div>
      <div class="field"><label>Agua corporal</label><div class="field-wrap"><input type="number" step="0.1" id="cc-agua" value="${cc.agua_corporal||''}"><span class="field-unit">L</span></div></div>
      <div class="field"><label>Masa ósea</label><div class="field-wrap"><input type="number" step="0.1" id="cc-osea" value="${cc.masa_osea||''}"><span class="field-unit">kg</span></div></div>
      <div class="field"><label>Edad metabólica</label><input type="number" id="cc-edadmet" value="${cc.edad_metabolica||''}"></div>
      <div class="field"><label>TMB (equipo)</label><div class="field-wrap"><input type="number" id="cc-tmb" value="${cc.tmb_equipo||''}" oninput="autoCalcGET()"><span class="field-unit">kcal</span></div></div>
    </div>
    <div class="divider"></div>
    <div class="g4">
      <div class="field"><label>Factor actividad</label>
        <select id="cc-factor" onchange="autoCalcGET()">
          <option value="1.2" ${cc.factor_actividad==1.2?'selected':''}>Sedentario ×1.2</option>
          <option value="1.375" ${cc.factor_actividad==1.375?'selected':''}>Leve ×1.375</option>
          <option value="1.55" ${cc.factor_actividad==1.55?'selected':''}>Moderado ×1.55</option>
          <option value="1.725" ${cc.factor_actividad==1.725?'selected':''}>Intenso ×1.725</option>
        </select>
      </div>
      <div class="field"><label>GET calculado</label><div class="computed" id="cc-get">${cc.get_calculado ? cc.get_calculado + ' kcal' : '—'}</div></div>
      <div class="field"><label>Proteína objetivo</label><div class="computed" id="cc-prot">${cc.proteina_objetivo ? cc.proteina_objetivo + ' g/día' : '—'}</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Funcionalidad</div>
    <div class="g3">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:600">HANDGRIP — Mano derecha (kg)</div>
        <div class="g3" style="gap:6px">
          <div class="field"><label>Intento 1</label><input type="number" step="0.1" id="cc-hd1" value="${cc.handgrip_der_1||''}"></div>
          <div class="field"><label>Intento 2</label><input type="number" step="0.1" id="cc-hd2" value="${cc.handgrip_der_2||''}"></div>
          <div class="field"><label>Intento 3</label><input type="number" step="0.1" id="cc-hd3" value="${cc.handgrip_der_3||''}"></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Mejor: <span class="mono" id="cc-hd-best">${cc.handgrip_der_mejor ? cc.handgrip_der_mejor + ' kg' : '—'}</span> · <span id="cc-hd-interp" style="color:${cc.handgrip_interpretacion==='Baja'?'var(--danger)':'var(--accent2)'}">${cc.handgrip_interpretacion || '—'}</span></div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:600">HANDGRIP — Mano izquierda (kg)</div>
        <div class="g3" style="gap:6px">
          <div class="field"><label>Intento 1</label><input type="number" step="0.1" id="cc-hi1" value="${cc.handgrip_izq_1||''}"></div>
          <div class="field"><label>Intento 2</label><input type="number" step="0.1" id="cc-hi2" value="${cc.handgrip_izq_2||''}"></div>
          <div class="field"><label>Intento 3</label><input type="number" step="0.1" id="cc-hi3" value="${cc.handgrip_izq_3||''}"></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Mejor: <span class="mono" id="cc-hi-best">${cc.handgrip_izq_mejor ? cc.handgrip_izq_mejor + ' kg' : '—'}</span></div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:600">SIT-TO-STAND (5 repeticiones)</div>
        <div class="field"><label>Nº repeticiones completadas</label><input type="number" id="cc-sts" value="${cc.sit_to_stand_reps||''}"></div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Interpretación: <span id="cc-sts-interp" style="color:${cc.sit_to_stand_interp==='Bajo'?'var(--danger)':'var(--accent2)'}">${cc.sit_to_stand_interp || '—'}</span></div>
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:600">SARC-F</div>
    <div class="g5">
      ${['Carga','Asistencia para caminar','Levantarse de silla','Subir escaleras','Caídas'].map((label, i) => {
        const key = ['sarcf_carga','sarcf_asistencia','sarcf_levantarse','sarcf_escaleras','sarcf_caidas'][i];
        const val = cc[key];
        return `<div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${label}</div>
          <div class="likert" id="sarcf-${i}">
            ${[0,1,2].map(v => `<div class="likert-opt${val===v?' selected':''}" onclick="selectLikert('sarcf-${i}',${v},this)">${v}</div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:10px;font-size:13px">SARC-F total: <span class="mono" id="sarcf-total">${cc.sarcf_total ?? '—'}</span> · <span id="sarcf-interp">${cc.sarcf_interpretacion || '—'}</span></div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveCC()">Guardar composición corporal</button></div>`;
}

function renderTabAnaliticas(an) {
  const f = (id, val, unit='', step='1') =>
    `<div class="field"><label>${id.replace(/_/g,' ')}</label><div class="field-wrap"><input type="number" step="${step}" id="an-${id}" value="${val||''}"><span class="field-unit">${unit}</span></div></div>`;

  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">Glucometabolismo</div>
    <div class="g4">
      ${f('glucemia_ayunas', an.glucemia_ayunas, 'mg/dL', '0.1')}
      ${f('insulina_ayunas', an.insulina_ayunas, 'μUI/mL', '0.01')}
      ${f('hba1c', an.hba1c, '%', '0.1')}
      ${f('glucemia_2h', an.glucemia_2h, 'mg/dL', '0.1')}
    </div>
    <div id="homa-display" style="${an.homa_ir ? '' : 'display:none'};margin-top:10px;padding:12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;display:flex;gap:16px;align-items:center">
      <div><div class="mono" style="font-size:22px;font-weight:700" id="homa-val">${an.homa_ir ? an.homa_ir.toFixed(2) : '—'}</div><div style="font-size:11px;color:var(--muted)">HOMA-IR</div></div>
      <div style="flex:1;padding-left:14px;border-left:1px solid var(--border)"><span id="homa-interp">${an.homa_interpretacion || '—'}</span><div style="font-size:11px;color:var(--muted);margin-top:3px">Matthews DR et al. Diabetologia 1985. PMID: 3899825</div></div>
    </div>
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">Perfil lipídico</div>
    <div class="g4">
      ${f('colesterol_total', an.colesterol_total, 'mg/dL')}
      ${f('ldl', an.ldl, 'mg/dL')}
      ${f('hdl', an.hdl, 'mg/dL')}
      ${f('trigliceridos', an.trigliceridos, 'mg/dL')}
      ${f('apob', an.apob, 'mg/dL')}
      <div class="field"><label>No-HDL</label><div class="computed" id="an-nohdl">${an.no_hdl ? an.no_hdl + ' mg/dL' : '—'}</div></div>
      <div class="field"><label>Índice aterogénico</label><div class="computed" id="an-ia">${an.indice_aterogenico || '—'}</div></div>
    </div>
  </div>
  <div class="g2" style="gap:12px">
    <div class="card">
      <div class="card-title">Función renal</div>
      <div class="g2">
        ${f('creatinina', an.creatinina, 'mg/dL', '0.01')}
        ${f('urea', an.urea, 'mg/dL')}
        ${f('acido_urico', an.acido_urico, 'mg/dL', '0.1')}
        ${f('microalbuminuria', an.microalbuminuria, 'mg/g')}
      </div>
      <div class="field" style="margin-top:8px"><label>eGFR CKD-EPI</label><div class="computed" id="an-egfr">${an.egfr ? an.egfr + ' mL/min — ' + an.egfr_estadio : '—'}</div></div>
    </div>
    <div class="card">
      <div class="card-title">Función hepática</div>
      <div class="g2">
        ${f('alt', an.alt, 'U/L')}
        ${f('ast', an.ast, 'U/L')}
        ${f('ggt', an.ggt, 'U/L')}
        ${f('fosfatasa_alcalina', an.fosfatasa_alcalina, 'U/L')}
        ${f('bilirrubina_total', an.bilirrubina_total, 'mg/dL', '0.1')}
      </div>
    </div>
  </div>
  <div class="g2" style="gap:12px">
    <div class="card">
      <div class="card-title">Tiroides / Inflamación</div>
      <div class="g2">
        ${f('tsh', an.tsh, 'μUI/mL', '0.01')}
        ${f('t4_libre', an.t4_libre, 'ng/dL', '0.01')}
        ${f('pcr_us', an.pcr_us, 'mg/L', '0.1')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Micronutrientes / Hemograma</div>
      <div class="g2">
        ${f('vitamina_d', an.vitamina_d, 'ng/mL', '0.1')}
        ${f('vitamina_b12', an.vitamina_b12, 'pg/mL')}
        ${f('folato', an.folato, 'ng/mL', '0.1')}
        ${f('magnesio', an.magnesio, 'mg/dL', '0.01')}
        ${f('zinc', an.zinc, 'μg/dL')}
        ${f('ferritina', an.ferritina, 'ng/mL')}
        ${f('hierro_serico', an.hierro_serico, 'μg/dL')}
        ${f('hemoglobina', an.hemoglobina, 'g/dL', '0.1')}
      </div>
    </div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveAnaliticas()">Guardar analíticas</button></div>`;
}

function renderTabReg24(r24) {
  const meals = [
    ['desayuno','Desayuno'],['media_manana','Media mañana'],
    ['almuerzo','Almuerzo'],['merienda','Merienda'],
    ['cena','Cena'],['otros','Otros / colaciones']
  ];
  return `
  <div class="card">
    <div class="card-title">Recordatorio 24 horas</div>
    <div class="g2">
      ${meals.map(([k,l]) => `<div class="field"><label>${l}</label><textarea id="r24-${k}" style="min-height:55px">${r24[k]||''}</textarea></div>`).join('')}
    </div>
    <div class="divider"></div>
    <div class="g4" style="margin-top:4px">
      <div class="field"><label>kcal estimadas</label><input type="number" id="r24-kcal" value="${r24.kcal_estimadas||''}"></div>
      <div class="field"><label>Proteínas (g)</label><input type="number" step="0.1" id="r24-prot" value="${r24.proteinas_g||''}"></div>
      <div class="field"><label>Carbohidratos (g)</label><input type="number" step="0.1" id="r24-cho" value="${r24.carbohidratos_g||''}"></div>
      <div class="field"><label>Grasas (g)</label><input type="number" step="0.1" id="r24-fat" value="${r24.grasas_g||''}"></div>
      <div class="field"><label>Fibra (g)</label><input type="number" step="0.1" id="r24-fibra" value="${r24.fibra_g||''}"></div>
      <div class="field"><label>Agua (L)</label><input type="number" step="0.1" id="r24-agua" value="${r24.agua_l||''}"></div>
      <div class="field"><label>¿Día típico?</label><select id="r24-tipico">
        <option value="1" ${r24.dia_tipico!==0?'selected':''}>Sí</option>
        <option value="0" ${r24.dia_tipico===0?'selected':''}>No</option>
      </select></div>
    </div>
    <div class="field" style="margin-top:8px"><label>Observaciones</label><textarea id="r24-obs">${r24.observaciones||''}</textarea></div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveReg24()">Guardar registro 24h</button></div>`;
}

const FREQ_GROUPS = ['Cereales y tubérculos','Leguminosas','Vegetales','Frutas',
  'Lácteos','Carnes y aves','Pescados y mariscos','Huevos',
  'Grasas y aceites','Azúcares y dulces','Bebidas azucaradas',
  'Comida rápida / ultraprocesados','Frutos secos y semillas'];
const FREQ_OPTS = ['nunca','1-3/mes','1/sem','2-4/sem','5-6/sem','diario','2+/dia'];

function renderTabFreq(saved) {
  const map = {};
  saved.forEach(s => { map[s.grupo_alimentario] = s; });
  return `
  <div class="card">
    <div class="card-title">Frecuencia de consumo por grupos alimentarios</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>
        <th style="padding:6px 8px;font-size:10px;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);font-weight:600;text-transform:uppercase">Grupo</th>
        <th style="padding:6px 8px;font-size:10px;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);font-weight:600;text-transform:uppercase">Frecuencia</th>
        <th style="padding:6px 8px;font-size:10px;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);font-weight:600;text-transform:uppercase">Porción habitual</th>
        <th style="padding:6px 8px;font-size:10px;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);font-weight:600;text-transform:uppercase">Observación</th>
      </tr></thead>
      <tbody>
        ${FREQ_GROUPS.map(g => {
          const s = map[g] || {};
          return `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:5px 8px">${g}</td>
            <td style="padding:5px 8px"><select class="freq-sel" data-grupo="${g}" style="background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:3px 6px;font-size:12px;width:100%">
              ${FREQ_OPTS.map(o => `<option value="${o}" ${s.frecuencia===o?'selected':''}>${o}</option>`).join('')}
            </select></td>
            <td style="padding:5px 8px"><input class="freq-por" data-grupo="${g}" value="${s.porcion_habitual||''}" style="background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:3px 8px;font-size:12px;width:100%"></td>
            <td style="padding:5px 8px"><input class="freq-obs" data-grupo="${g}" value="${s.observacion||''}" style="background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:3px 8px;font-size:12px;width:100%"></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveFreq()">Guardar frecuencia de consumo</button></div>`;
}

function renderTabPlan(plan) {
  const objs = ['Pérdida de peso','Preservación masa muscular','Ganancia muscular',
    'Control glucémico','Reducción grasa visceral','Manejo sarcopenia'];
  return `
  <div class="card">
    <div class="card-title">Objetivos y prescripción</div>
    <div class="g3">
      <div class="field"><label>Objetivo principal</label><select id="pn-obj">
        ${objs.map(o => `<option ${plan.objetivo_principal===o?'selected':''}>${o}</option>`).join('')}
      </select></div>
      <div class="field"><label>Peso objetivo (kg)</label><input type="number" step="0.1" id="pn-pesobj" value="${plan.peso_objetivo||''}"></div>
      <div class="field"><label>kcal prescritas</label><input type="number" id="pn-kcal" value="${plan.kcal_prescritas||''}"></div>
      <div class="field"><label>Proteína prescrita (g)</label><input type="number" step="0.1" id="pn-prot" value="${plan.proteina_prescrita||''}"></div>
      <div class="field"><label>Agua recomendada (L)</label><input type="number" step="0.1" id="pn-agua" value="${plan.agua_recomendada||''}"></div>
      <div class="field"><label>Déficit/Superávit (kcal)</label><input type="number" id="pn-def" value="${plan.deficit_superavit||''}"></div>
      <div class="field"><label>Plantilla de dieta</label><select id="pn-dieta">
        <option value="">— Sin asignar —</option>
        <option value="Bajo Índice Glucémico" ${plan.plantilla_dieta==='Bajo Índice Glucémico'?'selected':''}>Bajo Índice Glucémico</option>
        <option value="Baja en FODMAPs" ${plan.plantilla_dieta==='Baja en FODMAPs'?'selected':''}>Baja en FODMAPs</option>
      </select></div>
      <div class="field"><label>Próxima evaluación</label><input type="date" id="pn-prox" value="${plan.proxima_evaluacion||''}"></div>
    </div>
    <div class="field" style="margin-top:10px"><label>Suplementación</label><textarea id="pn-supl">${plan.suplementacion||''}</textarea></div>
    <div class="field" style="margin-top:8px"><label>Indicaciones clínicas</label><textarea id="pn-ind" style="min-height:90px">${plan.indicaciones||''}</textarea></div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="savePlan()">Guardar plan nutricional</button></div>`;
}

function renderTabObesidad(ob, cc, an) {
  return `
  <div class="card">
    <div class="card-title">Clasificación y estadificación</div>
    <div class="g3">
      <div class="field"><label>Clasificación IMC</label><div class="computed">${cc.clasificacion_imc || '—'}</div></div>
      <div class="field"><label>Obesidad preclínica/clínica</label><select id="ob-tipo">
        <option value="">—</option>
        <option value="preclínica" ${ob.obesidad_prec_clinica==='preclínica'?'selected':''}>Preclínica</option>
        <option value="clínica" ${ob.obesidad_prec_clinica==='clínica'?'selected':''}>Clínica</option>
        <option value="sin obesidad" ${ob.obesidad_prec_clinica==='sin obesidad'?'selected':''}>Sin obesidad</option>
      </select></div>
      <div class="field"><label>Estadio</label><input id="ob-estadio" value="${ob.estadio||''}"></div>
      <div class="field"><label>Riesgo cardiometabólico</label><select id="ob-riesgo">
        <option value="">—</option>
        <option value="bajo" ${ob.riesgo_cardio==='bajo'?'selected':''}>Bajo</option>
        <option value="moderado" ${ob.riesgo_cardio==='moderado'?'selected':''}>Moderado</option>
        <option value="alto" ${ob.riesgo_cardio==='alto'?'selected':''}>Alto</option>
        <option value="muy_alto" ${ob.riesgo_cardio==='muy_alto'?'selected':''}>Muy alto</option>
      </select></div>
    </div>
    ${ob.obscore_pct !== null && ob.obscore_pct !== undefined ? `
    <div class="alert alert-${ob.obscore_nivel==='alto'?'danger':ob.obscore_nivel==='moderado'?'warn':'ok'}" style="margin-top:12px">
      <strong>OBSCORE: ${ob.obscore_pct}% — ${ob.obscore_nivel?.toUpperCase()}</strong>
      · Demircan K et al. Nat Med 2026.
    </div>` : ''}
  </div>
  <div class="card">
    <div class="card-title">Complicaciones relacionadas con obesidad</div>
    <div class="g4">
      ${['dm2','hta','dislipidemia','higado_graso','saos','artrosis','depresion'].map(c => `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="ob-${c}" ${ob['comp_'+c]?'checked':''}> ${c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
        </label>`).join('')}
    </div>
    <div class="field" style="margin-top:10px"><label>Otras complicaciones</label><textarea id="ob-otras">${ob.comp_otras||''}</textarea></div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveObesidad()">Guardar módulo obesidad</button></div>`;
}

function renderTabSaludMental(sm) {
  const phq9q = [
    'Poco interés o placer en hacer cosas',
    'Se ha sentido deprimido/a',
    'Problemas para dormir',
    'Poca energía o cansancio',
    'Poco apetito o comer en exceso',
    'Sentirse mal consigo mismo/a',
    'Dificultad para concentrarse',
    'Moverse o hablar lento / agitación',
    'Pensamientos de hacerse daño'
  ];
  const gad7q = [
    'Sentirse nervioso/a o tenso/a',
    'No poder dejar de preocuparse',
    'Preocuparse demasiado',
    'Dificultad para relajarse',
    'Tan inquieto/a que no puede estar quieto/a',
    'Fácilmente molesto/a o irritable',
    'Sentir miedo como si fuera a pasar algo terrible'
  ];
  return `
  <div class="g2" style="gap:14px">
    <div class="card">
      <div class="card-title">PHQ-9 — Detección depresión</div>
      ${phq9q.map((q,i) => `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;margin-bottom:5px;color:var(--text2)">${i+1}. ${q}</div>
          <div class="likert" id="phq9-${i+1}">
            ${['Nunca','Varios días','Más de la mitad','Casi todos'].map((l,v) =>
              `<div class="likert-opt${sm[`phq9_${i+1}`]===v?' selected':''}" onclick="selectLikert('phq9-${i+1}',${v},this)" style="font-size:10px">${l}</div>`
            ).join('')}
          </div>
        </div>`).join('')}
      <div style="font-size:13px;margin-top:8px">Total: <span class="mono" id="phq9-total">${sm.phq9_total ?? '—'}</span> · <span id="phq9-sev">${sm.phq9_severidad || '—'}</span></div>
    </div>
    <div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">GAD-7 — Ansiedad generalizada</div>
        ${gad7q.map((q,i) => `
          <div style="margin-bottom:10px">
            <div style="font-size:12px;margin-bottom:5px;color:var(--text2)">${i+1}. ${q}</div>
            <div class="likert" id="gad7-${i+1}">
              ${['Nunca','Varios días','Más de la mitad','Casi todos'].map((l,v) =>
                `<div class="likert-opt${sm[`gad7_${i+1}`]===v?' selected':''}" onclick="selectLikert('gad7-${i+1}',${v},this)" style="font-size:10px">${l}</div>`
              ).join('')}
            </div>
          </div>`).join('')}
        <div style="font-size:13px;margin-top:8px">Total: <span class="mono" id="gad7-total">${sm.gad7_total ?? '—'}</span> · <span id="gad7-sev">${sm.gad7_severidad || '—'}</span></div>
      </div>
      <div class="card">
        <div class="card-title">Conducta alimentaria / Sueño</div>
        <div class="g2">
          <div class="field"><label>Comer emocional (0–10)</label><input type="number" min="0" max="10" id="sm-cemoc" value="${sm.comer_emocional??''}"></div>
          <div class="field"><label>Frecuencia atracones</label><select id="sm-atrac">
            ${['nunca','<1/sem','1/sem','>1/sem','diario'].map(o => `<option value="${o}" ${sm.atracones_frecuencia===o?'selected':''}>${o}</option>`).join('')}
          </select></div>
          <div class="field"><label>Craving tipo</label><input id="sm-crav" value="${sm.craving_tipo||''}"></div>
          <div class="field"><label>Craving intensidad (0–10)</label><input type="number" min="0" max="10" id="sm-cravi" value="${sm.craving_intensidad??''}"></div>
          <div class="field"><label>Horas de sueño</label><input type="number" step="0.5" id="sm-hsueno" value="${sm.sueno_horas||''}"></div>
          <div class="field"><label>Calidad sueño (0–10)</label><input type="number" min="0" max="10" id="sm-qsueno" value="${sm.sueno_calidad??''}"></div>
        </div>
        ${sm.derivacion_psicologia || sm.derivacion_psiquiatria ? `
        <div class="alert alert-warn" style="margin-top:10px">
          ⚠ Derivación sugerida: ${sm.derivacion_psicologia?'Psicología ':''}${sm.derivacion_psiquiatria?'Psiquiatría':''}
        </div>` : ''}
      </div>
    </div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveSaludMental()">Guardar salud mental</button></div>`;
}

function renderTabSibo(sibo) {
  const sintomas = [
    ['distension','Distensión abdominal'],
    ['dolor_abdominal','Dolor abdominal'],
    ['flatulencia','Flatulencia'],
    ['diarrea','Diarrea'],
    ['estrenimiento','Estreñimiento'],
    ['reflujo','Reflujo'],
    ['fatiga','Fatiga']
  ];
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">Síntomas (0–10)</div>
    ${sintomas.map(([k,l]) => `
      <div class="symptom-row">
        <span class="symptom-label">${l}</span>
        <input type="range" class="symptom-slider" id="sibo-${k}" min="0" max="10" value="${sibo[k]||0}" oninput="document.getElementById('sv-${k}').textContent=this.value">
        <span class="symptom-val" id="sv-${k}">${sibo[k]||0}</span>
      </div>`).join('')}
  </div>
  <div class="g2" style="gap:12px">
    <div class="card">
      <div class="card-title">Factores de riesgo</div>
      <div class="g2">
        ${['ipt_previo','antibioticos_recientes','ibs_diagnostico','hipotiroidismo','diabetes','cirugia_gi'].map(k =>
          `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="sibo-${k}" ${sibo[k]?'checked':''}> ${k.replace(/_/g,' ')}
          </label>`
        ).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Prueba respiratoria</div>
      <div class="g2">
        <div class="field"><label>Tipo</label><select id="sibo-prueba">
          ${['no_realizada','lactulose','glucosa','fructosa'].map(o =>
            `<option value="${o}" ${sibo.prueba_respiratoria===o?'selected':''}>${o}</option>`).join('')}
        </select></div>
        <div class="field"><label>Resultado</label><select id="sibo-resultado">
          ${['negativo','SIBO_H2','IMO_CH4','SIBO_H2S','mixto'].map(o =>
            `<option value="${o}" ${sibo.resultado_prueba===o?'selected':''}>${o}</option>`).join('')}
        </select></div>
        <div class="field"><label>Fecha prueba</label><input type="date" id="sibo-fprueba" value="${sibo.fecha_prueba||''}"></div>
        <div class="field"><label>Dieta indicada</label><select id="sibo-dieta">
          ${['ninguna','low_fodmap','especifica'].map(o =>
            `<option value="${o}" ${sibo.dieta_indicada===o?'selected':''}>${o}</option>`).join('')}
        </select></div>
      </div>
      <div class="field" style="margin-top:8px"><label>Tratamiento</label><textarea id="sibo-trat">${sibo.tratamiento||''}</textarea></div>
    </div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveSibo()">Guardar SIBO/IMO</button></div>`;
}

function renderTabEii(eii) {
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">Diagnóstico EII</div>
    <div class="g4">
      <div class="field"><label>Tipo</label><select id="eii-tipo">
        <option value="crohn" ${eii.tipo_eii==='crohn'?'selected':''}>Crohn</option>
        <option value="colitis_ulcerosa" ${eii.tipo_eii==='colitis_ulcerosa'?'selected':''}>Colitis ulcerosa</option>
        <option value="indeterminada" ${eii.tipo_eii==='indeterminada'?'selected':''}>Indeterminada</option>
      </select></div>
      <div class="field"><label>Localización</label><input id="eii-loc" value="${eii.localizacion||''}"></div>
      <div class="field"><label>Actividad clínica</label><select id="eii-activ">
        ${['remision','leve','moderada','grave'].map(o =>
          `<option value="${o}" ${eii.actividad===o?'selected':''}>${o}</option>`).join('')}
      </select></div>
      <div class="field"><label>Sarcopenia</label><select id="eii-sarco">
        ${['no','probable','confirmada','grave'].map(o =>
          `<option value="${o}" ${eii.sarcopenia===o?'selected':''}>${o}</option>`).join('')}
      </select></div>
    </div>
  </div>
  <div class="g2" style="gap:12px">
    <div class="card">
      <div class="card-title">PG-SGA</div>
      ${[['pgsa_perdida_peso','Pérdida de peso (0–4)',4],
         ['pgsa_ingesta','Ingesta (0–3)',3],
         ['pgsa_sintomas','Síntomas (0–3)',3],
         ['pgsa_actividad','Actividad (0–3)',3]].map(([k,l,max]) => `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;margin-bottom:5px;color:var(--text2)">${l}</div>
          <div class="likert" id="${k}-likert">
            ${Array.from({length:max+1},(_,v) =>
              `<div class="likert-opt${eii[k]===v?' selected':''}" onclick="selectLikert('${k}-likert',${v},this)">${v}</div>`
            ).join('')}
          </div>
        </div>`).join('')}
      <div style="font-size:13px;margin-top:8px">Total: <span class="mono" id="pgsa-total">${eii.pgsa_total ?? '—'}</span> · <span id="pgsa-cat">${eii.pgsa_categoria || '—'}</span></div>
    </div>
    <div class="card">
      <div class="card-title">GLIM / Déficits nutricionales</div>
      <div class="g2" style="margin-bottom:10px">
        <div class="field"><label>Fenotípico</label><input id="eii-glim-f" value="${eii.glim_fenotipico||''}"></div>
        <div class="field"><label>Etiológico</label><input id="eii-glim-e" value="${eii.glim_etiologico||''}"></div>
        <div class="field"><label>Diagnóstico GLIM</label><select id="eii-glim-d">
          ${['sin_desnutricion','leve_moderada','severa'].map(o =>
            `<option value="${o}" ${eii.glim_diagnostico===o?'selected':''}>${o}</option>`).join('')}
        </select></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:600">Déficits</div>
      <div class="g3">
        ${['fe','b12','d','zinc','folato'].map(d =>
          `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="eii-def-${d}" ${eii['deficit_'+d]?'checked':''}> ${d.toUpperCase()}
          </label>`).join('')}
      </div>
    </div>
  </div>
  <div style="text-align:right"><button class="btn btn-success" onclick="saveEii()">Guardar EII</button></div>`;
}

// ── EVOLUCIÓN ─────────────────────────────────────────────────
async function loadEvolucion(pid) {
  const data = await api(`/pacientes/${pid}/evolucion`);
  const el = document.getElementById('evolucionContent');
  if (!data || !data.length) {
    el.innerHTML = '<div class="empty-state"><p>Sin datos de evolución registrados.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Evolución peso y composición corporal</div>
      <div class="chart-wrap" style="height:220px"><canvas id="evoChart1"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">Evolución metabólica</div>
      <div class="chart-wrap" style="height:180px"><canvas id="evoChart2"></canvas></div>
    </div>`;

  const labels = data.map(d => fmtDate(d.fecha));

  if (State.charts.evo1) State.charts.evo1.destroy();
  if (State.charts.evo2) State.charts.evo2.destroy();

  State.charts.evo1 = new Chart(document.getElementById('evoChart1'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Peso (kg)', data: data.map(d => d.peso), borderColor: '#4f8ef7', tension: .3, pointRadius: 4, fill: false },
      { label: '% Grasa', data: data.map(d => d.pct_grasa), borderColor: '#e05c5c', tension: .3, pointRadius: 4, fill: false },
      { label: 'Músculo (kg)', data: data.map(d => d.kg_masa_muscular), borderColor: '#34c78a', tension: .3, pointRadius: 4, fill: false },
    ]},
    options: chartOpts()
  });

  State.charts.evo2 = new Chart(document.getElementById('evoChart2'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'HOMA-IR', data: data.map(d => d.homa_ir), borderColor: '#f0a742', tension: .3, pointRadius: 4, fill: false },
      { label: 'HbA1c (%)', data: data.map(d => d.hba1c), borderColor: '#a78bfa', tension: .3, pointRadius: 4, fill: false },
    ]},
    options: chartOpts()
  });
}

function chartOpts() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#6b7280', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: '#252a38' } },
      y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: '#252a38' } }
    }
  };
}

// ── AUTO CÁLCULOS ─────────────────────────────────────────────
function autoCalcCC() {
  const peso = parseFloat(document.getElementById('cc-peso')?.value);
  const talla = parseFloat(document.getElementById('cc-talla')?.value);
  const cintura = parseFloat(document.getElementById('cc-cintura')?.value);
  const cadera = parseFloat(document.getElementById('cc-cadera')?.value);

  if (peso && talla) {
    const imc = (peso / (talla / 100) ** 2);
    document.getElementById('cc-imc').textContent = imc.toFixed(1) + ' kg/m²';
    const cls = imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' :
      imc < 35 ? 'Obesidad G1' : imc < 40 ? 'Obesidad G2' : 'Obesidad G3';
    const el = document.getElementById('cc-cls');
    el.textContent = cls;
    el.style.color = imc < 25 ? 'var(--accent2)' : imc < 30 ? 'var(--warn)' : 'var(--danger)';
  }
  if (cintura && talla) {
    document.getElementById('cc-ct').textContent = (cintura / talla).toFixed(3);
  }
  if (cintura && cadera) {
    document.getElementById('cc-cc').textContent = (cintura / cadera).toFixed(3);
  }
}

function autoCalcGET() {
  const tmb = parseFloat(document.getElementById('cc-tmb')?.value);
  const f = parseFloat(document.getElementById('cc-factor')?.value) || 1.4;
  const peso = parseFloat(document.getElementById('cc-peso')?.value);
  if (tmb) {
    document.getElementById('cc-get').textContent = Math.round(tmb * f) + ' kcal';
    if (peso) document.getElementById('cc-prot').textContent =
      (peso * 1.4).toFixed(0) + '–' + (peso * 1.6).toFixed(0) + ' g/día';
  }
}

// ── LIKERT ────────────────────────────────────────────────────
function selectLikert(groupId, val, el) {
  document.querySelectorAll(`#${groupId} .likert-opt`).forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  el.dataset.val = val;
}

function getLikertVal(groupId) {
  const sel = document.querySelector(`#${groupId} .likert-opt.selected`);
  return sel ? parseInt(sel.dataset.val ?? sel.textContent) : null;
}

// ── SAVE FUNCTIONS ────────────────────────────────────────────
async function saveCC() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const hd = [1,2,3].map(i => parseFloat(document.getElementById(`cc-hd${i}`)?.value) || null);
  const hi = [1,2,3].map(i => parseFloat(document.getElementById(`cc-hi${i}`)?.value) || null);
  const sarcf = ['carga','asistencia','levantarse','escaleras','caidas'].map((k,i) => getLikertVal(`sarcf-${i}`));
  const body = {
    fecha: document.getElementById('cc-fecha')?.value || today(),
    equipo: document.getElementById('cc-equipo')?.value,
    peso: parseFloat(document.getElementById('cc-peso')?.value) || null,
    talla: parseFloat(document.getElementById('cc-talla')?.value) || null,
    cintura: parseFloat(document.getElementById('cc-cintura')?.value) || null,
    cadera: parseFloat(document.getElementById('cc-cadera')?.value) || null,
    pantorrilla: parseFloat(document.getElementById('cc-pant')?.value) || null,
    pct_grasa: parseFloat(document.getElementById('cc-pgrasa')?.value) || null,
    kg_grasa: parseFloat(document.getElementById('cc-kgrasa')?.value) || null,
    kg_masa_magra: parseFloat(document.getElementById('cc-magra')?.value) || null,
    kg_masa_muscular: parseFloat(document.getElementById('cc-muscular')?.value) || null,
    agua_corporal: parseFloat(document.getElementById('cc-agua')?.value) || null,
    masa_osea: parseFloat(document.getElementById('cc-osea')?.value) || null,
    edad_metabolica: parseInt(document.getElementById('cc-edadmet')?.value) || null,
    tmb_equipo: parseFloat(document.getElementById('cc-tmb')?.value) || null,
    factor_actividad: parseFloat(document.getElementById('cc-factor')?.value) || 1.4,
    handgrip_der_1: hd[0], handgrip_der_2: hd[1], handgrip_der_3: hd[2],
    handgrip_izq_1: hi[0], handgrip_izq_2: hi[1], handgrip_izq_3: hi[2],
    sit_to_stand_reps: parseInt(document.getElementById('cc-sts')?.value) || null,
    sarcf_carga: sarcf[0], sarcf_asistencia: sarcf[1], sarcf_levantarse: sarcf[2],
    sarcf_escaleras: sarcf[3], sarcf_caidas: sarcf[4],
  };
  const res = await api(`/visitas/${vid}/composicion`, 'POST', body);
  if (res) {
    document.getElementById('cc-imc').textContent = res.imc ? res.imc + ' kg/m²' : '—';
    document.getElementById('cc-cls').textContent = res.clasificacion_imc || '—';
  }
  toast('Composición corporal guardada ✓');
}

async function saveAnaliticas() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const fields = ['glucemia_ayunas','insulina_ayunas','hba1c','glucemia_2h',
    'colesterol_total','ldl','hdl','trigliceridos','apob',
    'creatinina','urea','acido_urico','microalbuminuria',
    'alt','ast','ggt','fosfatasa_alcalina','bilirrubina_total',
    'tsh','t4_libre','pcr_us','ferritina','hierro_serico',
    'vitamina_d','vitamina_b12','folato','magnesio','zinc','hemoglobina'];
  const body = {};
  fields.forEach(f => {
    const val = parseFloat(document.getElementById(`an-${f}`)?.value);
    if (!isNaN(val)) body[f] = val;
  });
  const res = await api(`/visitas/${vid}/analiticas`, 'POST', body);
  if (res) {
    if (res.homa_ir) {
      document.getElementById('homa-val').textContent = res.homa_ir.toFixed(2);
      document.getElementById('homa-interp').textContent = res.homa_interpretacion;
      document.getElementById('homa-display').style.display = 'flex';
    }
    if (res.egfr) document.getElementById('an-egfr').textContent =
      `${res.egfr} mL/min — ${res.egfr_estadio}`;
    if (res.no_hdl) document.getElementById('an-nohdl').textContent = res.no_hdl + ' mg/dL';
    if (res.indice_aterogenico) document.getElementById('an-ia').textContent = res.indice_aterogenico;
  }
  toast('Analíticas guardadas ✓');
}

async function saveReg24() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const body = {
    desayuno: document.getElementById('r24-desayuno')?.value,
    media_manana: document.getElementById('r24-media_manana')?.value,
    almuerzo: document.getElementById('r24-almuerzo')?.value,
    merienda: document.getElementById('r24-merienda')?.value,
    cena: document.getElementById('r24-cena')?.value,
    otros: document.getElementById('r24-otros')?.value,
    kcal_estimadas: parseFloat(document.getElementById('r24-kcal')?.value) || null,
    proteinas_g: parseFloat(document.getElementById('r24-prot')?.value) || null,
    carbohidratos_g: parseFloat(document.getElementById('r24-cho')?.value) || null,
    grasas_g: parseFloat(document.getElementById('r24-fat')?.value) || null,
    fibra_g: parseFloat(document.getElementById('r24-fibra')?.value) || null,
    agua_l: parseFloat(document.getElementById('r24-agua')?.value) || null,
    dia_tipico: parseInt(document.getElementById('r24-tipico')?.value),
    observaciones: document.getElementById('r24-obs')?.value,
  };
  await api(`/visitas/${vid}/registro24h`, 'POST', body);
  toast('Registro 24h guardado ✓');
}

async function saveFreq() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const items = FREQ_GROUPS.map(g => ({
    grupo: g,
    frecuencia: document.querySelector(`.freq-sel[data-grupo="${g}"]`)?.value,
    porcion: document.querySelector(`.freq-por[data-grupo="${g}"]`)?.value,
    observacion: document.querySelector(`.freq-obs[data-grupo="${g}"]`)?.value,
  }));
  await api(`/visitas/${vid}/frecuencia`, 'POST', items);
  toast('Frecuencia de consumo guardada ✓');
}

async function savePlan() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const body = {
    objetivo_principal: document.getElementById('pn-obj')?.value,
    peso_objetivo: parseFloat(document.getElementById('pn-pesobj')?.value) || null,
    kcal_prescritas: parseFloat(document.getElementById('pn-kcal')?.value) || null,
    proteina_prescrita: parseFloat(document.getElementById('pn-prot')?.value) || null,
    agua_recomendada: parseFloat(document.getElementById('pn-agua')?.value) || null,
    deficit_superavit: parseFloat(document.getElementById('pn-def')?.value) || null,
    plantilla_dieta: document.getElementById('pn-dieta')?.value,
    suplementacion: document.getElementById('pn-supl')?.value,
    indicaciones: document.getElementById('pn-ind')?.value,
    proxima_evaluacion: document.getElementById('pn-prox')?.value,
  };
  await api(`/visitas/${vid}/plan`, 'POST', body);
  toast('Plan nutricional guardado ✓');
}

async function saveObesidad() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const body = {
    obesidad_prec_clinica: document.getElementById('ob-tipo')?.value,
    estadio: document.getElementById('ob-estadio')?.value,
    riesgo_cardio: document.getElementById('ob-riesgo')?.value,
    comp_dm2: document.getElementById('ob-dm2')?.checked ? 1 : 0,
    comp_hta: document.getElementById('ob-hta')?.checked ? 1 : 0,
    comp_dislipidemia: document.getElementById('ob-dislipidemia')?.checked ? 1 : 0,
    comp_higado_graso: document.getElementById('ob-higado_graso')?.checked ? 1 : 0,
    comp_saos: document.getElementById('ob-saos')?.checked ? 1 : 0,
    comp_artrosis: document.getElementById('ob-artrosis')?.checked ? 1 : 0,
    comp_depresion: document.getElementById('ob-depresion')?.checked ? 1 : 0,
    comp_otras: document.getElementById('ob-otras')?.value,
  };
  const res = await api(`/visitas/${vid}/obesidad`, 'POST', body);
  toast(`OBSCORE: ${res?.obscore_pct}% — ${res?.obscore_nivel} ✓`);
}

async function saveSaludMental() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const body = { comer_emocional: parseInt(document.getElementById('sm-cemoc')?.value)||null,
    atracones_frecuencia: document.getElementById('sm-atrac')?.value,
    craving_tipo: document.getElementById('sm-crav')?.value,
    craving_intensidad: parseInt(document.getElementById('sm-cravi')?.value)||null,
    sueno_horas: parseFloat(document.getElementById('sm-hsueno')?.value)||null,
    sueno_calidad: parseInt(document.getElementById('sm-qsueno')?.value)||null,
  };
  for (let i = 1; i <= 9; i++) body[`phq9_${i}`] = getLikertVal(`phq9-${i}`);
  for (let i = 1; i <= 7; i++) body[`gad7_${i}`] = getLikertVal(`gad7-${i}`);
  const res = await api(`/visitas/${vid}/salud_mental`, 'POST', body);
  if (res) {
    document.getElementById('phq9-total').textContent = res.phq9_total ?? '—';
    document.getElementById('phq9-sev').textContent = res.phq9_severidad || '—';
    document.getElementById('gad7-total').textContent = res.gad7_total ?? '—';
    document.getElementById('gad7-sev').textContent = res.gad7_severidad || '—';
  }
  toast('Salud mental guardada ✓');
}

async function saveSibo() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const sintomas = ['distension','dolor_abdominal','flatulencia','diarrea','estrenimiento','reflujo','fatiga'];
  const body = {};
  sintomas.forEach(k => body[k] = parseInt(document.getElementById(`sibo-${k}`)?.value) || 0);
  ['ipt_previo','antibioticos_recientes','ibs_diagnostico','hipotiroidismo','diabetes','cirugia_gi']
    .forEach(k => body[k] = document.getElementById(`sibo-${k}`)?.checked ? 1 : 0);
  body.prueba_respiratoria = document.getElementById('sibo-prueba')?.value;
  body.resultado_prueba = document.getElementById('sibo-resultado')?.value;
  body.fecha_prueba = document.getElementById('sibo-fprueba')?.value;
  body.dieta_indicada = document.getElementById('sibo-dieta')?.value;
  body.tratamiento = document.getElementById('sibo-trat')?.value;
  await api(`/visitas/${vid}/sibo`, 'POST', body);
  toast('SIBO/IMO guardado ✓');
}

async function saveEii() {
  const vid = State.currentVisita?.id;
  if (!vid) return;
  const body = {
    tipo_eii: document.getElementById('eii-tipo')?.value,
    localizacion: document.getElementById('eii-loc')?.value,
    actividad: document.getElementById('eii-activ')?.value,
    sarcopenia: document.getElementById('eii-sarco')?.value,
    glim_fenotipico: document.getElementById('eii-glim-f')?.value,
    glim_etiologico: document.getElementById('eii-glim-e')?.value,
    glim_diagnostico: document.getElementById('eii-glim-d')?.value,
    pgsa_perdida_peso: getLikertVal('pgsa_perdida_peso-likert'),
    pgsa_ingesta: getLikertVal('pgsa_ingesta-likert'),
    pgsa_sintomas: getLikertVal('pgsa_sintomas-likert'),
    pgsa_actividad: getLikertVal('pgsa_actividad-likert'),
  };
  ['fe','b12','d','zinc','folato'].forEach(d =>
    body[`deficit_${d}`] = document.getElementById(`eii-def-${d}`)?.checked ? 1 : 0);
  const res = await api(`/visitas/${vid}/eii`, 'POST', body);
  if (res) {
    document.getElementById('pgsa-total').textContent = res.pgsa_total ?? '—';
    document.getElementById('pgsa-cat').textContent = res.pgsa_categoria || '—';
  }
  toast('EII guardada ✓');
}

// ── ESTADÍSTICAS ──────────────────────────────────────────────
async function loadEstadisticas() {
  const data = await api('/estadisticas');
  if (!data) return;

  document.getElementById('est-total').textContent = data.total_pacientes;

  const instMap = {};
  (data.por_institucion || []).forEach(r => instMap[r.institucion] = r.n);
  document.getElementById('est-um').textContent = instMap.UM || 0;
  document.getElementById('est-mat').textContent = instMap.MAT || 0;
  document.getElementById('est-priv').textContent = instMap.PRIVADA || 0;
  document.getElementById('est-ri').textContent = data.resistencia_insulina || 0;

  // Charts
  ['estChart1','estChart2'].forEach(id => {
    if (State.charts[id]) State.charts[id].destroy();
  });

  if (data.imc_distribucion?.length) {
    State.charts.estChart1 = new Chart(document.getElementById('estChart1'), {
      type: 'doughnut',
      data: {
        labels: data.imc_distribucion.map(r => r.clasificacion_imc || 'Sin datos'),
        datasets: [{ data: data.imc_distribucion.map(r => r.n),
          backgroundColor: ['#34c78a','#4f8ef7','#f0a742','#e05c5c','#a78bfa','#2dd4bf'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#6b7280', font: { size: 11 } } } } }
    });
  }

  if (data.obscore_distribucion?.length) {
    State.charts.estChart2 = new Chart(document.getElementById('estChart2'), {
      type: 'bar',
      data: {
        labels: data.obscore_distribucion.map(r => r.obscore_nivel || 'Sin datos'),
        datasets: [{ label: 'Pacientes', data: data.obscore_distribucion.map(r => r.n),
          backgroundColor: ['#34c78a','#f0a742','#e05c5c'], borderRadius: 5 }]
      },
      options: { ...chartOpts(), plugins: { legend: { display: false } } }
    });
  }
}

// ── OVERLAY HELPERS ───────────────────────────────────────────
function closeOverlay(id) {
  document.getElementById(id)?.classList.remove('open');
}

function initVisitaForms(v) {
  // noop — forms initialized inline
}

// ════════════════════════════════════════════════════════════
// IMPORTACIÓN MDB / CSV
// ════════════════════════════════════════════════════════════

async function importarMDB(inputId, inst) {
  const input = document.getElementById(inputId);
  const file = input?.files?.[0];
  const statusEl = document.getElementById('st' + inst);

  if (!file) return;

  statusEl.style.color = 'var(--warn)';
  statusEl.textContent = '⏳ Procesando ' + file.name + '…';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('institucion', inst);

  try {
    const endpoint = file.name.toLowerCase().endsWith('.csv')
      ? '/api/importar/csv'
      : '/api/importar/mdb';

    const r = await fetch(API + endpoint, { method: 'POST', body: formData });
    const j = await r.json();

    if (j.status === 'error') throw new Error(j.msg);

    const d = j.data;
    statusEl.style.color = 'var(--accent2)';
    statusEl.innerHTML = `
      ✓ <strong>${d.importados}</strong> pacientes importados
      ${d.duplicados ? `· ${d.duplicados} duplicados omitidos` : ''}
      ${d.errores ? `· ${d.errores} errores` : ''}
    `;

    if (d.muestra?.length) {
      statusEl.innerHTML += `<br><span style="font-size:10px;color:var(--muted)">
        Muestra: ${d.muestra.map(p => p.nombre + ' ' + p.apellidos).join(', ')}
      </span>`;
    }

    if (d.importados > 0) {
      setTimeout(() => {
        showView('pacientes', document.querySelector('.nav-btn'));
        loadPacientes();
        toast(`✓ ${d.importados} pacientes importados desde ${inst}`, 'ok');
      }, 1200);
    }
  } catch (e) {
    statusEl.style.color = 'var(--danger)';
    statusEl.textContent = '✗ Error: ' + e.message;
  }
}

async function cargarDemo(inst) {
  const r = await fetch(API + '/api/importar/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ institucion: inst })
  });
  const j = await r.json();
  if (j.status === 'ok') {
    toast('Datos demo cargados ✓');
    loadPacientes();
    showView('pacientes', document.querySelector('.nav-btn'));
  }
}

// ════════════════════════════════════════════════════════════
// CRONOLOGÍA DE ANALÍTICAS
// ════════════════════════════════════════════════════════════

async function loadCronologia(pid) {
  const el = document.getElementById('cronologiaContent');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Cargando cronología…</div>';

  const data = await api(`/pacientes/${pid}/cronologia`);
  if (!data) return;

  const { composicion, analiticas, series, resumen } = data;

  if (!composicion.length && !analiticas.length) {
    el.innerHTML = '<div class="empty-state"><p>Sin datos de seguimiento aún.<br>Registra visitas con composición corporal y analíticas.</p></div>';
    return;
  }

  // Destruir charts previos
  ['crChart1','crChart2','crChart3','crChart4'].forEach(id => {
    if (State.charts[id]) { State.charts[id].destroy(); delete State.charts[id]; }
  });

  el.innerHTML = `
    <!-- RESUMEN DE CAMBIOS -->
    ${Object.keys(resumen).length ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Resumen de cambios — Desde primera visita</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${Object.values(resumen).map(r => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;min-width:140px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${r.label}</div>
            <div style="font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace">${r.actual !== null ? r.actual + (r.unit ? ' ' + r.unit : '') : '—'}</div>
            ${r.delta !== null ? `
            <div style="font-size:12px;margin-top:3px;color:${r.tendencia === 'mejora' ? 'var(--accent2)' : r.tendencia === 'empeora' ? 'var(--danger)' : 'var(--muted)'}">
              ${r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : '→'} ${Math.abs(r.delta)} ${r.unit}
              ${r.delta_pct !== null ? `(${r.delta_pct > 0 ? '+' : ''}${r.delta_pct}%)` : ''}
              · <span style="font-size:10px">${r.tendencia}</span>
            </div>` : ''}
            <div style="font-size:10px;color:var(--muted);margin-top:2px">Inicio: ${r.baseline !== null ? r.baseline + (r.unit ? ' ' + r.unit : '') : '—'}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- GRÁFICAS COMPOSICIÓN -->
    ${composicion.length >= 1 ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Evolución — Composición corporal</div>
      <div class="chart-wrap" style="height:200px"><canvas id="crChart1"></canvas></div>
    </div>
    <div class="g2" style="gap:14px;margin-bottom:14px">
      <div class="card">
        <div class="card-title">Peso e IMC</div>
        <div class="chart-wrap" style="height:160px"><canvas id="crChart2"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Cintura y relación cintura/talla</div>
        <div class="chart-wrap" style="height:160px"><canvas id="crChart5"></canvas></div>
      </div>
    </div>` : ''}

    <!-- GRÁFICAS ANALÍTICAS -->
    ${analiticas.length >= 1 ? `
    <div class="g2" style="gap:14px;margin-bottom:14px">
      <div class="card">
        <div class="card-title">Glucometabolismo — HOMA-IR / HbA1c / Glucemia</div>
        <div class="chart-wrap" style="height:180px"><canvas id="crChart3"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Perfil lipídico</div>
        <div class="chart-wrap" style="height:180px"><canvas id="crChart4"></canvas></div>
      </div>
    </div>` : ''}

    <!-- TABLA CRONOLÓGICA ANALÍTICAS -->
    ${analiticas.length ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Tabla cronológica — Analíticas</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:7px 10px;text-align:left;color:var(--muted);font-size:10px;font-weight:600;text-transform:uppercase">Fecha</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Glucemia</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">HOMA-IR</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">HbA1c</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Col T</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">LDL</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">HDL</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">TG</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">eGFR</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Vit D</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Hgb</th>
            </tr>
          </thead>
          <tbody>
            ${analiticas.map((a, i) => {
              const prev = i > 0 ? analiticas[i-1] : null;
              const arrow = (cur, prv, mejor='bajo') => {
                if (!cur || !prv) return '';
                const up = cur > prv;
                const mejora = mejor === 'bajo' ? !up : up;
                return `<span style="color:${mejora?'var(--accent2)':'var(--danger)'};font-size:10px">${up?'▲':'▼'}</span>`;
              };
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:6px 10px;font-family:'JetBrains Mono',monospace;color:var(--muted)">${fmtDate(a.fecha)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${a.glucemia_ayunas??'—'}${arrow(a.glucemia_ayunas, prev?.glucemia_ayunas)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${a.homa_ir>=2.5?'var(--danger)':a.homa_ir>=1.8?'var(--warn)':'var(--accent2)'}">${a.homa_ir?.toFixed(2)??'—'}${arrow(a.homa_ir, prev?.homa_ir)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${a.hba1c>=6.5?'var(--danger)':a.hba1c>=5.7?'var(--warn)':'inherit'}">${a.hba1c??'—'}${arrow(a.hba1c, prev?.hba1c)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${a.colesterol_total??'—'}${arrow(a.colesterol_total, prev?.colesterol_total)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${a.ldl>=160?'var(--danger)':a.ldl>=130?'var(--warn)':'inherit'}">${a.ldl??'—'}${arrow(a.ldl, prev?.ldl)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${a.hdl&&a.hdl<40?'var(--danger)':'inherit'}">${a.hdl??'—'}${arrow(a.hdl, prev?.hdl,'alto')}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${a.trigliceridos>=150?'var(--warn)':'inherit'}">${a.trigliceridos??'—'}${arrow(a.trigliceridos, prev?.trigliceridos)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${a.egfr??'—'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${a.vitamina_d&&a.vitamina_d<20?'var(--danger)':a.vitamina_d&&a.vitamina_d<30?'var(--warn)':'inherit'}">${a.vitamina_d??'—'}${arrow(a.vitamina_d, prev?.vitamina_d,'alto')}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${a.hemoglobina??'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- TABLA CRONOLÓGICA COMPOSICIÓN -->
    ${composicion.length ? `
    <div class="card">
      <div class="card-title">Tabla cronológica — Composición corporal</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:7px 10px;text-align:left;color:var(--muted);font-size:10px;font-weight:600;text-transform:uppercase">Fecha</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Peso</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">IMC</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">% Grasa</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Músculo</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Cintura</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">C/T</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">Handgrip</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">STS</th>
              <th style="padding:7px 10px;text-align:right;color:var(--muted);font-size:10px;font-weight:600">SARC-F</th>
            </tr>
          </thead>
          <tbody>
            ${composicion.map((c, i) => {
              const prev = i > 0 ? composicion[i-1] : null;
              const arrow = (cur, prv, mejor='bajo') => {
                if (!cur || !prv) return '';
                const up = cur > prv;
                const mejora = mejor === 'bajo' ? !up : up;
                return `<span style="color:${mejora?'var(--accent2)':'var(--danger)'};font-size:10px">${up?'▲':'▼'}</span>`;
              };
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:6px 10px;font-family:'JetBrains Mono',monospace;color:var(--muted)">${fmtDate(c.fecha)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${c.peso??'—'} kg${arrow(c.peso, prev?.peso)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${c.imc??'—'}${arrow(c.imc, prev?.imc)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${c.pct_grasa>35?'var(--warn)':'inherit'}">${c.pct_grasa??'—'}%${arrow(c.pct_grasa, prev?.pct_grasa)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--accent2)">${c.kg_masa_muscular??'—'} kg${arrow(c.kg_masa_muscular, prev?.kg_masa_muscular,'alto')}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${c.cintura??'—'} cm${arrow(c.cintura, prev?.cintura)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${c.cintura_talla>=0.5?'var(--warn)':'inherit'}">${c.cintura_talla??'—'}${arrow(c.cintura_talla, prev?.cintura_talla)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${c.handgrip_der_mejor??'—'} kg <span style="font-size:10px;color:${c.handgrip_interpretacion==='Baja'?'var(--danger)':'var(--accent2)'}">${c.handgrip_interpretacion??''}</span></td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${c.sit_to_stand_reps??'—'} rep</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${c.sarcf_total>=4?'var(--danger)':'inherit'}">${c.sarcf_total??'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;

  // Renderizar gráficas
  const labels_cc = composicion.map(c => fmtDate(c.fecha));
  const labels_an = analiticas.map(a => fmtDate(a.fecha));

  if (composicion.length && document.getElementById('crChart1')) {
    State.charts.crChart1 = new Chart(document.getElementById('crChart1'), {
      type: 'line',
      data: { labels: labels_cc, datasets: [
        { label: 'Peso (kg)', data: composicion.map(c => c.peso), borderColor: '#4f8ef7', tension: .3, pointRadius: 4, fill: false, yAxisID: 'y' },
        { label: '% Grasa', data: composicion.map(c => c.pct_grasa), borderColor: '#e05c5c', tension: .3, pointRadius: 4, fill: false, yAxisID: 'y' },
        { label: 'Músculo (kg)', data: composicion.map(c => c.kg_masa_muscular), borderColor: '#34c78a', tension: .3, pointRadius: 4, fill: false, yAxisID: 'y' },
      ]},
      options: { ...chartOpts(), scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#252a38' } },
        y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#252a38' } }
      }}
    });

    if (document.getElementById('crChart2')) {
      State.charts.crChart2 = new Chart(document.getElementById('crChart2'), {
        type: 'line',
        data: { labels: labels_cc, datasets: [
          { label: 'Peso (kg)', data: composicion.map(c => c.peso), borderColor: '#4f8ef7', tension: .3, pointRadius: 4, fill: false },
          { label: 'IMC', data: composicion.map(c => c.imc), borderColor: '#f0a742', tension: .3, pointRadius: 4, fill: false },
        ]},
        options: chartOpts()
      });
    }

    if (document.getElementById('crChart5')) {
      State.charts.crChart5 = new Chart(document.getElementById('crChart5'), {
        type: 'line',
        data: { labels: labels_cc, datasets: [
          { label: 'Cintura (cm)', data: composicion.map(c => c.cintura), borderColor: '#a78bfa', tension: .3, pointRadius: 4, fill: false },
        ]},
        options: chartOpts()
      });
    }
  }

  if (analiticas.length) {
    if (document.getElementById('crChart3')) {
      State.charts.crChart3 = new Chart(document.getElementById('crChart3'), {
        type: 'line',
        data: { labels: labels_an, datasets: [
          { label: 'HOMA-IR', data: analiticas.map(a => a.homa_ir), borderColor: '#f0a742', tension: .3, pointRadius: 4, fill: false },
          { label: 'HbA1c (%)', data: analiticas.map(a => a.hba1c), borderColor: '#a78bfa', tension: .3, pointRadius: 4, fill: false },
          { label: 'Glucemia/10', data: analiticas.map(a => a.glucemia_ayunas ? a.glucemia_ayunas/10 : null), borderColor: '#2dd4bf', tension: .3, pointRadius: 4, fill: false, borderDash: [4,2] },
        ]},
        options: chartOpts()
      });
    }

    if (document.getElementById('crChart4')) {
      State.charts.crChart4 = new Chart(document.getElementById('crChart4'), {
        type: 'line',
        data: { labels: labels_an, datasets: [
          { label: 'Col Total', data: analiticas.map(a => a.colesterol_total), borderColor: '#e05c5c', tension: .3, pointRadius: 4, fill: false },
          { label: 'LDL', data: analiticas.map(a => a.ldl), borderColor: '#f0a742', tension: .3, pointRadius: 4, fill: false },
          { label: 'HDL', data: analiticas.map(a => a.hdl), borderColor: '#34c78a', tension: .3, pointRadius: 4, fill: false },
          { label: 'TG', data: analiticas.map(a => a.trigliceridos), borderColor: '#a78bfa', tension: .3, pointRadius: 4, fill: false, borderDash: [4,2] },
        ]},
        options: chartOpts()
      });
    }
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPacientes();
  document.getElementById('searchQ')?.addEventListener('input', () => loadPacientes());
  document.getElementById('syncBadge').textContent =
    'Última sincronización: ' + new Date().toLocaleDateString('es-DO');
});
