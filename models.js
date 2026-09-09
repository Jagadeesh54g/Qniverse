import mongoose from 'mongoose';
const ProgressSchema=new mongoose.Schema({userKey:{type:String,unique:true,index:true},xp:{type:Number,default:0},lessons:{type:Object,default:{}},challenges:{type:Object,default:{}},updatedAt:{type:Date,default:Date.now}},{timestamps:true});
export const Progress=mongoose.models.QniverseProgress||mongoose.model('QniverseProgress',ProgressSchema);
