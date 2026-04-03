import { Routes, Route } from 'react-router-dom';
import HomeGrid from './pages/HomeGrid';
import ProjectView from './pages/ProjectView';
import Starfield from './components/Starfield';

function App() {
  return (
    <>
      <Starfield />
      <Routes>
        <Route path="/" element={<HomeGrid />} />
        <Route path="/project/:projectId" element={<ProjectView />} />
      </Routes>
    </>
  );
}

export default App;
