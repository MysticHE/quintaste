import { ticketLine, ticketKey } from './strings.js';

/**
 * Real tickets, one at a time: the chef carries the ticket in a text bubble above its head to the Head Chef, who stamps it, and
 * the ticket glows on the rail. If the chef is asleep, motion is reduced, the tab is hidden or the kitchen is off screen, only the
 * rail ticket glows.
 */
export function createTickets({ world, findTicket }) {
  const queue = [];
  let running = false;
  const lang = () => (document.documentElement.lang === 'zh-Hans' ? 'zh' : 'en');

  function flash(item) {
    const ticket = findTicket(ticketKey(item));
    if (!ticket) return;
    ticket.classList.remove('is-fresh');
    void ticket.offsetWidth;
    ticket.classList.add('is-fresh');
  }

  async function play(item) {
    await world.deliver(item, ticketLine(item, lang()));
    flash(item);
  }

  async function run() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const item = queue.shift();
        try { await play(item); }
        catch (error) {
          // One ticket's failure never stops the rest; it still glows on the rail.
          console.error('Mochi kitchen: ticket animation failed', error);
          document.querySelectorAll('.say').forEach(el => el.remove());
          flash(item);
        }
      }
    } finally {
      running = false;
    }
  }

  return {
    play(items) { queue.push(...items); run(); },
    replay(items) {
      if (!items.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      queue.push(...items);
      setTimeout(run, 1200);
    },
  };
}
