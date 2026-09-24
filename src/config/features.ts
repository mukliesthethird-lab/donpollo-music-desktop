/**
 * FEATURE FLAGS CONFIGURATION
 *
 * File ini berfungsi sebagai sakelar (toggle switch) untuk fitur-fitur aplikasi.
 * Jika fitur dinonaktifkan (false):
 * 1. Tidak ada panggilan API atau query pencarian ke server (server tidak terbebani).
 * 2. Tampilan UI terkait disembunyikan dari pengguna sehingga pengguna tidak mengetahui adanya fitur tersebut.
 * 3. Seluruh kode fitur tetap tersimpan rapi di dalam proyek.
 *
 * Untuk mengaktifkan kembali di masa mendatang, cukup ubah nilai flag menjadi `true`.
 */

export const FEATURE_FLAGS = {
  /**
   * Fitur Playlist Mix & Rekomendasi Mood Algoritmik ("Dibuat Untuk Kamu", Discover Weekly, Release Radar, Vibe Mix).
   * 
   * Saat `false`:
   * - Pengambilan batch lagu rekomendasi via /api/search dimatikan sepenuhnya.
   * - Rak "Dibuat Untuk Kamu" (Made For You) disembunyikan dari beranda.
   * - Vibe Check popup kembali ke mode pencatat mood standar tanpa memicu query audio ke server.
   * 
   * Saat `true`:
   * - Fitur beroperasi penuh meracik lagu secara algoritmik.
   */
  ENABLE_PLAYLIST_MIX: false,

  /**
   * Rak "Daily Mix & Highlights" bento di beranda (Recent Play, Favorite, Trending, Jump Back In).
   * 
   * Bersifat 100% client-side menggunakan riwayat putar & lagu disukai di memori lokal,
   * sehingga 0 request ke server dan sangat ringan.
   * 
   * Saat `true`:
   * - Rak Bento Daily Mix & Highlights ditampilkan di bagian atas beranda.
   * 
   * Saat `false`:
   * - Rak Bento disembunyikan.
   */
  ENABLE_DAILY_MIX_SHELF: true,

  /**
   * Background mapping YouTube ID untuk 150 lagu Hits di beranda pada saat startup.
   *
   * PENYEBAB UTAMA LONJAKAN RAM & CPU (Server & Desktop):
   * Saat aplikasi dibuka, kode lama menjalankan 6 loop paralel (US, ID, JP, KR, MX, Local)
   * yang menembak 150 query /api/search sekaligus ke server.
   *
   * Saat `false`:
   * - 150 request latar belakang ini dimatikan sepenuhnya.
   * - Beranda langsung terbuka ringan & cepat.
   * - Saat user mengklik lagu hits, YouTube ID langsung dicari on-demand (Just-In-Time)
   *   oleh `executePlay` dalam ~0.3 detik tanpa kendala.
   *
   * Saat `true`:
   * - 150 lagu dipetakan di latar belakang (membebani server & RAM).
   */
  ENABLE_BACKGROUND_HITS_MAPPING: false,
};
