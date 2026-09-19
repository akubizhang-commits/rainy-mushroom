import {writeFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {createRequire} from 'node:module'
import {BRAND_SHAPES} from '../js/data/brandMark.js'
const require=createRequire(import.meta.url),sharp=require('sharp'),out=resolve(import.meta.dirname,'../assets/brand');mkdirSync(out,{recursive:true})
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="雨后菌语：蘑菇、嫩叶与雨滴">'+BRAND_SHAPES.map(s=>`<path d="${s.d.map(c=>c.join(' ')).join(' ')}" fill="${s.fill||'none'}" stroke="${s.stroke||'none'}" stroke-width="${s.width||0}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')+'</svg>'
writeFileSync(resolve(out,'rainy-mushroom-icon.svg'),svg)
for(const size of [1024,512,256,64])await sharp(Buffer.from(svg)).resize(size,size).png().toFile(resolve(out,`rainy-mushroom-icon-${size}.png`))
console.log('Generated original SVG and PNG icons:',out)
