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

    # ── Lote final: 27 detecciones nuevas ──────────────────────────────

    'tom-2024-09-16-00252': {
        'title_es': 'Golondrina chilena en baranda',
        'category': 'aves',
        'tags': ['golondrina', 'humedal', 'primavera'],
        'species_common_es': 'Golondrina chilena',
        'species_common_en': 'Chilean swallow',
        'species_scientific': 'Tachycineta meyeni',
        'description_es': 'Golondrina chilena posada sobre una baranda blanca, mostrando el dorso azul iridiscente y el vientre blanco contra un fondo de agua y cielo.',
    },
    'tom-2024-09-16-00255': {
        'title_es': 'Golondrina chilena (II)',
        'category': 'aves',
        'tags': ['golondrina', 'humedal', 'primavera'],
        'species_common_es': 'Golondrina chilena',
        'species_common_en': 'Chilean swallow',
        'species_scientific': 'Tachycineta meyeni',
        'description_es': 'Otra postura del mismo individuo, ahora con el cuerpo girado y la cabeza ligeramente levantada.',
    },
    'tom-2024-10-06-00001': {
        'title_es': 'Pequeño paseriforme entre ramas',
        'category': 'aves',
        'tags': ['paseriforme', 'bosque', 'primavera-temprana', 'luz-calida'],
        'description_es': 'Pequeño paseriforme posado entre ramas todavía sin hojas, iluminado por luz cálida de fin de día. Identificación de especie pendiente.',
    },
    'tom-2024-10-12-00020': {
        'title_es': 'Pesca con mosca en río de bosque',
        'category': 'paisajes',
        'tags': ['pesca-con-mosca', 'rio', 'bosque-templado', 'sur-de-chile'],
        'description_es': 'Un pescador hace casting de mosca sobre un río ancho y verde, enmarcado por la espesura del bosque templado del sur.',
    },
    'tom-2024-10-12-00036': {
        'title_es': 'Martín pescador grande, macho',
        'category': 'aves',
        'tags': ['martin-pescador', 'rio', 'bosque-templado', 'sur-de-chile'],
        'species_common_es': 'Martín pescador grande',
        'species_common_en': 'Ringed kingfisher',
        'species_scientific': 'Megaceryle torquata',
        'description_es': 'Macho de martín pescador grande sobre una rama fina, con el pecho completamente castaño y el collar blanco característicos.',
        'featured': True,
    },
    'tom-2024-10-12-00105': {
        'title_es': 'Martín pescador grande, hembra',
        'category': 'aves',
        'tags': ['martin-pescador', 'rio', 'bosque-templado', 'sur-de-chile'],
        'species_common_es': 'Martín pescador grande',
        'species_common_en': 'Ringed kingfisher',
        'species_scientific': 'Megaceryle torquata',
        'description_es': 'Hembra de martín pescador grande, con la banda pectoral azul ribeteada en blanco y el vientre castaño.',
        'featured': True,
    },
    'tom-2024-11-01-00000': {
        'title_es': 'Camino a la cordillera bajo nubes',
        'category': 'paisajes',
        'tags': ['aysen', 'patagonia', 'cordillera', 'camino-rural', 'nubes', 'primavera'],
        'region': 'Aysén',
        'description_es': 'Un camino de tierra se abre hacia una cordillera dentada todavía con nieve, bajo un cielo cargado de nubes en primavera austral.',
        'featured': True,
    },
    'tom-2024-11-17-00010': {
        'title_es': 'Pitío sobre poste',
        'category': 'aves',
        'tags': ['pitio', 'carpintero', 'bosque', 'sur-de-chile'],
        'species_common_es': 'Pitío',
        'species_common_en': 'Chilean flicker',
        'species_scientific': 'Colaptes pitius',
        'description_es': 'Pitío posado sobre un poste de madera, con el barrado denso del cuerpo y el ojo amarillo encendido.',
        'featured': True,
    },
    'tom-2024-11-17-00047': {
        'title_es': 'Pitío de perfil',
        'category': 'aves',
        'tags': ['pitio', 'carpintero', 'bosque', 'sur-de-chile'],
        'species_common_es': 'Pitío',
        'species_common_en': 'Chilean flicker',
        'species_scientific': 'Colaptes pitius',
        'description_es': 'El mismo pitío de perfil, con la cola apoyada sobre el poste y la cabeza girada hacia un lado.',
    },
    'tom-2025-04-12-00128': {
        'title_es': 'Búho de anteojos en el dosel',
        'category': 'aves',
        'tags': ['buho', 'bosque-tropical', 'costa-rica', 'internacional'],
        'species_common_es': 'Búho de anteojos',
        'species_common_en': 'Spectacled owl',
        'species_scientific': 'Pulsatrix perspicillata',
        'country': 'Costa Rica',
        'description_es': 'Búho de anteojos descansando en el dosel del bosque tropical, con el característico antifaz blanco que rodea sus ojos amarillos.',
        'featured': True,
    },
    'tom-2025-04-12-00273': {
        'title_es': 'Cocodrilo americano en la orilla',
        'category': 'paisajes',
        'tags': ['cocodrilo', 'fauna', 'rio-tropical', 'costa-rica', 'internacional'],
        'country': 'Costa Rica',
        'description_es': 'Cocodrilo americano descansando en la orilla fangosa de un río tropical, casi fundido con el lodo.',
    },
    'tom-2025-04-14-00135': {
        'title_es': 'Iguana verde, perfil',
        'category': 'paisajes',
        'tags': ['iguana', 'reptil', 'fauna', 'bosque-tropical', 'costa-rica', 'internacional'],
        'country': 'Costa Rica',
        'description_es': 'Iguana verde de perfil sobre un tronco, mostrando la cresta dorsal y las escamas claras de la cabeza.',
    },
    'tom-2025-04-15-00096': {
        'title_es': 'Perezoso de dos dedos, mirada desde abajo',
        'category': 'paisajes',
        'tags': ['perezoso', 'fauna', 'bosque-tropical', 'costa-rica', 'internacional'],
        'country': 'Costa Rica',
        'description_es': 'Perezoso de dos dedos de Hoffmann colgado entre ramas de palmera, visto desde abajo con su pelaje rubio iluminado por un rayo de sol que se cuela en el dosel.',
    },
    'tom-2025-04-15-00099': {
        'title_es': 'Perezoso colgado en la palmera',
        'category': 'paisajes',
        'tags': ['perezoso', 'fauna', 'bosque-tropical', 'costa-rica', 'internacional'],
        'country': 'Costa Rica',
        'description_es': 'Otra mirada del mismo perezoso de dos dedos de Hoffmann, completamente entregado al descanso entre el follaje tropical.',
        'featured': True,
    },
    'tom-2025-04-17-00331': {
        'title_es': 'Quetzal resplandeciente',
        'category': 'aves',
        'tags': ['quetzal', 'bosque-nuboso', 'costa-rica', 'internacional'],
        'species_common_es': 'Quetzal resplandeciente',
        'species_common_en': 'Resplendent quetzal',
        'species_scientific': 'Pharomachrus mocinno',
        'country': 'Costa Rica',
        'description_es': 'Macho de quetzal resplandeciente sobre una rama cubierta de musgo, con sus larguísimas plumas caudales colgando como cintas verdes entre el bosque nuboso.',
        'featured': True,
    },
    'tom-2025-04-17-00443': {
        'title_es': 'Quetzal entre el bosque nuboso',
        'category': 'aves',
        'tags': ['quetzal', 'bosque-nuboso', 'costa-rica', 'internacional'],
        'species_common_es': 'Quetzal resplandeciente',
        'species_common_en': 'Resplendent quetzal',
        'species_scientific': 'Pharomachrus mocinno',
        'country': 'Costa Rica',
        'description_es': 'El mismo quetzal asomando entre el follaje denso, dejando ver el pecho rojo y el verde iridiscente del dorso.',
    },
    'tom-2025-04-17-00478': {
        'title_es': 'Colibrí orejivioleta menor',
        'category': 'aves',
        'tags': ['colibri', 'bosque-nuboso', 'costa-rica', 'internacional'],
        'species_common_es': 'Colibrí orejivioleta menor',
        'species_common_en': 'Lesser violetear',
        'species_scientific': 'Colibri cyanotus',
        'country': 'Costa Rica',
        'description_es': 'Colibrí orejivioleta menor posado sobre una ramita, mostrando el parche violeta de la mejilla contra el verde iridiscente del cuerpo.',
        'featured': True,
    },
    'tom-2025-04-17-00489': {
        'title_es': 'Brillante coroniverde',
        'category': 'aves',
        'tags': ['colibri', 'bosque-nuboso', 'costa-rica', 'internacional'],
        'species_common_es': 'Brillante coroniverde',
        'species_common_en': 'Green-crowned brilliant',
        'species_scientific': 'Heliodoxa jacula',
        'country': 'Costa Rica',
        'description_es': 'Brillante coroniverde sobre una rama delgada, con el pecho moteado y la postura erguida característica de la especie.',
        'featured': True,
    },
    'tom-2025-05-03-00011': {
        'title_es': 'Loica cantando',
        'category': 'aves',
        'tags': ['loica', 'pradera', 'patagonia', 'aysen', 'otoño'],
        'species_common_es': 'Loica común',
        'species_common_en': 'Long-tailed meadowlark',
        'species_scientific': 'Leistes loyca',
        'region': 'Aysén',
        'description_es': 'Macho de loica común cantando con el pecho rojo encendido, posado sobre un poste de cerca al final de la tarde.',
        'featured': True,
    },
    'tom-2025-05-03-00083': {
        'title_es': 'Rapaz sobre el bosque de lenga en otoño',
        'category': 'paisajes',
        'tags': ['otoño', 'lenga', 'bosque-andino-patagonico', 'rapaz', 'aysen', 'patagonia'],
        'region': 'Aysén',
        'description_es': 'Una rapaz cruza el frente de una ladera teñida de naranjos y rojos por el bosque de lenga en pleno otoño.',
        'featured': True,
    },
    'tom-2025-05-03-00121': {
        'title_es': 'Vuelo sobre el otoño',
        'category': 'paisajes',
        'tags': ['otoño', 'lenga', 'bosque-andino-patagonico', 'rapaz', 'aysen', 'patagonia'],
        'region': 'Aysén',
        'description_es': 'La rapaz cruza ahora más cerca, las alas extendidas contra el tapiz de lenga ya encendido.',
    },
    'tom-2025-05-03-00123': {
        'title_es': 'Rapaz frente a la lenga',
        'category': 'paisajes',
        'tags': ['otoño', 'lenga', 'bosque-andino-patagonico', 'rapaz', 'aysen', 'patagonia'],
        'region': 'Aysén',
        'description_es': 'La misma rapaz a media ladera, con los colores del otoño austral cubriendo el fondo entero.',
    },
    'tom-2025-05-03-00149': {
        'title_es': 'Aguilucho con alas extendidas',
        'category': 'aves',
        'tags': ['aguilucho', 'rapaz', 'vuelo', 'aysen', 'patagonia'],
        'species_common_es': 'Aguilucho común',
        'species_common_en': 'Variable hawk',
        'species_scientific': 'Geranoaetus polyosoma',
        'region': 'Aysén',
        'description_es': 'Aguilucho común visto desde abajo con las alas completamente abiertas y la cola desplegada en abanico contra el cielo blanco.',
        'featured': True,
    },
    'tom-2025-05-03-00150': {
        'title_es': 'Aguilucho mirando al fotógrafo',
        'category': 'aves',
        'tags': ['aguilucho', 'rapaz', 'vuelo', 'aysen', 'patagonia'],
        'species_common_es': 'Aguilucho común',
        'species_common_en': 'Variable hawk',
        'species_scientific': 'Geranoaetus polyosoma',
        'region': 'Aysén',
        'description_es': 'El mismo aguilucho un instante después, con las patas extendidas y la mirada fija en la cámara.',
    },
    'tom-2025-05-03-00152': {
        'title_es': 'Aguilucho, alas plenas',
        'category': 'aves',
        'tags': ['aguilucho', 'rapaz', 'vuelo', 'aysen', 'patagonia'],
        'species_common_es': 'Aguilucho común',
        'species_common_en': 'Variable hawk',
        'species_scientific': 'Geranoaetus polyosoma',
        'region': 'Aysén',
        'description_es': 'Otra captura del mismo aguilucho con las primarias bien separadas y la cola en abanico.',
    },
    'tom-2025-11-02-00203': {
        'title_es': 'Rayador cortando el agua',
        'category': 'aves',
        'tags': ['rayador', 'humedal-costero', 'pesca-en-vuelo'],
        'species_common_es': 'Rayador',
        'species_common_en': 'Black skimmer',
        'species_scientific': 'Rynchops niger',
        'description_es': 'Rayador rozando la superficie del agua con el pico inferior abierto, dejando una estela fina sobre el espejo del estuario.',
        'featured': True,
    },
    'tom-2025-11-02-00513': {
        'title_es': 'Perritos en vuelo sobre el mar',
        'category': 'aves',
        'tags': ['perrito', 'cigueñuela', 'humedal-costero', 'vuelo'],
        'species_common_es': 'Perrito o cigüeñuela',
        'species_common_en': 'White-backed stilt',
        'species_scientific': 'Himantopus melanurus',
        'description_es': 'Dos perritos en formación cerrada sobre el mar, las patas rojas extendidas hacia atrás como largas líneas de color.',
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
