"""
Importador CONSULV4.MDB — Consulta Práctica
Dra. Anayanet Jáquez

Modos de operación:
  - Windows: pyodbc + Microsoft Access Driver
  - Linux/Mac: mdbtools (subprocess)
  - Fallback: CSV exportado manualmente
"""
import subprocess
import os
import sys
import json
import sqlite3
from datetime import datetime

def get_mdb_tables_linux(mdb_path):
    """Listar tablas usando mdbtools"""
    result = subprocess.run(
        ['mdb-tables', '-1', mdb_path],
        capture_output=True, text=True
    )
    return [t.strip() for t in result.stdout.strip().split('\n') if t.strip()]

def read_mdb_table_linux(mdb_path, table_name):
    """Leer tabla como JSON usando mdb-json"""
    result = subprocess.run(
        ['mdb-json', mdb_path, table_name],
        capture_output=True, text=True
    )
    rows = []
    for line in result.stdout.strip().split('\n'):
        line = line.strip()
        if line:
            try:
                rows.append(json.loads(line))
            except:
                pass
    return rows

def read_mdb_table_windows(mdb_path, table_name):
    """Leer tabla usando pyodbc en Windows"""
    try:
        import pyodbc
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            f'DBQ={mdb_path};'
        )
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute(f'SELECT * FROM [{table_name}]')
        columns = [col[0] for col in cursor.description]
        rows = []
        for row in cursor.fetchall():
            rows.append(dict(zip(columns, row)))
        conn.close()
        return rows
    except ImportError:
        return []
    except Exception as e:
        print(f'Windows pyodbc error: {e}')
        return []

def read_mdb_table(mdb_path, table_name):
    """Leer tabla MDB — detecta OS automáticamente"""
    if sys.platform == 'win32':
        return read_mdb_table_windows(mdb_path, table_name)
    else:
        return read_mdb_table_linux(mdb_path, table_name)

def get_mdb_tables(mdb_path):
    """Listar tablas — detecta OS"""
    if sys.platform == 'win32':
        try:
            import pyodbc
            conn_str = (
                r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
                f'DBQ={mdb_path};'
            )
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            tables = [row.table_name for row in cursor.tables(tableType='TABLE')]
            conn.close()
            return tables
        except:
            return []
    else:
        return get_mdb_tables_linux(mdb_path)

def parse_date(val):
    """Intentar parsear fecha en múltiples formatos"""
    if not val:
        return None
    val = str(val).strip()
    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d']:
        try:
            return datetime.strptime(val, fmt).strftime('%Y-%m-%d')
        except:
            pass
    return None

def parse_sex(val):
    """Normalizar sexo"""
    if not val:
        return None
    v = str(val).upper().strip()
    if v in ['F', 'FEMENINO', 'FEMALE', 'MUJER', 'M']:
        return 'F' if v != 'M' else 'M'
    if v in ['M', 'MASCULINO', 'MALE', 'HOMBRE']:
        return 'M'
    return None

# Mapeo de campos de Consulta Práctica → nuestra BD
# Consulta Práctica usa campos en español
FIELD_MAP = {
    # Campos comunes en Consulta Práctica v4
    'nombre':       ['Nombre', 'NOMBRE', 'nombre', 'PrimerNombre', 'Primer_Nombre'],
    'apellidos':    ['Apellidos', 'APELLIDOS', 'apellidos', 'PrimerApellido', 'Primer_Apellido'],
    'cedula':       ['Cedula', 'CEDULA', 'cedula', 'DocumentoIdentidad', 'CI', 'DNI'],
    'fecha_nac':    ['FechaNacimiento', 'Fecha_Nacimiento', 'fechanacimiento', 'FNacimiento', 'FNac'],
    'sexo':         ['Sexo', 'SEXO', 'sexo', 'Genero', 'GENERO'],
    'telefono':     ['Telefono', 'TELEFONO', 'telefono', 'Tel', 'Celular', 'Movil'],
    'email':        ['Email', 'EMAIL', 'email', 'Correo', 'CorreoElectronico'],
    'ocupacion':    ['Ocupacion', 'OCUPACION', 'ocupacion', 'Profesion', 'Trabajo'],
}

def find_field(row, candidates):
    """Buscar un campo en el row por lista de candidatos"""
    for c in candidates:
        if c in row and row[c] is not None and str(row[c]).strip():
            return str(row[c]).strip()
    return None

def detect_patient_table(tables):
    """Detectar cuál tabla contiene pacientes"""
    candidates = ['Pacientes', 'PACIENTES', 'pacientes', 'Clientes', 
                  'Personas', 'Consultas', 'Expedientes']
    for c in candidates:
        if c in tables:
            return c
    # Si no, buscar la tabla más grande (probablemente es la de pacientes)
    return tables[0] if tables else None

def import_mdb(mdb_path, institucion, db_path):
    """
    Importar pacientes desde CONSULV4.MDB a la base de datos local.
    Retorna dict con estadísticas del proceso.
    """
    stats = {
        'total_encontrados': 0,
        'importados': 0,
        'duplicados': 0,
        'errores': 0,
        'tablas_encontradas': [],
        'tabla_usada': None,
        'campos_detectados': [],
        'muestra': []
    }

    if not os.path.exists(mdb_path):
        stats['error'] = f'Archivo no encontrado: {mdb_path}'
        return stats

    # 1. Listar tablas
    try:
        tables = get_mdb_tables(mdb_path)
        stats['tablas_encontradas'] = tables
    except Exception as e:
        stats['error'] = f'Error leyendo tablas: {str(e)}'
        return stats

    if not tables:
        stats['error'] = 'No se encontraron tablas en el archivo MDB'
        return stats

    # 2. Detectar tabla de pacientes
    patient_table = detect_patient_table(tables)
    stats['tabla_usada'] = patient_table

    # 3. Leer registros
    try:
        rows = read_mdb_table(mdb_path, patient_table)
        stats['total_encontrados'] = len(rows)
    except Exception as e:
        stats['error'] = f'Error leyendo tabla {patient_table}: {str(e)}'
        return stats

    if not rows:
        stats['error'] = f'Tabla {patient_table} vacía'
        return stats

    # Detectar campos disponibles
    if rows:
        stats['campos_detectados'] = list(rows[0].keys())

    # 4. Importar a SQLite
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")

    for row in rows:
        try:
            nombre = find_field(row, FIELD_MAP['nombre']) or 'Sin nombre'
            apellidos = find_field(row, FIELD_MAP['apellidos']) or ''
            cedula = find_field(row, FIELD_MAP['cedula'])
            fecha_nac = parse_date(find_field(row, FIELD_MAP['fecha_nac']))
            sexo = parse_sex(find_field(row, FIELD_MAP['sexo']))
            telefono = find_field(row, FIELD_MAP['telefono'])
            email = find_field(row, FIELD_MAP['email'])
            ocupacion = find_field(row, FIELD_MAP['ocupacion'])

            # Verificar duplicado por cédula
            if cedula:
                exists = db.execute(
                    "SELECT id FROM pacientes WHERE cedula=?", (cedula,)
                ).fetchone()
                if exists:
                    stats['duplicados'] += 1
                    continue

            # Insertar
            cur = db.execute("""
                INSERT INTO pacientes 
                (nombre, apellidos, cedula, fecha_nacimiento, sexo, 
                 telefono, email, ocupacion, institucion, tipo_consulta)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (nombre, apellidos, cedula, fecha_nac, sexo,
                  telefono, email, ocupacion, institucion, 'AMBULATORIA'))

            pid = cur.lastrowid
            db.execute("INSERT INTO antecedentes (paciente_id) VALUES (?)", (pid,))
            stats['importados'] += 1

            # Muestra de primeros 3
            if len(stats['muestra']) < 3:
                stats['muestra'].append({
                    'nombre': nombre,
                    'apellidos': apellidos,
                    'cedula': cedula,
                    'fecha_nacimiento': fecha_nac,
                    'sexo': sexo
                })

        except Exception as e:
            stats['errores'] += 1
            print(f'Error en fila: {e}')
            continue

    db.commit()
    db.close()
    return stats
