import mongoose from 'mongoose';
let cached=globalThis.__qniverse_mongoose;
export async function db(){if(!process.env.MONGODB_URI)return null;if(!cached){cached={conn:null,promise:null};globalThis.__qniverse_mongoose=cached}if(cached.conn)return cached.conn;if(!cached.promise)cached.promise=mongoose.connect(process.env.MONGODB_URI,{dbName:'qniverse'}).then(m=>m);cached.conn=await cached.promise;return cached.conn}
