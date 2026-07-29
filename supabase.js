const SUPABASE_URL = "https://msnnsnatkozozlrenfrg.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbm5zbmF0a296b3pscmVuZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDIwOTYsImV4cCI6MjEwMDkxODA5Nn0.BkfWuj8Ce7_9XqlNBEatNpYInZKn0IjAqOkjNUe5Wb4";
const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
