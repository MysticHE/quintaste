import { communityRouter, errors } from '../community/http.mjs';
import { shop } from './shop.mjs';
import { orders } from './orders.mjs';
import { conversations } from './conversations.mjs';
import { sellerProfile } from './seller.mjs';
import { sellerShop } from './seller-shop.mjs';

/** Buying: browsing and shop pages are readable by guests; orders and chat need a signed-in member. */
export const market = communityRouter({ guests: true, bodyLimit: '64kb' });
market.use(shop);
market.use(orders);
market.use(conversations);
market.use(errors);
/** Selling: a member's own shop, application, items and slots. Only saving a listing carries photos. */
export const marketSeller = communityRouter({ bodyLimit: '64kb', photoLimit: '6mb',
  photos: req => (req.method === 'POST' && req.path === '/listings') || (req.method === 'PUT' && /^\/listings\/[^/]+$/.test(req.path)) });
marketSeller.use(sellerProfile);
marketSeller.use(sellerShop);
marketSeller.use(errors);
