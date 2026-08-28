import GradebookEngine from './GradebookEngine.jsx';
import editorialCss from '../../styles/GradebookEditorialV2.css?inline';

// Public Gradebook boundary. The final editorial layer is rendered after the
// app styles so the previous hero treatment cannot win the cascade again.
export default function GradebookWorkspace(props) {
  return <>
    <style>{editorialCss}</style>
    <GradebookEngine {...props} />
  </>;
}
