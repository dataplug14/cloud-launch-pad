
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wkquzeobnpxzwwbxtnnp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcXV6ZW9ibnB4end3Ynh0bm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4Nzk1OTQsImV4cCI6MjA2MDQ1NTU5NH0.AKHeSiQnhVKv6JFGXdtxa3H2pVB6nxeZbksxRcCngsA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
