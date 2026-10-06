// Коллаж собирается из выбранных кадров; роли определяются местом окна (slot).
const selectedItems = new Map();
const composeButton = document.querySelector('#compose');
const outfit = document.querySelector('#outfit');
const outfitCanvas = document.querySelector('#outfit-canvas');
const outfitStatus = document.querySelector('#outfit-status');
const variantNames = ['Все три верха', 'Рубашка', 'Рубашка с футболкой', 'Рубашка с курткой'];
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
    layers.push(['longsleeve', 245, 250, 440, 460]);
    if (variant === 2) layers.push(['shirt', 255, 245, 430, 420]);
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
  outfitCanvas.setAttribute('aria-label', variantNames[variant]);
  outfitCanvas.dataset.variant = String(variant + 1);
  outfit.setAttribute('aria-busy', 'false');
  const partial = assets.some(item => item.failed);
  outfitStatus.textContent = drawn ? `Вариант ${variant + 1} из 4: ${variantNames[variant]}.${partial ? ' Часть изображений не загрузилась.' : ''}` : 'Нет доступных изображений для этого варианта.';
  composeButton.title = `${variantNames[variant]}. Нажми для следующего варианта.${partial ? ' Часть изображений не загрузилась.' : ''}`;
}

composeButton.disabled = !(window.GALLERY_DATA || []).some(config => config.images.length);
composeButton.setAttribute('aria-label', 'Следующий вариант образа');
composeButton.title = 'Следующий вариант образа';
composeButton.addEventListener('click', () => {
  outfitVariant = (outfitVariant + 1) % 4;
  composeButton.setAttribute('aria-label', 'Следующий вариант образа');
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
  slider.setAttribute('aria-label', config.label);
  slider.setAttribute('aria-roledescription', 'карусель');
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
  let isHidden = false;
  let current = 0;
  let gesture = null;
  let suppressClickUntil = 0;
  let request = 0;
  function show(index) {
    if (!images.length || isHidden) return;
    current = (index + images.length) % images.length;
    const item = images[current];
    selectedItems.set(config.slot, item);
    renderOutfit();
    const token = ++request;
    image.hidden = true;
    // Быстрые нажатия не должны возвращать устаревший кадр.
    const loader = new Image();
    loader.onload = () => {
      if (token !== request) return;
      image.src = item.src;
      image.hidden = false;
      status.textContent = `${config.label}: ${current + 1} из ${images.length}`;
    };
    loader.onerror = () => {
      if (token !== request) return;
      image.hidden = true;
      status.textContent = 'Изображение недоступно. Можно перейти к следующему.';
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
  visibilityToggle.textContent = 'скрыть';
  visibilityToggle.setAttribute('aria-label', `Скрыть: ${config.label}`);
  visibilityToggle.setAttribute('aria-controls', slider.id);
  visibilityToggle.disabled = images.length === 0;
  visibilityToggle.addEventListener('click', () => {
    isHidden = !isHidden;
    request++; // Отменяем показ кадра, если его загрузка еще не закончилась.
    gesture = null;
    slider.dataset.hidden = String(isHidden);
    slider.tabIndex = isHidden ? -1 : 0;
    visibilityToggle.textContent = isHidden ? 'показать' : 'скрыть';
    visibilityToggle.setAttribute('aria-label', `${isHidden ? 'Показать' : 'Скрыть'}: ${config.label}`);
    navigationButtons.forEach(button => { button.disabled = isHidden || images.length < 2; });
    if (isHidden) {
      image.hidden = true;
      selectedItems.delete(config.slot);
      status.textContent = `${config.label}: скрыто`;
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
  if (images.length) show(Math.floor(Math.random() * images.length));
  else status.textContent = `${config.label}: пока нет изображений`;
}

// Все случайные начальные кадры выбраны: собираем первый вид один раз.
initializingSliders = false;
renderOutfit();
