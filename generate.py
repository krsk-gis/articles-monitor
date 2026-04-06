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
    params = {'query': query, 'sort': sort_by, 'count': 10} # 10 cikkre állítva
    try:
        response = requests.get(BASE_URL, headers=headers, params=params)
        response.raise_for_status()
        entries = response.json().get('search-results', {}).get('entry', [])
        
        results = []
        for item in entries:
            # 1. Kikeressük az igazi, böngészőben is megnyitható Scopus linket
            scopus_link = '#'
            for link_obj in item.get('link', []):
                if link_obj.get('@ref') == 'scopus':
                    scopus_link = link_obj.get('@href')
                    break
            
            # 2. Hozzáadjuk a listához
            results.append({
                'title': item.get('dc:title', 'Nincs cím'),
                'date': item.get('prism:coverDate', ''),
                'citations': item.get('citedby-count', '0'),
                'link': scopus_link
            })
        return results
    except Exception as e:
        print(f"Hiba: {e}")
        return []

# Adatok lekérése
content_html = ""
for theme, en_query in THEMES.items():
    print(f"Lekérdezés: {theme}...")
    search_query = f'TITLE-ABS-KEY({en_query}) AND PUBYEAR > 2021 AND PUBYEAR < 2026'
    
    latest = fetch_scopus_data(search_query, '-coverDate')
    popular = fetch_scopus_data(search_query, '-citedby-count')
    
    # HTML szekció generálása minden témának
    content_html += f"<div class='theme-section'><h2>{theme.upper()}</h2><div class='grid'>"
    
    content_html += "<div><h3 class='title-latest'>Legfrissebbek 🆕</h3>"
    for a in latest:
        content_html += f"<div class='article'><strong><a href='{a['link']}' target='_blank'>{a['title']}</a></strong><br><span class='date-info'>Dátum: {a['date']}</span></div>"
    content_html += "</div>"
    
    content_html += "<div><h3 class='title-popular'>Legnépszerűbbek 🔥</h3>"
    for a in popular:
        content_html += f"<div class='article'><strong><a href='{a['link']}' target='_blank'>{a['title']}</a></strong><br><span class='citations'>Hivatkozások: {a['citations']}</span></div>"
    content_html += "</div></div></div>"

# Teljes HTML összerakása (SÖTÉT TÉMA CSS)
frissitve = datetime.now().strftime("%Y. %m. %d. %H:%M")
html_template = f"""
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cikk monitor</title>
    <style>
        /* Sötét téma alapok */
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #121212; color: #e0e0e0; padding: 20px; margin: 0; line-height: 1.5; }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        
        /* Kártyák sötétben */
        .theme-section {{ background: #1e1e1e; margin-bottom: 30px; border-radius: 10px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid #333; }}
        
        /* Címsorok */
        h1 {{ color: #64b5f6; border-bottom: 2px solid #64b5f6; padding-bottom: 10px; text-align: center; margin-bottom: 30px; }}
        h2 {{ color: #ffffff; border-bottom: 1px solid #444; padding-bottom: 10px; margin-top: 0; font-size: 1.5em; }}
        .title-latest {{ color: #81c784; }} /* Pasztell zöld */
        .title-popular {{ color: #e57373; }} /* Pasztell piros */
        
        /* Rács és cikkek */
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }}
        @media (max-width: 900px) {{ .grid {{ grid-template-columns: 1fr; }} }} /* Mobilon egymás alá kerülnek */
        
        .article {{ font-size: 0.95em; border-left: 3px solid #64b5f6; padding-left: 12px; margin-bottom: 18px; }}
        
        /* Linkek */
        .article a {{ color: #e0e0e0; text-decoration: none; font-weight: 500; transition: color 0.2s; }}
        .article a:hover {{ text-decoration: underline; color: #90caf9; }}
        
        /* Címkék */
        .citations {{ display: inline-block; background: #3e2723; color: #ff8a80; padding: 3px 8px; border-radius: 4px; font-weight: bold; margin-top: 5px; font-size: 0.85em; border: 1px solid #5d4037; }}
        .date-info {{ color: #9e9e9e; font-size: 0.85em; }}
        
        /* Lábjegyzet */
        .update-info {{ text-align: center; color: #9e9e9e; margin-bottom: 30px; font-style: italic; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Társadalomtudományi monitor (2022-2025)</h1>
        <div class="update-info">Utoljára automatikusan frissítve: {frissitve}</div>
        {content_html}
    </div>
</body>
</html>
"""

# HTML fájl elmentése
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_template)
print("index.html sikeresen legenerálva sötét témával!")
