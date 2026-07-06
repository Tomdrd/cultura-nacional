#!/usr/bin/env python3
import sys, re, copy
from lxml import etree

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
NSMAP = {None: SVG_NS, "xlink": XLINK_NS}
SCI_NOTATION_ATTRS = {"width","height","x","y","cx","cy","r","rx","ry","x1","y1","x2","y2"}
SCI_RE = re.compile(r"^-?\d*\.?\d+e[+-]?\d+$", re.IGNORECASE)
INHERITABLE = ["fill-rule","clip-rule","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","fill-opacity","stroke-opacity"]
CSS_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}")

def qname(tag): return f"{{{SVG_NS}}}{tag}"

def get_href(el):
    href = el.get(f"{{{XLINK_NS}}}href")
    if href is None: href = el.get("href")
    return href

def build_id_map(root):
    id_map = {}
    for el in root.iter():
        _id = el.get("id")
        if _id: id_map[_id] = el
    return id_map

def resolve_use(use_el, id_map, seen=None):
    if seen is None: seen = set()
    href = get_href(use_el)
    if not href or not href.startswith("#"): return None
    target_id = href[1:]
    if target_id in seen: return None
    target = id_map.get(target_id)
    if target is None: return None
    clone = copy.deepcopy(target)
    for nested_use in list(clone.iter(qname("use"))):
        replacement = resolve_use(nested_use, id_map, seen | {target_id})
        if replacement is not None:
            nested_use.getparent().replace(nested_use, replacement)
    for el in clone.iter():
        if "id" in el.attrib: del el.attrib["id"]
    g = etree.Element(qname("g"), nsmap=NSMAP)
    transform_parts = []
    x = use_el.get("x"); y = use_el.get("y")
    if x or y: transform_parts.append(f"translate({x or 0} {y or 0})")
    if use_el.get("transform"): transform_parts.append(use_el.get("transform"))
    if transform_parts: g.set("transform", " ".join(transform_parts))
    for attr, val in use_el.attrib.items():
        if attr in (f"{{{XLINK_NS}}}href", "href", "x", "y", "transform"): continue
        g.set(attr, val)
    g.append(clone)
    return g

def fix_scientific_notation(root):
    for el in root.iter():
        for attr in list(el.attrib.keys()):
            local = etree.QName(attr).localname
            if local in SCI_NOTATION_ATTRS or local == "viewBox":
                val = el.attrib[attr]
                if local == "viewBox":
                    parts = val.split(); new_parts = []; changed = False
                    for p in parts:
                        if SCI_RE.match(p):
                            new_parts.append(f"{float(p):.6f}".rstrip("0").rstrip("."))
                            changed = True
                        else:
                            new_parts.append(p)
                    if changed: el.attrib[attr] = " ".join(new_parts)
                elif SCI_RE.match(val):
                    num = float(val)
                    el.attrib[attr] = f"{num:.6f}".rstrip("0").rstrip(".")

def style_attr_to_attrs(root):
    for el in root.iter():
        style = el.get("style")
        if not style: continue
        declarations = [d.strip() for d in style.split(";") if d.strip()]
        for decl in declarations:
            if ":" not in decl: continue
            prop, val = decl.split(":", 1)
            prop, val = prop.strip(), val.strip()
            if prop and val: el.set(prop, val)
        del el.attrib["style"]

def resolve_style_classes(root):
    style_els = list(root.iter(qname("style")))
    if not style_els: return
    class_rules = {}; tag_rules = {}; id_rules = {}
    for style_el in style_els:
        css_text = style_el.text or ""
        for selector, body in CSS_RULE_RE.findall(css_text):
            props = {}
            for decl in body.split(";"):
                decl = decl.strip()
                if not decl or ":" not in decl: continue
                prop, val = decl.split(":", 1)
                props[prop.strip()] = val.strip()
            for sel in selector.split(","):
                sel = sel.strip()
                if not sel: continue
                if sel.startswith("."): class_rules[sel[1:]] = props
                elif sel.startswith("#"): id_rules[sel[1:]] = props
                else: tag_rules[sel] = props
    for el in root.iter():
        local = etree.QName(el).localname
        merged = {}
        if local in tag_rules: merged.update(tag_rules[local])
        classes = (el.get("class") or "").split()
        for c in classes:
            if c in class_rules: merged.update(class_rules[c])
        _id = el.get("id")
        if _id and _id in id_rules: merged.update(id_rules[_id])
        for prop, val in merged.items():
            if el.get(prop) is None: el.set(prop, val)
        if "class" in el.attrib: del el.attrib["class"]
    for style_el in style_els:
        parent = style_el.getparent()
        if parent is not None: parent.remove(style_el)

def propagate_inheritable_attrs(root):
    def walk(el, inherited):
        current = dict(inherited)
        for attr in INHERITABLE:
            val = el.get(attr)
            if val is not None: current[attr] = val
        if el is not root:
            for attr, val in current.items():
                if el.get(attr) is None and el.tag not in (qname("defs"), qname("style"), qname("title"), qname("metadata")):
                    el.set(attr, val)
        for child in el:
            walk(child, current)
    walk(root, {})


def add_viewbox_if_missing(root):
    if root.get("viewBox"):
        return
    w = root.get("width")
    h = root.get("height")
    if not w or not h:
        return
    try:
        w_num = float(__import__("re").sub(r"[a-zA-Z%]", "", w))
        h_num = float(__import__("re").sub(r"[a-zA-Z%]", "", h))
    except ValueError:
        return
    root.set("viewBox", f"0 0 {w_num:g} {h_num:g}")

def flatten(svg_bytes):
    svg_bytes = re.sub(rb"<!DOCTYPE[^>]*>", b"", svg_bytes)
    parser = etree.XMLParser(remove_blank_text=False, resolve_entities=False)
    root = etree.fromstring(svg_bytes, parser)
    id_map = build_id_map(root)
    for use_el in list(root.iter(qname("use"))):
        replacement = resolve_use(use_el, id_map)
        if replacement is not None:
            use_el.getparent().replace(use_el, replacement)
        else:
            parent = use_el.getparent()
            if parent is not None: parent.remove(use_el)
    style_attr_to_attrs(root)
    resolve_style_classes(root)
    propagate_inheritable_attrs(root)
    add_viewbox_if_missing(root)
    fix_scientific_notation(root)
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8")

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(1)
    if args[0] == "--inplace":
        for path in args[1:]:
            with open(path, "rb") as f: data = f.read()
            result = flatten(data)
            with open(path, "wb") as f: f.write(result)
            print(f"corrigido: {path}")
    else:
        in_path, out_path = args[0], args[1]
        with open(in_path, "rb") as f: data = f.read()
        result = flatten(data)
        with open(out_path, "wb") as f: f.write(result)
        print(f"corrigido: {in_path} -> {out_path}")

if __name__ == "__main__":
    main()
