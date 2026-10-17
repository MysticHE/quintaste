import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.mjs';
import { origin, pool, logger } from '../config.mjs';
import { restricted } from '../operations.mjs';
import { googleOptions } from './config.mjs';
import { beginFlow, launchFlow, browserFlow, takeFlow, cancelFlow, token, digest, sealTicket, GoogleError } from './flows.mjs';
import { confirmPage, googlePage } from './pages.mjs';

export const googleLogin=express.Router();
const cookieName=origin.startsWith('https:')?'__Host-qt-customer-oauth':'qt-customer-oauth';
const cookieValue=req=>req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
const browserCookie=value=>`${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${origin.startsWith('https:')?'; Secure':''}`;
googleLogin.use((req,res,next)=>{
  res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});next();
});
googleLogin.use(rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false}));
googleLogin.post('/start',rateLimit({windowMs:900000,limit:10,standardHeaders:'draft-8',legacyHeaders:false}),async(req,res)=>{
  if (!googleOptions()) throw new GoogleError(503,'Google sign-in is temporarily unavailable.');
  const flow=await beginFlow(req.body?.platform,req.body?.returnTo,req.body?.returnURL);
  res.status(201).json({id:flow.id,proof:flow.proof,code:flow.code,url:origin+'/api/account/google/open?ticket='+flow.launch});
});
googleLogin.get('/open',async(req,res)=>{
  const browser=token(), flow=await launchFlow(req.query.ticket,browser);
  const callback=origin+'/api/account/google/complete?flow='+flow.id;
  const response=await auth.api.signInSocial({headers:fromNodeHeaders(req.headers),asResponse:true,
    body:{provider:'google',disableRedirect:true,callbackURL:callback,errorCallbackURL:callback}});
  if (!response.ok) throw new GoogleError(503,'Google sign-in could not start. Try again shortly.');
  const data=/** @type {{ url: string }} */ (await response.json()), url=new URL(data.url);
  if (url.origin!=='https://accounts.google.com') throw new GoogleError(503,'Google sign-in is unavailable.');
  for (const cookie of response.headers.getSetCookie()) res.append('Set-Cookie',cookie);
  res.append('Set-Cookie',browserCookie(browser));res.redirect(302,url.href);
});
async function current(req) {
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if (!session?.user || await restricted(session.user.id)) throw new GoogleError(401,'Google sign-in was not completed. Return to the app and try again.');
  const provider=await pool.query('SELECT 1 FROM public.account WHERE "userId"=$1 AND "providerId"=\'google\'',[session.user.id]);
  if (!provider.rowCount || !session.user.emailVerified) throw new GoogleError(403,'Use a verified Google account.');
  return session;
}
googleLogin.get('/complete',async(req,res)=>{
  const flow=await browserFlow(req.query.flow,cookieValue(req));
  if (req.query.error) throw new GoogleError(400,'Google sign-in was cancelled or could not be verified. Return to the app and try again.');
  const session=await current(req);
  if (flow.platform==='web') {
    await pool.query('DELETE FROM customer_oauth.flow WHERE id=$1',[flow.id]);
    return res.redirect(303,session.user.adultConfirmed?flow.return_to:'/account-eligibility?returnTo='+encodeURIComponent(flow.return_to));
  }
  if (flow.return_url) {
    // Both the app-held proof and this browser-return secret are required. A shared
    // launch link alone must never let its sender collect another person's login.
    const callback=token(), ticket=await auth.api.generateOneTimeToken({headers:fromNodeHeaders(req.headers)});
    const result=await pool.query(`UPDATE customer_oauth.flow SET phase='ready',ticket=$2,user_id=$3,callback_hash=$4,
      expires_at=LEAST(expires_at,now()+interval '60 seconds') WHERE id=$1 AND phase='opened' RETURNING id`,
      [flow.id,sealTicket(ticket.token,flow.id),session.user.id,digest(callback)]);
    if (!result.rowCount) throw new GoogleError(410,'Start Google sign-in again.');
    return res.redirect(303,flow.return_url+'?flow='+encodeURIComponent(flow.id)+'&code='+encodeURIComponent(callback));
  }
  // no-referrer makes browser form POSTs send Origin: null, which fails the CSRF check.
  res.set('Referrer-Policy','same-origin').type('html').send(confirmPage(flow,session.user));
});
googleLogin.post('/confirm',express.urlencoded({extended:false,limit:'2kb'}),async(req,res)=>{
  const flow=await browserFlow(req.body?.flow,cookieValue(req)),session=await current(req);
  if (flow.platform!=='native' || flow.return_url) throw new GoogleError(400,'Start sign-in again.');
  const ticket=await auth.api.generateOneTimeToken({headers:fromNodeHeaders(req.headers)});
  const result=await pool.query(`UPDATE customer_oauth.flow SET phase='ready',ticket=$2,user_id=$3,
    expires_at=LEAST(expires_at,now()+interval '60 seconds') WHERE id=$1 AND phase='opened' RETURNING id`,
  [flow.id,sealTicket(ticket.token,flow.id),session.user.id]);
  if (!result.rowCount) throw new GoogleError(410,'This sign-in was already completed.');
  logger.info({event:'customer_google_handoff_ready'});
  res.type('html').send(googlePage('Google sign-in confirmed','<p>Close this browser tab and return to QuinTaste. Tap <strong>Finish Google sign-in</strong> within one minute.</p>'));
});
googleLogin.post('/finish',async(req,res)=>res.json(await takeFlow(req.body?.id,req.body?.proof,req.body?.callback)));
googleLogin.post('/cancel',async(req,res)=>{await cancelFlow(req.body?.id,req.body?.proof);res.json({cancelled:true});});
googleLogin.use((error,req,res,next)=>{
  if (!(error instanceof GoogleError)) return next(error);
  if (req.method==='GET' || req.path==='/confirm') return res.status(error.status).type('html').send(googlePage('Sign-in needs attention','<p>'+error.message+'</p>'));
  res.status(error.status).json({error:error.message});
});
