// mode-test.js — le mode test chargé à la demande (piste 3 du chantier « allègement », docs/chantier-allegement.md).
//
// Le panneau 🧪 (js/ui/testmode.js), ses mesures 📏 (js/ui/mesures.js) et ce qu'ils tirent du moteur
// (js/engine/testmode.js, le joueur automatique js/engine/bot.js) ne servent qu'en mode test : ils ne sont pas
// dans le regroupement lu au départ. chargerModeTest() les charge une fois (le mode test allumé, au rendu ou à
// un appui « test-… ») ; ils inscrivent leurs actions et leur rendu du panneau (brancherRenduTest) en se
// chargeant, puis la page se refait.

let charge = null;
let renduTest = null;

export function chargerModeTest() {
  if (!charge) {
    charge = Promise.all([import('./testmode.js'), import('./mesures.js')])
      .then(() => import('./render.js'))
      .then((R) => R.refresh())
      .catch(() => { charge = null; });   // (hors ligne : réessayé au prochain rendu)
  }
  return charge;
}

// Le rendu du panneau (renderTestPanel), donné par js/ui/testmode.js quand il est chargé.
export function brancherRenduTest(f) {
  renduTest = f;
}

// Appelé à chaque rendu (js/ui/render.js) : le panneau, s'il est là ; sinon, en mode test, son chargement.
export function rendreModeTest(actif) {
  if (renduTest) renduTest();
  else if (actif) chargerModeTest();
}
