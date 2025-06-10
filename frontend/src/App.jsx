import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Identify from './pages/Identify';
import Search from './pages/Search';
import Diseases from './pages/Diseases';
import Login from './pages/Login';
import Signup from './pages/Signup';
import About from './pages/About';
import NotFound from './pages/NotFound';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/identify" element={
                  <PrivateRoute>
                    <Identify />
                  </PrivateRoute>
                } />
                <Route path="/search" element={<Search />} />
                <Route path="/diseases" element={<Diseases />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App
