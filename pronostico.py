"""Pronóstico por hora de los 148 distritos de Piura y La Libertad para las alertas de lluvia de Gotita.

Lo ejecuta GitHub cada hora (.github/workflows/pronostico.yml) y lo publica en la rama «datos».
El Apps Script de las alertas lo lee de ahí: Open-Meteo limita por dirección IP y las de Apps Script
son compartidas con miles de programas, así que muchas veces le niega el pedido.
Elaboración: Raúl Edwin Zavala Sánchez · ORCID 0009-0001-9352-7682
Datos: Open-Meteo.com (CC BY 4.0).
"""
import json, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone

VARIABLES = 'precipitation,precipitation_probability,wind_speed_700hPa,wind_direction_700hPa'
ESPERAS = [0, 5, 15, 40]   # segundos antes de cada intento


def pedir(grupo):
    url = ('https://api.open-meteo.com/v1/forecast?latitude=' + ','.join(str(d[4]) for d in grupo)
           + '&longitude=' + ','.join(str(d[5]) for d in grupo)
           + '&hourly=' + VARIABLES + '&forecast_hours=9&timezone=America%2FLima')
    ultimo = ''
    for espera in ESPERAS:
        time.sleep(espera)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ElNinoPiura-Gotita/1.0 (+https://rezavalas.github.io/elninopiura/)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                j = json.loads(r.read())
                return (j if isinstance(j, list) else [j]), ''
        except urllib.error.HTTPError as e:
            ultimo = f'{e.code} {e.read()[:120].decode("utf-8", "replace")}'
        except Exception as e:   # red caída, tiempo agotado
            ultimo = str(e)[:120]
    return None, ultimo


def main(salida):
    distritos = json.load(open('distritos.json', encoding='utf-8'))
    datos, fallas = {}, []
    for k in range(0, len(distritos), 45):
        grupo = distritos[k:k + 45]
        res, error = pedir(grupo)
        if res is None:
            fallas.append(f'grupo {k // 45 + 1}: {error}')
            continue
        for d, o in zip(grupo, res):
            h = o.get('hourly') or {}
            datos[d[0]] = [[t, h['precipitation'][i], (h.get('precipitation_probability') or [None] * 99)[i],
                            (h.get('wind_speed_700hPa') or [None] * 99)[i], (h.get('wind_direction_700hPa') or [None] * 99)[i]]
                           for i, t in enumerate(h.get('time') or [])]
        time.sleep(2)
    print(f'distritos con pronóstico: {len(datos)} de {len(distritos)}')
    for f in fallas:
        print('falla', f)
    if not datos:   # sin datos no se publica nada: queda el último pronóstico y Apps Script lo nota por la hora
        return
    json.dump({'generado': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'zona': 'America/Lima',
               'fuente': 'Open-Meteo.com (CC BY 4.0)', 'columnas': ['hora', 'mm', 'prob', 'viento700_kmh', 'viento700_dir'],
               'fallas': fallas, 'distritos': datos}, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'pronostico.json')
