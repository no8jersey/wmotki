// Переводы интерфейса. Выбранный язык сохраняется в этом браузере.
const translations = {
  ru: {
    hide: 'скрыть', show: 'показать', hidden: 'скрыто', carousel: 'карусель',
    previous: 'Предыдущее изображение', next: 'Следующее изображение',
    unavailable: 'Изображение недоступно. Можно перейти к следующему.', empty: 'пока нет изображений', of: 'из',
    workspace: 'Подбор одежды', gallery: 'Коллекция изображений', outfit: 'Собранный образ', language: 'Язык сайта',
    nextView: 'Следующий вариант образа', partial: 'Часть изображений не загрузилась.', noOutfit: 'Нет доступных изображений для этого варианта.',
    variants: ['Все три верха', 'Лонгслив', 'Лонгслив с футболкой', 'Лонгслив с курткой'],
    slots: {hat:'Головные уборы', shirt:'Футболки', longsleeve:'Лонгсливы', jacket:'Куртки', pants:'Брюки', belt:'Ремни', bag:'Сумки', shoes:'Обувь'},
    play: 'Включить трек', stop: 'Остановить музыку', musicError: 'Не удалось включить музыку. Проверь MP3-файл или попробуй ещё раз.'
  },
  en: {
    hide: 'hide', show: 'show', hidden: 'hidden', carousel: 'carousel',
    previous: 'Previous image', next: 'Next image', unavailable: 'Image unavailable. Try the next one.', empty: 'no images yet', of: 'of',
    workspace: 'Outfit builder', gallery: 'Image collection', outfit: 'Outfit', language: 'Site language',
    nextView: 'Next layout', partial: 'Some images could not be loaded.', noOutfit: 'No images available for this layout.',
    variants: ['All three tops', 'Long-sleeved top', 'Long-sleeved top and T-shirt', 'Long-sleeved top and jacket'],
    slots: {hat:'Hats', shirt:'T-shirts', longsleeve:'Long-sleeved tops', jacket:'Jackets', pants:'Trousers', belt:'Belts', bag:'Bags', shoes:'Shoes'},
    play: 'Play track', stop: 'Stop music', musicError: 'Could not play music. Check the MP3 file or try again.'
  },
  sr: {
    hide: 'sakrij', show: 'prikaži', hidden: 'sakriveno', carousel: 'galerija',
    previous: 'Prethodna slika', next: 'Sledeća slika', unavailable: 'Slika nije dostupna. Probaj sledeću.', empty: 'još nema slika', of: 'od',
    workspace: 'Kombinovanje odeće', gallery: 'Kolekcija slika', outfit: 'Odevna kombinacija', language: 'Jezik sajta',
    nextView: 'Sledeći raspored', partial: 'Neke slike nisu učitane.', noOutfit: 'Nema dostupnih slika za ovaj raspored.',
    variants: ['Sva tri gornja dela', 'Majica dugih rukava', 'Majica dugih rukava i majica kratkih rukava', 'Majica dugih rukava i jakna'],
    slots: {hat:'Kape', shirt:'Majice kratkih rukava', longsleeve:'Majice dugih rukava', jacket:'Jakne', pants:'Pantalone', belt:'Kaiševi', bag:'Torbe', shoes:'Obuća'},
    play: 'Pusti pesmu', stop: 'Zaustavi muziku', musicError: 'Muzika ne može da se pusti. Proveri MP3 datoteku ili pokušaj ponovo.'
  }
};
let language = 'en';
try { const saved = localStorage.getItem('wmotki-language'); if (Object.hasOwn(translations, saved)) language = saved; } catch {}
const t = key => translations[language][key];
const sliderTranslators = [];

// Один общий шанс на вход, затем отдельный бросок для каждой необязательной вещи.
const initialHideChance = [0.2, 0.5, 0.8][Math.floor(Math.random() * 3)];
const initiallyHidden = new Set(['hat', 'jacket', 'bag', 'belt'].filter(() => Math.random() < initialHideChance));
const availableTop = slot => (window.GALLERY_DATA || []).some(c => c.slot === slot && c.images.length);
if (availableTop('shirt') && availableTop('longsleeve') && Math.random() < initialHideChance) {
  initiallyHidden.add(Math.random() < 0.5 ? 'shirt' : 'longsleeve');
}

// Файлы запрашиваются только после клика. Нет автозапуска и перехода по окончании.
const musicTracks = ['./music/1.mp3', './music/2.mp3', './music/3.mp3'];
const musicButton = document.querySelector('#music-toggle');
const musicStatus = document.querySelector('#music-status');
let nextTrack = 0;
let musicAudio = null;
let musicState = 'idle';
let musicError = false;
let musicRequest = 0;
function updateMusicUI() {
  const active = musicState !== 'idle';
  const label = active ? t('stop') : `${t('play')} ${nextTrack + 1}`;
  musicButton.title = label;
  musicButton.setAttribute('aria-label', label);
  musicButton.setAttribute('aria-pressed', String(active));
  musicButton.dataset.state = musicState;
  musicButton.querySelector('.play-icon').toggleAttribute('hidden', active);
  musicButton.querySelector('.stop-icon').toggleAttribute('hidden', !active);
  musicStatus.hidden = !musicError;
  musicStatus.textContent = musicError ? t('musicError') : '';
}
function stopMusic(advance = true) {
  musicRequest++;
  if (musicAudio) {
    musicAudio.onended = null;
    musicAudio.onerror = null;
    musicAudio.pause();
    musicAudio.removeAttribute('src');
    musicAudio.load();
    musicAudio = null;
  }
  if (advance) nextTrack = (nextTrack + 1) % musicTracks.length;
  musicState = 'idle';
  updateMusicUI();
}
musicButton.addEventListener('click', async () => {
  if (musicState !== 'idle') { stopMusic(); return; }
  const token = ++musicRequest;
  const audio = new Audio();
  musicAudio = audio;
  audio.preload = 'none';
  audio.volume = 0.3;
  audio.loop = true;
  audio.src = musicTracks[nextTrack];
  musicError = false;
  musicState = 'loading';
  updateMusicUI();
  const fail = () => {
    if (token !== musicRequest) return;
    musicError = true;
    stopMusic(false); // Ошибка не пропускает трек: следующий клик повторяет попытку.
  };
  audio.onerror = fail;
 // audio.onended = () => { if (token === musicRequest) stopMusic(); };
  try {
    await audio.play();
    if (token !== musicRequest) return;
    musicState = 'playing';
    updateMusicUI();
  } catch { fail(); }
});

// Коллаж собирается из выбранных кадров; роли определяются местом окна (slot).
const selectedItems = new Map();
const composeButton = document.querySelector('#compose');
const outfit = document.querySelector('#outfit');
const outfitCanvas = document.querySelector('#outfit-canvas');
const outfitStatus = document.querySelector('#outfit-status');

let outfitVariant = 0;
let initializingSliders = true;
let outfitRequest = 0;
const assetCache = new Map();

// Размеры коллажа: 900 × 1400. Каждая строка: роль, x, y, ширина, высота.
// При необходимости здесь можно подогнать посадку под пропорции своих фото.
function outfitLayers(variant) {
  const layers = [
    ['pants', 285, 690, 350, 540],
    ['shoes', 300, 1190, 370, 180],
    ['belt', 290, 670, 355, 65],
  ];
  if (variant === 0) {
    layers.push(
      ['longsleeve', 130, 255, 430, 465],
      ['shirt', 255, 240, 450, 460],
      ['jacket', 375, 230, 470, 480],
    );
  } else {
    // Если лонгслив скрыт, сохраняем выбранную футболку в одиночных видах.
    const baseTop = selectedItems.has('longsleeve') ? 'longsleeve' : 'shirt';
    layers.push([baseTop, 245, 250, 440, 460]);
    if (variant === 2 && baseTop !== 'shirt') layers.push(['shirt', 255, 245, 430, 420]);
    if (variant === 3) layers.push(['jacket', 230, 240, 470, 465]);
  }
  layers.push(['hat', 315, 65, 270, 175], ['bag', 555, 550, 275, 300]);
  return layers;
}

function loadOutfitAsset(src) {
  if (assetCache.has(src)) return assetCache.get(src);
  const pending = new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('Загрузка заняла слишком долго: ' + src)), 15000);
    img.onerror = () => { clearTimeout(timer); reject(new Error('Не удалось загрузить: ' + src)); };
    img.onload = () => {
      clearTimeout(timer);
      try {
        // Уменьшаем большие исходники перед анализом прозрачности.
        const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
        const raster = document.createElement('canvas');
        raster.width = Math.max(1, Math.round(img.naturalWidth * scale));
        raster.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = raster.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, raster.width, raster.height);
        let bounds = [0, 0, raster.width, raster.height];
        try {
          const pixels = ctx.getImageData(0, 0, raster.width, raster.height).data;
          let left = raster.width, top = raster.height, right = -1, bottom = -1;
          for (let y = 0; y < raster.height; y++) {
            for (let x = 0; x < raster.width; x++) {
              if (pixels[(y * raster.width + x) * 4 + 3] > 8) {
                left = Math.min(left, x); right = Math.max(right, x);
                top = Math.min(top, y); bottom = Math.max(bottom, y);
              }
            }
          }
          if (right < 0) { resolve(null); return; }
          bounds = [left, top, right - left + 1, bottom - top + 1];
        } catch {
          // При открытии через file:// некоторые браузеры запрещают анализ пикселей.
          // Само наложение продолжает работать, но без обрезки прозрачных полей.
        }
        resolve({ source: raster, bounds });
      } catch (error) { reject(error); }
    };
    img.src = src;
  });
  assetCache.set(src, pending);
  pending.catch(() => { if (assetCache.get(src) === pending) assetCache.delete(src); });
  if (assetCache.size > 24) assetCache.delete(assetCache.keys().next().value);
  return pending;
}

async function renderOutfit() {
  if (initializingSliders) return;
  const token = ++outfitRequest;
  const variant = outfitVariant;
  const snapshot = new Map(selectedItems);
  const layers = outfitLayers(variant);
  outfit.classList.add('has-outfit');
  outfit.setAttribute('aria-busy', 'true');
  const assets = await Promise.all(layers.map(async ([slot]) => {
    const item = snapshot.get(slot);
    if (!item) return { asset: null, failed: false };
    try { return { asset: await loadOutfitAsset(item.src), failed: false }; }
    catch (error) { console.warn(error.message); return { asset: null, failed: true }; }
  }));
  if (token !== outfitRequest) return;
  const frame = document.createElement('canvas');
  frame.width = outfitCanvas.width; frame.height = outfitCanvas.height;
  const ctx = frame.getContext('2d');
  let drawn = 0;
  layers.forEach(([, x, y, width, height], i) => {
    const asset = assets[i].asset;
    if (!asset) return;
    const [sx, sy, sw, sh] = asset.bounds;
    const ratio = Math.min(width / sw, height / sh);
    const dw = sw * ratio, dh = sh * ratio;
    ctx.drawImage(asset.source, sx, sy, sw, sh, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
    drawn++;
  });
  const target = outfitCanvas.getContext('2d');
  target.clearRect(0, 0, outfitCanvas.width, outfitCanvas.height);
  target.drawImage(frame, 0, 0);
  outfitCanvas.hidden = drawn === 0;
  outfitCanvas.setAttribute('aria-label', t('variants')[variant]);
  outfitCanvas.dataset.variant = String(variant + 1);
  outfit.setAttribute('aria-busy', 'false');
  const partial = assets.some(item => item.failed);
  outfitStatus.textContent = drawn ? `${variant + 1} / 4: ${t('variants')[variant]}. ${partial ? t('partial') : ''}` : t('noOutfit');
  composeButton.title = `${t('variants')[variant]}. ${t('nextView')}. ${partial ? t('partial') : ''}`;
}

composeButton.disabled = !(window.GALLERY_DATA || []).some(config => config.images.length);
composeButton.setAttribute('aria-label', t('nextView'));
composeButton.title = t('nextView');
composeButton.addEventListener('click', () => {
  outfitVariant = (outfitVariant + 1) % 4;
  composeButton.setAttribute('aria-label', t('nextView'));
  renderOutfit();
});

// gallery-data.js создается автоматически из папок при публикации.
const gallery = document.querySelector('#gallery');
for (const config of window.GALLERY_DATA || []) {
  const cell = document.createElement('div');
  cell.className = 'slider-cell';
  cell.style.gridArea = config.slot;
  const slider = document.createElement('section');
  slider.className = 'slider';
  slider.id = `slider-${config.slot}`;
  slider.tabIndex = 0;
  const categoryLabel = () => t('slots')[config.slot] || config.label;
  slider.setAttribute('aria-label', categoryLabel());
  slider.setAttribute('aria-roledescription', t('carousel'));
  const image = document.createElement('img');
  image.className = 'slide-image';
  image.alt = '';
  image.draggable = false;
  image.hidden = true;
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  slider.append(image, status);
  const images = config.images;
  const navigationButtons = [];
  let isHidden = initiallyHidden.has(config.slot);
  let current = 0;
  let gesture = null;
  let suppressClickUntil = 0;
  let request = 0;
  let imageFailed = false;
  function refreshSliderText() {
    slider.setAttribute('aria-label', categoryLabel());
    slider.setAttribute('aria-roledescription', t('carousel'));
    visibilityToggle.textContent = t(isHidden ? 'show' : 'hide');
    visibilityToggle.setAttribute('aria-label', `${t(isHidden ? 'show' : 'hide')}: ${categoryLabel()}`);
    navigationButtons.forEach((button, i) => button.setAttribute('aria-label', `${categoryLabel()}: ${t(i ? 'next' : 'previous')}`));
    status.textContent = `${categoryLabel()}: ${!images.length ? t('empty') : isHidden ? t('hidden') : imageFailed ? t('unavailable') : `${current + 1} ${t('of')} ${images.length}`}`;
  }
  function show(index) {
    if (!images.length || isHidden) return;
    current = (index + images.length) % images.length;
    const item = images[current];
    selectedItems.set(config.slot, item);
    renderOutfit();
    const token = ++request;
    imageFailed = false;
    image.hidden = true;
    // Быстрые нажатия не должны возвращать устаревший кадр.
    const loader = new Image();
    loader.onload = () => {
      if (token !== request) return;
      image.src = item.src;
      image.hidden = false;
      refreshSliderText();
    };
    loader.onerror = () => {
      if (token !== request) return;
      image.hidden = true;
      imageFailed = true;
      refreshSliderText();
      console.warn('Не удалось загрузить изображение:', item.src);
    };
    loader.src = item.src;
  }
  for (const [direction, className, label] of [
    [-1, 'previous', 'Предыдущее изображение'],
    [1, 'next', 'Следующее изображение'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hit-area ${className}`;
    button.setAttribute('aria-label', `${config.label}: ${label}`);
    button.disabled = images.length < 2;
    button.addEventListener('click', event => {
      if (event.detail !== 0 && performance.now() < suppressClickUntil) return;
      show(current + direction);
    });
    navigationButtons.push(button);
    slider.append(button);
  }
  const visibilityToggle = document.createElement('button');
  visibilityToggle.type = 'button';
  visibilityToggle.className = 'visibility-toggle';
  visibilityToggle.textContent = t(isHidden ? 'show' : 'hide');
  visibilityToggle.setAttribute('aria-label', `${t(isHidden ? 'show' : 'hide')}: ${categoryLabel()}`);
  visibilityToggle.setAttribute('aria-controls', slider.id);
  visibilityToggle.disabled = images.length === 0;
  visibilityToggle.addEventListener('click', () => {
    isHidden = !isHidden;
    request++; // Отменяем показ кадра, если его загрузка еще не закончилась.
    gesture = null;
    slider.dataset.hidden = String(isHidden);
    slider.tabIndex = isHidden ? -1 : 0;
    refreshSliderText();
    navigationButtons.forEach(button => { button.disabled = isHidden || images.length < 2; });
    if (isHidden) {
      image.hidden = true;
      selectedItems.delete(config.slot);
      refreshSliderText();
      renderOutfit();
    } else {
      show(current); // Возвращаем прежнюю вещь, не выбираем новую случайную.
    }
  });
  slider.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  slider.addEventListener('pointerdown', event => {
    if (isHidden || !event.isPrimary || event.button !== 0 || images.length < 2) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.target.setPointerCapture(event.pointerId);
  });
  slider.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.hypot(dx, dy) > 12) suppressClickUntil = performance.now() + 500;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      show(current + (dx < 0 ? 1 : -1));
    }
    gesture = null;
  });
  slider.addEventListener('pointercancel', () => {
    gesture = null;
    suppressClickUntil = performance.now() + 500;
  });
  slider.addEventListener('lostpointercapture', () => { gesture = null; });
  cell.append(slider, visibilityToggle);
  gallery.append(cell);
  current = images.length ? Math.floor(Math.random() * images.length) : 0;
  slider.dataset.hidden = String(isHidden);
  slider.tabIndex = isHidden ? -1 : 0;
  navigationButtons.forEach(button => { button.disabled = isHidden || images.length < 2; });
  sliderTranslators.push(refreshSliderText);
  refreshSliderText();
  if (images.length && !isHidden) show(current);
}

// Все случайные начальные кадры выбраны: собираем первый вид один раз.
initializingSliders = false;

function applyLanguage() {
  document.documentElement.lang = language === 'sr' ? 'sr-Latn' : language;
  document.querySelector('#language').value = language;
  document.querySelector('#language').setAttribute('aria-label', t('language'));
  document.querySelector('.workspace').setAttribute('aria-label', t('workspace'));
  gallery.setAttribute('aria-label', t('gallery'));
  outfit.setAttribute('aria-label', t('outfit'));
  composeButton.setAttribute('aria-label', t('nextView'));
  sliderTranslators.forEach(refresh => refresh());
  updateMusicUI();
  renderOutfit();
}
document.querySelector('#language').addEventListener('change', event => {
  language = event.target.value;
  try { localStorage.setItem('wmotki-language', language); } catch {}
  applyLanguage();
});
applyLanguage();
