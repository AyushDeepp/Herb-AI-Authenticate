import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navVariants = {
    hidden: { y: -100 },
    visible: { 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20
      }
    }
  };

  const linkVariants = {
    hover: { 
      scale: 1.1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 10
      }
    }
  };

  return (
    <motion.nav 
      className="navbar"
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="nav-brand">
        <Link to="/">
          <motion.div 
            className="logo"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            🌿
          </motion.div>
          <span>Herb-AI Authenticate</span>
        </Link>
      </div>

      <button 
        className={`hamburger ${isMenuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-content ${isMenuOpen ? 'active' : ''}`}>
        <div className="nav-links">
          <motion.div variants={linkVariants} whileHover="hover">
            <Link to="/identify" onClick={() => setIsMenuOpen(false)}>Identify</Link>
          </motion.div>
          <motion.div variants={linkVariants} whileHover="hover">
            <Link to="/search" onClick={() => setIsMenuOpen(false)}>Search</Link>
          </motion.div>
          <motion.div variants={linkVariants} whileHover="hover">
            <Link to="/diseases" onClick={() => setIsMenuOpen(false)}>Diseases</Link>
          </motion.div>
          <motion.div variants={linkVariants} whileHover="hover">
            <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
          </motion.div>
        </div>

        <div className="nav-auth">
          {user ? (
            <div className="user-menu">
              <span>Welcome, {user.username}!</span>
              <motion.button
                className="logout-btn"
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Logout
              </motion.button>
            </div>
          ) : (
            <div className="auth-buttons">
              <motion.div variants={linkVariants} whileHover="hover">
                <Link to="/login" className="login-btn" onClick={() => setIsMenuOpen(false)}>Login</Link>
              </motion.div>
              <motion.div variants={linkVariants} whileHover="hover">
                <Link to="/signup" className="signup-btn" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;