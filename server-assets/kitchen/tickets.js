import { CHEFS, ticketLine, ticketKey } from './strings.js';

/**
 * Real tickets, one at a time: the chef carries the slip to the Head Chef, who stamps it, then the slip drops onto its ticket in
 * the rail. If the chef is asleep, motion is reduced, the tab is hidden or the kitchen is off screen, only the rail ticket glows.
 */
export function createTickets({ world, findTicket, onReplayDone }) {
  const queue = [];
  let running = false, replaying = false;
  const lang = () => (document.documentElement.lang === 'zh-Hans' ? 'zh' : 'en');
  const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };

  function flash(item) {
    const ticket = findTicket(ticketKey(item));
    if (!ticket) return;
    ticket.classList.remove('is-fresh');
    void ticket.offsetWidth;
    ticket.classList.add('is-fresh');
  }

  function makeSlip(item) {
    const el = document.createElement('span');
    el.className = 'slip';
    el.setAttribute('aria-hidden', 'true');
    el.append(Object.assign(document.createElement('span'), { className: 'slip-who', textContent: CHEFS[item.chef][lang()] }),
      Object.assign(document.createElement('span'), { className: 'slip-line', textContent: ticketLine(item, lang()) }));
    return { el, hold: chef => chef.el.append(el) };
  }

  /** From the pass to the rail: the stamped slip leaves the scene and lands on its ticket. */
  async function land(slip, item) {
    const ticket = findTicket(ticketKey(item)), from = slip.el.getBoundingClientRect();
    const flying = slip.el.cloneNode(true), held = getComputedStyle(slip.el);
    flying.classList.add('slip--flying', 'is-stamped');
    // The held slip's padding is a % of the chef; once fixed to the window it would be a % of the window, so keep its pixels.
    Object.assign(flying.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', padding: held.padding, fontSize: held.fontSize });
    slip.el.remove();
    document.body.append(flying);
    if (ticket && inView(ticket)) {
      const to = ticket.getBoundingClientRect();
      await flying.animate([{ transform: 'none', opacity: 1 },
        { transform: `translate(${to.left + 20 - from.left}px, ${to.top + 8 - from.top}px) scale(.85)`, opacity: 0 }],
      { duration: 700, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
    } else {
      await flying.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-16px)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' }).finished;
    }
    flying.remove();
  }

  async function play(item) {
    const slip = makeSlip(item);
    const carried = await world.deliver(item, slip);
    if (!carried) { slip.el.remove(); flash(item); return; }
    slip.el.classList.add('is-stamped');
    await new Promise(resolve => setTimeout(resolve, 350));
    await land(slip, item);
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
          document.querySelectorAll('.slip').forEach(el => el.remove());
          flash(item);
        }
      }
    } finally {
      running = false;
      if (replaying) { replaying = false; onReplayDone(); }
    }
  }

  return {
    play(items) { queue.push(...items); run(); },
    replay(items) {
      if (!items.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      replaying = true;
      queue.push(...items);
      setTimeout(run, 1200);
    },
  };
}
