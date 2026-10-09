export const CONFIG = {
  // Supabase → Project Settings → API (ces deux valeurs sont publiques par conception : la sécurité repose sur les règles RLS)
  SUPABASE_URL: 'https://dwwyzznpjiagaiitgajo.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3d3l6em5wamlhZ2FpaXRnYWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTA4NjMsImV4cCI6MjEwNzEyNjg2M30.nzh1oplesUXmmQnUKYuNYLbrmJzpusy8LTPrDh7tHbU',

  // Même client OAuth Google que l'Agenda (pour créer les alertes dans le calendrier « Échéances »)
  GOOGLE_CLIENT_ID: '145540817012-58tgrr7d2q357i9ejqu7gjg1imqkch9q.apps.googleusercontent.com',
};
