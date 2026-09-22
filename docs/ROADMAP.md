# Roadmap — La Cloche des Cendres

## Périmètre retenu

Démo web statique sur ordinateur, dark fantasy originale, pixel art en vue trois quarts.
Duels, exploration et apprentissage ; pas de monde ouvert, magie, classes, multijoueur ou équipement multiple.
PixelLab reste optionnel, uniquement après un essai du prototype.

| Jalon | État de cette première version | Validation restante |
| --- | --- | --- |
| 1. Socle et déplacements | Implémenté : Canvas natif, collisions, caméra, clavier/souris et Gamepad API | Test manette physique et autres navigateurs |
| 2. Premier duel | Implémenté : deux attaques, endurance, esquive, soin, feedback | Ressenti à valider avec le joueur |
| 3. Exploration et mort | Implémenté : six zones, refuge, perte/récupération, raccourci et sauvegarde | Orientation et rythme en essai humain |
| 4. Rencontres et progression | Implémenté : trois archétypes, butin, deux améliorations, talisman | Difficulté et économie à ajuster |
| 5. Boss et parcours complet | Implémenté : trois attaques, deux phases et conclusion | Duel complet sans outils de diagnostic à tester humainement |
| 6. Direction artistique | Lumières dynamiques (lightmap), shaders WebGL (bloom, grade de zone, grain, vignette, flash), particules d’ambiance par zone, traînée d’épée ; assets CC0 intégrés | Sprites animés définitifs, variété du décor, ambiance sonore, réglage fin des teintes en essai humain |
| 7. Livraison | Tests de simulation et navigateur, export statique | Playtests, compatibilité, performances sur matériel modeste, publication si demandée |

## Prochaine séance de test

1. Tester le premier duel sans amélioration et noter : visée, distance, vitesse, fenêtres d’esquive.
2. Parcourir le sanctuaire sans ouvrir la carte systématiquement.
3. Tester le boss, notamment la lisibilité de la charge et de la frappe au sol.
4. Relever la durée réelle, le nombre de morts et les difficultés de commandes.
5. Choisir les sprites à remplacer en priorité ; budget PixelLab défini seulement après vérification des coûts du compte.

Priorité d’assets éventuels : pèlerin et animations, boss et animations, puis silhouettes des trois ennemis.
Les sols, murs, interface et petits effets peuvent rester locaux et réutilisables.
