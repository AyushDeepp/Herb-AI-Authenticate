import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Camera.css';

const Camera = ({ onCapture, onClose }) => {
  // State management
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [supportedConstraints, setSupportedConstraints] = useState({});
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Device capability detection
  const detectDeviceCapabilities = useCallback(() => {
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
      const constraints = navigator.mediaDevices.getSupportedConstraints();
      setSupportedConstraints(constraints);
    }
    
    // Check for multiple cameras
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        })
        .catch(err => console.warn('Could not enumerate devices:', err));
      }
      
      console.log('Device capabilities:', info);
    return info;
  }, []);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };
        setLocation(locationData);
        console.log('Location obtained:', locationData);
        },
        (error) => {
          console.warn('Geolocation error:', error);
        let errorMessage = 'Unable to get location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Position unavailable';
            break;
          case error.TIMEOUT:
            errorMessage += 'Request timeout';
            break;
          default:
            errorMessage += error.message;
        }
        setLocationError(errorMessage);
        },
        options
      );
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
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
  }, []);

  // Start camera with progressive fallback
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Security checks
      if (!window.isSecureContext && window.location.protocol !== 'https:' && 
          window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires HTTPS connection. Please use a secure connection.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or device.');
      }

      // Stop any existing stream
      stopCamera();

      console.log('Starting camera with facing mode:', facingMode);

      // Progressive constraint strategy
      const constraintStrategies = [
        // Strategy 1: Full constraints with ideal settings
        {
        video: {
            facingMode: { ideal: facingMode },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
          }
        },
        // Strategy 2: Simplified constraints with exact facing mode
        {
          video: {
            facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
          }
        },
        // Strategy 3: Basic constraints with facing mode preference
        {
          video: {
            facingMode: { ideal: facingMode }
          }
        },
        // Strategy 4: Minimal constraints - just video
        {
          video: true
        }
      ];

      let stream = null;
      let lastError = null;

      // Try each strategy until one works
      for (let i = 0; i < constraintStrategies.length; i++) {
        try {
          console.log(`Trying camera strategy ${i + 1}:`, constraintStrategies[i]);
          stream = await navigator.mediaDevices.getUserMedia(constraintStrategies[i]);
          console.log('Camera strategy succeeded:', i + 1);
          break;
        } catch (err) {
          console.warn(`Camera strategy ${i + 1} failed:`, err);
          lastError = err;
          
          // If permission denied, no point trying other strategies
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw err;
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('All camera access strategies failed');
          }

            // Store stream reference
      streamRef.current = stream;
      
      // Wait for video element to be available if needed
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      if (!videoRef.current) {
        throw new Error('Video element not available after waiting');
      }

      // Configure video element
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Set video attributes for maximum compatibility
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.autoplay = true;

      // Handle video events
        const handleLoadedMetadata = () => {
        console.log('Video metadata loaded. Resolution:', video.videoWidth, 'x', video.videoHeight);
        setIsLoading(false);
          setIsStreaming(true);
        };

        const handleCanPlay = () => {
          console.log('Video can play');
        // Ensure video plays
          video.play().catch(err => {
            console.warn('Video play error:', err);
          // On mobile, might need user interaction
            if (deviceInfo.isMobile) {
            setError('Tap the screen to start the camera');
            }
          });
        };

      const handleError = (err) => {
        console.error('Video element error:', err);
        setError('Video playback error. Please try again.');
      };

      // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      // Cleanup function
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        };

    } catch (err) {
      console.error('Error accessing camera:', err);
      
      let errorMessage = 'Unable to access camera. ';
      
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
        errorMessage += 'Please allow camera access and try again.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
        errorMessage += 'No camera found on this device.';
          break;
        case 'NotSupportedError':
        errorMessage += 'Camera is not supported by your browser.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
        errorMessage += 'Camera is being used by another application.';
          break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
        errorMessage += 'Camera does not support the requested settings.';
          break;
        default:
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, deviceInfo.isMobile, stopCamera]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      setError('Camera not ready. Please try again.');
      return;
    }

    try {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        setError('Invalid video dimensions. Please restart the camera.');
        return;
      }

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob with high quality
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setCapturedBlob(blob);
          stopCamera(); // Stop camera after capture
          console.log('Photo captured successfully. Size:', blob.size, 'bytes');
      } else {
        setError('Failed to capture image. Please try again.');
      }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Failed to capture photo. Please try again.');
    }
  }, [isStreaming, stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  }, [capturedImage, startCamera]);

  // Use captured photo
  const usePhoto = useCallback(() => {
    if (!capturedImage || !capturedBlob) {
      setError('No photo available. Please take a photo first.');
      return;
    }

    try {
      const file = new File([capturedBlob], 'camera-capture.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      const metadata = {
      location,
      timestamp: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: deviceInfo.isMobile,
        facingMode: facingMode
        },
        captureInfo: {
          resolution: {
            width: canvasRef.current?.width || 0,
            height: canvasRef.current?.height || 0
          },
          fileSize: capturedBlob.size
        }
      };

      console.log('Using photo with metadata:', metadata);
      onCapture(file, capturedImage, metadata);
      onClose();
    } catch (err) {
      console.error('Error using photo:', err);
      setError('Failed to use photo. Please try again.');
    }
  }, [capturedImage, capturedBlob, location, deviceInfo, facingMode, onCapture, onClose]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!hasMultipleCameras && !supportedConstraints.facingMode) {
      setError('Camera switching is not available on this device.');
      return;
    }

    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log('Switching camera from', facingMode, 'to', newFacingMode);
    
    setFacingMode(newFacingMode);
    
    if (isStreaming) {
      stopCamera();
      // Small delay to ensure camera is released
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  }, [facingMode, hasMultipleCameras, supportedConstraints.facingMode, isStreaming, stopCamera, startCamera]);

  // Handle manual camera start (for mobile interactions)
  const handleManualStart = useCallback(() => {
    if (error && error.includes('Tap')) {
      setError(null);
      startCamera();
    }
  }, [error, startCamera]);

  // Initialize component
  useEffect(() => {
    detectDeviceCapabilities();
    getUserLocation();
  }, [detectDeviceCapabilities, getUserLocation]);

    // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [stopCamera, capturedImage]);

  // Animation variants
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
            <button className="close-camera" onClick={onClose} aria-label="Close camera">
              ×
            </button>
          </div>

          <div className="camera-container">
            {/* Error Display */}
            {error && (
              <div className="camera-error">
                <p>{error}</p>
                {error.includes('HTTPS') && (
                  <div className="error-details">
                    <small>Camera access requires a secure HTTPS connection on most devices.</small>
                  </div>
                )}
                {error.includes('Tap') && (
                  <div className="error-details">
                    <small>Mobile browsers require user interaction to start the camera.</small>
                  </div>
                )}
                <button onClick={startCamera} className="retry-button">
                  Try Again
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !error && (
              <div className="camera-loading">
                <div className="spinner"></div>
                <p>Starting camera...</p>
                {deviceInfo.isMobile && (
                  <small>Please allow camera access when prompted</small>
                )}
              </div>
            )}

            {/* Captured Image View */}
            {capturedImage && (
                  <div className="captured-image-container">
                <img src={capturedImage} alt="Captured plant" className="captured-image" />
                    <div className="capture-actions">
                      <button onClick={retakePhoto} className="retake-button">
                        Retake
                      </button>
                      <button onClick={usePhoto} className="use-photo-button">
                        Use Photo
                      </button>
                    </div>
                  </div>
            )}

                                    {/* Camera View */}
            {!capturedImage && !error && (
              <div className="video-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                  style={{ display: isStreaming ? 'block' : 'none' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {/* Show manual start button if camera hasn't started */}
                {!isStreaming && !isLoading && (
                  <div className="camera-loading">
                    <button onClick={startCamera} className="retry-button">
                      📷 Start Camera
                    </button>
                    <p>Click to start the camera</p>
                  </div>
                )}
                
                {/* Loading state */}
                {isLoading && (
                  <div className="camera-loading">
                    <div className="spinner"></div>
                    <p>Starting camera...</p>
                  </div>
                )}
                
                {isStreaming && (
                  <div className="camera-controls">
                    {/* Switch Camera Button */}
                    {(hasMultipleCameras || supportedConstraints.facingMode) && (
                      <button
                        onClick={switchCamera}
                        className="switch-camera-button"
                        title="Switch camera"
                        aria-label="Switch camera"
                      >
                        🔄
                      </button>
                    )}
                    
                    {/* Capture Button */}
                    <button
                      onClick={capturePhoto}
                      className="capture-button"
                      title="Take photo"
                      aria-label="Take photo"
                    >
                      📷
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Location Information */}
            <div className="location-container">
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
  };
  
export default Camera; 