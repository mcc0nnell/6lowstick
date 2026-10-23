#!/usr/bin/env python3
"""Deterministic structural/pin-assignment check, deliberately NOT KiCad ERC."""
from pathlib import Path
import json, re, subprocess, sys
from collections import Counter

R = Path(__file__).resolve().parent
text=(R/'6lowSpark_A0_Interposer.kicad_sch').read_text()
pins=json.loads((R/'pinmap.json').read_text())

# Minimal syntax checker handles quoted strings and balanced s-expressions.
def validate_sexpr(s):
    stack=[]; quoted=False; escaped=False
    for c in s:
        if quoted:
            if escaped: escaped=False
            elif c == '\\': escaped=True
            elif c == '"': quoted=False
        elif c=='"': quoted=True
        elif c=='(': stack.append(c)
        elif c==')':
            assert stack, 'unexpected close parenthesis'
            stack.pop()
    assert not quoted and not stack, 'unterminated s-expression/string'
    assert s.lstrip().startswith('(kicad_sch')

validate_sexpr(text)
assert '\t(version 20250114)' in text
assert 'BMS' not in text and 'Qi2' not in text, 'battery circuitry is not A0'
assert 'SW_PUSH_6mm_H5mm' in text
assert 'PinHeader_1x11_P2.54mm' in text
assert text.count('(no_connect ') == 2, '3V3_OUT and EXTCOMIN must be unconnected'

labeled=Counter(re.findall(r'\(label "([A-Z0-9_]+)"', text))
expected=Counter()
for parts in pins.values():
    for p in parts:
        if p['net']!='NC': expected[p['net']]+=1
for x in ['BTN_NEXT','BTN_BACK']: expected[x]+=1
expected['GND']+=4  # both switches and both capacitors
expected['RF_VDD']+=2
assert labeled==expected, f'wrong net labels: {labeled-expected}, missing: {expected-labeled}'
assert all(v>=2 for v in labeled.values()), 'dangling net without another endpoint'
assert len(pins['J1'])==16 and len(pins['J2'])==9 and len(pins['J3'])==11 and len(pins['J4'])==2
assert pins['J4'][0]['net']=='HOST_VDD' and pins['J4'][1]['net']=='RF_VDD'
assert pins['J2'][1]['net']=='NC', 'never drive display 3V3 OUT pin'
assert pins['J2'][8]['net']=='GND', 'software VCOM mode'
assert pins['J1'][2]['pin']=='D13_P1.15_SCK' and pins['J1'][3]['pin']=='D11_P1.13_MOSI' and pins['J1'][4]['pin']=='D12_P1.14_MISO'
assert all(p['net'] not in ['GND', 'HOST_VDD'] for p in pins['J1'][2:-1])
for ref,pts in pins.items():
    assert f'"inst:{ref}"' not in text
    assert f'(property "Reference" "{ref}"' in text
    assert len({p['pin'] for p in pts})==len(pts)

# Re-run generator. Checked-in source must be deterministic and up-to-date.
before=text
subprocess.run([sys.executable, str(R/'generate.py')],check=True,capture_output=True)
assert (R/'6lowSpark_A0_Interposer.kicad_sch').read_text()==before, 'schematic out of sync with pinmap/generator'
print(f'A0 STRUCTURAL/PINMAP PASS: {len(pins)} headers, 2 switches, 2 decouplers, {len(labeled)} distinct nets; native ERC NOT RUN')
