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
  const [deviceInfo, setDeviceInfo] = useState({});
  const [supportedConstraints, setSupportedConstraints] = useState({});

  // Detect device capabilities and constraints
  useEffect(() => {
    const checkDeviceCapabilities = () => {
      const info = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isSecureContext: window.isSecureContext,
        hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      };
      
      setDeviceInfo(info);
      
      // Check supported constraints
      if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
        setSupportedConstraints(navigator.mediaDevices.getSupportedConstraints());
      }
      
      console.log('Device capabilities:', info);
      console.log('Supported constraints:', supportedConstraints);
    };

    checkDeviceCapabilities();
  }, []);

  useEffect(() => {
    // Get user's location when component mounts
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };
      
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
          console.warn('Geolocation error:', error);
          setLocationError('Unable to get location: ' + error.message);
        },
        options
      );
    } else {
      setLocationError('Geolocation is not supported by your browser');
    }
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Check if we're in a secure context (HTTPS required for camera on most browsers)
      if (!window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError('Camera access requires HTTPS connection. Please use a secure connection.');
        setIsLoading(false);
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported by your browser or device.');
        setIsLoading(false);
        return;
      }

      // Enhanced constraints for better mobile compatibility
      const baseConstraints = {
        video: {
          facingMode: { ideal: facingMode }
        },
        audio: false
      };

      // Add mobile-optimized constraints
      if (deviceInfo.isMobile) {
        baseConstraints.video = {
          ...baseConstraints.video,
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        };
      } else {
        baseConstraints.video = {
          ...baseConstraints.video,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        };
      }

      // iOS-specific optimizations
      if (deviceInfo.isIOS) {
        baseConstraints.video.facingMode = facingMode; // Remove 'ideal' wrapper for iOS
      }

      console.log('Requesting camera with constraints:', baseConstraints);

      let stream;
      try {
        // Try with full constraints first
        stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
      } catch (primaryError) {
        console.warn('Primary constraints failed, trying fallback:', primaryError);
        
        // Fallback to basic constraints
        const fallbackConstraints = {
          video: { facingMode: facingMode },
          audio: false
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (fallbackError) {
          console.warn('Fallback constraints failed, trying minimal:', fallbackError);
          
          // Final fallback - just video
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (finalError) {
            throw finalError;
          }
        }
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Handle video loading with proper event listeners
        const video = videoRef.current;
        
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
          setIsStreaming(true);
          setIsLoading(false);
        };

        const handleCanPlay = () => {
          console.log('Video can play');
          // Ensure video plays on mobile devices
          video.play().catch(err => {
            console.warn('Video play error:', err);
            // For mobile, user interaction might be required
            if (deviceInfo.isMobile) {
              setError('Tap anywhere to start the camera');
            }
          });
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        
        // Set video attributes for mobile compatibility
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        video.autoplay = true;

        // Cleanup listeners
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplay', handleCanPlay);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      
      let errorMessage = 'Unable to access camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera is not supported by your browser.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is being used by another application.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera does not support the requested settings.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind, track.label);
      });
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

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob with high quality
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setCapturedBlob(blob);
        stopCamera();
      } else {
        setError('Failed to capture image. Please try again.');
      }
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
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
        platform: navigator.platform,
        isMobile: deviceInfo.isMobile,
        facingMode: facingMode
      }
    });
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    if (isStreaming) {
      stopCamera();
      // Add delay to ensure camera is properly released
      setTimeout(() => startCamera(), 500);
    }
  };

  // Handle manual camera start (for mobile interactions)
  const handleManualStart = () => {
    if (error && error.includes('Tap anywhere')) {
      setError(null);
      startCamera();
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
        onClick={handleManualStart}
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
                {error.includes('HTTPS') && (
                  <div className="error-details">
                    <small>Camera access requires a secure HTTPS connection on most devices.</small>
                  </div>
                )}
                {error.includes('Tap anywhere') && (
                  <div className="error-details">
                    <small>Mobile browsers require user interaction to start the camera.</small>
                  </div>
                )}
                <button onClick={startCamera} className="retry-button">
                  Try Again
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="camera-loading">
                <div className="spinner"></div>
                <p>Starting camera...</p>
                {deviceInfo.isMobile && (
                  <small>Please allow camera access when prompted</small>
                )}
              </div>
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
                        webkit-playsinline="true"
                      />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                      
                      {isStreaming && (
                        <div className="camera-controls">
                          {/* Only show switch camera button if multiple cameras are likely available */}
                          {(deviceInfo.isMobile || supportedConstraints.facingMode) && (
                            <button
                              onClick={switchCamera}
                              className="switch-camera-button"
                              title="Switch camera"
                            >
                              🔄
                            </button>
                          )}
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
                        <p>Initializing camera...</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}



            {locationError && (
              <div className="location-error">
                <small>{locationError}</small>
              </div>
            )}

            {location && (
              <div className="location-info">
                <small>📍 Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</small>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Camera; 