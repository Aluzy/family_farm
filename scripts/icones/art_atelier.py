# Lot « atelier » (la ferme générée, docs/carte-generee.md, étape 3) : la fibre, la planche, le
# mur en pierre, la porte, la paillasse et l'Atelier (un marteau).
# Format commun : voir scripts/icones/build.py. Contour de 1 px dessiné à la main, dans la teinte
# très sombre de chaque matière ; lumière en haut à gauche.

PALETTE = {
    # bois
    'k': '#3a2414', 's': '#6a4426', 't': '#8a5a34', 'T': '#b07a48', 'e': '#d8b07a',
    # pierre
    'a': '#28262c', 'b': '#6a6870', 'c': '#9a98a0', 'd': '#d0ced2',
    # fibre (verts de l'herbe haute)
    'G': '#173418', 'g': '#3a7a34', 'l': '#5aa040', 'L': '#8cc85a',
    # paille
    'O': '#4a3010', 'o': '#c7862a', 'y': '#f2c040', 'Y': '#fbe38a',
    # toile
    'u': '#5a4630', 'v': '#c8b088', 'w': '#ecdcb4',
    # fer
    'm': '#1e2833', 'n': '#64707e', 'p': '#9aa8b8', 'q': '#dfe7ef',
}

ICONS = {
    # fibre : une botte de brins verts, liée au milieu
    '🪢': [
        '................',
        '.....G...G......',
        '....GlG.GLG.G...',
        '...GLlGGLlGGLG..',
        '...GlgGlLgGlLG..',
        '....GlgLlgLlgG..',
        '....GglLgLlgG...',
        '...GGGGGGGGGGG..',
        '...GooyyyyyooG..',
        '...GGGGGGGGGGG..',
        '....GglgLglgG...',
        '....GlgLlgLlgG..',
        '...GLgGlLgGlgG..',
        '...GlG.GlG.GlG..',
        '....G...G...G...',
        '................',
    ],
    # planche : une planche posée en biais, son veinage
    '🪚': [
        '................',
        '..........kkk...',
        '.........keTTk..',
        '........keTTtk..',
        '.......keTTtsk..',
        '......keTtTtk...',
        '.....keTTttk....',
        '....keTtTtk.....',
        '...keTTttk......',
        '..keTtTtk.......',
        '.keTTttk........',
        '.kTTtssk........',
        '.ktssskk........',
        '.kkkkk..........',
        '................',
        '................',
    ],
    # mur en pierre : des moellons en quinconce
    '🧱': [
        '................',
        '................',
        '..aaaaaaaaaaaa..',
        '..adddcaddddca..',
        '..accccacccccb..',
        '..abbbbabbbbba..',
        '..aaaaaaaaaaaa..',
        '..addcaddddcaa..',
        '..acccacccccba..',
        '..abbbabbbbbba..',
        '..aaaaaaaaaaaa..',
        '..adddcaddddca..',
        '..accccacccccb..',
        '..abbbbabbbbba..',
        '..aaaaaaaaaaaa..',
        '................',
    ],
    # porte : planches verticales, deux pentures de fer, la poignée
    '🚪': [
        '................',
        '....kkkkkkkk....',
        '...keTeTeTeTk...',
        '...kTtTtTtTtk...',
        '...kmnnnnnnnk...',
        '...kTtTtTtTtk...',
        '...kTtTtTtTtk...',
        '...kTtTtTtpqk...',
        '...kTtTtTtmpk...',
        '...kTtTtTtTtk...',
        '...kmnnnnnnnk...',
        '...kTtTtTtTtk...',
        '...kTtTtTtTtk...',
        '...ksssssssk....',
        '...kkkkkkkkk....',
        '................',
    ],
    # paillasse : un sac de toile bourré de paille, posé au sol
    '🛏': [
        '................',
        '................',
        '................',
        '................',
        '................',
        '....uuuuuuuu....',
        '..uuwwwwwwwwuu..',
        '.uwwwwvwwwvwwwu.',
        '.uwvwwwwvwwwwvu.',
        '.uvwwvwwwwvwwvu.',
        '.uvvvvvvvvvvvvu.',
        '.uyoyuuuuuuyoyu.',
        '..uuu......uuu..',
        '................',
        '................',
        '................',
    ],
    # l'Atelier : un marteau, fer en haut, manche de bois
    '🔨': [
        '................',
        '...mmmmmmmm.....',
        '..mqqqqpppnm....',
        '..mqppppnnnm....',
        '..mpnnnnnnnm....',
        '...mmmkkmmm.....',
        '......keTk......',
        '......kTtk......',
        '......kTtk......',
        '......kTtk......',
        '......kTtk......',
        '......kTsk......',
        '......ktsk......',
        '......ktsk......',
        '......kkkk......',
        '................',
    ],
}
