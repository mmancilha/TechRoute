import re
from pathlib import Path

INDEX = Path(__file__).resolve().parents[1] / 'frontend' / 'index.html'

def main():
    html = INDEX.read_text(encoding='utf-8')
    errors = []

    # Check lang attribute
    if 'lang="en-CA"' not in html:
        errors.append('Missing or incorrect html lang="en-CA"')

    # Check content-language meta
    if 'content-language" content="en-CA"' not in html:
        errors.append('Missing meta content-language en-CA')

    # Basic heuristic check: ensure no common Portuguese phrases remain
    pt_terms = [
        'Gerenciamento de Visitas Técnicas', 'Novo Agendamento', 'Nome do Cliente',
        'Localização', 'Técnico Designado', 'Tipo de Serviço', 'Data da Visita',
        'Hora da Visita', 'Agendar Visita', 'Selecione', 'Instalação',
        'Manutenção Preventiva', 'Reparo Urgente'
    ]
    for term in pt_terms:
        if term in html:
            errors.append(f'Found non-English term: {term}')

    if errors:
        print('Localization check FAILED:')
        for e in errors:
            print(' -', e)
        raise SystemExit(1)
    else:
        print('Localization check PASSED: en-CA tags and English content confirmed.')

if __name__ == '__main__':
    main()