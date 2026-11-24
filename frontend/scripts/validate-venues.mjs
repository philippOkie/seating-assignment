#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const venueDir = path.join(rootDir, 'public', 'venues');
const fixtureNames = ['small', 'medium', 'large'];
const validStatuses = new Set(['available', 'reserved', 'sold', 'held']);

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateVenue(venue, fixtureName) {
  const errors = [];
  const seatIds = new Set();
  let actualSeats = 0;

  function addError(message) {
    errors.push(`${fixtureName}: ${message}`);
  }

  function expect(condition, message) {
    if (!condition) addError(message);
  }

  expect(typeOf(venue) === 'object', 'root must be an object');
  if (typeOf(venue) !== 'object') return errors;

  expect(typeof venue.venueId === 'string' && venue.venueId.length > 0, 'venueId must be a non-empty string');
  expect(typeof venue.name === 'string' && venue.name.length > 0, 'name must be a non-empty string');
  expect(typeOf(venue.map) === 'object', 'map must be an object');
  expect(typeOf(venue.priceTiers) === 'object', 'priceTiers must be an object');
  expect(Array.isArray(venue.sections), 'sections must be an array');

  const mapWidth = venue.map?.width;
  const mapHeight = venue.map?.height;
  expect(typeof mapWidth === 'number' && mapWidth > 0, 'map.width must be a positive number');
  expect(typeof mapHeight === 'number' && mapHeight > 0, 'map.height must be a positive number');

  if (typeOf(venue.priceTiers) === 'object') {
    for (const [tier, priceTier] of Object.entries(venue.priceTiers)) {
      expect(/^[0-9]+$/.test(tier), `priceTiers key "${tier}" must be a numeric string`);
      expect(typeOf(priceTier) === 'object', `priceTiers.${tier} must be an object`);
      if (typeOf(priceTier) !== 'object') continue;
      expect(typeof priceTier.label === 'string' && priceTier.label.length > 0, `priceTiers.${tier}.label must be a non-empty string`);
      expect(Number.isInteger(priceTier.priceCents) && priceTier.priceCents >= 0, `priceTiers.${tier}.priceCents must be a non-negative integer`);
      expect(typeof priceTier.currency === 'string' && priceTier.currency.length === 3, `priceTiers.${tier}.currency must be a 3-letter currency code`);
    }
  }

  if (!Array.isArray(venue.sections)) return errors;

  for (const section of venue.sections) {
    expect(typeOf(section) === 'object', 'section must be an object');
    if (typeOf(section) !== 'object') continue;

    const sectionContext = `section ${section.id ?? '<missing id>'}`;
    expect(typeof section.id === 'string' && section.id.length > 0, `${sectionContext}: id must be a non-empty string`);
    expect(typeof section.label === 'string' && section.label.length > 0, `${sectionContext}: label must be a non-empty string`);
    expect(typeOf(section.transform) === 'object', `${sectionContext}: transform must be an object`);
    expect(Array.isArray(section.rows), `${sectionContext}: rows must be an array`);

    if (typeOf(section.transform) === 'object') {
      expect(typeof section.transform.x === 'number', `${sectionContext}: transform.x must be a number`);
      expect(typeof section.transform.y === 'number', `${sectionContext}: transform.y must be a number`);
      expect(typeof section.transform.scale === 'number', `${sectionContext}: transform.scale must be a number`);
    }

    if (!Array.isArray(section.rows)) continue;

    for (const row of section.rows) {
      expect(typeOf(row) === 'object', `${sectionContext}: row must be an object`);
      if (typeOf(row) !== 'object') continue;

      const rowContext = `${sectionContext}, row ${row.label ?? row.index ?? '<missing label>'}`;
      expect(Number.isInteger(row.index) && row.index >= 1, `${rowContext}: index must be a positive integer`);
      expect(typeof row.label === 'string' && row.label.length > 0, `${rowContext}: label must be a non-empty string`);
      expect(Array.isArray(row.seats), `${rowContext}: seats must be an array`);

      if (!Array.isArray(row.seats)) continue;

      for (const seat of row.seats) {
        actualSeats += 1;
        expect(typeOf(seat) === 'object', `${rowContext}: seat must be an object`);
        if (typeOf(seat) !== 'object') continue;

        const seatContext = `${rowContext}, seat ${seat.id ?? '<missing id>'}`;
        expect(typeof seat.id === 'string' && seat.id.length > 0, `${seatContext}: id must be a non-empty string`);
        if (typeof seat.id === 'string') {
          expect(!seatIds.has(seat.id), `${seatContext}: duplicate seat id`);
          seatIds.add(seat.id);
        }
        expect(Number.isInteger(seat.col) && seat.col >= 1, `${seatContext}: col must be a positive integer`);
        expect(typeof seat.x === 'number' && seat.x >= 0 && seat.x <= mapWidth, `${seatContext}: x must be within map width`);
        expect(typeof seat.y === 'number' && seat.y >= 0 && seat.y <= mapHeight, `${seatContext}: y must be within map height`);
        expect(Number.isInteger(seat.priceTier) && seat.priceTier >= 1, `${seatContext}: priceTier must be a positive integer`);
        expect(Boolean(venue.priceTiers?.[String(seat.priceTier)]), `${seatContext}: priceTier must exist in priceTiers`);
        expect(validStatuses.has(seat.status), `${seatContext}: status must be one of ${Array.from(validStatuses).join(', ')}`);
      }
    }
  }

  if (venue.metadata?.actualSeats !== undefined) {
    expect(venue.metadata.actualSeats === actualSeats, `metadata.actualSeats is ${venue.metadata.actualSeats}, expected ${actualSeats}`);
  }

  return errors;
}

const allErrors = [];

for (const fixtureName of fixtureNames) {
  const fixturePath = path.join(venueDir, `${fixtureName}.json`);
  let venue;

  try {
    venue = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  } catch (error) {
    allErrors.push(`${fixtureName}: failed to read or parse ${fixturePath}: ${error.message}`);
    continue;
  }

  allErrors.push(...validateVenue(venue, fixtureName));
}

if (allErrors.length > 0) {
  console.error(`Venue fixture validation failed with ${allErrors.length} error(s):`);
  for (const error of allErrors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('venue fixtures are valid');
