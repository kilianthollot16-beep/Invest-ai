"""Moteur de scoring. Règle d'or : sans données suffisantes -> ATTENDRE, jamais d'opportunité inventée.
Chaque score est une heuristique transparente, pas une prévision."""
import math

def _clip(x, lo=0, hi=100): return max(lo, min(hi, x))
def _ok(x): return x is not None and not (isinstance(x, float) and math.isnan(x))

def score_asset(m: dict, ter: float | None) -> dict:
    # Confiance : dépend de la profondeur d'historique. Pas de fondamentaux ici -> plafonnée.
    yrs = m.get("history_years", 0)
    confidence = _clip(yrs / 10 * 70, 0, 70)  # plafond 70 : pas de données fondamentales/valorisation
    # Qualité (rendement ajusté du risque, frais)
    q = 50
    if _ok(m.get("sharpe")): q += _clip(m["sharpe"], -1, 1.5) * 25
    if ter is not None: q -= _clip((ter - 0.002) * 4000, 0, 20)
    # Risque (100 = très risqué)
    r = 50
    if _ok(m.get("vol")): r = _clip(m["vol"] / 0.35 * 100)
    if _ok(m.get("max_dd")): r = _clip(0.5 * r + 0.5 * (-m["max_dd"] / 0.6 * 100))
    # Valorisation : PROXY = distance au plus haut (pas un vrai PER). Marqué comme tel.
    v = 50
    if _ok(m.get("dd_now")): v = _clip(50 + (-m["dd_now"]) * 200)
    # Potentiel : momentum 1 an modéré, pénalisé si volatilité extrême
    p = 50
    if _ok(m.get("ret_1y")): p = _clip(50 + m["ret_1y"] * 100)
    if _ok(m.get("vol")) and m["vol"] > 0.4: p -= 10
    scores = {k: round(_clip(x)) for k, x in
              dict(quality=q, valuation_proxy=v, risk=r, potential=p).items()}
    return {**scores, "confidence": round(confidence)}

def cost_score(ter: float | None) -> int | None:
    """100 = gratuit, 0 = 1 %/an ou plus. 0,20 % -> 80 ; 0,38 % -> 62."""
    return None if ter is None else round(_clip(100 - ter * 10000))

def recommend(s: dict, held: bool, risk_ceiling: int = 65) -> tuple[str, list[str]]:
    why = []
    if s["confidence"] < 40:
        return "ATTENDRE", ["Historique insuffisant : pas de recommandation fiable."]
    if s["risk"] > risk_ceiling:
        why.append(f"Risque {s['risk']}/100 au-dessus de ton plafond ({risk_ceiling}).")
        return ("ALLÉGER" if held and s["risk"] > 85 else "ÉVITER"), why
    if s["quality"] >= 65 and s["valuation_proxy"] >= 55:
        why.append("Bon rapport rendement/risque et en retrait du plus haut.")
        return ("RENFORCER" if held else "ACHETER PROGRESSIVEMENT"), why
    if s["quality"] >= 55:
        why.append("Qualité correcte, rien d'urgent : continuer le plan régulier.")
        return ("CONSERVER" if held else "ACHETER PROGRESSIVEMENT"), why
    why.append("Pas d'avantage statistique clair.")
    return "ATTENDRE", why
