
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Fetching Simulation questions from:', supabaseUrl);

    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, question_text, simulation_target_json')
        .eq('question_type', 'Simulation');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`Found ${questions.length} Simulation questions.`);

    questions.forEach((q, i) => {
        console.log(`\n--- Question ${i + 1} (${q.id}) ---`);
        console.log('Question Text:', q.question_text.substring(0, 200) + '...');
        console.log('Type of simulation_target_json:', typeof q.simulation_target_json);
        console.log('Content:', q.simulation_target_json);

        if (typeof q.simulation_target_json === 'string') {
            try {
                const parsed = JSON.parse(q.simulation_target_json);
                console.log('Parsed successfully:', Object.keys(parsed));
            } catch (e: any) {
                console.error('JSON Parse Error:', e.message);
            }
        } else if (q.simulation_target_json && typeof q.simulation_target_json === 'object') {
            console.log('Already an object/jsonb. Keys:', Object.keys(q.simulation_target_json));
        } else {
            console.log('Unexpected format or null');
        }
    });
}

checkData();
