#!/usr/bin/env python3
"""Offline tire-telemetry inspector for an iRacing .ibt file.

Reports, for every tire-related channel: unit, % coverage (non-null / non-zero),
value range, and an *effective* update rate (how often the value actually changes
vs the 60 Hz logging rate) so we know the usable sampling rate for the widget.

Usage: python3 tools/inspect_tires.py <path-to.ibt>
"""
import sys, statistics
import irsdk

TIRE_KEYS = ("temp", "wear", "press", "tread", "tire", "tyre")
CORNERS = ("LF", "RF", "LR", "RR")

def is_tire(name: str) -> bool:
    n = name.lower()
    return any(k in n for k in TIRE_KEYS) and (name[:2] in CORNERS or "tire" in n or "tyre" in n)

def main(path):
    ibt = irsdk.IBT()
    ibt.open(path)
    names = sorted(ibt.var_headers_names)
    tire = [n for n in names if is_tire(n)]
    # Estimate logging rate + duration from SessionTime channel.
    st = ibt.get_all("SessionTime")
    n_samples = len(st) if st else 0
    dur = (st[-1] - st[0]) if st and len(st) > 1 else 0
    rate = (n_samples / dur) if dur else 0
    print(f"file: {path}")
    print(f"samples: {n_samples}  duration: {dur:.1f}s  logging rate: ~{rate:.1f} Hz")
    print(f"tire-related channels found: {len(tire)}\n")
    hdr = f"{'channel':14} {'unit':6} {'cover%':>6} {'min':>8} {'max':>8} {'mean':>8} {'changes/s':>9}"
    print(hdr); print("-"*len(hdr))
    for name in tire:
        vals = ibt.get_all(name)
        if not vals:
            print(f"{name:14} {'-':6} {'0':>6}  (no data)"); continue
        unit = ""
        try: unit = ibt.var_headers[ibt.var_headers_names.index(name)].unit or ""
        except Exception: pass
        nn = [v for v in vals if v is not None]
        nz = [v for v in nn if v != 0]
        cover = 100.0 * len(nz) / len(vals) if vals else 0
        changes = sum(1 for a, b in zip(nn, nn[1:]) if a != b)
        cps = changes / dur if dur else 0
        mn = min(nn) if nn else float('nan')
        mx = max(nn) if nn else float('nan')
        mean = statistics.fmean(nn) if nn else float('nan')
        print(f"{name:14} {unit[:6]:6} {cover:6.0f} {mn:8.2f} {mx:8.2f} {mean:8.2f} {cps:9.1f}")
    ibt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python3 tools/inspect_tires.py <path-to.ibt>"); sys.exit(1)
    main(sys.argv[1])
