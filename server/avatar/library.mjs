import express from 'express';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { pool } from '../config.mjs';
import { AvatarError } from './config.mjs';
import { encryptAvatar, decryptAvatar } from './storage.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const states = ['base','blink','mid','open'];
async function readSaved(userId,id,db=pool) {
  if (!uuid.test(id)) throw new AvatarError(400,'Choose a saved avatar.');
  const row=(await db.query('SELECT payload FROM avatar.saved WHERE user_id=$1 AND id=$2',[userId,id])).rows[0];
  if (!row) throw new AvatarError(404,'This saved avatar was not found.');
  return decryptAvatar(userId+':'+id,row.payload);
}
async function validate(value) {
  if (!value || !uuid.test(value.id) || value.sample || value.recipe!=='standard-v2' || !value.frames) {
    throw new AvatarError(400,'Choose a complete generated avatar to save.');
  }
  const frames={};
  for (const state of states) {
    const uri=value.frames[state];
    if (typeof uri!=='string' || uri.length>220000 || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) {
      throw new AvatarError(400,'All four avatar frames are required.');
    }
    const bytes=Buffer.from(uri.slice(uri.indexOf(',')+1),'base64');
    try {
      const info=await sharp(bytes,{limitInputPixels:1000000,animated:false}).metadata();
      if (info.format!=='webp' || info.width!==768 || info.height!==768 || (info.pages||1)!==1) throw Error('invalid');
      frames[state]=uri;
    } catch { throw new AvatarError(400,'The avatar image could not be read.'); }
    finally { bytes.fill(0); }
  }
  return {id:value.id,recipe:'standard-v2',createdAt:Number.isFinite(value.createdAt)?value.createdAt:Date.now(),frames};
}
async function locked(userId,action) {
  const db=await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(721942,hashtext($1))',[userId]);
    const result=await action(db); await db.query('COMMIT'); return result;
  } catch(error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
async function preference(db,userId,selected) {
  await db.query(`INSERT INTO avatar.preference(user_id,selected) VALUES($1,$2)
    ON CONFLICT(user_id) DO UPDATE SET selected=$2,updated_at=now()`,[userId,selected]);
}
export const library=express.Router();
library.use(express.json({limit:'900kb',inflate:false}));
library.get('/',async(_req,res)=>{
  const userId=res.locals.userId;
  const rows=(await pool.query('SELECT id,payload,created_at FROM avatar.saved WHERE user_id=$1 ORDER BY created_at DESC',[userId])).rows;
  const items=[];
  for (const row of rows) {
    const avatar=await decryptAvatar(userId+':'+row.id,row.payload);
    items.push({id:avatar.id,createdAt:avatar.createdAt,thumbnail:avatar.frames.base});
  }
  const pref=(await pool.query('SELECT selected FROM avatar.preference WHERE user_id=$1',[userId])).rows[0];
  res.json({items,selected:pref?.selected??null});
});
library.get('/:id',async(req,res)=>res.json(await readSaved(res.locals.userId,req.params.id)));
library.post('/',async(req,res)=>{
  const avatar=await validate(req.body?.avatar), userId=res.locals.userId;
  const encrypted=await encryptAvatar(userId+':'+avatar.id,avatar);
  await locked(userId,async db=>{
    const existing=await db.query('SELECT id FROM avatar.saved WHERE user_id=$1 AND id=$2',[userId,avatar.id]);
    if (!existing.rowCount) {
      const count=Number((await db.query('SELECT count(*) FROM avatar.saved WHERE user_id=$1',[userId])).rows[0].count);
      if (count>=20) throw new AvatarError(409,'Your library has 20 avatars. Delete one before saving another.');
      await db.query('INSERT INTO avatar.saved(user_id,id,payload) VALUES($1,$2,$3)',[userId,avatar.id,encrypted]);
    }
    if (req.body.select!==false) await preference(db,userId,avatar.id);
    else await db.query('INSERT INTO avatar.preference(user_id,selected) VALUES($1,$2) ON CONFLICT DO NOTHING',[userId,avatar.id]);
  });
  res.status(201).json({saved:true,id:avatar.id});
});
library.post('/selection',async(req,res)=>{
  const selected=req.body?.selected,userId=res.locals.userId;
  if (typeof selected!=='string' || !['default','sample-standard-v2'].includes(selected) && !uuid.test(selected)) {
    throw new AvatarError(400,'Choose an avatar from your library.');
  }
  await locked(userId,async db=>{
    if (uuid.test(selected)) await readSaved(userId,selected,db);
    await preference(db,userId,selected);
  });
  res.json({selected});
});
library.delete('/:id',async(req,res)=>{
  const userId=res.locals.userId,id=req.params.id;
  if (!uuid.test(id)) throw new AvatarError(400,'Choose a saved avatar.');
  await locked(userId,async db=>{
    await db.query('DELETE FROM avatar.saved WHERE user_id=$1 AND id=$2',[userId,id]);
    await db.query("UPDATE avatar.preference SET selected='default',updated_at=now() WHERE user_id=$1 AND selected=$2",[userId,id]);
  });
  res.json({deleted:true});
});
