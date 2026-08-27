import HomeroomLearningGradebook from '../homeroom/HomeroomLearningGradebook.jsx';

// Gradebook now owns its public component boundary. The proven grade-entry
// engine remains reused internally during the compatibility phase so existing
// data, Excel export and PDF reports stay byte-for-byte behavior compatible.
export default HomeroomLearningGradebook;
