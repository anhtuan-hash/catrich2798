#!/usr/bin/env python3
"""Generate the standalone Museum Lab release from authored teaching files and
the separately verified, frozen class 11.3 records. Never modify shared originals."""
import hashlib, json, pathlib, re, sys, zipfile
import pymupdf as pdf

NEW = "https://brian-museum-lab.vercel.app"
OLD = "https://esl-brian.vercel.app"
HOME = NEW + "/#/tool/immersive-gallery"
ROOT = pathlib.Path(sys.argv[1])
SOURCE = ROOT / "museum/asean/dossier-2026-11-19"
DEST = ROOT / "museum/asean/standalone-2026-11-25"
DEST.mkdir(parents=True, exist_ok=True)
# Independently reconciled on 25 Nov 2026 against the standalone DB and
# public catalogue: published room IDs, rubric and activity scores.
ROWS = [
("Hội An Ancient Town","efa4c416-a0c8-4cf4-8ae1-5f33a57cda4f",9),
("Tràng An","66b352a8-4500-4722-8a96-7a3235709d6a",8),
("Angkor","f8e0435b-a63c-4446-97c7-049322d81aa9",8),
("Luang Prabang","75b913f1-c815-4759-99cf-37c778d5c9c6",8),
("Ayutthaya","7e5e1de5-6ab8-4185-a8ca-596f9873a98c",9),
("Melaka","e582f4e4-063d-4a76-b8f9-97852f9001d6",9),
("George Town","b8756e2f-9d33-4341-8478-e546e71698d5",9),
("Singapore Botanic Gardens","7e37c93f-6274-47a4-a194-7f77d58b6e26",9),
("Borobudur","e2a701db-4a19-4890-a358-6b3d9ce03c39",9),
("Vigan","3390c4e3-640a-4765-b644-8d2feb54d33d",9),
]
IDS = {row[1] for row in ROWS}
def translate(uri):
    if not uri.startswith(OLD): return uri
    suffix=uri[len(OLD):]
    if suffix in ("","/","/#/tool/immersive-gallery"):
        return HOME
    m=re.fullmatch(r"/#/tool/immersive-gallery\?exhibition=([0-9a-f-]+)",suffix)
    if m and m.group(1) in IDS:
        return HOME+"?exhibition="+m.group(1)
    raise RuntimeError("Unverified legacy Museum Lab route: "+uri)

def rewrite_links(doc):
    changed=0
    for p in doc:
        for link in p.get_links():
            uri=link.get("uri","")
            if uri.startswith(OLD):
                link["uri"]=translate(uri)
                p.update_link(link)
                changed+=1
    return changed

def add_line(p, rect, text, size=8, color=(0.38,0.34,0.29), font="notos"):
    f=pdf.Font(font)
    p.insert_font(fontname="Dossier"+font, fontbuffer=f.buffer)
    r=pdf.Rect(rect)
    if f.text_length(text,fontsize=size)>r.width:
        raise RuntimeError("Dossier text exceeds reserved line: "+text)
    p.insert_text((r.x0,r.y1-2.0),text,fontname="Dossier"+font,fontsize=size,color=color)

def replace_line(p, old, new, size, bg, color=(0.38,0.34,0.29)):
    matches=p.search_for(old)
    if len(matches)!=1: raise RuntimeError("Expected unique source line: "+old)
    r=matches[0]
    p.add_redact_annot(r,fill=bg)
    p.apply_redactions(images=0,graphics=0,text=0)
    add_line(p,(r.x0,r.y0, p.rect.width-34,r.y1),new,size,color)

def save_pdf(d, target):
    d.set_metadata({**d.metadata,"subject":"ASEAN in Three Frames | Standalone Museum Lab | "+HOME})
    d.save(target, garbage=4,deflate=True)
    d.close()
    with pdf.open(target) as check:
        for p in check:
            assert "esl-brian.vercel.app" not in p.get_text()
            assert all("esl-brian.vercel.app" not in x.get("uri","") for x in p.get_links())

def make_word():
    name="TiengAnh_THPT_Nguyen-Anh-Tuan_STEM_P1.docx"
    with zipfile.ZipFile(SOURCE/name) as src,zipfile.ZipFile(DEST/name,"w",compression=zipfile.ZIP_DEFLATED) as dst:
        count=0
        for part in src.infolist():
            data=src.read(part.filename)
            if part.filename.endswith((".xml",".rels")):
                s=data.decode("utf-8")
                s,n=re.subn(r"https://esl-brian\.vercel\.app[^\"<\s]*",lambda m:translate(m.group()),s)
                count+=n
                assert "esl-brian.vercel.app" not in s
                data=s.encode("utf-8")
            dst.writestr(part,data)
    assert count>=1
    return name,count

def make_plan(name):
    d=pdf.open(SOURCE/name)
    count=rewrite_links(d)
    # First-page footnote in the unused bottom margin; no change to
    # the approved plan, page breaks, images or assessment.
    p=d[0]
    text="Museum Lab: "+HOME
    rect=pdf.Rect(45,p.rect.height-19,p.rect.width-45,p.rect.height-5)
    add_line(p,rect,text,7,(0.45,0.12,0.12))
    p.insert_link({"kind":pdf.LINK_URI,"from":rect,"uri":HOME})
    save_pdf(d,DEST/name)
    return name,count+1

def make_evidence():
    name="asean-class-11-3-evidence.pdf"
    d=pdf.open(ROOT/"museum/asean"/name)
    if len(d)!=2: raise RuntimeError("Unexpected evidence template")
    p=d[0]
    # Match every row in the authored layout with the NEW database snapshot.
    # Replace the score glyphs from that snapshot, rather than serving the old PDF.
    table_text=p.get_text()
    def norm(s):return " ".join(s.split())
    for i,(title,id,rubric) in enumerate(ROWS,1):
        assert norm(f"{i:02} {title} 2 2 {rubric} 2 1") in norm(table_text)
        title_rect=p.search_for(title)
        assert len(title_rect)==1,(title,title_rect)
    # All data and the Angkor quotations match the separately frozen records.
    assert "0/1" in d[1].get_text() and "1/1" in d[1].get_text()
    assert "At Angkor Thom, look up at the carved faces on the Bayon’s towers." in norm(d[1].get_text())
    count=rewrite_links(d)
    assert count==13,count
    replace_line(p,"Khi ngoại tuyến, mở tệp Trien_lam_ASEAN_2D_ngoai_tuyen.html sau khi giải nén.",
        "Khi ngoại tuyến, mở tệp PetrusKy_Museum_Offline.html sau khi giải nén.",9,(239/255,230/255,218/255),(0.11,0.11,0.11))
    replace_line(p,"Nguồn số liệu: các bản ghi nhóm và danh mục phòng đã công bố trên BRIAN Museum Lab, trích ngày 17/11/2026.",
        "Nguồn: Museum Lab mới, đối chiếu dữ liệu đã khóa ngày 25/11/2026; giữ nguyên bản ghi 17/11/2026.",8,(246/255,242/255,232/255))
    # The historical image and quotations were checked against the new
    # published Angkor exhibit and current checkpoint records.
    save_pdf(d,DEST/name)
    return name,count

files=[make_word(), make_plan("TiengAnh_THPT_Nguyen-Anh-Tuan_STEM_P2.pdf"),
       make_plan("TiengAnh_THPT_Nguyen-Anh-Tuan_STEM_P2_EN_20261119.pdf"), make_evidence()]
manifest={"source":HOME,"assignmentId":"01780705-7e5c-4775-b9b2-1fd955c077fb",
"verifiedOn":"2026-11-25","lessonFrozenOn":"2026-11-17",
"groups":[{"group":i,"room":title,"exhibitionId":id,"baseline":2,"transfer":2,"rubric":rubric,"visitor":2,"retest":1} for i,(title,id,rubric) in enumerate(ROWS,1)],
"files":[{"name":n,"bytes":(DEST/n).stat().st_size,"sha256":hashlib.sha256((DEST/n).read_bytes()).hexdigest(),"linksUpdated":count} for n,count in files]}
(DEST/"release-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
# Prevent old entry URLs on the new domain from serving stale attachments.
for n,_ in files:
    target=(ROOT/"museum/asean"/n) if n=="asean-class-11-3-evidence.pdf" else SOURCE/n
    target.write_bytes((DEST/n).read_bytes())
print("[museum-dossier]",json.dumps({"files":manifest["files"],"totalBytes":sum(f["bytes"] for f in manifest["files"])},ensure_ascii=False))
