/* NO ANTICHEAT: the cheat menu in 11 languages (the seller is very international). */
(function (NA) {
  'use strict';
  const LANGS = [
    ['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'], ['ru', 'Русский'],
    ['tr', 'Türkçe'], ['pl', 'Polski'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'],
  ];
  // Columns follow LANGS order.
  const T = {
    aim: ['AIM', 'APUNTADO', 'MIRA', 'VISÉE', 'ZIELEN', 'АИМ', 'NİŞAN', 'CELOWANIE', '瞄准', 'エイム', '조준'],
    visuals: ['VISUALS', 'VISUALES', 'VISUAIS', 'VISUELS', 'VISUALS', 'ВИЗУАЛЫ', 'GÖRSEL', 'WIZUALNE', '视觉', 'ビジュアル', '비주얼'],
    misc: ['MISC', 'VARIOS', 'DIVERSOS', 'DIVERS', 'SONSTIGES', 'РАЗНОЕ', 'DİĞER', 'RÓŻNE', '杂项', 'その他', '기타'],
    exploits: ['EXPLOITS', 'EXPLOITS', 'EXPLOITS', 'EXPLOITS', 'EXPLOITS', 'ЭКСПЛОИТЫ', 'AÇIKLAR', 'EXPLOITY', '漏洞', 'エクスプロイト', '익스플로잇'],
    config: ['CONFIG', 'CONFIG', 'CONFIG', 'CONFIG', 'KONFIG', 'КОНФИГ', 'AYAR', 'KONFIG', '设置', '設定', '설정'],
    undetected: ['undetected', 'indetectable', 'indetectável', 'indétectable', 'unentdeckt', 'не обнаружен', 'tespit edilemez', 'niewykrywalny', '未检测', '検出なし', '탐지 안됨'],
    hide: ['INS to hide', 'INS para ocultar', 'INS para esconder', 'INS pour masquer', 'EINFG zum Ausblenden', 'INS скрыть', 'Gizlemek için INS', 'INS aby ukryć', 'INS 隐藏', 'INSで非表示', 'INS 숨기기'],
    panic: ['PANIC (END): all cheats off', 'PÁNICO (FIN): todo apagado', 'PÂNICO (END): tudo desligado', 'PANIQUE (FIN) : tout couper', 'PANIK (ENDE): alles aus', 'ПАНИКА (END): всё выкл', 'PANİK (END): hepsi kapalı', 'PANIKA (END): wszystko wył.', '紧急 (END)：全部关闭', 'パニック (END)：全てオフ', '패닉 (END): 전부 끄기'],
    panicOn: ['PANIC ON: tap to restore', 'PÁNICO: toca para restaurar', 'PÂNICO: toque para restaurar', 'PANIQUE : touchez pour rétablir', 'PANIK: tippen zum Wiederherstellen', 'ПАНИКА: нажми, чтобы вернуть', 'PANİK: geri yüklemek için dokun', 'PANIKA: dotknij, by przywrócić', '紧急中：点按恢复', 'パニック中：タップで復元', '패닉: 눌러서 복구'],
    locked: ['buy at skillissue.shop', 'cómpralo en skillissue.shop', 'compre em skillissue.shop', 'à acheter sur skillissue.shop', 'kaufen auf skillissue.shop', 'купить на skillissue.shop', 'skillissue.shop\'tan al', 'kup na skillissue.shop', '去 skillissue.shop 购买', 'skillissue.shopで購入', 'skillissue.shop에서 구매'],
    level: ['level', 'nivel', 'nível', 'niveau', 'Stufe', 'уровень', 'seviye', 'poziom', '等级', 'レベル', '레벨'],
    type: ['Type', 'Tipo', 'Tipo', 'Type', 'Typ', 'Тип', 'Tür', 'Typ', '类型', 'タイプ', '유형'],
    memory: ['Memory', 'Memoria', 'Memória', 'Mémoire', 'Memory', 'Memory', 'Bellek', 'Memory', '内存', 'メモリー', '메모리'],
    silent: ['Silent', 'Silencioso', 'Silencioso', 'Silencieux', 'Silent', 'Сайлент', 'Sessiz', 'Cichy', '静默', 'サイレント', '사일런트'],
    hitbox: ['Hitbox', 'Hitbox', 'Hitbox', 'Hitbox', 'Hitbox', 'Хитбокс', 'Hitbox', 'Hitbox', '命中部位', 'ヒットボックス', '히트박스'],
    head: ['Head', 'Cabeza', 'Cabeça', 'Tête', 'Kopf', 'Голова', 'Kafa', 'Głowa', '头部', '頭', '머리'],
    neck: ['Neck', 'Cuello', 'Pescoço', 'Cou', 'Hals', 'Шея', 'Boyun', 'Szyja', '颈部', '首', '목'],
    pelvis: ['Pelvis', 'Pelvis', 'Pélvis', 'Bassin', 'Becken', 'Таз', 'Kalça', 'Miednica', '骨盆', '骨盤', '골반'],
    random: ['Random', 'Aleatorio', 'Aleatório', 'Aléatoire', 'Zufällig', 'Случайно', 'Rastgele', 'Losowo', '随机', 'ランダム', '랜덤'],
    smooth: ['Smooth', 'Suavizado', 'Suavização', 'Lissage', 'Glättung', 'Плавность', 'Yumuşatma', 'Wygładzanie', '平滑', 'スムーズ', '부드러움'],
    predict: ['Prediction', 'Predicción', 'Predição', 'Prédiction', 'Vorhersage', 'Предикт', 'Tahmin', 'Predykcja', '预判', '予測', '예측'],
    fovCircle: ['Draw FOV', 'Dibujar FOV', 'Mostrar FOV', 'Afficher FOV', 'FOV zeigen', 'Рисовать FOV', 'FOV çiz', 'Rysuj FOV', '显示范围', 'FOV表示', 'FOV 표시'],
    headOnly: ['Head only', 'Solo cabeza', 'Só cabeça', 'Tête uniquement', 'Nur Kopf', 'Только голова', 'Sadece kafa', 'Tylko głowa', '仅头部', '頭のみ', '머리만'],
    box: ['Box', 'Caja', 'Caixa', 'Boîte', 'Box', 'Бокс', 'Kutu', 'Ramka', '方框', 'ボックス', '박스'],
    skeleton: ['Skeleton', 'Esqueleto', 'Esqueleto', 'Squelette', 'Skelett', 'Скелет', 'İskelet', 'Szkielet', '骨骼', 'スケルトン', '스켈레톤'],
    health: ['Health', 'Vida', 'Vida', 'Santé', 'Leben', 'Здоровье', 'Can', 'Zdrowie', '血量', '体力', '체력'],
    shield: ['Shield', 'Escudo', 'Escudo', 'Bouclier', 'Schild', 'Щит', 'Kalkan', 'Tarcza', '护盾', 'シールド', '실드'],
    name: ['Name', 'Nombre', 'Nome', 'Nom', 'Name', 'Ник', 'İsim', 'Nick', '名字', '名前', '이름'],
    distance: ['Distance', 'Distancia', 'Distância', 'Distance', 'Distanz', 'Дистанция', 'Mesafe', 'Dystans', '距离', '距離', '거리'],
    weapon: ['Weapon', 'Arma', 'Arma', 'Arme', 'Waffe', 'Оружие', 'Silah', 'Broń', '武器', '武器', '무기'],
    platform: ['Platform', 'Plataforma', 'Plataforma', 'Plateforme', 'Plattform', 'Платформа', 'Platform', 'Platforma', '平台', 'プラットフォーム', '플랫폼'],
    rank: ['Rank', 'Rango', 'Rank', 'Rang', 'Rang', 'Ранг', 'Rütbe', 'Ranga', '段位', 'ランク', '랭크'],
    kills: ['Kills', 'Bajas', 'Abates', 'Kills', 'Kills', 'Убийства', 'Leş', 'Zabójstwa', '击杀', 'キル', '킬'],
    snaplines: ['Snaplines', 'Líneas', 'Linhas', 'Lignes', 'Linien', 'Линии', 'Çizgiler', 'Linie', '射线', 'スナップライン', '스냅라인'],
    chams: ['Chams', 'Chams', 'Chams', 'Chams', 'Chams', 'Чамсы', 'Chams', 'Chamsy', '透视上色', 'チャムス', '챔스'],
    botTag: ['Bot tag', 'Etiqueta bot', 'Tag de bot', 'Tag bot', 'Bot-Markierung', 'Метка бота', 'Bot etiketi', 'Znacznik bota', '机器人标记', 'BOTタグ', '봇 표시'],
    minRarity: ['Min rarity', 'Rareza mín.', 'Raridade mín.', 'Rareté min.', 'Min. Seltenheit', 'Мин. редкость', 'Min. nadirlik', 'Min. rzadkość', '最低稀有度', '最低レア度', '최소 등급'],
    weapons: ['Weapons', 'Armas', 'Armas', 'Armes', 'Waffen', 'Оружие', 'Silahlar', 'Bronie', '武器', '武器', '무기'],
    shields: ['Shields', 'Escudos', 'Escudos', 'Boucliers', 'Schilde', 'Щиты', 'Kalkanlar', 'Tarcze', '护盾', 'シールド', '실드'],
    meds: ['Medkits', 'Botiquines', 'Kits médicos', 'Soins', 'Medikits', 'Аптечки', 'İlk yardım', 'Apteczki', '医疗包', '回復', '구급상자'],
    language: ['Menu language', 'Idioma del menú', 'Idioma do menu', 'Langue du menu', 'Menüsprache', 'Язык меню', 'Menü dili', 'Język menu', '菜单语言', 'メニュー言語', '메뉴 언어'],
    unlockAt: ['unlocks at level', 'se desbloquea en nivel', 'desbloqueia no nível', 'débloqué au niveau', 'ab Stufe', 'откроется на уровне', 'şu seviyede açılır:', 'odblokowanie na poziomie', '解锁等级', '解放レベル', '해금 레벨'],
    hidden: ['hidden from capture', 'oculto en capturas', 'oculto da captura', 'masqué des captures', 'vor Aufnahme verborgen', 'скрыто от записи', 'kayıttan gizli', 'ukryte przed nagraniem', '录屏不可见', 'キャプチャ非表示', '녹화 숨김'],
    // cheat names (many cheat menus keep the English names, so only some change)
    c_aimassist: ['Aim Assist', 'Asistencia', 'Assistência', 'Aide à la visée', 'Zielhilfe', 'Аим-ассист', 'Nişan Yardımı', 'Wspomaganie', '辅助瞄准', 'エイムアシスト', '조준 보조'],
    c_steady: ['Steady Hands', 'Pulso firme', 'Mãos firmes', 'Mains stables', 'Ruhige Hand', 'Твёрдая рука', 'Sabit Eller', 'Pewna ręka', '稳定手', '手ブレ補正', '손떨림 방지'],
    c_nospread: ['No Spread', 'Sin dispersión', 'Sem dispersão', 'Sans dispersion', 'Kein Streuen', 'Без разброса', 'Saçılma Yok', 'Bez rozrzutu', '无扩散', 'ノースプレッド', '탄퍼짐 제거'],
    c_norecoil: ['No Recoil', 'Sin retroceso', 'Sem recuo', 'Sans recul', 'Kein Rückstoß', 'Без отдачи', 'Geri Tepme Yok', 'Bez odrzutu', '无后坐', 'ノーリコイル', '반동 제거'],
    c_triggerbot: ['Triggerbot', 'Triggerbot', 'Triggerbot', 'Triggerbot', 'Triggerbot', 'Триггербот', 'Triggerbot', 'Triggerbot', '自动扳机', 'トリガーボット', '트리거봇'],
    c_aimbot: ['Aimbot', 'Aimbot', 'Aimbot', 'Aimbot', 'Aimbot', 'Аимбот', 'Aimbot', 'Aimbot', '自瞄', 'エイムボット', '에임봇'],
    c_radar: ['Radar', 'Radar', 'Radar', 'Radar', 'Radar', 'Радар', 'Radar', 'Radar', '雷达', 'レーダー', '레이더'],
    c_wallhack: ['Player ESP', 'ESP jugadores', 'ESP jogadores', 'ESP joueurs', 'Spieler-ESP', 'ESP игроков', 'Oyuncu ESP', 'ESP graczy', '玩家透视', 'プレイヤーESP', '플레이어 ESP'],
    c_lootesp: ['Loot ESP', 'ESP botín', 'ESP saque', 'ESP butin', 'Loot-ESP', 'ESP лута', 'Ganimet ESP', 'ESP łupu', '物资透视', 'アイテムESP', '아이템 ESP'],
    c_speedhack: ['Speedhack', 'Velocidad', 'Velocidade', 'Vitesse', 'Speedhack', 'Спидхак', 'Hız Hilesi', 'Speedhack', '加速', 'スピードハック', '스피드핵'],
    c_rapidfire: ['Rapid Fire', 'Disparo rápido', 'Tiro rápido', 'Tir rapide', 'Schnellfeuer', 'Скорострел', 'Hızlı Ateş', 'Szybki ogień', '快速射击', '連射', '연사'],
    c_infammo: ['Infinite Ammo', 'Munición infinita', 'Munição infinita', 'Munitions infinies', 'Unendlich Munition', 'Бесконечные патроны', 'Sonsuz Mermi', 'Nieskończona amunicja', '无限子弹', '弾薬無限', '무한 탄약'],
    c_kdspoof: ['K/D Spoofer', 'Falsificar K/D', 'Falsificar K/D', 'Faux K/D', 'K/D-Spoofer', 'Спуфер K/D', 'K/D Sahteleyici', 'Fałszywe K/D', '战绩伪装', 'K/D偽装', 'K/D 위조'],
    c_streamproof: ['Stream Proof', 'Anti-stream', 'À prova de stream', 'Anti-stream', 'Stream-sicher', 'Стрим-пруф', 'Yayın Gizleme', 'Ochrona streamu', '防录屏', '配信対策', '방송 방지'],
    c_voterig: ['Vote Rigging', 'Votos amañados', 'Votação fraudada', 'Votes truqués', 'Wahlbetrug', 'Подкрутка голосов', 'Oy Hilesi', 'Ustawione głosowania', '操纵投票', '投票操作', '투표 조작'],
    c_wallbang: ['Shoot Through Walls', 'Disparar a través', 'Atirar pelas paredes', 'Tir à travers les murs', 'Durch Wände schießen', 'Стрельба сквозь стены', 'Duvar Arkası Ateş', 'Strzał przez ściany', '穿墙射击', '壁抜き射撃', '벽 관통 사격'],
    c_freeze: ['Freeze Target', 'Congelar objetivo', 'Congelar alvo', 'Geler la cible', 'Ziel einfrieren', 'Заморозка цели', 'Hedefi Dondur', 'Zamroź cel', '冻结目标', 'ターゲット凍結', '대상 정지'],
  };
  const I = { LANGS };
  I.idx = () => {
    const code = (NA.Save && NA.Save.data && NA.Save.data.settings.lang) || 'en';
    const i = LANGS.findIndex(l => l[0] === code);
    return i < 0 ? 0 : i;
  };
  I.t = key => { const row = T[key]; return row ? row[I.idx()] || row[0] : key; };
  NA.I18N = I;
})(window.NA);
