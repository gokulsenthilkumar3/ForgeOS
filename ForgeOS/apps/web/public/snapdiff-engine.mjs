export const MAX_PIXELS = 4_000_000;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const ALGORITHM = 'rgba-white-channel-v1';
function dimensions(width,height,mime) {
 if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>16384||height>16384||width*height>MAX_PIXELS) throw new Error('Image exceeds the 4 megapixel or 16384-pixel dimension limit.');
 return {width,height,mime};
}
export function readImageDimensions(bytes) {
 if (!(bytes instanceof Uint8Array)||bytes.length<12) throw new Error('Image header is incomplete.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(offset,length)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
 if (bytes[0]===137&&text(1,3)==='PNG'&&v.getUint32(4)===0x0d0a1a0a) {
  if(bytes.length<33||text(12,4)!=='IHDR'||v.getUint32(8)!==13)throw new Error('Invalid PNG header.');
  const result=dimensions(v.getUint32(16),v.getUint32(20),'image/png');
  let at=8;while(at+8<=bytes.length){const n=v.getUint32(at),kind=text(at+4,4);if(kind==='acTL')throw new Error('Animated PNG is unsupported.');if(kind==='IDAT')return result;if(at+n+12>bytes.length)break;at+=n+12;}
  throw new Error('PNG metadata exceeds the inspected header budget.');
 }
 if(bytes[0]===255&&bytes[1]===216){let at=2;while(at+4<=bytes.length){if(bytes[at]!==255)throw new Error('Invalid JPEG metadata.');while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===0xd9||marker===0xda)break;if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;const n=v.getUint16(at);if(n<2||at+n>bytes.length)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){if(n<8)throw new Error('Invalid JPEG frame.');return dimensions(v.getUint16(at+5),v.getUint16(at+3),'image/jpeg');}at+=n;}throw new Error('JPEG dimensions were not found within the inspected header budget.');}
 if(text(0,4)==='RIFF'&&text(8,4)==='WEBP'&&bytes.length>=30){const kind=text(12,4);if(kind==='VP8X'){if(bytes[20]&2)throw new Error('Animated WebP is unsupported.');const n=at=>bytes[at]+(bytes[at+1]<<8)+(bytes[at+2]<<16);return dimensions(n(24)+1,n(27)+1,'image/webp');}if(kind==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return dimensions(v.getUint16(26,true)&0x3fff,v.getUint16(28,true)&0x3fff,'image/webp');if(kind==='VP8L'&&bytes[20]===47){const bits=v.getUint32(21,true);return dimensions((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1,'image/webp');}}
 throw new Error('Choose a supported non-animated PNG, JPEG or WebP image.');
}
export function compareRgba(left,right,width,height,threshold=20) {
 dimensions(width,height,'raw');
 if(!(left instanceof Uint8ClampedArray)||!(right instanceof Uint8ClampedArray)||left.length!==width*height*4||right.length!==left.length)throw new Error('Pixel buffers do not match the declared dimensions.');
 if(!Number.isInteger(threshold)||threshold<0||threshold>255)throw new Error('Threshold must be an integer from 0 to 255.');
 const pixels=new Uint8ClampedArray(left.length);let changed=0,minX=width,minY=height,maxX=-1,maxY=-1;
 for(let i=0;i<left.length;i+=4){const a=left[i+3]/255,b=right[i+3]/255;let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(left[i+c]*a+255*(1-a)-right[i+c]*b-255*(1-b)));const different=delta>threshold;
  if(different){changed++;const n=i/4,x=n%width,y=Math.floor(n/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);pixels.set([236,59,106,255],i);}else{const gray=Math.round((left[i]*a+255*(1-a))*.65+255*.35);pixels.set([gray,gray,gray,255],i);}}
 return {pixels,changed,total:width*height,percentage:changed/(width*height)*100,bounds:changed?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:null,algorithm:ALGORITHM,threshold,background:'white'};
}
