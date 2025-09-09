import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SplashScreen = () => {
   const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  
  const backgroundGradient = useRef(new Animated.Value(0)).current;
  
  const particleAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    startSplashAnimation();
  }, []);

  const startSplashAnimation = () => {
    // Step 1: Background gradient
    Animated.timing(backgroundGradient, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Step 2: Logo entrance with bounce and rotation
    setTimeout(() => {
      setCurrentStep(1);
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Step 3: Title animation
    setTimeout(() => {
      setCurrentStep(2);
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    // Step 4: Subtitle animation
    setTimeout(() => {
      setCurrentStep(3);
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1400);

    // Step 5: Particles animation
    setTimeout(() => {
      setCurrentStep(4);
      animateParticles();
    }, 1800);

    // Step 6: Progress bar
    setTimeout(() => {
      setCurrentStep(5);
      Animated.parallel([
        Animated.timing(progressOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(progressWidth, {
          toValue: 100,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]).start();
    }, 2200);

    // Step 7: Finish
    setTimeout(() => {
      setCurrentStep(6);
      exitAnimation();
    }, 4000);
  };

  const animateParticles = () => {
    particleAnimations.forEach((particle, index) => {
      const delay = index * 100;
      const randomX = (Math.random() - 0.5) * 200;
      const randomY = (Math.random() - 0.5) * 150;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: randomX,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: randomY,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Fade out particles
          Animated.parallel([
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, delay);
    });
  };

  const exitAnimation = () => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
         navigation.navigate('Home');
    });
  };

  const renderRabbitIcon = () => {
    const rotation = logoRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [
              { scale: logoScale },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <View style={styles.rabbitIcon}>
          {/* Rabbit ears */}
          <View style={styles.earLeft} />
          <View style={styles.earRight} />
          
          {/* Rabbit head */}
          <View style={styles.rabbitHead}>
            {/* Eyes */}
            <View style={styles.eyeLeft} />
            <View style={styles.eyeRight} />
            
            {/* Nose */}
            <View style={styles.nose} />
            
            {/* Mouth */}
            <View style={styles.mouth} />
          </View>
          
          {/* React symbol overlay */}
          <View style={styles.reactSymbol}>
            <View style={styles.reactOrbit1} />
            <View style={styles.reactOrbit2} />
            <View style={styles.reactOrbit3} />
            <View style={styles.reactCore} />
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderParticles = () => {
    return particleAnimations.map((particle, index) => (
      <Animated.View
        key={index}
        style={[
          styles.particle,
          {
            opacity: particle.opacity,
            transform: [
              { translateX: particle.translateX },
              { translateY: particle.translateY },
              { scale: particle.scale },
            ],
          },
        ]}
      >
        <View style={[
          styles.particleDot,
          { 
            backgroundColor: index % 2 === 0 ? '#61DAFB' : '#02569B',
            width: 4 + (index % 3) * 2,
            height: 4 + (index % 3) * 2,
          },
        ]} />
      </Animated.View>
    ));
  };

  const backgroundColorInterpolation = backgroundGradient.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1a1a1a', '#4A90E2'],
  });

  const progressWidthInterpolation = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: backgroundColorInterpolation },
      ]}
    >
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      
      {/* Background particles */}
      <View style={styles.particlesContainer}>
        {renderParticles()}
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        {renderRabbitIcon()}

        {/* Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.appTitle}>React Rabbit</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          <Text style={styles.appSubtitle}>
            Discover Your App Technologies
          </Text>
          <Text style={styles.appTagline}>
            React Native • Flutter • Native
          </Text>
        </Animated.View>
      </View>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressContainer,
          { opacity: progressOpacity },
        ]}
      >
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progressWidthInterpolation },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Loading your apps...</Text>
      </Animated.View>

  
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  particleDot: {
    borderRadius: 10,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  rabbitIcon: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Rabbit design
  earLeft: {
    position: 'absolute',
    top: -15,
    left: 20,
    width: 20,
    height: 35,
    backgroundColor: '#fff',
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earRight: {
    position: 'absolute',
    top: -15,
    right: 20,
    width: 20,
    height: 35,
    backgroundColor: '#fff',
    borderRadius: 10,
    transform: [{ rotate: '20deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rabbitHead: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  eyeLeft: {
    position: 'absolute',
    top: 25,
    left: 22,
    width: 8,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  eyeRight: {
    position: 'absolute',
    top: 25,
    right: 22,
    width: 8,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  nose: {
    position: 'absolute',
    top: 38,
    width: 6,
    height: 4,
    backgroundColor: '#FF6B9D',
    borderRadius: 3,
  },
  mouth: {
    position: 'absolute',
    top: 45,
    width: 12,
    height: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    borderRadius: 6,
  },
  // React symbol overlay
  reactSymbol: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactOrbit1: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderWidth: 2,
    borderColor: '#61DAFB',
    borderRadius: 17.5,
    opacity: 0.7,
  },
  reactOrbit2: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderWidth: 2,
    borderColor: '#61DAFB',
    borderRadius: 17.5,
    transform: [{ rotate: '60deg' }],
    opacity: 0.7,
  },
  reactOrbit3: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderWidth: 2,
    borderColor: '#61DAFB',
    borderRadius: 17.5,
    transform: [{ rotate: '120deg' }],
    opacity: 0.7,
  },
  reactCore: {
    width: 6,
    height: 6,
    backgroundColor: '#61DAFB',
    borderRadius: 3,
  },
  titleContainer: {
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    alignItems: 'center',
  },
  appSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  appTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '300',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    width: screenWidth * 0.8,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#61DAFB',
    borderRadius: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '300',
  },
});

export default SplashScreen;