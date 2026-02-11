-- ============================================================
-- CCNP資格取得支援アプリ - サンプル問題データ
-- Migration: 002_seed_sample_questions.sql
-- ============================================================

-- ============================================================
-- ENCOR サンプル問題
-- ============================================================

-- 問題1: Single Choice (Architecture)
INSERT INTO questions (id, exam_type, domain, question_text, question_type, explanation, hash)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'ENCOR',
    'Architecture',
    'Which of the following best describes the role of the control plane in a network device?',
    'Single',
    '## 解説

**Control Plane（コントロールプレーン）** は、ネットワークデバイスにおいて経路情報の学習と配布を担当するレイヤーです。

### 各プレーンの役割

| プレーン | 役割 |
|---------|------|
| **Control Plane** | ルーティングプロトコル処理、経路テーブル構築 |
| **Data Plane** | 実際のパケット転送 |
| **Management Plane** | デバイスの設定・監視 |

Control Planeは、OSPF、EIGRP、BGPなどのルーティングプロトコルを実行し、最適経路を決定してFIB（Forwarding Information Base）を構築します。',
    'encor_arch_001'
);

INSERT INTO options (question_id, text, is_correct, sort_order) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'To forward packets based on the routing table', FALSE, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'To learn and distribute routing information', TRUE, 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'To provide CLI access for device configuration', FALSE, 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'To encrypt traffic passing through the device', FALSE, 4);

-- 問題2: Multi Choice (Virtualization)
INSERT INTO questions (id, exam_type, domain, question_text, question_type, explanation, hash)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'ENCOR',
    'Virtualization',
    'Which two statements about VRF (Virtual Routing and Forwarding) are correct? (Choose two)',
    'Multi',
    '## 解説

**VRF（Virtual Routing and Forwarding）** は、単一の物理ルーター上で複数の独立したルーティングテーブルを維持する技術です。

### VRFの特徴
- ✅ 各VRFは独自のルーティングテーブルを持つ
- ✅ 同じIPアドレス空間を異なるVRFで使用可能
- ❌ VRFはレイヤー2の分離技術ではない（VLANがL2）
- ❌ VRFにはライセンスは不要（標準機能）

### ユースケース
- マルチテナント環境
- MPLS VPNのPE（Provider Edge）ルーター',
    'encor_virt_001'
);

INSERT INTO options (question_id, text, is_correct, sort_order) VALUES
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Each VRF maintains its own independent routing table', TRUE, 1),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'VRF is a Layer 2 segmentation technology', FALSE, 2),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'The same IP address can exist in different VRFs without conflict', TRUE, 3),
('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'VRF requires a special license on Cisco routers', FALSE, 4);

-- 問題3: DragDrop (Infrastructure)
INSERT INTO questions (id, exam_type, domain, question_text, question_type, explanation, hash)
VALUES (
    'c3d4e5f6-a7b8-9012-cdef-345678901234',
    'ENCOR',
    'Infrastructure',
    'Drag and drop the network protocols to their correct OSI layer.',
    'DragDrop',
    '## 解説

### OSIモデルとプロトコルの対応

| レイヤー | プロトコル例 |
|---------|-------------|
| Layer 7 (Application) | HTTP, DNS, DHCP |
| Layer 4 (Transport) | TCP, UDP |
| Layer 3 (Network) | IP, ICMP, OSPF |
| Layer 2 (Data Link) | Ethernet, ARP |

各プロトコルがどのレイヤーで動作するかを理解することは、トラブルシューティングにおいて非常に重要です。',
    'encor_infra_001'
);

-- DragDropの選択肢（ペア形式: "item|target"）
INSERT INTO options (question_id, text, is_correct, sort_order) VALUES
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'HTTP|Layer 7', TRUE, 1),
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'TCP|Layer 4', TRUE, 2),
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'IP|Layer 3', TRUE, 3),
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Ethernet|Layer 2', TRUE, 4);

-- ============================================================
-- ENARSI サンプル問題
-- ============================================================

-- 問題4: Single Choice (Layer 3 Technologies)
INSERT INTO questions (id, exam_type, domain, question_text, question_type, explanation, hash)
VALUES (
    'd4e5f6a7-b8c9-0123-def0-456789012345',
    'ENARSI',
    'Layer 3 Technologies',
    'When configuring EIGRP, which command is used to advertise a summary route?',
    'Single',
    '## 解説

EIGRPでサマリールートをアドバタイズするには、インターフェースコンフィギュレーションモードで `ip summary-address eigrp` コマンドを使用します。

### 設定例
```
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip summary-address eigrp 100 192.168.0.0 255.255.0.0
```

### その他の選択肢について
- `network` - EIGRPプロセスに参加するネットワークを指定
- `redistribute` - 他のルーティングプロトコルからの再配布
- `aggregate-address` - BGPで使用するコマンド',
    'enarsi_l3_001'
);

INSERT INTO options (question_id, text, is_correct, sort_order) VALUES
('d4e5f6a7-b8c9-0123-def0-456789012345', 'network summary', FALSE, 1),
('d4e5f6a7-b8c9-0123-def0-456789012345', 'ip summary-address eigrp', TRUE, 2),
('d4e5f6a7-b8c9-0123-def0-456789012345', 'redistribute summary', FALSE, 3),
('d4e5f6a7-b8c9-0123-def0-456789012345', 'aggregate-address', FALSE, 4);

-- 問題5: Simulation (VPN Technologies)
INSERT INTO questions (id, exam_type, domain, question_text, question_type, explanation, simulation_target_json, hash)
VALUES (
    'e5f6a7b8-c9d0-1234-ef01-567890123456',
    'ENARSI',
    'VPN Technologies',
    'Configure a GRE tunnel on Router1 with the following requirements:
- Tunnel source: GigabitEthernet0/0
- Tunnel destination: 10.1.1.2
- Tunnel IP address: 172.16.1.1/30

Enter the configuration commands:',
    'Simulation',
    '## 解説

GRE（Generic Routing Encapsulation）トンネルは、異なるプロトコルのパケットをIPパケット内にカプセル化して転送する技術です。

### 設定コマンド解説
```
interface Tunnel0
 ip address 172.16.1.1 255.255.255.252
 tunnel source GigabitEthernet0/0
 tunnel destination 10.1.1.2
```

### キーポイント
1. `tunnel source` - 物理インターフェースまたはIPアドレスを指定
2. `tunnel destination` - トンネルの終端IPアドレス
3. トンネルインターフェースには任意のIPアドレスを設定可能',
    '{
        "interface": "Tunnel0",
        "ip_address": "172.16.1.1",
        "subnet_mask": "255.255.255.252",
        "tunnel_source": "GigabitEthernet0/0",
        "tunnel_destination": "10.1.1.2"
    }',
    'enarsi_vpn_001'
);

-- 問題6: Multi Choice (Infrastructure Security)
INSERT INTO questions (id, exam_type, domain, question_text, question_type, explanation, hash)
VALUES (
    'f6a7b8c9-d0e1-2345-f012-678901234567',
    'ENARSI',
    'Infrastructure Security',
    'Which three features can be used to protect the control plane of a router? (Choose three)',
    'Multi',
    '## 解説

コントロールプレーンの保護に使用できる機能:

### ✅ 正解の機能
1. **Control Plane Policing (CoPP)** - コントロールプレーン宛トラフィックをレート制限
2. **Management Plane Protection (MPP)** - 管理アクセスを特定インターフェースに制限
3. **CPU Thresholding** - CPU使用率の監視と通知

### ❌ 不正解の機能
- **DHCP Snooping** - データプレーンのL2セキュリティ機能
- **Port Security** - スイッチポートのMACアドレス制限（L2）

コントロールプレーン保護は、ルーター自体へのDoS攻撃からの防御に重要です。',
    'enarsi_sec_001'
);

INSERT INTO options (question_id, text, is_correct, sort_order) VALUES
('f6a7b8c9-d0e1-2345-f012-678901234567', 'Control Plane Policing (CoPP)', TRUE, 1),
('f6a7b8c9-d0e1-2345-f012-678901234567', 'DHCP Snooping', FALSE, 2),
('f6a7b8c9-d0e1-2345-f012-678901234567', 'Management Plane Protection (MPP)', TRUE, 3),
('f6a7b8c9-d0e1-2345-f012-678901234567', 'Port Security', FALSE, 4),
('f6a7b8c9-d0e1-2345-f012-678901234567', 'CPU Thresholding', TRUE, 5);
