const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace thumbnails
code = code.replace(/src=\{([^}]+)\.thumbnail\}/g, 'src={getCleanThumbnail(.thumbnail)}');
code = code.replace(/src=\{currentSong\?\.thumbnail\}/g, 'src={getCleanThumbnail(currentSong?.thumbnail)}');

// Add title tooltips
code = code.replace(/className="library-item-title">\{song\.title\}/g, 'className="library-item-title" title={song.title}>{song.title}');
code = code.replace(/className="track-title">\{song\.title\}/g, 'className="track-title" title={song.title}>{song.title}');
code = code.replace(/className="hero-title">\{currentSong\.title\}/g, 'className="hero-title" title={currentSong.title}>{currentSong.title}');
code = code.replace(/className="player-title"([^>]+)>\{currentSong\.title\}/g, 'className="player-title" title={currentSong.title}>{currentSong.title}');
code = code.replace(/className="fs-title">\{currentSong \? currentSong\.title : 'No Music Playing'\}/g, 'className="fs-title" title={currentSong ? currentSong.title : ""}>{currentSong ? currentSong.title : "No Music Playing"}');
code = code.replace(/<div style=\{\{ fontSize: '13px', fontWeight: 600([^>]+)\}\}>\{song\.title\}<\/div>/g, '<div title={song.title} style={{ fontSize: "13px", fontWeight: 600}}>{song.title}</div>');

fs.writeFileSync('src/App.tsx', code);
console.log('Replaced successfully!');
