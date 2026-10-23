import assert from 'node:assert/strict';
import {
  POSTER_MIN_ZOOM, POSTER_MAX_ZOOM, clampPosterZoom,
  constrainPosterView, zoomPosterAt, panPosterBy
} from '../src/features/events/utils/posterViewportMath.mjs';

const dims={viewportWidth:800,viewportHeight:600,imageWidth:360,imageHeight:520};
const start={scale:1,x:0,y:0};
assert.equal(POSTER_MIN_ZOOM,0.5);
assert.equal(POSTER_MAX_ZOOM,6);
assert.equal(clampPosterZoom(0.1),0.5);
assert.equal(clampPosterZoom(20),6);
assert.deepEqual(zoomPosterAt(start,1.25,{x:0,y:0},dims),{scale:1.25,x:0,y:0});
assert.deepEqual(zoomPosterAt(start,0.75,{x:120,y:70},dims),{scale:0.75,x:0,y:0});
assert.deepEqual(constrainPosterView({scale:2,x:999,y:-999},dims),{scale:2,x:0,y:-220});
assert.deepEqual(constrainPosterView({scale:4,x:999,y:-999},dims),{scale:4,x:320,y:-740});
assert.deepEqual(panPosterBy({scale:4,x:0,y:0},120,-100,dims),{scale:4,x:120,y:-100});
assert.deepEqual(zoomPosterAt({scale:4,x:0,y:0},2,{x:100,y:60},dims),{scale:2,x:0,y:30});
assert.deepEqual(constrainPosterView({scale:0.5,x:500,y:-500},dims),{scale:0.5,x:0,y:0});
const fitted=constrainPosterView({scale:1,x:0,y:0},dims);
assert.deepEqual(fitted,start,'Reset should fit/center full poster');
console.log('Poster zoom: scale bounds, mouse-point zoom, pan clamp and fit reset passed.');
