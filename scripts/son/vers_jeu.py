"""Encode les sons du jeu dans assets/son/ (.ogg, et .m4a pour Safari) et écrit leur table dans js/son.js.

À lancer depuis scripts/son/ après musique.py, sons1.py et sons2.py (voir fabrique.py)."""
import os, subprocess, glob, json
M1 = MM = '_sortie/pack/masters_wav'; M2 = '_sortie/pack2/audio'
REC = 'enregistrements'; BETES = '_sortie/betes'   # les vrais enregistrements ; betes.py
DEST = '../../assets/son'
def g(pat):
    r = sorted(glob.glob(pat)); assert r, pat; return r
# clé du jeu → (dossier, fichiers sources)
T = {
 # musique
 'musique_matin': ('musique', g(f'{M1}/music/morning_theme.wav')),
 'musique_soir': ('musique', g(f'{M1}/music/evening_theme.wav')),
 'musique_nuit': ('musique', g(f'{M1}/music/night_theme.wav')),
 'musique_mine': ('musique', g(f'{MM}/music/mine_theme.wav')),
 # ambiances (boucles)
 'oiseaux_matin': ('ambiance', g(f'{M1}/ambient/birds_morning_01.wav')),
 'oiseaux_jour': ('ambiance', g(f'{M1}/ambient/birds_day_01.wav')),
 'grillons_soir': ('ambiance', g(f'{M1}/ambient/crickets_dusk_01.wav')),
 'grillons_nuit': ('ambiance', g(f'{M1}/ambient/crickets_night_01.wav')),
 'vent': ('ambiance', g(f'{M1}/ambient/wind_light.wav')),
 'grenouilles': ('ambiance', g(f'{M2}/ambient/frogs_night_01.wav')),
 'mer': ('ambiance', g(f'{M2}/ambient/sea_loop.wav')),
 'lac': ('ambiance', g(f'{M2}/ambient/lake_loop.wav')),
 'riviere': ('ambiance', g(f'{M1}/environment/stream_loop.wav')),
 'foret': ('ambiance', g(f'{M2}/ambient/forest_loop.wav')),
 'montagne': ('ambiance', g(f'{M2}/ambient/mountain_wind_loop.wav')),
 'hameau': ('ambiance', g(f'{M2}/ambient/village_loop.wav')),
 'grotte': ('ambiance', g(f'{M2}/ambient/cave_loop.wav')),
 'abeilles': ('ambiance', g(f'{M2}/ambient/bees_loop.wav')),
 'moulin': ('ambiance', g(f'{M1}/environment/mill_loop.wav')),
 'feu': ('ambiance', g(f'{M2}/environment/fire_loop.wav')),
 'asperseur': ('ambiance', g(f'{M2}/environment/sprinkler_loop.wav')),
 'pompe': ('ambiance', g(f'{M2}/environment/pump_loop.wav')),
 'robot': ('ambiance', g(f'{M2}/environment/robot_loop.wav')),
 'pedalier': ('ambiance', g(f'{M2}/sfx/world/pedal_loop.wav')),
 'moulinet': ('ambiance', g(f'{M2}/sfx/fishing/reel_loop.wav')),
 # cris ponctuels
 'oiseau': ('nature', g(f'{M1}/ambient/oneshots/bird_call_*.wav')),
 'chouette': ('nature', g(f'{M1}/ambient/oneshots/owl_01.wav')),
 # les bêtes de la ferme : de vrais enregistrements libres de droits (enregistrements/credits.json)
 'poule': ('animaux', g(f'{REC}/poule_*.flac')),
 'poussins': ('animaux', g(f'{REC}/poussins_*.flac')),
 'vache': ('animaux', g(f'{REC}/vache_*.flac')),
 'clochette': ('animaux', g(f'{REC}/clochette.flac')),
 'mouton': ('animaux', g(f'{REC}/mouton_*.flac') + g(f'{REC}/agneau_*.flac')),
 'coq': ('animaux', g(f'{BETES}/coq_*.wav')),
 'fond_poulailler': ('ambiance', g(f'{BETES}/fond_poulailler.wav')),
 'fond_etable': ('ambiance', g(f'{BETES}/fond_etable.wav')),
 'fond_bergerie': ('ambiance', g(f'{BETES}/fond_bergerie.wav')),
 'chat': ('animaux', g(f'{M2}/sfx/animals/cat_0*.wav')),
 'ronron': ('animaux', g(f'{M2}/sfx/animals/cat_purr_*.wav')),
 'chien': ('animaux', g(f'{M2}/sfx/animals/dog_*.wav')),
 'cheval': ('animaux', g(f'{REC}/cheval_[123].flac')),          # deux hennissements, un petit rire grave
 'ebrouement': ('animaux', g(f'{REC}/cheval_[45].flac')),       # il s'ébroue, il souffle
 'sabots_herbe': ('animaux', g(f'{BETES}/sabots_herbe_*.wav')),
 'sabots_terre': ('animaux', g(f'{BETES}/sabots_terre_*.wav')),
 'sabots_pierre': ('animaux', g(f'{BETES}/sabots_pierre_*.wav')),
 'oeuf': ('animaux', g(f'{M2}/sfx/animals/egg_*.wav')),
 'lait': ('animaux', g(f'{M2}/sfx/animals/milk_*.wav')),
 'tonte': ('animaux', g(f'{M2}/sfx/animals/shear_*.wav')),
 'grain': ('animaux', g(f'{M2}/sfx/animals/feed_*.wav')),
 'aigle': ('faune', g(f'{M2}/sfx/wildlife/eagle_*.wav')),
 'cygne': ('faune', g(f'{M2}/sfx/wildlife/swan_*.wav')),
 'ecureuil': ('faune', g(f'{M2}/sfx/wildlife/squirrel_*.wav')),
 'marmotte': ('faune', g(f'{M2}/sfx/wildlife/marmot_*.wav')),
 'dauphin': ('faune', g(f'{M2}/sfx/wildlife/dolphin_*.wav')),
 'lievre': ('faune', g(f'{M2}/sfx/wildlife/hare_*.wav')),
 'bouquetin': ('faune', g(f'{M2}/sfx/wildlife/ibex_*.wav')),
 # gestes
 'hache': ('outils', g(f'{M1}/sfx/tools/axe_wood_*.wav')),
 'arbre_tombe': ('outils', g(f'{M1}/sfx/tools/tree_fall_*.wav')),
 'pioche': ('outils', g(f'{M1}/sfx/tools/pickaxe_stone_*.wav')),
 'pioche_minerai': ('outils', g(f'{M1}/sfx/tools/pickaxe_ore_*.wav')),
 'coup_vide': ('outils', g(f'{M1}/sfx/tools/pickaxe_miss_*.wav')),
 'houe': ('outils', g(f'{M2}/sfx/tools/hoe_*.wav')),
 'faux': ('outils', g(f'{M2}/sfx/tools/scythe_*.wav')),
 'semis': ('outils', g(f'{M2}/sfx/tools/sow_*.wav')),
 'arrosage': ('outils', g(f'{M1}/sfx/tools/watering_*.wav')),
 'remplir': ('outils', g(f'{M2}/sfx/tools/water_fill_*.wav')),
 'recolte': ('outils', g(f'{M1}/sfx/harvest/harvest_leaf_*.wav')),
 'arracher': ('outils', g(f'{M1}/sfx/harvest/harvest_root_*.wav')),
 'pris_pierre': ('ramasser', g(f'{M2}/sfx/pickup/stone_*.wav')),
 'pris_bois': ('ramasser', g(f'{M2}/sfx/pickup/wood_*.wav')),
 'pris_herbe': ('ramasser', g(f'{M2}/sfx/pickup/herb_*.wav')),
 'pris_minerai': ('ramasser', g(f'{M2}/sfx/pickup/ore_*.wav')),
 'gain': ('ramasser', g(f'{M1}/sfx/harvest/collect_*.wav')),
 'lancer': ('peche', g(f'{M2}/sfx/fishing/cast_*.wav')),
 'plouf': ('peche', g(f'{M2}/sfx/fishing/plop_*.wav')),
 'touche': ('peche', g(f'{M2}/sfx/fishing/bite_*.wav')),
 'prise': ('peche', g(f'{M2}/sfx/fishing/catch_*.wav')),
 'rate': ('peche', g(f'{M2}/sfx/fishing/miss_*.wav')),
 'pose_bois': ('chantier', g(f'{M2}/sfx/build/place_wood_*.wav')),
 'pose_pierre': ('chantier', g(f'{M2}/sfx/build/place_stone_*.wav')),
 'pose_metal': ('chantier', g(f'{M2}/sfx/build/place_metal_*.wav')),
 'retrait': ('chantier', g(f'{M2}/sfx/build/remove_*.wav')),
 'porte_ouvre': ('chantier', g(f'{M1}/sfx/doors/door_open_*.wav')),
 'porte_ferme': ('chantier', g(f'{M1}/sfx/doors/door_close_*.wav')),
 'botteleuse': ('machines', g(f'{M2}/sfx/machines/baler_*.wav')),
 'silo': ('machines', g(f'{M2}/sfx/machines/grain_*.wav')),
 'echelle': ('monde', g(f'{M2}/sfx/world/ladder_*.wav')),
 'sonnette': ('monde', g(f'{M2}/sfx/world/tricycle_bell_*.wav')),
 'dodo': ('monde', g(f'{M2}/sfx/world/sleep_*.wav')),
 # pas
 **{f'pas_{fr}': ('pas', g(f'{src}/sfx/footsteps/{en}_*.wav')) for fr, en, src in (
     ('herbe', 'grass', M1), ('terre', 'dirt', M1), ('pierre', 'stone', M1), ('bois', 'wood', M1),
     ('sable', 'sand', M2), ('eau', 'water', M2), ('feuilles', 'leaves', M2))},
 # interface
 'ouvre': ('interface', g(f'{M2}/sfx/ui/open_*.wav')),
 'ferme': ('interface', g(f'{M2}/sfx/ui/close_*.wav')),
 'onglet': ('interface', g(f'{M2}/sfx/ui/tab_*.wav')),
 'erreur': ('interface', g(f'{M2}/sfx/ui/error_*.wav')),
 'info': ('interface', g(f'{M2}/sfx/ui/toast_info_*.wav')),
 'reussite': ('interface', g(f'{M2}/sfx/ui/toast_success_*.wav')),
 'alerte': ('interface', g(f'{M2}/sfx/ui/toast_alert_*.wav')),
 'pieces': ('interface', g(f'{M2}/sfx/ui/coins_*.wav')),
 'fabrique': ('interface', g(f'{M2}/sfx/ui/craft_done_*.wav')),
 'cuisine': ('interface', g(f'{M2}/sfx/ui/cook_done_*.wav')),
 'niveau': ('interface', g(f'{M2}/sfx/ui/level_up_*.wav')),
 'chapitre': ('interface', g(f'{M2}/sfx/ui/chapter_done_*.wav')),
 'techno': ('interface', g(f'{M2}/sfx/ui/tech_unlock_*.wav')),
 'decouverte': ('interface', g(f'{M2}/sfx/ui/discovery_*.wav')),
 'cloche': ('interface', g(f'{M2}/sfx/ui/dinner_bell_*.wav')),
 'nouveau_jour': ('interface', g(f'{M2}/sfx/ui/new_day_*.wav')),
 'retour': ('interface', g(f'{M2}/sfx/ui/welcome_back_*.wav')),
}
if os.path.isdir(DEST):
    subprocess.run(['rm', '-rf', DEST])
table = {}
for key, (folder, srcs) in T.items():
    files = []
    for i, src in enumerate(srcs):
        base = key if len(srcs) == 1 else f'{key}_{i+1}'
        rel = f'{folder}/{base}'
        out = f'{DEST}/{rel}'
        os.makedirs(os.path.dirname(out), exist_ok=True)
        q, br = {'musique': ('3', '96k'), 'ambiance': ('1', '64k')}.get(folder, ('3', '72k'))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-c:a', 'libvorbis', '-q:a', q, out + '.ogg'], check=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-c:a', 'aac', '-b:a', br, out + '.m4a'], check=True)
        files.append(rel)
    table[key] = files
# les crédits des enregistrements (CC BY et CC BY-SA demandent de citer l'auteur)
cred = json.load(open(f'{REC}/credits.json', encoding='utf-8'))
lignes = ['# Crédits des sons', '', "Tous les sons du jeu sont synthétisés par scripts/son/, sauf ces vrais enregistrements d'animaux,",
          'libres de droits, trouvés dans des jeux libres qui documentent leur provenance (Stendhal, VoxeLibre, 0 A.D.).',
          'CC0 et domaine public : aucune obligation. CC BY : citer l\'auteur. CC BY-SA : citer l\'auteur, et le fichier',
          '(et ses modifications) reste sous CC BY-SA (https://creativecommons.org/licenses/by-sa/3.0/).', '',
          '| Fichier du jeu | Son | Auteur | Licence | Source |', '|---|---|---|---|---|']
for cle, (dossier, srcs) in T.items():
    for i, src in enumerate(srcs):
        nom = os.path.basename(src).rsplit('.', 1)[0]
        if src.startswith(REC) and nom in cred:
            c = cred[nom]; base = cle if len(srcs) == 1 else f'{cle}_{i+1}'
            lignes.append(f"| {dossier}/{base} | {c['titre']} | {c['auteur']} | {c['licence']} | {c['source']} |")
open(f'{DEST}/CREDITS.md', 'w', encoding='utf-8').write('\n'.join(lignes) + '\n')

# la table des fichiers, dans js/son.js (entre « const FICHIERS = { » et « }; »)
JS = '../../js/son.js'
corps = '{\n' + ',\n'.join(f'    {k}: {json.dumps(v)}' for k, v in table.items()) + ',\n  }'
src = open(JS, encoding='utf-8').read()
debut = src.index('const FICHIERS = ') + len('const FICHIERS = ')
fin = src.index('\n  };', debut) + len('\n  }')
open(JS, 'w', encoding='utf-8').write(src[:debut] + corps + src[fin:])
print(len(table), 'clés', sum(len(v) for v in table.values()), 'fichiers')
