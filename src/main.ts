import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import './style.css';

// M3U Kanal Modeli
interface Channel {
  id: number;
  name: string;
  logo: string;
  url: string;
}

// TEST M3U URL'si (İsterseniz kendi URL'niz ile değiştirin)
const SAMPLE_M3U_URL = 'https://raw.githubusercontent.com/TechPhantom34/iptv/refs/heads/master/index.m3u';

let channels: Channel[] = [];
let player: Player;
let osdTimeout: number;

// 1. M3U Dosyasını Parse Eden Fonksiyon

async function parseM3U(url: string): Promise<Channel[]> {
  try {
    const response = await fetch(url);
    const data = await response.text();
    const lines = data.split('\n');

    const parsedChannels: Channel[] = [];
    let currentChannel: Partial<Channel> | null = null;
    let idCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Logo ayıklama
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        const logo = logoMatch ? logoMatch[1] : 'https://via.placeholder.com/50?text=TV';

        // Kanal adı ayıklama (Virgülden sonraki kısım)
        const nameParts = line.split(',');
        const name = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : `Kanal ${idCounter}`;

        currentChannel = {
          id: idCounter++,
          name,
          logo
        };
      } else if ((line.startsWith('http://') || line.startsWith('https://')) && currentChannel) {
        // HLS URL'si - currentChannel null/undefined kontrolü garantiye alındı
        currentChannel.url = line;
        parsedChannels.push(currentChannel as Channel);
        currentChannel = null; // Bir sonraki kanal için sıfırla
      }
    }

    return parsedChannels;
  } catch (error) {
    console.error('M3U Yükleme/Parse Hatası:', error);
    return [];
  }
}

// 2. Kanal Listesini DOM'a Basma
function renderChannelList(list: Channel[]) {
  const channelListEl = document.getElementById('channel-list')!;
  channelListEl.innerHTML = '';

  list.forEach((channel) => {
    const li = document.createElement('li');
    li.className = 'channel-item';
    li.dataset.id = channel.id.toString();

    li.innerHTML = `
      <img src="${channel.logo}" class="channel-logo" onerror="this.src='https://via.placeholder.com/40?text=TV'" />
      <span class="channel-name">${channel.name}</span>
    `;

    li.addEventListener('click', () => playChannel(channel));
    channelListEl.appendChild(li);
  });
}

// 3. Kanal Seçimi ve TV Geçişi (OSD Ekranı ile)
function playChannel(channel: Channel) {
  if (!player) return;

  // Video.js kaynağını HLS (.m3u8) olarak değiştirme
  player.src({
    src: channel.url,
    type: 'application/x-mpegURL'
  });

  player.play().catch(() => console.log('Autoplay engellendi'));

  // Aktif kanal stilini güncelleme
  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.querySelector(`[data-id="${channel.id}"]`);
  activeEl?.classList.add('active');

  // TV OSD (Bilgi Ekranını) Göster ve 4sn sonra kapat
  showOSD(channel);
}

// TV havası için Ekran Overlay
function showOSD(channel: Channel) {
  const osd = document.getElementById('osd')!;
  const osdTitle = document.getElementById('osd-title')!;
  const osdLogo = document.getElementById('osd-logo') as HTMLImageElement;

  osdTitle.textContent = channel.name;
  osdLogo.src = channel.logo;

  osd.classList.remove('hidden');

  clearTimeout(osdTimeout);
  osdTimeout = window.setTimeout(() => {
    osd.classList.add('hidden');
  }, 4000);
}

// 4. Arama İşlevi
function setupSearch() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;

  searchInput.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = channels.filter(c => c.name.toLowerCase().includes(query));
    renderChannelList(filtered);
  });
}

// 5. Uygulama Başlatma
async function init() {
  // Video.js Oynatıcıyı Başlatma
  const videoElement = document.getElementById('tv-player') as HTMLVideoElement;
  player = videojs(videoElement, {
    autoplay: false,
    controls: true,
    fluid: true,
    responsive: true
  });

  // M3U Yükle ve Başlat
  channels = await parseM3U(SAMPLE_M3U_URL);
  renderChannelList(channels);
  setupSearch();

  // İlk kanalı otomatik yükle
  if (channels.length > 0) {
    playChannel(channels[0]);
  }
}

init();
