import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/NotFound.css';

const NotFound = () => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="not-found-container">
      <motion.div
        className="not-found-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="not-found-icon">🌿</div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>
          Oops! The page you're looking for seems to have wandered off into the wild.
          Let's help you find your way back to familiar territory.
        </p>
        <div className="action-buttons">
          <Link to="/" className="home-button">
            Return Home
          </Link>
          <Link to="/search" className="search-button">
            Search Plants
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;