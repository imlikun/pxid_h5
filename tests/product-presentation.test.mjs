import assert from 'node:assert/strict'
import { test } from 'node:test'
import { variantForCover, imagesForColor, colorPreview } from '../src/utils/productPresentation.js'
const p = {
  images: [{id:'blue',src:'https://img.test/blue.jpg',variantIds:['b']},{id:'red',src:'https://img.test/red.jpg',variantIds:['r']}],
  variants: [{id:'r',selectedOptions:[{name:'Color',value:'Red'}]},{id:'b',selectedOptions:[{name:'Color',value:'Blue'}]}],
}
test('cover binding wins over first variant; accepts resized URL query', () => {
  assert.equal(variantForCover(p,'https://img.test/blue.jpg?width=400').id,'b')
})
test('only selected color images are returned', () => {
  assert.deepEqual(imagesForColor(p,'Blue'),['https://img.test/blue.jpg'])
  assert.deepEqual(imagesForColor(p,'Red'),['https://img.test/red.jpg'])
})
test('missing associations do not guess a variant or expose all colors', () => {
  const unbound={...p,images:p.images.map(({src})=>({src}))}
  assert.equal(variantForCover(unbound,p.images[0].src),null)
  assert.deepEqual(imagesForColor(unbound,'Blue'),[])
})
test('imageId links work when variantIds are absent', () => {
  const linked={images:p.images.map(({id,src})=>({id,src})),variants:p.variants.map(v=>({...v,imageId:v.id==='b'?'blue':'red'}))}
  assert.equal(variantForCover(linked,p.images[0].src).id,'b')
})

test('explicit variant binding wins over contradictory alt text', () => {
  const contradictory={...p,images:p.images.map(im=>({...im,alt:'Red Blue bike'}))}
  assert.deepEqual(imagesForColor(contradictory,'Blue'),['https://img.test/blue.jpg'])
  assert.deepEqual(imagesForColor(contradictory,'Red'),['https://img.test/red.jpg'])
})
test('ambiguous alt and partial color words cannot assign a color', () => {
  const ambiguous={...p,images:[{src:'https://img.test/mixed.jpg',alt:'Blue and Red bike'},{src:'https://img.test/infrared.jpg',alt:'Infrared sensor'}]}
  assert.deepEqual(imagesForColor(ambiguous,'Red'),[])
  assert.equal(variantForCover(ambiguous,'https://img.test/mixed.jpg'),null)
})
test('Shopify swatch uses a small image with the same variant and version', () => {
  const src='https://cdn.shopify.com/s/files/blue.jpg?v=123'
  const shop={...p,images:[{id:'blue',src,variantIds:['b']}]}
  const preview=new URL(colorPreview(shop,'Blue'))
  assert.equal(preview.pathname,'/s/files/blue.jpg')
  assert.equal(preview.searchParams.get('width'),'104')
  assert.equal(preview.searchParams.get('v'),'123')
  assert.equal(colorPreview(shop,'Red'),'')
})
