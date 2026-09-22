# La Cloche des Cendres

Première démo jouable d’un jeu d’action et d’exploration en 2D, vue de dessus en trois quarts.
JavaScript natif, Canvas 2D et audio local. Aucun backend, compte, service distant ou dépendance npm à installer.

## Jouer en local

Avec Node.js 20 ou ultérieur :

```sh
npm run dev
```

Ouvrir http://127.0.0.1:4173 dans un navigateur d’ordinateur récent.
Le serveur fourni sert uniquement les fichiers statiques ; il ne stocke ni ne calcule la partie.
Un autre serveur statique convient également. Le double-clic `file://` n’est pas pris en charge car le jeu utilise des modules JavaScript.

## Commandes

| Action | Clavier / souris | Manette standard |
| --- | --- | --- |
| Déplacement | ZQSD, WASD ou flèches | Stick gauche |
| Orientation | Souris, ou déplacement sans souris | Stick droit ; assistance à proximité sinon |
| Attaque légère | Clic gauche court / J | RB |
| Attaque lourde | Clic gauche maintenu / K | RT |
| Parade | Clic droit | LB |
| Esquive | Espace | A ou B |
| Soin | R ou F | Y |
| Interaction | E / Entrée | X |
| Carte | M | Select |
| Pause | Échap | Start |

Les principaux menus se ferment avec A sur manette. Les réglages et achats utilisent le clavier ou la souris.
La page doit avoir le focus ; le jeu se met en pause lorsque la fenêtre perd le focus.

## Parcours

1. Quitter le refuge par l’est et apprendre le duel dans la cour.
2. Traverser le cloître au nord-est. Le jardin optionnel contient le talisman du souffle.
3. Revenir vers l’ouest par la galerie des serments et entrer au clocher.
4. Le passage sud du clocher permet d’ouvrir la grille vers le refuge.
5. Vaincre le Gardien du Clocher et sa seconde phase.

Les préparations d’attaque sont signalées en ambre. La roulade protège brièvement ; l’attaque lourde interrompt les ennemis ordinaires et une roulade peut l’interrompre après le coup porté. La parade (clic droit) au début du geste renverse un assaillant de front ; la frappe suivante est une riposte fatale. Les projectiles, la charge et la frappe au sol du boss ne se parent pas. Une action pressée pendant un geste est mise en mémoire et part dès que le geste se termine.
Se reposer restaure vie et fioles, réinitialise les ennemis ordinaires, et permet d’améliorer la vigueur ou le soin.
Une mort laisse les fragments sur place. Mourir à nouveau avant de les récupérer remplace cette perte.

## Progression

Sauvegarde locale versionnée dans `localStorage` : fragments, améliorations, talisman, raccourci, butin ramassé, mort du boss et fragments perdus.
Après rechargement, le pèlerin revient au refuge avec vie et fioles restaurées. La sauvegarde n’est pas synchronisée entre navigateurs ou origines.
La commande « Recommencer la démo » demande confirmation avant de remplacer cette progression.
Si le navigateur bloque le stockage, la partie reste jouable et l’interface l’indique.

## Version statique à distribuer

```sh
npm run build
```

Le dossier `dist/` contient les fichiers à déposer chez n’importe quel hébergeur statique, y compris sous un sous-répertoire.
Les assets sont inclus : aucune requête distante n’est nécessaire pendant le jeu. Aucun déploiement n’a été effectué.

## Validation

```sh
npm test
```

13 tests couvrent déplacements, collisions, portée/direction des coups, endurance, esquive, interruption du soin, mort/récupération, progression, sauvegarde malformée, boss et accessibilité des zones.

Un parcours navigateur automatisé est fourni dans `scripts/browser-smoke.cjs` (Playwright requis séparément). Exemple si Playwright est disponible :

```sh
PLAYWRIGHT_MODULE=/chemin/vers/playwright CHROME_PATH=/chemin/vers/chrome node scripts/browser-smoke.cjs
```

Il teste les entrées clavier/souris, menus, sauvegarde, combat, mort, victoire, une manette standard simulée et l’export statique sous un sous-répertoire. Certains scénarios utilisent l’interface de diagnostic `?debug=1` pour atteindre les états à contrôler ; ce n’est pas une validation humaine de la difficulté de toute la partie.

## État et limites

- Six espaces connectés, trois archétypes d’ennemis, boss à deux phases, refuge, raccourci et détour récompensé.
- Graphismes originaux procéduraux provisoires, débris CC0 Stealthix, sons CC0 Kenney. Sources et licences dans `CREDITS.md`.
- Interface française, contrôles manette standard, réglages du son et réduction des effets.
- Cible : ordinateur. Pas de commandes tactiles.
- Le ressenti, les animations finales, la durée de 15–25 minutes et l’équilibrage doivent encore être validés par des essais humains.
- Chrome a été testé automatiquement. Safari, Firefox et une manette physique restent à vérifier.
- Aucun appel à PixelLab ni crédit de génération consommé.

## Organisation

- `src/core.js` : simulation, monde, combats et progression ; indépendante du DOM.
- `src/render.js` : terrain précalculé, personnages provisoires, caméra et carte.
- `src/main.js` : boucle, interface, commandes, audio et sauvegarde.
- `assets/` : ressources livrées avec le jeu et licences.
- `docs/ROADMAP.md` : jalons et travail restant.
