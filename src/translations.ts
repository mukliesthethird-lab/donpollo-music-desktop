export type Language = 'id' | 'en' | 'ja' | 'ko';

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
  friends: string;
  pendingFriendRequest: string;

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
  seeAllSongsBy: string;
  artistPage: string;
  filterPopular: string;
  filterNewest: string;
  loadingSongs: string;

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
  downloadSong: string;
  toastDownloadStarted: string;
  toastDownloadComplete: string;
  downloadDesktopOnly: string;

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

  // Profile Stats
  profileStats: string;
  statsSubtitle: string;
  totalSongsPlayed: string;
  listeningTime: string;
  listeningTimeHours: string;
  listeningTimeMins: string;
  topArtist: string;
  noneYet: string;
  songsLikedStat: string;
  playlistsCreated: string;
  songsDownloaded: string;
  memberSince: string;
  rightClickForStatus: string;

  // Player
  nowPlaying: string;
  queue: string;
  emptyQueue: string;
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
  themeDisplay: string;
  themeDefault: string;
  themeDefaultDesc: string;
  themeMinimalist: string;
  themeMinimalistDesc: string;
  themeCustom: string;
  themeCustomDesc: string;
  dynamicBackground: string;
  dynamicBackgroundDesc: string;
  accentColor: string;
  bgImageUrl: string;
  advCustomTitle: string;
  bgMain: string;
  bgSidebar: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  layoutOrientation: string;
  layoutLeft: string;
  layoutRight: string;
  fontFamily: string;
  fontInter: string;
  fontRoboto: string;
  fontOutfit: string;
  fontMono: string;
  shapeStyle: string;
  shapeRounded: string;
  shapeSharp: string;
  shapePill: string;
  dataSection: string;
  playHistory: string;
  savedSongs: string;
  clearHistory: string;
  playlistCount: string;
  deleteAllPlaylists: string;
  appVersion: string;
  clearAudioCache: string;
  confirmClearCache: string;
  audioCacheDesc: string;
  manualUpdateCheck: string;
  manualUpdateDesc: string;
  checkingUpdate: string;
  alreadyLatest: string;
  noPublishedVersions: string;
  downloads: string;
  offlineMode: string;
  noDownloads: string;
  noDownloadsDesc: string;
  miniPlayer: string;
  closeToTray: string;
  closeToTrayDesc: string;
  shortcutsTitle: string;
  shortcutPlayPause: string;
  shortcutNext: string;
  shortcutPrev: string;
  equalizer: string;
  eqEnabled: string;
  eqEnabledDesc: string;
  eqPresetCustom: string;
  eqPresetDefault: string;
  eqPresetBassBooster: string;
  eqPresetPop: string;
  eqPresetElectronic: string;
  eqPresetAcoustic: string;

  // Audio Cache Mode
  cacheModeLabel: string;
  cacheModeDesc: string;
  cacheModeSmartCache: string;
  cacheModeSmartCacheDesc: string;
  cacheModeStream: string;
  cacheModeStreamDesc: string;
  cacheModeTemp: string;
  cacheModeTempDesc: string;

  // Player Tooltips
  btnShuffle: string;
  btnPrevious: string;
  btnPlay: string;
  btnPause: string;
  btnNext: string;
  btnLoop: string;
  btnLike: string;
  btnUnlike: string;
  btnVolume: string;
  btnMute: string;
  btnFullscreen: string;
  btnExitFullscreen: string;
  btnSidebar: string;
  btnHideSidebar: string;
  myProfile: string;
  followers: string;
  following: string;
  publicPlaylists: string;
  privacySettings: string;
  isPrivate: string;
  isPublic: string;
  saveToLibrary: string;
  removeFromLibrary: string;
  toastPlaylistSaved: string;
  toastPlaylistRemoved: string;
  topTracks: string;
  savedToLibrary: string;
  noLikedSongsYet: string;
  topListener: string;
  confirmRemovePlaylist: string;

  // Update section (available)
  updateSectionTitle: string;
  appUpdateSectionTitle: string;
  updateAvailableMsg: string;
  updateReadyMsg: string;
  downloadingUpdateMsg: string;
  downloadNow: string;
  restartApp: string;

  // Offline Vault & Library hardcoded strings
  offlineVault: string;
  songsAvailable: string;
  playlists: string;
  myPersonalCollection: string;
  favoriteCollectionDesc: string;
  recentPlaybackDesc: string;
  localCollection: string;
  availableOffline: string;
  storage: string;
  totalStorageUsed: string;
  listenUnlimited: string;
  listenUnlimitedDesc: string;
  offlineDownloads: string;
  songDetail: string;
  addSongToPlaylistLabel: string;
  personalCollectionDesc: string;

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
  toastRemovedFromPlaylist: string;
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
  trayPlay: string;
  trayPause: string;
  trayNext: string;
  trayPrev: string;
  trayShow: string;
  trayQuit: string;

  // Podcast
  podcast: string;
  music: string;
  topPodcasts: string;
  podcastByHost: string;
  podcastLinking: string;
  searchPodcastPlaceholder: string;
  podcastNotFoundYt: string;
  profile: string;
  editBanner: string;
  browsing: string;
  enterBannerUrl: string;

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
    friends: 'Teman',
    pendingFriendRequest: 'permintaan pertemanan tertunda',

    // Profile Stats
    profileStats: 'Statistik Profil',
    statsSubtitle: 'Ringkasan aktivitas mendengarkan kamu',
    totalSongsPlayed: 'Lagu Diputar',
    listeningTime: 'Waktu Mendengarkan',
    listeningTimeHours: 'jam',
    listeningTimeMins: 'menit',
    topArtist: 'Artis Favorit',
    noneYet: 'Belum ada',
    songsLikedStat: 'Lagu Disukai',
    playlistsCreated: 'Playlist Dibuat',
    songsDownloaded: 'Lagu Diunduh',
    memberSince: 'Bergabung',
    rightClickForStatus: 'Klik kanan untuk ubah status',

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
    seeAllSongsBy: 'Lihat semua lagu dari',
    artistPage: 'Halaman Artis',
    filterPopular: 'Terpopuler',
    filterNewest: 'Terbaru',
    loadingSongs: 'Memuat lagu...',

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
    downloadSong: 'Download Lagu',
    toastDownloadStarted: 'Mendownload',
    toastDownloadComplete: 'Download telah selesai',
    downloadDesktopOnly: 'Download hanya tersedia di Desktop App',

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
    emptyQueue: 'Tidak ada musik dalam antrian',
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
    themeDisplay: 'Tema Tampilan',
    themeDefault: 'Default',
    themeDefaultDesc: 'Klasik',
    themeMinimalist: 'Minimalis',
    themeMinimalistDesc: 'Bersih & Kompak',
    themeCustom: 'Kustom',
    themeCustomDesc: 'Gunakan warna & gambar sendiri',
    dynamicBackground: 'Latar Belakang Dinamis',
    dynamicBackgroundDesc: 'Latar beradaptasi dengan warna dominan dari sampul album',
    accentColor: 'Warna Aksen',
    bgImageUrl: 'URL Gambar Latar',
    advCustomTitle: 'Kustomisasi Lanjutan',
    bgMain: 'Latar Utama',
    bgSidebar: 'Latar Sidebar',
    bgCard: 'Latar Kartu',
    textPrimary: 'Teks Utama',
    textSecondary: 'Teks Sekunder',
    layoutOrientation: 'Orientasi Tata Letak',
    layoutLeft: 'Sidebar Kiri (Default)',
    layoutRight: 'Sidebar Kanan',
    fontFamily: 'Gaya Huruf (Font)',
    fontInter: 'Inter (Default)',
    fontRoboto: 'Roboto',
    fontOutfit: 'Outfit',
    fontMono: 'Monospace',
    shapeStyle: 'Gaya Sudut (Bentuk)',
    shapeRounded: 'Membulat (Default)',
    shapeSharp: 'Kaku (Kotak)',
    shapePill: 'Pill (Sangat Membulat)',
    dataSection: 'Data',
    playHistory: 'Riwayat Putar',
    savedSongs: 'lagu tersimpan',
    clearHistory: 'Hapus Riwayat',
    playlistCount: 'playlist tersimpan',
    deleteAllPlaylists: 'Hapus Semua Playlist',
    appVersion: 'Versi Aplikasi',
    clearAudioCache: 'Hapus Cache Lagu Lokal',
    confirmClearCache: 'Apakah Anda yakin ingin menghapus semua cache lagu? Ini tidak bisa dikembalikan.',
    audioCacheDesc: 'Cache menyimpan lagu untuk memutar lebih cepat dan hemat kuota',
    manualUpdateCheck: 'Cek Pembaruan Manual',
    manualUpdateDesc: 'Periksa apakah ada versi baru Don Pollo Music yang tersedia.',
    checkingUpdate: 'Mengecek pembaruan...',
    alreadyLatest: 'Anda menggunakan versi terbaru.',
    noPublishedVersions: 'Belum ada rilis versi terbaru.',
    downloads: 'Unduhan',
    offlineMode: 'Mode Offline',
    noDownloads: 'Belum ada unduhan',
    noDownloadsDesc: 'Lagu yang selesai diputar akan di-cache dan muncul di sini.',
    miniPlayer: 'Mini Player',
    closeToTray: 'Minimize ke Tray',
    closeToTrayDesc: 'Minimize aplikasi ke system tray saat ditutup',
    shortcutsTitle: 'Keyboard Shortcuts Global',
    shortcutPlayPause: 'Play / Pause (Media Key)',
    shortcutNext: 'Next Track (Media Key)',
    shortcutPrev: 'Previous Track (Media Key)',
    equalizer: 'Equalizer',
    eqEnabled: 'Aktifkan Equalizer',
    eqEnabledDesc: 'Aktifkan efek Equalizer pada pemutaran audio',
    eqPresetCustom: 'Kustom',
    eqPresetDefault: 'Default (Datar)',
    eqPresetBassBooster: 'Perkuat Bass',
    eqPresetPop: 'Pop',
    eqPresetElectronic: 'Elektronik',
    eqPresetAcoustic: 'Akustik',

    // Audio Cache Mode
    cacheModeLabel: 'Mode Cache Audio',
    cacheModeDesc: 'Pilih cara aplikasi mengelola file audio saat pemutaran',
    cacheModeSmartCache: 'Smart Cache',
    cacheModeSmartCacheDesc: 'Unduh & simpan permanen. Replay instan, tanpa buffering',
    cacheModeStream: 'Streaming',
    cacheModeStreamDesc: 'Putar langsung tanpa menyimpan file. Hemat storage, butuh koneksi stabil',
    cacheModeTemp: 'Cache Sementara',
    cacheModeTempDesc: 'Unduh untuk kualitas terbaik, hapus otomatis saat lagu berganti',

    // Player Tooltips
    btnShuffle: 'Acak',
    btnPrevious: 'Sebelumnya',
    btnPlay: 'Putar',
    btnPause: 'Jeda',
    btnNext: 'Selanjutnya',
    btnLoop: 'Ulangi',
    btnLike: 'Suka',
    btnUnlike: 'Hapus Suka',
    btnVolume: 'Volume',
    btnMute: 'Bisukan',
    btnFullscreen: 'Layar Penuh',
    btnExitFullscreen: 'Keluar Layar Penuh',
    btnSidebar: 'Tampilkan Sidebar',
    btnHideSidebar: 'Sembunyikan Sidebar',
    myProfile: 'Profil Saya',
    followers: 'Rep',
    following: 'Reputasi Diberikan',
    publicPlaylists: 'Playlist Publik',
    privacySettings: 'Pengaturan Privasi',
    isPrivate: 'Privat',
    isPublic: 'Publik',
    saveToLibrary: 'Simpan ke Pustaka',
    removeFromLibrary: 'Hapus dari Pustaka',
    toastPlaylistSaved: 'Mantap! Playlist berhasil diamankan ke Pustakamu.',
    toastPlaylistRemoved: 'Playlist telah dihapus dari Pustaka.',
    topTracks: 'Lagu Teratas',
    savedToLibrary: 'Disimpan ke Pustaka',
    noLikedSongsYet: 'Belum ada lagu yang disukai.',
    topListener: 'Pendengar Top {percent}%',
    confirmRemovePlaylist: 'Apakah Anda yakin ingin menghapus playlist ini dari pustaka Anda?',

    // Update section (available)
    updateSectionTitle: 'Pembaruan Tersedia',
    appUpdateSectionTitle: 'Pembaruan Aplikasi',
    updateAvailableMsg: 'Versi terbaru Don Pollo Music telah tersedia.',
    updateReadyMsg: 'Pembaruan selesai diunduh dan siap dipasang!',
    downloadingUpdateMsg: 'Mengunduh pembaruan...',
    downloadNow: 'Unduh Sekarang',
    restartApp: 'Mulai Ulang Aplikasi',

    // Offline Vault & Library
    offlineVault: 'Offline Vault',
    songsAvailable: 'Lagu Tersedia',
    playlists: 'Playlist',
    myPersonalCollection: 'Koleksi Pribadi\nAnda',
    favoriteCollectionDesc: 'Koleksi favorit Anda',
    recentPlaybackDesc: 'Riwayat putar terakhir',
    localCollection: 'Koleksi Lokal',
    availableOffline: 'Tersedia tanpa internet',
    storage: 'Penyimpanan',
    totalStorageUsed: 'Total kapasitas terpakai',
    listenUnlimited: 'Dengarkan\nTanpa Batas',
    listenUnlimitedDesc: 'Musik Anda selalu bersama Anda, di mana saja kapan saja.',
    offlineDownloads: 'Unduhan Offline',
    songDetail: 'Detail Lagu',
    addSongToPlaylistLabel: 'Tambahkan lagu ke playlist ini',
    personalCollectionDesc: 'Semua lagu yang Anda putar dan sukai, tersimpan aman di sini.',

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
    toastRemovedFromPlaylist: 'Lagu dihapus dari playlist!',
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
    trayPlay: 'Putar',
    trayPause: 'Jeda',
    trayNext: 'Lagu Selanjutnya',
    trayPrev: 'Lagu Sebelumnya',
    trayShow: 'Tampilkan Aplikasi',
    trayQuit: 'Keluar',

    // Podcast
    podcast: 'Podcast',
    music: 'Musik',
    topPodcasts: 'Podcast Populer',
    podcastByHost: 'oleh',
    podcastLinking: 'Mencari episode di YouTube...',
    searchPodcastPlaceholder: 'Cari podcast, host, topik...',
    podcastNotFoundYt: 'Tidak ditemukan di YouTube',
    profile: 'Profil',
    editBanner: 'Edit Banner',
    browsing: 'Mencari Lagu...',
    enterBannerUrl: 'Masukkan URL Banner (biarkan kosong untuk menghapus):'

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
    friends: 'Friends',
    pendingFriendRequest: 'pending friend request',

    // Profile Stats
    profileStats: 'Profile Stats',
    statsSubtitle: 'Your listening activity summary',
    totalSongsPlayed: 'Songs Played',
    listeningTime: 'Listening Time',
    listeningTimeHours: 'hrs',
    listeningTimeMins: 'min',
    topArtist: 'Top Artist',
    noneYet: 'None yet',
    songsLikedStat: 'Songs Liked',
    playlistsCreated: 'Playlists Created',
    songsDownloaded: 'Songs Downloaded',
    memberSince: 'Member Since',
    rightClickForStatus: 'Right-click to change status',

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
    seeAllSongsBy: 'See all songs by',
    artistPage: 'Artist Page',
    filterPopular: 'Popular',
    filterNewest: 'Newest',
    loadingSongs: 'Loading songs...',

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
    downloadSong: 'Download Song',
    toastDownloadStarted: 'Downloading',
    toastDownloadComplete: 'Download completed',
    downloadDesktopOnly: 'Download is only available on Desktop App',

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
    emptyQueue: 'No music in queue',
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
    themeDisplay: 'Display Theme',
    themeDefault: 'Default',
    themeDefaultDesc: 'Classic',
    themeMinimalist: 'Minimalist',
    themeMinimalistDesc: 'Clean & Compact',
    themeCustom: 'Custom',
    themeCustomDesc: 'Use your own colors & image',
    dynamicBackground: 'Dynamic Background',
    dynamicBackgroundDesc: 'Background adapts to the dominant color of the album cover',
    accentColor: 'Accent Color',
    bgImageUrl: 'Background Image URL',
    advCustomTitle: 'Advanced Customization',
    bgMain: 'Main Background',
    bgSidebar: 'Sidebar Background',
    bgCard: 'Card Background',
    textPrimary: 'Primary Text',
    textSecondary: 'Secondary Text',
    layoutOrientation: 'Layout Orientation',
    layoutLeft: 'Left Sidebar (Default)',
    layoutRight: 'Right Sidebar',
    fontFamily: 'Font Family',
    fontInter: 'Inter (Default)',
    fontRoboto: 'Roboto',
    fontOutfit: 'Outfit',
    fontMono: 'Monospace',
    shapeStyle: 'Corner Shape',
    shapeRounded: 'Rounded (Default)',
    shapeSharp: 'Sharp',
    shapePill: 'Pill',
    dataSection: 'Data',
    playHistory: 'Play History',
    savedSongs: 'songs saved',
    clearHistory: 'Clear History',
    playlistCount: 'playlists saved',
    deleteAllPlaylists: 'Delete All Playlists',
    appVersion: 'App Version',
    clearAudioCache: 'Clear Local Audio Cache',
    confirmClearCache: 'Are you sure you want to clear the audio cache? This cannot be undone.',
    audioCacheDesc: 'Cache saves songs for faster playback and data saving',
    manualUpdateCheck: 'Manual Update Check',
    manualUpdateDesc: 'Check if a new version of Don Pollo Music is available.',
    checkingUpdate: 'Checking for updates...',
    alreadyLatest: 'You are using the latest version.',
    noPublishedVersions: 'No published versions available yet.',
    downloads: 'Downloads',
    offlineMode: 'Offline Mode',
    noDownloads: 'No downloads yet',
    noDownloadsDesc: 'Songs you cache will appear here.',
    miniPlayer: 'Mini Player',
    closeToTray: 'Close to Tray',
    closeToTrayDesc: 'Minimize app to system tray when closed',
    shortcutsTitle: 'Global Keyboard Shortcuts',
    shortcutPlayPause: 'Play / Pause (Media Key)',
    shortcutNext: 'Next Track (Media Key)',
    shortcutPrev: 'Previous Track (Media Key)',
    equalizer: 'Equalizer',
    eqEnabled: 'Enable Equalizer',
    eqEnabledDesc: 'Enable Equalizer effect on audio playback',
    eqPresetCustom: 'Custom',
    eqPresetDefault: 'Default (Flat)',
    eqPresetBassBooster: 'Bass Booster',
    eqPresetPop: 'Pop',
    eqPresetElectronic: 'Electronic',
    eqPresetAcoustic: 'Acoustic',

    // Audio Cache Mode
    cacheModeLabel: 'Audio Cache Mode',
    cacheModeDesc: 'Choose how the app handles audio files during playback',
    cacheModeSmartCache: 'Smart Cache',
    cacheModeSmartCacheDesc: 'Download & keep permanently. Instant replay, no buffering',
    cacheModeStream: 'Streaming',
    cacheModeStreamDesc: 'Play directly without saving files. Saves storage, needs stable connection',
    cacheModeTemp: 'Temp Cache',
    cacheModeTempDesc: 'Download for best quality, auto-delete when song changes',

    // Player Tooltips
    btnShuffle: 'Shuffle',
    btnPrevious: 'Previous',
    btnPlay: 'Play',
    btnPause: 'Pause',
    btnNext: 'Next',
    btnLoop: 'Loop',
    btnLike: 'Like',
    btnUnlike: 'Unlike',
    btnVolume: 'Volume',
    btnMute: 'Mute',
    btnFullscreen: 'Full Screen',
    btnExitFullscreen: 'Exit Full Screen',
    btnSidebar: 'Show Sidebar',
    btnHideSidebar: 'Hide Sidebar',
    myProfile: 'My Profile',
    followers: 'Rep',
    following: 'Given Rep',
    publicPlaylists: 'Public Playlists',
    privacySettings: 'Privacy Settings',
    isPrivate: 'Private',
    isPublic: 'Public',
    saveToLibrary: 'Save to Library',
    removeFromLibrary: 'Remove from Library',
    toastPlaylistSaved: 'Awesome! Playlist saved to your Library.',
    toastPlaylistRemoved: 'Playlist removed from your Library.',
    topTracks: 'Top Tracks',
    savedToLibrary: 'Saved to Library',
    noLikedSongsYet: 'No liked songs yet.',
    topListener: 'Top {percent}% Listener',
    confirmRemovePlaylist: 'Are you sure you want to remove this playlist from your library?',

    // Update section (available)
    updateSectionTitle: 'Update Available',
    appUpdateSectionTitle: 'App Update',
    updateAvailableMsg: 'A new version of Don Pollo Music is now available.',
    updateReadyMsg: 'Update downloaded and ready to install!',
    downloadingUpdateMsg: 'Downloading update...',
    downloadNow: 'Download Now',
    restartApp: 'Restart App',

    // Offline Vault & Library
    offlineVault: 'Offline Vault',
    songsAvailable: 'Songs Available',
    playlists: 'Playlists',
    myPersonalCollection: 'Your Personal\nCollection',
    favoriteCollectionDesc: 'Your favorite collection',
    recentPlaybackDesc: 'Recent playback history',
    localCollection: 'Local Collection',
    availableOffline: 'Available offline',
    storage: 'Storage',
    totalStorageUsed: 'Total storage used',
    listenUnlimited: 'Listen\nUnlimited',
    listenUnlimitedDesc: 'Your music is always with you, anywhere anytime.',
    offlineDownloads: 'Offline Downloads',
    songDetail: 'Song Detail',
    addSongToPlaylistLabel: 'Add songs to this playlist',
    personalCollectionDesc: 'All songs you have played and liked, safely stored here.',

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
    toastRemovedFromPlaylist: 'Song removed from playlist!',
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
    trayPlay: 'Play',
    trayPause: 'Pause',
    trayNext: 'Next Track',
    trayPrev: 'Previous Track',
    trayShow: 'Show App',
    trayQuit: 'Quit',

    // Podcast
    podcast: 'Podcast',
    music: 'Music',
    topPodcasts: 'Top Podcasts',
    podcastByHost: 'by',
    podcastLinking: 'Finding episode on YouTube...',
    searchPodcastPlaceholder: 'Search podcasts, hosts, topics...',
    podcastNotFoundYt: 'Not found on YouTube',
    profile: 'Profile',
    editBanner: 'Edit Banner',
    browsing: 'Browsing...',
    enterBannerUrl: 'Enter Banner URL (leave empty to remove):'

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
    friends: 'フレンド',
    pendingFriendRequest: '件の保留中のフレンドリクエスト',

    // Profile Stats
    profileStats: 'プロフィール統計',
    statsSubtitle: '再生アクティビティのまとめ',
    totalSongsPlayed: '再生した曲数',
    listeningTime: '再生時間',
    listeningTimeHours: '時間',
    listeningTimeMins: '分',
    topArtist: 'よく聴くアーティスト',
    noneYet: 'まだなし',
    songsLikedStat: 'お気に入り曲数',
    playlistsCreated: '作成したプレイリスト',
    songsDownloaded: 'ダウンロード済みの曲',
    memberSince: 'メンバー登録日',
    rightClickForStatus: '右クリックでステータス変更',

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
    seeAllSongsBy: 'のすべての曲を見る',
    artistPage: 'アーティストページ',
    filterPopular: '人気',
    filterNewest: '最新',
    loadingSongs: '曲を読み込み中...',

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
    downloadSong: '曲をダウンロード',
    toastDownloadStarted: 'ダウンロード中',
    toastDownloadComplete: 'ダウンロードが完了しました',
    downloadDesktopOnly: 'ダウンロードはデスクトップアプリでのみ利用可能です',

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
    emptyQueue: 'キューに音楽がありません',
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
    themeDisplay: 'テーマ表示',
    themeDefault: 'デフォルト',
    themeDefaultDesc: 'クラシック',
    themeMinimalist: 'ミニマリスト',
    themeMinimalistDesc: 'クリーン＆コンパクト',
    themeCustom: 'カスタム',
    themeCustomDesc: '独自の色と画像を使用',
    dynamicBackground: 'ダイナミックバックグラウンド',
    dynamicBackgroundDesc: '背景がアルバムカバーの主な色に自動調整されます',
    accentColor: 'アクセントカラー',
    bgImageUrl: '背景画像URL',
    advCustomTitle: '高度なカスタマイズ',
    bgMain: 'メイン背景',
    bgSidebar: 'サイドバー背景',
    bgCard: 'カード背景',
    textPrimary: 'プライマリテキスト',
    textSecondary: 'セカンダリテキスト',
    layoutOrientation: 'レイアウトの向き',
    layoutLeft: '左サイドバー (デフォルト)',
    layoutRight: '右サイドバー',
    fontFamily: 'フォントファミリー',
    fontInter: 'Inter (デフォルト)',
    fontRoboto: 'Roboto',
    fontOutfit: 'Outfit',
    fontMono: 'Monospace',
    shapeStyle: '角の形状',
    shapeRounded: '丸み (デフォルト)',
    shapeSharp: 'シャープ',
    shapePill: 'ピル',
    dataSection: 'データ',
    playHistory: '再生履歴',
    savedSongs: '曲が保存されています',
    clearHistory: '履歴を削除',
    playlistCount: 'プレイリストが保存されています',
    deleteAllPlaylists: 'すべてのプレイリストを削除',
    appVersion: 'アプリバージョン',
    clearAudioCache: 'ローカルオーディオキャッシュをクリア',
    confirmClearCache: '本当にオーディオキャッシュをクリアしますか？この操作は元に戻せません。',
    audioCacheDesc: 'キャッシュは曲を保存して、より高速に再生し、データを節約します',
    manualUpdateCheck: '手動アップデート確認',
    manualUpdateDesc: '新しいバージョンのDon Pollo Musicが利用可能か確認します。',
    checkingUpdate: 'アップデートを確認中...',
    alreadyLatest: '最新バージョンを使用しています。',
    noPublishedVersions: '公開されている新しいバージョンはありません。',
    downloads: 'ダウンロード',
    offlineMode: 'オフラインモード',
    noDownloads: 'ダウンロードがありません',
    noDownloadsDesc: 'キャッシュした曲はここに表示されます。',
    miniPlayer: 'ミニプレーヤー',
    closeToTray: 'トレイに閉じる',
    closeToTrayDesc: '閉じたときにアプリをシステムトレイに最小化する',
    shortcutsTitle: 'キーボードショートカット',
    shortcutPlayPause: '再生 / 一時停止 (Media Key)',
    shortcutNext: '次の曲 (Media Key)',
    shortcutPrev: '前の曲 (Media Key)',
    equalizer: 'イコライザー',
    eqEnabled: 'イコライザーを有効にする',
    eqEnabledDesc: 'オーディオ再生にイコライザー効果を適用する',
    eqPresetCustom: 'カスタム',
    eqPresetDefault: 'デフォルト（フラット）',
    eqPresetBassBooster: 'バスブースター',
    eqPresetPop: 'ポップ',
    eqPresetElectronic: 'エレクトロニック',
    eqPresetAcoustic: 'アコースティック',

    // Audio Cache Mode
    cacheModeLabel: 'オーディオキャッシュモード',
    cacheModeDesc: '再生中のオーディオファイルの処理方法を選択します',
    cacheModeSmartCache: 'スマートキャッシュ',
    cacheModeSmartCacheDesc: 'ダウンロードして永続的に保存。バッファリングなしですぐに再生',
    cacheModeStream: 'ストリーミング',
    cacheModeStreamDesc: 'ファイルを保存せずに直接再生。ストレージを節約、安定した接続が必要',
    cacheModeTemp: '一時キャッシュ',
    cacheModeTempDesc: '最高品質でダウンロード、曲が変わると自動削除',

    // Player Tooltips
    btnShuffle: 'シャッフル',
    btnPrevious: '前へ',
    btnPlay: '再生',
    btnPause: '一時停止',
    btnNext: '次へ',
    btnLoop: 'リピート',
    btnLike: 'お気に入り',
    btnUnlike: 'お気に入り解除',
    btnVolume: '音量',
    btnMute: 'ミュート',
    btnFullscreen: '全画面表示',
    btnExitFullscreen: '全画面表示を終了',
    btnSidebar: 'サイドバーを表示',
    btnHideSidebar: 'サイドバーを非表示',
    myProfile: 'マイプロフィール',
    followers: 'フォロワー',
    following: 'フォロー中',
    publicPlaylists: '公開プレイリスト',
    privacySettings: 'プライバシー設定',
    isPrivate: '非公開',
    isPublic: '公開',
    saveToLibrary: 'ライブラリに保存',
    removeFromLibrary: 'ライブラリから削除',
    toastPlaylistSaved: '素晴らしい！プレイリストがライブラリに保存されました。',
    toastPlaylistRemoved: 'プレイリストがライブラリから削除されました。',
    topTracks: 'トップトラック',
    savedToLibrary: 'ライブラリに保存しました',
    noLikedSongsYet: 'お気に入りの曲はまだありません。',
    topListener: '上位 {percent}% リスナー',
    confirmRemovePlaylist: 'このプレイリストをライブラリから削除してもよろしいですか？',

    // Update section (available)
    updateSectionTitle: 'アップデートが利用可能',
    appUpdateSectionTitle: 'アプリのアップデート',
    updateAvailableMsg: '新しいバージョンのDon Pollo Musicが利用可能です。',
    updateReadyMsg: 'アップデートのダウンロードが完了し、インストール準備ができました！',
    downloadingUpdateMsg: 'アップデートをダウンロード中...',
    downloadNow: '今すぐダウンロード',
    restartApp: 'アプリを再起動',

    // Offline Vault & Library
    offlineVault: 'オフラインボルト',
    songsAvailable: '曲が利用可能',
    playlists: 'プレイリスト',
    myPersonalCollection: 'マイ\nコレクション',
    favoriteCollectionDesc: 'お気に入りのコレクション',
    recentPlaybackDesc: '最近の再生履歴',
    localCollection: 'ローカルコレクション',
    availableOffline: 'オフラインで利用可能',
    storage: 'ストレージ',
    totalStorageUsed: '使用済みストレージ合計',
    listenUnlimited: '無制限で\n聴こう',
    listenUnlimitedDesc: '音楽はいつでもどこでもあなたと一緒です。',
    offlineDownloads: 'オフラインダウンロード',
    songDetail: '曲の詳細',
    addSongToPlaylistLabel: 'このプレイリストに曲を追加',
    personalCollectionDesc: '再生してお気に入りにした曲がすべて、安全に保存されています。',

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
    toastRemovedFromPlaylist: 'プレイリストから削除しました！',
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
    trayPlay: '再生',
    trayPause: '一時停止',
    trayNext: '次の曲',
    trayPrev: '前の曲',
    trayShow: 'アプリを表示',
    trayQuit: '終了',

    // Podcast
    podcast: 'ポッドキャスト',
    music: '音楽',
    topPodcasts: 'トップポッドキャスト',
    podcastByHost: '著:',
    podcastLinking: 'YouTubeでエピソードを検索中...',
    searchPodcastPlaceholder: 'ポッドキャスト・ホスト・トピックを検索...',
    podcastNotFoundYt: 'YouTubeで見つかりません',
    profile: 'プロフィール',
    editBanner: 'バナーを編集',
    browsing: '閲覧中...',
    enterBannerUrl: 'バナーのURLを入力（空にすると削除）:'

  },

  ko: {
    // Login
    loginHeroSubtitle: '우아한 인터페이스, 실시간 가사 동기화, 최고의 음질로 무제한 음악 스트리밍을 경험하세요.',
    loginWelcome: '환영합니다',
    loginWelcomeDesc: 'Discord 계정으로 로그인하여 플레이리스트를 만들고 좋아하는 곡을 저장하세요.',
    loginFeat1: '고품질 음악 스트리밍',
    loginFeat2: '실시간 가사 동기화',
    loginFeat3: '자유롭게 플레이리스트 관리',
    loginBtn: 'Discord로 로그인',

    // Nav / Sidebar
    home: '홈',
    updateAvailable: '업데이트 가능',
    updateDownloading: '업데이트 다운로드 중...',
    updateReady: '업데이트 준비 완료. 클릭하여 설치',
    settings: '설정',
    yourLibrary: '내 라이브러리',
    liked: '좋아요',
    playlist: '플레이리스트',
    guest: '게스트',
    logoutDropdown: '로그아웃',
    goToSettings: '설정으로 이동 (로그인)',

    // Status & Join
    statusOnline: '온라인',
    statusIdle: '자리 비움',
    statusDnd: '방해 금지',
    askToJoin: '참여 요청',
    joinRequestSent: '요청 전송 중...',
    joinRequestRejected: '요청이 거절되었습니다.',
    joinRequestReceived: '님이 함께 듣고 싶어합니다!',
    accept: '수락',
    reject: '거절',
    joinDisabled: '참여할 수 없음',
    friendActivityTitle: '친구 활동',
    friendActivitySubtitle: '친구와 함께 듣기',
    pendingRequests: '대기 중인 요청',
    noFriendsOnline: '현재 온라인인 친구가 없습니다.',
    listenAlong: '함께 듣기',
    leaveParty: '파티 나가기',
    friends: '친구',
    pendingFriendRequest: '건의 대기 중인 친구 요청',

    // Profile Stats
    profileStats: '프로필 통계',
    statsSubtitle: '내 청취 활동 요약',
    totalSongsPlayed: '재생한 곡 수',
    listeningTime: '청취 시간',
    listeningTimeHours: '시간',
    listeningTimeMins: '분',
    topArtist: '최다 재생 아티스트',
    noneYet: '아직 없음',
    songsLikedStat: '좋아요한 곡',
    playlistsCreated: '만든 플레이리스트',
    songsDownloaded: '다운로드한 곡',
    memberSince: '가입일',
    rightClickForStatus: '우클릭으로 상태 변경',

    // Home Page
    goodMorning: '좋은 아침이에요',
    goodAfternoon: '좋은 오후에요',
    goodEvening: '좋은 저녁이에요',
    recentlyPlayed: '최근 재생',
    recommendations: '추천 곡',
    playAll: '전체 재생',
    viewAll: '전체 보기',
    showLess: '접기',
    likedSongs: '좋아요한 곡',
    noLikedSongs: '좋아요한 곡이 없습니다',
    noLikedDesc: '곡의 하트 아이콘을 눌러 좋아요를 추가하세요.',
    noHistory: '기록이 없습니다',
    noHistoryDesc: '곡을 재생하면 여기에 기록이 표시됩니다.',

    // Search
    searchPlaceholder: '곡, 아티스트, 앨범 검색...',
    searchResultsFor: '검색 결과:',
    noResults: '결과를 찾을 수 없습니다.',
    seeAllSongsBy: '의 모든 곡 보기',
    artistPage: '아티스트 페이지',
    filterPopular: '인기순',
    filterNewest: '최신순',
    loadingSongs: '곡 불러오는 중...',

    // Library / Playlist
    myLibrary: '내 라이브러리',
    createPlaylist: '플레이리스트 만들기',
    noPlaylists: '플레이리스트 없음',
    noPlaylistsDesc: '첫 번째 플레이리스트를 만들어 보세요!',
    addSongs: '곡 추가',
    songs: '곡',
    song: '곡',
    duration: '재생 시간',
    removeFromPlaylist: '플레이리스트에서 제거',
    playNext: '다음에 재생',
    addToQueue: '대기열에 추가',
    addToPlaylist: '플레이리스트에 추가',
    deletePlaylist: '플레이리스트 삭제',
    confirmDeletePlaylist: '플레이리스트를 삭제할까요?',
    cannotUndo: '이 작업은 되돌릴 수 없습니다.',
    cancel: '취소',
    delete: '삭제',
    editName: '이름 편집',
    changeImage: '이미지 변경',
    downloadSong: '곡 다운로드',
    toastDownloadStarted: '다운로드 중',
    toastDownloadComplete: '다운로드 완료',
    downloadDesktopOnly: '다운로드는 데스크톱 앱에서만 가능합니다',

    // Create Playlist Modal
    newPlaylistTitle: '새 플레이리스트 만들기',
    playlistNamePlaceholder: '플레이리스트 이름...',
    coverOptional: '플레이리스트 커버 (선택)',
    imageUrlPlaceholder: '인터넷 이미지 URL...',
    create: '만들기',
    back: '뒤로',
    save: '저장',
    importPlaylist: 'YouTube 플레이리스트 가져오기',
    importPlaylistPlaceholder: 'YouTube 플레이리스트 URL...',
    importing: '가져오는 중...',

    // Player
    nowPlaying: '재생 중',
    queue: '대기열',
    emptyQueue: '대기열이 비어 있습니다',
    clearQueue: '대기열 지우기',
    lyricsPanel: '가사',
    noLyrics: '가사가 없습니다.',
    offsetLabel: '오프셋',
    lyricsOffset: '가사 동기화 (오프셋)',

    // Settings
    settingsTitle: '설정',
    accountSection: '계정',
    notLoggedIn: '로그인하지 않음',
    loginToSync: '기기 간 데이터 동기화를 위해 로그인하세요',
    loginDiscord: 'Discord로 로그인',
    logout: '로그아웃',
    audioSection: '오디오',
    defaultVolume: '기본 볼륨',
    defaultVolumeDesc: '앱이 처음 열릴 때 사용되는 볼륨',
    audioQuality: '음질',
    audioQualityDesc: '품질이 높을수록 더 많은 데이터를 사용합니다',
    qualityAuto: '자동 (권장)',
    qualityHigh: '높음 (최고)',
    qualityMedium: '보통 (데이터 절약)',
    crossfadeLabel: '크로스페이드 (부드러운 전환)',
    crossfadeDesc: '페이드 인/아웃 효과로 곡 사이의 공백을 없애세요',
    crossfadeOff: '끄기',
    crossfadeSec: '초',
    displaySection: '디스플레이',
    autoLyrics: '가사 자동 표시',
    autoLyricsDesc: '곡이 재생될 때 자동으로 가사 패널 열기',
    autoSidebar: '오른쪽 패널 자동 열기',
    autoSidebarDesc: '앱 시작 시 대기열/가사 패널 표시',
    languageSection: '언어 / Language',
    languageLabel: '앱 언어',
    languageDesc: '앱 전체에 표시할 언어를 선택하세요',
    themeDisplay: '테마',
    themeDefault: '기본',
    themeDefaultDesc: '클래식',
    themeMinimalist: '미니멀',
    themeMinimalistDesc: '깔끔 & 컴팩트',
    themeCustom: '사용자 지정',
    themeCustomDesc: '자신만의 색상과 이미지 사용',
    dynamicBackground: '동적 배경',
    dynamicBackgroundDesc: '배경이 앨범 커버의 주요 색상에 맞춰 조정됩니다',
    accentColor: '포인트 색상',
    bgImageUrl: '배경 이미지 URL',
    advCustomTitle: '고급 사용자 지정',
    bgMain: '기본 배경',
    bgSidebar: '사이드바 배경',
    bgCard: '카드 배경',
    textPrimary: '기본 텍스트',
    textSecondary: '보조 텍스트',
    layoutOrientation: '레이아웃 방향',
    layoutLeft: '왼쪽 사이드바 (기본)',
    layoutRight: '오른쪽 사이드바',
    fontFamily: '글꼴',
    fontInter: 'Inter (기본)',
    fontRoboto: 'Roboto',
    fontOutfit: 'Outfit',
    fontMono: 'Monospace',
    shapeStyle: '모서리 모양',
    shapeRounded: '둥글게 (기본)',
    shapeSharp: '날카롭게',
    shapePill: '알약 모양',
    dataSection: '데이터',
    playHistory: '재생 기록',
    savedSongs: '곡 저장됨',
    clearHistory: '기록 삭제',
    playlistCount: '플레이리스트 저장됨',
    deleteAllPlaylists: '모든 플레이리스트 삭제',
    appVersion: '앱 버전',
    clearAudioCache: '로컬 오디오 캐시 삭제',
    confirmClearCache: '오디오 캐시를 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    audioCacheDesc: '캐시는 더 빠른 재생과 데이터 절약을 위해 곡을 저장합니다',
    manualUpdateCheck: '수동 업데이트 확인',
    manualUpdateDesc: '새로운 버전의 Don Pollo Music이 있는지 확인합니다.',
    checkingUpdate: '업데이트 확인 중...',
    alreadyLatest: '최신 버전을 사용하고 있습니다.',
    noPublishedVersions: '아직 게시된 새 버전이 없습니다.',
    downloads: '다운로드',
    offlineMode: '오프라인 모드',
    noDownloads: '다운로드 없음',
    noDownloadsDesc: '캐시한 곡이 여기에 표시됩니다.',
    miniPlayer: '미니 플레이어',
    closeToTray: '트레이로 최소화',
    closeToTrayDesc: '닫을 때 앱을 시스템 트레이로 최소화',
    shortcutsTitle: '전역 키보드 단축키',
    shortcutPlayPause: '재생 / 일시정지 (미디어 키)',
    shortcutNext: '다음 트랙 (미디어 키)',
    shortcutPrev: '이전 트랙 (미디어 키)',
    equalizer: '이퀄라이저',
    eqEnabled: '이퀄라이저 활성화',
    eqEnabledDesc: '오디오 재생에 이퀄라이저 효과 적용',
    eqPresetCustom: '사용자 정의',
    eqPresetDefault: '기본 (플랫)',
    eqPresetBassBooster: '베이스 부스터',
    eqPresetPop: '팝',
    eqPresetElectronic: '일렉트로닉',
    eqPresetAcoustic: '어쿠스틱',

    // Audio Cache Mode
    cacheModeLabel: '오디오 캐시 모드',
    cacheModeDesc: '재생 중 오디오 파일 처리 방법 선택',
    cacheModeSmartCache: '스마트 캐시',
    cacheModeSmartCacheDesc: '다운로드 후 영구 저장. 즉각 재생, 버퍼링 없음',
    cacheModeStream: '스트리밍',
    cacheModeStreamDesc: '파일 저장 없이 직접 재생. 저장 공간 절약, 안정적인 연결 필요',
    cacheModeTemp: '임시 캐시',
    cacheModeTempDesc: '최고 품질로 다운로드, 곡 변경 시 자동 삭제',

    // Player Tooltips
    btnShuffle: '셔플',
    btnPrevious: '이전',
    btnPlay: '재생',
    btnPause: '일시정지',
    btnNext: '다음',
    btnLoop: '반복',
    btnLike: '좋아요',
    btnUnlike: '좋아요 취소',
    btnVolume: '볼륨',
    btnMute: '음소거',
    btnFullscreen: '전체 화면',
    btnExitFullscreen: '전체 화면 종료',
    btnSidebar: '사이드바 표시',
    btnHideSidebar: '사이드바 숨기기',
    myProfile: '내 프로필',
    followers: '팔로워',
    following: '팔로잉',
    publicPlaylists: '공개 플레이리스트',
    privacySettings: '개인정보 설정',
    isPrivate: '비공개',
    isPublic: '공개',
    saveToLibrary: '라이브러리에 저장',
    removeFromLibrary: '라이브러리에서 제거',
    toastPlaylistSaved: '멋져요! 플레이리스트가 라이브러리에 저장되었습니다.',
    toastPlaylistRemoved: '플레이리스트가 라이브러리에서 제거되었습니다.',
    topTracks: '인기 트랙',
    savedToLibrary: '라이브러리에 저장됨',
    noLikedSongsYet: '아직 좋아하는 곡이 없습니다.',
    topListener: '상위 {percent}% 리스너',
    confirmRemovePlaylist: '라이브러리에서 이 플레이리스트를 제거하시겠습니까?',

    // Update section (available)
    updateSectionTitle: '업데이트 가능',
    appUpdateSectionTitle: '앱 업데이트',
    updateAvailableMsg: '새로운 버전의 Don Pollo Music이 있습니다.',
    updateReadyMsg: '업데이트 다운로드 완료, 설치 준비가 되었습니다!',
    downloadingUpdateMsg: '업데이트 다운로드 중...',
    downloadNow: '지금 다운로드',
    restartApp: '앱 재시작',

    // Offline Vault & Library
    offlineVault: '오프라인 보관함',
    songsAvailable: '곡 이용 가능',
    playlists: '플레이리스트',
    myPersonalCollection: '나의\n컬렉션',
    favoriteCollectionDesc: '내 즐겨찾기 컬렉션',
    recentPlaybackDesc: '최근 재생 기록',
    localCollection: '로컬 컬렉션',
    availableOffline: '오프라인 이용 가능',
    storage: '저장 공간',
    totalStorageUsed: '총 사용 저장 공간',
    listenUnlimited: '무제한\n청취',
    listenUnlimitedDesc: '음악은 언제 어디서나 당신과 함께합니다.',
    offlineDownloads: '오프라인 다운로드',
    songDetail: '곡 상세',
    addSongToPlaylistLabel: '이 플레이리스트에 곡 추가',
    personalCollectionDesc: '재생하고 좋아요한 모든 곡이 안전하게 저장되어 있습니다.',

    // Toast
    toastLogout: '로그아웃하고 재생을 중단했습니다',
    hitsInt: '글로벌 팝 히트',
    hitsId: '인도네시아 팝 히트',
    hitsJp: 'J-Pop 히트',
    hitsKr: 'K-Pop 히트',
    hitsLatin: '라틴 팝 히트',
    playSong: '곡 재생',
    likeSong: '좋아요',
    unlikeSong: '좋아요 취소',
    trendingLocal: '트렌딩:',
    toastHistoryCleared: '기록이 삭제되었습니다.',
    toastPlaylistDeleted: '플레이리스트가 삭제되었습니다.',
    toastPlaylistCreated: '이(가) 생성되었습니다!',
    toastImportSuccess: '을(를) 성공적으로 가져왔습니다!',
    toastAddedToPlaylist: '플레이리스트에 곡을 추가했습니다!',
    toastRemovedFromPlaylist: '플레이리스트에서 곡을 제거했습니다!',
    toastAlreadyInPlaylist: '이 곡은 이미 플레이리스트에 있습니다.',
    toastLiked: '좋아요한 곡에 추가됨',
    toastUnliked: '좋아요한 곡에서 제거됨',
    toastAddedToQueue: '대기열에 추가됨',
    toastPlayNext: '다음 재생에 추가됨',
    toastWelcome: '환영합니다',
    toastDiscordError: 'Discord 프로필을 가져오지 못했습니다.',
    toastSearchFail: '검색 서버에 연결하지 못했습니다.',
    toastServerBlocked: '메인 서버가 차단되었습니다. 백업으로 전환 중...',
    toastServerFallback: '백업 서버에 연결되었습니다!',
    toastVideoLocked: '실패: 이 영상은 YouTube에 의해 제한되어 있습니다.',
    lyricsSearching: '가사 검색 중...',
    lyricsNotFound: '가사를 찾을 수 없습니다.',
    lyricsNotLRC: '가사가 LRC 형식이 아닙니다.',
    lyricsFailed: '가사를 가져오지 못했습니다.',
    toastCacheCleared: '로컬 오디오 캐시가 성공적으로 삭제되었습니다!',
    trayPlay: '재생',
    trayPause: '일시정지',
    trayNext: '다음 트랙',
    trayPrev: '이전 트랙',
    trayShow: '앱 표시',
    trayQuit: '종료',

    // Podcast
    podcast: '팟캐스트',
    music: '음악',
    topPodcasts: '인기 팟캐스트',
    podcastByHost: '진행:',
    podcastLinking: 'YouTube에서 에피소드 검색 중...',
    searchPodcastPlaceholder: '팟캐스트, 진행자, 주제 검색...',
    podcastNotFoundYt: 'YouTube에서 찾을 수 없음',
    profile: '프로필',
    editBanner: '배너 편집',
    browsing: '둘러보는 중...',
    enterBannerUrl: '배너 URL 입력 (비워두면 삭제):'

  }
};

export function createTranslator(lang: Language) {
  return function t(key: keyof TranslationKeys): string {
    return translations[lang][key] ?? translations['id'][key] ?? key;
  };
}
