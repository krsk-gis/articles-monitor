import requests
import os
import json
from datetime import datetime

# Az API kulcsot a GitHub titkosítva adja át
API_KEY = os.getenv('ELSEVIER_API_KEY')
BASE_URL = 'https://api.elsevier.com/content/search/scopus'

THEMES = {
    'társadalomföldrajz': '"human geography"',
    'városfejlesztés': '"urban development" OR "urban planning"',
    'demográfia': 'demography',
    'térinformatika': 'geoinformatics OR GIS',
    'border studies': '"border studies"',
    'ai a társadalomtudományokban': '("artificial intelligence" OR AI OR "machine learning") AND "social sciences"',
    'big data a tér/társadalomtudományban': '"big data" AND ("social sciences" OR "urban" OR "geography")',
    'részvételi költségvetés': '"participatory budgeting" OR "participatory budget"'
}

def fetch_scopus_data(query, sort_by):
    headers = {'X-ELS-APIKey': API_KEY, 'Accept': 'application/json'}
    params = {'query': query, 'sort': sort_by, 'count': 5}
    try:
        response = requests.get(BASE_URL, headers=headers, params=params)
        response.raise_for_status()
        entries = response.json().get('search-results', {}).get('entry', [])
        return [{
            'title': item.get('dc:title', 'Nincs cím'),
            'date': item.get('prism:coverDate', ''),
            'citations': item.get('citedby-count', '0'),
            'link': item.get('prism:url', '#')
        } for item in entries]
    except Exception as e:
        print(f"Hiba: {e}")
        return []

# Adatok lekérése
content_html = ""
for theme, en_query in THEMES.items():
    print(f"Lekérdezés: {theme}...")
    search_query = f'TITLE-ABS-KEY({en_query}) AND PUBYEAR > 2022 AND PUBYEAR < 2026'
    
    latest = fetch_scopus_data(search_query, '-coverDate')
    popular = fetch_scopus_data(search_query, '-citedby-count')
    
    # HTML szekció generálása minden témának
    content_html += f"<div class='theme-section'><h2>{theme.upper()}</h2><div class='grid'>"
    
    content_html += "<div><h3 style='color: #2e7d32;'>Legfrissebbek 🆕</h3>"
    for a in latest:
        content_html += f"<div class='article'><strong><a href='{a['link']}'>{a['title']}</a></strong><br>Dátum: {a['date']}</div>"
    content_html += "</div>"
    
    content_html += "<div><h3 style='color: #c62828;'>Legnépszerűbbek 🔥</h3>"
    for a in popular:
        content_html += f"<div class='article'><strong><a href='{a['link']}'>{a['title']}</a></strong><br><span class='citations'>Hivatkozások: {a['citations']}</span></div>"
    content_html += "</div></div></div>"

# Teljes HTML összerakása
frissitve = datetime.now().strftime("%Y. %m. %d. %H:%M")
html_template = f"""
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <title>Szakmai Monitor</title>
    <style>
        body {{ font-family: sans-serif; background: #f0f2f5; padding: 20px; }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .theme-section {{ background: white; margin-bottom: 30px; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; text-align: center; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        .article {{ font-size: 0.9em; border-left: 3px solid #1a73e8; padding-left: 10px; margin-bottom: 15px; }}
        .article a {{ color: #333; text-decoration: none; }}
        .article a:hover {{ text-decoration: underline; color: #1a73e8; }}
        .citations {{ color: #d32f2f; font-weight: bold; }}
        .update-info {{ text-align: center; color: #666; margin-bottom: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Társadalomtudományi Monitor (2023-2025)</h1>
        <div class="update-info">Utoljára automatikusan frissítve: {frissitve}</div>
        {content_html}
    </div>
</body>
</html>
"""

# HTML fájl elmentése
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_template)
print("index.html sikeresen legenerálva!")
