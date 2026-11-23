import { surfaceCanvas } from '../core/PixelSurfaces.js';
import { sides, CELL } from '../world/floorsData.js';
import { cellOf } from '../world/HospitalMap.js';

export class MapSystem {
  constructor(hud) {
    this.paper = surfaceCanvas('paper', 256);
    this.canvas = this.paper.cloneNode();
    this.canvas.id = 'floor-plan';
    this.canvas.setAttribute('aria-label', 'Plano del piso actual');
    hud.root.append(this.canvas);
    this.canvas.hidden = true;
    this.reset();
  }
  reset() {
    this.visits = new Set();
    this.canvas.hidden = true;
  }
  visit(map, player) {
    const [x, z] = cellOf(player.position);
    this.visits.add(map.index + '/' + map.floor.zones[z]?.[x]);
  }
  open({ map, player, finds }) {
    const g = this.canvas.getContext('2d'),
      f = map.floor;
    const scale = Math.min(235 / f.grid[0].length, 167 / f.grid.length);
    const ox = (256 - scale * f.grid[0].length) / 2,
      oy = 35;
    g.drawImage(this.paper, 0, 0);
    g.fillStyle = '#332e24';
    g.font = 'bold 11px monospace';
    g.fillText(f.id + ' / ' + f.name.toUpperCase(), 9, 16, 237);
    g.fillRect(9, 21, 237, 1);
    const labels = [];
    f.areas.forEach(([name, [x, z, r, b]], i) => {
      const cx = ox + ((x + r + 1) * scale) / 2,
        cy = oy + ((z + b + 1) * scale) / 2;
      if (this.visits.has(map.index + '/' + i)) {
        g.fillStyle = '#85463a';
        g.fillRect(cx - 2, cy, 4, 1);
      }
      const short =
        {
          'Registration Counter': 'RECEPTION',
          'Estación de Enfermería': 'ENFERMERÍA',
          'Oficina del Director Médico': 'DIRECCIÓN',
        }[name] || name.toUpperCase();
      if (
        [
          'Registration Counter',
          'Outpatient Hall',
          'Pharmacy',
          'Office',
          'Mantenimiento',
          'Morgue',
          'Estación de Enfermería',
          'Sala compartida 201',
          'Oficina del Director Médico',
          'Sala de Observación',
        ].includes(name) &&
        !labels.includes(short)
      ) {
        labels.push(short);
        g.font = 'bold 6px monospace';
        g.fillStyle = '#382d25';
        g.fillText(String(labels.length), cx - 1, cy - 1);
      }
    });
    for (const { x, z, side, type } of map.planEdges) {
      const [dx, dz] = sides[side];
      const cx = ox + (x + 0.5 + dx * 0.5) * scale,
        cy = oy + (z + 0.5 + dz * 0.5) * scale;
      const door = ['arch', 'door', 'paddedDoor'].includes(type);
      g.strokeStyle = door ? '#79604b' : '#3e3a30';
      g.lineWidth = door ? 0.65 : 1;
      g.beginPath();
      g.moveTo(cx - (dz * scale) / 2, cy - (dx * scale) / 2);
      g.lineTo(cx + (dz * scale) / 2, cy + (dx * scale) / 2);
      if (door) g.lineTo(cx + dx * scale * 0.44, cy + dz * scale * 0.44);
      g.stroke();
    }
    g.fillStyle = '#654438';
    for (const s of f.stairs)
      for (let i = 0; i < 3; i++)
        g.fillRect(ox + s.at[0] * scale, oy + s.at[1] * scale + i * 1.5, scale, 1);
    if (map.index === 1 && finds.discovered) {
      g.font = 'bold 7px monospace';
      g.fillText('×', ox + finds.locker.position.x / CELL * scale, oy + finds.locker.position.z / CELL * scale);
    }
    g.save();
    g.translate(ox + (player.position.x / CELL) * scale, oy + (player.position.z / CELL) * scale);
    g.rotate(-player.baseYaw);
    g.fillStyle = '#812621';
    g.beginPath();
    g.moveTo(0, -5);
    g.lineTo(3, 3);
    g.lineTo(0, 1);
    g.lineTo(-3, 3);
    g.fill();
    g.restore();
    g.font = '8px monospace';
    g.fillStyle = '#392e23';
    labels.forEach((label, i) =>
      g.fillText(i + 1 + ' ' + label, 10 + 117 * (i % 2), 210 + 11 * Math.floor(i / 2), 112),
    );
    g.font = '7px monospace';
    g.fillText('≡ ESCALERA    — VISITA    × ARMARIO', 10, 234);
    g.fillText('[M / TAB] CERRAR', 10, 247);
    this.canvas.hidden = false;
  }
}
