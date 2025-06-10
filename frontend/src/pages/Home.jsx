import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  const features = [
    {
      icon: '🔍',
      title: 'Plant Identification',
      description: 'Upload a photo and instantly identify any plant species.'
    },
    {
      icon: '🌱',
      title: 'Plant Database',
      description: 'Access detailed information about thousands of plant species.'
    },
    {
      icon: '🏥',
      title: 'Disease Detection',
      description: 'Identify plant diseases and get treatment recommendations.'
    }
  ];

  return (
    <motion.div
      className="home-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <section className="hero-section">
        <motion.h1 variants={itemVariants}>
          Discover the World of Plants
        </motion.h1>
        <motion.p variants={itemVariants} className="hero-subtitle">
          Your AI-powered companion for plant identification and care
        </motion.p>
        <motion.div variants={itemVariants} className="cta-buttons">
          <Link to="/identify" className="btn btn-primary">
            Identify a Plant
          </Link>
          <Link to="/search" className="btn btn-secondary">
            Browse Plants
          </Link>
        </motion.div>
      </section>

      <section className="features-section">
        <motion.h2 variants={itemVariants}>
          Explore Our Features
        </motion.h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <motion.h2 variants={itemVariants}>
          How It Works
        </motion.h2>
        <div className="steps-container">
          <motion.div 
            className="step"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
          >
            <div className="step-number">1</div>
            <h3>Take a Photo</h3>
            <p>Snap a clear picture of any plant you want to identify</p>
          </motion.div>

          <motion.div 
            className="step"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
          >
            <div className="step-number">2</div>
            <h3>Upload & Analyze</h3>
            <p>Our AI will analyze the image and identify the plant species</p>
          </motion.div>

          <motion.div 
            className="step"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
          >
            <div className="step-number">3</div>
            <h3>Get Results</h3>
            <p>Receive detailed information about the plant and care instructions</p>
          </motion.div>
        </div>
      </section>

      <section className="cta-section">
        <motion.div 
          className="cta-content"
          variants={itemVariants}
        >
          <h2>Ready to Start?</h2>
          <p>Join our community of plant enthusiasts and start exploring today!</p>
          <Link to="/signup" className="btn btn-primary">
            Sign Up Now
          </Link>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default Home;