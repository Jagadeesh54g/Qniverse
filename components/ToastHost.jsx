'use client';
import { useEffect, useState } from 'react';
export default function ToastHost(){const [msg,setMsg]=useState('');useEffect(()=>{const fn=e=>{setMsg(e.detail);setTimeout(()=>setMsg(''),2600)};window.addEventListener('qniverse:toast',fn);return()=>window.removeEventListener('qniverse:toast',fn)},[]);return msg?<div className="toast"><span className="toast-dot"/>{msg}</div>:null}
