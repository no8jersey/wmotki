"""Собирает списки изображений и папку dist для GitHub Pages. Зависимостей нет."""
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
SLOTS = {'hat', 'shirt', 'longsleeve', 'jacket', 'pants', 'belt', 'bag', 'shoes'}
EXTENSIONS = {'.png', '.webp', '.svg', '.jpg', '.jpeg', '.gif', '.avif'}


def natural_key(path):
    return [(0, int(part)) if part.isdigit() else (1, part.casefold())
            for part in re.split(r'(\d+)', path.name)]


def build():
    config = json.loads((ROOT / 'site.config.json').read_text(encoding='utf-8'))
    data = []
    seen = set()
    for window in config['windows']:
        slot = window['slot']
        category = window['category']
        if slot not in SLOTS or slot in seen:
            raise ValueError(f'Неизвестное или повторное место окна: {slot}')
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', category):
            raise ValueError(f'Название папки: только латиница, цифры, - и _: {category}')
        seen.add(slot)
        folder = ROOT / 'images' / category
        if not folder.is_dir():
            raise ValueError(f'Нет папки images/{category}. Создай ее или исправь site.config.json.')
        files = sorted((p for p in folder.iterdir()
                        if p.is_file() and not p.is_symlink()
                        and not p.name.startswith('.') and p.suffix.lower() in EXTENSIONS),
                       key=lambda p: (natural_key(p), p.name))
        images = [{'src': './' + quote(p.relative_to(ROOT).as_posix(), safe='/')}
                  for p in files]
        data.append({'slot': slot, 'label': window.get('label', category), 'images': images})
    if seen != SLOTS:
        raise ValueError('В настройках должны быть ровно восемь окон из схемы.')
    payload = 'window.GALLERY_DATA = ' + json.dumps(data, ensure_ascii=True, indent=2) + ';\n'
    (ROOT / 'gallery-data.js').write_text(payload, encoding='utf-8')
    output = ROOT / 'dist'
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    for name in ['index.html', 'styles.css', 'theme.css', 'script.js', 'gallery-data.js']:
        shutil.copy2(ROOT / name, output / name)
    # Служебный файл создаем сами: пустой файл мог не попасть в загрузку GitHub.
    (output / '.nojekyll').touch()
    for name in ['images', 'backgrounds', 'music']:
        source = ROOT / name
        if source.is_dir():
            shutil.copytree(source, output / name)
        else:
            (output / name).mkdir()
    print(f'Готово: {len(data)} окон, {sum(len(w["images"]) for w in data)} изображений.')


if __name__ == '__main__':
    build()
