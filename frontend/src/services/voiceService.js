/**
 * Voice Service
 * Handles voice input capture and text-to-speech output for accessibility
 * Uses Web Speech API (browser-based) for visually impaired users
 * 
 * This service provides utilities for:
 * 1. Voice input capture with beep notification (using Beep.mp3)
 * 2. Speech-to-text conversion
 * 3. Text-to-speech response
 */

import BeepSound from './Beep.mp3';

/**
 * Voice Service Configuration
 * Optimized for accessibility and cognitive load reduction
 */
const VOICE_CONFIG = {
  // Speech Recognition Settings
  recognition: {
    continuous: false,           // Stop after one phrase
    interimResults: false,        // Only final results
    maxAlternatives: 1,           // Single best interpretation
    lang: 'en-US'                 // English language
  },
  
  // Text-to-Speech Settings
  speech: {
    rate: 0.9,                    // Slightly slower for clarity
    pitch: 1.0,                   // Normal pitch
    volume: 1.0,                  // Full volume
    lang: 'en-US'                 // English language
  },
  
  // Timeouts
  silenceTimeout: 3000,           // ms - stop listening after silence
  maxRecordingTime: 10000         // ms - maximum recording duration
};

/**
 * Voice Service Class
 * Manages all voice interaction functionality
 */
class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.beepAudio = null;
    
    // Preload beep sound
    this.preloadBeep();
    
    // Initialize Web Speech API
    this.initializeSpeechRecognition();
  }
  
  /**
   * Preload the beep audio file
   */
  preloadBeep() {
    try {
      this.beepAudio = new Audio(BeepSound);
      this.beepAudio.preload = 'auto';
    } catch (error) {
      console.error('Error preloading beep sound:', error);
    }
  }
  
  /**
   * Initialize Speech Recognition
   * Sets up the Web Speech API SpeechRecognition interface
   */
  initializeSpeechRecognition() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }
    
    // Create recognition instance
    this.recognition = new SpeechRecognition();
    
    // Apply configuration
    this.recognition.continuous = VOICE_CONFIG.recognition.continuous;
    this.recognition.interimResults = VOICE_CONFIG.recognition.interimResults;
    this.recognition.maxAlternatives = VOICE_CONFIG.recognition.maxAlternatives;
    this.recognition.lang = VOICE_CONFIG.recognition.lang;
  }
  
  /**
   * Check if browser supports Web Speech API
   * @returns {Object} Support status for recognition and synthesis
   */
  checkBrowserSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    return {
      recognition: !!SpeechRecognition,
      synthesis: 'speechSynthesis' in window,
      audio: 'Audio' in window
    };
  }
  
  /**
   * Play a beep sound before recording
   * Uses the preloaded Beep.mp3 file
   * Provides audio feedback to user that recording is starting
   * @returns {Promise<void>}
   */
  async playBeep() {
    return new Promise((resolve, reject) => {
      if (!this.beepAudio) {
        console.warn('Beep audio not available');
        resolve();
        return;
      }
      
      try {
        // Reset audio to beginning
        this.beepAudio.currentTime = 0;
        
        // Set up event handlers
        const onEnded = () => {
          this.beepAudio.removeEventListener('ended', onEnded);
          this.beepAudio.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (error) => {
          this.beepAudio.removeEventListener('ended', onEnded);
          this.beepAudio.removeEventListener('error', onError);
          console.error('Error playing beep:', error);
          reject(error);
        };
        
        this.beepAudio.addEventListener('ended', onEnded);
        this.beepAudio.addEventListener('error', onError);
        
        // Play the beep
        const playPromise = this.beepAudio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(onError);
        }
        
      } catch (error) {
        console.error('Error in playBeep:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Start voice input capture
   * Plays beep, then begins listening for speech
   * @param {Function} onResult - Callback with transcribed text
   * @param {Function} onError - Callback for errors
   * @returns {Promise<void>}
   */
  async startListening(onResult, onError) {
    if (!this.recognition) {
      const error = new Error('Speech recognition not available in this browser. Please use Chrome, Edge, or Safari.');
      if (onError) onError(error);
      return Promise.reject(error);
    }
    
    if (this.isListening) {
      console.warn('Already listening');
      return;
    }
    
    try {
      // Play beep notification
      await this.playBeep();
      
      // Small delay after beep for better UX
      await new Promise(resolve => setTimeout(resolve, 150));
      
      this.isListening = true;
      
      // Set up event handlers
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log(`Recognized: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
        
        if (onResult) {
          onResult({
            text: transcript,
            confidence: confidence,
            isFinal: event.results[0].isFinal
          });
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        
        let errorMessage = 'Speech recognition error occurred.';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your audio settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your connection.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        if (onError) {
          onError(new Error(errorMessage));
        }
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        console.log('Speech recognition ended');
      };
      
      // Start recognition
      this.recognition.start();
      console.log('Speech recognition started');
      
    } catch (error) {
      this.isListening = false;
      console.error('Error starting speech recognition:', error);
      if (onError) onError(error);
      throw error;
    }
  }
  
  /**
   * Stop voice input capture
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
        console.log('Speech recognition stopped');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }
  
  /**
   * Speak text using Text-to-Speech
   * Optimized for clarity and accessibility
   * @param {string} text - Text to speak
   * @param {Object} options - Optional TTS settings
   * @returns {Promise<void>}
   */
  async speak(text, options = {}) {
    if (!this.synthesis) {
      console.error('Speech synthesis not available');
      return Promise.reject(new Error('Speech synthesis not available in this browser'));
    }
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    // Wait a bit for cancel to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply configuration with accessibility optimizations
        utterance.rate = options.rate || VOICE_CONFIG.speech.rate;
        utterance.pitch = options.pitch || VOICE_CONFIG.speech.pitch;
        utterance.volume = options.volume || VOICE_CONFIG.speech.volume;
        utterance.lang = options.lang || VOICE_CONFIG.speech.lang;
        
        // Select voice if specified, or try to get a high-quality English voice
        const voices = this.synthesis.getVoices();
        if (options.voiceName) {
          const selectedVoice = voices.find(voice => voice.name === options.voiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        } else {
          // Try to find a good English voice
          const preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          ) || voices.find(voice => voice.lang.startsWith('en'));
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }
        
        // Event handlers
        utterance.onstart = () => {
          this.isSpeaking = true;
          console.log('Started speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        };
        
        utterance.onend = () => {
          this.isSpeaking = false;
          console.log('Finished speaking');
          resolve();
        };
        
        utterance.onerror = (event) => {
          this.isSpeaking = false;
          console.error('Speech synthesis error:', event);
          
          // Don't reject on interrupted or cancelled errors (these are normal)
          if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve();
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`));
          }
        };
        
        // Speak the text
        this.synthesis.speak(utterance);
        
      } catch (error) {
        this.isSpeaking = false;
        console.error('Error in speak function:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Stop current speech output
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }
  
  /**
   * Get available voices for TTS
   * @returns {Array} Array of available voice objects
   */
  getAvailableVoices() {
    if (!this.synthesis) {
      return [];
    }
    
    return this.synthesis.getVoices();
  }
  
  /**
   * Check if currently listening
   * @returns {boolean}
   */
  isCurrentlyListening() {
    return this.isListening;
  }
  
  /**
   * Check if currently speaking
   * @returns {boolean}
   */
  isCurrentlySpeaking() {
    return this.isSpeaking;
  }
  
  /**
   * Pause current speech (for interruption)
   */
  pauseSpeaking() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
    }
  }
  
  /**
   * Resume paused speech
   */
  resumeSpeaking() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.resume();
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.stopListening();
    this.stopSpeaking();
    
    if (this.beepAudio) {
      this.beepAudio.pause();
      this.beepAudio = null;
    }
  }
}

// Export singleton instance
const voiceService = new VoiceService();

export default voiceService;
export { VOICE_CONFIG, VoiceService };
