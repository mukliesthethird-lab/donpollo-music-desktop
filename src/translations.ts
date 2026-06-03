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

  // Toast
  toastLogout: string;
  hitsInt: string;
  hitsId: string;
  hitsJp: string;
  hitsKr: string;
  hitsLatin: string;
  trendingLocal: string;
  toastHistoryCleared: string;
  toastPlaylistDeleted: string;
  toastPlaylistCreated: string;
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
    audioQualityDesc: 'Preferensi kualitas stream dari YouTube',
    qualityAuto: 'Auto (Direkomendasikan)',
    qualityHigh: 'Tinggi (160kbps)',
    qualityMedium: 'Sedang (128kbps)',
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

    // Toast
    toastLogout: 'Berhasil logout dan pemutaran dihentikan',
    hitsInt: 'Lagu-lagu Hits Internasional',
    hitsId: 'Lagu-lagu Hits Indonesia',
    hitsJp: 'Lagu-lagu Hits Jepang',
    hitsKr: 'Lagu-lagu Hits Korea',
    hitsLatin: 'Lagu-lagu Hits Latin',
    trendingLocal: 'Sedang Tren di',
    toastHistoryCleared: 'Riwayat dihapus.',
    toastPlaylistDeleted: 'Playlist dihapus.',
    toastPlaylistCreated: 'berhasil dibuat!',
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
    audioQualityDesc: 'Preferred stream quality from YouTube',
    qualityAuto: 'Auto (Recommended)',
    qualityHigh: 'High (160kbps)',
    qualityMedium: 'Medium (128kbps)',
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

    // Toast
    toastLogout: 'Logged out and playback stopped',
    hitsInt: 'Global Pop Hits',
    hitsId: 'Indonesian Pop Hits',
    hitsJp: 'J-Pop Hits',
    hitsKr: 'K-Pop Hits',
    hitsLatin: 'Latin Pop Hits',
    trendingLocal: 'Trending in',
    toastHistoryCleared: 'History cleared.',
    toastPlaylistDeleted: 'Playlist deleted.',
    toastPlaylistCreated: 'created successfully!',
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
    audioQualityDesc: 'YouTubeのストリーム品質の設定',
    qualityAuto: '自動（推奨）',
    qualityHigh: '高品質（160kbps）',
    qualityMedium: '中品質（128kbps）',
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

    // Toast
    toastLogout: 'ログアウトして再生を停止しました',
    hitsInt: 'グローバル・ヒット',
    hitsId: 'インドネシア・ヒット',
    hitsJp: 'J-Pop ヒット',
    hitsKr: 'K-Pop ヒット',
    hitsLatin: 'ラテン・ヒット',
    trendingLocal: 'トレンド:',
    toastHistoryCleared: '履歴を削除しました。',
    toastPlaylistDeleted: 'プレイリストを削除しました。',
    toastPlaylistCreated: 'を作成しました！',
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
  },
};

export function createTranslator(lang: Language) {
  return function t(key: keyof TranslationKeys): string {
    return translations[lang][key] ?? translations['id'][key] ?? key;
  };
}
