import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import './style.css';

interface Channel {
  id: number;
  name: string;
  logo: string;
  url: string;
}

// Test M3U Bağlantısı (Kendi URL'iniz ile değiştirebilirsiniz)
const SAMPLE_M3U_URL = 'https://iptv-org.github.io/iptv/languages/tur.m3u';

let channels: Channel[] = [];
let player: Player;
let osdTimeout: number;

// M3U Parse Fonksiyonu
async function parseM3U(url: string): Promise<Channel[]> {
  try {
    const response = await fetch(url);
    const data = await response.text();
    const lines = data.split('\n');

    const parsedChannels: Channel[] = [];
    let tempName = '';
    let tempLogo = '';
    let idCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        tempLogo = logoMatch ? logoMatch[1] : 'https://via.placeholder.com/50?text=TV';

        const nameParts = line.split(',');
        tempName = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : `Kanal ${idCounter}`;
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        if (tempName) {
          parsedChannels.push({
            id: idCounter++,
            name: tempName,
            logo: tempLogo,
            url: line
          });

          tempName = '';
          tempLogo = '';
        }
      }
    }

    return parsedChannels;
  } catch (error) {
    console.error('M3U Yükleme Hatası:', error);
    return [];
  }
}

// Kanal Listesini Ekrana Basma
function renderChannelList(list: Channel[]) {
  const channelListEl = document.getElementById('channel-list');
  if (!channelListEl) return;

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

// Kanalı Video.js Üzerinde Oynatma (Tam Tip Korumalı)
function playChannel(channel: Channel) {
  if (!player) return;

  player.src({
    src: channel.url,
    type: 'application/x-mpegURL'
  });

  player.play().catch(() => console.log('Otomatik oynatma engellendi'));

  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  
  const activeEl = document.querySelector(`[data-id="${channel.id}"]`);
  if (activeEl) {
    activeEl.classList.add('active');
  }

  showOSD(channel);
}

// TV OSD Bilgi Ekranı (Tam Tip Korumalı)
function showOSD(channel: Channel) {
  const osd = document.getElementById('osd');
  const osdTitle = document.getElementById('osd-title');
  const osdLogo = document.getElementById('osd-logo') as HTMLImageElement | null;

  if (!osd || !osdTitle || !osdLogo) return;

  osdTitle.textContent = channel.name;
  osdLogo.src = channel.logo;

  osd.classList.remove('hidden');

  clearTimeout(osdTimeout);
  osdTimeout = window.setTimeout(() => {
    osd.classList.add('hidden');
  }, 4000);
}

// Arama Mantığı
function setupSearch() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (!target) return;
    
    const query = target.value.toLowerCase();
    const filtered = channels.filter(c => c.name.toLowerCase().includes(query));
    renderChannelList(filtered);
  });
}

// Başlatıcı
async function init() {
  const videoElement = document.getElementById('tv-player') as HTMLVideoElement | null;
  if (!videoElement) return;

  player = videojs(videoElement, {
    autoplay: false,
    controls: true,
    fluid: true,
    responsive: true
  });

  channels = await parseM3U(SAMPLE_M3U_URL);
  renderChannelList(channels);
  setupSearch();

  if (channels.length > 0) {
    playChannel(channels[0]);
  }
}

init();
