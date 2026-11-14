#!/usr/bin/env python3
"""Arma las páginas de la web: src/pages/*.html + partes compartidas (src/partials) -> *.html en la raíz, EN DOS IDIOMAS.

Cada página empieza con un comentario de cabecera:
<!--
title: ...
description: ...
title_i18n: index.docTitle              (clave del diccionario con el título; la versión en español lo saca de ahí)
title_es: ...                           (o el título en español escrito aquí, si no hay clave)
description_es: ...                     (descripción en español; vacía en las páginas noindex)
styles: css/pages/lentes.css            (opcional, separados por coma)
i18n: js/i18n/lentes.js                 (opcional)
scripts: js/pages/lentes.js             (opcional)
canonical: js                           (opcional: la página NO lleva canónica fija; su script la escribe, p. ej. producto.html?id=)
central: marca                          (opcional: la página es SOLO una plantilla; no se publica: sale como tpl/marca.html y el
                                         Central escribe con ella sus páginas, p. ej. una por marca o una por estilo)
-->
y luego el <main> de la página; dentro, {{lens_demo}} inserta la lente de muestra (src/partials/lens_demo.html).

IDIOMAS (11/09, regla de Armando: "la misma página trae los dos idiomas, se traduce y ya; mi página principal en inglés"):
la web es UNA, en inglés, y el botón EN | ES la traduce en el sitio (js/main.js), como siempre. Aparte, cada página que
se indexa tiene una COPIA en español, x.es.html, con el texto ya escrito en el HTML: existe solo para que una búsqueda
en español pueda encontrar la web (Google, Bing y las IA leen el HTML tal cual; el español que pone el botón no lo ven).
La copia se saca de la inglesa aplicando el diccionario (js/i18n.js + los js/i18n/*.js de la página, leídos con node
para que valgan exactamente lo que en el navegador) a lo que lleva data-i18n / data-i18n-html / data-i18n-aria /
data-i18n-ph, y pasando a copias sus enlaces a otras páginas que la tengan. Las dos se declaran con hreflang. Sin copia:
las páginas noindex (carrito, pago, gracias, 404), la ficha (producto.html: una página por armazón, en inglés) y legal.html.
Correr:  python3 build.py
"""
import html as _html
import json
import re
import subprocess
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = "https://houseofeyeglasses.com/"
# Cache-bust: Porkbun's CDN and browsers keep css/js for 30 days (max-age=2592000); the CDN keys by full URL (query included),
# so every local css/js reference carries ?v=ASSET_V and a new version means a fresh file for everyone. Bump it when css/js change.
ASSET_V = "20261114a"
# Google Analytics 4 (Armando 11/05, chequeo 1 de 30): el ID de medición "G-…" vive SOLO aquí; vacío = la web no carga Analytics.
# Lo pone Armando desde analytics.google.com (Admin → Flujos de datos → web → ID de medición). Eventos: js/cart.js y js/pages/gracias.js.
GA_ID = "G-V0LM7KG67S"
GA_SNIPPET = ('\n  <script async src="https://www.googletagmanager.com/gtag/js?id={id}"></script>\n  <script>window.dataLayer=window.dataLayer||[];'
              'function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{id}");</script>')
_BUST = re.compile(r'((?:href|src)=")((?:css|js)/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')
TWINS = set()                            # the pages that have a Spanish copy: the indexed ones (filled by build())


def bust(html):
    return _BUST.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={ASSET_V}"', html)


P = ROOT / "src" / "partials"
part = {n: (P / f"{n}.html").read_text() for n in ("head", "header", "footer", "drawer", "scripts", "lens_demo")}
# the home page preloads the hero photo; every other page leaves the slot empty. A phone held upright gets the centre of
# the photo alone (hero-woman-phone.webp, 92 KB instead of 600): HERO_PHONE is the condition of the <source> of the hero in
# src/pages/index.html (build() checks they are the same), and each preload carries it so no phone downloads both
HERO_PHONE = "(max-width: 860px) and (max-aspect-ratio: 3/5)"
PRELOAD = ('\n  <link rel="preload" as="image" href="assets/img/hero-woman-phone.webp" type="image/webp" media="' + HERO_PHONE + '" fetchpriority="high">'
           '\n  <link rel="preload" as="image" href="assets/img/hero-woman-2x.jpg" imagesrcset="assets/img/hero-woman-2x.jpg 1x, assets/img/hero-woman@2x.jpg 2x" '
           'media="not all and ' + HERO_PHONE + '" fetchpriority="high">')


def tags(value, kind):
    out = []
    for v in [x.strip() for x in (value or "").split(",") if x.strip()]:
        out.append(f'\n  <link rel="stylesheet" href="{v}">' if kind == "css" else f'  <script src="{v}"></script>\n')
    return "".join(out)


# ---------------------------------------------------------------------------------------------------------------------
# dictionaries: the same objects the browser builds (js/i18n.js, then the page's own js/i18n/*.js, in that order)
# ---------------------------------------------------------------------------------------------------------------------
_dicts = {}


def dictionary(files):
    key = tuple(files)
    if key not in _dicts:
        js = ("global.window={};" + "".join(f"require({json.dumps(str(ROOT / f))});" for f in files)
              + "process.stdout.write(JSON.stringify(window.HOE_I18N));")
        try:
            run = subprocess.run(["node", "-e", js], capture_output=True, text=True)
        except FileNotFoundError:
            raise SystemExit("build.py: hace falta node para leer los diccionarios js/i18n*.js (no está en el PATH)")
        if run.returncode:
            raise SystemExit("build.py: node no pudo leer los diccionarios:\n" + run.stderr)
        _dicts[key] = json.loads(run.stdout)
    return _dicts[key]


# ---------------------------------------------------------------------------------------------------------------------
# the Spanish twin of a built page
# ---------------------------------------------------------------------------------------------------------------------
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
_PAGE = re.compile(r"^([a-z0-9][a-z0-9_-]*)\.html(?=$|[?#])", re.I)      # a link to another page of the site (root level, relative)
_ENDTAG = re.compile(r"</\s*[a-zA-Z][^\t\n\r\f />\x00]*\s*>")
_HREF = re.compile(r'(<a\b[^>]*?\shref=")([^"]*)(")', re.I)


def es_href(h):
    """x.html → x.es.html (query and #anchor kept) when x has a Spanish copy; anything else stays."""
    m = _PAGE.match(h or "")
    if not m or (m.group(1).lower() + ".html") not in TWINS:
        return h
    return h[:m.end(1)] + ".es.html" + h[m.end():]


class Twin(HTMLParser):
    """Rewrites a built page WITHOUT touching anything it is not asked to: with `t` (a dictionary) the content of every
    element that carries data-i18n (text) / data-i18n-html (markup) and the aria-label / placeholder of data-i18n-aria /
    data-i18n-ph become that language; with links=True the links to other pages go to their .es.html twins. With an
    empty dictionary and links=False the page must come back byte for byte: build() checks that on every page, so a
    construct this parser would mangle stops the build instead of reaching the web."""

    def __init__(self, t=None, links=False):
        super().__init__(convert_charrefs=False)
        self.t, self.links, self.out, self.skip, self._end = t or {}, links, [], None, None

    @staticmethod
    def _set(raw, name, value):
        esc = _html.escape(value, quote=True)
        pat = re.compile(r"(\s" + re.escape(name) + r"\s*=\s*)(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.I)
        if pat.search(raw):
            return pat.sub(lambda m: m.group(1) + '"' + esc + '"', raw, count=1)
        close = "/>" if raw.endswith("/>") else ">"
        return raw[:-len(close)].rstrip() + f' {name}="{esc}"' + close

    def _start(self, tag, attrs, selfclosed):
        raw = self.get_starttag_text()
        if self.skip:
            if not selfclosed and tag not in VOID:
                self.skip[1] += 1
            return
        a, t = dict(attrs), self.t
        if a.get("data-i18n-aria") in t:
            raw = self._set(raw, "aria-label", t[a["data-i18n-aria"]])
        if a.get("data-i18n-ph") in t:
            raw = self._set(raw, "placeholder", t[a["data-i18n-ph"]])
        if self.links and tag == "a" and a.get("href") and es_href(a["href"]) != a["href"]:
            raw = self._set(raw, "href", es_href(a["href"]))
        self.out.append(raw)
        new = None
        if a.get("data-i18n") in t:
            new = _html.escape(t[a["data-i18n"]], quote=False)                       # main.js: el.textContent = v
        if a.get("data-i18n-html") in t:                                             # main.js: el.innerHTML = v (it wins)
            new = t[a["data-i18n-html"]]
            if self.links:
                new = _HREF.sub(lambda m: m.group(1) + es_href(m.group(2)) + m.group(3), new)
        if new is not None and not selfclosed and tag not in VOID:
            self.out.append(new)
            self.skip = [tag, 1]                                                     # the old content is dropped up to its end tag

    def handle_starttag(self, tag, attrs):
        self._start(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._start(tag, attrs, True)

    def parse_endtag(self, i):                                                       # keep the end tag as written (</linearGradient>)
        m = _ENDTAG.match(self.rawdata, i)
        self._end = m.group(0) if m else None
        return super().parse_endtag(i)

    def handle_endtag(self, tag):
        raw = self._end or f"</{tag}>"
        if self.skip:
            if tag in VOID:
                return
            self.skip[1] -= 1
            if self.skip[1] > 0:
                return
            self.skip = None
        self.out.append(raw)

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)

    def handle_entityref(self, name):
        if not self.skip:
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self.skip:
            self.out.append(f"&#{name};")

    def handle_comment(self, data):
        if not self.skip:
            self.out.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")

    def handle_pi(self, data):
        self.out.append(f"<?{data}>")

    def unknown_decl(self, data):
        self.out.append(f"<![{data}]>")


def rewrite(page, t=None, links=False):
    p = Twin(t, links)
    p.feed(page)
    p.close()
    return "".join(p.out)


# ---------------------------------------------------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------------------------------------------------
def url(name, lang):
    """public URL of a page in a language: index.html is the bare domain in English."""
    if lang == "es":
        return SITE + name[:-5] + ".es.html"
    return SITE + ("" if name == "index.html" else name)


def head_for(name, meta, lang, title, description, ssr=False):
    """the <head> of a page in a language. ssr=True: the head of the TEMPLATE the Central fills once per frame (tpl/):
    title and description are tokens and everything that belongs to one frame (canonical, og, JSON-LD…) is {{ssr:head}}."""
    if ssr:
        title, description, links, ogurl = "{{ssr:title}}", "{{ssr:desc}}", "\n  {{ssr:head}}", ""
    elif meta.get("canonical") == "js":
        # every ?id= of a `canonical: js` page is its own page: its script writes canonical + og:url once it knows which
        # one (a fixed canonical there told Google that all 6,500 frames were the same page whenever the script had not run)
        links, ogurl = "", ""
    else:
        links = f'\n  <link rel="canonical" href="{url(name, lang)}">'
        if name in TWINS:                                            # a page with a Spanish copy declares the pair
            links += (f'\n  <link rel="alternate" hreflang="en" href="{url(name, "en")}">'
                      f'\n  <link rel="alternate" hreflang="es" href="{url(name, "es")}">'
                      f'\n  <link rel="alternate" hreflang="x-default" href="{url(name, "en")}">')
        ogurl = f'\n  <meta property="og:url" content="{url(name, lang)}">'
    head = (part["head"].replace("{{lang}}", lang).replace("{{locale}}", "es_US" if lang == "es" else "en_US")
            .replace("{{title}}", title).replace("{{description}}", description)
            .replace("{{links}}", links).replace("{{ogurl}}", ogurl).replace("{{page}}", name[:-5])
            .replace("{{robots}}", f'\n  <meta name="robots" content="{meta["robots"]}">' if meta.get("robots") and not ssr else "")
            .replace("{{styles}}", tags(meta.get("styles"), "css"))
            .replace("{{preload}}", PRELOAD if name == "index.html" else "")
            .replace("{{ga}}", GA_SNIPPET.format(id=GA_ID) if GA_ID else ""))
    if ssr:
        # the frame's own og:type / og:image come inside {{ssr:head}}: the site-wide ones leave the template
        for prop in ("og:type", "og:image", "og:image:width", "og:image:height"):
            head, n = re.subn(r'\n  <meta property="' + re.escape(prop) + r'"[^\n]*', "", head)
            if n != 1:
                raise SystemExit(f"build.py: la plantilla esperaba una etiqueta {prop} en head.html y halló {n}")
        if head.count("{{ssr:head}}") != 1 or head.count("{{ssr:title}}") != 2 or head.count("{{ssr:desc}}") != 2:
            raise SystemExit("build.py: la cabecera de la plantilla no quedó con sus marcas (title ×2, desc ×2, head ×1)")
    return head


_FAQ = re.compile(r'<details class="faq-item"[^>]*>\s*<summary>\s*<span class="faq-q"[^>]*>(.*?)</span>.*?</summary>\s*'
                  r'<div class="faq-a"[^>]*>(.*?)</div>\s*</details>', re.S)


def _plain(s):
    """the text of a piece of HTML, as a reader sees it"""
    return re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def structured(page, lang):
    """JSON-LD the build writes from what the page itself shows, in the page's language (one source: the visible HTML):
    · FAQPage with the questions and answers of the page (its .faq-item blocks);
    · BreadcrumbList for the lens and face pages (main[data-tp]): home → the page its kicker links to → the page.
    It goes right before </head>; a page that already declares one of them keeps its own."""
    blocks = []
    if "FAQPage" not in page:
        qa = [(q, a) for q, a in ((_plain(q), _plain(a)) for q, a in _FAQ.findall(page)) if q and a]
        if qa:
            blocks.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]})
    top = re.search(r'<main id="main" class="tp[^"]*" data-tp="[^"]*">(.*?)</header>', page, re.S)
    if top and "BreadcrumbList" not in page:
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", top.group(1), re.S)
        up = re.search(r'<p class="kicker"><a href="([a-z0-9.-]+\.html)"[^>]*>(.*?)</a></p>', top.group(1), re.S)
        if h1 and _plain(h1.group(1)):
            trail = [("House of Eyeglasses", url("index.html", lang))]
            if up and _plain(up.group(2)):
                trail.append((_plain(up.group(2)), SITE + up.group(1)))
            trail.append((_plain(h1.group(1)), None))
            blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                dict({"@type": "ListItem", "position": i + 1, "name": n}, **({"item": u} if u else {})) for i, (n, u) in enumerate(trail)]})
    if not blocks:
        return page
    # the questions go in #faq-schema: the help page's script (js/pages/ayuda.js) rewrites THAT tag in the visitor's language
    # instead of adding a second FAQPage
    tags_ld = "".join('  <script type="application/ld+json"' + (' id="faq-schema"' if b["@type"] == "FAQPage" else "") + ">"
                      + json.dumps(b, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>\n" for b in blocks)
    if page.count("</head>") != 1:
        raise SystemExit("build.py: structured(): la página no tiene exactamente un </head>")
    return page.replace("</head>", tags_ld + "</head>", 1)


def sitemap_pages(names):
    """sitemap-pages.xml: the fixed pages that are indexed, each with its Spanish copy and the hreflang pair, + legal.html.
    The Central keeps this file exactly as it finds it (lib/optica/export._sitemap_pages_xml) and writes only the
    products' sitemap."""
    today = date.today().isoformat()
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for name in names:
        alts = "".join(f'<xhtml:link rel="alternate" hreflang="{hl}" href="{url(name, l)}"/>'
                       for hl, l in (("en", "en"), ("es", "es"), ("x-default", "en")))
        for lang in ("en", "es"):
            out.append(f"  <url><loc>{url(name, lang)}</loc>{alts}<lastmod>{today}</lastmod></url>")
    out.append(f"  <url><loc>{SITE}legal.html</loc><lastmod>{today}</lastmod></url>")
    (ROOT / "sitemap-pages.xml").write_text("\n".join(out) + "\n</urlset>\n")


# the contract with lib/optica/paginas.py. "photo" (the first photo as a real <img>) and "img" (the slot of the template before
# 11/13) sit together: today's Central fills the first and leaves the second empty, an older one does the opposite
SSR = ("data", "photo", "img", "kicker", "name", "price", "color", "swatches", "size", "stock", "about", "details", "also")
# a few awkward names for the slug rule: the Central checks its own slug() against what js/catalog.js answers for these
SLUG_CASES = [["Gucci", "GG1737O", "002", "HOE-M-512"], ["L.G.R.", "CAIRO", "01", "HOE-M-2910"], ["Tom Ford", "FT5991-F-B", "055", "HOE-W-3773"],
              ["Off-White", "OERJ059 STYLE 59", "1000", "HOE-M-174"], ["Salvatore Ferragamo", "SF2939N", "617", "HOE-W-9"],
              ["M Missoni", "MMI 0093", "035J00", "HOE-W-114"], ["Fossil", "FOS 7116/G", "063M00", "HOE-M-2844"],
              ["Chloé", "CH0228O", "006", "HOE-W-1"], ["Dolce & Gabbana", "DG 3 3 4 5", "", "HOE-K-7"], ["", "", "", "HOE-S-3"],
              ["RETROSUPERFUTURE", "NUMERO 135", "KCR", "HOE-M-302"], ["Kenneth Cole New York", "KC50003 — matte/black", "0 0 2", "HOE-M-1"],
              ["Brand " + "x" * 90, "Model", "C1", "HOE-M-99999"]]


# ---------------------------------------------------------------------------------------------------------------------
# the style pages the Central writes with tpl/estilo.html (<word>-glasses.html) and their index (styles.html): which values
# of which attribute of a frame get a page, in which order, with which word in the address and which filter of the catalog
# shows them all. This table is the ONLY place where those addresses are decided: it travels in tpl/ssr.json, the Central
# (lib/optica/paginas.py) reads it there and nothing in the browser ever builds one (a frame's page brings the links it
# needs: pdp-data.styles). The texts come from the dictionary: the value's own word (shape.* · mat.* · rim.* · color.*)
# and the patterns of js/i18n/estilo.js.
# ---------------------------------------------------------------------------------------------------------------------
STYLE_MIN, STYLE_MAX = 6, 240                 # frames in stock a style needs to have a page · frames one page lists
STYLE_WORD = {"rect": "rectangle", "cateye": "cat-eye", "geo": "geometric", "full": "full-rim", "half": "half-rim",
              "transparent": "clear", "men": "mens", "women": "womens"}     # value → its word in the address when it is not the value itself
STYLE_MATERIALS = ("acetate", "metal", "titanium", "tr90")                   # not "mixed" / "other"
STYLE_RIMS = ("full", "half", "rimless")
STYLE_GENDERS = ("men", "women")                                             # gender × shape (womens-cat-eye-glasses.html)
STYLE_SUFFIX = "-glasses.html"
_WORD = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def estilos(en, es, consts, taken):
    """The table of the style pages for tpl/ssr.json. A value is [value, word in the address, key of its word in the
    dictionary]. `taken` = the pages the web already has: no style may land on one of them."""
    word = lambda v: STYLE_WORD.get(v, v)
    fams = [
        {"fam": "shape", "attr": "sh", "param": "shape", "head": "catalogo.f.shape",
         "vals": [[v, word(v), consts["shapes"][v]] for v in consts["shapeOrder"]]},
        {"fam": "material", "attr": "mat", "param": "material", "head": "catalogo.f.material",
         "vals": [[v, word(v), "mat." + v] for v in STYLE_MATERIALS]},
        {"fam": "rim", "attr": "rim", "param": "rim", "head": "catalogo.f.rim",
         "vals": [[v, word(v), "rim." + v] for v in STYLE_RIMS]},
        {"fam": "color", "attr": "col", "param": "color", "head": "catalogo.f.color",
         "vals": [[k[6:], word(k[6:]), k] for k in en if k.startswith("color.")]},
    ]
    gshape = {"fam": "gshape", "param": "cat", "vals": [[g, word(g), "gender." + g, "catalogo.h1." + g] for g in STYLE_GENDERS]}
    # ---- nothing here may be wrong in silence: an address decided today is an address Google keeps
    facets = set(re.findall(r"\{ id: '(\w+)'", (ROOT / "js" / "pages" / "catalogo.js").read_text()))
    keys, files = [], []
    for f in fams:
        keys += [f["head"], "estilo.n." + f["fam"], "estilo.t." + f["fam"]] + [v[2] for v in f["vals"]]
        files += [v[1] + STYLE_SUFFIX for v in f["vals"]]
        if f["param"] not in facets:
            raise SystemExit(f"build.py: el catálogo (js/pages/catalogo.js) no tiene el filtro «{f['param']}» que piden las páginas de estilo")
    keys += ["estilo.n.gshape", "estilo.t.gshape", "estilo.lead", "estilo.leadTop", "estilo.none", "estilo.desc", "estilo.all",
             "marca.filter", "home.samplesAll", "nav.styles", "catalogo.f.gender", "catalogo.cats.all", "estilos.h1", "estilos.meta",
             "estilos.desc"]
    keys += [k for v in gshape["vals"] for k in v[2:]]
    files += [g[1] + "-" + v[1] + STYLE_SUFFIX for g in gshape["vals"] for v in fams[0]["vals"]]
    if "cat" not in facets or "shape" not in facets:
        raise SystemExit("build.py: el catálogo ya no filtra por cat y shape (páginas de estilo género × forma)")
    falta = sorted({k for k in keys if not en.get(k) or not es.get(k)}
                   | {k for k in set(en) ^ set(es) if k.startswith(("estilo.", "estilos."))})
    if falta:
        raise SystemExit("build.py: las páginas de estilo piden claves que faltan en el diccionario (EN y ES): " + ", ".join(falta))
    malas = [f for f in files if not _WORD.match(f[:-len(STYLE_SUFFIX)])]
    repes = sorted({f for f in files if files.count(f) > 1 or f in taken})
    if malas or repes:
        raise SystemExit(f"build.py: direcciones de estilo inválidas {malas} o repetidas {repes}")
    return {"min": STYLE_MIN, "max": STYLE_MAX, "suffix": STYLE_SUFFIX, "fams": fams, "gshape": gshape}


def llms_txt(metas):
    """llms.txt (llmstxt.org): what the store is and where its pages are, in plain Markdown, for the AI assistants that
    read a site before answering about it. Only facts the site itself states; the titles come from the pages."""
    t = lambda n: _html.unescape(metas[n].get("title", n)).split(" — ")[0].split(" | ")[0]
    d = lambda n: _html.unescape(metas[n].get("description", ""))
    lines = [
        "# House of Eyeglasses",
        "",
        "> Online eyewear store in the United States (Tampa, Florida). Designer eyeglasses frames from 150+ brands, new and in stock, "
        "with prescription lenses made to the customer's prescription. Free shipping in the USA, delivered in 5–10 business days. "
        "An optician checks every prescription before the lab starts. Unworn non-prescription frames can be returned within 30 days.",
        "",
        "Every frame has its own page with brand, model, color code, size in millimetres, price in US dollars and availability. "
        "Prices shown are for the frame; prescription lenses are added in four short steps on the frame's page. "
        "The site is in English with a Spanish version of every text (EN | ES).",
        "",
        "## Shop",
        f"- [All brands]({SITE}brands.html): every brand carried, with the number of frames in stock and a page per brand",
        f"- [All styles]({SITE}styles.html): eyeglasses by shape, material, rim and color, with the number of frames in stock and a page per style",
        f"- [{t('catalogo.html')}]({SITE}catalogo.html): {d('catalogo.html')}",
        f"- [{t('men.html')}]({SITE}men.html): {d('men.html')}",
        f"- [{t('women.html')}]({SITE}women.html): {d('women.html')}",
        f"- [{t('kids.html')}]({SITE}kids.html): {d('kids.html')}",
        f"- [{t('pruebatelos.html')}]({SITE}pruebatelos.html): {d('pruebatelos.html')}",
        "",
        "## Prescription lenses (one page per lens type; the lens prices shown on them are added to the price of the frame)",
        f"- [{t('prescription-glasses.html')}]({SITE}prescription-glasses.html): {d('prescription-glasses.html')}",
        f"- [{t('progressive-glasses.html')}]({SITE}progressive-glasses.html): {d('progressive-glasses.html')}",
        f"- [{t('single-vision-glasses.html')}]({SITE}single-vision-glasses.html): {d('single-vision-glasses.html')}",
        f"- [{t('sunglasses.html')}]({SITE}sunglasses.html): {d('sunglasses.html')}",
        f"- [{t('blue-light-glasses.html')}]({SITE}blue-light-glasses.html): {d('blue-light-glasses.html')}",
        f"- [{t('computer-glasses.html')}]({SITE}computer-glasses.html): {d('computer-glasses.html')}",
        f"- [{t('photochromic-glasses.html')}]({SITE}photochromic-glasses.html): {d('photochromic-glasses.html')}",
        f"- [{t('high-index-lenses.html')}]({SITE}high-index-lenses.html): {d('high-index-lenses.html')}",
        f"- [{t('anti-glare-glasses.html')}]({SITE}anti-glare-glasses.html): {d('anti-glare-glasses.html')}",
        f"- [{t('polycarbonate-lenses.html')}]({SITE}polycarbonate-lenses.html): {d('polycarbonate-lenses.html')}",
        "",
        "## Guides",
        f"- [{t('receta.html')}]({SITE}receta.html): {d('receta.html')}",
        f"- [{t('lentes.html')}]({SITE}lentes.html): {d('lentes.html')}",
        f"- [{t('talla.html')}]({SITE}talla.html): {d('talla.html')}",
        f"- [{t('quiz.html')}]({SITE}quiz.html): {d('quiz.html')}",
        f"- [{t('face-shape-guide.html')}]({SITE}face-shape-guide.html): {d('face-shape-guide.html')} One page per face shape: round, square, heart, oval and long.",
        "",
        "## Help and policies",
        f"- [{t('ayuda.html')}]({SITE}ayuda.html): {d('ayuda.html')}",
        f"- [{t('about.html')}]({SITE}about.html): {d('about.html')}",
        f"- [Shipping, returns, privacy and terms]({SITE}legal.html)",
        "- Contact: amm@houseofeyeglasses.com · +1 786-316-6252 (phone and WhatsApp)",
        "",
        "## Data",
        f"- [Sitemap]({SITE}sitemap.xml): every page, including one per frame, one per brand and one per style",
        f"- [Product feed]({SITE}data/google-feed.txt): tab-separated, one row per frame (title, price, availability, brand, GTIN, link, image)",
        "",
    ]
    (ROOT / "llms.txt").write_text("\n".join(lines))


def template(name, src, meta, body_rest, marks=None):
    """One template for the Central (lib/optica/paginas.py): the built page with {{ssr:x}} where the Central writes
    (head: title, desc, head; body: one per <!--ssr:x--> comment of the source). `marks` = the exact set the body must
    carry (the product page's contract); None = whatever the page declares, at least one."""
    found = re.findall(r"<!--ssr:(\w+)-->", body_rest)
    if not found or len(found) != len(set(found)) or (marks is not None and set(found) != set(marks)):
        raise SystemExit(f"build.py: {src.name}: marcas <!--ssr:…--> {sorted(found)}"
                         + (f"; debe llevar exactamente {sorted(marks)}" if marks is not None else " (hace falta al menos una y sin repetir)"))
    page = bust(head_for(src.name, meta, "en", "", "", ssr=True) + body_rest)
    page = re.sub(r"<!--ssr:(\w+)-->", r"{{ssr:\1}}", page)
    (ROOT / "tpl" / (name + ".html")).write_text(page)
    return sorted(found)


def ssr_json(dicts, marks, taken):
    """tpl/ssr.json: the dictionaries of the template pages (both languages) + the constants of js/catalog.js + the marks
    of each template + the table of the style pages. The Central never guesses a text or a rule: everything it writes
    comes from tpl/. `taken` = the names of the pages this build publishes (a style page may not land on one)."""
    en, es = {}, {}
    for d in dicts:
        en.update(d["en"])
        es.update(d["es"])
    js = ("global.window={};global.CustomEvent=function(){};global.fetch=()=>Promise.reject(new Error('build'));"
          "global.document={dispatchEvent(){},addEventListener(){},querySelector(){return null},documentElement:{lang:'en'}};"
          f"require({json.dumps(str(ROOT / 'js' / 'catalog.js'))});const C=window.hoeCatalog;"
          f"const cases={json.dumps(SLUG_CASES)};"
          "process.stdout.write(JSON.stringify({bands:C.BANDS.map(b=>({key:b.key,max:isFinite(b.max)?b.max:null})),hinge:C.HINGE,"
          "shapes:window.HOE_SHAPE_LABEL,shapeOrder:window.HOE_SHAPE_ORDER,slugs:cases.map(c=>c.concat(C.slug(c[0],c[1],c[2],c[3])))}));")
    run = subprocess.run(["node", "-e", js], capture_output=True, text=True)
    if run.returncode:
        raise SystemExit("build.py: node no pudo leer js/catalog.js para tpl/ssr.json:\n" + run.stderr)
    consts = json.loads(run.stdout)
    extra = {"estilos": estilos(en, es, consts, taken)} if "estilo" in marks and "styles" in marks else {}
    (ROOT / "tpl" / "ssr.json").write_text(json.dumps({"v": ASSET_V, "site": SITE, "marks": marks, "i18n": {"en": en, "es": es}, **consts, **extra},
                                                      ensure_ascii=False, sort_keys=True, indent=0))


def build():
    pages = []
    for src in sorted((ROOT / "src" / "pages").glob("*.html")):
        text = src.read_text()
        m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
        meta = dict(re.findall(r"^\s*(\w+):\s*(.+?)\s*$", m.group(1), re.M)) if m else {}
        body = text[m.end():] if m else text
        if not m or "<!--" in m.group(1) or not body.lstrip().startswith("<"):
            # the header is ONE comment: an HTML comment written inside it ends it early and its tail lands in the page
            raise SystemExit(f"build.py: {src.name}: la cabecera no puede llevar un comentario HTML dentro (termina en el primero y el resto cae en la página)")
        pages.append((src, meta, body))
    # the pages with a Spanish copy = the ones that are indexed as they are (no robots, no per-frame canonical)
    TWINS.clear()
    TWINS.update(src.name for src, meta, _ in pages
                 if not meta.get("robots") and meta.get("canonical") != "js" and not meta.get("central"))
    built, tpl_dicts, tpl_marks = [], [], {}
    metas = {src.name: meta for src, meta, _ in pages}
    (ROOT / "tpl").mkdir(exist_ok=True)
    for old in (ROOT / "tpl").glob("*.html"):
        old.unlink()
    for src, meta, body in pages:
        body = body.replace("{{lens_demo}}", part["lens_demo"])   # the sample lens (src/partials/lens_demo.html), wherever a page asks for it
        i18n = [x.strip() for x in (meta.get("i18n") or "").split(",") if x.strip()]
        scripts = (part["scripts"].replace("{{page_i18n}}", tags(meta.get("i18n"), "js"))
                   .replace("{{scripts}}", tags(meta.get("scripts"), "js")))
        rest = (part["header"] + "\n  <!-- ============ MAIN ============ -->\n" + body.rstrip() + "\n\n"
                + "  <!-- ============ FOOTER ============ -->\n" + part["footer"] + "\n" + part["drawer"] + "\n"
                + scripts + "</body>\n</html>\n")
        en = bust(head_for(src.name, meta, "en", meta.get("title", "House of Eyeglasses"), meta.get("description", "")) + rest)
        if rewrite(en) != en:                                         # the copy maker must be able to read this page untouched
            a, b = en, rewrite(en)
            i = next((k for k in range(min(len(a), len(b))) if a[k] != b[k]), min(len(a), len(b)))
            raise SystemExit(f"build.py: {src.name} no sobrevive intacta al lector de HTML (cerca de: {a[max(0, i - 60):i + 60]!r})")
        if meta.get("central"):
            # a page that is ONLY a template: the Central writes the real pages with it (one per brand, the brands index…)
            tpl_marks[meta["central"]] = template(meta["central"], src, meta, rest)
            tpl_dicts.append(dictionary(["js/i18n.js"] + i18n))
            for stale in (ROOT / src.name, ROOT / (src.name[:-5] + ".es.html")):
                if stale.exists():
                    stale.unlink()
            continue
        (ROOT / src.name).write_text(structured(en, "en"))
        built.append(src.name)
        es_file = ROOT / (src.name[:-5] + ".es.html")
        if src.name in TWINS:
            # ---- Spanish copy: same page, Spanish written into the HTML ----
            es_t = dictionary(["js/i18n.js"] + i18n)["es"]
            title_es = es_t.get(meta.get("title_i18n", ""), "") or meta.get("title_es", "")
            desc_es = meta.get("description_es", "")
            if not title_es or not desc_es:
                raise SystemExit(f"build.py: {src.name} se indexa y le falta el título o la descripción en español (title_i18n / title_es, description_es)")
            es = bust(head_for(src.name, meta, "es", _html.escape(title_es, quote=False), _html.escape(desc_es, quote=True)) + rest)
            es_file.write_text(structured(rewrite(es, es_t, links=True), "es"))
        elif es_file.exists():
            es_file.unlink()                                          # a page that no longer has a copy
        if "<!--ssr:" in body:                                        # a page the Central also writes once per frame
            tpl_marks[src.name[:-5]] = template(src.name[:-5], src, meta, rest, SSR)
            tpl_dicts.append(dictionary(["js/i18n.js"] + i18n))
    hero = next(body for src, _m, body in pages if src.name == "index.html")
    if f'<source media="{HERO_PHONE}"' not in hero:
        raise SystemExit("build.py: la <source> del hero en src/pages/index.html no lleva la condición HERO_PHONE de sus preload")
    ssr_json(tpl_dicts, tpl_marks, {src.name for src, _m, _b in pages} | {src.name[:-5] + ".es.html" for src, _m, _b in pages} | {"legal.html"})
    sitemap_pages(["index.html"] + sorted(n for n in TWINS if n != "index.html"))
    llms_txt(metas)
    # legal.html is static (edited by hand, not built): only its css/js references get the version
    legal = ROOT / "legal.html"
    legal.write_text(bust(legal.read_text()))
    print("built:", ", ".join(built), f"(+ copia .es.html de {len(TWINS)}) + legal.html refs", "| assets ?v=" + ASSET_V)


if __name__ == "__main__":
    build()
