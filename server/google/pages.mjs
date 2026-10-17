const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function googlePage(title,content) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(title)} | QuinTaste</title><style>:root{--background:#fff7f3;--foreground:#282323;--card:#fff;--border:#dfd4d0;--accent:#a53925}
    *{box-sizing:border-box}body{margin:0;padding:24px;background:var(--background);color:var(--foreground);font:18px/1.6 Arial,sans-serif}
    main{max-width:560px;margin:8vh auto;padding:28px;border:1px solid var(--border);border-radius:24px;background:var(--card)}
    h1{font-size:28px}button{font:inherit;padding:14px;border-radius:16px;border:1px solid var(--accent);background:var(--accent);color:var(--card);cursor:pointer}
    strong{overflow-wrap:anywhere}code{font-size:30px;letter-spacing:5px}</style><main><p>QuinTaste</p><h1>${escape(title)}</h1>${content}</main></html>`;
}
export function confirmPage(flow,user) {
  return googlePage('Finish signing in',`<p>Google verified <strong>${escape(user.email)}</strong>.</p>
    <p>Check that this code matches the code shown in QuinTaste:</p><p><code>${escape(flow.display_code)}</code></p>
    <p>Continue only if you started this sign-in in your own app. This signs that app into this Google account.</p>
    <form method="post" action="/api/account/google/confirm"><input type="hidden" name="flow" value="${escape(flow.id)}">
    <button type="submit">Confirm sign-in to my app</button></form>`);
}
