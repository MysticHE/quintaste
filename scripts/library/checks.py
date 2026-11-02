"""Quality checks for one normalised food (docs/AI_FOOD_LIBRARY_PLAN.md §2, cleaning rules).

Impossible values are dropped and flagged; doubtful ones are kept and flagged for the clean layer to weigh.
"""

# Highest plausible value per 100 g, set a few times above real extremes so only unit mistakes (often x1000) are dropped:
# baking powder calcium, cream of tartar and salt substitutes potassium, kombu iodine, liver vitamin A, yeast extract folate.
LIMITS = {
    'kcal': 902, 'protein': 101, 'fat': 101, 'satFat': 101, 'carbs': 101, 'carbsAvailable': 106, 'sugar': 106, 'fibre': 101,
    'water': 101, 'ash': 101, 'sodium': 40000, 'vitA': 150000, 'vitC': 5000, 'vitD': 1500, 'vitE': 300, 'b12': 1000,
    'folate': 10000, 'iron': 300, 'calcium': 12000, 'zinc': 150, 'magnesium': 5000, 'potassium': 60000, 'iodine': 1000000,
    'ala': 70, 'lysine': 15000, 'methionine': 8000,
}


def check(food):
    """Drops impossible values from food['values'] and returns the food's flags."""
    values, flags = food['values'], []
    for key in list(values):
        value = values[key][0]
        if value is None or value < 0 or value > LIMITS[key]:
            del values[key]
            flags.append('dropped:' + key)
    get = {key: v[0] for key, v in values.items()}.get
    if get('fat') is not None and get('satFat') is not None and get('satFat') > get('fat') * 1.02 + 0.1:
        flags.append('satFatOverFat')
    if get('carbs') is not None:
        for part in ('sugar', 'fibre'):
            if get(part) is not None and get(part) > get('carbs') + 1:
                flags.append(part + 'OverCarbs')
    parts = [get(k) for k in ('protein', 'fat', 'carbs', 'water', 'ash')]
    if all(p is not None for p in parts) and sum(parts) > 102:
        flags.append('macroSum')
    kcal, protein, fat = get('kcal'), get('protein'), get('fat')
    if kcal is not None and protein is not None and fat is not None:
        fibre = get('fibre') or 0
        if get('carbs') is not None:
            carb_energy = 4 * max(get('carbs') - fibre, 0) + 2 * fibre
        elif get('carbsAvailable') is not None:
            carb_energy = 3.75 * get('carbsAvailable') + 2 * fibre
        else:
            carb_energy = None
        if carb_energy is not None:
            estimate = 4 * protein + 9 * fat + carb_energy
            if abs(kcal - estimate) > max(20, 0.15 * kcal):
                flags.append('energyCheck')
    return flags
