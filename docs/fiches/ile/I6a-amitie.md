# Fiche I6a — L'amitié avec les villageois

## Objectif

Rebrancher sur les villageois ce qui liait le joueur aux habitants des hameaux : parler, offrir,
découvrir les goûts, répondre à une petite demande, inviter à table.

## Contexte

- I3a (le modèle des villageois, leurs goûts tirés), I3b (la bulle).
- L'amitié : `js/engine/amitie.js` (318 lignes : paliers, cadeaux, goûts par métier et communs,
  retours de présents, remises), `data/amitie.json` (`AMITIE`, `DEMANDES`), `js/ui/amitie.js`,
  `js/ui/amis.js`, `js/carte/ferme/amis.js`, `tests/engine/amitie.test.mjs`.
- Les demandes : `js/engine/demandes.js`, `js/ui/demandes.js`. Les invitations :
  `js/engine/invitations.js`, `js/ui/invitations.js`, `js/carte/ferme/invites.js`.
- Ce que disent les habitants : `js/engine/propos.js`, `data/monde.json` (`HABITANTS.PROPOS`).
- Ce qui tient au récit et s'en ira à I7c : `AMITIE.ECRITS`, `AMITIE.CONFIANCE`, `AMITIE.REMISE`.

## À faire

1. **L'amitié** avec un villageois : les mêmes paliers et les mêmes gains (parole, cadeau aimé,
   retrouvailles). Les goûts « par métier » deviennent des goûts « par tâche préférée » ou
   disparaissent au profit des goûts tirés : choisir et le motiver.
2. **Ce que l'amitié change**, sans cadence d'usine : un ami fait un présent de temps en temps
   (`RETOUR`) ; il dit ses goûts ; il accepte une tâche qu'il n'aime pas sans perdre d'humeur ; un
   artisan ami apprend de nouvelles pièces (I5a). Pas de bonus de production lié à l'amitié.
3. **Les demandes** : un villageois demande parfois un objet (`DEMANDES`), avec les besoins de sa
   tâche ou de son commerce ; honorée, elle donne de l'amitié ; oubliée, rien (B-1).
4. **Les invitations à table** : inviter des villageois à un repas à la ferme, comme aujourd'hui.
5. **Les propos** : les sujets de `PROPOS` qui parlent du hameau, de la calèche et des cousins sont
   réécrits pour le village, le port et le bac, ou retirés ; ceux sur la ferme, la lune, la météo,
   les cadeaux restent. Aucune phrase de plus d'une bulle.
6. **L'interface** : la fiche du villageois gagne son palier d'amitié, ses goûts connus, sa demande
   en cours ; la fenêtre des amis liste les villageois.
7. **La sauvegarde** : l'amitié par villageois ; format + 1, migration, test. Les amitiés avec les
   habitants des hameaux ne sont pas touchées ici (I7f).
8. **Les tests** (`village-amitie.test.mjs`) : paliers, cadeaux, demandes, invitations avec des
   villageois ; `amitie.test.mjs`, `demandes.test.mjs`, `invitations.test.mjs`, `propos.test.mjs`
   verts avec `ACTIF: false`.

## Hors périmètre

- Les liens entre villageois (I6b), les traits (I6c), les fêtes (I8a), le retrait de la confiance et
  des personnages écrits (I7c).

## Critères d'acceptation

- Dans Chromium : on offre à un villageois un plat qu'il adore, son amitié monte d'un palier, il dit
  un goût ; il fait une demande, on l'honore ; on l'invite à dîner, il vient s'asseoir.

## Vérifications et livraison

Celles du README du chantier. Captures : la fiche avec l'amitié, une demande, un dîner.
