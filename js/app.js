import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    "https://msnnsnatkozozlrenfrg.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbm5zbmF0a296b3pscmVuZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDIwOTYsImV4cCI6MjEwMDkxODA5Nn0.BkfWuj8Ce7_9XqlNBEatNpYInZKn0IjAqOkjNUe5Wb4"
);

window.supabaseClient = supabase;

import "./auth.js";
