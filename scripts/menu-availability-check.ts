import assert from 'node:assert/strict';
import { menuAvailabilityNote, menuDisplayItems } from '../src/utils/menu-display';
import type { MenuItem, PublishedMenu } from '../src/types/menus';

const item = (id: string, qualifier: string): MenuItem => ({ id, name: 'Dish ' + id, qualifier, price: { amount: null, currency: 'unknown', type: 'displayed' } });
const menu = (...sections: PublishedMenu['sections']): PublishedMenu => ({ id: 'check', name: 'Check', branch: '', address: '', postalCode: '', aliases: [], googlePlaceId: null, sections });
const section = (items: MenuItem[], id = 'quintaste-additions'): PublishedMenu['sections'][number] => ({ id, items, scope: 'branch-dine-in', coverage: 'partial', checkedAt: '2026-10-23', sourceUrl: 'https://example.com/menu', sourceLabel: 'Merchant', notice: '', charges: '' });
const note = 'Partial menu; daily availability and current prices unconfirmed.';
assert.equal(menuAvailabilityNote(menu(section([item('1', note), item('2', note)]))), note);
assert.equal(menuAvailabilityNote(menu(section([item('1', note), item('2', '')]))), undefined);
assert.equal(menuAvailabilityNote(menu(section([item('1', note), item('2', 'Pre-order only.')]))), undefined);
assert.equal(menuAvailabilityNote(menu(section([item('1', note)]), section([item('2', '')], 'packaged'))), undefined);
assert.equal(menuAvailabilityNote(menu(section([item('1', note)], 'packaged'))), undefined);
assert.equal(menuAvailabilityNote(menu(section([item('1', 'x'.repeat(401))]))), undefined);
assert.equal(menuAvailabilityNote(menu()), undefined);
const largeMenu = menu(section(Array.from({ length: 414 }, (_, index) => item(String(index), note))));
assert.equal(menuDisplayItems(largeMenu).length, 414);
assert.equal(menuAvailabilityNote(largeMenu), note);
console.log('Menu checks passed: common availability, source boundaries, conflicting notes and 414 distinct dishes.');
