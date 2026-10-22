# Les récoltes du potager et du verger (data/crops.json : le blé, la carotte, la pomme de terre,
# l'oignon, la fraise, l'épinard, la tomate, le poivron ; la pomme) : leurs icônes, dans les
# couleurs des plantes de la carte (scripts/carte/cultures.py). Contour sombre d'un pixel,
# lumière en haut à gauche. La courgette 🥒 est celle de la carte (build.py, FROM_SHEET).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.

PALETTE = {
    'K': '#2a1a10',   # contour
    'G': '#163e1e', 'g': '#26682c', 'v': '#3e8c38', 'V': '#68b248', 'w': '#96d262',   # verts
    'o': '#962e0e', 'O': '#d66c1e', 'a': '#f6983a', 'A': '#ffc478',                    # orange
    'p': '#704c2a', 'P': '#a87c4c', 'q': '#ccA670', 'Q': '#e8cc9c',                    # pomme de terre
    'r': '#6e0e1a', 'R': '#be1c28', 's': '#ec4646', 'S': '#ffa096',                    # rouge
    'y': '#b27814', 'Y': '#e8b024', 'z': '#fcd64a', 'Z': '#fff096',                    # or, blé
    'b': '#784016', 'B': '#b26828', 'c': '#da9646', 'C': '#f4c882',                    # oignon
    'x': '#f4f0e0',                                                                     # graines, reflets
    'n': '#5a3a1e',                                                                     # queue
}

ICONS = {}

ICONS['🌾'] = [
    '...KK..KK..KK...',
    '..KZzKKZzKKZzK..',
    '..KzYKKzYKKzYK..',
    '..KZzKKZzKKZzK..',
    '..KzYKKzYKKzYK..',
    '..KZzKKZzKKZzK..',
    '...KYK.KYK.KYK..',
    '....KyK.yK.KyK..',
    '.....KyKyKKyK...',
    '......KyyyyK....',
    '.....KBbbbbBK...',
    '......KyyyyK....',
    '.....KyKyKyyK...',
    '....KyK.yK.KyK..',
    '...KyK..yK..KyK.',
    '...KK...KK...KK.',
]

ICONS['🥕'] = [
    '.........KK.KK..',
    '........KvVKwK..',
    '.....KK.KgvVwK..',
    '....KwVKKgvVK...',
    '.....KgvvgvK....',
    '.....KKKgKK.....',
    '....KAaaKK......',
    '...KAaaOaK......',
    '...KaaOaOK......',
    '..KAaOaOK.......',
    '..KaOaOoK.......',
    '.KaaOoOK........',
    '.KaOoOK.........',
    'KaOooK..........',
    'KOoK............',
    '.KK.............',
]

ICONS['🥔'] = [
    '................',
    '................',
    '................',
    '.....KKKKK......',
    '...KKQQqqqKK....',
    '..KQQqqqPqqqK...',
    '.KQqqPqqqqqqPK..',
    '.KqqqqqqqPqqqK..',
    'KQqqqqqqqqqqqPK.',
    'KqqPqqqqqqqqPPK.',
    'KqqqqqqqPqqqPpK.',
    '.KqqqqqqqqqPPpK.',
    '.KPqqqPqqPPPpK..',
    '..KPPPPPPPppK...',
    '...KKpppppKK....',
    '.....KKKKK......',
]

ICONS['🧅'] = [
    '.......KK.......',
    '......KvVK......',
    '......KgvK......',
    '......KbBK......',
    '.....KbCcBK.....',
    '....KbCCccBK....',
    '...KbCCcccBBK...',
    '..KbCCcCccBcBK..',
    '..KbCcCccBcBbK..',
    '..KbCcCccBcBbK..',
    '..KbBcCcBcBbbK..',
    '...KbBcBcBbbK...',
    '....KbbBbbbK....',
    '.....KKbbKK.....',
    '......KxxK......',
    '.......KK.......',
]

ICONS['🍓'] = [
    '................',
    '......K.KK.K....',
    '.....KvKVvKvK...',
    '....KgVvgVvgK...',
    '...KKsKgvKgsKK..',
    '..KSssSKKsSsRK..',
    '..KSsxsssxssRK..',
    '..KssssSsssxRK..',
    '..KsxsssxsssRK..',
    '...KsssxsssRK...',
    '...KssssxsRRK...',
    '....KxsssRRK....',
    '....KsssRRrK....',
    '.....KsRrrK.....',
    '......KrrK......',
    '.......KK.......',
]

ICONS['🥬'] = [
    '.....KKK.KKK....',
    '....KwVVKVwVK...',
    '...KwVvVKVvVVK..',
    '..KwVvVvKvVvVK..',
    '..KVvVvgKgvVvK..',
    '.KwVvvVgKgVvvVK.',
    '.KVvgvVgKgvVgvK.',
    '.KVvgvgvKvgvgvK.',
    '.KvgvgvgKgvgvgK.',
    '..KvgvgxKxgvgK..',
    '..KgvgvxKxvgvK..',
    '...KggvxKxvggK..',
    '....KKgxxxgKK...',
    '......KxxxK.....',
    '.......KxK......',
    '........K.......',
]

ICONS['🍅'] = [
    '................',
    '.......KK.......',
    '.....KKvVKKK....',
    '....KvVKgKVvK...',
    '..KKKsKVvKsKKK..',
    '.KsSSsKKKsssRK..',
    'KsSSSssssssssRK.',
    'KsSxSsssssssRRK.',
    'KsSSsssssssRRRK.',
    'KssssssssssRRrK.',
    'KsssssssssRRRrK.',
    '.KsssssssRRRrK..',
    '.KRsssssRRRrrK..',
    '..KRRRRRRrrrK...',
    '...KKrrrrrKK....',
    '.....KKKKK......',
]

ICONS['🫑'] = [
    '.......KK.......',
    '.......KgK......',
    '......KgvK......',
    '...KKKKgKKKK....',
    '..KwwVVKVVvgK...',
    '.KwwVVVvVVvvgK..',
    '.KwVVVvvVVvvgK..',
    '.KwVVvvVVvvggK..',
    '.KVVVvvVVvvggK..',
    '.KVVvvVVvvgggK..',
    '.KVVvvVVvvggGK..',
    '..KVvvVVvgggGK..',
    '..KVvvVvvggGK...',
    '...KvvVvggGK....',
    '....KKvKgGK.....',
    '......KKKK......',
]

ICONS['🍎'] = [
    '.........K......',
    '........KnK.KK..',
    '........KnKKVwK.',
    '...KKKK.KnKgVK..',
    '..KSSssKKnKKK...',
    '.KSxSsssKsssRK..',
    'KSxSSssssssssRK.',
    'KSSSssssssssRRK.',
    'KSSsssssssssRRK.',
    'KsSsssssssssRrK.',
    'KssssssssssRRrK.',
    '.KsssssssRRRrK..',
    '.KRsssssRRRrrK..',
    '..KRRRRRRrrrK...',
    '...KKrrKKrrKK...',
    '.....KK..KK.....',
]
