"""Refait tous les sons du jeu (docs/son.md) : python3 scripts/son/fabrique.py

Synthèse (numpy, scipy), puis encodage par ffmpeg dans assets/son/ et table de js/son.js.
Les masters WAV et les fichiers de travail vont dans scripts/son/_sortie/ (jamais commité).
Tout est tiré de graines fixes : relancer redonne les mêmes sons."""
import os, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
for script in ('musique.py', 'sons1.py', 'sons2.py', 'betes.py', 'vers_jeu.py'):
    print('·', script, flush=True)
    subprocess.run([sys.executable, script], cwd=ICI, check=True)
