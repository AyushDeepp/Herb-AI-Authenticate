import { motion } from 'framer-motion';
import '../styles/About.css';

const About = () => {
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  const features = [
    {
      icon: '🔍',
      title: 'AI-Powered Identification',
      description: 'Advanced machine learning algorithms to accurately identify plants from photos'
    },
    {
      icon: '🌿',
      title: 'Extensive Plant Database',
      description: 'Comprehensive information about thousands of plant species, their characteristics, and care requirements'
    },
    {
      icon: '🏥',
      title: 'Disease Detection',
      description: 'Identify plant diseases and get detailed treatment recommendations'
    },
    {
      icon: '📱',
      title: 'User-Friendly Interface',
      description: 'Intuitive design and smooth animations for the best user experience'
    }
  ];

  const technologies = [
    {
      name: 'Frontend',
      items: ['React', 'Framer Motion', 'Axios', 'Modern CSS']
    },
    {
      name: 'Backend',
      items: ['Node.js', 'Express', 'MongoDB', 'JWT Authentication']
    },
    {
      name: 'APIs',
      items: ['Plant Identification API', 'Plant Database API']
    }
  ];

  return (
    <div className="about-container">
      <motion.div
        className="about-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section className="hero-section" variants={itemVariants}>
          <h1>About Plant ID</h1>
          <p className="subtitle">
            Your AI-powered companion for plant identification, care, and disease management
          </p>
        </motion.section>

        <motion.section className="mission-section" variants={itemVariants}>
          <h2>Our Mission</h2>
          <p>
            Plant ID aims to make plant identification and care accessible to everyone,
            from gardening enthusiasts to professional botanists. By combining cutting-edge
            AI technology with comprehensive plant data, we help users better understand
            and care for their plants.
          </p>
        </motion.section>

        <motion.section className="features-section" variants={itemVariants}>
          <h2>Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="tech-section" variants={itemVariants}>
          <h2>Technology Stack</h2>
          <div className="tech-grid">
            {technologies.map((tech, index) => (
              <motion.div
                key={index}
                className="tech-card"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <h3>{tech.name}</h3>
                <ul>
                  {tech.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="team-section" variants={itemVariants}>
          <h2>Meet the Team</h2>
          <p>
            We are a passionate team of developers, botanists, and designers working
            together to create the best plant identification experience. Our diverse
            backgrounds and expertise allow us to approach plant care from multiple
            perspectives.
          </p>
        </motion.section>

        <motion.section className="contact-section" variants={itemVariants}>
          <h2>Get in Touch</h2>
          <p>
            Have questions or suggestions? We'd love to hear from you! Contact us at{' '}
            <a href="mailto:contact@plantid.com">contact@plantid.com</a>
          </p>
          <div className="social-links">
            <a href="#" className="social-link">
              Twitter
            </a>
            <a href="#" className="social-link">
              Facebook
            </a>
            <a href="#" className="social-link">
              Instagram
            </a>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default About;