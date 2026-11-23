// Grid coordinates increase east and south. Rectangles include both ends.
// A room occupies its own walled zone. Halls join freely where they touch.
export const CELL = 3;
export const sides = {
  n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0],
};
const stair = (link, x, z, side, to, turn = false) =>
  ({ link, at: [x, z], side, to, turn });

const outpatient = {
  id: 'P1', name: 'Planta baja', fog: 0x25302e, density: 0.043,
  ambient: 0.72, lamp: 0xdbce9a, base: 'Galería de consultas',
  start: [36, 31], yaw: -0.35,
  halls: [
    ['Ala Oeste', [5, 3, 6, 23]],
    ['Salida lateral', [1, 12, 4, 13]],
    ['Galería oeste', [7, 20, 13, 22]],
    ['Pasillo central', [14, 20, 41, 21]],
    ['Ascensores oeste', [11, 23, 13, 26]],
    ['Galería de consultas', [14, 25, 37, 26]],
    ['Outpatient Hall', [24, 27, 43, 32]],
    ['Outpatient Hall', [38, 22, 43, 26]],
    ['Ala Este', [42, 20, 45, 26]],
    ['Ala Este', [44, 27, 45, 32]],
    ['Ala Este', [46, 1, 47, 33]],
  ],
  rooms: [], edges: [], props: [],
  stairs: [
    stair('servicio-oeste', 1, 22, 'w', 0),
    stair('escalera-oeste', 12, 16, 'n', 2, true),
    stair('servicio-este', 40, 16, 'n', 0),
    stair('emergencia-este', 43, 1, 'n', 2, true),
  ],
  lamps: [
    [33, 30], [28, 29], [39, 29], [41, 25], [34, 25], [27, 25], [20, 25],
    [13, 25], [12, 21], [18, 20], [26, 20], [33, 20], [40, 20],
    [5, 22], [6, 17], [5, 12], [6, 7], [5, 3], [46, 29], [47, 23],
    [46, 18], [47, 12], [46, 6], [46, 2], [36, 23], [50, 29],
  ],
  boards: [
    [37, 29, 'OUTPATIENT HALL', 'PHARMACY  ↑'],
    [26, 20, 'ALA OESTE  /  ALA ESTE', '←  ESCALERAS  →'],
  ],
  patrol: [[46, 18], [46, 24], [39, 25], [27, 29], [16, 25], [12, 21],
    [5, 21], [5, 9], [5, 21], [35, 20], [46, 21]],
  oppressive: ['Salida lateral'],
};

function addRoom(floor, name, bounds, ...edges) {
  floor.rooms.push([name, bounds]);
  floor.edges.push(...edges);
}

const westRooms = [[3, 5], [6, 8], [9, 11], [14, 16], [17, 20]];
const innerWest = [[3, 5], [6, 8], [9, 12], [13, 16], [17, 19]];
for (let i = 0; i < 5; i++) {
  const [lo, hi] = westRooms[i], [a, b] = innerWest[i];
  const odd = String(101 + i * 2), even = String(102 + i * 2);
  addRoom(outpatient, 'Consulta ' + odd, [1, lo, 4, hi], [4, lo + 1, 'e', 'door', odd]);
  addRoom(outpatient, 'Consulta ' + even, [7, a, 10, b], [7, a + 1, 'w', 'door', even]);
  outpatient.props.push(['desk', 2, lo], [i % 2 ? 'bed' : 'desk', 9, a]);
}

// The eight booths between the south promenade and the north cross corridor.
for (let i = 0; i < 8; i++) {
  const x = 14 + 3 * i, pharmacy = i >= 6;
  const label = pharmacy ? 'PHARMACY' : 'C' + (11 + i);
  addRoom(outpatient, pharmacy ? 'Pharmacy' : 'Consulta ' + label, [x, 22, x + 2, 24],
    [x + 1, 22, 'n', 'door', label],
    [x, 24, 's', 'door'],
    [x + 1, 24, 's', 'counter', label]);
  outpatient.props.push([pharmacy ? 'shelf' : 'desk', x + 2, 23]);
}
for (let i = 0; i < 2; i++) {
  const x = 15 + 2 * i;
  addRoom(outpatient, 'Baño ' + (i + 1), [x, 16, x + 1, 19], [x, 19, 's', 'door', 'WC']);
  outpatient.props.push(['toilet', x, 16], ['basin', x + 1, 16]);
}
for (const [i, [lo, hi]] of [[19, 23], [24, 28], [29, 33], [34, 38]].entries()) {
  const label = String(111 + i);
  addRoom(outpatient, 'Consulta ' + label, [lo, 16, hi, 19], [lo + 2, 19, 's', 'door', label]);
  outpatient.props.push(['desk', lo + 1, 17]);
}
for (const [i, [lo, hi]] of [[4, 7], [8, 11], [12, 15], [16, 19]].entries()) {
  const label = 'E0' + (i + 1);
  addRoom(outpatient, 'Sala ' + label, [42, lo, 45, hi], [45, lo + 1, 'e', 'door', label]);
  outpatient.props.push(['bed', 43, lo + 1]);
}
addRoom(outpatient, 'Baños este', [48, 4, 52, 5], [48, 5, 'w', 'door', 'WC']);
outpatient.props.push(['basin', 49, 4], ['toilet', 51, 4], ['toilet', 52, 4]);
for (let i = 0; i < 6; i++) {
  const z = 6 + i * 3, label = String(121 + i);
  addRoom(outpatient, 'Consulta ' + label, [48, z, 52, z + 2], [48, z + 1, 'w', 'door', label]);
  outpatient.props.push(['desk', 51, z + 1]);
}
addRoom(outpatient, 'Mantenimiento', [35, 28, 36, 29],
  [36, 29, 's', 'door', 'MANTENIMIENTO']);
outpatient.lamps.push([36, 29]);
addRoom(outpatient, 'Office', [48, 26, 52, 32], [48, 29, 'w', 'door', 'OFFICE']);
addRoom(outpatient, 'Registration Counter', [41, 27, 43, 29],
  [41, 28, 'w', 'counter', 'REGISTRATION'], [41, 27, 'w', 'door']);
addRoom(outpatient, 'Information Desk', [41, 30, 43, 32],
  [41, 31, 'w', 'counter', 'INFORMATION'], [41, 30, 'w', 'door']);
addRoom(outpatient, 'Escalera suroeste', [1, 21, 4, 23], [4, 22, 'e', 'door', 'ESCALERA B1']);
addRoom(outpatient, 'Escalera oeste', [11, 16, 14, 19], [12, 19, 's', 'door', 'ESCALERA F2']);
addRoom(outpatient, 'Escalera de servicio', [39, 16, 41, 19], [40, 19, 's', 'door', 'ESCALERA B1']);
addRoom(outpatient, 'Escalera noreste', [42, 1, 45, 3], [45, 2, 'e', 'door', 'ESCALERA F2']);
outpatient.edges.push(
  [33, 32, 's', 'entrance', 'OUTPATIENT HALL'],
  [5, 3, 'n', 'exit', 'EXIT'], [1, 12, 'w', 'exit', 'EXIT'],
  [46, 1, 'n', 'exit', 'EMERGENCY EXIT'], [47, 33, 's', 'exit', 'EXIT'],
  [11, 24, 'w', 'lift', '01'], [11, 25, 'w', 'lift', '02'],
  [42, 20, 'n', 'lift', '03'], [43, 20, 'n', 'lift', '04'],
  [5, 23, 's', 'extinguisher'], [47, 32, 'e', 'extinguisher'],
  [24, 29, 'w', 'sign', 'OUTPATIENT HALL'], [9, 3, 'n', 'brokenWindow'], [51, 26, 'n', 'brokenWindow'],
  [6, 3, 'n', 'sign', 'ALA OESTE'], [47, 1, 'n', 'sign', 'ALA ESTE'],
);
for (const x of [26, 27, 30, 31, 32, 34, 35, 36, 39])
  outpatient.edges.push([x, 32, 's', 'glazing']);
outpatient.props.push(['chairs', 25, 29], ['chairs', 25, 31], ['chairs', 27, 31],
  ['desk', 42, 28], ['desk', 42, 31], ['desk', 50, 28], ['cabinet', 51, 31]);

const basement = {
  id: 'B1', name: 'Servicios subterráneos', base: 'Galería de servicio',
  fog: 0x231c19, density: 0.073, ambient: 0.44, lamp: 0xdc8b57,
  halls: [
    ['Bajada de servicio', [3, 3, 3, 5]], ['Galería fría', [3, 5, 12, 5]],
    ['Conducto de vapor', [12, 6, 12, 13]], ['Galería inundada', [6, 13, 18, 13]],
    ['Galería inundada', [6, 14, 6, 18]], ['Galería inundada', [7, 18, 14, 18]],
    ['Retorno de bombas', [14, 14, 14, 17]], ['Servicio este', [18, 9, 18, 12]],
    ['Servicio este', [19, 9, 21, 9]],
  ],
  rooms: [], edges: [],
  props: [['morgue', 7, 2], ['morgue', 9, 3], ['boiler', 15, 7], ['boiler', 16, 9],
    ['washer', 8, 16], ['washer', 9, 16], ['shelf', 10, 14], ['shelf', 16, 16],
    ['shelf', 18, 16], ['desk', 2, 8], ['pipes', 4, 9]],
  stairs: [stair('servicio-oeste', 3, 3, 'n', 1), stair('servicio-este', 21, 9, 'e', 1)],
  lamps: [[3, 4], [7, 5], [9, 2], [12, 8], [15, 8], [12, 13], [6, 16], [14, 17], [18, 11], [9, 15]],
  patrol: [[12, 10], [7, 5], [8, 3], [12, 5], [12, 13], [6, 18], [14, 18], [18, 13]],
  oppressive: ['Morgue', 'Galería inundada', 'Calderas y generadores'],
};
addRoom(basement, 'Morgue', [5, 1, 10, 4], [7, 4, 's', 'door', 'MORGUE']);
addRoom(basement, 'Calderas y generadores', [13, 6, 17, 10], [13, 8, 'w', 'door', 'CALDERAS']);
addRoom(basement, 'Lavandería', [7, 14, 11, 17], [9, 14, 'n', 'door', 'LAVANDERÍA']);
addRoom(basement, 'Almacén', [15, 14, 18, 17], [17, 14, 'n', 'door', 'ALMACÉN']);
addRoom(basement, 'Mantenimiento', [2, 6, 5, 10], [3, 6, 'n', 'door', 'MANTENIMIENTO']);
for (const x of [6, 7, 8, 9]) basement.edges.push([x, 1, 'n', 'cooler']);

const wards = {
  id: 'F2', name: 'Hospitalización', base: 'Pabellón de internados',
  fog: 0x1f302e, density: 0.054, ambient: 0.65, lamp: 0xb8decb,
  halls: [
    ['Galería de internados', [2, 8, 21, 8]], ['Galería oeste', [2, 7, 3, 14]],
    ['Distribuidor este', [19, 3, 20, 15]], ['Escalera de guardia', [17, 3, 18, 3]],
  ],
  rooms: [], edges: [],
  props: [
    ['bed', 6, 4], ['bed', 9, 4], ['iv', 6, 5], ['curtain', 8, 4],
    ['bed', 12, 4], ['bed', 15, 4], ['iv', 15, 5], ['curtain', 14, 4],
    ['overturned', 11, 8], ['overturned', 12, 8],
    ['station', 11, 10], ['station', 13, 10], ['cabinet', 10, 12],
    ['bed', 5, 11], ['bed', 7, 11], ['iv', 7, 12], ['bed', 17, 11], ['wheelchair', 17, 13],
    ['cabinet', 21, 5], ['desk', 23, 6],
  ],
  stairs: [stair('escalera-oeste', 2, 14, 's', 1, true),
    stair('emergencia-este', 17, 3, 'w', 1, true), stair('guardia', 20, 15, 's', 3)],
  lamps: [[2, 13], [3, 8], [7, 8], [11, 8], [15, 8], [19, 8], [19, 3], [20, 14],
    [7, 5], [13, 5], [11, 11], [6, 12], [17, 12]],
  patrol: [[19, 12], [15, 8], [15, 6], [8, 6], [7, 8], [3, 8], [7, 6], [15, 6]],
  oppressive: ['Sala compartida 202'],
};
wards.edges.push([7, 3, 'n', 'brokenWindow'], [13, 3, 'n', 'brokenWindow']);
addRoom(wards, 'Sala compartida 201', [5, 3, 10, 7],
  [7, 7, 's', 'door', 'SALA 201'], [10, 5, 'e', 'arch', '201 / 202']);
addRoom(wards, 'Sala compartida 202', [11, 3, 16, 7], [15, 7, 's', 'door', 'SALA 202']);
addRoom(wards, 'Estación de Enfermería', [9, 9, 14, 13],
  [14, 9, 'n', 'door', 'ENFERMERÍA'], [10, 9, 'n', 'counter', 'CONTROL']);
addRoom(wards, 'Convalecencia', [4, 9, 8, 13], [4, 12, 'w', 'door', 'SALA 203']);
addRoom(wards, 'Cuidados nocturnos', [15, 10, 18, 14], [18, 12, 'e', 'door', 'SALA 204']);
addRoom(wards, 'Apoyo clínico', [21, 4, 24, 7], [21, 6, 'w', 'door', 'APOYO CLÍNICO']);

const treatment = {
  id: 'F3', name: 'Psiquiatría y tratamientos', base: 'Ala psiquiátrica',
  fog: 0x28262c, density: 0.082, ambient: 0.49, lamp: 0xc8c0a8,
  halls: [
    ['Admisión restringida', [3, 12, 7, 13]], ['Galería de aislamiento', [7, 4, 7, 12]],
    ['Control de observación', [8, 4, 15, 4]], ['Corredor clínico', [15, 5, 15, 11]],
    ['Antesala de dirección', [16, 11, 20, 11]],
  ],
  rooms: [], edges: [],
  props: [['desk', 10, 7], ['station', 11, 9], ['dispensary', 17, 5],
    ['shelf', 19, 4], ['shelf', 19, 6], ['desk', 22, 10], ['cabinet', 23, 12]],
  stairs: [stair('guardia', 3, 13, 'w', 2)],
  lamps: [[4, 12], [7, 10], [7, 6], [10, 4], [14, 4], [15, 8], [18, 11],
    [11, 7], [18, 5], [22, 11]],
  patrol: [[15, 9], [15, 4], [7, 4], [7, 10], [7, 4], [15, 4], [20, 11]],
  oppressive: ['Aislamiento 301', 'Aislamiento 302', 'Aislamiento 303', 'Sala de Observación'],
};
for (let i = 0; i < 3; i++) {
  const z = 3 + 3 * i, label = String(301 + i);
  addRoom(treatment, 'Aislamiento ' + label, [3, z, 6, z + 2], [6, z + 1, 'e', 'paddedDoor', label]);
}
addRoom(treatment, 'Sala de Observación', [8, 5, 13, 10],
  [10, 5, 'n', 'door', 'OBSERVACIÓN'], [8, 7, 'w', 'observation'], [8, 8, 'w', 'observation']);
treatment.edges.push([18, 3, 'n', 'brokenWindow']);
addRoom(treatment, 'Archivo y dispensario', [16, 3, 20, 7], [16, 5, 'w', 'door', 'DISPENSARIO']);
addRoom(treatment, 'Oficina del Director Médico', [21, 9, 24, 13], [21, 11, 'w', 'door', 'DIRECCIÓN MÉDICA']);

export const floors = [basement, outpatient, wards, treatment].map((floor) => {
  const areas = [...floor.halls, ...floor.rooms];
  const width = Math.max(...areas.map(([, r]) => r[2])) + 2;
  const height = Math.max(...areas.map(([, r]) => r[3])) + 2;
  const zones = Array.from({ length: height }, () => Array(width).fill(-1));
  areas.forEach(([, [x1, z1, x2, z2]], zone) => {
    for (let z = z1; z <= z2; z++)
      for (let x = x1; x <= x2; x++) zones[z][x] = zone;
  });
  return { ...floor, areas, zones, grid: zones.map(row => row.map(i => i < 0 ? '#' : '.').join('')) };
});
