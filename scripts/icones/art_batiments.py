# Lot « bâtiments » : petites illustrations des installations (remplacent les symboles SVG b-*
# de jeu.html). Dessins de 16×16 doublés en 32×32 (ART_SCALE = 2).
# Format commun à tous les fichiers art_*.py : voir scripts/icones/build.py.
PALETTE = {
    # bois
    'K': '#3a2414', 's': '#6a4426', 't': '#8a5a34', 'T': '#b07a48', 'U': '#d8a868',
    # végétal
    'G': '#1f4a22', 'g': '#2f6e2c', 'l': '#4a9a3a', 'm': '#8cd06a',
    # or / blé / huile
    'O': '#8a5418', 'o': '#c7862a', 'y': '#f2c040', 'Y': '#fbe38a',
    # eau, cellules solaires
    'q': '#163a5c', 'd': '#2a70b0', 'b': '#4aa0e0', 'B': '#c4e8ff',
    # métal
    'k': '#2a2e3a', 'i': '#5e6676', 'a': '#98a0ac', 'A': '#c8ced6', 'w': '#ffffff', 'W': '#dfe6ee',
    # rouge
    'X': '#4a1218', 'R': '#852830', 'r': '#b8434a', 'e': '#e0735a',
    # feu
    'f': '#f08a2a', 'j': '#ffe04a',
    # terre
    'S': '#2e1a0e', 'n': '#5a3a22', 'N': '#7a5232',
    # serre (planche de la carte)
    'Z': '#0b3e42', 'z': '#18654b', 'x': '#429186', 'v': '#7bac9f', 'V': '#c4e0d8',
    # toit du poulailler (planche de la carte)
    'h': '#28090f', 'c': '#603647', 'p': '#7c4555', 'P': '#a3606e',
    # pierre, crème (four, moulin)
    'H': '#3a2a24', 'M': '#8a7866', 'L': '#b8a68e', 'E': '#e0d6be', 'F': '#c1b7a2',
    # intérieur sombre
    'D': '#1e1210',
}

ART_SCALE = 2
ART = {}

ART['b-panneau'] = [  # panneau solaire sur pied
    '................',
    '................',
    '..qqqqqqqqqqqqq.',
    '..qBBbBbbbBbbdq.',
    '..qBbdBbddBbddq.',
    '..qbddBdddBdddq.',
    '..qBBBBBBBBBBBq.',
    '..qBbbBbbbBbddq.',
    '..qbbdBbddBdddq.',
    '..qbddBdddBdddq.',
    '..qqqqqqqqqqqqq.',
    '.......kik......',
    '.......kik......',
    '.....kkaikkk....',
    '....kAaaaaaiik..',
    '....kkkkkkkkkk..',
]

ART['b-batterie'] = [  # gros accumulateur posé au sol
    '................',
    '................',
    '................',
    '...XXXX...kkkk..',
    '...XerX...kAik..',
    '.kkXrRXkkkkaikk.',
    '.kAAAAAAAAAAAak.',
    '.kAaaaaaaaaaaik.',
    '.kiiiiiiiiiiiik.',
    '.kaGGGGGGGGGGik.',
    '.kaGmmlmmlkkGik.',
    '.kaGllgllgkkGik.',
    '.kaGGGGGGGGGGik.',
    '.kaaaaaaaaaaaik.',
    '.kiiiiiiiiiiiik.',
    '.kkkkkkkkkkkkkk.',
]

ART['b-pompe'] = [  # pompe à bras sur socle, goutte au bec
    '.XXX............',
    '.XerXX..........',
    '..XXrrXX........',
    '....XXrrXX......',
    '......XXrX......',
    '....XXXXXXXX....',
    '....XeerrrRX....',
    '....XXXXXXXXXXX.',
    '.....XerrrrrrRX.',
    '.....XerRXXXXXX.',
    '.....XerRX...q..',
    '.....XerRX..qBq.',
    '.....XerRX..qbq.',
    '..HHHXerRXHH.q..',
    '..HLLLLLLLMH....',
    '..HHHHHHHHHH....',
]

ART['b-reservoir'] = [  # citerne sur pieds, eau bleue, robinet
    '................',
    '....kkkkkkkk....',
    '..kkAWWWWWWakk..',
    '.kAWWWWWWWWWaik.',
    '.kiAAAAAAAAaiik.',
    '.kAWWWWWWWWWWak.',
    '.kqBBbBBBbBBdqk.',
    '.kqbbbbbbbbbdqk.',
    '.kiiiiiiiiiiiik.',
    '.kqbBbbbbbbddqk.',
    '.kqbbbbbbbbddqkk',
    '.kqbbbbbbbdddqAk',
    '.kiqddddddddqikk',
    '..kkkkkkkkkkkk..',
    '..kak......kak..',
    '..kkk......kkk..',
]

ART['b-potager'] = [  # rangs de terre avec pousses
    '................',
    '................',
    '................',
    '................',
    '..m...m...m...m.',
    '.mlm.mlm.mlm.ml.',
    '..lG..lG..lG..lG',
    'KKgKKKgKKKgKKKgK',
    'KNNNNNNNNNNNNNNK',
    'KnnnnnnnnnnnnnnK',
    'KSSSSSSSSSSSSSSK',
    'KNNmNNNmNNNmNNNK',
    'KnmlnnmlnnmlnnnK',
    'KnnlnnnlnnnlnnnK',
    'KSSSSSSSSSSSSSSK',
    'KKKKKKKKKKKKKKKK',
]

ART['b-champ'] = [  # blé doré en rangs
    '................',
    '.Y...Y...Y...Y..',
    'KYyKKYyKKYyKKYyK',
    'KyoKKyoKKyoKKyoK',
    'KYyKKYyKKYyKKYyK',
    'KyoKKyoKKyoKKyoK',
    '.Ko..Ko..Ko..Ko.',
    '..o...o...o...o.',
    'Y.o.Y.o.Y.o.Y.o.',
    'yKoKyKoKyKoKyKoK',
    'oyoKoyoKoyoKoyoK',
    'yoKKyoKKyoKKyoKK',
    'KoKKKoKKKoKKKoKK',
    'KNNNNNNNNNNNNNNK',
    'KnnnnnnnnnnnnnnK',
    'KKKKKKKKKKKKKKKK',
]

ART['b-serre'] = [  # serre de verre, armature verte
    '.......ZZ.......',
    '......ZVxZ......',
    '.....ZVVvxZ.....',
    '....ZVVvzvxZ....',
    '...ZVVvvzvvxZ...',
    '..ZzzzzzzzzzzZ..',
    '.ZVVvzVvvzvvxzZ.',
    '.ZVvvzvvvzvvxzZ.',
    '.ZzzzzzzzzzzzzZ.',
    '.ZVvvzvmvzvvxzZ.',
    '.ZvvvzmlmzvvxzZ.',
    '.ZvvvzvlGzvxxzZ.',
    '.ZvvvzvlvzvxxzZ.',
    '.ZzzzzKKKzzzzzZ.',
    '.ZxxxzKTKzxxxzZ.',
    '.ZZZZZZZZZZZZZZ.',
]

ART['b-verger'] = [  # deux petits pommiers
    '................',
    '........GGGGG...',
    '.......GmmllgG..',
    '..GGGGGmlrlllgG.',
    '.GmmllgGllllrgG.',
    'GmllrllglrlllgG.',
    'GmlllllgGllggG..',
    'GllllrlggGggGG..',
    'GglrllgggGKtK...',
    '.GgggggggGKtK...',
    '..GGGgGGG.KtK...',
    '....KtK...KtK...',
    '....KtK...KsK...',
    '....KtK..GGlGG..',
    '...GKsKG........',
    '..GGlllGG.......',
]

ART['b-silo'] = [  # silo à grain, toit conique
    '.......XX.......',
    '......XreX......',
    '.....XreerX.....',
    '....XreerrRX....',
    '...XrrrrrRRRX...',
    '...XXXXXXXXXX...',
    '...kAWWaaaaik...',
    '...kAWaaaaaikk..',
    '...kiiiiiiiikak.',
    '...kAWaaaaaikak.',
    '...kAWaaaaaikak.',
    '...kiiiiiiiikak.',
    '...kAWaaaaaikak.',
    '...kAWaaaaaikak.',
    '...kiiiiiiiikak.',
    '...kkkkkkkkkkkk.',
]

ART['b-poulailler'] = [  # cabane au toit prune, rampe
    '................',
    '................',
    '.......hh.......',
    '.....hhPPhh.....',
    '...hhPPpPppchh..',
    '.hhPPpppPpppcch.',
    'hhhhhhhhhhhhhhhh',
    '.KUTTTTTTTTTTsK.',
    '.KTDDtTTTTTTTsK.',
    '.KTDDtTTKKKTTsK.',
    '.KTttTTKDDDKTsK.',
    '.KTTTTTKDDDKTsK.',
    '.KttttsKDDDKtsK.',
    '.KKKKKKKUTTKKKK.',
    '........KKUTTK..',
    '..........KKKKK.',
]

ART['b-paturage'] = [  # clôture en bois sur la prairie
    '................',
    '................',
    '................',
    '..KK.....KK.....',
    '.KTtK...KTtK....',
    '.KTsK...KTsK....',
    'KKTsKKKKKTsKKKKK',
    'KUTTTTTTTTTTTTTK',
    'KssKKsssssKsssKK',
    '.KTsK...KTsK....',
    'KKTsKKKKKTsKKKKK',
    'KUTTTTTTTTTTTTTK',
    'KssKKsssssKsssKK',
    '.KTsK.m.KTsK.m..',
    'GmmlmmmlmmllmmmG',
    'GGgGGgGGgGGgGGgG',
]

ART['b-four'] = [  # four à pain voûté en pierre, feu
    '................',
    '................',
    '.....HHHHHH.....',
    '...HHLLELLMHH...',
    '..HLELLHLLLMMH..',
    '.HLELHLLLHLLMMH.',
    '.HLLLLLHLLLLLMH.',
    'HLELHLHHHHHLHLMH',
    'HLLLLHDDDDDHLMMH',
    'HLHLHDDDjDDDHLMH',
    'HLLLHDDjfjDDHMMH',
    'HLLHLDjffjjDHLMH',
    'HLLLHDfjjffDHMMH',
    'HMMMHRfrffrRHMMH',
    'HHHHHHHHHHHHHHHH',
    '.HMMMMMMMMMMMMH.',
]

ART['b-cuisine'] = [  # fourneau avec casserole
    '.....A...A......',
    '....A...A.......',
    '.....A...A......',
    '..kkkkkkkkkk....',
    '.kkAAWWAaaaikkk.',
    '..kAWaaaaaaik...',
    '..kaaaaaaaaik...',
    '..kkiiiiiiikk...',
    'kkkkkkkkkkkkkkkk',
    'kiaaaaaaaaaaaaik',
    'kiikkkkkkkkkkiik',
    'kirkiiiiiiiikrik',
    'kiikiDDDDDDikiik',
    'kiikiiiiiiiikiik',
    'kiikkkkkkkkkkiik',
    'kkkkkkkkkkkkkkkk',
]

ART['b-moulin'] = [  # moulin à vent, ailes crème
    'KK...........KK.',
    'KEFK.......KEEK.',
    '.KEFK.....KEEFK.',
    '..KEFK...KEEFK..',
    '...KEFK.KEEFK...',
    '....KEFDDEFK....',
    '.....KDsKDK.....',
    '....KEFDDEEK....',
    '...KEEFKsKEFK...',
    '..KEEFKEEKKEFK..',
    '.KEEFKEEEFKKEFK.',
    'KEEFKKEEEEsK.KEK',
    '.KK.KEEDDEEsK.K.',
    '....KEEDDEEsK...',
    '...KEEEDDEEEsK..',
    '...KKKKKKKKKKK..',
]

ART['b-presse'] = [  # presse à huile : vis, plateau, huile dorée
    '.....KKKKKK.....',
    '.....KUUTTK.....',
    '.KKKKKKkKKKKKKK.',
    '.KUTTTTkaTTTTsK.',
    '.KKKKKkAikKKKKK.',
    '.KTsK.kAik.KTsK.',
    '.KTsK.kaik.KTsK.',
    '.KTsK.kAik.KTsK.',
    '.KTsKkkkkkkKTsK.',
    '.KTsKAaaaaikTsK.',
    '.KTsKkkkkkkKTsK.',
    '.KTsK.OyyO.KTsK.',
    '.KTsKOYyyoOKTsK.',
    'KKKKKKKKKKKKKKKK',
    'KUTTTTTTTTTTTTsK',
    'KKKKKKKKKKKKKKKK',
]

ART['b-frigo'] = [  # réfrigérateur blanc à deux portes
    '................',
    '...kkkkkkkkkk...',
    '..kwwwwwwwwWWk..',
    '..kwWkWWWWWWak..',
    '..kwWkWWWWWWak..',
    '..kWWWWWWWWWak..',
    '..kiiiiiiiiiik..',
    '..kwWWWWWWWWak..',
    '..kwWkWWWWWWak..',
    '..kwWkWWWWWWak..',
    '..kwWkWWWWWWak..',
    '..kwWkWWWWWWak..',
    '..kwWWWWWWWWak..',
    '..kWaaaaaaaaik..',
    '...kkkkkkkkkk...',
    '...kk......kk...',
]
