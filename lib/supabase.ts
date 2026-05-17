import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hbktlkuzftuquxzxjyaf.supabase.co'
const supabaseKey = 'sb_publishable_IeXZTx7nSYQYjim3xs5HDA_VKM0bH1D'

export const supabase = createClient(supabaseUrl, supabaseKey)