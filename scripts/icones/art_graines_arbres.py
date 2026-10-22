# Les graines des arbres de la ferme générée (js/engine/outils.js, HACHE.GRAINES) : la pomme de
# pin d'un sapin abattu et le gland d'un autre arbre ; plantées là où l'arbre était, il y
# repousse. Les mêmes dessins que sur la carte (scripts/carte/ramassables.py), en plus grand.
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.

PALETTE = {
    'K': '#2e1a0c',   # contour
    'x': '#7a4a1c',   # queue
    'u': '#c08850', 'U': '#9a6434', 'v': '#74461f', 'V': '#4e2c12',   # écailles
    'c': '#8a6a3a', 'C': '#6a4e26',   # cupule
    'o': '#d8a050', 'O': '#b07a30', 'w': '#f0c878',   # fruit du gland
}

ICONS = {}

ICONS['🌲‍🟤'] = [
    '.......KK.......',
    '.......xK.......',
    '......KuuK......',
    '.....KuUuUK.....',
    '....KuVuVuVK....',
    '....KUuUuUuK....',
    '...KuVuVuVuVK...',
    '...KUuUuUuUuK...',
    '...KvVuVuVuvK...',
    '...KUvUvUvUvK...',
    '...KVvVvVvVvK...',
    '....KvUvUvUK....',
    '....KVvVvVvK....',
    '.....KVVVVK.....',
    '......KKKK......',
    '................',
]

ICONS['🌳‍🟤'] = [
    '................',
    '.......KK.......',
    '.......CK.......',
    '....KKKCKKK.....',
    '...KccCcCccK....',
    '..KcCcCcCcCcK...',
    '..KCCCCCCCCCK...',
    '...KwoooooOK....',
    '...KwooooOOK....',
    '...KwoooOOOK....',
    '....KoooOOK.....',
    '....KooOOOK.....',
    '.....KoOOK......',
    '......KOK.......',
    '.......K........',
    '................',
]
