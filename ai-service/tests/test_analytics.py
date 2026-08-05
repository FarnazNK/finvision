from app.analytics import (allocation_by_class, concentration, market_value,
                           unrealized_gain)
from app.schemas import Holding, PortfolioSnapshot

SNAP = PortfolioSnapshot(holdings=[
    Holding(id="h1", symbol="AAA", name="A", assetClass="equity",
            quantity=10, costBasis=100, price=150, dayChangePct=0.01),
    Holding(id="h2", symbol="BBB", name="B", assetClass="cash",
            quantity=500, costBasis=1, price=1, dayChangePct=0.0),
])


def test_market_value():
    assert market_value(SNAP) == 10 * 150 + 500


def test_unrealized_gain():
    g = unrealized_gain(SNAP)
    assert g["marketValue"] == 2000
    assert g["costBasis"] == 1500
    assert g["unrealized"] == 500


def test_allocation_sums_to_one():
    alloc = allocation_by_class(SNAP)
    assert abs(sum(alloc.values()) - 1.0) < 1e-6


def test_concentration_sorted():
    rows = concentration(SNAP)
    assert rows[0]["weight"] >= rows[-1]["weight"]
