export type Language = 'id' | 'en' | 'ja';

type TranslationKeys = {

  // Login
  loginHeroSubtitle: string;
  loginWelcome: string;
  loginWelcomeDesc: string;
  loginFeat1: string;
  loginFeat2: string;
  loginFeat3: string;
  loginBtn: string;

  // Nav / Sidebar
  home: string;
  updateAvailable: string;
  updateDownloading: string;
  updateReady: string;
  settings: string;
  yourLibrary: string;
  liked: string;
  playlist: string;
  guest: string;
  logoutDropdown: string;
  goToSettings: string;
  
  // Status & Join
  statusOnline: string;
  statusIdle: string;
  statusDnd: string;
  askToJoin: string;
  joinRequestSent: string;
  joinRequestRejected: string;
  joinRequestReceived: string;
  accept: string;
  reject: string;
  joinDisabled: string;
  friendActivityTitle: string;
  friendActivitySubtitle: string;
  pendingRequests: string;
  noFriendsOnline: string;
  listenAlong: string;
  leaveParty: string;

  // Home Page
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  recentlyPlayed: string;
  recommendations: string;
  playAll: string;
  viewAll: string;
  showLess: string;
  likedSongs: string;
  noLikedSongs: string;
  noLikedDesc: string;
  noHistory: string;
  noHistoryDesc: string;

  // Search
  searchPlaceholder: string;
  searchResultsFor: string;
  noResults: string;

  // Library / Playlist
  myLibrary: string;
  createPlaylist: string;
  noPlaylists: string;
  noPlaylistsDesc: string;
  addSongs: string;
  songs: string;
  song: string;
  duration: string;
  removeFromPlaylist: string;
  playNext: string;
  addToQueue: string;
  addToPlaylist: string;
  deletePlaylist: string;
  confirmDeletePlaylist: string;
  cannotUndo: string;
  cancel: string;
  delete: string;
  editName: string;
  changeImage: string;

  // Create Playlist Modal
  newPlaylistTitle: string;
  playlistNamePlaceholder: string;
  coverOptional: string;
  imageUrlPlaceholder: string;
  create: string;
  back: string;
  save: string;
  importPlaylist: string;
  importPlaylistPlaceholder: string;
  importing: string;

  // Player
  nowPlaying: string;
  queue: string;
  clearQueue: string;
  lyricsPanel: string;
  noLyrics: string;
  offsetLabel: string;
  lyricsOffset: string;

  // Settings
  settingsTitle: string;
  accountSection: string;
  notLoggedIn: string;
  loginToSync: string;
  loginDiscord: string;
  logout: string;
  audioSection: string;
  defaultVolume: string;
  defaultVolumeDesc: string;
  audioQuality: string;
  audioQualityDesc: string;
  qualityAuto: string;
  qualityHigh: string;
  qualityMedium: string;
  crossfadeLabel: string;
  crossfadeDesc: string;
  crossfadeOff: string;
  crossfadeSec: string;
  displaySection: string;
  autoLyrics: string;
  autoLyricsDesc: string;
  autoSidebar: string;
  autoSidebarDesc: string;
  languageSection: string;
  languageLabel: string;
  languageDesc: string;
  dataSection: string;
  playHistory: string;
  savedSongs: string;
  clearHistory: string;
  playlistCount: string;
  deleteAllPlaylists: string;
  appVersion: string;
  clearAudioCache: string;
  audioCacheDesc: string;

  // Toast
  toastLogout: string;
  hitsInt: string;
  hitsId: string;
  hitsJp: string;
  hitsKr: string;
  hitsLatin: string;
  playSong: string;
  likeSong: string;
  unlikeSong: string;
  trendingLocal: string;
  toastHistoryCleared: string;
  toastPlaylistDeleted: string;
  toastPlaylistCreated: string;
  toastImportSuccess: string;
  toastAddedToPlaylist: string;
  toastAlreadyInPlaylist: string;
  toastLiked: string;
  toastUnliked: string;
  toastAddedToQueue: string;
  toastPlayNext: string;
  toastWelcome: string;
  toastDiscordError: string;
  toastSearchFail: string;
  toastServerBlocked: string;
  toastServerFallback: string;
  toastVideoLocked: string;
  lyricsSearching: string;
  lyricsNotFound: string;
  lyricsNotLRC: string;
  lyricsFailed: string;
  toastCacheCleared: string;
};

const translations: Record<Language, TranslationKeys> = {
  id: {
    // Login
    loginHeroSubtitle: 'Rasakan pengalaman mendengarkan musik tanpa batas dengan antarmuka yang elegan, fitur sinkronisasi lirik real-time, dan kualitas audio terbaik.',
    loginWelcome: 'Selamat Datang',
    loginWelcomeDesc: 'Masuk dengan akun Discord Anda untuk mulai membuat playlist dan menyimpan lagu favorit.',
    loginFeat1: 'Streaming musik kualitas tinggi',
    loginFeat2: 'Lirik tersinkron real-time',
    loginFeat3: 'Kelola playlist sesuka hati',
    loginBtn: 'Login dengan Discord',
    // Nav / Sidebar
    home: 'Beranda',
    updateAvailable: 'Pembaruan Tersedia',
    updateDownloading: 'Mengunduh Pembaruan...',
    updateReady: 'Pembaruan Siap. Klik untuk Instal',
    settings: 'Pengaturan',
    yourLibrary: 'Koleksi Kamu',
    liked: 'Disukai',
    playlist: 'Playlist',
    guest: 'Tamu',
    logoutDropdown: 'Logout',
    goToSettings: 'Ke Pengaturan (Login)',

    // Status & Join
    statusOnline: 'Online',
    statusIdle: 'Idle',
    statusDnd: 'Do Not Disturb',
    askToJoin: 'Minta Izin Gabung',
    joinRequestSent: 'Permintaan terkirim...',
    joinRequestRejected: 'Permintaan ditolak.',
    joinRequestReceived: 'ingin ikut mendengarkan!',
    accept: 'Terima',
    reject: 'Tolak',
    joinDisabled: 'Tidak bisa gabung',
    friendActivityTitle: 'Aktivitas Teman',
    friendActivitySubtitle: 'Dengarkan bersama teman',
    pendingRequests: 'PERMINTAAN TERTUNDA',
    noFriendsOnline: 'Tidak ada teman yang sedang online.',
    listenAlong: 'Ikut Dengar',
    leaveParty: 'Tinggalkan Party',

    // Home Page
    goodMorning: 'Selamat Pagi',
    goodAfternoon: 'Selamat Siang',
    goodEvening: 'Selamat Malam',
    recentlyPlayed: 'Baru Diputar',
    recommendations: 'Rekomendasi Untuk Anda',
    playAll: 'Putar Semua',
    viewAll: 'Lihat Semua',
    showLess: 'Tutup',
    likedSongs: 'Lagu Disukai',
    noLikedSongs: 'Belum ada lagu yang disukai',
    noLikedDesc: 'Tekan ikon hati pada lagu untuk menyukainya.',
    noHistory: 'Belum ada riwayat',
    noHistoryDesc: 'Mulailah memutar lagu untuk melihat riwayat Anda di sini.',

    // Search
    searchPlaceholder: 'Cari lagu, artis, album...',
    searchResultsFor: 'Hasil untuk',
    noResults: 'Tidak ada hasil ditemukan.',

    // Library / Playlist
    myLibrary: 'Koleksi Saya',
    createPlaylist: 'Buat Playlist',
    noPlaylists: 'Belum Ada Playlist',
    noPlaylistsDesc: 'Buat playlist pertama Anda sekarang!',
    addSongs: 'Tambah Lagu',
    songs: 'lagu',
    song: 'lagu',
    duration: 'Durasi',
    removeFromPlaylist: 'Hapus dari Playlist',
    playNext: 'Putar Selanjutnya',
    addToQueue: 'Tambah ke Antrean',
    addToPlaylist: 'Tambah ke Playlist',
    deletePlaylist: 'Hapus Playlist',
    confirmDeletePlaylist: 'Hapus Playlist?',
    cannotUndo: 'Tindakan ini tidak dapat dibatalkan.',
    cancel: 'Batal',
    delete: 'Ya, Hapus',
    editName: 'Ubah Nama',
    changeImage: 'Ubah Gambar',

    // Create Playlist Modal
    newPlaylistTitle: 'Buat Playlist Baru',
    playlistNamePlaceholder: 'Nama playlist...',
    coverOptional: 'Cover Playlist (Opsional)',
    imageUrlPlaceholder: 'URL Gambar dari internet...',
    create: 'Buat',
    back: 'Kembali',
    save: 'Simpan',
    importPlaylist: 'Impor Playlist YouTube',
    importPlaylistPlaceholder: 'URL Playlist YouTube...',
    importing: 'Sedang Mengimpor...',

    // Player
    nowPlaying: 'Sedang Diputar',
    queue: 'Antrean',
    clearQueue: 'Hapus Antrean',
    lyricsPanel: 'Lirik',
    noLyrics: 'Tidak ada lirik tersedia.',
    offsetLabel: 'Offset',
    lyricsOffset: 'Sinkronisasi Lirik (offset)',

    // Settings
    settingsTitle: 'Pengaturan',
    accountSection: 'Akun',
    notLoggedIn: 'Belum Login',
    loginToSync: 'Login untuk menyinkronkan data antar perangkat',
    loginDiscord: 'Login Discord',
    logout: 'Keluar',
    audioSection: 'Audio',
    defaultVolume: 'Volume Default',
    defaultVolumeDesc: 'Volume yang digunakan saat aplikasi pertama dibuka',
    audioQuality: 'Kualitas Audio',
    audioQualityDesc: 'Kualitas lebih tinggi membutuhkan lebih banyak data internet',
    qualityAuto: 'Otomatis (Direkomendasikan)',
    qualityHigh: 'Tinggi (Terbaik)',
    qualityMedium: 'Sedang (Hemat Data)',
    crossfadeLabel: 'Crossfade (Transisi Mulus)',
    crossfadeDesc: 'Hilangkan jeda antar lagu dengan efek fade in/out',
    crossfadeOff: 'Mati (Off)',
    crossfadeSec: 'Detik',
    displaySection: 'Tampilan',
    autoLyrics: 'Auto-tampilkan Lirik',
    autoLyricsDesc: 'Buka panel lirik otomatis saat lagu diputar',
    autoSidebar: 'Panel Kanan Otomatis Terbuka',
    autoSidebarDesc: 'Tampilkan Queue/Lirik panel saat aplikasi dibuka',
    languageSection: 'Bahasa / Language',
    languageLabel: 'Bahasa Aplikasi',
    languageDesc: 'Pilih bahasa yang ditampilkan di seluruh aplikasi',
    dataSection: 'Data',
    playHistory: 'Riwayat Putar',
    savedSongs: 'lagu tersimpan',
    clearHistory: 'Hapus Riwayat',
    playlistCount: 'playlist tersimpan',
    deleteAllPlaylists: 'Hapus Semua Playlist',
    appVersion: 'Versi Aplikasi',
    clearAudioCache: 'Hapus Cache Lagu Lokal',
    audioCacheDesc: 'Cache menyimpan lagu untuk memutar lebih cepat dan hemat kuota',

    // Toast
    toastLogout: 'Berhasil logout dan pemutaran dihentikan',
    hitsInt: 'Lagu-lagu Hits Internasional',
    hitsId: 'Lagu-lagu Hits Indonesia',
    hitsJp: 'Lagu-lagu Hits Jepang',
    hitsKr: 'Lagu-lagu Hits Korea',
    hitsLatin: 'Lagu-lagu Hits Latin',
    playSong: 'Putar Lagu',
    likeSong: 'Sukai',
    unlikeSong: 'Hapus dari Disukai',
    trendingLocal: 'Sedang Tren di',
    toastHistoryCleared: 'Riwayat dihapus.',
    toastPlaylistDeleted: 'Playlist dihapus.',
    toastPlaylistCreated: 'berhasil dibuat!',
    toastImportSuccess: 'berhasil diimpor!',
    toastAddedToPlaylist: 'Lagu ditambahkan ke playlist!',
    toastAlreadyInPlaylist: 'Lagu sudah ada di playlist ini.',
    toastLiked: 'Ditambahkan ke Disukai',
    toastUnliked: 'Dihapus dari Disukai',
    toastAddedToQueue: 'Ditambahkan ke antrean',
    toastPlayNext: 'Ditambahkan untuk diputar selanjutnya',
    toastWelcome: 'Selamat datang',
    toastDiscordError: 'Gagal mengambil data profil Discord.',
    toastSearchFail: 'Gagal terhubung ke server pencarian.',
    toastServerBlocked: 'Server utama diblokir. Mengalihkan ke server cadangan...',
    toastServerFallback: 'Terhubung ke server cadangan!',
    toastVideoLocked: 'Gagal: Video ini dikunci ketat oleh YouTube.',
    lyricsSearching: 'Sedang mencari lirik...',
    lyricsNotFound: 'Lirik tidak ditemukan.',
    lyricsNotLRC: 'Lirik tidak berformat LRC.',
    lyricsFailed: 'Gagal mengambil lirik.',
    toastCacheCleared: 'Cache lagu lokal berhasil dihapus!',
  },

  en: {
    // Login
    loginHeroSubtitle: 'Experience unlimited music streaming with an elegant interface, real-time synchronized lyrics, and the best audio quality.',
    loginWelcome: 'Welcome',
    loginWelcomeDesc: 'Login with your Discord account to start creating playlists and saving your favorite songs.',
    loginFeat1: 'High quality music streaming',
    loginFeat2: 'Real-time synchronized lyrics',
    loginFeat3: 'Manage your playlists freely',
    loginBtn: 'Login with Discord',
    // Nav / Sidebar
    home: 'Home',
    updateAvailable: 'Update Available',
    updateDownloading: 'Downloading Update...',
    updateReady: 'Update Ready. Click to Install',
    settings: 'Settings',
    yourLibrary: 'Your Library',
    liked: 'Liked',
    playlist: 'Playlist',
    guest: 'Guest',
    logoutDropdown: 'Logout',
    goToSettings: 'Go to Settings (Login)',

    // Status & Join
    statusOnline: 'Online',
    statusIdle: 'Idle',
    statusDnd: 'Do Not Disturb',
    askToJoin: 'Ask to Join',
    joinRequestSent: 'Request sent...',
    joinRequestRejected: 'Request rejected.',
    joinRequestReceived: 'wants to listen along!',
    accept: 'Accept',
    reject: 'Reject',
    joinDisabled: 'Cannot join',
    friendActivityTitle: 'Friend Activity',
    friendActivitySubtitle: 'Listen Along with friends',
    pendingRequests: 'PENDING REQUESTS',
    noFriendsOnline: 'No friends are currently online.',
    listenAlong: 'Listen Along',
    leaveParty: 'Leave Party',

    // Home Page
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    recentlyPlayed: 'Recently Played',
    recommendations: 'Recommended For You',
    playAll: 'Play All',
    viewAll: 'View All',
    showLess: 'Show Less',
    likedSongs: 'Liked Songs',
    noLikedSongs: 'No liked songs yet',
    noLikedDesc: 'Press the heart icon on a song to like it.',
    noHistory: 'No history yet',
    noHistoryDesc: 'Start playing songs to see your history here.',

    // Search
    searchPlaceholder: 'Search songs, artists, albums...',
    searchResultsFor: 'Results for',
    noResults: 'No results found.',

    // Library / Playlist
    myLibrary: 'My Library',
    createPlaylist: 'Create Playlist',
    noPlaylists: 'No Playlists Yet',
    noPlaylistsDesc: 'Create your first playlist now!',
    addSongs: 'Add Songs',
    songs: 'songs',
    song: 'song',
    duration: 'Duration',
    removeFromPlaylist: 'Remove from Playlist',
    playNext: 'Play Next',
    addToQueue: 'Add to Queue',
    addToPlaylist: 'Add to Playlist',
    deletePlaylist: 'Delete Playlist',
    confirmDeletePlaylist: 'Delete Playlist?',
    cannotUndo: 'This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Yes, Delete',
    editName: 'Edit Name',
    changeImage: 'Change Image',

    // Create Playlist Modal
    newPlaylistTitle: 'Create New Playlist',
    playlistNamePlaceholder: 'Playlist name...',
    coverOptional: 'Playlist Cover (Optional)',
    imageUrlPlaceholder: 'Image URL from the internet...',
    create: 'Create',
    back: 'Back',
    save: 'Save',
    importPlaylist: 'Import YouTube Playlist',
    importPlaylistPlaceholder: 'YouTube Playlist URL...',
    importing: 'Importing...',

    // Player
    nowPlaying: 'Now Playing',
    queue: 'Queue',
    clearQueue: 'Clear Queue',
    lyricsPanel: 'Lyrics',
    noLyrics: 'No lyrics available.',
    offsetLabel: 'Offset',
    lyricsOffset: 'Lyrics Sync (offset)',

    // Settings
    settingsTitle: 'Settings',
    accountSection: 'Account',
    notLoggedIn: 'Not Logged In',
    loginToSync: 'Login to sync data across devices',
    loginDiscord: 'Login with Discord',
    logout: 'Logout',
    audioSection: 'Audio',
    defaultVolume: 'Default Volume',
    defaultVolumeDesc: 'Volume used when the app first opens',
    audioQuality: 'Audio Quality',
    audioQualityDesc: 'Higher quality requires more internet data',
    qualityAuto: 'Auto (Recommended)',
    qualityHigh: 'High (Best)',
    qualityMedium: 'Medium (Data Saver)',
    crossfadeLabel: 'Crossfade (Smooth Transition)',
    crossfadeDesc: 'Eliminate silence between songs with a fade in/out effect',
    crossfadeOff: 'Off',
    crossfadeSec: 'Seconds',
    displaySection: 'Display',
    autoLyrics: 'Auto-show Lyrics',
    autoLyricsDesc: 'Automatically open lyrics panel when a song plays',
    autoSidebar: 'Auto-open Right Panel',
    autoSidebarDesc: 'Show Queue/Lyrics panel when app opens',
    languageSection: 'Language / 言語',
    languageLabel: 'App Language',
    languageDesc: 'Choose the language displayed throughout the app',
    dataSection: 'Data',
    playHistory: 'Play History',
    savedSongs: 'songs saved',
    clearHistory: 'Clear History',
    playlistCount: 'playlists saved',
    deleteAllPlaylists: 'Delete All Playlists',
    appVersion: 'App Version',
    clearAudioCache: 'Clear Local Audio Cache',
    audioCacheDesc: 'Cache saves songs for faster playback and data saving',

    // Toast
    toastLogout: 'Logged out and playback stopped',
    hitsInt: 'Global Pop Hits',
    hitsId: 'Indonesian Pop Hits',
    hitsJp: 'J-Pop Hits',
    hitsKr: 'K-Pop Hits',
    hitsLatin: 'Latin Pop Hits',
    playSong: 'Play Song',
    likeSong: 'Like',
    unlikeSong: 'Remove from Liked',
    trendingLocal: 'Trending in',
    toastHistoryCleared: 'History cleared.',
    toastPlaylistDeleted: 'Playlist deleted.',
    toastPlaylistCreated: 'created successfully!',
    toastImportSuccess: 'imported successfully!',
    toastAddedToPlaylist: 'Song added to playlist!',
    toastAlreadyInPlaylist: 'Song is already in this playlist.',
    toastLiked: 'Added to Liked Songs',
    toastUnliked: 'Removed from Liked Songs',
    toastAddedToQueue: 'Added to queue',
    toastPlayNext: 'Added to play next',
    toastWelcome: 'Welcome',
    toastDiscordError: 'Failed to fetch Discord profile.',
    toastSearchFail: 'Failed to connect to search server.',
    toastServerBlocked: 'Main server blocked. Switching to backup...',
    toastServerFallback: 'Connected to backup server!',
    toastVideoLocked: 'Failed: This video is restricted by YouTube.',
    lyricsSearching: 'Searching for lyrics...',
    lyricsNotFound: 'Lyrics not found.',
    lyricsNotLRC: 'Lyrics are not in LRC format.',
    lyricsFailed: 'Failed to fetch lyrics.',
    toastCacheCleared: 'Local audio cache cleared successfully!',
  },

  ja: {
    // Login
    loginHeroSubtitle: 'エレガントなインターフェース、リアルタイムの同期歌詞、最高のオーディオ品質で、無制限の音楽ストリーミングを体験してください。',
    loginWelcome: 'ようこそ',
    loginWelcomeDesc: 'Discordアカウントでログインして、プレイリストを作成し、お気に入りの曲を保存しましょう。',
    loginFeat1: '高品質な音楽ストリーミング',
    loginFeat2: 'リアルタイム同期歌詞',
    loginFeat3: 'プレイリストを自由に管理',
    loginBtn: 'Discordでログイン',
    // Nav / Sidebar
    home: 'ホーム',
    updateAvailable: 'アップデートが利用可能',
    updateDownloading: 'アップデートをダウンロード中...',
    updateReady: '準備完了。クリックしてインストール',
    settings: '設定',
    yourLibrary: 'マイライブラリ',
    liked: 'お気に入り',
    playlist: 'プレイリスト',
    guest: 'ゲスト',
    logoutDropdown: 'ログアウト',
    goToSettings: '設定へ（ログイン）',

    // Status & Join
    statusOnline: 'オンライン',
    statusIdle: '退席中',
    statusDnd: '取り込み中',
    askToJoin: '参加をリクエスト',
    joinRequestSent: 'リクエスト送信中...',
    joinRequestRejected: 'リクエストが拒否されました。',
    joinRequestReceived: 'さんが一緒に聴きたいと言っています！',
    accept: '承認',
    reject: '拒否',
    joinDisabled: '参加できません',
    friendActivityTitle: 'フレンドアクティビティ',
    friendActivitySubtitle: '友達と一緒に聴く',
    pendingRequests: '保留中のリクエスト',
    noFriendsOnline: '現在オンラインのフレンドはいません。',
    listenAlong: '一緒に聴く',
    leaveParty: '退出する',

    // Home Page
    goodMorning: 'おはようございます',
    goodAfternoon: 'こんにちは',
    goodEvening: 'こんばんは',
    recentlyPlayed: '最近再生した曲',
    recommendations: 'あなたへのおすすめ',
    playAll: 'すべて再生',
    viewAll: 'すべて表示',
    showLess: '閉じる',
    likedSongs: 'お気に入りの曲',
    noLikedSongs: 'お気に入りの曲がありません',
    noLikedDesc: '曲のハートアイコンを押してお気に入りに追加しましょう。',
    noHistory: '履歴がありません',
    noHistoryDesc: '曲を再生すると、ここに履歴が表示されます。',

    // Search
    searchPlaceholder: '曲・アーティスト・アルバムを検索...',
    searchResultsFor: '検索結果：',
    noResults: '結果が見つかりませんでした。',

    // Library / Playlist
    myLibrary: 'マイライブラリ',
    createPlaylist: 'プレイリストを作成',
    noPlaylists: 'プレイリストがありません',
    noPlaylistsDesc: '最初のプレイリストを作成しましょう！',
    addSongs: '曲を追加',
    songs: '曲',
    song: '曲',
    duration: '再生時間',
    removeFromPlaylist: 'プレイリストから削除',
    playNext: '次に再生',
    addToQueue: 'キューに追加',
    addToPlaylist: 'プレイリストに追加',
    deletePlaylist: 'プレイリストを削除',
    confirmDeletePlaylist: 'プレイリストを削除しますか？',
    cannotUndo: 'この操作は元に戻せません。',
    cancel: 'キャンセル',
    delete: '削除する',
    editName: '名前を編集',
    changeImage: '画像を変更',

    // Create Playlist Modal
    newPlaylistTitle: '新しいプレイリストを作成',
    playlistNamePlaceholder: 'プレイリスト名...',
    coverOptional: 'カバー画像（任意）',
    imageUrlPlaceholder: 'インターネットの画像URL...',
    create: '作成',
    back: '戻る',
    save: '保存',
    importPlaylist: 'YouTubeプレイリストをインポート',
    importPlaylistPlaceholder: 'YouTubeプレイリストのURL...',
    importing: 'インポート中...',

    // Player
    nowPlaying: '再生中',
    queue: 'キュー',
    clearQueue: 'キューをクリア',
    lyricsPanel: '歌詞',
    noLyrics: '歌詞はありません。',
    offsetLabel: 'オフセット',
    lyricsOffset: '歌詞の同期（オフセット）',

    // Settings
    settingsTitle: '設定',
    accountSection: 'アカウント',
    notLoggedIn: '未ログイン',
    loginToSync: 'デバイス間でデータを同期するにはログインしてください',
    loginDiscord: 'Discordでログイン',
    logout: 'ログアウト',
    audioSection: 'オーディオ',
    defaultVolume: 'デフォルト音量',
    defaultVolumeDesc: 'アプリを起動したときの音量',
    audioQuality: '音質',
    audioQualityDesc: '高品質なほど多くのデータ通信を必要とします',
    qualityAuto: '自動（推奨）',
    qualityHigh: '高音質（最高）',
    qualityMedium: '標準（データ節約）',
    crossfadeLabel: 'クロスフェード (滑らかな移行)',
    crossfadeDesc: '曲間の無音をフェードイン/アウトでなくす',
    crossfadeOff: 'オフ',
    crossfadeSec: '秒',
    displaySection: '表示',
    autoLyrics: '歌詞を自動表示',
    autoLyricsDesc: '曲の再生時に歌詞パネルを自動で開く',
    autoSidebar: '右パネルを自動で開く',
    autoSidebarDesc: 'アプリ起動時にキュー/歌詞パネルを表示する',
    languageSection: '言語 / Language',
    languageLabel: 'アプリの言語',
    languageDesc: 'アプリ全体で表示する言語を選択してください',
    dataSection: 'データ',
    playHistory: '再生履歴',
    savedSongs: '曲が保存されています',
    clearHistory: '履歴を削除',
    playlistCount: 'プレイリストが保存されています',
    deleteAllPlaylists: 'すべてのプレイリストを削除',
    appVersion: 'アプリバージョン',
    clearAudioCache: 'ローカルオーディオキャッシュをクリア',
    audioCacheDesc: 'キャッシュは曲を保存して、より高速に再生し、データを節約します',

    // Toast
    toastLogout: 'ログアウトして再生を停止しました',
    hitsInt: 'グローバル・ヒット',
    hitsId: 'インドネシア・ヒット',
    hitsJp: 'J-Pop ヒット',
    hitsKr: 'K-Popトップ',
    hitsLatin: 'ラテン・ヒット',
    playSong: '曲を再生',
    likeSong: 'お気に入り',
    unlikeSong: 'お気に入りから削除',
    trendingLocal: 'トレンド:',
    toastHistoryCleared: '履歴を削除しました。',
    toastPlaylistDeleted: 'プレイリストを削除しました。',
    toastPlaylistCreated: 'を作成しました！',
    toastImportSuccess: 'を正常にインポートしました！',
    toastAddedToPlaylist: 'プレイリストに追加しました！',
    toastAlreadyInPlaylist: 'この曲はすでにプレイリストに含まれています。',
    toastLiked: 'お気に入りに追加しました',
    toastUnliked: 'お気に入りから削除しました',
    toastAddedToQueue: 'キューに追加しました',
    toastPlayNext: '次に再生に追加しました',
    toastWelcome: 'ようこそ',
    toastDiscordError: 'Discordプロフィールの取得に失敗しました。',
    toastSearchFail: '検索サーバーに接続できませんでした。',
    toastServerBlocked: 'メインサーバーがブロックされています。バックアップに切り替え中...',
    toastServerFallback: 'バックアップサーバーに接続しました！',
    toastVideoLocked: 'エラー：この動画はYouTubeによって制限されています。',
    lyricsSearching: '歌詞を検索中...',
    lyricsNotFound: '歌詞が見つかりません。',
    lyricsNotLRC: 'LRC形式の歌詞ではありません。',
    lyricsFailed: '歌詞の取得に失敗しました。',
    toastCacheCleared: 'ローカルオーディオキャッシュが正常にクリアされました！',
  },
};

export function createTranslator(lang: Language) {
  return function t(key: keyof TranslationKeys): string {
    return translations[lang][key] ?? translations['id'][key] ?? key;
  };
}
