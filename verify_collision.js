
const crypto = require('crypto');

const questions = [
    "エンジニアが Cisco Wireless LAN Controllerでローカル WebAuth を設定しています。RFC 5737 に準拠する場合、この構成ではどの仮想IPアドレスを使用する必要がありますか?",
    "エンジニアが Cisco 9800 ワイヤレスLAN コントローラで新しい SSID を作成する必要があります。クライアントは、認証に事前共有キー（PSK）を使用するように要求しました。この要件を達成するには、エンジニアが編集する必要のあるプロファイルはどれですか。",
    "エンジニアは、OSPF プロセスの問題が原因でネットワークに変更が発生した場合に、syslogメッセージを送信する EEM アプレットを作成する必要があります。どのアクションを使用する必要がありますか?",
    "エンジニアは、OSPFプロセスの問題が原因でネットワークに変更が発生した場合に、syslogメッセージを送信するEEMアプレットを作成する必要があります。エンジニアはどのアクションコマンドを使用する必要がありますか?",
    "エンジニアが、動的トランキングプロトコル(DTP)を使用して接続を確立しましたが、VLAN1の管理トラフィックが通過していません。問題を解決し、すべてのVLAN通信を許可するアクションはどれですか。",
    "エンジニアが Cisco Wireless LAN Controllerでローカル WebAuth を設定しています。RFC 5737 によると、この構成ではどの仮想IPアドレスを使用する必要がありますか?",
];

questions.forEach(q => {
    const oldHash = Buffer.from(q).toString('base64').substring(0, 16);
    const newHash = crypto.createHash('sha256').update(q).digest('hex').substring(0, 16);
    console.log(`Text: ${q.substring(0, 20)}...`);
    console.log(`Old Hash: ${oldHash}`);
    console.log(`New Hash: ${newHash}`);
    console.log('---');
});
