# Projet : Suivi des abonnements et contrats (PWA)

## Objectif
Avoir une vue claire de tous mes contrats et abonnements, savoir ce qu'ils me coûtent, et être alerté **avant** la fin d'engagement ou le renouvellement pour résilier ou renégocier. Tout est mensualisé : l'intérêt n'est pas le paiement mais l'optimisation.

## Données par contrat
- Nom, catégorie (streaming, téléphone/internet, assurance, énergie, sport, logiciel, autre).
- Montant (mensuel ou annuel), fréquence.
- Date de début, **date de fin d'engagement** ou de renouvellement, préavis de résiliation (en jours ou mois).
- Notes (conditions, numéro de contrat, lien du site de résiliation).
- Statut : actif, à renégocier, résilié.

## Fonctions
- **Liste et tableau de bord** : total mensuel, total annuel, répartition par catégorie.
- **Alerte Google Agenda automatique** : événement "Résilier ou renégocier [contrat] avant le JJ/MM" créé à la date limite de préavis, avec un rappel quelques semaines avant.
- **Tri** par prochaine échéance et par coût.
- **Économies potentielles** : saisie d'un montant "cible" ou d'une offre concurrente, calcul du gain annuel.
- **Contrats résiliés** : historique conservé avec l'économie réalisée.
- Export CSV.

## Écrans
1. Tableau de bord (totaux, prochaines échéances).
2. Liste des contrats filtrable.
3. Fiche contrat (ajout et modification).

## Technique
- PWA installable, hébergement Netlify.
- Alertes via l'API Google Calendar (connexion OAuth).
- Stockage : à trancher au démarrage entre
  - A) local avec export/import JSON,
  - B) Supabase avec connexion sécurisée (synchro PC et téléphone).
- Aucun numéro de carte ni IBAN stocké.

## Plus tard
- Lien avec le coffre-fort de documents (contrat en pièce jointe).
- Affichage des échéances dans mon agenda personnalisé.

## Premier livrable (MVP)
1. Ajout, modification et liste des contrats.
2. Totaux mensuel et annuel.
3. Création automatique de l'alerte Google Agenda.

## Consignes pour Claude Code
- Pose-moi les questions utiles avant de coder, puis avance étape par étape.
- Commence par le MVP, puis itère.
