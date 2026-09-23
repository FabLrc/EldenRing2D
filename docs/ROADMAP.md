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
| 6. Direction artistique | Lumières dynamiques, shaders WebGL, particules d’ambiance, traînée d’épée ; sprites animés du pèlerin et des trois archétypes ennemis ; accessoires pixel art | Animations du boss, variété du décor, ambiance sonore et réglage fin des teintes en essai humain |
| 7. Livraison | Tests de simulation et navigateur, export statique | Playtests, compatibilité, performances sur matériel modeste, publication si demandée |
| 8. Smartphone (tactile) | Implémenté : stick virtuel, grappe de boutons, auto-visée, paysage forcé, UI tactile — desktop inchangé | Validation manette et tactile sur appareil réel, confort des boutons, contraste en plein soleil |

## Prochaine séance de test

1. Tester le premier duel sans amélioration et noter : visée, distance, vitesse, fenêtres d’esquive.
2. Parcourir le sanctuaire sans ouvrir la carte systématiquement.
3. Tester le boss, notamment la lisibilité de la charge et de la frappe au sol.
4. Relever la durée réelle, le nombre de morts et les difficultés de commandes.
5. Valider en jeu la lisibilité des animations et des sprites d’ennemis.

Prochaine priorité d’assets : le boss et ses animations, puis compléter la variété du décor.
Les sols, murs, interface et petits effets peuvent rester locaux et réutilisables.
