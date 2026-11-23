"""Extract role-specific pools and order bindings from the pinned Star Citizen Wiki export."""
import json
from pathlib import PurePosixPath
import sys
import tarfile

COMMIT = '3cc8072b24df2a2d71eb6207708e2039f909b342'
prefix = f'scunpacked-data-{COMMIT}/contracts/'
output = {}
with tarfile.open(sys.argv[1], 'r|gz') as tar:
    for item in tar:
        if not item.isfile() or not item.name.startswith(prefix):
            continue
        raw = json.load(tar.extractfile(item))
        uuid = PurePosixPath(item.name).stem
        if uuid != raw.get('UUID'):
            raise ValueError('Contract UUID mismatch')
        orders = raw.get('HaulingOrders') or []
        if not orders or raw.get('NotForRelease') or raw.get('WorkInProgress'):
            continue
        concrete = any(o.get('MaxContainerSize', 0) > 0 for o in orders)
        orders = [o for o in orders if not (concrete and o.get('Name') == 'Iron' and o.get('MinScu') == 1
                  and o.get('MaxScu') == 0 and o.get('MaxContainerSize') == -1
                  and all(str(o.get(k, '')).endswith('_BP') for k in ('PickupPool', 'DropoffPool')))]
        pools = raw.get('LocationPools') or {}
        result = {}
        for role, purpose in [('pickup', 'Location'), ('dropoff', 'Destination')]:
            side = {k: [v.get('StarmapUUID') or v.get('Name') or '' for v in (p.get('ResolvedLocations') or [])]
                    for k, p in pools.items() if str(p.get('Purpose', '')).startswith(purpose)}
            if not side:
                continue
            # A missing candidate list represents a dynamic or unresolved slot.
            bindings = []
            for order in orders:
                name = str(order.get(role.title() + 'Pool') or '')
                k = name if name in side else name.removesuffix('_BP')
                bindings.append(side.get(k))
            result[role] = list(side.values())
            if any(bindings):
                result[role + 'Orders'] = bindings
        if result:
            result['items'] = [o.get('Name') for o in orders]
            result['fixed'] = [o.get('MinScu') if o.get('Kind') == 'Resource' and (o.get('MinScu') or 0) > 0
                               and o.get('MaxScu') in (0, o.get('MinScu')) else None for o in orders]
            output[uuid] = result
if not output:
    raise ValueError('No freight records in pinned archive')
json.dump(output, sys.stdout, separators=(',', ':'))
