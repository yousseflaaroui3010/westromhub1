"""Fast parser tests on hand-built lines (no Docling, no models)."""

from wgc_extract.fields import money_values, pct_values
from wgc_extract.insurance import extract_insurance
from wgc_extract.reader import Document, Line
from wgc_extract.tax import extract_tax


def doc(*rows: tuple[float, float, str], page: int = 1) -> Document:
    """rows = (x, y, text); each line is 9pt tall, ~5pt per character wide."""
    return Document(lines=[Line(page, x, y, x + 5 * len(t), y + 9, t) for x, y, t in rows], pages=1)


def test_money_values():
    assert money_values("Total $1,842.00") == [1842]
    assert money_values("$ 158,000 and 2,500") == [158000, 2500]
    assert money_values("AUSTIN TX 78749") == []          # ZIP is not money
    assert money_values("78749") == [78749]               # ...unless it is the whole cell
    assert money_values("2026") == []                     # years are never money
    assert money_values("$-1,950") == []                  # credits are skipped
    assert money_values("$1O0,000") == [100000]           # OCR O->0 inside numbers


def test_pct_values():
    assert pct_values("Deductible 1% ($100 Min.)") == [1.0]
    assert pct_values("2.5 % of Coverage A") == [2.5]


def test_tax_fused_labels_and_situs_not_mailing():
    d = doc(
        (50, 40, "DENTON CENTRAL APPRAISAL DISTRICT"),
        (50, 60, "2026 Appraisal Notice"),
        (50, 90, "Mailing Address"), (50, 101, "9 OWNER WAY STE 4"),
        (300, 90, "Situs Address"), (300, 101, "812 ELM ST"), (300, 112, "DENTON TX 76201"),
        (50, 150, "2025 Market Value: $250,000"),
        (50, 165, "2026 Market Value: $305,000"),
        (50, 180, "2026 Appraised Value: $300,000"),
        (50, 195, "2026 Taxable Value: $200,000"),
    )
    out = extract_tax(d)
    assert out["currentValue"] == 305000 and out["priorValue"] == 250000
    assert out["address"].startswith("812 ELM ST")
    assert out["county"] == "Denton County"


def test_tax_grid_years_as_rows():
    d = doc(
        (50, 40, "TARRANT APPRAISAL DISTRICT"), (300, 60, "2026 NOTICE OF APPRAISED VALUE"),
        (50, 120, "Year"), (150, 120, "Land Value"), (300, 120, "Market Value"), (420, 120, "Appraised Value"),
        (50, 135, "2025"), (150, 135, "$60,000"), (300, 135, "$240,000"), (420, 135, "$240,000"),
        (50, 150, "2026"), (150, 150, "$65,000"), (300, 150, "$310,000"), (420, 150, "$288,000"),
    )
    out = extract_tax(d)
    assert (out["currentValue"], out["priorValue"]) == (310000, 240000)


def test_tax_falls_back_to_appraised_pair_when_market_missing_for_a_year():
    d = doc(
        (50, 40, "Notice of Appraised Value"), (400, 40, "Tax Year 2026"),
        (300, 100, "Last Year"), (300, 109, "Appraised Value"),
        (400, 100, "Current Year"), (400, 109, "Market Value"),
        (500, 100, "Current Year"), (500, 109, "Appraised Value"),
        (300, 125, "$227,600"), (400, 125, "$236,700"), (500, 125, "$236,700"),
    )
    out = extract_tax(d)
    assert (out["currentValue"], out["priorValue"]) == (236700, 227600)


def test_tax_refuses_other_documents():
    assert extract_tax(doc((50, 40, "INVOICE"), (50, 60, "Carpet cleaning  $240.00"))) == {"error": "not_a_tax_document"}


def test_insurance_dp3_with_percentage_wind_and_excluded_water():
    d = doc(
        (50, 40, "POLICY DECLARATIONS"), (50, 55, "Policy form: DP-3 Special Form"),
        (50, 90, "Coverage D - Fair Rental Value"), (380, 90, "$42,000"),
        (50, 120, "Deductibles"),
        (50, 135, "All Other Perils"), (380, 135, "$1,000"),
        (50, 150, "Wind / Hail"), (380, 150, "2% ($6,400)"),
        (50, 180, "Water Back-Up and Sump Discharge"), (380, 180, "Not Covered"),
        (50, 210, "Total Annual Premium"), (380, 210, "$1,842.00"),
        (50, 225, "Monthly installment"), (380, 225, "$153.50"),
    )
    out = extract_insurance(d)
    assert out == {
        "policyType": "DP-3", "windHailDeductible": "2%", "aopDeductible": "$1,000",
        "hasLossOfRent": True, "hasWaterBackup": False, "annualPremium": 1842,
    }


def test_insurance_texas_forms_and_unknown_coverages_stay_unknown():
    out = extract_insurance(doc((50, 40, "Texas Homeowners Policy Form HO-B"), (50, 60, "Total Policy Premium: $2,310")))
    assert out["policyType"] == "HO-B (Homeowners)"
    assert "hasLossOfRent" not in out and "hasWaterBackup" not in out  # not mentioned != missing


def test_insurance_iso_form_numbers():
    assert extract_insurance(doc((50, 40, "Declarations"), (50, 60, "Form DP 00 01 (Basic)")))["policyType"] == "DP-1"
    assert extract_insurance(doc((50, 40, "Declarations"), (50, 60, "Policy Form: HO 00 03")))["policyType"] == "HO-3"


def test_insurance_refuses_other_documents():
    assert extract_insurance(doc((50, 40, "Move-out inspection"), (50, 60, "Kitchen: stains"))) == {"error": "not_an_insurance_document"}


def test_tax_tarrant_grid_year_land_impr_and_legal_text():
    """Tarrant's 2025 notice: title year, not the 2026 in the legal note; the
    TOTAL row, not LAND/IMPR (OCR glues the word to the number)."""
    d = doc(
        (210, 34, "2025 PROPERTY VALUE NOTICE"),
        (66, 57, "TARRANT APPRAISAL DISTRICT"),
        (35, 257, "2024 Market Value For Questions Please Call:"), (237, 257, "2025 Market Value"), (336, 257, "2025 Appraised Value"),
        (65, 268, "460,000"), (258, 268, "200,000LAND"),
        (22, 278, "2024 Appraised Value"), (258, 280, "350,000IMPR"),
        (65, 291, "460,000"), (259, 292, "550,000TOTAL"), (360, 292, "550,000 TOTAL"),
        (12, 463, "\"Under Section 23.231, Tax Code, for the 2024, 2025, and 2026 tax years, the appraised value of real property"),
    )
    out = extract_tax(d)
    assert out["taxYear"] == 2025
    assert out["currentValue"] == 550000 and out["priorValue"] == 460000


def test_tax_appraised_above_market_is_a_misread():
    """Appraised can never exceed market for the same year. When OCR turns
    460,000 into 400000, trust the value the notice repeats; never report the
    misread one."""
    d = doc(
        (210, 34, "2025 PROPERTY VALUE NOTICE"),
        (35, 100, "2024 Market Value"), (35, 111, "400000"),
        (200, 100, "2024 Appraised Value"), (200, 111, "460,000"),
        (35, 140, "2025 Market Value"), (35, 151, "550,000"),
        (200, 140, "2025 Appraised Value"), (200, 151, "550,000"),
        (35, 200, "2024 Taxable Value"), (35, 211, "460,000"), (35, 222, "460,000"),
    )
    out = extract_tax(d)
    assert out["currentValue"] == 550000 and out["priorValue"] == 460000
    # No tie-breaker on the page: leave it empty rather than guess.
    d2 = doc(
        (210, 34, "2025 PROPERTY VALUE NOTICE"),
        (35, 100, "2024 Market Value"), (35, 111, "400000"),
        (200, 100, "2024 Appraised Value"), (200, 111, "460,000"),
        (35, 140, "2025 Market Value"), (35, 151, "550,000"),
    )
    assert "priorValue" not in extract_tax(d2)
