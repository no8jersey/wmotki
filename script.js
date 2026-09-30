// gallery-data.js создается автоматически из папок при публикации.
const gallery = document.querySelector('#gallery');
for (const config of window.GALLERY_DATA || []) {
  const slider = document.createElement('section');
  slider.className = 'slider';
  slider.style.gridArea = config.slot;
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
  let current = 0;
  let gesture = null;
  let suppressClickUntil = 0;
  let request = 0;
  function show(index) {
    if (!images.length) return;
    current = (index + images.length) % images.length;
    const item = images[current];
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
    slider.append(button);
  }
  slider.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  slider.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || images.length < 2) return;
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
  gallery.append(slider);
  if (images.length) show(0);
  else status.textContent = `${config.label}: пока нет изображений`;
}
