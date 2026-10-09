# Contrat « Échéances » entre les apps et l'Agenda perso

Règle commune à toutes les apps (abonnements, garanties, retraite, Instagram…). L'Agenda (https://agenda-perso.netlify.app) n'a rien à connaître de ces apps : il affiche le calendrier Google **« Échéances »**, onglet « À suivre » (90 jours) et vues Jour/Semaine/Mois.

## Où écrire
- Calendrier Google nommé exactement **Échéances** (créé par l'Agenda : Réglages ou onglet « À suivre » → « Créer le calendrier »).
- L'app retrouve son id via `calendarList` (résumé = « Échéances »).

## Format d'un événement
- **Journée entière** (`start.date` / `end.date` = lendemain).
- **Titre** : verbe d'action + objet + limite. Ex. `Résilier Netflix avant le 12/11`, `Fin de garantie lave-linge`.
- **Lieu** (facultatif) : lien de résiliation ou de la page concernée.
- **Description** : détails libres (montant, n° de contrat). Jamais de numéro de carte ni d'IBAN.
- **Rappel** : `reminders.useDefault=false`, `overrides=[{popup, minutes}]`. Pour une journée entière, `minutes = jours*1440 - 540` donne un rappel à 9h (la veille = 900, 2 jours = 2340, 1 semaine = 9540).
- **Catégorie** : le calendrier « Échéances » est classé « Admin » automatiquement. Pour forcer une catégorie : `extendedProperties.private.cat` = `travail | famille | sante | loisirs | admin`.

## Éviter les doublons
Chaque app pose sur ses événements :
- `extendedProperties.private.source` = `abonnements` (ou `garanties`, `retraite`, `instagram`…)
- `extendedProperties.private.sourceId` = identifiant du contrat dans l'app

Avant de créer, rechercher `privateExtendedProperty=source=...&privateExtendedProperty=sourceId=...` : s'il existe, **modifier** (`patch`), sinon créer. Si le contrat est résilié ou supprimé, supprimer l'événement.

## Accès Google
Même projet Google Cloud et même client OAuth que l'Agenda : ajouter l'URL de chaque app dans « Origines JavaScript autorisées ». Scope `https://www.googleapis.com/auth/calendar`.
