/**
 * Compatibility entrypoint for the Gradebook module.
 *
 * The former V1–V13 interface has been retired. Keep this export so callers
 * share the *single* active gradebook controller and the new macOS view.
 *
 * Never render a legacy gradebook tree alongside GradebookMacEngine.
 */
export { default } from './GradebookMacEngine.jsx';
