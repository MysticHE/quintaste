"""QT Manager fixes recipes instead of holding them (owner, 30 Oct 2026: "a team of smart chefs which can make their own decisions").

Both of Manager's reviews may return small corrections with an approval: `edits: [{path, value, reason}]`. The coordinator applies
them here, logs them on the record, and then runs the hard rules again (recipe_policy, the app's limits); an edit can never get a
recipe past those. Paths name one field:

    name, author, adaptationNote, description, minutes, servings, sourceTimingMinutes
    ingredients.<ingredient id>.name | amount | unit | grams
    steps.<step number from 1>.title | instruction

Anything else (diet labels, sources, pictures, ids) is refused: those stay with Cooker's research and the coordinator's checks.
"""
import copy

TOP = {'name': str, 'author': str, 'adaptationNote': str, 'description': str, 'minutes': (int, float), 'servings': (int, float),
       'sourceTimingMinutes': dict}
INGREDIENT = {'name': str, 'amount': (int, float, type(None)), 'unit': str, 'grams': (int, float, type(None))}
STEP = {'title': str, 'instruction': str}


class EditError(ValueError):
    pass


def _check(value, kinds, path):
    if isinstance(value, bool) or not isinstance(value, kinds):
        raise EditError(f'{path}: wrong type')
    if isinstance(value, str) and not value.strip():
        raise EditError(f'{path}: empty')
    return value.strip() if isinstance(value, str) else value


def shape(path):
    """'ingredients.salt.amount' -> 'ingredients.*.amount', so allowed paths can be listed once."""
    parts = path.split('.')
    return '.'.join([parts[0], '*', parts[2]]) if len(parts) == 3 else path


def apply(recipe, edits, paths=None):
    """A copy of the recipe with Manager's edits applied, and the log of what changed. Raises EditError on a bad edit.
    paths: the path shapes allowed here (None: every editable field)."""
    if not isinstance(edits, list):
        raise EditError('edits must be a list')
    out, log = copy.deepcopy(recipe), []
    for edit in edits:
        if not isinstance(edit, dict) or not isinstance(edit.get('path'), str):
            raise EditError('each edit needs a path')
        path, value = edit['path'].strip(), edit.get('value')
        if paths is not None and shape(path) not in paths:
            raise EditError(f'{path}: not editable at this review')
        parts = path.split('.')
        if len(parts) == 1 and parts[0] in TOP:
            before = out.get(parts[0])
            out[parts[0]] = _check(value, TOP[parts[0]], path)
        elif len(parts) == 3 and parts[0] == 'ingredients' and parts[2] in INGREDIENT:
            item = next((i for i in out.get('ingredients') or [] if isinstance(i, dict) and str(i.get('id')) == parts[1]), None)
            if item is None:
                raise EditError(f'{path}: no ingredient with that id')
            before = item.get(parts[2])
            item[parts[2]] = _check(value, INGREDIENT[parts[2]], path)
        elif len(parts) == 3 and parts[0] == 'steps' and parts[1].isdigit() and parts[2] in STEP:
            steps = out.get('steps') or []
            number = int(parts[1])
            if not 1 <= number <= len(steps) or not isinstance(steps[number - 1], dict):
                raise EditError(f'{path}: no such step')
            before = steps[number - 1].get(parts[2])
            steps[number - 1][parts[2]] = _check(value, STEP[parts[2]], path)
        else:
            raise EditError(f'{path}: not a field Manager may edit')
        log.append({'path': path, 'before': before, 'after': value, 'reason': str(edit.get('reason', ''))[:300]})
    return out, log
