#!/usr/bin/env python3
"""Actualiza .md de fotos con detecciones manuales preservando EXIF."""
import re
from pathlib import Path

ROOT = Path('/Users/tomgc/Projects/galeria')

DETECTIONS = {
    'tom-2020-02-13-00034': {
        'title_es': 'Salto entre araucarias',
        'category': 'paisajes',
        'tags': ['araucaria', 'salto', 'cascada', 'bosque-andino-patagonico', 'basalto', 'cordillera'],
        'region': 'La Araucanía',
        'description_es': 'Cascada cayendo desde una pared de basalto columnar, rodeada de araucarias y bosque nativo andino-patagónico.',
    },
    'tom-2021-01-31-00001': {
        'title_es': 'Cumulonimbo de verano',
        'category': 'paisajes',
        'tags': ['nubes', 'cielo', 'cumulonimbo', 'verano'],
        'description_es': 'Cumulonimbo en pleno desarrollo contra cielo azul intenso.',
    },
    'tom-2021-02-11-00002': {
        'title_es': 'Cirros al viento',
        'category': 'paisajes',
        'tags': ['nubes', 'cielo', 'cirros'],
        'description_es': 'Cirros altos peinados por el viento en un cielo despejado.',
    },
    'tom-2022-02-12-00416': {
        'title_es': 'Martín pescador de pecho blanco',
        'category': 'aves',
        'tags': ['martin-pescador', 'kingfisher', 'asia', 'internacional'],
        'species_common_es': 'Martín pescador de pecho blanco',
        'species_common_en': 'White-throated kingfisher',
        'species_scientific': 'Halcyon smyrnensis',
        'country': '',  # internacional, completar
        'description_es': 'Martín pescador de pecho blanco posado en una rama, con el sol iluminando su plumaje turquesa.',
    },
    'tom-2022-02-17-00001': {
        'title_es': 'Ama Dablam y la cordillera del Khumbu',
        'category': 'paisajes',
        'tags': ['ama-dablam', 'himalaya', 'khumbu', 'nepal', 'cordillera', 'internacional'],
        'city': 'Tengboche',
        'region': 'Solukhumbu',
        'country': 'Nepal',
        'description_es': 'El Ama Dablam (derecha) junto a Lhotse, Nuptse y Everest, vistos desde el camino al campamento base, valle del Khumbu, Nepal.',
        'featured': True,
    },
    'tom-2022-05-14-00058': {
        'title_es': 'Estornino soberbio',
        'category': 'aves',
        'tags': ['estornino', 'africa', 'internacional'],
        'species_common_es': 'Estornino soberbio',
        'species_common_en': 'Superb starling',
        'species_scientific': 'Lamprotornis superbus',
        'country': '',  # África, completar
        'description_es': 'Estornino soberbio con su plumaje iridiscente y vientre naranja, ave característica de la sabana del este de África.',
    },
    'tom-2023-07-30-00907': {
        'title_es': 'Tagüita común',
        'category': 'aves',
        'tags': ['taguita', 'humedal', 'reflejo'],
        'species_common_es': 'Tagüita común',
        'species_common_en': 'Spot-flanked gallinule',
        'species_scientific': 'Porphyriops melanops',
        'description_es': 'Tagüita común inclinándose hacia el agua de un humedal, su reflejo simétrico sobre la superficie quieta.',
        'featured': True,
    },
    'tom-2023-08-06-00226': {
        'title_es': 'Ave entre cañas al atardecer',
        'category': 'aves',
        'tags': ['humedal', 'totora', 'atardecer'],
        'description_es': 'Pequeña ave posada sobre un brote de totora al atardecer, sol dorado en el fondo. Identificación de especie pendiente.',
    },
    'tom-2023-12-24-00074': {
        'title_es': 'Ventisquero Colgante de Queulat',
        'category': 'paisajes',
        'tags': ['ventisquero-colgante', 'queulat', 'aysen', 'glaciar', 'cascada', 'patagonia'],
        'city': 'Parque Nacional Queulat',
        'region': 'Aysén',
        'description_es': 'El Ventisquero Colgante de Queulat, con su agua derritiéndose en una cascada vertical sobre la pared de granito.',
        'featured': True,
    },
    'tom-2024-01-20-00290': {
        'title_es': 'Martín pescador grande en bosque sureño',
        'category': 'aves',
        'tags': ['martin-pescador', 'rio', 'bosque-templado', 'sur-de-chile'],
        'species_common_es': 'Martín pescador grande',
        'species_common_en': 'Ringed kingfisher',
        'species_scientific': 'Megaceryle torquata',
        'description_es': 'Martín pescador grande posado en una rama seca, con el bosque templado lluvioso como fondo.',
    },
    'tom-2024-02-04-00014': {
        'title_es': 'Ave acuática en arroyo',
        'category': 'aves',
        'tags': ['arroyo', 'rio-de-montaña', 'rocas'],
        'description_es': 'Ave acuática entre las piedras de un arroyo de montaña. Identificación de especie pendiente.',
    },
    'tom-2024-02-04-00027': {
        'title_es': 'Ave acuática, mirada',
        'category': 'aves',
        'tags': ['arroyo', 'rio-de-montaña', 'rocas'],
        'description_es': 'Misma escena, el ave mirando hacia la cámara con su ojo rojo destacando contra las piedras.',
    },
    'tom-2024-03-28-00015': {
        'title_es': 'Amanecer en Cerro Castillo',
        'category': 'paisajes',
        'tags': ['cerro-castillo', 'aysen', 'patagonia', 'amanecer', 'cordillera'],
        'city': 'Reserva Nacional Cerro Castillo',
        'region': 'Aysén',
        'description_es': 'Cielo en llamas sobre las agujas basálticas del Cerro Castillo, primera luz del día.',
        'featured': True,
    },
    'tom-2024-03-29-00031': {
        'title_es': 'Luna sobre la cordillera',
        'category': 'paisajes',
        'tags': ['carretera-austral', 'aysen', 'patagonia', 'luna', 'cordillera'],
        'region': 'Aysén',
        'description_es': 'Luna asomando entre nubes sobre los cerros nevados, vista desde la Carretera Austral.',
    },
    'tom-2024-03-29-00062': {
        'title_es': 'Isla bañada por rayos crepusculares',
        'category': 'paisajes',
        'tags': ['lago-general-carrera', 'aysen', 'patagonia', 'rayos-luz', 'isla'],
        'region': 'Aysén',
        'description_es': 'Rayos de luz se abren entre las nubes e iluminan una isla en medio del Lago General Carrera.',
        'featured': True,
    },
    'tom-2024-04-20-00167': {
        'title_es': 'Cordillera en otoño',
        'category': 'paisajes',
        'tags': ['cordillera', 'otoño', 'aysen', 'patagonia', 'lago', 'lenga'],
        'region': 'Aysén',
        'description_es': 'Cerros nevados sobre laderas de lenga en otoño con un lago en primer plano.',
    },
    'tom-2024-04-20-00241': {
        'title_es': 'Cordillera en otoño (II)',
        'category': 'paisajes',
        'tags': ['cordillera', 'otoño', 'aysen', 'patagonia', 'lago', 'lenga'],
        'region': 'Aysén',
        'description_es': 'Otra mirada de la misma cordillera en otoño, con la nieve marcando las crestas.',
    },
    'tom-2024-08-11-00060': {
        'title_es': 'Zorro entre el matorral',
        'category': 'paisajes',  # schema sólo permite aves/paisajes
        'tags': ['zorro', 'fauna', 'matorral'],
        'description_es': 'Zorro observando entre el matorral seco, su pelaje rojizo casi se camufla con las ramas.',
    },
    'tom-2024-08-17-00218': {
        'title_es': 'Cóndores en pared',
        'category': 'aves',
        'tags': ['condor', 'cordillera', 'vuelo', 'andes'],
        'species_common_es': 'Cóndor andino',
        'species_common_en': 'Andean condor',
        'species_scientific': 'Vultur gryphus',
        'description_es': 'Dos cóndores andinos surcando el aire frente a una pared rocosa, con el collar blanco característico.',
        'featured': True,
    },
}


def update_md(slug: str, meta: dict) -> None:
    path = ROOT / 'src' / 'content' / 'photos' / f'{slug}.md'
    if not path.exists():
        print(f'  ⚠ no existe: {slug}')
        return
    c = path.read_text(encoding='utf-8')

    # Eliminar comentario "# COMPLETAR..."
    c = re.sub(r'^# COMPLETAR:.*\n', '', c, flags=re.M)

    # title_es
    c = re.sub(r'^title_es:\s*".*"',
               f'title_es: "{meta["title_es"]}"', c, flags=re.M)

    # category
    c = re.sub(r'^category:.*$', f'category: {meta["category"]}', c, flags=re.M)

    # tags
    tags_str = ', '.join(meta.get('tags', []))
    c = re.sub(r'^tags:.*$', f'tags: [{tags_str}]', c, flags=re.M)

    if meta['category'] == 'paisajes':
        # Quitar bloque de especies (3 líneas + comentario)
        c = re.sub(
            r'\n# Solo aves[^\n]*\nspecies_common_es:.*\nspecies_common_en:.*\nspecies_scientific:.*\n',
            '\n',
            c
        )
    else:
        if 'species_common_es' in meta:
            c = re.sub(r'^species_common_es:\s*".*"',
                       f'species_common_es: "{meta["species_common_es"]}"', c, flags=re.M)
        if 'species_common_en' in meta:
            c = re.sub(r'^species_common_en:\s*".*"',
                       f'species_common_en: "{meta["species_common_en"]}"', c, flags=re.M)
        if 'species_scientific' in meta:
            c = re.sub(r'^species_scientific:\s*".*"',
                       f'species_scientific: "{meta["species_scientific"]}"', c, flags=re.M)
        # Limpiar comentario de "borra estas 3 líneas..."
        c = re.sub(r'^# Solo aves[^\n]*\n', '', c, flags=re.M)

    # location
    if 'city' in meta:
        c = re.sub(r'^(\s+city:\s*)".*"', f'\\1"{meta["city"]}"', c, flags=re.M)
    if 'region' in meta:
        c = re.sub(r'^(\s+region:\s*)".*"', f'\\1"{meta["region"]}"', c, flags=re.M)
    if 'country' in meta:
        c = re.sub(r'^(\s+country:\s*)".*"', f'\\1"{meta["country"]}"', c, flags=re.M)

    # description_es
    if 'description_es' in meta:
        c = re.sub(r'^description_es:\s*".*"',
                   f'description_es: "{meta["description_es"]}"', c, flags=re.M)

    # featured
    if meta.get('featured'):
        c = re.sub(r'^featured:\s*(true|false)', 'featured: true', c, flags=re.M)

    path.write_text(c, encoding='utf-8')
    print(f'  ✓ {slug}: {meta["category"]} · "{meta["title_es"]}"')


print(f'Actualizando {len(DETECTIONS)} fotos...\n')
for slug, meta in DETECTIONS.items():
    update_md(slug, meta)
print(f'\n✓ {len(DETECTIONS)}/{len(DETECTIONS)} actualizadas')
