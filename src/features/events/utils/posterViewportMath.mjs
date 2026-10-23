/** Poster viewer viewport math. Pure, reusable and tested. */
export const POSTER_MIN_ZOOM = 0.5;
export const POSTER_MAX_ZOOM = 6;
export const clampPosterZoom = value => Math.min(POSTER_MAX_ZOOM, Math.max(POSTER_MIN_ZOOM, value));

/**
 * The image is initially fitted/centered via CSS (untransformed offsetWidth).
 * Prevent panning so far that all of the image disappears offscreen.
 */
export function constrainPosterView(view, dimensions) {
  const scale = clampPosterZoom(Number(view.scale) || 1);
  const { viewportWidth=0, viewportHeight=0, imageWidth=0, imageHeight=0 }=dimensions||{};
  const xRange = Math.max(0, (imageWidth*scale-viewportWidth)/2);
  const yRange = Math.max(0, (imageHeight*scale-viewportHeight)/2);
  // Return canonical +0 when the image fits. This prevents -0 from
  // propagating into transforms and makes zoom reset deterministic.
  const clip=(value,range)=>range<=0 ? 0 : Math.min(range,Math.max(-range,Number(value)||0));
  return {
    scale,
    x: clip(view.x,xRange),
    y: clip(view.y,yRange),
  };
}
/**
 * Keep the document location under the cursor/finger stable while zooming.
 * point coordinates are relative to the CENTER of the viewport.
 */
export function zoomPosterAt(view, requestedZoom, point, dimensions) {
  const scale = clampPosterZoom(requestedZoom);
  const ratio = scale/view.scale;
  return constrainPosterView({
    scale,
    x: view.x + (point.x-view.x)*(1-ratio),
    y: view.y + (point.y-view.y)*(1-ratio),
  }, dimensions);
}
export function panPosterBy(view, dx, dy, dimensions) {
  return constrainPosterView({...view,x:view.x+dx,y:view.y+dy},dimensions);
}
