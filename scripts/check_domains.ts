
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDomains() {
    const { data: encorDomains, error: encorError } = await supabase
        .from('questions')
        .select('domain')
        .eq('exam_type', 'ENCOR');

    if (encorError) {
        console.error('ENCOR Error:', encorError);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uniqueEncor = [...new Set(encorDomains.map((d: any) => d.domain))].sort();
        console.log('ENCOR Domains:', uniqueEncor);
    }

    const { data: enarsiDomains, error: enarsiError } = await supabase
        .from('questions')
        .select('domain')
        .eq('exam_type', 'ENARSI');

    if (enarsiError) {
        console.error('ENARSI Error:', enarsiError);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uniqueEnarsi = [...new Set(enarsiDomains.map((d: any) => d.domain))].sort();
        console.log('ENARSI Domains:', uniqueEnarsi);
    }
}

checkDomains();
