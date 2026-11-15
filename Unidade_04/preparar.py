"""Gera a base da aplicação sem copiar as instruções completas de preparo."""
import ast
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path
from urllib.parse import urlsplit

def norm(t):
    return unicodedata.normalize("NFKD", t.lower()).encode("ascii", "ignore").decode()

def lista(row, chave):
    return ast.literal_eval(row[chave]) if row[chave] else []

# Cada chave é um utensílio. Os aliases aceitam nomes de consulta e são usados na
# leitura do preparo. Os termos genéricos são sinais, não requisitos confirmados.
ALIASES = {
    "forno": ["forno elétrico", "forno a gás", "fornos"],
    "liquidificador": ["liquidificadores"],
    "micro-ondas": ["microondas"],
    "air fryer": ["airfryer", "fritadeira elétrica", "fritadeira sem óleo"],
    "panela de pressão": ["panela de pressão elétrica", "panela pressão", "panelas de pressão"],
    "frigideira": ["frigideira funda", "frigideiras fundas", "frigideira antiaderente"],
    "fouet": ["batedor de arame", "batedor manual"],
    "tigela": ["bowl"],
    "processador de alimentos": ["processador", "multiprocessador"],
    "espremedor de batata": ["Expremedor de Batata"],
    "espremedor de limão": ["Expremedor de Limão"],
    "espremedor de alho": ["Expremedor de alho"],
}
INDICIOS = {
    "forno": r"\bpre[- ]?aquec\w*\b.{0,24}\b\d{2,3}\s*graus\b",
    "panela de pressão": (
        r"\b(?:peg(?:ar|ue|ou)|ating(?:ir|iu)|comec(?:ar|ou) a pegar|"
        r"sai(?:r|u)|perde(?:r|u)|liber(?:ar|ou)|retir(?:ar|ou))\s+(?:a\s+)?pressao\b"
        r"|\b(?:na|sob) pressao\b"
    ),
}
TROCAS_HIFEN = str.maketrans({"-": " ", "–": " ", "—": " "})

def frase(nome):
    return " ".join(norm(nome).translate(TROCAS_HIFEN).split())

def variantes(nome):
    palavras = frase(nome).split()
    if not palavras:
        return []
    # Plural simples para os substantivos usuais. Irregulares entram nos aliases.
    p = palavras[0]
    if p.endswith(("a", "e", "i", "o", "u")):
        return [" ".join(palavras), " ".join([p + "s", *palavras[1:]])]
    return [" ".join(palavras)]

def catalogar(linhas):
    originais = sorted({u for r in linhas for u in lista(r, "Utensílios")})
    agrupados = {k: {k, *v} for k, v in ALIASES.items()}
    equivalencias = {frase(v): k for k, vs in agrupados.items() for v in vs}
    for u in originais:
        k = equivalencias.get(frase(u), u.lower())
        agrupados.setdefault(k, set()).add(u)
    return {k: sorted({v for u in nomes for v in variantes(u)})
            for k, nomes in sorted(agrupados.items())}

def regex_termo(alternativas):
    return re.compile(r"\b(?:" + "|".join(map(re.escape, alternativas)) + r")\b")

def principal():
    origem = Path(sys.argv[1])
    dados = []
    vistos = set()
    with origem.open(encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f))
    catalogo = catalogar(linhas)
    padroes = {nome: regex_termo(alts) for nome, alts in catalogo.items()}
    extras = {nome: re.compile(pat) for nome, pat in INDICIOS.items()}
    for r in linhas:
        url = r["URL da receita"]
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "www.tudogostoso.com.br" or not parsed.path.startswith("/receita/") or url in vistos:
            continue
        vistos.add(url)
        ingredientes = lista(r, "Ingredientes")
        passos = lista(r, "Etapas do preparo")
        ute = lista(r, "Utensílios")
        trechos = [frase(t) for t in [r["Título"], *passos, *ute]]
        sinais = [nome for nome, pat in padroes.items()
                  if any(pat.search(t) or (nome in extras and extras[nome].search(t)) for t in trechos)]
        if ("forno" not in sinais and not {"air fryer", "micro-ondas"} & set(sinais)
                and any(re.match(r"asse (?:por|ate|em)\b", frase(t))
                        and not re.search(r"\b(?:frigideira|panela|fogao|banho maria)\b", frase(t))
                        for t in passos)):
            sinais.append("forno")
        dados.append(dict(titulo=r["Título"], url=url, categorias=lista(r,"Categorias"),
                          tempo=r["Tempo de preparo"], ingredientes=ingredientes,
                          sinais=sinais, preparo=bool(passos), tokens=sorted(lista(r,"tokens_sem_stopwords"))))
    web = Path(__file__).parent / "web"
    dest = web / "receitas.json"
    dest.write_text(json.dumps(dados, ensure_ascii=False,separators=(",",":")), encoding="utf-8")
    (web / "utensilios.mjs").write_text(
        "// Gerado por preparar.py a partir do CSV da Unidade 3.\nexport const CATALOGO = "
        + json.dumps(catalogo, ensure_ascii=False, separators=(",",":")) + ";\n",
        encoding="utf-8")
    print(f"{len(catalogo)} categorias de utensílios no catálogo.")
    print(f"{len(dados)} receitas → {dest}")

if __name__ == "__main__":
    principal()
