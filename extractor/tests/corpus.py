"""Synthetic test corpus with known answers.

Each generator draws a document in the layout style of a real Texas notice of
appraised value or insurance declarations page (value grid as rows or columns,
two-page notices, fused "2026 Market Value" labels, merged text rows, mailing
address traps, percentage deductibles, excluded coverages...). Values,
addresses and layouts are randomised from a seed, so every run is the same
but the corpus covers many combinations.

`degrade()` turns a rendered page into a scan or a phone photo so the OCR
path is tested on the same documents.
"""

from __future__ import annotations

import io
import random
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

STREETS = ["OAK HOLLOW DR", "VICTOR ST", "ELM ST", "BLUEBONNET LN", "W MAGNOLIA AVE", "PECAN CREEK CT",
           "RIDGEWOOD TRL", "N COLLINS ST", "SADDLEBROOK DR", "LAKE COUNTRY DR", "CEDAR SPRINGS RD"]
CITIES = {"Tarrant County": ("FORT WORTH", "761"), "Dallas County": ("DALLAS", "752"),
          "Denton County": ("DENTON", "762"), "Parker County": ("WEATHERFORD", "760"),
          "Collin County": ("PLANO", "750"), "Ellis County": ("WAXAHACHIE", "751"),
          "Johnson County": ("CLEBURNE", "760")}
OWNERS = ["SMITH JOHN & MARY", "GARCIA PROPERTIES LLC", "NGUYEN THANH", "WESTFIELD RENTALS LP", "PATEL ANIL"]


@dataclass
class Case:
    name: str
    kind: str  # tax | insurance
    pdf: bytes
    truth: dict
    optional: set[str] = field(default_factory=set)  # fields we accept missing


def _caller() -> str:
    import inspect

    return inspect.stack()[1].function


def _street(r: random.Random) -> str:
    return f"{r.randint(100, 9899)} {r.choice(STREETS)}"


def _money(v: int) -> str:
    return f"${v:,}"


def _canvas():
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    return buf, c


def _values(r: random.Random, jump: float | None = None):
    prior_mkt = r.randrange(140_000, 900_000, 100)
    ratio = jump if jump is not None else r.choice([0.93, 1.04, 1.08, 1.12, 1.18, 1.26, 1.35])
    cur_mkt = int(round(prior_mkt * ratio, -2))
    land_p = int(round(prior_mkt * r.uniform(0.15, 0.35), -2))
    land_c = int(round(land_p * r.uniform(1.0, 1.1), -2))
    prior_app = prior_mkt
    cur_app = min(cur_mkt, int(prior_app * 1.2))
    return dict(prior_mkt=prior_mkt, cur_mkt=cur_mkt, land_p=land_p, land_c=land_c,
                prior_app=prior_app, cur_app=cur_app)


def _mailing_block(c, r: random.Random, x: float, y: float, labelled: bool):
    owner = r.choice(OWNERS)
    if labelled:
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x, y + 12, "MAILING ADDRESS")
    c.setFont("Helvetica", 9)
    c.drawString(x, y, owner)
    c.drawString(x, y - 11, f"{r.randint(10, 9999)} {r.choice(STREETS)} STE {r.randint(100, 400)}")
    c.drawString(x, y - 22, f"{r.choice(['ARLINGTON', 'IRVING', 'FRISCO'])} TX 7{r.randint(5000, 6999)}")


# --- Tax notice layouts ----------------------------------------------------------

def tax_tarrant(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    v = _values(r)
    county = "Tarrant County"
    city, zp = CITIES[county]
    street = _street(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 740, "TARRANT APPRAISAL DISTRICT")
    c.setFont("Helvetica", 9)
    c.drawString(50, 727, "2500 Handley-Ederville Rd, Fort Worth TX 76118  |  www.tad.org")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(330, 700, "2026 NOTICE OF APPRAISED VALUE")
    _mailing_block(c, r, 50, 690, labelled=False)
    c.setFont("Helvetica", 9)
    c.drawString(330, 680, f"Account Number: 0{r.randint(1000000, 9999999)}")
    c.drawString(330, 668, f"Date of Notice: April 15, 2026")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, 610, "Situs Address:")
    c.setFont("Helvetica", 9)
    c.drawString(125, 610, street)
    c.drawString(125, 599, f"{city} TX {zp}{r.randint(10, 99)}")
    c.drawString(50, 585, f"Legal Description: LOT {r.randint(1, 40)} BLOCK {r.randint(1, 20)} SAMPLE ADDITION")
    cols = ["Appraisal Year", "Land Value", "Improvement Value", "Market Value", "Appraised Value"]
    xs = [50, 160, 260, 380, 480]
    c.setFont("Helvetica-Bold", 8)
    for x, h in zip(xs, cols):
        c.drawString(x, 550, h)
    c.line(50, 545, 560, 545)
    c.setFont("Helvetica", 9)
    for y, year, land, mkt, app in [(530, "2025", v["land_p"], v["prior_mkt"], v["prior_app"]),
                                    (515, "2026", v["land_c"], v["cur_mkt"], v["cur_app"])]:
        c.drawString(xs[0], y, year)
        for x, val in zip(xs[1:], [land, mkt - land, mkt, app]):
            c.drawRightString(x + 70, y, _money(val))
    c.setFont("Helvetica", 7)
    c.drawString(50, 470, "If you disagree with the appraised value you may file a protest with the Appraisal Review Board by May 15, 2026.")
    c.showPage()
    c.save()
    return Case(f"tax_tarrant_{seed}", "tax", buf.getvalue(),
                dict(address=f"{street}", county=county, currentValue=v["cur_mkt"], priorValue=v["prior_mkt"]))


def tax_dallas_two_page(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    v = _values(r)
    county = "Dallas County"
    city, zp = CITIES[county]
    street = _street(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 740, "DALLAS CENTRAL APPRAISAL DISTRICT")
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, 720, "NOTICE OF APPRAISED VALUE")
    c.setFont("Helvetica", 9)
    c.drawString(400, 720, "Tax Year: 2026")
    _mailing_block(c, r, 50, 670, labelled=True)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(320, 682, "Property Address")
    c.setFont("Helvetica", 9)
    c.drawString(320, 670, street)
    c.drawString(320, 659, f"{city}, TX {zp}{r.randint(10, 99)}")
    c.drawString(50, 600, "Your property values are shown on page 2 of this notice.")
    c.showPage()
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 740, "PROPERTY VALUES")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(260, 715, "2025 Certified")
    c.drawString(400, 715, "2026 Proposed")
    rows = [("Land Value", v["land_p"], v["land_c"]),
            ("Improvement Value", v["prior_mkt"] - v["land_p"], v["cur_mkt"] - v["land_c"]),
            ("Market Value", v["prior_mkt"], v["cur_mkt"]),
            ("Homestead Cap Loss", 0, 0),
            ("Appraised Value", v["prior_app"], v["cur_app"])]
    c.setFont("Helvetica", 9)
    y = 698
    for label, a, b in rows:
        c.drawString(50, y, label)
        c.drawRightString(320, y, _money(a))
        c.drawRightString(460, y, _money(b))
        y -= 16
    c.showPage()
    c.save()
    return Case(f"tax_dallas_{seed}", "tax", buf.getvalue(),
                dict(address=street, county=county, currentValue=v["cur_mkt"], priorValue=v["prior_mkt"]))


def tax_denton_keyvalue(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    v = _values(r)
    county = "Denton County"
    city, zp = CITIES[county]
    street = _street(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 740, "Denton Central Appraisal District")
    c.setFont("Helvetica", 11)
    c.drawString(50, 722, "2026 Appraisal Notice")
    _mailing_block(c, r, 360, 735, labelled=False)
    c.setFont("Helvetica", 10)
    c.drawString(50, 680, f"Property ID: {r.randint(100000, 999999)}")
    c.drawString(50, 665, f"Property Location: {street}, {city} TX {zp}{r.randint(10, 99)}")
    y = 630
    for text in [f"2025 Market Value: {_money(v['prior_mkt'])}",
                 f"2026 Market Value: {_money(v['cur_mkt'])}",
                 f"2026 Appraised Value: {_money(v['cur_app'])}",
                 f"2026 Taxable Value (ISD): {_money(max(0, v['cur_app'] - 100000))}"]:
        c.drawString(50, y, text)
        y -= 15
    c.showPage()
    c.save()
    return Case(f"tax_denton_{seed}", "tax", buf.getvalue(),
                dict(address=street, county=county, currentValue=v["cur_mkt"], priorValue=v["prior_mkt"]))


def tax_merged_rows(seed: int) -> Case:
    """Values drawn as ONE string per row (as some CAD print engines do)."""
    r = random.Random(f"{_caller()}-{seed}")
    v = _values(r)
    county = r.choice(["Parker County", "Ellis County", "Johnson County"])
    city, zp = CITIES[county]
    street = _street(r)
    name = county.split()[0]
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 740, f"{name.upper()} {'COUNTY' if name == 'Parker' else 'CENTRAL'} APPRAISAL DISTRICT")
    c.drawString(50, 724, "NOTICE OF APPRAISED VALUE FOR 2026")
    _mailing_block(c, r, 50, 690, labelled=True)
    c.setFont("Helvetica", 9)
    c.drawString(330, 690, "Situs")
    c.drawString(330, 679, f"{street}")
    c.setFont("Courier-Bold", 9)
    c.drawString(50, 600, f"{'':<24}{'2025':>14}{'2026':>14}")
    c.setFont("Courier", 9)
    c.drawString(50, 586, f"{'Land Market Value':<24}{_money(v['land_p']):>14}{_money(v['land_c']):>14}")
    c.drawString(50, 572, f"{'Total Market Value':<24}{_money(v['prior_mkt']):>14}{_money(v['cur_mkt']):>14}")
    c.drawString(50, 558, f"{'Appraised Value':<24}{_money(v['prior_app']):>14}{_money(v['cur_app']):>14}")
    c.showPage()
    c.save()
    return Case(f"tax_merged_{seed}", "tax", buf.getvalue(),
                dict(address=street, county=county, currentValue=v["cur_mkt"], priorValue=v["prior_mkt"]))


def tax_prior_current_cols(seed: int) -> Case:
    """'Prior Year' / 'Current Year' column headers, no years at all."""
    r = random.Random(f"{_caller()}-{seed}")
    v = _values(r)
    county = "Collin County"
    city, zp = CITIES[county]
    street = _street(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 740, "Collin Central Appraisal District")
    c.setFont("Helvetica", 10)
    c.drawString(50, 724, "Notice of Appraised Value")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, 690, "Owner Name and Mailing Address")
    _mailing_block(c, r, 50, 676, labelled=False)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(330, 690, "Property Location")
    c.setFont("Helvetica", 9)
    c.drawString(330, 676, street)
    c.drawString(330, 665, f"{city} TX {zp}{r.randint(10, 99)}")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(250, 600, "Prior Year")
    c.drawString(400, 600, "Current Year")
    c.setFont("Helvetica", 9)
    for y, (label, a, b) in zip([584, 568, 552], [("Market Value", v["prior_mkt"], v["cur_mkt"]),
                                                  ("Appraised Value", v["prior_app"], v["cur_app"]),
                                                  ("Exemptions", 0, 0)]):
        c.drawString(50, y, label)
        c.drawString(250, y, _money(a))
        c.drawString(400, y, _money(b))
    c.showPage()
    c.save()
    return Case(f"tax_collin_{seed}", "tax", buf.getvalue(),
                dict(address=street, county=county, currentValue=v["cur_mkt"], priorValue=v["prior_mkt"]))


def tax_comptroller_form(seed: int, form_path: Path) -> Case:
    """The Comptroller's model Form 50-778, filled and flattened."""
    from pypdf import PdfReader, PdfWriter

    r = random.Random(f"{_caller()}-{seed}")
    v = _values(r)
    street = _street(r)
    reader = PdfReader(str(form_path))
    w = PdfWriter()
    w.append(reader)
    fields = {
        "Property Owner": r.choice(OWNERS),
        "Tax Year": "2026",
        "Owner's Address": f"PO BOX {r.randint(100, 9999)} AUSTIN TX 78701",
        "Property Description-r1": f"Situs: {street} LOT 4 BLK B",
        "Type-r1": "Residential",
        "Last Year Appraised Value-r1": _money(v["prior_app"]),
        "Current Year Market Value-r1": _money(v["cur_mkt"]),
        "Current Year Appraised Value-r1": _money(v["cur_app"]),
        "Appraisal Districts Name 44": "Tarrant Appraisal District",
    }
    for page in w.pages:
        w.update_page_form_field_values(page, fields, auto_regenerate=False)
    w.set_need_appearances_writer(True)
    raw = io.BytesIO()
    w.write(raw)
    # Flatten through Ghostscript-free route: print to PDF via pdftocairo.
    with tempfile.TemporaryDirectory() as d:
        src, dst = Path(d, "in.pdf"), Path(d, "out.pdf")
        src.write_bytes(raw.getvalue())
        subprocess.run(["pdftocairo", "-pdf", str(src), str(dst)], check=True, capture_output=True)
        pdf = dst.read_bytes()
    return Case(f"tax_form50778_{seed}", "tax", pdf,
                dict(address=street, county="Tarrant County", currentValue=v["cur_app"], priorValue=v["prior_app"]),
                optional={"address"})


# --- Insurance layouts -------------------------------------------------------------

def _premium(r: random.Random) -> int:
    return r.randrange(900, 4800)


def ins_dp3_steadily(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    cov_a = r.randrange(180_000, 600_000, 1000)
    wind_pct = r.choice([1, 2, 5])
    prem = _premium(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 740, "Insurance Declarations Page")
    c.setFont("Helvetica", 9)
    c.drawString(50, 720, f"Policy number  TXD-{r.randint(10000, 99999)}")
    c.drawString(50, 708, "Policy form    DP-3 Dwelling Property 3 (Special Form)")
    c.drawString(380, 720, "Annual premium, fees and/or taxes")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(380, 736, f"${prem:,}.00")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 660, "Coverages")
    c.drawString(380, 660, "Limit")
    c.setFont("Helvetica", 9)
    rows = [("Coverage A - Dwelling", _money(cov_a)), ("Coverage B - Other Structures", _money(cov_a // 10)),
            ("Coverage D - Fair Rental Value", _money(cov_a // 5)), ("Coverage L - Premises Liability", "$500,000")]
    y = 644
    for a, b in rows:
        c.drawString(50, y, a)
        c.drawString(380, y, b)
        y -= 14
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 570, "Deductibles")
    c.setFont("Helvetica", 9)
    c.drawString(50, 554, "All Other Perils")
    aop = r.choice([1000, 2500, 5000])
    c.drawString(380, 554, _money(aop))
    c.drawString(50, 540, "Wind / Hail")
    c.drawString(380, 540, f"{wind_pct}% ({_money(cov_a * wind_pct // 100)})")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 500, "Endorsements")
    c.setFont("Helvetica", 9)
    water = r.random() < 0.5
    c.drawString(50, 484, "Water Back-Up and Sump Discharge or Overflow")
    c.drawString(380, 484, "$5,000" if water else "Not Covered")
    c.drawString(50, 470, "Ordinance or Law  10%")
    c.showPage()
    c.save()
    return Case(f"ins_dp3_{seed}", "insurance", buf.getvalue(), dict(
        policyType="DP-3", windHailDeductible=f"{wind_pct}%", aopDeductible=_money(aop),
        hasLossOfRent=True, hasWaterBackup=water, annualPremium=prem))


def ins_ho3(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    prem = _premium(r)
    aop = r.choice([1000, 2000, 2500])
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 740, "HOMEOWNERS POLICY DECLARATIONS")
    c.setFont("Helvetica", 9)
    c.drawString(50, 722, f"Policy Number {r.randint(10, 99)}-BX-{r.randint(1000, 9999)}-{r.randint(1, 9)}")
    c.drawString(50, 710, "Policy Period: 12 Months  Policy Form: HO 00 03")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, 680, "SECTION I COVERAGES")
    c.drawString(330, 680, "LIMIT OF LIABILITY")
    c.setFont("Helvetica", 9)
    y = 664
    for a, b in [("A Dwelling", "$312,000"), ("B Other Structures", "$31,200"), ("C Personal Property", "$156,000"),
                 ("D Loss of Use", "Actual Loss Sustained")]:
        c.drawString(50, y, a)
        c.drawString(330, y, b)
        y -= 13
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, 590, "DEDUCTIBLES - SECTION I")
    c.setFont("Helvetica", 9)
    c.drawString(50, 576, f"All Losses {_money(aop)}")
    c.drawString(50, 563, "In the event of a windstorm or hail loss, this deductible applies:  1%")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 520, f"Annual Premium  {_money(prem)}")
    c.drawString(50, 505, f"Your monthly installment  {_money(prem // 12)}")
    c.showPage()
    c.save()
    return Case(f"ins_ho3_{seed}", "insurance", buf.getvalue(), dict(
        policyType="HO-3", windHailDeductible="1%", aopDeductible=_money(aop),
        hasLossOfRent=True, annualPremium=prem), optional={"windHailDeductible"})


def ins_ho_b(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    prem = _premium(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 740, "TEXAS HOMEOWNERS POLICY - DECLARATIONS")
    c.setFont("Helvetica", 9)
    c.drawString(50, 724, "Form HO-B")
    c.drawString(50, 700, "Windstorm and Hail Deductible: 2%")
    c.drawString(50, 686, "All Other Perils Deductible: $2,500")
    c.drawString(50, 672, "Coverage D - Loss of Use: 20% of Coverage A")
    c.drawString(50, 658, "Water Backup Endorsement: Not Covered")
    c.drawString(50, 630, f"Total Policy Premium: {_money(prem)}")
    c.showPage()
    c.save()
    return Case(f"ins_hob_{seed}", "insurance", buf.getvalue(), dict(
        policyType="HO-B (Homeowners)", windHailDeductible="2%", aopDeductible="$2,500",
        hasLossOfRent=True, hasWaterBackup=False, annualPremium=prem))


def ins_dp1(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    prem = _premium(r)
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 740, "TEXAS DWELLING POLICY DECLARATIONS")
    c.setFont("Helvetica", 9)
    c.drawString(50, 724, "Policy Type: TDP-1 (Basic Form)")
    c.drawString(50, 700, "Coverage A - Dwelling            $150,000")
    c.drawString(50, 686, "Coverage D - Rental Value         Not Covered")
    c.drawString(50, 662, "Deductible                        $1,000")
    c.drawString(50, 648, "Wind/Hail Deductible              $1,000")
    c.drawString(50, 620, f"Policy Premium                    {_money(prem)}")
    c.showPage()
    c.save()
    return Case(f"ins_dp1_{seed}", "insurance", buf.getvalue(), dict(
        policyType="DP-1", windHailDeductible="$1,000", aopDeductible="$1,000",
        hasLossOfRent=False, annualPremium=prem))


def ins_landlord_table(seed: int) -> Case:
    r = random.Random(f"{_caller()}-{seed}")
    prem = _premium(r)
    wind = r.choice(["$2,500", "1%", "2%"])
    buf, c = _canvas()
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 740, "LANDLORD PROTECTOR - POLICY DECLARATIONS")
    c.setFont("Helvetica", 9)
    c.drawString(50, 722, f"Named Insured: {r.choice(OWNERS)}")
    c.drawString(50, 710, f"Insured Location: {_street(r)}, ARLINGTON TX 76012")
    c.setFont("Helvetica-Bold", 9)
    for x, h in zip([50, 300, 450], ["Coverage", "Limit", "Premium"]):
        c.drawString(x, 680, h)
    c.setFont("Helvetica", 9)
    y = 664
    for a, b, p in [("Dwelling", "$245,000", "$1,020"), ("Other Structures", "$24,500", "Included"),
                    ("Loss of Rents", "12 Months", "$95"), ("Premises Liability", "$300,000", "$64")]:
        c.drawString(50, y, a)
        c.drawString(300, y, b)
        c.drawString(450, y, p)
        y -= 13
    c.drawString(50, 600, f"Deductibles:  Wind/Hail {wind}    All Other Perils $1,000")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(300, 570, "Total Premium")
    c.drawString(450, 570, _money(prem))
    c.showPage()
    c.save()
    return Case(f"ins_landlord_{seed}", "insurance", buf.getvalue(), dict(
        policyType="Landlord", windHailDeductible=wind, aopDeductible="$1,000",
        hasLossOfRent=True, annualPremium=prem))


TAX_GENERATORS = [tax_tarrant, tax_dallas_two_page, tax_denton_keyvalue, tax_merged_rows, tax_prior_current_cols]
INS_GENERATORS = [ins_dp3_steadily, ins_ho3, ins_ho_b, ins_dp1, ins_landlord_table]


# --- Degradation -------------------------------------------------------------------

def render_png(pdf: bytes, page: int = 1, dpi: int = 200) -> bytes:
    with tempfile.TemporaryDirectory() as d:
        src = Path(d, "in.pdf")
        src.write_bytes(pdf)
        subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(page), "-l", str(page), "-png", str(src), str(Path(d, "p"))],
                       check=True, capture_output=True)
        out = sorted(Path(d).glob("p*.png"))[0]
        return out.read_bytes()


def stack_pages(pdf: bytes, dpi: int = 150) -> bytes:
    """All pages stacked vertically into one image (as the old browser code did)."""
    from PIL import Image

    imgs = []
    with tempfile.TemporaryDirectory() as d:
        src = Path(d, "in.pdf")
        src.write_bytes(pdf)
        subprocess.run(["pdftoppm", "-r", str(dpi), "-png", str(src), str(Path(d, "p"))], check=True, capture_output=True)
        for p in sorted(Path(d).glob("p*.png")):
            imgs.append(Image.open(p).convert("RGB"))
    w = max(i.width for i in imgs)
    out = Image.new("RGB", (w, sum(i.height for i in imgs)), "white")
    y = 0
    for i in imgs:
        out.paste(i, (0, y))
        y += i.height
    buf = io.BytesIO()
    out.save(buf, "PNG")
    return buf.getvalue()


def degrade(png: bytes, mode: str, seed: int = 0) -> bytes:
    import numpy as np
    from PIL import Image, ImageFilter

    r = random.Random(f"{_caller()}-{seed}")
    img = Image.open(io.BytesIO(png)).convert("L")
    if mode == "scan":
        img = img.rotate(r.uniform(-1.5, 1.5), expand=True, fillcolor=255, resample=Image.BICUBIC)
        a = np.asarray(img).astype(np.float32)
        a += np.random.default_rng(seed).normal(0, 12, a.shape)
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=55)
        return buf.getvalue()
    if mode == "photo":
        import cv2

        a = np.asarray(img.convert("RGB"))
        h, w = a.shape[:2]
        j = lambda s: r.uniform(0, s)  # noqa: E731
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dst = np.float32([[j(w * .04), j(h * .03)], [w - j(w * .04), j(h * .03)],
                          [w - j(w * .02), h - j(h * .02)], [j(w * .02), h - j(h * .02)]])
        M = cv2.getPerspectiveTransform(src, dst)
        a = cv2.warpPerspective(a, M, (w, h), borderValue=(90, 85, 80))
        # Uneven lighting.
        grad = np.linspace(0.78, 1.05, w, dtype=np.float32)[None, :, None]
        a = np.clip(a.astype(np.float32) * grad + np.array([8, 4, -6]), 0, 255).astype(np.uint8)
        img = Image.fromarray(a)
        img = img.resize((int(w * 0.8), int(h * 0.8)))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=70)
        return buf.getvalue()
    raise ValueError(mode)


def image_pdf(png_or_jpg: bytes) -> bytes:
    """Wrap an image in a PDF with no text layer (a scanned PDF)."""
    from PIL import Image

    img = Image.open(io.BytesIO(png_or_jpg)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "PDF", resolution=200)
    return buf.getvalue()


def build(seeds=(1, 2, 3), form_path: Path | None = None) -> list[Case]:
    cases: list[Case] = []
    for s in seeds:
        for g in TAX_GENERATORS + INS_GENERATORS:
            cases.append(g(s))
        if form_path and form_path.exists():
            cases.append(tax_comptroller_form(s, form_path))
    return cases
