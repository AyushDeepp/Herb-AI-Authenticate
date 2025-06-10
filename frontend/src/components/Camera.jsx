import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Camera.css';

const Camera = ({ onCapture, onClose }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front camera, 'environment' for back camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user's location when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          setLocationError('Unable to get location: ' + error.message);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser');
    }
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Use a promise-based approach for play() to handle interruptions
        try {
          await videoRef.current.play();
          setIsStreaming(true);
        } catch (playErr) {
          // Handle play interruption gracefully
          if (playErr.name !== 'AbortError') {
            console.error('Error playing video:', playErr);
          }
          setIsStreaming(true); // Still set streaming as true since we have the stream
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please make sure you have granted camera permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);
      setCapturedBlob(blob);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  };

  const usePhoto = () => {
    if (!capturedImage || !capturedBlob) return;

    const file = new File([capturedBlob], 'camera-capture.jpg', { type: 'image/jpeg' });
    onCapture(file, capturedImage, {
      location,
      timestamp: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    });
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isStreaming) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
      // Clean up blob URL to prevent memory leaks
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [facingMode]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  const modalVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const contentVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { opacity: 0, scale: 0.8, y: 50 }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="camera-modal-overlay"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      >
        <motion.div
          className="camera-modal"
          variants={contentVariants}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="camera-header">
            <h3>Take a Photo</h3>
            <button className="close-camera" onClick={onClose}>×</button>
          </div>

          <div className="camera-container">
            {error && (
              <div className="camera-error">
                <p>{error}</p>
                <button onClick={startCamera} className="retry-button">
                  Try Again
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="camera-loading">Loading camera...</div>
            ) : (
              <>
                {capturedImage ? (
                  <div className="captured-image-container">
                    <img src={capturedImage} alt="Captured" className="captured-image" />
                    <div className="capture-actions">
                      <button onClick={retakePhoto} className="retake-button">
                        Retake
                      </button>
                      <button onClick={usePhoto} className="use-photo-button">
                        Use Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="video-container">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-video"
                      />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                      
                      {isStreaming && (
                        <div className="camera-controls">
                          <button
                            onClick={switchCamera}
                            className="switch-camera-button"
                            title="Switch camera"
                          >
                            🔄
                          </button>
                          <button
                            onClick={capturePhoto}
                            className="capture-button"
                            title="Take photo"
                          >
                            📷
                          </button>
                        </div>
                      )}
                    </div>

                    {!isStreaming && !error && (
                      <div className="camera-loading">
                        <div className="spinner"></div>
                        <p>Starting camera...</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {locationError && (
              <div className="location-error">
                {locationError}
              </div>
            )}

            {location && (
              <div className="location-info">
                <p>Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                <p>Accuracy: {location.accuracy.toFixed(2)} meters</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Camera; 