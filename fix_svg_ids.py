#!/usr/bin/env python3
"""
Corrige colisão de IDs entre arquivos SVG de bandeiras estaduais.
Prefixa todo id="..." interno com a sigla do estado (extraída do nome do arquivo)
e atualiza as referências correspondentes: url(#id), href="#id", xlink:href="#id".
"""
import re
import sys
import shutil
from pathlib import Path


def fix_svg_ids(filepath: Path) -> int:
    uf = filepath.stem.lower()
    prefix = f"{uf}-"

    text = filepath.read_text(encoding="utf-8")

    ids = sorted(set(re.findall(r'id="([^"]+)"', text)))
    if not ids:
        print(f"  [{filepath.name}] nenhum id encontrado, pulando.")
        return 0

    ids = [i for i in ids if not i.startswith(prefix)]
    if not ids:
        print(f"  [{filepath.name}] ids já prefixados, pulando.")
        return 0

    new_text = text
    for old_id in ids:
        new_id = f"{prefix}{old_id}"
        new_text = re.sub(rf'id="{re.escape(old_id)}"', f'id="{new_id}"', new_text)
        new_text = re.sub(rf'url\(#{re.escape(old_id)}\)', f'url(#{new_id})', new_text)
        new_text = re.sub(rf'url\("#{re.escape(old_id)}"\)', f'url("#{new_id}")', new_text)
        new_text = re.sub(rf'(?<!xlink:)href="#{re.escape(old_id)}"', f'href="#{new_id}"', new_text)
        new_text = re.sub(rf'xlink:href="#{re.escape(old_id)}"', f'xlink:href="#{new_id}"', new_text)

    filepath.write_text(new_text, encoding="utf-8")
    print(f"  [{filepath.name}] {len(ids)} id(s) prefixado(s) com '{prefix}'")
    return len(ids)


def main(paths):
    total = 0
    for p in paths:
        fp = Path(p)
        if not fp.exists():
            print(f"  [{p}] arquivo não encontrado!")
            continue
        backup = fp.with_suffix(fp.suffix + ".bak")
        shutil.copy2(fp, backup)
        total += fix_svg_ids(fp)
    print(f"\nTotal de ids corrigidos: {total}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 fix_svg_ids.py <arquivo1.svg> <arquivo2.svg> ...")
        sys.exit(1)
    main(sys.argv[1:])
