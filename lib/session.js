'use client';
import { useEffect, useState } from 'react';
export function useCircuitSession(){const [circuit,setCircuit]=useState(null);useEffect(()=>{try{const x=localStorage.getItem('qniverse-circuit');if(x)setCircuit(JSON.parse(x))}catch{}},[]);useEffect(()=>{if(circuit)try{localStorage.setItem('qniverse-circuit',JSON.stringify(circuit))}catch{}},[circuit]);return {circuit,setCircuit}}
export function toast(message){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('qniverse:toast',{detail:message}))}
