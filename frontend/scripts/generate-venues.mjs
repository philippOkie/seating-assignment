#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'venues');

function mulberry32(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function random() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pickStatus(random) {
  const value = random();
  if (value < 0.64) return 'available';
  if (value < 0.78) return 'reserved';
  if (value < 0.95) return 'sold';
  return 'held';
}

function priceTierForRow(rowIndex, rowCount, random) {
  const ratio = rowIndex / Math.max(rowCount - 1, 1);
  const noise = (random() - 0.5) * 0.08;
  const adjusted = ratio + noise;

  if (adjusted < 0.18) return 4;
  if (adjusted < 0.42) return 3;
  if (adjusted < 0.72) return 2;
  return 1;
}

function allocateSeatCounts(random, total, rows, minPerRow, maxPerRow) {
  const minTotal = rows * minPerRow;
  const maxTotal = rows * maxPerRow;
  const clampedTotal = Math.max(minTotal, Math.min(maxTotal, total));
  const counts = Array.from({ length: rows }, () => minPerRow);
  let remaining = clampedTotal - minTotal;

  while (remaining > 0) {
    let changed = false;
    for (let i = 0; i < rows && remaining > 0; i += 1) {
      const wave = 0.7 + Math.sin((i / Math.max(rows - 1, 1)) * Math.PI) * 0.7;
      const chance = Math.min(0.95, 0.25 + wave * 0.35 + random() * 0.2);
      if (counts[i] < maxPerRow && random() < chance) {
        counts[i] += 1;
        remaining -= 1;
        changed = true;
      }
    }
    if (!changed) {
      const candidates = counts
        .map((count, index) => ({ count, index }))
        .filter(({ count }) => count < maxPerRow);
      if (candidates.length === 0) break;
      const candidate = candidates[randomInt(random, 0, candidates.length - 1)];
      counts[candidate.index] += 1;
      remaining -= 1;
    }
  }

  return counts;
}

function generateVenue(options) {
  const {
    venueId,
    name,
    seed,
    targetSeats,
    sectionCount,
    mapWidth,
    mapHeight,
    rowRange,
    seatsPerRowRange,
    radiusRange,
  } = options;

  const random = mulberry32(seed);
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;
  const ellipseX = 1.0;
  const ellipseY = 0.68;
  const sectionGap = (Math.PI * 2) / sectionCount * 0.08;
  const baseSpan = (Math.PI * 2) / sectionCount;
  const sections = [];
  let totalSeats = 0;

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const sectionsLeft = sectionCount - sectionIndex;
    const remainingTarget = targetSeats - totalSeats;
    const desiredSeats = sectionIndex === sectionCount - 1
      ? remainingTarget
      : Math.round((remainingTarget / sectionsLeft) * (0.88 + random() * 0.24));

    const rowCount = randomInt(random, rowRange[0], rowRange[1]);
    const seatCounts = allocateSeatCounts(
      random,
      desiredSeats,
      rowCount,
      seatsPerRowRange[0],
      seatsPerRowRange[1]
    );

    const sectionId = String.fromCharCode(65 + (sectionIndex % 26)) + (sectionIndex >= 26 ? Math.floor(sectionIndex / 26) : '');
    const sectionLabel = `${sectionIndex < sectionCount / 2 ? 'Lower' : 'Upper'} Bowl ${sectionId}`;
    const startAngle = -Math.PI / 2 + sectionIndex * baseSpan + sectionGap / 2;
    const endAngle = startAngle + baseSpan - sectionGap;
    const sectionSpan = endAngle - startAngle;
    const radiusStart = radiusRange[0] + randomInt(random, -8, 8);
    const radiusEnd = radiusRange[1] + randomInt(random, -12, 12);
    const rows = [];

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const rowSeatCount = seatCounts[rowIndex];
      const radiusRatio = rowIndex / Math.max(rowCount - 1, 1);
      const radius = radiusStart + (radiusEnd - radiusStart) * radiusRatio;
      const curveOffset = Math.sin(radiusRatio * Math.PI) * (random() - 0.5) * 10;
      const seats = [];

      for (let seatIndex = 0; seatIndex < rowSeatCount; seatIndex += 1) {
        const seatRatio = rowSeatCount === 1 ? 0.5 : seatIndex / (rowSeatCount - 1);
        const aisleGap = seatRatio > 0.47 && seatRatio < 0.53 ? 0.012 : 0;
        const angle = startAngle
          + sectionSpan * seatRatio
          + aisleGap
          + (random() - 0.5) * 0.0035;

        const x = centerX + Math.cos(angle) * (radius + curveOffset) * ellipseX;
        const y = centerY + Math.sin(angle) * (radius + curveOffset) * ellipseY;
        const rowNumber = rowIndex + 1;
        const colNumber = seatIndex + 1;
        const paddedCol = String(colNumber).padStart(2, '0');

        seats.push({
          id: `${sectionId}-${rowNumber}-${paddedCol}`,
          col: colNumber,
          x: Number(x.toFixed(1)),
          y: Number(y.toFixed(1)),
          priceTier: priceTierForRow(rowIndex, rowCount, random),
          status: pickStatus(random),
        });
        totalSeats += 1;
      }

      rows.push({
        index: rowIndex + 1,
        label: String(rowIndex + 1),
        seats,
      });
    }

    sections.push({
      id: sectionId,
      label: sectionLabel,
      transform: { x: 0, y: 0, scale: 1 },
      rows,
    });
  }

  return {
    venueId,
    name,
    map: { width: mapWidth, height: mapHeight },
    priceTiers: {
      1: { label: 'Standard', priceCents: 4500, currency: 'EUR' },
      2: { label: 'Plus', priceCents: 6500, currency: 'EUR' },
      3: { label: 'Premium', priceCents: 9500, currency: 'EUR' },
      4: { label: 'VIP', priceCents: 14500, currency: 'EUR' },
    },
    metadata: {
      generatedBy: 'frontend-seating-map-task-kit/scripts/generate-venues.mjs',
      seed,
      targetSeats,
      actualSeats: totalSeats,
      note: 'Seat coordinates are absolute within map.width/map.height. No layout algorithm is expected.',
    },
    sections,
  };
}

const fixtures = [
  {
    filename: 'small.json',
    venueId: 'arena-small-01',
    name: 'Metropolis Arena - Small Fixture',
    seed: 'frontend-seating-map-small-v1',
    targetSeats: 144,
    sectionCount: 4,
    mapWidth: 1024,
    mapHeight: 768,
    rowRange: [4, 6],
    seatsPerRowRange: [5, 10],
    radiusRange: [120, 255],
  },
  {
    filename: 'medium.json',
    venueId: 'arena-medium-01',
    name: 'Metropolis Arena - Medium Fixture',
    seed: 'frontend-seating-map-medium-v1',
    targetSeats: 2500,
    sectionCount: 12,
    mapWidth: 1400,
    mapHeight: 950,
    rowRange: [12, 18],
    seatsPerRowRange: [9, 22],
    radiusRange: [170, 520],
  },
  {
    filename: 'large.json',
    venueId: 'arena-large-01',
    name: 'Metropolis Arena - Large Fixture',
    seed: 'frontend-seating-map-large-v1',
    targetSeats: 15000,
    sectionCount: 24,
    mapWidth: 2000,
    mapHeight: 1400,
    rowRange: [22, 34],
    seatsPerRowRange: [16, 34],
    radiusRange: [230, 820],
  },
];

fs.mkdirSync(outputDir, { recursive: true });

for (const fixture of fixtures) {
  const venue = generateVenue(fixture);
  const outputPath = path.join(outputDir, fixture.filename);
  fs.writeFileSync(outputPath, `${JSON.stringify(venue, null, 2)}\n`);
  console.log(`${fixture.filename}: ${venue.metadata.actualSeats} seats`);
}
