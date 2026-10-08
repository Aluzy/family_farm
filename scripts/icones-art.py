# assets/icones.png : les icônes de 16×16 qui remplacent les emojis (voir js/ui/pixel-emoji.js).
# Une lettre par pixel. Usage : python3 scripts/icones-art.py (depuis la racine du dépôt).
# L'ordre de ORDER doit être celui de ICONES dans js/ui/pixel-emoji.js.
from PIL import Image
P={
 # or
 'K':'#3a2414','Y':'#fbe38a','y':'#f2c040','o':'#c7862a','O':'#8a5418',
 # eau
 'q':'#163a5c','b':'#4aa0e0','B':'#c4e8ff','d':'#2a70b0',
 # végétal
 'm':'#8cd06a','l':'#4a9a3a','g':'#2f6e2c','s':'#6a4426','t':'#8a5a34',
 # œuf, lait
 'k':'#3a2a24','e':'#f4ead8','E':'#d8c6a8','w':'#ffffff','W':'#dfe6ee','c':'#5aa0d8','C':'#2f6a9a',
 # éclair
 'j':'#ffe04a','J':'#f0a020','z':'#5a3a10',
 # poule et mouton (palettes de leurs planches)
 'h':'#3b1b2b','r':'#b8434a','R':'#6e1a22','u':'#e6e2d6','v':'#c3beb7','x':'#a69481','a':'#98a0ac','n':'#e0a23a','f':'#d0823a',
 'M':'#2b2a2e','p':'#e5e1d8','P':'#cac2b9','G':'#978f88','F':'#70747a','D':'#5f5b59','H':'#67523d',
}
I={}
I['💰']=[  # une pièce d'or
'................',
'.....KKKKKK.....',
'...KKYYYYyyKK...',
'..KYYyyyyyyyoK..',
'..KYyyoooooyoK..',
'.KYyyoYYyyyoyoK.',
'.KYyoYyyyyyyoyK.',
'.KyyoyyyyyyyoyK.',
'.KyyoyyyyyyyoyK.',
'.KyyoyyyyyyOoyK.',
'.KyyyoyyyyOoyoK.',
'..KyyyooooOyoK..',
'..KyyyyyyyyooK..',
'...KKoooooOKK...',
'.....KKKKKK.....',
'................',
]
I['💧']=[
'................',
'.......q........',
'......qbq.......',
'......qbq.......',
'.....qbbbq......',
'.....qbBbq......',
'....qbbBbbq.....',
'...qbbBBbbbq....',
'...qbBbbbbbq....',
'..qbbBbbbbbbq...',
'..qbBbbbbbbdq...',
'..qbBbbbbbbdq...',
'..qbbbbbbbddq...',
'...qbbbbbddq....',
'....qqddddq.....',
'.....qqqqq......',
]
I['🌱']=[
'................',
'................',
'................',
'..mmm.....mmm...',
'.mmmmm...mmmml..',
'.lmmmml.lmmmll..',
'..llmmlglmlll...',
'....lllgll......',
'.......g........',
'.......g........',
'.......g........',
'.......g........',
'....sssgsss.....',
'...sttttttts....',
'....sssssss.....',
'................',
]
I['🥚']=[
'................',
'................',
'......kkkk......',
'.....kweeek.....',
'....kweeeeEk....',
'....kweeeeEk....',
'...kweeeeeeEk...',
'...kweeeeeeEk...',
'...keeeeeeeEk...',
'...keeeeeeEEk...',
'...keeeeeeEEk...',
'....keeeeEEk....',
'....kEeeEEEk....',
'.....kkEEkk.....',
'.......kk.......',
'................',
]
I['🥛']=[  # une bouteille de lait
'................',
'......CCCC......',
'......cccc......',
'......kkkk......',
'.....kwWWWk.....',
'.....kwWWWk.....',
'....kwwWWWWk....',
'...kwwwwwWWWk...',
'...kwccccccWk...',
'...kwcwwwwcWk...',
'...kwcwwwwcWk...',
'...kwccccccWk...',
'...kwwwwwwWWk...',
'...kwwwwwWWWk...',
'....kkkkkkkk....',
'................',
]
I['⚡']=[
'................',
'.........zzzz...',
'........zjjjz...',
'.......zjjjz....',
'......zjjjz.....',
'.....zjjjz......',
'....zjjjjzzz....',
'...zjjjjjjjz....',
'...zzzzjjjz.....',
'......zjjz......',
'.....zjJz.......',
'.....zjz........',
'....zJz.........',
'....zz..........',
'................',
'................',
]
HEN=[  # la poule de poule.png (pose « idle »)
'.....rr...',
'....hrrh..',
'hh..huhun.',
'hah.huuRh.',
'huahhuuh..',
'huuuuuuuh.',
'hvuuuuuuh.',
'.hvxuuuvh.',
'..hvxxvh..',
'...hhhh...',
'...f..f...',
'..ff.ff...',
]
I['🐔']=['.'*16]*2+['...'+r+'...' for r in HEN]+['.'*16]*2
I['🐑']=[  # un mouton ramassé
'................',
'................',
'................',
'.....MMMM..MMM..',
'...MMpppPMMpppM.',
'..MPppppppMMFFM.',
'.MpppppppppMFMFM',
'MPppppppppppFFFM',
'MGPppppppppPMMM.',
'.MPppPPppppGM...',
'..MPGGPGppGM....',
'..MDMMMMMMDM....',
'..MDM...MDM.....',
'..MHM...MHM.....',
'................',
'................',
]
ORDER=['💰','💧','🌱','🌾','🥕','🥚','🥛','⚡','🐔','🐑']
def rgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
pack=Image.open('assets/crops.png').convert('RGBA')
FROM_PACK={'🌾':(13,6),'🥕':(5,1)}   # icônes de récolte déjà dans la planche des cultures
S=Image.new('RGBA',(16*len(ORDER),16),(0,0,0,0))
for n,e in enumerate(ORDER):
    if e in FROM_PACK:
        c,r=FROM_PACK[e]; S.alpha_composite(pack.crop((c*16,r*16,c*16+16,r*16+16)),(n*16,0)); continue
    rows=I[e]; assert len(rows)==16,(e,len(rows))
    for y,row in enumerate(rows):
        assert len(row)==16,(e,y,len(row),row)
        for x,ch in enumerate(row):
            if ch!='.': S.putpixel((n*16+x,y),rgb(P[ch]))
S.save('assets/icones.png'); print(S.size, ''.join(ORDER))
