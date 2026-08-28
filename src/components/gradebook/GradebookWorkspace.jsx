import GradebookEngine from './GradebookEngine.jsx';
import '../../styles/GradebookEditorialV2.css';

// Public Gradebook boundary. The engine now lives in the Gradebook domain;
// Homeroom no longer owns or imports grade-entry code.
export default GradebookEngine;
