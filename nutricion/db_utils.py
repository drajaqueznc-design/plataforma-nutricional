"""
Utilidades de base de datos — Plataforma Nutricional Dra. Jáquez
"""
import sqlite3
import os
import math
from datetime import date, datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'db', 'nutricion_clinica.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]


# ── CÁLCULOS AUTOMÁTICOS ──────────────────────────────────────

def calc_imc(peso, talla_cm):
    """IMC y clasificación OMS"""
    if not peso or not talla_cm or talla_cm == 0:
        return None, None
    talla_m = talla_cm / 100
    imc = round(peso / (talla_m ** 2), 1)
    if imc < 18.5:
        cls = 'Bajo peso'
    elif imc < 25:
        cls = 'Normal'
    elif imc < 30:
        cls = 'Sobrepeso'
    elif imc < 35:
        cls = 'Obesidad G1'
    elif imc < 40:
        cls = 'Obesidad G2'
    else:
        cls = 'Obesidad G3'
    return imc, cls


def calc_cintura_talla(cintura, talla_cm):
    if not cintura or not talla_cm or talla_cm == 0:
        return None
    return round(cintura / talla_cm, 3)


def calc_cintura_cadera(cintura, cadera):
    if not cintura or not cadera or cadera == 0:
        return None
    return round(cintura / cadera, 3)


def calc_homa_ir(glucemia, insulina):
    """HOMA-IR = (glucemia mg/dL × insulina μUI/mL) / 405"""
    if not glucemia or not insulina:
        return None, None
    homa = round((glucemia * insulina) / 405, 2)
    if homa >= 2.5:
        interp = 'Resistencia a insulina'
    elif homa >= 1.8:
        interp = 'Límite'
    else:
        interp = 'Normal'
    return homa, interp


def calc_egfr_ckd_epi(creatinina, edad, sexo):
    """
    CKD-EPI 2021 (sin raza)
    Levey AS et al. NEJM 2009; actualizada 2021
    """
    if not creatinina or not edad or not sexo:
        return None, None
    
    if sexo == 'F':
        kappa = 0.7
        alpha = -0.241
        sex_factor = 1.012
    else:
        kappa = 0.9
        alpha = -0.302
        sex_factor = 1.0

    ratio = creatinina / kappa
    if ratio < 1:
        egfr = 142 * (ratio ** alpha) * (0.9938 ** edad) * sex_factor
    else:
        egfr = 142 * (ratio ** -1.200) * (0.9938 ** edad) * sex_factor

    egfr = round(egfr, 1)

    if egfr >= 90:
        estadio = 'G1 (≥90)'
    elif egfr >= 60:
        estadio = 'G2 (60–89)'
    elif egfr >= 45:
        estadio = 'G3a (45–59)'
    elif egfr >= 30:
        estadio = 'G3b (30–44)'
    elif egfr >= 15:
        estadio = 'G4 (15–29)'
    else:
        estadio = 'G5 (<15)'

    return egfr, estadio


def calc_no_hdl(colesterol_total, hdl):
    if not colesterol_total or not hdl:
        return None
    return round(colesterol_total - hdl, 1)


def calc_indice_aterogenico(colesterol_total, hdl):
    if not colesterol_total or not hdl or hdl == 0:
        return None
    return round(colesterol_total / hdl, 2)


def calc_get(tmb, factor_actividad):
    if not tmb or not factor_actividad:
        return None
    return round(tmb * factor_actividad, 0)


def calc_proteina_objetivo(peso, factor=1.4):
    """Proteína 1.4–1.6 g/kg por defecto"""
    if not peso:
        return None
    return round(peso * factor, 0)


def calc_handgrip_interp(valor, sexo):
    """EWGSOP2: F <16 kg, M <27 kg"""
    if not valor or not sexo:
        return None
    if sexo == 'F':
        return 'Baja' if valor < 16 else 'Normal'
    else:
        return 'Baja' if valor < 27 else 'Normal'


def calc_sarcf(cargas, asistencia, levantarse, escaleras, caidas):
    """SARC-F: ≥4 puntos = riesgo sarcopenia"""
    items = [cargas, asistencia, levantarse, escaleras, caidas]
    if any(x is None for x in items):
        return None, None
    total = sum(items)
    return total, 'Riesgo de sarcopenia' if total >= 4 else 'Sin riesgo'


def calc_phq9(items):
    """PHQ-9 scoring"""
    if len(items) != 9 or any(x is None for x in items):
        return None, None
    total = sum(items)
    if total <= 4:
        sev = 'Mínimo'
    elif total <= 9:
        sev = 'Leve'
    elif total <= 14:
        sev = 'Moderado'
    elif total <= 19:
        sev = 'Moderadamente grave'
    else:
        sev = 'Grave'
    return total, sev


def calc_gad7(items):
    """GAD-7 scoring"""
    if len(items) != 7 or any(x is None for x in items):
        return None, None
    total = sum(items)
    if total <= 4:
        sev = 'Mínimo'
    elif total <= 9:
        sev = 'Leve'
    elif total <= 14:
        sev = 'Moderado'
    else:
        sev = 'Grave'
    return total, sev


def calc_pgsa(items):
    """PG-SGA categorización"""
    if len(items) != 4 or any(x is None for x in items):
        return None, None
    total = sum(items)
    if total <= 1:
        cat = 'A — Bien nutrido'
    elif total <= 8:
        cat = 'B — Moderadamente desnutrido'
    else:
        cat = 'C — Gravemente desnutrido'
    return total, cat


def calc_edad(fecha_nacimiento):
    if not fecha_nacimiento:
        return None
    try:
        dob = datetime.strptime(str(fecha_nacimiento), '%Y-%m-%d').date()
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except:
        return None


def obscore_estimate(age, bmi, hba1c, hdl, sbp, creatinina, cintura_talla, tabaquismo):
    """
    Estimación OBSCORE basada en variables publicadas
    Demircan K et al. Nat Med 2026. DOI: 10.1038/s41591-026-04353-2
    NOTA: Estimación orientativa. El modelo completo requiere implementación validada.
    """
    score = 0
    if age:
        if age >= 65: score += 3
        elif age >= 55: score += 2
        elif age >= 45: score += 1
    if bmi:
        if bmi >= 35: score += 3
        elif bmi >= 30: score += 2
        elif bmi >= 27: score += 1
    if hba1c:
        if hba1c >= 6.5: score += 3
        elif hba1c >= 5.7: score += 1
    if hdl:
        if hdl < 40: score += 2
        elif hdl < 50: score += 1
    if sbp:
        if sbp >= 140: score += 2
        elif sbp >= 130: score += 1
    if creatinina:
        if creatinina > 1.2: score += 2
    if cintura_talla:
        if cintura_talla >= 0.6: score += 2
        elif cintura_talla >= 0.5: score += 1
    if tabaquismo == 'activo': score += 2
    elif tabaquismo == 'ex': score += 1

    pct = round((score / 18) * 100)
    if pct >= 60: nivel = 'alto'
    elif pct >= 35: nivel = 'moderado'
    else: nivel = 'bajo'
    return pct, nivel


def calc_numero_visita(paciente_id, conn):
    """Número secuencial de visita para el paciente"""
    row = conn.execute(
        "SELECT COUNT(*) as n FROM visitas WHERE paciente_id = ?", (paciente_id,)
    ).fetchone()
    return (row['n'] or 0) + 1
