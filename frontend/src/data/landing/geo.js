/** Dark-slick candidates currently held open across the watch areas. */
export const DETECTIONS = [
{ id: 'SPL-20260910-062', lat: 25.6, lon: 56.2, severity: 'probable' },
{ id: 'SPL-20260909-089', lat: 21.6, lon: 88.1, severity: 'possible' },
{ id: 'SPL-20260909-084', lat: 1.34, lon: 103.8, severity: 'indeterminate' },
{ id: 'SPL-20260908-041', lat: 53.4, lon: 4.6, severity: 'probable' },
{ id: 'SPL-20260908-017', lat: 28.9, lon: -90.1, severity: 'possible' },
{ id: 'SPL-20260907-233', lat: 4.1, lon: 5.6, severity: 'indeterminate' },
{ id: 'SPL-20260907-118', lat: 35.2, lon: 139.8, severity: 'possible' },
{ id: 'SPL-20260906-092', lat: 19.0, lon: 72.8, severity: 'probable' }];


/** AIS trajectories correlated against the open candidates. */
export const ROUTES = [
[{ lat: 25.6, lon: 56.2 }, { lat: 19.0, lon: 72.8 }],
[{ lat: 1.34, lon: 103.8 }, { lat: 21.6, lon: 88.1 }],
[{ lat: 53.4, lon: 4.6 }, { lat: 36.1, lon: -5.3 }],
[{ lat: 28.9, lon: -90.1 }, { lat: 9.3, lon: -79.9 }],
[{ lat: 35.2, lon: 139.8 }, { lat: 1.34, lon: 103.8 }],
[{ lat: 4.1, lon: 5.6 }, { lat: -33.9, lon: 18.4 }],
[{ lat: 19.0, lon: 72.8 }, { lat: 12.9, lon: 45.0 }]];