"""Simulateur DCA. Tous les taux sont des PARAMÈTRES à vérifier (fiscalité susceptible d'évoluer)."""
def simulate_dca(monthly, years, annual_return, ter=0.002, inflation=0.02,
                 tax_rate=0.186, initial=0.0, broker_fee_per_order=0.0):
    """Capitalisation mensuelle. tax_rate appliqué sur la plus-value à la sortie
    (PEA >5 ans : prélèvements sociaux seulement — taux à vérifier ; CTO : flat tax)."""
    net_m = (1 + annual_return - ter) ** (1 / 12) - 1
    bal, invested = initial, initial
    for _ in range(int(years * 12)):
        bal = bal * (1 + net_m) + (monthly - broker_fee_per_order)
        invested += monthly
    gain = max(0.0, bal - invested)
    after_tax = bal - gain * tax_rate
    real = after_tax / ((1 + inflation) ** years)
    return {"invested": invested, "gross": bal, "after_tax": after_tax,
            "real_after_tax": real, "gain": gain}

def dca_vs_lump(prices, total, months=12):
    """Compare l'investissement immédiat vs étalé sur `months` mois, sur un historique réel
    (fenêtres glissantes). Retourne la part des cas où le DCA fait mieux."""
    import pandas as pd
    m = prices.resample("ME").last().dropna()
    wins, n, diffs = 0, 0, []
    for i in range(len(m) - months):
        w = m.iloc[i:i + months + 1]
        lump = total / w.iloc[0] * w.iloc[-1]
        dca = sum((total / months) / w.iloc[k] * w.iloc[-1] for k in range(months))
        diffs.append(dca / lump - 1); n += 1; wins += dca > lump
    return {"windows": n, "dca_better_share": wins / n if n else None,
            "median_diff": float(pd.Series(diffs).median()) if diffs else None}

def stress_test(weights: dict, shocks: dict):
    """weights: {actif: poids}; shocks: {actif: choc en %} -> impact portefeuille."""
    return sum(weights[a] * shocks.get(a, 0) for a in weights)
