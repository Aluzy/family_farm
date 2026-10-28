# Les icônes du jeu

> Dossier produit par `python3 scripts/icones/export.py` (lancé aussi par `scripts/icones/build.py`) :
> ne pas le modifier à la main, il est refait à chaque construction des planches.

| Dossier | Contenu |
|---|---|
| [`16px/`](16px) | les 422 icônes d'emoji à leur taille réelle (16×16, fond transparent) : **à retoucher** |
| [`x8/`](x8) | les mêmes agrandies 8 fois (128×128), pour les regarder |
| [`dessins/`](dessins) | les 35 dessins de 32×32 (bâtiments, arbres, bêtes, boutons), et agrandis 4 fois dans `dessins/agrandis/` |

## Télécharger

- Une icône : ouvrir le fichier sur GitHub, puis le bouton « Download raw file ».
- Tout le dossier : sur la page du dépôt, « Code » → « Download ZIP », puis garder `icones/`.

## Retoucher

Retoucher **le fichier de `16px/`** (pas l'agrandi) dans un logiciel de pixel art
(Aseprite, Piskel, LibreSprite…), sans anticrénelage ni flou. Le style : contour de 1 px
dans une teinte très sombre de la couleur de l'objet, lumière en haut à gauche, 3 à 4
teintes par matière, l'objet occupe 12 à 15 px.

Le jeu ne lit pas ce dossier : il dessine ses icônes depuis le fichier indiqué dans la
colonne « Source » ci-dessous. Pour qu'une retouche entre dans le jeu, la reporter dans ce
fichier puis lancer `python3 scripts/icones/build.py` (voir [`docs/icones.md`](../docs/icones.md)).

## Icônes d'emoji (422)

| Icône | Emoji | Fichier | Source |
|:---:|:---:|---|---|
| <img src="x8/information_source.png" width="48" height="48" alt=""> | ℹ | [`information_source.png`](16px/information_source.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/stopwatch.png" width="48" height="48" alt=""> | ⏱ | [`stopwatch.png`](16px/stopwatch.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/hourglass_with_flowing_sand.png" width="48" height="48" alt=""> | ⏳ | [`hourglass_with_flowing_sand.png`](16px/hourglass_with_flowing_sand.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/black_sun_with_rays.png" width="48" height="48" alt=""> | ☀ | [`black_sun_with_rays.png`](16px/black_sun_with_rays.png) | `scripts/icones/art_nature.py` |
| <img src="x8/hot_beverage.png" width="48" height="48" alt=""> | ☕ | [`hot_beverage.png`](16px/hot_beverage.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/hot_beverage+chocolate_bar.png" width="48" height="48" alt=""> | ☕‍🍫 | [`hot_beverage+chocolate_bar.png`](16px/hot_beverage+chocolate_bar.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/hot_beverage+fire.png" width="48" height="48" alt=""> | ☕‍🔥 | [`hot_beverage+fire.png`](16px/hot_beverage+fire.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/hammer_and_pick.png" width="48" height="48" alt=""> | ⚒ | [`hammer_and_pick.png`](16px/hammer_and_pick.png) | `scripts/icones/art_outils.py` |
| <img src="x8/gear.png" width="48" height="48" alt=""> | ⚙ | [`gear.png`](16px/gear.png) | `scripts/icones/art_outils.py` |
| <img src="x8/gear+ear_of_rice.png" width="48" height="48" alt=""> | ⚙‍🌾 | [`gear+ear_of_rice.png`](16px/gear+ear_of_rice.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/warning_sign.png" width="48" height="48" alt=""> | ⚠ | [`warning_sign.png`](16px/warning_sign.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/high_voltage_sign.png" width="48" height="48" alt=""> | ⚡ | [`high_voltage_sign.png`](16px/high_voltage_sign.png) | `scripts/icones/art_essai.py` |
| <img src="x8/pick.png" width="48" height="48" alt=""> | ⛏ | [`pick.png`](16px/pick.png) | `scripts/icones/art_outils.py` |
| <img src="x8/helmet_with_white_cross+electric_light_bulb.png" width="48" height="48" alt=""> | ⛑‍💡 | [`helmet_with_white_cross+electric_light_bulb.png`](16px/helmet_with_white_cross+electric_light_bulb.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/no_entry.png" width="48" height="48" alt=""> | ⛔ | [`no_entry.png`](16px/no_entry.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/fountain.png" width="48" height="48" alt=""> | ⛲ | [`fountain.png`](16px/fountain.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/black_scissors.png" width="48" height="48" alt=""> | ✂ | [`black_scissors.png`](16px/black_scissors.png) | `scripts/icones/art_outils.py` |
| <img src="x8/white_heavy_check_mark.png" width="48" height="48" alt=""> | ✅ | [`white_heavy_check_mark.png`](16px/white_heavy_check_mark.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/envelope.png" width="48" height="48" alt=""> | ✉ | [`envelope.png`](16px/envelope.png) | `scripts/icones/art_outils.py` |
| <img src="x8/pencil.png" width="48" height="48" alt=""> | ✏ | [`pencil.png`](16px/pencil.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/sparkles.png" width="48" height="48" alt=""> | ✨ | [`sparkles.png`](16px/sparkles.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/snowflake.png" width="48" height="48" alt=""> | ❄ | [`snowflake.png`](16px/snowflake.png) | `scripts/icones/art_nature.py` |
| <img src="x8/cross_mark.png" width="48" height="48" alt=""> | ❌ | [`cross_mark.png`](16px/cross_mark.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/heavy_black_heart.png" width="48" height="48" alt=""> | ❤ | [`heavy_black_heart.png`](16px/heavy_black_heart.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/heavy_plus_sign.png" width="48" height="48" alt=""> | ➕ | [`heavy_plus_sign.png`](16px/heavy_plus_sign.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/curly_loop.png" width="48" height="48" alt=""> | ➰ | [`curly_loop.png`](16px/curly_loop.png) | `scripts/icones/art_cheval.py` |
| <img src="x8/white_large_square.png" width="48" height="48" alt=""> | ⬜ | [`white_large_square.png`](16px/white_large_square.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/white_medium_star+water_wave.png" width="48" height="48" alt=""> | ⭐‍🌊 | [`white_medium_star+water_wave.png`](16px/white_medium_star+water_wave.png) | `scripts/icones/art_nature.py` |
| <img src="x8/sunrise.png" width="48" height="48" alt=""> | 🌅 | [`sunrise.png`](16px/sunrise.png) | `scripts/icones/art_nature.py` |
| <img src="x8/new_moon_symbol.png" width="48" height="48" alt=""> | 🌑 | [`new_moon_symbol.png`](16px/new_moon_symbol.png) | `scripts/icones/art_nature.py` |
| <img src="x8/waxing_crescent_moon_symbol.png" width="48" height="48" alt=""> | 🌒 | [`waxing_crescent_moon_symbol.png`](16px/waxing_crescent_moon_symbol.png) | `scripts/icones/art_nature.py` |
| <img src="x8/full_moon_symbol.png" width="48" height="48" alt=""> | 🌕 | [`full_moon_symbol.png`](16px/full_moon_symbol.png) | `scripts/icones/art_nature.py` |
| <img src="x8/waning_crescent_moon_symbol.png" width="48" height="48" alt=""> | 🌘 | [`waning_crescent_moon_symbol.png`](16px/waning_crescent_moon_symbol.png) | `scripts/icones/art_nature.py` |
| <img src="x8/crescent_moon.png" width="48" height="48" alt=""> | 🌙 | [`crescent_moon.png`](16px/crescent_moon.png) | `scripts/icones/art_nature.py` |
| <img src="x8/cloud_with_rain.png" width="48" height="48" alt=""> | 🌧 | [`cloud_with_rain.png`](16px/cloud_with_rain.png) | `scripts/icones/art_nature.py` |
| <img src="x8/chestnut.png" width="48" height="48" alt=""> | 🌰 | [`chestnut.png`](16px/chestnut.png) | `scripts/icones/art_nature.py` |
| <img src="x8/seedling.png" width="48" height="48" alt=""> | 🌱 | [`seedling.png`](16px/seedling.png) | `scripts/icones/art_essai.py` |
| <img src="x8/seedling+sunflower.png" width="48" height="48" alt=""> | 🌱‍🌻 | [`seedling+sunflower.png`](16px/seedling+sunflower.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+tomato.png" width="48" height="48" alt=""> | 🌱‍🍅 | [`seedling+tomato.png`](16px/seedling+tomato.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+aubergine.png" width="48" height="48" alt=""> | 🌱‍🍆 | [`seedling+aubergine.png`](16px/seedling+aubergine.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+red_apple.png" width="48" height="48" alt=""> | 🌱‍🍎 | [`seedling+red_apple.png`](16px/seedling+red_apple.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/seedling+pear.png" width="48" height="48" alt=""> | 🌱‍🍐 | [`seedling+pear.png`](16px/seedling+pear.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/seedling+peach.png" width="48" height="48" alt=""> | 🌱‍🍑 | [`seedling+peach.png`](16px/seedling+peach.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/seedling+cherries.png" width="48" height="48" alt=""> | 🌱‍🍒 | [`seedling+cherries.png`](16px/seedling+cherries.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/seedling+strawberry.png" width="48" height="48" alt=""> | 🌱‍🍓 | [`seedling+strawberry.png`](16px/seedling+strawberry.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+large_orange_circle.png" width="48" height="48" alt=""> | 🌱‍🟠 | [`seedling+large_orange_circle.png`](16px/seedling+large_orange_circle.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/seedling+cucumber.png" width="48" height="48" alt=""> | 🌱‍🥒 | [`seedling+cucumber.png`](16px/seedling+cucumber.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+carrot.png" width="48" height="48" alt=""> | 🌱‍🥕 | [`seedling+carrot.png`](16px/seedling+carrot.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+leafy_green.png" width="48" height="48" alt=""> | 🌱‍🥬 | [`seedling+leafy_green.png`](16px/seedling+leafy_green.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+onion.png" width="48" height="48" alt=""> | 🌱‍🧅 | [`seedling+onion.png`](16px/seedling+onion.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/seedling+bell_pepper.png" width="48" height="48" alt=""> | 🌱‍🫑 | [`seedling+bell_pepper.png`](16px/seedling+bell_pepper.png) | `dérivée (derived() d'un art_*.py)` |
| <img src="x8/evergreen_tree+large_brown_circle.png" width="48" height="48" alt=""> | 🌲‍🟤 | [`evergreen_tree+large_brown_circle.png`](16px/evergreen_tree+large_brown_circle.png) | `scripts/icones/art_graines_arbres.py` |
| <img src="x8/deciduous_tree.png" width="48" height="48" alt=""> | 🌳 | [`deciduous_tree.png`](16px/deciduous_tree.png) | `scripts/icones/art_nature.py` |
| <img src="x8/deciduous_tree+large_brown_circle.png" width="48" height="48" alt=""> | 🌳‍🟤 | [`deciduous_tree+large_brown_circle.png`](16px/deciduous_tree+large_brown_circle.png) | `scripts/icones/art_graines_arbres.py` |
| <img src="x8/hot_pepper.png" width="48" height="48" alt=""> | 🌶 | [`hot_pepper.png`](16px/hot_pepper.png) | `scripts/icones/art_ville.py` |
| <img src="x8/sunflower.png" width="48" height="48" alt=""> | 🌻 | [`sunflower.png`](16px/sunflower.png) | `scripts/icones/art_nature.py` |
| <img src="x8/ear_of_rice.png" width="48" height="48" alt=""> | 🌾 | [`ear_of_rice.png`](16px/ear_of_rice.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/ear_of_rice+gear.png" width="48" height="48" alt=""> | 🌾‍⚙ | [`ear_of_rice+gear.png`](16px/ear_of_rice+gear.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/ear_of_rice+hocho.png" width="48" height="48" alt=""> | 🌾‍🔪 | [`ear_of_rice+hocho.png`](16px/ear_of_rice+hocho.png) | `scripts/icones/art_outils.py` |
| <img src="x8/ear_of_rice+canoe.png" width="48" height="48" alt=""> | 🌾‍🛶 | [`ear_of_rice+canoe.png`](16px/ear_of_rice+canoe.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/ear_of_rice+ladder.png" width="48" height="48" alt=""> | 🌾‍🪜 | [`ear_of_rice+ladder.png`](16px/ear_of_rice+ladder.png) | `scripts/icones/art_cheval.py` |
| <img src="x8/herb.png" width="48" height="48" alt=""> | 🌿 | [`herb.png`](16px/herb.png) | `scripts/icones/art_nature.py` |
| <img src="x8/herb+water_wave.png" width="48" height="48" alt=""> | 🌿‍🌊 | [`herb+water_wave.png`](16px/herb+water_wave.png) | `scripts/icones/art_nature.py` |
| <img src="x8/herb+snow_capped_mountain.png" width="48" height="48" alt=""> | 🌿‍🏔 | [`herb+snow_capped_mountain.png`](16px/herb+snow_capped_mountain.png) | `assets/trouvailles.png (case 8, 0)` |
| <img src="x8/fallen_leaf.png" width="48" height="48" alt=""> | 🍂 | [`fallen_leaf.png`](16px/fallen_leaf.png) | `scripts/icones/art_nature.py` |
| <img src="x8/mushroom.png" width="48" height="48" alt=""> | 🍄 | [`mushroom.png`](16px/mushroom.png) | `scripts/icones/art_ville.py` |
| <img src="x8/mushroom+sparkles.png" width="48" height="48" alt=""> | 🍄‍✨ | [`mushroom+sparkles.png`](16px/mushroom+sparkles.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/tomato.png" width="48" height="48" alt=""> | 🍅 | [`tomato.png`](16px/tomato.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/aubergine.png" width="48" height="48" alt=""> | 🍆 | [`aubergine.png`](16px/aubergine.png) | `scripts/icones/art_nature.py` |
| <img src="x8/red_apple.png" width="48" height="48" alt=""> | 🍎 | [`red_apple.png`](16px/red_apple.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/pear.png" width="48" height="48" alt=""> | 🍐 | [`pear.png`](16px/pear.png) | `scripts/icones/art_nature.py` |
| <img src="x8/peach.png" width="48" height="48" alt=""> | 🍑 | [`peach.png`](16px/peach.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/peach+large_orange_circle.png" width="48" height="48" alt=""> | 🍑‍🟠 | [`peach+large_orange_circle.png`](16px/peach+large_orange_circle.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/cherries.png" width="48" height="48" alt=""> | 🍒 | [`cherries.png`](16px/cherries.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/cherries+cherry_blossom.png" width="48" height="48" alt=""> | 🍒‍🌸 | [`cherries+cherry_blossom.png`](16px/cherries+cherry_blossom.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/strawberry.png" width="48" height="48" alt=""> | 🍓 | [`strawberry.png`](16px/strawberry.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/hamburger.png" width="48" height="48" alt=""> | 🍔 | [`hamburger.png`](16px/hamburger.png) | `scripts/icones/art_boutiques.py` |
| <img src="x8/slice_of_pizza.png" width="48" height="48" alt=""> | 🍕 | [`slice_of_pizza.png`](16px/slice_of_pizza.png) | `scripts/icones/art_boutiques.py` |
| <img src="x8/meat_on_bone.png" width="48" height="48" alt=""> | 🍖 | [`meat_on_bone.png`](16px/meat_on_bone.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/poultry_leg.png" width="48" height="48" alt=""> | 🍗 | [`poultry_leg.png`](16px/poultry_leg.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cooked_rice.png" width="48" height="48" alt=""> | 🍚 | [`cooked_rice.png`](16px/cooked_rice.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cooked_rice+glass_of_milk.png" width="48" height="48" alt=""> | 🍚‍🥛 | [`cooked_rice+glass_of_milk.png`](16px/cooked_rice+glass_of_milk.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/bread.png" width="48" height="48" alt=""> | 🍞 | [`bread.png`](16px/bread.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/bread+honey_pot.png" width="48" height="48" alt=""> | 🍞‍🍯 | [`bread+honey_pot.png`](16px/bread+honey_pot.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/french_fries.png" width="48" height="48" alt=""> | 🍟 | [`french_fries.png`](16px/french_fries.png) | `scripts/icones/art_boutiques.py` |
| <img src="x8/ice_cream.png" width="48" height="48" alt=""> | 🍨 | [`ice_cream.png`](16px/ice_cream.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/chocolate_bar.png" width="48" height="48" alt=""> | 🍫 | [`chocolate_bar.png`](16px/chocolate_bar.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/candy.png" width="48" height="48" alt=""> | 🍬 | [`candy.png`](16px/candy.png) | `scripts/icones/art_ville.py` |
| <img src="x8/custard.png" width="48" height="48" alt=""> | 🍮 | [`custard.png`](16px/custard.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/honey_pot.png" width="48" height="48" alt=""> | 🍯 | [`honey_pot.png`](16px/honey_pot.png) | `scripts/icones/art_ville.py` |
| <img src="x8/shortcake.png" width="48" height="48" alt=""> | 🍰 | [`shortcake.png`](16px/shortcake.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/pot_of_food.png" width="48" height="48" alt=""> | 🍲 | [`pot_of_food.png`](16px/pot_of_food.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/pot_of_food+carrot.png" width="48" height="48" alt=""> | 🍲‍🥕 | [`pot_of_food+carrot.png`](16px/pot_of_food+carrot.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cooking.png" width="48" height="48" alt=""> | 🍳 | [`cooking.png`](16px/cooking.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cooking+mushroom.png" width="48" height="48" alt=""> | 🍳‍🍄 | [`cooking+mushroom.png`](16px/cooking+mushroom.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cooking+egg.png" width="48" height="48" alt=""> | 🍳‍🥚 | [`cooking+egg.png`](16px/cooking+egg.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/beer_mug.png" width="48" height="48" alt=""> | 🍺 | [`beer_mug.png`](16px/beer_mug.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/fork_and_knife_with_plate.png" width="48" height="48" alt=""> | 🍽 | [`fork_and_knife_with_plate.png`](16px/fork_and_knife_with_plate.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/party_popper.png" width="48" height="48" alt=""> | 🎉 | [`party_popper.png`](16px/party_popper.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/pine_decoration.png" width="48" height="48" alt=""> | 🎍 | [`pine_decoration.png`](16px/pine_decoration.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/school_satchel+herb.png" width="48" height="48" alt=""> | 🎒‍🌿 | [`school_satchel+herb.png`](16px/school_satchel+herb.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/school_satchel+ball_of_yarn.png" width="48" height="48" alt=""> | 🎒‍🧶 | [`school_satchel+ball_of_yarn.png`](16px/school_satchel+ball_of_yarn.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/control_knobs.png" width="48" height="48" alt=""> | 🎛 | [`control_knobs.png`](16px/control_knobs.png) | `scripts/icones/art_outils.py` |
| <img src="x8/fishing_pole_and_fish.png" width="48" height="48" alt=""> | 🎣 | [`fishing_pole_and_fish.png`](16px/fishing_pole_and_fish.png) | `scripts/icones/art_outils.py` |
| <img src="x8/clapper_board.png" width="48" height="48" alt=""> | 🎬 | [`clapper_board.png`](16px/clapper_board.png) | `scripts/icones/art_ville.py` |
| <img src="x8/performing_arts.png" width="48" height="48" alt=""> | 🎭 | [`performing_arts.png`](16px/performing_arts.png) | `scripts/icones/art_ville.py` |
| <img src="x8/sports_medal.png" width="48" height="48" alt=""> | 🏅 | [`sports_medal.png`](16px/sports_medal.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/trophy.png" width="48" height="48" alt=""> | 🏆 | [`trophy.png`](16px/trophy.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/building_construction.png" width="48" height="48" alt=""> | 🏗 | [`building_construction.png`](16px/building_construction.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/house_buildings.png" width="48" height="48" alt=""> | 🏘 | [`house_buildings.png`](16px/house_buildings.png) | `scripts/icones/art_monde.py` |
| <img src="x8/cityscape.png" width="48" height="48" alt=""> | 🏙 | [`cityscape.png`](16px/cityscape.png) | `scripts/icones/art_ville.py` |
| <img src="x8/derelict_house_building.png" width="48" height="48" alt=""> | 🏚 | [`derelict_house_building.png`](16px/derelict_house_building.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/house_building.png" width="48" height="48" alt=""> | 🏠 | [`house_building.png`](16px/house_building.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/house_with_garden.png" width="48" height="48" alt=""> | 🏡 | [`house_with_garden.png`](16px/house_with_garden.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/convenience_store.png" width="48" height="48" alt=""> | 🏪 | [`convenience_store.png`](16px/convenience_store.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/izakaya_lantern.png" width="48" height="48" alt=""> | 🏮 | [`izakaya_lantern.png`](16px/izakaya_lantern.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/amphora.png" width="48" height="48" alt=""> | 🏺 | [`amphora.png`](16px/amphora.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/cow.png" width="48" height="48" alt=""> | 🐄 | [`cow.png`](16px/cow.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/snail.png" width="48" height="48" alt=""> | 🐌 | [`snail.png`](16px/snail.png) | `assets/trouvailles.png (case 5, 0)` |
| <img src="x8/sheep.png" width="48" height="48" alt=""> | 🐑 | [`sheep.png`](16px/sheep.png) | `scripts/icones/art_essai.py` |
| <img src="x8/chicken.png" width="48" height="48" alt=""> | 🐔 | [`chicken.png`](16px/chicken.png) | `scripts/icones/art_essai.py` |
| <img src="x8/spiral_shell.png" width="48" height="48" alt=""> | 🐚 | [`spiral_shell.png`](16px/spiral_shell.png) | `assets/trouvailles.png (case 4, 0)` |
| <img src="x8/honeybee.png" width="48" height="48" alt=""> | 🐝 | [`honeybee.png`](16px/honeybee.png) | `scripts/icones/art_ruche.py` |
| <img src="x8/fish.png" width="48" height="48" alt=""> | 🐟 | [`fish.png`](16px/fish.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+snowflake.png" width="48" height="48" alt=""> | 🐟‍❄ | [`fish+snowflake.png`](16px/fish+snowflake.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+white_medium_star.png" width="48" height="48" alt=""> | 🐟‍⭐ | [`fish+white_medium_star.png`](16px/fish+white_medium_star.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+cyclone.png" width="48" height="48" alt=""> | 🐟‍🌀 | [`fish+cyclone.png`](16px/fish+cyclone.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+rainbow.png" width="48" height="48" alt=""> | 🐟‍🌈 | [`fish+rainbow.png`](16px/fish+rainbow.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+water_wave.png" width="48" height="48" alt=""> | 🐟‍🌊 | [`fish+water_wave.png`](16px/fish+water_wave.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+droplet.png" width="48" height="48" alt=""> | 🐟‍💧 | [`fish+droplet.png`](16px/fish+droplet.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+fire.png" width="48" height="48" alt=""> | 🐟‍🔥 | [`fish+fire.png`](16px/fish+fire.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/fish+large_orange_diamond.png" width="48" height="48" alt=""> | 🐟‍🔶 | [`fish+large_orange_diamond.png`](16px/fish+large_orange_diamond.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+dumpling.png" width="48" height="48" alt=""> | 🐟‍🥟 | [`fish+dumpling.png`](16px/fish+dumpling.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/fish+tooth.png" width="48" height="48" alt=""> | 🐟‍🦷 | [`fish+tooth.png`](16px/fish+tooth.png) | `scripts/icones/art_ville.py` |
| <img src="x8/fish+rock.png" width="48" height="48" alt=""> | 🐟‍🪨 | [`fish+rock.png`](16px/fish+rock.png) | `scripts/icones/art_ville.py` |
| <img src="x8/cat_face.png" width="48" height="48" alt=""> | 🐱 | [`cat_face.png`](16px/cat_face.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/horse_face.png" width="48" height="48" alt=""> | 🐴 | [`horse_face.png`](16px/horse_face.png) | `scripts/icones/art_cheval.py` |
| <img src="x8/dog_face.png" width="48" height="48" alt=""> | 🐶 | [`dog_face.png`](16px/dog_face.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/paw_prints.png" width="48" height="48" alt=""> | 🐾 | [`paw_prints.png`](16px/paw_prints.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/waving_hand_sign.png" width="48" height="48" alt=""> | 👋 | [`waving_hand_sign.png`](16px/waving_hand_sign.png) | `scripts/icones/art_gens.py` |
| <img src="x8/womans_hat+ear_of_rice.png" width="48" height="48" alt=""> | 👒‍🌾 | [`womans_hat+ear_of_rice.png`](16px/womans_hat+ear_of_rice.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/jeans+wrench.png" width="48" height="48" alt=""> | 👖‍🔧 | [`jeans+wrench.png`](16px/jeans+wrench.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/womans_boots+large_brown_square.png" width="48" height="48" alt=""> | 👢‍🟫 | [`womans_boots+large_brown_square.png`](16px/womans_boots+large_brown_square.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/boy.png" width="48" height="48" alt=""> | 👦 | [`boy.png`](16px/boy.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy+person_with_blond_hair.png" width="48" height="48" alt=""> | 👦‍👱 | [`boy+person_with_blond_hair.png`](16px/boy+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👦‍🦰 | [`boy+emoji_component_red_hair.png`](16px/boy+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👦‍🦱 | [`boy+emoji_component_curly_hair.png`](16px/boy+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy+billed_cap.png" width="48" height="48" alt=""> | 👦‍🧢 | [`boy+billed_cap.png`](16px/boy+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_1_2.png" width="48" height="48" alt=""> | 👦🏻 | [`boy_skin_type_1_2.png`](16px/boy_skin_type_1_2.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_1_2+person_with_blond_hair.png" width="48" height="48" alt=""> | 👦🏻‍👱 | [`boy_skin_type_1_2+person_with_blond_hair.png`](16px/boy_skin_type_1_2+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_1_2+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👦🏻‍🦰 | [`boy_skin_type_1_2+emoji_component_red_hair.png`](16px/boy_skin_type_1_2+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_1_2+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👦🏻‍🦱 | [`boy_skin_type_1_2+emoji_component_curly_hair.png`](16px/boy_skin_type_1_2+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_1_2+billed_cap.png" width="48" height="48" alt=""> | 👦🏻‍🧢 | [`boy_skin_type_1_2+billed_cap.png`](16px/boy_skin_type_1_2+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_3.png" width="48" height="48" alt=""> | 👦🏼 | [`boy_skin_type_3.png`](16px/boy_skin_type_3.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_3+person_with_blond_hair.png" width="48" height="48" alt=""> | 👦🏼‍👱 | [`boy_skin_type_3+person_with_blond_hair.png`](16px/boy_skin_type_3+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_3+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👦🏼‍🦰 | [`boy_skin_type_3+emoji_component_red_hair.png`](16px/boy_skin_type_3+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_3+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👦🏼‍🦱 | [`boy_skin_type_3+emoji_component_curly_hair.png`](16px/boy_skin_type_3+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_3+billed_cap.png" width="48" height="48" alt=""> | 👦🏼‍🧢 | [`boy_skin_type_3+billed_cap.png`](16px/boy_skin_type_3+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_4.png" width="48" height="48" alt=""> | 👦🏽 | [`boy_skin_type_4.png`](16px/boy_skin_type_4.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_4+person_with_blond_hair.png" width="48" height="48" alt=""> | 👦🏽‍👱 | [`boy_skin_type_4+person_with_blond_hair.png`](16px/boy_skin_type_4+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_4+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👦🏽‍🦰 | [`boy_skin_type_4+emoji_component_red_hair.png`](16px/boy_skin_type_4+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_4+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👦🏽‍🦱 | [`boy_skin_type_4+emoji_component_curly_hair.png`](16px/boy_skin_type_4+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_4+billed_cap.png" width="48" height="48" alt=""> | 👦🏽‍🧢 | [`boy_skin_type_4+billed_cap.png`](16px/boy_skin_type_4+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_5.png" width="48" height="48" alt=""> | 👦🏾 | [`boy_skin_type_5.png`](16px/boy_skin_type_5.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_5+person_with_blond_hair.png" width="48" height="48" alt=""> | 👦🏾‍👱 | [`boy_skin_type_5+person_with_blond_hair.png`](16px/boy_skin_type_5+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_5+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👦🏾‍🦰 | [`boy_skin_type_5+emoji_component_red_hair.png`](16px/boy_skin_type_5+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_5+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👦🏾‍🦱 | [`boy_skin_type_5+emoji_component_curly_hair.png`](16px/boy_skin_type_5+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_5+billed_cap.png" width="48" height="48" alt=""> | 👦🏾‍🧢 | [`boy_skin_type_5+billed_cap.png`](16px/boy_skin_type_5+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_6.png" width="48" height="48" alt=""> | 👦🏿 | [`boy_skin_type_6.png`](16px/boy_skin_type_6.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_6+person_with_blond_hair.png" width="48" height="48" alt=""> | 👦🏿‍👱 | [`boy_skin_type_6+person_with_blond_hair.png`](16px/boy_skin_type_6+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_6+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👦🏿‍🦰 | [`boy_skin_type_6+emoji_component_red_hair.png`](16px/boy_skin_type_6+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_6+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👦🏿‍🦱 | [`boy_skin_type_6+emoji_component_curly_hair.png`](16px/boy_skin_type_6+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/boy_skin_type_6+billed_cap.png" width="48" height="48" alt=""> | 👦🏿‍🧢 | [`boy_skin_type_6+billed_cap.png`](16px/boy_skin_type_6+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl.png" width="48" height="48" alt=""> | 👧 | [`girl.png`](16px/girl.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl+person_with_blond_hair.png" width="48" height="48" alt=""> | 👧‍👱 | [`girl+person_with_blond_hair.png`](16px/girl+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👧‍🦰 | [`girl+emoji_component_red_hair.png`](16px/girl+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👧‍🦱 | [`girl+emoji_component_curly_hair.png`](16px/girl+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl+billed_cap.png" width="48" height="48" alt=""> | 👧‍🧢 | [`girl+billed_cap.png`](16px/girl+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_1_2.png" width="48" height="48" alt=""> | 👧🏻 | [`girl_skin_type_1_2.png`](16px/girl_skin_type_1_2.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_1_2+person_with_blond_hair.png" width="48" height="48" alt=""> | 👧🏻‍👱 | [`girl_skin_type_1_2+person_with_blond_hair.png`](16px/girl_skin_type_1_2+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_1_2+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👧🏻‍🦰 | [`girl_skin_type_1_2+emoji_component_red_hair.png`](16px/girl_skin_type_1_2+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_1_2+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👧🏻‍🦱 | [`girl_skin_type_1_2+emoji_component_curly_hair.png`](16px/girl_skin_type_1_2+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_1_2+billed_cap.png" width="48" height="48" alt=""> | 👧🏻‍🧢 | [`girl_skin_type_1_2+billed_cap.png`](16px/girl_skin_type_1_2+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_3.png" width="48" height="48" alt=""> | 👧🏼 | [`girl_skin_type_3.png`](16px/girl_skin_type_3.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_3+person_with_blond_hair.png" width="48" height="48" alt=""> | 👧🏼‍👱 | [`girl_skin_type_3+person_with_blond_hair.png`](16px/girl_skin_type_3+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_3+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👧🏼‍🦰 | [`girl_skin_type_3+emoji_component_red_hair.png`](16px/girl_skin_type_3+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_3+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👧🏼‍🦱 | [`girl_skin_type_3+emoji_component_curly_hair.png`](16px/girl_skin_type_3+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_3+billed_cap.png" width="48" height="48" alt=""> | 👧🏼‍🧢 | [`girl_skin_type_3+billed_cap.png`](16px/girl_skin_type_3+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_4.png" width="48" height="48" alt=""> | 👧🏽 | [`girl_skin_type_4.png`](16px/girl_skin_type_4.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_4+person_with_blond_hair.png" width="48" height="48" alt=""> | 👧🏽‍👱 | [`girl_skin_type_4+person_with_blond_hair.png`](16px/girl_skin_type_4+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_4+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👧🏽‍🦰 | [`girl_skin_type_4+emoji_component_red_hair.png`](16px/girl_skin_type_4+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_4+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👧🏽‍🦱 | [`girl_skin_type_4+emoji_component_curly_hair.png`](16px/girl_skin_type_4+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_4+billed_cap.png" width="48" height="48" alt=""> | 👧🏽‍🧢 | [`girl_skin_type_4+billed_cap.png`](16px/girl_skin_type_4+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_5.png" width="48" height="48" alt=""> | 👧🏾 | [`girl_skin_type_5.png`](16px/girl_skin_type_5.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_5+person_with_blond_hair.png" width="48" height="48" alt=""> | 👧🏾‍👱 | [`girl_skin_type_5+person_with_blond_hair.png`](16px/girl_skin_type_5+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_5+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👧🏾‍🦰 | [`girl_skin_type_5+emoji_component_red_hair.png`](16px/girl_skin_type_5+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_5+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👧🏾‍🦱 | [`girl_skin_type_5+emoji_component_curly_hair.png`](16px/girl_skin_type_5+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_5+billed_cap.png" width="48" height="48" alt=""> | 👧🏾‍🧢 | [`girl_skin_type_5+billed_cap.png`](16px/girl_skin_type_5+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_6.png" width="48" height="48" alt=""> | 👧🏿 | [`girl_skin_type_6.png`](16px/girl_skin_type_6.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_6+person_with_blond_hair.png" width="48" height="48" alt=""> | 👧🏿‍👱 | [`girl_skin_type_6+person_with_blond_hair.png`](16px/girl_skin_type_6+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_6+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👧🏿‍🦰 | [`girl_skin_type_6+emoji_component_red_hair.png`](16px/girl_skin_type_6+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_6+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👧🏿‍🦱 | [`girl_skin_type_6+emoji_component_curly_hair.png`](16px/girl_skin_type_6+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/girl_skin_type_6+billed_cap.png" width="48" height="48" alt=""> | 👧🏿‍🧢 | [`girl_skin_type_6+billed_cap.png`](16px/girl_skin_type_6+billed_cap.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man.png" width="48" height="48" alt=""> | 👨 | [`man.png`](16px/man.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man+woman+girl+boy.png" width="48" height="48" alt=""> | 👨‍👩‍👧‍👦 | [`man+woman+girl+boy.png`](16px/man+woman+girl+boy.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man+person_with_blond_hair.png" width="48" height="48" alt=""> | 👨‍👱 | [`man+person_with_blond_hair.png`](16px/man+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👨‍🦰 | [`man+emoji_component_red_hair.png`](16px/man+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👨‍🦱 | [`man+emoji_component_curly_hair.png`](16px/man+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👨‍🦳 | [`man+emoji_component_white_hair.png`](16px/man+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_1_2.png" width="48" height="48" alt=""> | 👨🏻 | [`man_skin_type_1_2.png`](16px/man_skin_type_1_2.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_1_2+person_with_blond_hair.png" width="48" height="48" alt=""> | 👨🏻‍👱 | [`man_skin_type_1_2+person_with_blond_hair.png`](16px/man_skin_type_1_2+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_1_2+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👨🏻‍🦰 | [`man_skin_type_1_2+emoji_component_red_hair.png`](16px/man_skin_type_1_2+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_1_2+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👨🏻‍🦱 | [`man_skin_type_1_2+emoji_component_curly_hair.png`](16px/man_skin_type_1_2+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_1_2+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👨🏻‍🦳 | [`man_skin_type_1_2+emoji_component_white_hair.png`](16px/man_skin_type_1_2+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_3.png" width="48" height="48" alt=""> | 👨🏼 | [`man_skin_type_3.png`](16px/man_skin_type_3.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_3+person_with_blond_hair.png" width="48" height="48" alt=""> | 👨🏼‍👱 | [`man_skin_type_3+person_with_blond_hair.png`](16px/man_skin_type_3+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_3+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👨🏼‍🦰 | [`man_skin_type_3+emoji_component_red_hair.png`](16px/man_skin_type_3+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_3+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👨🏼‍🦱 | [`man_skin_type_3+emoji_component_curly_hair.png`](16px/man_skin_type_3+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_3+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👨🏼‍🦳 | [`man_skin_type_3+emoji_component_white_hair.png`](16px/man_skin_type_3+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_4.png" width="48" height="48" alt=""> | 👨🏽 | [`man_skin_type_4.png`](16px/man_skin_type_4.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_4+person_with_blond_hair.png" width="48" height="48" alt=""> | 👨🏽‍👱 | [`man_skin_type_4+person_with_blond_hair.png`](16px/man_skin_type_4+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_4+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👨🏽‍🦰 | [`man_skin_type_4+emoji_component_red_hair.png`](16px/man_skin_type_4+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_4+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👨🏽‍🦱 | [`man_skin_type_4+emoji_component_curly_hair.png`](16px/man_skin_type_4+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_4+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👨🏽‍🦳 | [`man_skin_type_4+emoji_component_white_hair.png`](16px/man_skin_type_4+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_5.png" width="48" height="48" alt=""> | 👨🏾 | [`man_skin_type_5.png`](16px/man_skin_type_5.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_5+person_with_blond_hair.png" width="48" height="48" alt=""> | 👨🏾‍👱 | [`man_skin_type_5+person_with_blond_hair.png`](16px/man_skin_type_5+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_5+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👨🏾‍🦰 | [`man_skin_type_5+emoji_component_red_hair.png`](16px/man_skin_type_5+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_5+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👨🏾‍🦱 | [`man_skin_type_5+emoji_component_curly_hair.png`](16px/man_skin_type_5+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_5+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👨🏾‍🦳 | [`man_skin_type_5+emoji_component_white_hair.png`](16px/man_skin_type_5+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_6.png" width="48" height="48" alt=""> | 👨🏿 | [`man_skin_type_6.png`](16px/man_skin_type_6.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_6+person_with_blond_hair.png" width="48" height="48" alt=""> | 👨🏿‍👱 | [`man_skin_type_6+person_with_blond_hair.png`](16px/man_skin_type_6+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_6+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👨🏿‍🦰 | [`man_skin_type_6+emoji_component_red_hair.png`](16px/man_skin_type_6+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_6+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👨🏿‍🦱 | [`man_skin_type_6+emoji_component_curly_hair.png`](16px/man_skin_type_6+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/man_skin_type_6+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👨🏿‍🦳 | [`man_skin_type_6+emoji_component_white_hair.png`](16px/man_skin_type_6+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman.png" width="48" height="48" alt=""> | 👩 | [`woman.png`](16px/woman.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman+person_with_blond_hair.png" width="48" height="48" alt=""> | 👩‍👱 | [`woman+person_with_blond_hair.png`](16px/woman+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👩‍🦰 | [`woman+emoji_component_red_hair.png`](16px/woman+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👩‍🦱 | [`woman+emoji_component_curly_hair.png`](16px/woman+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👩‍🦳 | [`woman+emoji_component_white_hair.png`](16px/woman+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_1_2.png" width="48" height="48" alt=""> | 👩🏻 | [`woman_skin_type_1_2.png`](16px/woman_skin_type_1_2.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_1_2+person_with_blond_hair.png" width="48" height="48" alt=""> | 👩🏻‍👱 | [`woman_skin_type_1_2+person_with_blond_hair.png`](16px/woman_skin_type_1_2+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_1_2+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👩🏻‍🦰 | [`woman_skin_type_1_2+emoji_component_red_hair.png`](16px/woman_skin_type_1_2+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_1_2+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👩🏻‍🦱 | [`woman_skin_type_1_2+emoji_component_curly_hair.png`](16px/woman_skin_type_1_2+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_1_2+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👩🏻‍🦳 | [`woman_skin_type_1_2+emoji_component_white_hair.png`](16px/woman_skin_type_1_2+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_3.png" width="48" height="48" alt=""> | 👩🏼 | [`woman_skin_type_3.png`](16px/woman_skin_type_3.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_3+person_with_blond_hair.png" width="48" height="48" alt=""> | 👩🏼‍👱 | [`woman_skin_type_3+person_with_blond_hair.png`](16px/woman_skin_type_3+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_3+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👩🏼‍🦰 | [`woman_skin_type_3+emoji_component_red_hair.png`](16px/woman_skin_type_3+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_3+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👩🏼‍🦱 | [`woman_skin_type_3+emoji_component_curly_hair.png`](16px/woman_skin_type_3+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_3+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👩🏼‍🦳 | [`woman_skin_type_3+emoji_component_white_hair.png`](16px/woman_skin_type_3+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_4.png" width="48" height="48" alt=""> | 👩🏽 | [`woman_skin_type_4.png`](16px/woman_skin_type_4.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_4+person_with_blond_hair.png" width="48" height="48" alt=""> | 👩🏽‍👱 | [`woman_skin_type_4+person_with_blond_hair.png`](16px/woman_skin_type_4+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_4+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👩🏽‍🦰 | [`woman_skin_type_4+emoji_component_red_hair.png`](16px/woman_skin_type_4+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_4+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👩🏽‍🦱 | [`woman_skin_type_4+emoji_component_curly_hair.png`](16px/woman_skin_type_4+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_4+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👩🏽‍🦳 | [`woman_skin_type_4+emoji_component_white_hair.png`](16px/woman_skin_type_4+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_5.png" width="48" height="48" alt=""> | 👩🏾 | [`woman_skin_type_5.png`](16px/woman_skin_type_5.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_5+person_with_blond_hair.png" width="48" height="48" alt=""> | 👩🏾‍👱 | [`woman_skin_type_5+person_with_blond_hair.png`](16px/woman_skin_type_5+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_5+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👩🏾‍🦰 | [`woman_skin_type_5+emoji_component_red_hair.png`](16px/woman_skin_type_5+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_5+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👩🏾‍🦱 | [`woman_skin_type_5+emoji_component_curly_hair.png`](16px/woman_skin_type_5+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_5+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👩🏾‍🦳 | [`woman_skin_type_5+emoji_component_white_hair.png`](16px/woman_skin_type_5+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_6.png" width="48" height="48" alt=""> | 👩🏿 | [`woman_skin_type_6.png`](16px/woman_skin_type_6.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_6+person_with_blond_hair.png" width="48" height="48" alt=""> | 👩🏿‍👱 | [`woman_skin_type_6+person_with_blond_hair.png`](16px/woman_skin_type_6+person_with_blond_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_6+emoji_component_red_hair.png" width="48" height="48" alt=""> | 👩🏿‍🦰 | [`woman_skin_type_6+emoji_component_red_hair.png`](16px/woman_skin_type_6+emoji_component_red_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_6+emoji_component_curly_hair.png" width="48" height="48" alt=""> | 👩🏿‍🦱 | [`woman_skin_type_6+emoji_component_curly_hair.png`](16px/woman_skin_type_6+emoji_component_curly_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/woman_skin_type_6+emoji_component_white_hair.png" width="48" height="48" alt=""> | 👩🏿‍🦳 | [`woman_skin_type_6+emoji_component_white_hair.png`](16px/woman_skin_type_6+emoji_component_white_hair.png) | `scripts/icones/art_gens.py` |
| <img src="x8/gem_stone.png" width="48" height="48" alt=""> | 💎 | [`gem_stone.png`](16px/gem_stone.png) | `assets/trouvailles.png (case 2, 0)` |
| <img src="x8/gem_stone+large_purple_circle.png" width="48" height="48" alt=""> | 💎‍🟣 | [`gem_stone+large_purple_circle.png`](16px/gem_stone+large_purple_circle.png) | `assets/trouvailles.png (case 3, 0)` |
| <img src="x8/droplet.png" width="48" height="48" alt=""> | 💧 | [`droplet.png`](16px/droplet.png) | `scripts/icones/art_essai.py` |
| <img src="x8/speech_balloon.png" width="48" height="48" alt=""> | 💬 | [`speech_balloon.png`](16px/speech_balloon.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/money_bag.png" width="48" height="48" alt=""> | 💰 | [`money_bag.png`](16px/money_bag.png) | `scripts/icones/art_essai.py` |
| <img src="x8/personal_computer.png" width="48" height="48" alt=""> | 💻 | [`personal_computer.png`](16px/personal_computer.png) | `scripts/icones/art_boutiques.py` |
| <img src="x8/calendar.png" width="48" height="48" alt=""> | 📅 | [`calendar.png`](16px/calendar.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/clipboard.png" width="48" height="48" alt=""> | 📋 | [`clipboard.png`](16px/clipboard.png) | `scripts/icones/art_outils.py` |
| <img src="x8/open_book.png" width="48" height="48" alt=""> | 📖 | [`open_book.png`](16px/open_book.png) | `scripts/icones/art_outils.py` |
| <img src="x8/books.png" width="48" height="48" alt=""> | 📚 | [`books.png`](16px/books.png) | `scripts/icones/art_ville.py` |
| <img src="x8/scroll.png" width="48" height="48" alt=""> | 📜 | [`scroll.png`](16px/scroll.png) | `scripts/icones/art_outils.py` |
| <img src="x8/pager.png" width="48" height="48" alt=""> | 📟 | [`pager.png`](16px/pager.png) | `scripts/icones/art_outils.py` |
| <img src="x8/package.png" width="48" height="48" alt=""> | 📦 | [`package.png`](16px/package.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/open_mailbox_with_raised_flag.png" width="48" height="48" alt=""> | 📬 | [`open_mailbox_with_raised_flag.png`](16px/open_mailbox_with_raised_flag.png) | `scripts/icones/art_outils.py` |
| <img src="x8/open_mailbox_with_lowered_flag.png" width="48" height="48" alt=""> | 📭 | [`open_mailbox_with_lowered_flag.png`](16px/open_mailbox_with_lowered_flag.png) | `scripts/icones/art_outils.py` |
| <img src="x8/clockwise_rightwards_and_leftwards_open_circle_arrows.png" width="48" height="48" alt=""> | 🔁 | [`clockwise_rightwards_and_leftwards_open_circle_arrows.png`](16px/clockwise_rightwards_and_leftwards_open_circle_arrows.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/battery.png" width="48" height="48" alt=""> | 🔋 | [`battery.png`](16px/battery.png) | `scripts/icones/art_outils.py` |
| <img src="x8/right_pointing_magnifying_glass.png" width="48" height="48" alt=""> | 🔎 | [`right_pointing_magnifying_glass.png`](16px/right_pointing_magnifying_glass.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/lock.png" width="48" height="48" alt=""> | 🔒 | [`lock.png`](16px/lock.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/fire.png" width="48" height="48" alt=""> | 🔥 | [`fire.png`](16px/fire.png) | `scripts/icones/art_nature.py` |
| <img src="x8/electric_torch.png" width="48" height="48" alt=""> | 🔦 | [`electric_torch.png`](16px/electric_torch.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/wrench.png" width="48" height="48" alt=""> | 🔧 | [`wrench.png`](16px/wrench.png) | `scripts/icones/art_outils.py` |
| <img src="x8/hammer.png" width="48" height="48" alt=""> | 🔨 | [`hammer.png`](16px/hammer.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/microscope.png" width="48" height="48" alt=""> | 🔬 | [`microscope.png`](16px/microscope.png) | `scripts/icones/art_outils.py` |
| <img src="x8/down_pointing_red_triangle.png" width="48" height="48" alt=""> | 🔻 | [`down_pointing_red_triangle.png`](16px/down_pointing_red_triangle.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/clock_face_one_oclock.png" width="48" height="48" alt=""> | 🕐 | [`clock_face_one_oclock.png`](16px/clock_face_one_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_two_oclock.png" width="48" height="48" alt=""> | 🕑 | [`clock_face_two_oclock.png`](16px/clock_face_two_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_three_oclock.png" width="48" height="48" alt=""> | 🕒 | [`clock_face_three_oclock.png`](16px/clock_face_three_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_four_oclock.png" width="48" height="48" alt=""> | 🕓 | [`clock_face_four_oclock.png`](16px/clock_face_four_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_five_oclock.png" width="48" height="48" alt=""> | 🕔 | [`clock_face_five_oclock.png`](16px/clock_face_five_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_six_oclock.png" width="48" height="48" alt=""> | 🕕 | [`clock_face_six_oclock.png`](16px/clock_face_six_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_seven_oclock.png" width="48" height="48" alt=""> | 🕖 | [`clock_face_seven_oclock.png`](16px/clock_face_seven_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_eight_oclock.png" width="48" height="48" alt=""> | 🕗 | [`clock_face_eight_oclock.png`](16px/clock_face_eight_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_nine_oclock.png" width="48" height="48" alt=""> | 🕘 | [`clock_face_nine_oclock.png`](16px/clock_face_nine_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_ten_oclock.png" width="48" height="48" alt=""> | 🕙 | [`clock_face_ten_oclock.png`](16px/clock_face_ten_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_eleven_oclock.png" width="48" height="48" alt=""> | 🕚 | [`clock_face_eleven_oclock.png`](16px/clock_face_eleven_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/clock_face_twelve_oclock.png" width="48" height="48" alt=""> | 🕛 | [`clock_face_twelve_oclock.png`](16px/clock_face_twelve_oclock.png) | `scripts/icones/art_gens.py` |
| <img src="x8/candle.png" width="48" height="48" alt=""> | 🕯 | [`candle.png`](16px/candle.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/hole.png" width="48" height="48" alt=""> | 🕳 | [`hole.png`](16px/hole.png) | `scripts/icones/art_monde.py` |
| <img src="x8/joystick.png" width="48" height="48" alt=""> | 🕹 | [`joystick.png`](16px/joystick.png) | `scripts/icones/art_ville.py` |
| <img src="x8/card_file_box.png" width="48" height="48" alt=""> | 🗃 | [`card_file_box.png`](16px/card_file_box.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/wastebasket.png" width="48" height="48" alt=""> | 🗑 | [`wastebasket.png`](16px/wastebasket.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/world_map.png" width="48" height="48" alt=""> | 🗺 | [`world_map.png`](16px/world_map.png) | `scripts/icones/art_symboles.py` |
| <img src="x8/smiling_face_with_smiling_eyes.png" width="48" height="48" alt=""> | 😊 | [`smiling_face_with_smiling_eyes.png`](16px/smiling_face_with_smiling_eyes.png) | `scripts/icones/art_ville.py` |
| <img src="x8/sleeping_face.png" width="48" height="48" alt=""> | 😴 | [`sleeping_face.png`](16px/sleeping_face.png) | `scripts/icones/art_gens.py` |
| <img src="x8/slightly_smiling_face.png" width="48" height="48" alt=""> | 🙂 | [`slightly_smiling_face.png`](16px/slightly_smiling_face.png) | `scripts/icones/art_gens.py` |
| <img src="x8/train.png" width="48" height="48" alt=""> | 🚆 | [`train.png`](16px/train.png) | `scripts/icones/art_ville.py` |
| <img src="x8/bus.png" width="48" height="48" alt=""> | 🚌 | [`bus.png`](16px/bus.png) | `scripts/icones/art_ville.py` |
| <img src="x8/construction_sign.png" width="48" height="48" alt=""> | 🚧 | [`construction_sign.png`](16px/construction_sign.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/door.png" width="48" height="48" alt=""> | 🚪 | [`door.png`](16px/door.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/door+black_large_square.png" width="48" height="48" alt=""> | 🚪‍⬛ | [`door+black_large_square.png`](16px/door+black_large_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/door+white_large_square.png" width="48" height="48" alt=""> | 🚪‍⬜ | [`door+white_large_square.png`](16px/door+white_large_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/door+large_brown_circle.png" width="48" height="48" alt=""> | 🚪‍🟤 | [`door+large_brown_circle.png`](16px/door+large_brown_circle.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/door+large_red_square.png" width="48" height="48" alt=""> | 🚪‍🟥 | [`door+large_red_square.png`](16px/door+large_red_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/door+large_blue_square.png" width="48" height="48" alt=""> | 🚪‍🟦 | [`door+large_blue_square.png`](16px/door+large_blue_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/door+large_green_square.png" width="48" height="48" alt=""> | 🚪‍🟩 | [`door+large_green_square.png`](16px/door+large_green_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/door+window.png" width="48" height="48" alt=""> | 🚪‍🪟 | [`door+window.png`](16px/door+window.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/shower.png" width="48" height="48" alt=""> | 🚿 | [`shower.png`](16px/shower.png) | `scripts/icones/art_outils.py` |
| <img src="x8/bed.png" width="48" height="48" alt=""> | 🛏 | [`bed.png`](16px/bed.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/shopping_trolley.png" width="48" height="48" alt=""> | 🛒 | [`shopping_trolley.png`](16px/shopping_trolley.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/hut.png" width="48" height="48" alt=""> | 🛖 | [`hut.png`](16px/hut.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/playground_slide.png" width="48" height="48" alt=""> | 🛝 | [`playground_slide.png`](16px/playground_slide.png) | `scripts/icones/art_ville.py` |
| <img src="x8/hammer_and_wrench.png" width="48" height="48" alt=""> | 🛠 | [`hammer_and_wrench.png`](16px/hammer_and_wrench.png) | `scripts/icones/art_outils.py` |
| <img src="x8/oil_drum.png" width="48" height="48" alt=""> | 🛢 | [`oil_drum.png`](16px/oil_drum.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/railway_track.png" width="48" height="48" alt=""> | 🛤 | [`railway_track.png`](16px/railway_track.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/canoe.png" width="48" height="48" alt=""> | 🛶 | [`canoe.png`](16px/canoe.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/large_brown_square+medium_black_circle.png" width="48" height="48" alt=""> | 🟫‍⚫ | [`large_brown_square+medium_black_circle.png`](16px/large_brown_square+medium_black_circle.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/large_brown_square+white_large_square.png" width="48" height="48" alt=""> | 🟫‍⬜ | [`large_brown_square+white_large_square.png`](16px/large_brown_square+white_large_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/large_brown_square+chequered_flag.png" width="48" height="48" alt=""> | 🟫‍🏁 | [`large_brown_square+chequered_flag.png`](16px/large_brown_square+chequered_flag.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/large_brown_square+black_square_button.png" width="48" height="48" alt=""> | 🟫‍🔲 | [`large_brown_square+black_square_button.png`](16px/large_brown_square+black_square_button.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/large_brown_square+large_blue_square.png" width="48" height="48" alt=""> | 🟫‍🟦 | [`large_brown_square+large_blue_square.png`](16px/large_brown_square+large_blue_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/large_brown_square+large_orange_square.png" width="48" height="48" alt=""> | 🟫‍🟧 | [`large_brown_square+large_orange_square.png`](16px/large_brown_square+large_orange_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/large_brown_square+carpentry_saw.png" width="48" height="48" alt=""> | 🟫‍🪚 | [`large_brown_square+carpentry_saw.png`](16px/large_brown_square+carpentry_saw.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/large_brown_square+rock.png" width="48" height="48" alt=""> | 🟫‍🪨 | [`large_brown_square+rock.png`](16px/large_brown_square+rock.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/large_brown_square+wood.png" width="48" height="48" alt=""> | 🟫‍🪵 | [`large_brown_square+wood.png`](16px/large_brown_square+wood.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/face_with_thermometer.png" width="48" height="48" alt=""> | 🤒 | [`face_with_thermometer.png`](16px/face_with_thermometer.png) | `scripts/icones/art_gens.py` |
| <img src="x8/robot_face.png" width="48" height="48" alt=""> | 🤖 | [`robot_face.png`](16px/robot_face.png) | `scripts/icones/art_outils.py` |
| <img src="x8/croissant.png" width="48" height="48" alt=""> | 🥐 | [`croissant.png`](16px/croissant.png) | `scripts/icones/art_boutiques.py` |
| <img src="x8/cucumber.png" width="48" height="48" alt=""> | 🥒 | [`cucumber.png`](16px/cucumber.png) | `assets/crops.png (case 4, 11)` |
| <img src="x8/potato.png" width="48" height="48" alt=""> | 🥔 | [`potato.png`](16px/potato.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/carrot.png" width="48" height="48" alt=""> | 🥕 | [`carrot.png`](16px/carrot.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/baguette_bread.png" width="48" height="48" alt=""> | 🥖 | [`baguette_bread.png`](16px/baguette_bread.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/green_salad.png" width="48" height="48" alt=""> | 🥗 | [`green_salad.png`](16px/green_salad.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/shallow_pan_of_food.png" width="48" height="48" alt=""> | 🥘 | [`shallow_pan_of_food.png`](16px/shallow_pan_of_food.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/egg.png" width="48" height="48" alt=""> | 🥚 | [`egg.png`](16px/egg.png) | `scripts/icones/art_essai.py` |
| <img src="x8/glass_of_milk.png" width="48" height="48" alt=""> | 🥛 | [`glass_of_milk.png`](16px/glass_of_milk.png) | `scripts/icones/art_essai.py` |
| <img src="x8/glass_of_milk+snow_capped_mountain.png" width="48" height="48" alt=""> | 🥛‍🏔 | [`glass_of_milk+snow_capped_mountain.png`](16px/glass_of_milk+snow_capped_mountain.png) | `scripts/icones/art_alpage.py` |
| <img src="x8/bowl_with_spoon.png" width="48" height="48" alt=""> | 🥣 | [`bowl_with_spoon.png`](16px/bowl_with_spoon.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/pie.png" width="48" height="48" alt=""> | 🥧 | [`pie.png`](16px/pie.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/pie+leafy_green.png" width="48" height="48" alt=""> | 🥧‍🥬 | [`pie+leafy_green.png`](16px/pie+leafy_green.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/pie+blueberries.png" width="48" height="48" alt=""> | 🥧‍🫐 | [`pie+blueberries.png`](16px/pie+blueberries.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cut_of_meat.png" width="48" height="48" alt=""> | 🥩 | [`cut_of_meat.png`](16px/cut_of_meat.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/canned_food.png" width="48" height="48" alt=""> | 🥫 | [`canned_food.png`](16px/canned_food.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/leafy_green.png" width="48" height="48" alt=""> | 🥬 | [`leafy_green.png`](16px/leafy_green.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/lab_coat+seedling.png" width="48" height="48" alt=""> | 🥼‍🌱 | [`lab_coat+seedling.png`](16px/lab_coat+seedling.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/oyster.png" width="48" height="48" alt=""> | 🦪 | [`oyster.png`](16px/oyster.png) | `assets/trouvailles.png (case 7, 0)` |
| <img src="x8/cheese_wedge.png" width="48" height="48" alt=""> | 🧀 | [`cheese_wedge.png`](16px/cheese_wedge.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/cheese_wedge+glass_of_milk.png" width="48" height="48" alt=""> | 🧀‍🥛 | [`cheese_wedge+glass_of_milk.png`](16px/cheese_wedge+glass_of_milk.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/garlic.png" width="48" height="48" alt=""> | 🧄 | [`garlic.png`](16px/garlic.png) | `scripts/icones/art_nature.py` |
| <img src="x8/onion.png" width="48" height="48" alt=""> | 🧅 | [`onion.png`](16px/onion.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/butter+medium_white_circle.png" width="48" height="48" alt=""> | 🧈‍⚪ | [`butter+medium_white_circle.png`](16px/butter+medium_white_circle.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/butter+nut_and_bolt.png" width="48" height="48" alt=""> | 🧈‍🔩 | [`butter+nut_and_bolt.png`](16px/butter+nut_and_bolt.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/butter+large_orange_circle.png" width="48" height="48" alt=""> | 🧈‍🟠 | [`butter+large_orange_circle.png`](16px/butter+large_orange_circle.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/butter+large_yellow_circle.png" width="48" height="48" alt=""> | 🧈‍🟡 | [`butter+large_yellow_circle.png`](16px/butter+large_yellow_circle.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/ice_cube.png" width="48" height="48" alt=""> | 🧊 | [`ice_cube.png`](16px/ice_cube.png) | `scripts/icones/art_nature.py` |
| <img src="x8/gloves+large_brown_square.png" width="48" height="48" alt=""> | 🧤‍🟫 | [`gloves+large_brown_square.png`](16px/gloves+large_brown_square.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/coat+snowflake.png" width="48" height="48" alt=""> | 🧥‍❄ | [`coat+snowflake.png`](16px/coat+snowflake.png) | `scripts/icones/art_equipement.py` |
| <img src="x8/test_tube.png" width="48" height="48" alt=""> | 🧪 | [`test_tube.png`](16px/test_tube.png) | `scripts/icones/art_outils.py` |
| <img src="x8/compass.png" width="48" height="48" alt=""> | 🧭 | [`compass.png`](16px/compass.png) | `scripts/icones/art_monde.py` |
| <img src="x8/toolbox.png" width="48" height="48" alt=""> | 🧰 | [`toolbox.png`](16px/toolbox.png) | `scripts/icones/art_outils.py` |
| <img src="x8/brick.png" width="48" height="48" alt=""> | 🧱 | [`brick.png`](16px/brick.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/brick+white_large_square.png" width="48" height="48" alt=""> | 🧱‍⬜ | [`brick+white_large_square.png`](16px/brick+white_large_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+triangular_ruler.png" width="48" height="48" alt=""> | 🧱‍📐 | [`brick+triangular_ruler.png`](16px/brick+triangular_ruler.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+large_red_square.png" width="48" height="48" alt=""> | 🧱‍🟥 | [`brick+large_red_square.png`](16px/brick+large_red_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+large_blue_square.png" width="48" height="48" alt=""> | 🧱‍🟦 | [`brick+large_blue_square.png`](16px/brick+large_blue_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+large_orange_square.png" width="48" height="48" alt=""> | 🧱‍🟧 | [`brick+large_orange_square.png`](16px/brick+large_orange_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+large_yellow_square.png" width="48" height="48" alt=""> | 🧱‍🟨 | [`brick+large_yellow_square.png`](16px/brick+large_yellow_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+large_brown_square.png" width="48" height="48" alt=""> | 🧱‍🟫 | [`brick+large_brown_square.png`](16px/brick+large_brown_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+window.png" width="48" height="48" alt=""> | 🧱‍🪟 | [`brick+window.png`](16px/brick+window.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+rock.png" width="48" height="48" alt=""> | 🧱‍🪨 | [`brick+rock.png`](16px/brick+rock.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/brick+wood.png" width="48" height="48" alt=""> | 🧱‍🪵 | [`brick+wood.png`](16px/brick+wood.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/ball_of_yarn.png" width="48" height="48" alt=""> | 🧶 | [`ball_of_yarn.png`](16px/ball_of_yarn.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/basket.png" width="48" height="48" alt=""> | 🧺 | [`basket.png`](16px/basket.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/axe.png" width="48" height="48" alt=""> | 🪓 | [`axe.png`](16px/axe.png) | `scripts/icones/art_outils.py` |
| <img src="x8/carpentry_saw.png" width="48" height="48" alt=""> | 🪚 | [`carpentry_saw.png`](16px/carpentry_saw.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/ladder.png" width="48" height="48" alt=""> | 🪜 | [`ladder.png`](16px/ladder.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/window.png" width="48" height="48" alt=""> | 🪟 | [`window.png`](16px/window.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/window+heavy_large_circle.png" width="48" height="48" alt=""> | 🪟‍⭕ | [`window+heavy_large_circle.png`](16px/window+heavy_large_circle.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/window+rainbow.png" width="48" height="48" alt=""> | 🪟‍🌈 | [`window+rainbow.png`](16px/window+rainbow.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/window+crescent_moon.png" width="48" height="48" alt=""> | 🪟‍🌙 | [`window+crescent_moon.png`](16px/window+crescent_moon.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/window+large_green_square.png" width="48" height="48" alt=""> | 🪟‍🟩 | [`window+large_green_square.png`](16px/window+large_green_square.png) | `scripts/icones/art_blocs.py` |
| <img src="x8/knot.png" width="48" height="48" alt=""> | 🪢 | [`knot.png`](16px/knot.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/bucket.png" width="48" height="48" alt=""> | 🪣 | [`bucket.png`](16px/bucket.png) | `scripts/icones/art_lieux.py` |
| <img src="x8/rock.png" width="48" height="48" alt=""> | 🪨 | [`rock.png`](16px/rock.png) | `scripts/icones/art_nature.py` |
| <img src="x8/rock+gear.png" width="48" height="48" alt=""> | 🪨‍⚙ | [`rock+gear.png`](16px/rock+gear.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/rock+medium_white_circle.png" width="48" height="48" alt=""> | 🪨‍⚪ | [`rock+medium_white_circle.png`](16px/rock+medium_white_circle.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/rock+spiral_shell.png" width="48" height="48" alt=""> | 🪨‍🐚 | [`rock+spiral_shell.png`](16px/rock+spiral_shell.png) | `assets/trouvailles.png (case 0, 0)` |
| <img src="x8/rock+nut_and_bolt.png" width="48" height="48" alt=""> | 🪨‍🔩 | [`rock+nut_and_bolt.png`](16px/rock+nut_and_bolt.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/rock+large_orange_circle.png" width="48" height="48" alt=""> | 🪨‍🟠 | [`rock+large_orange_circle.png`](16px/rock+large_orange_circle.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/rock+large_yellow_circle.png" width="48" height="48" alt=""> | 🪨‍🟡 | [`rock+large_yellow_circle.png`](16px/rock+large_yellow_circle.png) | `scripts/icones/art_metaux.py` |
| <img src="x8/rock+beetle.png" width="48" height="48" alt=""> | 🪨‍🪲 | [`rock+beetle.png`](16px/rock+beetle.png) | `assets/trouvailles.png (case 1, 0)` |
| <img src="x8/potted_plant.png" width="48" height="48" alt=""> | 🪴 | [`potted_plant.png`](16px/potted_plant.png) | `scripts/icones/art_nature.py` |
| <img src="x8/potted_plant+tulip.png" width="48" height="48" alt=""> | 🪴‍🌷 | [`potted_plant+tulip.png`](16px/potted_plant+tulip.png) | `scripts/icones/art_ruche.py` |
| <img src="x8/wood.png" width="48" height="48" alt=""> | 🪵 | [`wood.png`](16px/wood.png) | `scripts/icones/art_nature.py` |
| <img src="x8/wood+rainbow.png" width="48" height="48" alt=""> | 🪵‍🌈 | [`wood+rainbow.png`](16px/wood+rainbow.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/wood+link_symbol.png" width="48" height="48" alt=""> | 🪵‍🔗 | [`wood+link_symbol.png`](16px/wood+link_symbol.png) | `scripts/icones/art_cheval.py` |
| <img src="x8/coral.png" width="48" height="48" alt=""> | 🪸 | [`coral.png`](16px/coral.png) | `assets/trouvailles.png (case 6, 0)` |
| <img src="x8/empty_nest.png" width="48" height="48" alt=""> | 🪹 | [`empty_nest.png`](16px/empty_nest.png) | `scripts/icones/art_nature.py` |
| <img src="x8/nest_with_eggs.png" width="48" height="48" alt=""> | 🪺 | [`nest_with_eggs.png`](16px/nest_with_eggs.png) | `scripts/icones/art_atelier.py` |
| <img src="x8/blueberries.png" width="48" height="48" alt=""> | 🫐 | [`blueberries.png`](16px/blueberries.png) | `scripts/icones/art_ville.py` |
| <img src="x8/blueberries+medium_black_circle.png" width="48" height="48" alt=""> | 🫐‍⚫ | [`blueberries+medium_black_circle.png`](16px/blueberries+medium_black_circle.png) | `scripts/icones/art_nature.py` |
| <img src="x8/bell_pepper.png" width="48" height="48" alt=""> | 🫑 | [`bell_pepper.png`](16px/bell_pepper.png) | `scripts/icones/art_recoltes.py` |
| <img src="x8/fondue.png" width="48" height="48" alt=""> | 🫕 | [`fondue.png`](16px/fondue.png) | `scripts/icones/art_ville.py` |
| <img src="x8/beans.png" width="48" height="48" alt=""> | 🫘 | [`beans.png`](16px/beans.png) | `scripts/icones/art_nature.py` |
| <img src="x8/jar.png" width="48" height="48" alt=""> | 🫙 | [`jar.png`](16px/jar.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/jar+chestnut.png" width="48" height="48" alt=""> | 🫙‍🌰 | [`jar+chestnut.png`](16px/jar+chestnut.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/jar+strawberry.png" width="48" height="48" alt=""> | 🫙‍🍓 | [`jar+strawberry.png`](16px/jar+strawberry.png) | `scripts/icones/art_cuisine.py` |
| <img src="x8/jar+egg.png" width="48" height="48" alt=""> | 🫙‍🥚 | [`jar+egg.png`](16px/jar+egg.png) | `scripts/icones/art_cuisine.py` |

## Dessins de 32×32 (35)

| Dessin | Fichier |
|:---:|---|
| <img src="dessins/agrandis/axe-btn.png" width="64" height="64" alt=""> | [`axe-btn.png`](dessins/axe-btn.png) |
| <img src="dessins/agrandis/b-batterie.png" width="64" height="64" alt=""> | [`b-batterie.png`](dessins/b-batterie.png) |
| <img src="dessins/agrandis/b-champ.png" width="64" height="64" alt=""> | [`b-champ.png`](dessins/b-champ.png) |
| <img src="dessins/agrandis/b-cuisine.png" width="64" height="64" alt=""> | [`b-cuisine.png`](dessins/b-cuisine.png) |
| <img src="dessins/agrandis/b-four.png" width="64" height="64" alt=""> | [`b-four.png`](dessins/b-four.png) |
| <img src="dessins/agrandis/b-frigo.png" width="64" height="64" alt=""> | [`b-frigo.png`](dessins/b-frigo.png) |
| <img src="dessins/agrandis/b-moulin.png" width="64" height="64" alt=""> | [`b-moulin.png`](dessins/b-moulin.png) |
| <img src="dessins/agrandis/b-panneau.png" width="64" height="64" alt=""> | [`b-panneau.png`](dessins/b-panneau.png) |
| <img src="dessins/agrandis/b-paturage.png" width="64" height="64" alt=""> | [`b-paturage.png`](dessins/b-paturage.png) |
| <img src="dessins/agrandis/b-pompe.png" width="64" height="64" alt=""> | [`b-pompe.png`](dessins/b-pompe.png) |
| <img src="dessins/agrandis/b-potager.png" width="64" height="64" alt=""> | [`b-potager.png`](dessins/b-potager.png) |
| <img src="dessins/agrandis/b-poulailler.png" width="64" height="64" alt=""> | [`b-poulailler.png`](dessins/b-poulailler.png) |
| <img src="dessins/agrandis/b-presse.png" width="64" height="64" alt=""> | [`b-presse.png`](dessins/b-presse.png) |
| <img src="dessins/agrandis/b-reservoir.png" width="64" height="64" alt=""> | [`b-reservoir.png`](dessins/b-reservoir.png) |
| <img src="dessins/agrandis/b-serre.png" width="64" height="64" alt=""> | [`b-serre.png`](dessins/b-serre.png) |
| <img src="dessins/agrandis/b-silo.png" width="64" height="64" alt=""> | [`b-silo.png`](dessins/b-silo.png) |
| <img src="dessins/agrandis/b-verger.png" width="64" height="64" alt=""> | [`b-verger.png`](dessins/b-verger.png) |
| <img src="dessins/agrandis/carte-panneau_ville.png" width="64" height="64" alt=""> | [`carte-panneau_ville.png`](dessins/carte-panneau_ville.png) |
| <img src="dessins/agrandis/cow.png" width="64" height="64" alt=""> | [`cow.png`](dessins/cow.png) |
| <img src="dessins/agrandis/egg.png" width="64" height="64" alt=""> | [`egg.png`](dessins/egg.png) |
| <img src="dessins/agrandis/hen.png" width="64" height="64" alt=""> | [`hen.png`](dessins/hen.png) |
| <img src="dessins/agrandis/hoe-btn.png" width="64" height="64" alt=""> | [`hoe-btn.png`](dessins/hoe-btn.png) |
| <img src="dessins/agrandis/pick-btn.png" width="64" height="64" alt=""> | [`pick-btn.png`](dessins/pick-btn.png) |
| <img src="dessins/agrandis/plot-soil.png" width="64" height="64" alt=""> | [`plot-soil.png`](dessins/plot-soil.png) |
| <img src="dessins/agrandis/sheep-shorn.png" width="64" height="64" alt=""> | [`sheep-shorn.png`](dessins/sheep-shorn.png) |
| <img src="dessins/agrandis/sheep-wool.png" width="64" height="64" alt=""> | [`sheep-wool.png`](dessins/sheep-wool.png) |
| <img src="dessins/agrandis/sleep-off.png" width="64" height="64" alt=""> | [`sleep-off.png`](dessins/sleep-off.png) |
| <img src="dessins/agrandis/sleep-on.png" width="64" height="64" alt=""> | [`sleep-on.png`](dessins/sleep-on.png) |
| <img src="dessins/agrandis/tree-abricotier.png" width="64" height="64" alt=""> | [`tree-abricotier.png`](dessins/tree-abricotier.png) |
| <img src="dessins/agrandis/tree-adult.png" width="64" height="64" alt=""> | [`tree-adult.png`](dessins/tree-adult.png) |
| <img src="dessins/agrandis/tree-cerisier.png" width="64" height="64" alt=""> | [`tree-cerisier.png`](dessins/tree-cerisier.png) |
| <img src="dessins/agrandis/tree-pecher.png" width="64" height="64" alt=""> | [`tree-pecher.png`](dessins/tree-pecher.png) |
| <img src="dessins/agrandis/tree-poirier.png" width="64" height="64" alt=""> | [`tree-poirier.png`](dessins/tree-poirier.png) |
| <img src="dessins/agrandis/tree-pommier.png" width="64" height="64" alt=""> | [`tree-pommier.png`](dessins/tree-pommier.png) |
| <img src="dessins/agrandis/tree-young.png" width="64" height="64" alt=""> | [`tree-young.png`](dessins/tree-young.png) |
