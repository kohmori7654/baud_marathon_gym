
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

async function fixData() {
    console.log('Fixing Simulation questions in:', supabaseUrl);

    const updates = [
        {
            // HSRP Question (Distro SW1)
            ids: ['98792a56-c382-4c15-bcc5-0a5c6ef73780', '9f2555b9-a018-41e3-af5d-0f94c00a050c'],
            json: {
                "interface": "Vlan100",
                "standby_group": "1",
                "standby_ip": "192.168.1.1",
                "standby_priority": "110",
                "standby_preempt": "true"
            }
        },
        {
            // OSPF Question
            ids: ['b5d4c2a6-f85b-419c-bfea-892f7eda3f84', 'bd20fc06-41fe-4fd5-b842-a2048241678a'],
            json: {
                "router_ospf": "1",
                "interface": "GigabitEthernet0/0",
                "ip_ospf_area": "0",
                "ip_ospf_network": "point-to-point"
            }
        },
        {
            // SPAN & NetFlow Question
            ids: ['c7399826-868d-4d2a-b037-6fd582a18faf'],
            json: {
                "monitor_session_source": "interface Vlan99 tx",
                "monitor_session_destination": "interface Ethernet0/1",
                "ip_flow_top_talkers": "true",
                "top": "50",
                "sort_by": "bytes"
            }
        }
    ];

    for (const update of updates) {
        for (const id of update.ids) {
            console.log(`Updating question ${id}...`);
            const { error } = await supabase
                .from('questions')
                .update({ simulation_target_json: update.json })
                .eq('id', id);

            if (error) {
                console.error(`Error updating ${id}:`, error);
            } else {
                console.log(`Success updating ${id}`);
            }
        }
    }
}

fixData();
