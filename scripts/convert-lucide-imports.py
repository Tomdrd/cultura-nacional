#!/usr/bin/env python3
"""
convert-lucide-imports.py
==========================

POR QUE ESSE SCRIPT EXISTE
----------------------------
O app usa só uma fração dos ~1.700 ícones do pacote `lucide-react-native`,
mas importar do jeito "normal" (barrel):

    import { Trophy, MapPin } from 'lucide-react-native';

faz o bundler da Web (Metro) empacotar o pacote INTEIRO de ícones — ~1,7MB
de JS morto (ver commit "perf: converter imports do lucide-react-native para
deep imports"). A solução é importar cada ícone do seu próprio arquivo:

    import Trophy from 'lucide-react-native/dist/esm/icons/trophy';
    import MapPin from 'lucide-react-native/dist/esm/icons/map-pin';

Esse script AUTOMATIZA essa conversão, pra ninguém precisar lembrar da regra
na mão sempre que adicionar um ícone novo.

COMO USAR (sempre que adicionar um ícone novo)
------------------------------------------------
1. Importe o ícone do jeito normal, como sempre:

       import { NovoIcone } from 'lucide-react-native';

2. Rode este script a partir da raiz do projeto:

       python3 scripts/convert-lucide-imports.py

3. Ele encontra esse import, converte pra import direto automaticamente,
   e avisa se algum ícone não for encontrado (nesse caso, veja a seção
   "ícones com nome irregular" abaixo).

O script é seguro de rodar a qualquer momento — se não houver nenhum import
"barrel" (`from 'lucide-react-native'`) pra converter, ele não faz nada.

ÍCONES COM NOME IRREGULAR
----------------------------
A maioria dos ícones segue a regra "PascalCase -> kebab-case"
(ex: BadgeCheck -> badge-check.mjs). Mas alguns ícones do Lucide têm nomes
"antigos"/alias que não batem com o arquivo real do pacote (ex: `Home` é na
verdade o arquivo `house.mjs`, porque o ícone foi renomeado pelo Lucide em
algum momento, mas o alias antigo continua funcionando por compatibilidade).

Esses casos ficam na tabela MANUAL_OVERRIDES abaixo. Se o script avisar que
não encontrou o arquivo de um ícone novo, é só:
  1. Rodar: ls node_modules/lucide-react-native/dist/esm/icons/ | grep -i <parte-do-nome>
  2. Achar o nome correto do arquivo
  3. Adicionar uma linha em MANUAL_OVERRIDES abaixo
  4. Rodar o script de novo
"""

import re
import os
import sys

# Ícones cujo nome usado no import NÃO bate com o nome do arquivo no pacote
# (descobertos e validados manualmente — ver docstring acima)
MANUAL_OVERRIDES = {
    'AlertTriangle': 'triangle-alert',
    'CheckCircle': 'circle-check',
    'Home': 'house',
    'Mic2': 'mic-vocal',
    'Share2': 'share-2',
    'Trash2': 'trash-2',
    'Volume2': 'volume-2',
    'XCircle': 'circle-x',
}

ICONS_DIR = 'node_modules/lucide-react-native/dist/esm/icons'
SRC_DIR = 'src'
BARREL_PATTERN = re.compile(r"^import\s*\{([^}]+)\}\s*from\s*'lucide-react-native'\s*;?\n?", re.MULTILINE)


def to_kebab(name: str) -> str:
    return re.sub(r'(?<!^)(?=[A-Z])', '-', name).lower()


def kebab_for(icon: str) -> str:
    return MANUAL_OVERRIDES.get(icon, to_kebab(icon))


def find_ts_files(root: str):
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in filenames:
            if fn.endswith('.d.ts'):
                continue  # declarações de tipo — nunca mexer (podem ter exemplos em comentários)
            if fn.endswith('.tsx') or fn.endswith('.ts'):
                yield os.path.join(dirpath, fn)


def main():
    if not os.path.isdir(ICONS_DIR):
        print(f"❌ Não encontrei {ICONS_DIR}. Rode este script a partir da raiz do projeto (onde fica node_modules).")
        sys.exit(1)

    changed_files = []
    warnings = []

    for path in find_ts_files(SRC_DIR):
        with open(path, encoding='utf-8') as fh:
            content = fh.read()

        match = BARREL_PATTERN.search(content)
        if not match:
            continue

        names = [n.strip() for n in match.group(1).split(',') if n.strip()]
        lines = []
        file_ok = True

        for n in names:
            if ' as ' in n:
                base, alias = [p.strip() for p in n.split(' as ')]
                local_name = alias
            else:
                base = n.strip()
                local_name = base

            kebab = kebab_for(base)
            icon_path = os.path.join(ICONS_DIR, f'{kebab}.mjs')

            if not os.path.exists(icon_path):
                warnings.append(
                    f"⚠️  {path}: ícone '{base}' -> tentei '{kebab}.mjs' mas não existe.\n"
                    f"     Rode: ls {ICONS_DIR} | grep -i {base.lower()[:6]}\n"
                    f"     E adicione o nome correto em MANUAL_OVERRIDES neste script."
                )
                file_ok = False
                continue

            lines.append(f"import {local_name} from 'lucide-react-native/dist/esm/icons/{kebab}';")

        if not file_ok:
            # Não mexe no arquivo se algum ícone não foi resolvido —
            # melhor deixar o import antigo (funcional) do que quebrar o build.
            continue

        replacement = '\n'.join(lines) + '\n'
        new_content = BARREL_PATTERN.sub(replacement, content, count=1)

        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        changed_files.append(path)

    print()
    if changed_files:
        print(f"✅ {len(changed_files)} arquivo(s) convertido(s):")
        for f in changed_files:
            print(f"   {f}")
    else:
        print("✅ Nenhum import 'barrel' encontrado — nada para converter (tudo já está usando deep imports).")

    if warnings:
        print()
        print(f"⚠️  {len(warnings)} aviso(s) — ícones não convertidos automaticamente:")
        for w in warnings:
            print(w)
        sys.exit(1)


if __name__ == '__main__':
    main()
