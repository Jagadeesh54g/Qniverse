'use client';
import { createContext,useContext,useEffect,useMemo,useState } from 'react';
const seed={lessons:{},challenges:{},xp:0,streak:0,last:null};
const Ctx=createContext(null);
export function ProgressProvider({children}){const [data,setData]=useState(seed);useEffect(()=>{try{const x=localStorage.getItem('qniverse-progress');if(x)setData({...seed,...JSON.parse(x)})}catch{}; fetch('/api/progress?userKey=local-demo').then(r=>r.json()).then(j=>{if(j.enabled&&j.data)setData(d=>({...d,...j.data}))}).catch(()=>{})},[]);useEffect(()=>{try{localStorage.setItem('qniverse-progress',JSON.stringify(data))}catch{}; if(data!==seed) fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,userKey:'local-demo'})}).catch(()=>{})},[data]);
const api=useMemo(()=>({data,completeLesson(id){setData(d=>({...d,lessons:{...d.lessons,[id]:100},xp:d.xp+50}))},completeChallenge(id,score=100){setData(d=>({...d,challenges:{...d.challenges,[id]:score},xp:d.xp+Math.round(score/2)}))}}),[data]);return <Ctx.Provider value={api}>{children}</Ctx.Provider>}
export const useProgress=()=>useContext(Ctx);
