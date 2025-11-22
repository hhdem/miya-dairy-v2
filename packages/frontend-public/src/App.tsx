import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Gallery from './pages/Gallery';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
