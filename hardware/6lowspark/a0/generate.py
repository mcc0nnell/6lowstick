#!/usr/bin/env python3
"""Deterministic KiCad 9 schematic generation for 6lowSpark A0 interposer.

Creates a passive-interface laboratory harness, NOT a final integrated board.
No radio-specific carrier footprint or charging circuit is assumed.
"""
from pathlib import Path
import json, uuid, hashlib

ROOT=Path(__file__).resolve().parent
pins=json.loads((ROOT/'pinmap.json').read_text())
SHEET='6lowSpark_A0_Interposer'
UUID_NS=uuid.UUID('4c163f45-0e0e-4a69-b6d0-f780b7031c5d')
def uid(key):return str(uuid.uuid5(UUID_NS,key))
def f(x):return ('%.3f'%x).rstrip('0').rstrip('.') if x else '0'
def esc(v):return str(v).replace('\\','\\\\').replace('"','\\"')
def t(v):return '"'+esc(v)+'"'
root=uid('root')
S=['(kicad_sch','\t(version 20250114)','\t(generator "eeschema")',f'\t(uuid {t(root)})','\t(paper "A3")', '\t(lib_symbols']

# Generic SMD switches and capacitors are used only as laboratory interposer
# components. These symbols are completely embedded for standalone KiCad opening.
def symbol_lib(id,ref,value,style,terminals,width=33.02):
  lines=[f'\t\t(symbol {t("6lowSpark:"+id)}', '\t\t\t(pin_names (offset 1.016))',
         '\t\t\t(in_bom yes)','\t\t\t(on_board yes)',
         f'\t\t\t(property "Reference" {t(ref)} (at 0 0 0) (effects (font (size 1.27 1.27))))',
         f'\t\t\t(property "Value" {t(value)} (at 0 -2.54 0) (effects (font (size 1.27 1.27))))',
         '\t\t\t(property "Footprint" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))',
         '\t\t\t(property "Datasheet" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))',
         f'\t\t\t(symbol {t(id+"_1_1")}']
  if style=='connector':
    maxpins=len(terminals)
    top=(maxpins+1)*2.54
    lines.append(f'\t\t\t\t(rectangle (start {f(-width/2)} {f(top+1.27)}) (end {f(width/2)} {f(-1.27)}) (stroke (width 0.254) (type default)) (fill (type background)))')
    for i,p in enumerate(terminals):
      # external pin on symbol LEFT or RIGHT, pointing into body
      side=p.get('side','left')
      x=-width/2-10.16 if side=='left' else width/2+10.16
      deg=0 if side=='left' else 180
      y=(maxpins-i)*2.54
      lines.append(f'\t\t\t\t(pin passive line (at {f(x)} {f(y)} {deg}) (length 10.16) (name {t(p["name"])} (effects (font (size 1.016 1.016)))) (number {t(p["number"])} (effects (font (size 1.016 1.016)))))')
  elif style=='switch':
    lines += ['\t\t\t\t(polyline (pts (xy -2.54 0) (xy 2.54 2.54)) (stroke (width 0.254) (type default)) (fill (type none)))',
       '\t\t\t\t(pin passive line (at -7.62 0 0) (length 5.08) (name "1" (effects (font (size 1 1)))) (number "1" (effects (font (size 1 1)))))',
       '\t\t\t\t(pin passive line (at 7.62 0 180) (length 5.08) (name "2" (effects (font (size 1 1)))) (number "2" (effects (font (size 1 1)))))']
  elif style=='capacitor':
    lines += ['\t\t\t\t(polyline (pts (xy -2.54 1.27) (xy 2.54 1.27)) (stroke (width 0.508) (type default)) (fill (type none)))',
       '\t\t\t\t(polyline (pts (xy -2.54 -1.27) (xy 2.54 -1.27)) (stroke (width 0.508) (type default)) (fill (type none)))',
       '\t\t\t\t(pin passive line (at 0 7.62 270) (length 6.35) (name "1" (effects (font (size 1 1)))) (number "1" (effects (font (size 1 1)))))',
       '\t\t\t\t(pin passive line (at 0 -7.62 90) (length 6.35) (name "2" (effects (font (size 1 1)))) (number "2" (effects (font (size 1 1)))))']
  lines += ['\t\t\t)', '\t\t)']
  return lines

blocks={
 'J1': {'id':'HOST_DK','at':(54.61,96.52),'side':'right','value':'NRF52840_DK_WIRES','footprint':'Connector_PinHeader_2.54mm:PinHeader_1x16_P2.54mm_Vertical'},
 'J2': {'id':'LCD_3502','at':(172.72,68.58),'side':'left','value':'SHARP_3502_BREAKOUT','footprint':'Connector_PinHeader_2.54mm:PinHeader_1x09_P2.54mm_Vertical'},
 'J3': {'id':'SX1262_WIRE_ADAPTER','at':(172.72,147.32),'side':'left','value':'SX1262_CARRIER_WIRES','footprint':'Connector_PinHeader_2.54mm:PinHeader_1x11_P2.54mm_Vertical'},
 'J4': {'id':'RF_POWER_LINK','at':(88.90,175.26),'side':'right','value':'RF_POWER_LINK_NO_SHUNT','footprint':'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical'},
}
for ref,b in blocks.items():
  terminals=[{'number':str(i+1),'name':p['pin'],'side':b['side']} for i,p in enumerate(pins[ref])]
  S.extend(symbol_lib(b['id'],'J',b['value'],'connector',terminals))
S.extend(symbol_lib('SW_PUSH','SW','SW_PUSH','switch',[]))
S.extend(symbol_lib('C_PASSIVE','C','C','capacitor',[]))
# Mirror the embedded passive symbols in a project-local, versioned library.
# A cached in-schematic symbol alone triggers KiCad library-reference warnings.
# The project table uses KIPRJMOD and never requires a global library install.
library='(kicad_symbol_lib\n\t(version 20231120)\n\t(generator \"kicad_symbol_editor\")\n' + (
    '\n'.join(S[6:]).replace('(symbol \"6lowSpark:', '(symbol \"')
) + '\n)\n'
(ROOT/'6lowSpark.kicad_sym').write_text(library)
# A matching KiCad project file is required for the local sym-lib-table
# to load in kicad-cli ERC, even when the schematic embeds cached symbols.
(ROOT/(SHEET+'.kicad_pro')).write_text('{}\n')
(ROOT/'sym-lib-table').write_text(
    '(sym_lib_table\n'
    '  (lib (name \"6lowSpark\")(type \"KiCad\")'
    '(uri \"${KIPRJMOD}/6lowSpark.kicad_sym\")'
    '(options \"\")(descr \"A0 passive interposer symbols\") )\n'
    ')\n'
)
S += ['\t)']

# Symbols at absolute locations and net-wire endpoints.
def add_symbol(ref,lib,x,y,value,footprint,numbers,properties_extra=None):
  S.extend([f'\t(symbol (lib_id {t("6lowSpark:"+lib)}) (at {f(x)} {f(y)} 0) (unit 1)',
            '\t\t(in_bom yes) (on_board yes) (dnp no)',
           f'\t\t(uuid {t(uid("inst:"+ref))})',
           f'\t\t(property "Reference" {t(ref)} (at {f(x)} {f(y-3.81)} 0) (effects (font (size 1.27 1.27))))',
           f'\t\t(property "Value" {t(value)} (at {f(x)} {f(y-1.27)} 0) (effects (font (size 1.27 1.27))))',
           f'\t\t(property "Footprint" {t(footprint)} (at {f(x)} {f(y)} 0) (effects (font (size 1.27 1.27)) hide))',
           '\t\t(property "Datasheet" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))'])
  if properties_extra:
    for k,v in properties_extra.items():S.append(f'\t\t(property {t(k)} {t(v)} (at 0 0 0) (effects (font (size 1.27 1.27)) hide))')
  for n in numbers:S.append(f'\t\t(pin {t(str(n))} (uuid {t(uid("inst:"+ref+":pin:"+str(n)))}) )')
  S.extend([f'\t\t(instances (project {t(SHEET)} (path {t("/"+root)} (reference {t(ref)}) (unit 1))))', '\t)'])

def wire_with_label(ref,n,xpin,ypin,net,side):
  # the endpoint at the pin's external tip extends to the text label
  dist=12.7; x2=xpin+dist if side=='right' else xpin-dist
  key=f'{ref}-{n}-{net}'
  S.append(f'\t(wire (pts (xy {f(xpin)} {f(ypin)}) (xy {f(x2)} {f(ypin)})) (stroke (width 0) (type default)) (uuid {t(uid("wire:"+key))}))')
  S.append(f'\t(label {t(net)} (at {f(x2)} {f(ypin)} 0) (effects (font (size 1.016 1.016)) (justify left bottom)) (uuid {t(uid("label:"+key))}))')

def no_conn(ref,n,x,y):S.append(f'\t(no_connect (at {f(x)} {f(y)}) (uuid {t(uid("NC:"+ref+":"+str(n)))}) )')

for ref,b in blocks.items():
  x,y=b['at']; side=b['side']; plist=pins[ref]; count=len(plist)
  add_symbol(ref,b['id'],x,y,b['value'],b['footprint'],range(1,count+1),{'DesignStatus':'LAB_HARNESS_NOT_CARRIER_FOOTPRINT'})
  for i,p in enumerate(plist):
    yp=y - (count-i)*2.54
    xp=x +(33.02/2+10.16)*(1 if side=='right' else -1)
    if p['net']=='NC':no_conn(ref,i+1,xp,yp)
    else:wire_with_label(ref,i+1,xp,yp,p['net'],side)

for i,(ref,net,x,y) in enumerate([('SW1','BTN_NEXT',101.6,217.17),('SW2','BTN_BACK',160.02,217.17)]):
  add_symbol(ref,'SW_PUSH',x,y,'TACTILE_BUTTON','Button_Switch_THT:SW_PUSH_6mm_H5mm',[1,2],{'Bench':'THT tactile, actual mechanical part verify'})
  wire_with_label(ref,1,x-7.62,y,net,'left')
  wire_with_label(ref,2,x+7.62,y,'GND','right')
for ref,value,x,y,fp in [('C1','100nF',213.36,139.7,'Capacitor_SMD:C_0603_1608Metric'),('C2','10uF',236.22,139.7,'Capacitor_SMD:C_0805_2012Metric')]:
  add_symbol(ref,'C_PASSIVE',x,y,value,fp,[1,2],{'Voltage':'VERIFY_MODULE_SPECS'})
  # Top and bottom vertical labels with wires
  for n,net,py,dy in [(1,'RF_VDD',y-7.62,-10.16),(2,'GND',y+7.62,10.16)]:
    new_y=py+dy
    key=f'{ref}-{n}-{net}'
    S.append(f'\t(wire (pts (xy {f(x)} {f(py)}) (xy {f(x)} {f(new_y)})) (stroke (width 0) (type default)) (uuid {t(uid("wire:"+key))}))')
    S.append(f'\t(label {t(net)} (at {f(x)} {f(new_y)} 0) (effects (font (size 1.016 1.016)) (justify left bottom)) (uuid {t(uid("label:"+key))}))')

# Informational text: descriptive only, never ERC substitute.
for i,(text_,x,y) in enumerate([
 ('A0 - NO BATTERY / NO QI2 / NO FIELD RADIO',30.48,28.575),
 ('P1 VDD MUST BE MEASURED; DO NOT BACKFEED DK',30.48,34.925),
 ('J3 IS OUR LAB WIRE HEADER - NOT A VENDOR PADOUT',137.16,107.95),
 ('REMOVE J4 SHUNT BY DEFAULT; NOT A SAFETY ISOLATOR',30.48,190.5),
 ('C1/C2 DECOUPLING A0 ADAPTER - SHORT LEADS',197.0,180.0),
 ('SHARP EXTMODE=GND; DRIVE SW-VCOM PER DATASHEET',131.0,39.37),
]):
  S.append(f'\t(text {t(text_)} (at {f(x)} {f(y)} 0) (effects (font (size 1.016 1.016))) (uuid {t(uid("note:"+str(i)))}) )')

S.append('\t(embedded_fonts no)')
S.append(')')
(ROOT/(SHEET+'.kicad_sch')).write_text('\n'.join(S)+'\n')
print('Generated KiCad schematic:',ROOT/(SHEET+'.kicad_sch'))
