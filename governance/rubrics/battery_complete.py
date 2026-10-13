# battery_complete@1 (RD-28): ACCEPT when the battery record handed in as the one reference covers THIS content.
# The record names the artifact's digest as its manifest; every mutation names its claim, was killed, and had its
# restore verified; a mutation killed only at build carries a re-plant killed by a test (RD-10); an empty battery
# says why (no new or changed claims, RD-26). The record's shape is governance/battery-record.schema.json.
# Nothing outside (a, refs) is consulted.
def check(a, refs):
    import json
    if len(refs) != 1:
        return 'REFUSE(NOT_THIS_CONTENT)'
    try:
        rec = json.loads(refs[0].data.decode('utf-8'))
    except ValueError:
        return 'REFUSE(NOT_THIS_CONTENT)'
    if not isinstance(rec, dict) or rec.get('manifest') != a.h or not isinstance(rec.get('mutations'), list):
        return 'REFUSE(NOT_THIS_CONTENT)'
    muts = rec['mutations']
    if not muts:
        why = rec.get('no_new_claims')
        return 'ACCEPT' if isinstance(why, str) and why.strip() else 'REFUSE(EMPTY_BATTERY)'
    if any(not isinstance(m, dict) or not isinstance(m.get('claim'), str) or not m['claim'].strip() for m in muts):
        return 'REFUSE(UNNAMED_CLAIM)'
    if any(m.get('killed') is not True for m in muts):
        return 'REFUSE(SURVIVOR)'
    if any(m.get('restore_verified') is not True for m in muts):
        return 'REFUSE(RESTORE_UNVERIFIED)'
    for m in muts:
        if m.get('killed_by') == 'build':
            again = m.get('replant')
            if not (isinstance(again, dict) and again.get('killed') is True and again.get('killed_by') == 'test'):
                return 'REFUSE(BUILD_ONLY_KILL)'
    return 'ACCEPT'
