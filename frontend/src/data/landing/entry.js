export const PIPELINE = [
{
  step: '01',
  title: 'Detect',
  detail: 'Sentinel-1 synthetic aperture radar surfaces dark slicks and marine anomalies.',
  tag: 'SAR · C-band'
},
{
  step: '02',
  title: 'Correlate',
  detail: 'Spatial and temporal alignment against vessel AIS tracks along drift corridors.',
  tag: '375,173 fixes'
},
{
  step: '03',
  title: 'Attribute',
  detail: 'Jurisdiction evaluated under UNCLOS, then sealed into a tamper-evident package.',
  tag: 'UNCLOS'
}];


export const FEED = [
{ time: '20:06:40Z', code: 'SPL-20260910-062', body: 'dark_spot_detector · IND-EEZ · det. conf 38%', level: 'indeterminate' },
{ time: '20:04:12Z', code: 'S1D_IW_GRDH', body: 'new sentinel-1d pass over Paradip — Haldia — Sundarbans', level: 'possible' },
{ time: '19:58:03Z', code: 'SPL-20260909-089', body: '2 dark spots · supervisor acknowledgement required', level: 'probable' },
{ time: '19:51:47Z', code: 'AIS-STREAM', body: '1 bbox + margin · Persian Gulf / Strait of Hormuz', level: 'possible' },
{ time: '19:44:20Z', code: 'SPL-20260908-041', body: 'North Sea (BE / NL / UK sector) · 2 candidate vessels', level: 'probable' },
{ time: '19:37:55Z', code: 'ZONE-SYNC', body: '13 zones · 8 countries · Marine Regions v12 imported', level: 'indeterminate' }];


export const WATCH_AREAS = [
'Persian Gulf / Hormuz',
'North Sea',
'Strait of Malacca',
'Gulf of Mexico',
'Gulf of Guinea',
'Tokyo Bay'];