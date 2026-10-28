"""Les enregistrements libres (CC0) de l'arrosoir, de la hulotte, de la grenouille, du chat, du chien et du coq : téléchargés,
coupés, égalisés.

- l'arrosoir : « Watering with a Watering Can » de Bricklover sur Freesound (CC0). L'original
  (MP3) demande un compte : on prend l'aperçu de haute qualité que Freesound publie (Ogg 192 kb/s),
  bien assez pour un bruit d'une seconde et demie ;
- la hulotte, la grenouille, le chat, le chien et le coq : BigSoundBank (https://bigsoundbank.com, Joseph Sardin et quelques
  contributeurs), qui publie ses prises de son sous CC0, en AIFF sans perte.

CC0 : aucune obligation ; les auteurs sont tout de même cités dans assets/son/CREDITS.md. Pour
chaque son du jeu, ce script :
1. télécharge l'enregistrement dans _sortie/libres/ (une fois) ;
2. le décode en mono 44,1 kHz, coupe les grondements (passe-haut) ;
3. garde les passages choisis à l'écoute (COUPES, en secondes dans l'original), recollés par un
   fondu de 30 ms : pour la hulotte, le long silence entre le premier « hou » et la suite est
   raccourci, le chant reste entier ;
4. pose un fondu d'entrée et de sortie, et égalise le volume : la tranche de 100 ms la plus forte
   au niveau voulu (dB RMS, comme les sons voisins du jeu), les crêtes arrondies sous 0,95 ;
5. écrit enregistrements/<nom>.flac et sa ligne dans enregistrements/credits.json.

vers_jeu.py les encode ensuite comme les autres sons (voir docs/son.md).

Usage : python3 libres.py [noms…]   (défaut : tous)
"""
import json, os, subprocess, sys
import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
SR = 44100
CACHE = os.path.join(ICI, '_sortie', 'libres')
REC = os.path.join(ICI, 'enregistrements')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

ARROSOIR = dict(url='https://cdn.freesound.org/previews/532/532890_8919922-hq.ogg',
                source='https://freesound.org/people/Bricklover/sounds/532890/', auteur='Bricklover (Freesound)',
                titre="Arrosoir versé sur la terre", fondus=(0.06, 0.5), niveau=-17, passe_haut=120)
def bsb(n, page, auteur, titre, coupes, fondus, niveau):
    return dict(url=f'https://bigsoundbank.com/UPLOAD/aiff/{n}.aiff', source='https://bigsoundbank.com/' + page,
                auteur=auteur + ' (BigSoundBank)', titre=titre, coupes=coupes, fondus=fondus, niveau=niveau, passe_haut=60)

# nom du fichier → l'enregistrement (url, page), auteur, titre, passages gardés et fondus (s), niveau (dB), passe-haut (Hz)
SONS = {
    # l'arrosoir de la cruche : trois moments d'un même versé, le premier avec l'eau qui part
    'arrosage_1': dict(ARROSOIR, coupes=[(0.75, 2.15)], fondus=(0.01, 0.5), niveau=-15),
    'arrosage_2': dict(ARROSOIR, coupes=[(4.2, 5.6)]),
    'arrosage_3': dict(ARROSOIR, coupes=[(7.0, 8.4)]),
    # la hulotte (Strix aluco), la nuit : deux chants entiers, deux « hou » seuls
    'hibou_1': bsb('1763', 'tawny-owl-1-s1763.html', 'Joseph Sardin', "Hulotte : « hou… » puis « hou-hou-houuu »",
                   [(0.1, 1.9), (3.9, 7.8)], (0.02, 0.3), -12),
    'hibou_2': bsb('1764', 'tawny-owl-2-s1764.html', 'Joseph Sardin', "Hulotte : « hou… » puis « hou-hou-houuu »",
                   [(0.0, 1.9), (3.9, 7.5)], (0.02, 0.3), -12),
    'hibou_3': bsb('3459', 'tawny-owl-3-s3459.html', 'Le tiroir du fond', "Hulotte : un « houuu » seul",
                   [(0.0, 1.31)], (0.02, 0.1), -14),
    'hibou_4': bsb('3460', 'tawny-owl-4-s3460.html', 'Le tiroir du fond', "Hulotte : un « hou-houuu » qui monte",
                   [(0.0, 1.37)], (0.02, 0.1), -14),
    # la grenouille près des mares, la nuit : une boucle (le jeu la répète), coupée de silence à
    # silence pour que la reprise ne s'entende pas, au niveau de l'ancienne boucle synthétisée
    'grenouilles': bsb('0819', 'one-frog-s0819.html', 'Joseph Sardin', "Une grenouille qui chante près d'une petite mare, la nuit",
                   [(1.2, 12.6)], (0.02, 0.02), -21),
    # le chat de la famille : trois miaulements d'un même chat domestique, pris de près dans une pièce
    # calme (le fond est à plus de 50 dB sous le cri), au niveau des bêtes de la ferme
    'chat_1': bsb('1902', 'meow-cat-14-s1902.html', 'Joseph Sardin', "Chat domestique : un « miaou » qui demande",
                  [(0.07, 1.75)], (0.02, 0.3), -15),
    'chat_2': bsb('1890', 'meow-cat-2-s1890.html', 'Joseph Sardin', "Chat domestique : un petit roulement, puis « miaou »",
                  [(0.05, 2.2)], (0.02, 0.2), -15),
    'chat_3': bsb('1889', 'meow-cat-1-s1889.html', 'Joseph Sardin', "Chat domestique : un long « miaaou »",
                  [(1.29, 2.95)], (0.01, 0.2), -15),
    # le chien de la famille : un chien de traîneau, seul, enregistré dehors (un chien de travail, pas
    # un molosse) : deux « wouf-wouf » et un aboiement seul, au niveau des bêtes de la ferme
    'chien_1': bsb('2954', 'barking-dog-2-s2954.html', 'Joseph Sardin', "Chien de traîneau, seul dehors : deux aboiements",
                   [(0.03, 0.95)], (0.01, 0.3), -14),
    'chien_2': bsb('2954', 'barking-dog-2-s2954.html', 'Joseph Sardin', "Chien de traîneau, seul dehors : un aboiement",
                   [(4.99, 5.70)], (0.01, 0.25), -14),
    'chien_3': bsb('2954', 'barking-dog-2-s2954.html', 'Joseph Sardin', "Chien de traîneau, seul dehors : deux aboiements",
                   [(11.74, 12.70)], (0.01, 0.3), -14),
    # le coq du réveil (6 h) : un « cocorico » entier ; un peu plus fort que les autres bêtes, le
    # chant d'un coq porte loin
    'coq_1': bsb('0283', 'song-of-rooster-s0283.html', 'Joseph Sardin', "Coq : un cocorico franc, de près",
                 [(0.0, 2.2)], (0.01, 0.3), -11),
}


def original(o):
    """L'enregistrement (téléchargé une fois), décodé en mono 44,1 kHz, sans grondement."""
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, o['url'].rsplit('/', 1)[1])
    if not os.path.exists(f):
        subprocess.run(['curl', '-sSf', '-m', '120', '-A', UA, '-o', f, o['url']], check=True)
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-af', f"highpass=f={o['passe_haut']}",
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(float)


def recolle(x, coupes, xf=0.03):
    """Les passages gardés, bout à bout, chaque raccord en fondu enchaîné."""
    k = int(xf * SR)
    out = x[int(coupes[0][0] * SR):int(coupes[0][1] * SR)].copy()
    for a, b in coupes[1:]:
        s = x[int(a * SR):int(b * SR)]
        r = np.linspace(0, 1, k)
        out[-k:] = out[-k:] * (1 - r) + s[:k] * r
        out = np.concatenate([out, s[k:]])
    return out


def prepare(nom, o):
    x = recolle(original(o), o['coupes'])
    a, b = int(o['fondus'][0] * SR), int(o['fondus'][1] * SR)
    x[:a] *= np.linspace(0, 1, a) ** 2
    x[-b:] *= np.linspace(1, 0, b) ** 2
    h = SR // 10
    fort = max(np.sqrt(np.mean(x[i:i + h] ** 2)) for i in range(0, len(x) - h, h // 2))
    x *= 10 ** (o['niveau'] / 20) / fort
    # les gouttes qui claquent dépassent : un limiteur doux (tanh) les arrondit au-dessus de 0,7
    # plutôt que de baisser tout le son
    au = np.abs(x) > 0.7
    x[au] = np.sign(x[au]) * (0.7 + 0.25 * np.tanh((np.abs(x[au]) - 0.7) / 0.25))
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    os.path.join(REC, nom + '.flac')], input=pcm, check=True)
    return round(len(x) / SR, 2)


if __name__ == '__main__':
    noms = sys.argv[1:] or list(SONS)
    fc = os.path.join(REC, 'credits.json')
    cred = json.load(open(fc, encoding='utf-8'))
    for nom in noms:
        o = SONS[nom]
        d = prepare(nom, o)
        cred[nom] = dict(auteur=o['auteur'], licence='CC0', source=o['source'], titre=o['titre'], duree=d)
        print(nom, d, 's')
    json.dump(cred, open(fc, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(fc, 'a', encoding='utf-8').write('\n')
