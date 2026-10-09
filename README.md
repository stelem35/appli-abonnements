# Suivi des abonnements

PWA de suivi des contrats : totaux, échéances, alertes dans Google Agenda (calendrier « Échéances »).
Données dans Supabase (protégées par RLS), alertes via Google Calendar.

## 1. Supabase (gratuit)

1. https://supabase.com → **Start your project** → se connecter (GitHub ou e-mail).
2. **New project** : nom `abonnements`, région Europe (Paris ou Frankfurt), plan **Free**, noter le mot de passe de la base.
3. **SQL Editor** → New query → coller `supabase/schema.sql` → **Run**.
4. **Project Settings → API** : copier **Project URL** et la clé **anon public** dans `js/config.js`.
   Ne jamais copier la clé `service_role`.
5. **Authentication → Sign In / Providers → Google** : activer, coller le **Client ID** (celui de `js/config.js`) et le **Client secret**
   (valeur `client_secret` du fichier JSON téléchargé depuis Google Cloud ; ne la partage pas). Noter la **Callback URL** affichée.
6. **Google Cloud → Google Auth Platform → Clients → ton client** :
   - *URI de redirection autorisés* : ajouter la Callback URL de Supabase.
   - *Origines JavaScript autorisées* : ajouter `https://stelem35.github.io` et `http://localhost:8081`.
7. **Supabase → Authentication → URL Configuration** : Site URL = l'adresse GitHub Pages de l'app ; Redirect URLs = cette adresse + `http://localhost:8081/`.
8. Après ta première connexion : **Authentication → Sign In / Providers** → désactiver « Allow new users to sign up »
   pour que personne d'autre ne puisse créer de compte.

## 2. Lancer en local

```bash
npx serve -l 8081 .
```

## 3. Hébergement GitHub Pages

Dépôt GitHub → Settings → Pages → Deploy from a branch → `main` / racine.

## Alertes Google Agenda

À l'enregistrement d'un contrat avec une fin d'engagement, l'app crée (ou met à jour) un événement
« Résilier ou renégocier … avant le JJ/MM » dans le calendrier « Échéances », à la date limite (fin d'engagement − préavis),
avec un rappel 4 ou 2 semaines avant (Google limite les rappels à 4 semaines).
Format détaillé : `contrat-echeances-agenda.md`.
