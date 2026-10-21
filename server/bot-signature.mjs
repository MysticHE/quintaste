import express from 'express';
import { Buffer } from 'node:buffer';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { publisherKey } from './editorial/key.mjs';

/**
 * Signature check for the routes the QT bots call, signed like the editorial publisher: X-QT-Time and X-QT-Signature =
 * HMAC-SHA256(key, time \n METHOD \n full path \n sha256(body)), five-minute window. Mount `raw(limit)` before it so the hash
 * covers the exact bytes. Repeats inside the window are made harmless by each route's own state rules.
 */
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function signed(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    const key = publisherKey(), time = req.get('X-QT-Time') ?? '', signature = req.get('X-QT-Signature') ?? '';
    if (key.length < 48 || !/^\d{10}$/.test(time) || Math.abs(Date.now() / 1000 - Number(time)) > 300 || !/^[a-f0-9]{64}$/.test(signature)) return res.sendStatus(401);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const expected = createHmac('sha256', key).update(time + '\n' + req.method + '\n' + req.originalUrl.split('?')[0] + '\n' + sha(body)).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return res.sendStatus(401);
    next();
  } catch { res.sendStatus(401); }
}
export const raw = limit => express.raw({ type: 'application/json', limit });
export const json = req => { try { return JSON.parse(req.body.toString('utf8') || '{}'); } catch { return null; } };
