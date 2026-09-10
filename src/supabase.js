
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nuebqdxrrxsxzqaqozex.supabase.co";
const supabasePublishableKey = "sb_publishable_H-kW6RDb3G5_xN_sDAusbg_5czZh5iL";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);