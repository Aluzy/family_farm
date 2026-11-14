# Worker de collecte et de rapport (Cloudflare)

## Ce qu'il fait

- `POST /session` : reçoit le JSON d'une session de jeu et l'écrit dans le bucket R2
  `ferme-familiale-sessions` sous `sessions/<sid>.json`. N'accepte que les origines du jeu
  publié : `https://moonbloom-village.com` (avec ou sans `www`) et l'ancienne adresse
  `https://aluzy.github.io`. Les commentaires des joueurs (`feedback`) sont nettoyés
  (3 au plus, 1 000 signes chacun). Une session de la version 2 porte aussi un numéro de
  joueur aléatoire (le même d'une visite à l'autre) : sa fiche `players/<id>.json`, la
  progression du joueur (une ligne par nuit et par niveau atteint, avec le temps de jeu
  cumulé, les jours où il a joué), est mise à jour à chaque envoi. Son résumé (premier et
  dernier jour joué, retour à J+1, J+7 et J+30, niveau, étape du didacticiel, temps de jeu,
  premières fois) est gardé dans les métadonnées du fichier : la rétention, l'abandon et les
  premières fois se calculent sur tous les joueurs sans relire chaque fiche. Depuis la
  version 3 (F0-7), une session porte aussi les gestes de la création (catalogue ouvert,
  objets et décorations posés, meubles tournés, invitations envoyées et acceptées), si elle
  s'est jouée à plusieurs (`coop`), et les premières fois du joueur (`jalon`), que sa fiche
  garde (`jalons`).
- **Rapport quotidien à 13 h (heure de Paris)** : lit les sessions démarrées dans les
  dernières 24 h et publie le rapport comme **issue d'un dépôt GitHub privé**
  avec :
  - les **sessions** (temps moyen et médian, sessions très courtes) ;
  - les **joueurs** : actifs et nouveaux, taille de la famille, part du repas du soir
    couverte, étape du didacticiel ;
  - **créer** (version 3) : catalogue ouvert, objets et décorations posés, meubles tournés,
    invitations envoyées et acceptées, sessions à plusieurs ; et, pour les joueurs arrivés avec
    la version 3, la part qui a fait chaque première fois et le temps de jeu médian pour y
    arriver (première décoration, 5 objets posés, premier meuble tourné…) ;
  - les **jours de jeu** : temps réel moyen par jour de jeu, gestes et énergie par jour ;
  - les **gestes du personnage** par type (couper, piocher, arroser…) : nombre, par jour de
    jeu, énergie dépensée et énergie par geste ; les automatisations à part ;
  - les **ressources ramassées**, les **objets fabriqués** à l'Atelier et les **blocs posés**,
    en total et par jour de jeu ;
  - les **niveaux** : temps de jeu et jour de jeu médians pour atteindre chacun, et temps
    depuis le niveau précédent ;
  - la **progression par joueur** : un tableau (temps de jeu, jour, niveau, chapitre,
    famille) et un graphique du niveau selon le temps de jeu (Mermaid, affiché par GitHub) ;
  - la **rétention** : par jour de première visite, les joueurs revenus le lendemain (J+1)
    et 7 jours après ou plus (J+7), et le retour après un mois (J+30, sur les joueurs arrivés il
    y a 30 à 59 jours) ;
  - l'**abandon** : les joueurs arrivés depuis 60 jours au plus et sans visite depuis 3 jours,
    leur temps de jeu, leur niveau, leur chapitre et leur étape du didacticiel ;
  - l'**économie** : pièces gagnées et dépensées par poste et par jour de jeu, et pièces
    du soir (médiane, min, max) pour chacun des 20 premiers jours de jeu ;
  - le temps par chapitre, le top 10 des boutons, les erreurs techniques et les
    commentaires.
  GitHub t'écrit ensuite par e-mail via ses notifications. Deux déclencheurs UTC (11 h
  et 12 h) couvrent l'heure d'été et l'heure d'hiver ; le Worker ignore celui qui ne
  tombe pas à 13 h.
- **Garde-fou** : avant de publier, le Worker vérifie que le dépôt cible est privé et
  refuse dans le cas contraire, car le rapport contient les commentaires des joueurs.
- `GET /report?token=…` (facultatif) : affiche le rapport en Markdown sans attendre
  13 h ; ajouter `&publish=1` pour créer aussi l'issue (pour tester). Cette route n'existe
  que si le secret `REPORT_TOKEN` est défini.

Le dépôt du **jeu** doit rester public : GitHub Pages ne fonctionne pas sur un dépôt
privé avec un compte gratuit, et le site serait dépublié.

Ce dossier n'est pas servi par GitHub Pages au jeu : il est déployé par Cloudflare
(Workers Builds, dossier racine `/` (réglage par défaut), commande de déploiement
`npx wrangler deploy`). Les déclencheurs sont déclarés dans `wrangler.toml` et
installés par ce même déploiement.

## Les comptes du jeu en ligne (E-0)

Décision F.3 : le jeu en ligne demande un compte, le jeu solo reste sans compte. On se connecte par
un **lien reçu par e-mail**, sans mot de passe (`worker/src/comptes.mjs`, la rubrique
⚙️ Options › « 🌐 Jeu en ligne » du jeu : `js/ui/compte.js`).

- `POST /compte/lien` `{ email }` : un lien de connexion, valable 15 minutes et utilisable une seule
  fois, envoyé à l'adresse. La réponse est la même que l'adresse ait déjà un compte ou non. Les
  demandes sont limitées : 3 par adresse en 15 minutes, 20 par connexion en une heure.
- Le lien ouvre `jeu.html#connexion=<jeton>`. Le jeton est dans le fragment, qui n'est jamais envoyé
  au serveur des pages. Le jeu l'échange par `POST /compte/connexion` `{ jeton }` contre une
  **session** (90 jours), qu'il garde sur l'appareil (`localStorage` `ferme-compte`). Le compte est
  créé à la première connexion.
- `GET /compte/moi` (en-tête `Authorization: Bearer <session>`) : le compte ;
  `POST /compte/deconnexion` : la session oubliée ; `POST /compte/supprimer` : le compte, ses
  sessions et ses liens effacés (droit à l'effacement).
- **Le stockage** : un Durable Object `Comptes`, une seule instance avec sa base SQLite
  (`wrangler.toml` : la liaison `COMPTES` et la migration `new_sqlite_classes`). Cloudflare le crée
  au premier déploiement, rien à créer à la main. La base garde l'adresse, la date de création et
  la dernière connexion ; liens et sessions n'y sont que sous forme d'empreintes SHA-256.
- **L'envoi des e-mails** : Resend, par son API HTTP. C'est le seul service tiers ; le rapport
  quotidien, lui, n'envoie toujours aucun e-mail (il passe par les notifications GitHub). Tant que
  ses secrets manquent, `POST /compte/lien` répond « le jeu en ligne n'est pas encore ouvert »
  (503) et rien n'est envoyé.

### Mise en route (une seule fois)

1. **Créer un compte chez Resend** (resend.com ; son offre gratuite suffit pour commencer :
   vérifier ses limites d'envoi du moment).
2. **Vérifier un domaine** à toi (Resend › Domains › Add domain) : Resend donne des
   enregistrements DNS (SPF, DKIM) à ajouter chez l'hébergeur du domaine. Sans domaine vérifié,
   Resend n'envoie qu'à ta propre adresse (pratique pour un premier essai).
3. **Créer une clé d'API** : Resend › API Keys › Create API key, avec la permission « Sending
   access » seulement.
4. Dans Cloudflare : Workers › `family-farm` › Settings › Variables and Secrets, ajouter en
   **secrets** :
   - `RESEND_API_KEY` : la clé de l'étape 3 ;
   - `COMPTE_EXPEDITEUR` : l'expéditeur, sur le domaine vérifié, par exemple
     `Moon Bloom Village <connexion@mail.moonbloom-village.com>`.

   L'adresse du jeu où mène le lien, `JEU_URL`, est dans `wrangler.toml` (`[vars]`) :
   `https://moonbloom-village.com/jeu.html`. Elle n'est pas secrète, et une variable créée à la
   main dans Cloudflare serait effacée au prochain déploiement.
5. Déployer (fusionner la pull request : Workers Builds redéploie et crée le Durable Object).
6. Tester : dans le jeu publié, ⚙️ Options › « 🌐 Jeu en ligne », donner ton adresse, ouvrir le lien
   reçu sur le téléphone. La rubrique affiche « Connecté ». En cas d'échec : Workers ›
   `family-farm` › Observability (« envoi du lien en échec : <code> »).

## Le monde partagé (E-1)

Sa vision : `docs/monde-partage.md` (un monde partagé, c'est la zone de la ferme ; le grand monde
reste à la partie solo). E-8 : à la création, la copie est élaguée (`elaguer` : sans les habitants,
les hameaux ni les régions vues ; `mondePartage = true`, une nuit de la ferme seule) ; une commande qui
vise une case hors de la ferme est refusée (`horsDeLaFerme`). I9a (le chantier « l'île à bâtir », sa partie allumée :
`docs/monde-partage.md` § 13) : le monde partagé devient l'île ; le joueur en sort et chacun voit le relief tiré de la
graine, mais le monde refuse encore toute commande hors de la ferme, avec le mot « rien d'autre n'est encore
synchronisé » (le contrôle est au moteur, `js/engine/frontiere.js`, le même dans le jeu). Le plafond de poids :
`VILLAGE.EN_LIGNE` ; la mesure : `node scripts/poids-ile.mjs`.

Un **Durable Object `Monde` par monde** (`worker/src/monde.mjs`) fait autorité. Il garde la partie du
monde, joue les commandes des joueurs avec **le même moteur que le jeu** (`js/engine/`, regroupé au
déploiement), les numérote (la révision), les écrit dans un journal et les diffuse. Les joueurs les
rejouent chez eux : le moteur est déterministe (F0-4). Décisions du créateur :
- **F.1 : un coffre commun.** L'inventaire du monde est à tous ses membres.
- **F.2 : le monde est figé quand personne n'y joue.** Les commandes ne font pas avancer l'horloge.
  **E-5 : la nuit est partagée.** Quand tous les joueurs connectés sont couchés, le monde joue lui-même
  `nuit.partagee` (acteur `monde`) : toute la nuit d'un coup, le jour suivant. Un joueur ne peut pas
  l'envoyer, et `nuit.dormir` (la nuit qui défile, en solo) est refusé en ligne.
- **F.3 : un membre est un compte** (les comptes ci-dessus).
- **F.4 : un monde naît de la copie volontaire d'une partie locale**, qui reste intacte.

Routes, toutes avec la session du compte (`Authorization: Bearer`, ou `?session=` pour la WebSocket) :
- `POST /mondes` `{ partie, titre }` : mettre sa ferme en ligne (2 Mo au plus) → `{ monde }` ;
- `GET /mondes` : ses mondes ;
- `GET /mondes/<id>/fiche` : titre, révision, membres (membres seulement) ;
- `GET /mondes/<id>/ws` : la connexion d'un joueur (une WebSocket en hibernation). Messages :
  - `hello { version, depuis? }` → `bienvenue`, puis `rattrape { evts }` (ce qui manque depuis
    `depuis`) ou `instantane { partie }` ; `refus` si le jeu n'a pas la version du monde ou si
    l'on n'est pas membre ;
  - `cmd { id, type, args }` → `ack { id, ok, rev | erreur }` ; à tous, `evt { rev, acteur, cmd }`.
  - `pos { x, y }` (le centre de sa vue) : relayé aux autres membres, `pos { acteur, nom, x, y }`,
    5 fois par seconde au plus, jamais écrit ; `parti { acteur }` quand son dernier onglet se ferme ;
  - `coucher { oui }` : se coucher, ou se relever. À tous : `couches { comptes, connectes }`. C'est
    gardé sur la connexion (`serializeAttachment`, qui survit à l'hibernation), jamais écrit. Tous
    couchés, le monde joue la nuit et la diffuse comme un `evt`. Un joueur qui part ne retient plus
    la nuit.

Stockage SQLite du Durable Object :
- `meta` ;
- `instantane` : la partie entière, toutes les 20 révisions ;
- `journal` : chaque commande acceptée, son `id` unique ;
- `membres` : rôles `proprietaire` et `batisseur`, `revoque`.

Au réveil, la partie se refait : le dernier instantané, puis le journal. Un doublon (le même `id`)
rend le même accusé sans être rejoué. Un membre révoqué est refusé et sa connexion fermée. Les
commandes sont limitées à 120 par minute et par membre.

**À mesurer au premier déploiement.** La première commande d'un monde réveillé tire la carte de sa
graine (≈ 0,3 s de calcul sur un ordinateur, plus sur le serveur). Les limites de temps de calcul
par requête dépendent de l'offre Cloudflare. Si la première commande échoue (Observability :
« exceeded CPU »), il faudra garder la carte tirée avec le monde, ou passer à l'offre payante des
Workers.

**Le jeu** (E-2 : `js/ui/en-ligne.js`, `js/ui/synchro.js`) entre dans un monde par `jeu.html?monde=<id>`.
Il garde deux parties :
- la partie **confirmée**, celle du monde : l'instantané, puis les événements ;
- la partie **locale**, celle qu'on voit : la confirmée, plus ses commandes pas encore revenues,
  rejouées par-dessus.

Un geste est joué tout de suite, puis envoyé. Le geste d'un autre joueur, ou un refus, refait la
partie locale. Coupé, le jeu se reconnecte, demande ce qu'il a manqué depuis sa révision et renvoie ses
commandes en attente. Rien n'est sauvegardé sur l'appareil en ligne. Pour l'instant, on y construit
ensemble (le mode Construire).

`node tests/deux-joueurs.mjs` : deux onglets, deux comptes, le vrai Worker et ses Durable Objects (sur
`node:sqlite`) derrière les routes du navigateur. Chaque mur posé est vu chez l'autre en moins d'une
seconde, les parties confirmées sont celle du monde, et la partie solo n'est pas touchée.

**Inviter un ami** (E-3) :
- `POST /mondes/<id>/invitations` : le propriétaire crée un lien `jeu.html#invitation=<monde>.<secret>`.
  Le secret fait 192 bits ; seule son empreinte est gardée. Le lien vaut 7 jours et ne sert qu'à un
  seul compte. Au plus 20 liens sont en attente par monde.
- `POST /rejoindre { code }` : le lien suivi. Le compte devient bâtisseur et le monde s'ajoute à sa
  liste. Un lien expiré ou déjà servi est refusé ; un membre retiré ne revient pas par un nouveau lien.
- `POST /mondes/<id>/retirer { compte }` : le propriétaire retire un membre. Sa connexion ouverte est
  fermée tout de suite (code 4003) et le monde quitte sa liste.

Dans le jeu, le bouton 👥 du bandeau montre les membres. Le propriétaire y invite (Copier, Partager)
et y retire un membre. Un lien d'invitation ouvert sans être connecté attend la connexion.

E-5 : en ligne, on cultive aussi le potager (labourer, semer, arroser, récolter, la cruche). La
récolte va droit au coffre commun (`direct`), sans attendre le personnage. Une nuit coûte environ
2 ms de calcul sur la ferme d'essai : **à mesurer au premier déploiement** sur une vraie ferme. 
E-6 : les bêtes aussi (`poules.nourrir`, `poules.toutNourrir`, `poulailler.agrandir`, `etable.tondre`,
`etable.herbes`, `etable.place`, `ramassage.prendre`). Le monde ne ramasse pas : à sa création, ce qui
attendait en tas entre au coffre commun (`ramassage` coupé), et tout y va droit ensuite. 
E-7 : la cuisine aussi (`cuisine.lancer`, `cuisine.annuler`, `moulin.moudre`, `moulin.annuler`,
`frigo.ranger`, `frigo.sortir`, `frigo.toutRanger`, `frigo.urgent`, `frigo.acheter`, `frigo.agrandir`,
`boite.deposer`, `boite.reprendre`, `manger`). L'horloge est figée : une préparation finit pendant la
nuit partagée.

E-9 : les outils de la ferme (`outil.couper`, `outil.casser`, `outil.caillou`, `outil.faucher`,
`outil.faucherAutour`, `outil.pecher`, `verger.cueillir`), sans morceaux au sol : tout va au coffre.
Le monde refuse un arbre, un rocher ou une touffe hors de la ferme, et les eaux du grand monde.

E-10 : la progression commune (`tech.acheter`, `atelier.fabriquer`, `atelier.construire`, `appareil.*`,
`reservoir.agrandir`, `robot.batterie`, `arbre.planter`, `potager.semis`). Restent hors
ligne, comme le veut la vision : le Marché, la calèche, les hameaux, le récit, les invitations.

E-13 : les machines de l'Atelier (`botteleuse.verser`, `botteleuse.sortir`, `chaine.verser`,
`distributeur.verser`, `morceau.ramasser`, `cueillette.ramasser`) ; l'horloge figée, les chaînes et le
distributeur font leur journée à la nuit partagée. Pas de commerce en ligne (M.4, décidé).

E-11 : les rôles (`js/engine/roles.js` : visiteur, jardinier, bâtisseur, propriétaire), vérifiés à chaque
commande ; `POST /mondes/<id>/invitations { role }`, `POST /mondes/<id>/role { compte, role }` (le
propriétaire ; la liste des membres est diffusée), `GET /mondes/<id>/journal?avant=` (le propriétaire :
les 50 dernières commandes, avec les noms).

E-12 : les sauvegardes du monde, dans le bucket `SESSIONS` (déjà lié), sous `mondes/<id du Durable
Object>/` : une après chaque nuit partagée, une à la demande, une avant chaque restauration ; les 14
dernières gardées (≈ 100 Ko chacune). `GET` et `POST /mondes/<id>/sauvegardes`, `POST
/mondes/<id>/restaurer { cle }` (le propriétaire). Une restauration écrit un instantané et une marque
`monde.restaurer` au journal ; la partie entière est diffusée.

## Les amis

`src/amis.mjs`, dans le Durable Object des comptes (mêmes base et instance) ; rien à configurer : les
tables sont créées au premier appel, après le déploiement.

- Chaque compte a un **code ami** (`MOON-K7Q2X`, sans 0/O ni 1/I), créé à sa première visite. Un ami se
  trouve par ce code, ou par le lien `jeu.html#ami=MOON-K7Q2X` ; jamais par son adresse e-mail, qui n'est
  montrée nulle part.
- `POST /compte/amis` : le jeu publie le profil du personnage de sa partie solo (prénom, allure, niveau, nom
  de famille, monde où il joue) et reçoit la vue du volet (amis, demandes, boîte). Il le fait à l'ouverture
  du volet et toutes les 45 s : un ami vu depuis moins de 90 s est « en ligne ». Le monde où joue un ami
  n'est dit que si l'on en est membre (pour le rejoindre).
- `POST /compte/amis/ajouter | repondre | retirer | visite | signe | lu` ; `POST /mondes/<id>/inviter-ami`
  (le propriétaire du monde, entre amis seulement) : un lien d'invitation, déposé dans la boîte de l'ami.
- La suppression d'un compte efface son profil, ses amitiés et ses messages.

## La console d'administration

`src/admin.mjs` et `src/admin.html` : la **Console Moon Bloom**, servie par ce Worker à l'adresse `/admin`, pour
toi seul. Cinq écrans :

- **Coûts** : la consommation du mois chez Cloudflare (Worker, Durable Objects, base SQLite, R2), lue par l'API
  d'analytique, la projection en fin de mois et la facture estimée (formule gratuite ou Workers Paid) ;
- **Simulateur** : la facture selon le nombre de joueurs, leurs heures de jeu, la part de jeu en ligne… (« Remplir
  avec mes chiffres » part des 30 derniers jours) ;
- **Joueurs** : les calculs du rapport quotidien sur 24 h, 7 ou 30 jours (actifs, sessions, rétention, niveaux,
  didacticiel, abandons, la liste des joueurs et leur fiche) ;
- **Sessions et retours** : les commentaires des joueurs, les erreurs techniques, les sessions (le contenu de chacune) ;
- **En ligne** : comptes, mondes, amitiés, qui est en ligne (son prénom ; jamais d'adresse e-mail).

La console ne fait que lire. Elle est **fermée** tant que les réglages ci-dessous n'existent pas.

### Mise en route (une seule fois)

1. **Une adresse pour la console** : `admin.moonbloom-village.com`, déclarée dans `wrangler.toml` (`routes`,
   `custom_domain = true`) : le déploiement crée l'enregistrement DNS et le certificat. Rien à faire à la main.
   (Si le déploiement échoue sur cette ligne, le jeton du build n'a pas le droit de créer un domaine : Workers &
   Pages › `family-farm` › Paramètres › Compilations › jeton, avec la permission « Zone › Workers Routes › Edit ».)
2. **Cloudflare Access** (Zero Trust, offre gratuite) : dans le tableau de bord, **Zero Trust**. La première fois,
   choisis un nom d'équipe (par exemple `moonbloom`) et l'offre **Free**. Puis Access › Applications › Add an
   application › **Self-hosted** :
   - nom : Console Moon Bloom ; domaine : `admin.moonbloom-village.com` ;
   - une règle (policy) : Action **Allow**, Include › **Emails** › ton adresse ;
   - méthode de connexion : « One-time PIN » (un code envoyé par e-mail ; rien d'autre à configurer).
   Une fois l'application créée, copie son **Application Audience (AUD) Tag** (onglet Overview de l'application).
3. **Un jeton en lecture seule pour l'analytique** : My Profile › API Tokens › Create Token › Custom token :
   permission **Account › Account Analytics › Read**, ressource : ton compte. Copie le jeton.
4. **Les secrets du Worker** (Workers & Pages › `family-farm` › Settings › Variables and Secrets › Add, type
   **Secret** pour chacun ; jamais dans `wrangler.toml`, le dépôt est public) :
   - `ACCESS_EQUIPE` : le nom d'équipe Access de l'étape 2 (`moonbloom`) ;
   - `ACCESS_AUD` : l'AUD Tag de l'étape 2 ;
   - `ADMIN_EMAILS` : ton adresse (plusieurs : séparées par des virgules) ;
   - `CF_API_TOKEN` : le jeton de l'étape 3 ;
   - `CF_ACCOUNT_ID` : l'identifiant du compte (Workers & Pages › Overview, à droite : Account ID).
5. Ouvre `https://admin.moonbloom-village.com/admin` : Access demande ton adresse, t'envoie un code, et la
   console s'ouvre.

Le Worker vérifie lui-même le jeton d'Access (signature, audience, expiration) et l'adresse : une requête qui ne
passe pas par Access (par exemple `family-farm….workers.dev/admin`) est refusée. Si une mesure de l'écran Coûts
est « indisponible », son message dit pourquoi (un champ que Cloudflare a renommé, par exemple) : les autres
s'affichent quand même.

### Moins d'opérations R2 (la télémétrie)

Le jeu envoie sa session chaque minute de jeu. Avant, chaque envoi relisait et réécrivait aussi la fiche du
joueur (`players/<id>.json`) : 2 écritures et 1 lecture R2 par minute. Le jeu ne la demande plus qu'au premier
envoi d'une visite, toutes les 10 minutes et à la fin (`fiche: true` dans la session) : ≈ 1,1 écriture et
0,1 lecture par minute. Un ancien jeu, sans ce champ, garde l'ancien comportement.

## Les gemmes (achats en argent réel, par Stripe)

`worker/src/boutique.mjs` ; dans le jeu, `js/ui/gemmes.js`. Les gemmes 💎 s'achètent en packs (200 gemmes à
1,99 €, 550 à 4,99 €, 1 200 à 9,99 €) et achètent les rosiers grimpants (25 gemmes, 4 coloris), les guirlandes lumineuses (60 gemmes le lot de 8 segments, 4 coloris), les cheminées d'intérieur (120 gemmes, 3 matières), les fontaines de jardin (120 gemmes, 4 modèles), les arbres d'ornement (90 gemmes, 4 espèces), les enseignes de ferme avec leur boîte aux lettres (50 gemmes, 3 matières, 5 couleurs), les ensembles chalet de montagne, cottage anglais, bord de mer et chambre d'enfant féerique (220 gemmes chacun, ou chacun de leurs six objets seul), les décors de Noël (sapin 120, couronne 40, bonhomme de neige 60 gemmes ; en décembre) et d'Halloween (citrouille 30, tas de citrouilles 70 ; du 15 octobre au 2 novembre) et de Pâques (panier d'œufs 40, œuf géant 60 ; des deux semaines avant Pâques au lundi de Pâques, la date calculée chaque année : dimanchePaques), en vente seulement à leur période (BOUTIQUE.FETES, enVente), et les papiers peints (40 gemmes, 6 motifs, débloqués pour toujours). Le solde, les
paiements et les achats sont dans la base du Durable Object Comptes : jamais dans la partie, qui se modifie à la
main. Il faut un compte du jeu en ligne pour acheter.

Le paiement passe par **Stripe Checkout** (la page de paiement hébergée par Stripe : le jeu ne voit jamais de
carte) : `POST /compte/boutique/payer` crée la session de paiement, Stripe prévient le Worker sur
`POST /stripe/webhook` (événement `checkout.session.completed`), le Worker vérifie la signature (en-tête
`Stripe-Signature`, HMAC SHA-256, 5 minutes de tolérance), puis crédite les gemmes une seule fois. Sources :
[Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create),
[Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks).

Le mode (test ou réel) vient de la clé : `sk_test_` / `rk_test_` : paiements fictifs, la console et le jeu le
disent ; `sk_live_` / `rk_live_` : vrais paiements. Sans les deux secrets, l'achat de gemmes reste fermé.

### Mise en route du mode test (une seule fois)

1. **Un compte Stripe** : [dashboard.stripe.com/register](https://dashboard.stripe.com/register). Pour tester,
   pas besoin d'activer les vrais paiements.
2. **La clé de test** : dans le tableau de bord de Stripe, en mode bac à sable (*sandbox*), page
   [API keys](https://dashboard.stripe.com/apikeys) ; copier la **clé secrète** (elle commence par `sk_test_`).
   Source : [API keys](https://docs.stripe.com/keys).
3. **Le point de réception des notifications** : page [Webhooks](https://dashboard.stripe.com/webhooks) (dans
   Workbench), toujours en bac à sable : **Create an event destination** › **Your account** › format
   **Snapshot** › l'événement `checkout.session.completed` (et `checkout.session.async_payment_succeeded`) ›
   **Webhook endpoint** › adresse : `https://family-farm.contact-voidr.workers.dev/stripe/webhook`. Sur la page
   du point créé, **Reveal secret** donne le secret de signature (il commence par `whsec_`). Source :
   [Set up your endpoint](https://docs.stripe.com/webhooks#webhook-endpoint-def).
4. **Les deux secrets du Worker** : Cloudflare › Workers & Pages › `family-farm` › Paramètres › Variables et
   secrets › Ajouter, type **Secret** :
   - `STRIPE_SECRET_KEY` = la clé `sk_test_…`
   - `STRIPE_WEBHOOK_SECRET` = le secret `whsec_…`

   Jamais dans `wrangler.toml` (le dépôt est public).
5. **Essayer** : dans le jeu, connecté, toucher 💎 sous les pièces, choisir un pack ; sur la page de Stripe, la
   carte de test `4242 4242 4242 4242`, une date future (par exemple 12/34), n'importe quel code à 3 chiffres.
   Source : [Testing](https://docs.stripe.com/testing). De retour dans le jeu, les gemmes arrivent en quelques
   secondes ; la console (écran **Ventes**) montre le paiement « test ».

### Avant les vrais paiements

- Faire relire et compléter `cgv.html` (brouillon : vendeur, médiateur de la consommation, droit de
  rétractation) ; activer le compte Stripe (identité, compte bancaire).
- Activer l'envoi des reçus par e-mail dans Stripe (la confirmation d'achat que demande la renonciation au droit
  de rétractation pour un contenu numérique).
- Remplacer les deux secrets par ceux du mode réel (une clé restreinte `rk_live_` avec l'écriture des sessions
  Checkout, conseillée par Stripe, ou `sk_live_` ; et le secret du point de réception créé en mode réel).

## Mise en route du rapport (une seule fois)

1. **Créer un dépôt privé** pour les rapports, par exemple `family_farm_rapports`
   (GitHub › New repository › Private). Les issues y sont activées par défaut.
2. **Créer un jeton GitHub limité à ce dépôt** : Settings › Developer settings ›
   Personal access tokens › Fine-grained tokens › Generate new token.
   - Repository access : *Only select repositories*, puis le dépôt de rapports ;
   - Permissions › Repository › **Issues : Read and write** (Metadata : Read est ajouté
     automatiquement) ;
   - Expiration : ces jetons expirent. **Note la date** : après elle, les rapports
     s'arrêtent (erreur 401 visible dans Observability) et il faut en créer un nouveau.
3. Dans Cloudflare : Workers › `family-farm` › Settings › Variables and Secrets, ajouter
   en **secrets** :
   - `REPORT_GITHUB_TOKEN` : le jeton de l'étape 2 ;
   - `REPORT_GITHUB_REPO` : `ton-compte/family_farm_rapports` ;
   - `REPORT_TOKEN` (facultatif) : une longue chaîne aléatoire, pour tester.
4. Déployer (fusionner la pull request : Workers Builds redéploie).
5. Tester sans attendre : ouvrir
   `https://family-farm.contact-voidr.workers.dev/report?token=VOTRE_JETON&publish=1`.
   La page affiche le rapport et l'adresse de l'issue créée (ou la raison de l'échec).
6. **Recevoir l'e-mail** : sur GitHub, Settings › Notifications, vérifier que les
   notifications par e-mail sont actives, et surveiller le dépôt de rapports
   (Watch › All activity). L'issue est créée à ton nom : si aucun e-mail n'arrive,
   cocher « Include your own updates » dans la partie e-mail des mêmes réglages.
   Ce point n'a pas pu être vérifié à l'avance.
7. Le lendemain à 13 h, vérifier dans Workers › `family-farm` › Observability le
   message « rapport publié » (ou « rapport en échec »).

## Limites connues

- Le rapport lit au plus 700 fichiers de session et 200 fiches de joueur par jour (limite
  de sous-requêtes de Cloudflare) ; au-delà, il l'indique dans la section « À savoir ».
- Les jours de jeu sont comptés par joueur : un jour commencé avant la période, ou joué
  sur deux appareils (deux numéros de joueur), n'est vu qu'en partie.
- Effacer les données d'un joueur (demande d'effacement) : supprimer `players/<id>.json`
  et les fichiers `sessions/` dont `player.id` vaut ce numéro (ou le numéro de session
  donné par le joueur).
- Le temps par chapitre est une approximation : le jeu note le chapitre à chaque
  nuit, et le temps « onglet visible » est réparti au prorata du temps écoulé.
- Les données de suivi sont conservées 12 mois d'après `cookies.html` : prévoir une
  règle de cycle de vie sur le bucket R2 (Settings › Object lifecycle rules).
- Le jeton GitHub expire (voir l'étape 2).

## Vérification avant la fusion

Une pull request qui touche `worker/` ou `wrangler.toml` lance l'action **Worker Cloudflare**
(`.github/workflows/worker.yml`) : les tests du rapport, puis `wrangler deploy --dry-run` et
`wrangler versions upload --dry-run` (wrangler épinglé dans l'action). Le Worker y est construit et
sa configuration lue comme chez Cloudflare, sans rien déployer : une erreur du code ou de
`wrangler.toml` apparaît dans la pull request, avec son journal.

## Si « Workers Builds: family-farm » échoue

Ce contrôle est posté par Cloudflare (Workers Builds), pas par GitHub Actions : son journal n'est
lisible que dans le tableau de bord (lien « Details » du contrôle, ou Workers › `family-farm` ›
Deployments › Builds). Si l'action **Worker Cloudflare** ci-dessus est verte, le code et
`wrangler.toml` se construisent : l'échec vient alors des réglages du build chez Cloudflare. À
vérifier dans Workers › `family-farm` › Settings › Build :

- **Root directory** : `/` (le dépôt) ;
- **Build command** : vide (rien à construire avant le déploiement) ;
- **Deploy command** : `npx wrangler deploy` ;
- **Non-production branch deploy command** : `npx wrangler versions upload`, ou désactiver les
  builds des branches autres que `main` (Branch control) si les aperçus ne servent pas ;
- **API token** : le jeton du build doit encore exister et avoir les droits Workers Scripts (Edit)
  et R2 (le bucket `ferme-familiale-sessions`) ; un jeton supprimé ou expiré fait échouer le build
  dès son début.

## Tests

`node tests/test-report.mjs` (depuis la racine du dépôt) : calculs, passage été/hiver, publication
GitHub simulée (dépôt public refusé, jeton jamais journalisé), protections de la collecte.

`node tests/test-comptes.mjs` : les comptes. La base SQLite du Durable Object est simulée par
`node:sqlite`, l'envoi par une fonction qui garde l'e-mail. Les tests couvrent les liens à usage
unique, leur expiration et celle des sessions, les limites de demandes, la suppression, les
empreintes seules en base, les routes et le Worker (CORS, origine, sans Durable Object).
