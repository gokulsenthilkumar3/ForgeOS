import {compareRgba} from './snapdiff-engine.mjs';
self.onmessage = event => {
 const {id,left,right,width,height,threshold}=event.data;
 try { const result=compareRgba(new Uint8ClampedArray(left),new Uint8ClampedArray(right),width,height,threshold); self.postMessage({id,result:{...result,pixels:result.pixels.buffer}},[result.pixels.buffer]); }
 catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Comparison failed'});}
};
